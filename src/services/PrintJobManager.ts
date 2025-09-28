import { Photo, PrintJob, PendingPhotosResponse } from '../types';
import { ApiService } from './ApiService';
import { PrinterService } from './PrinterService';
import { logger } from '../utils/logger';

export class PrintJobManager {
  private apiService: ApiService;
  private printerService: PrinterService;
  private printQueue: PrintJob[] = [];
  private isProcessing: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(apiService: ApiService, printerService: PrinterService) {
    this.apiService = apiService;
    this.printerService = printerService;
  }

  async startPolling(eventId: string, intervalMs: number = 5000): Promise<void> {
    if (!eventId) {
      throw new Error('Event ID is required to start polling');
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    logger.info(`Starting photo polling for event ${eventId} every ${intervalMs}ms`);
    
    // Initial fetch
    await this.fetchAndQueuePhotos(eventId);
    
    // Set up polling
    this.pollInterval = setInterval(async () => {
      try {
        await this.fetchAndQueuePhotos(eventId);
        await this.processQueue();
      } catch (error) {
        logger.error('Error in polling cycle:', error);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      logger.info('Stopped photo polling');
    }
  }

  private async fetchAndQueuePhotos(eventId?: string, batchSize: number = 5): Promise<void> {
    try {
      // Only fetch pending photos for the print queue
      const response: PendingPhotosResponse = await this.apiService.getPendingPhotos(eventId, 'pending', batchSize);
      
      if (response.photos.length > 0) {
        logger.info(`Found ${response.photos.length} pending photos`);
        
        for (const photo of response.photos) {
          // Check if photo is already in queue
          const existingJob = this.printQueue.find(job => job.photoId === photo._id);
          if (!existingJob) {
            const printJob: PrintJob = {
              id: `job_${Date.now()}_${photo._id}`,
              photoId: photo._id,
              eventId: photo.eventId,
              status: 'queued',
              attempts: 0,
              createdAt: new Date()
            };
            
            this.printQueue.push(printJob);
            logger.info(`Queued print job ${printJob.id} for photo ${photo._id}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to fetch pending photos:', error);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.printQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.info(`Processing print queue with ${this.printQueue.length} jobs`);

    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift()!;
      
      try {
        await this.processJob(job);
      } catch (error) {
        logger.error(`Failed to process job ${job.id}:`, error);
        await this.handleJobFailure(job, error as Error);
      }
    }

    this.isProcessing = false;
  }

  private async processJob(job: PrintJob): Promise<void> {
    job.status = 'printing';
    job.attempts++;
    
    logger.info(`Processing print job ${job.id} (attempt ${job.attempts})`);

    try {
      // Fetch the photo data
      const photo: Photo = await this.apiService.getPhoto(job.photoId);
      
      // Print the photo
      const printSuccess = await this.printerService.printPhoto(photo);
      
      if (printSuccess) {
        // Mark as completed
        job.status = 'completed';
        job.completedAt = new Date();
        
        // Update status in API
        await this.apiService.updatePrintStatus(job.photoId, 'printed');
        
        logger.info(`Successfully completed print job ${job.id}`);
      } else {
        throw new Error('Print operation failed');
      }
    } catch (error) {
      throw error;
    }
  }

  private async handleJobFailure(job: PrintJob, error: Error): Promise<void> {
    job.status = 'failed';
    job.error = error.message;
    
    const maxAttempts = 3;
    
    if (job.attempts < maxAttempts) {
      // Retry the job
      job.status = 'queued';
      this.printQueue.push(job);
      logger.warn(`Retrying print job ${job.id} (attempt ${job.attempts}/${maxAttempts})`);
    } else {
      // Mark as permanently failed
      try {
        await this.apiService.updatePrintStatus(job.photoId, 'failed');
        logger.error(`Print job ${job.id} permanently failed after ${maxAttempts} attempts: ${error.message}`);
      } catch (updateError) {
        logger.error(`Failed to update print status for failed job ${job.id}:`, updateError);
      }
    }
  }

  async printPhotosByEventId(eventId: string): Promise<void> {
    logger.info(`Manually printing all pending photos for event ${eventId}`);
    await this.fetchAndQueuePhotos(eventId, 50);
    await this.processQueue();
  }

  getQueueStatus(): { queueLength: number; isProcessing: boolean; jobs: PrintJob[] } {
    return {
      queueLength: this.printQueue.length,
      isProcessing: this.isProcessing,
      jobs: [...this.printQueue]
    };
  }

  async clearQueue(): Promise<void> {
    this.printQueue = [];
    logger.info('Print queue cleared');
  }
}
