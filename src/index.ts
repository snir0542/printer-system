import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { ApiService } from './services/ApiService';
import { PrinterService } from './services/PrinterService';
import { PrintJobManager } from './services/PrintJobManager';
import { PrinterConfig } from './types';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const apiService = new ApiService(process.env.API_BASE_URL || 'http://localhost:5000/api');

const printerConfig: PrinterConfig = {
  name: process.env.PRINTER_NAME || 'Default_Printer',
  quality: (process.env.PRINT_QUALITY as any) || 'high',
  size: (process.env.PRINT_SIZE as any) || '4x6',
  copies: 1
};

const printerService = new PrinterService(printerConfig);
const printJobManager = new PrintJobManager(apiService, printerService);

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    printer: printerConfig.name,
    queue: printJobManager.getQueueStatus()
  });
});

app.get('/event/:eventId/photos', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    
    // In a real implementation, you would fetch photos from your database here
    // For now, we'll use the mock data from ApiService
    const response = await apiService.getPendingPhotos(
      eventId, 
      status as 'pending' | 'printed' | undefined, 
      Number(limit)
    );
    
    res.json({
      success: true,
      photos: response.photos,
      count: response.count,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    logger.error(`Failed to fetch photos for event ${req.params.eventId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/status', (req, res) => {
  const queueStatus = printJobManager.getQueueStatus();
  res.json({
    printer: {
      name: printerConfig.name,
      quality: printerConfig.quality,
      size: printerConfig.size
    },
    queue: queueStatus,
    uptime: process.uptime()
  });
});

// Dedicated queue status endpoint
app.get('/queue', (req, res) => {
  try {
    const queueStatus = printJobManager.getQueueStatus();
    res.json(queueStatus);
  } catch (error) {
    logger.error('Failed to get queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

app.post('/print/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    await printJobManager.printPhotosByEventId(eventId);
    res.json({ 
      message: `Started printing photos for event ${eventId}`,
      eventId 
    });
  } catch (error) {
    logger.error('Manual print request failed:', error);
    res.status(500).json({ 
      error: 'Failed to start printing',
      message: (error as Error).message 
    });
  }
});

app.post('/print/test', async (req, res) => {
  try {
    const result = await printerService.testPrinter();
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Test print failed',
        message: result.message 
      });
    }
  } catch (error) {
    logger.error('Test print failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Test print failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/printers', async (req, res) => {
  try {
    const printers = await printerService.getAvailablePrinters();
    res.json({ printers });
  } catch (error) {
    logger.error('Failed to get available printers:', error);
    res.status(500).json({ 
      error: 'Failed to get available printers',
      message: (error as Error).message 
    });
  }
});

app.post('/queue/clear', async (req, res) => {
  try {
    await printJobManager.clearQueue();
    res.json({ message: 'Print queue cleared' });
  } catch (error) {
    logger.error('Failed to clear queue:', error);
    res.status(500).json({ 
      error: 'Failed to clear queue',
      message: (error as Error).message 
    });
  }
});

app.post('/polling/start', async (req, res) => {
  try {
    const eventId = req.body?.eventId as string | undefined;
    const interval = parseInt(req.body?.interval as string) || parseInt(process.env.POLL_INTERVAL_MS || '5000');

    if (!eventId) {
      return res.status(400).json({
        error: 'Event ID is required to start polling',
      });
    }

    await printJobManager.startPolling(eventId, interval);
    res.json({ 
      message: `Polling started for ${eventId}`,
      eventId,
      interval: `${interval}ms`
    });
  } catch (error) {
    logger.error('Failed to start polling:', error);
    res.status(500).json({ error: 'Failed to start polling' });
  }
});

app.post('/polling/stop', (req, res) => {
  printJobManager.stopPolling();
  res.json({ message: 'Polling stopped' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Photo Printer System started on port ${PORT}`);
  logger.info(`Printer: ${printerConfig.name}`);
  logger.info(`API Base URL: ${process.env.API_BASE_URL || 'http://localhost:5000/api'}`);
  
  // Start automatic polling only when explicitly enabled and EVENT_ID is provided
  if (process.env.AUTO_START_POLLING === 'true' && process.env.EVENT_ID) {
    const eventId = process.env.EVENT_ID as string;
    const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || '5000');
    printJobManager.startPolling(eventId, pollInterval).catch(err => logger.error('Auto-polling failed to start:', err));
    logger.info(`Auto-polling started for event ${eventId} with ${pollInterval}ms interval`);
  } else {
    logger.info('Auto-polling disabled or EVENT_ID not set. Polling will start only when requested with an event ID.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  printJobManager.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  printJobManager.stopPolling();
  process.exit(0);
});
