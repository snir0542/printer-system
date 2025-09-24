import axios from 'axios';
import { Photo, PendingPhotosResponse, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class ApiService {
  private baseURL: string;
  private adminPanelURL: string;
  private adminApiKey: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.adminPanelURL = process.env.ADMIN_PANEL_URL || 'http://localhost:5000';
    this.adminApiKey = process.env.ADMIN_PANEL_API_KEY || '';
  }

  async getPendingPhotos(eventId?: string, limit: number = 10): Promise<PendingPhotosResponse> {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    console.log("link",`${this.adminPanelURL}/api/photos/event/${eventId}`);
    try {
      const response = await axios.get(`${this.adminPanelURL}/api/photos/event/${eventId}`, {
        headers: {
          'x-api-key': this.adminApiKey,
          'Accept': 'application/json'
        },
        params: {
          status: 'printed',
          limit
        }
      });

console.log("response",response.data);
      // Transform the response to match our expected format
      const photos = response.data.photos.map((photo: any) => ({
        ...photo,
        imageData: photo.originalUrl,
        originalUrl: photo.originalUrl || photo.url,
        printStatus: photo.printStatus || 'pending',
        metadata: {
          width: photo.metadata.width || 500,
          height: photo.metadata.height || 500,
          format: photo.metadata.format || 'jpeg',
          size: photo.metadata.size || 500
        }
      }));

      return {
        photos,
        count: response.data.count || photos.length
      };
    } catch (error) {
      logger.error('Failed to fetch pending photos:', error);
      throw new Error('Failed to fetch pending photos from server');
    }
  }

  async getPhoto(photoId: string): Promise<Photo> {
    try {
      const response = await axios.get(`${this.adminPanelURL}/api/photos/${photoId}`, {
        headers: {
          'x-api-key': this.adminApiKey,
          'Accept': 'application/json'
        }
      });

      const photo = response.data.data;
      return {
        ...photo,
        imageData: photo.url || photo.imageUrl,
        originalUrl: photo.originalUrl || photo.url,
        printStatus: photo.status || 'pending',
        metadata: {
          width: photo.width || 0,
          height: photo.height || 0,
          format: photo.format || 'jpeg',
          size: photo.size || 0
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch photo ${photoId}:`, error);
      throw new Error(`Failed to fetch photo ${photoId}`);
    }
  }

  async markPhotoAsPrinted(photoId: string): Promise<void> {
    try {
      await axios.patch(
        `${this.adminPanelURL}/api/photos/${photoId}/status`,
        { status: 'printed' },
        {
          headers: {
            'x-api-key': this.adminApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error(`Failed to mark photo ${photoId} as printed:`, error);
      throw new Error(`Failed to mark photo ${photoId} as printed`);
    }
  }

  async batchUpdatePhotos(photoIds: string[], updates: Partial<Photo>): Promise<void> {
    try {
      await axios.post(
        `${this.adminPanelURL}/api/photos/batch-update`,
        {
          ids: photoIds,
          updates: {
            ...updates,
            status: updates.printStatus || 'pending'
          }
        },
        {
          headers: {
            'x-api-key': this.adminApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Failed to batch update photos:', error);
      throw new Error('Failed to batch update photos');
    }
  }

  async getPrintQueue(): Promise<Photo[]> {
    try {
      const response = await axios.get(`${this.adminPanelURL}/api/photos`, {
        headers: {
          'x-api-key': this.adminApiKey,
          'Accept': 'application/json'
        },
        params: {
          status: 'pending',
          limit: 100
        }
      });

      return response.data.data.map((photo: any) => ({
        ...photo,
        imageData: photo.url || photo.imageUrl,
        originalUrl: photo.originalUrl || photo.url,
        printStatus: photo.status || 'pending',
        metadata: {
          width: photo.width || 0,
          height: photo.height || 0,
          format: photo.format || 'jpeg',
          size: photo.size || 0
        }
      }));
    } catch (error) {
      logger.error('Failed to fetch print queue:', error);
      throw new Error('Failed to fetch print queue');
    }
  }

  async updatePrintStatus(photoId: string, status: 'pending' | 'printed' | 'failed'): Promise<ApiResponse> {
    try {
      const response = await axios.patch<ApiResponse>(
        `${this.adminPanelURL}/api/photos/${photoId}/status`,
        { status },
        {
          headers: {
            'x-api-key': this.adminApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        message: `Print status updated to ${status} for photo ${photoId}`,
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to update print status for photo ${photoId}:`, error);
      return {
        success: false,
        message: `Failed to update print status for photo ${photoId}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async bulkUpdatePrintStatus(photoIds: string[], status: 'pending' | 'printed' | 'failed'): Promise<ApiResponse> {
    try {
      const response = await axios.post<ApiResponse>(
        `${this.adminPanelURL}/api/photos/batch-update`,
        {
          ids: photoIds,
          updates: {
            status,
            printStatus: status,
            updatedAt: new Date().toISOString()
          }
        },
        {
          headers: {
            'x-api-key': this.adminApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        message: `Updated status to ${status} for ${photoIds.length} photos`,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to bulk update print status:', error);
      return {
        success: false,
        message: 'Failed to update print status for selected photos',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
