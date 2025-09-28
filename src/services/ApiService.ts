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

  async getPendingPhotos(
    eventId?: string, 
    status?: 'pending' | 'printed',
    limit: number = 10
  ): Promise<PendingPhotosResponse> {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    const headers = {
      'x-api-key': this.adminApiKey,
      'Accept': 'application/json'
    } as const;

    // Helper to normalize photos array from various response shapes
    const normalize = (rawPhotos: any[]): Photo[] => {
      return (rawPhotos || []).map((p: any) => ({
        _id: p._id || p.id,
        eventId: p.eventId || p.event || eventId,
        imageData: p.imageData || p.originalUrl || p.url || p.imageUrl,
        originalUrl: p.originalUrl || p.url || p.imageUrl,
        status: p.status || p.printStatus || 'pending',
        printStatus: p.printStatus || p.status || 'pending',
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        metadata: {
          width: p.metadata?.width || p.width || 0,
          height: p.metadata?.height || p.height || 0,
          format: p.metadata?.format || p.format || 'jpeg',
          size: p.metadata?.size || p.size || 0,
        },
      }));
    };

    try {
      // Primary endpoint: /api/photos/event/:eventId
      const primary = await axios.get(`${this.adminPanelURL}/api/photos/event/${eventId}`, {
        headers,
        params: { status, limit },
      });

      const data = primary.data;
      const photosArr = data?.photos || data?.data || [];
      const photos = normalize(photosArr);
      return {
        photos,
        count: data?.totalCount || data?.count || photos.length,
      };
    } catch (errPrimary: any) {
      // If 404 or path mismatch, try fallback shape: /api/photos?eventId=&status=&limit=
      const statusCode = errPrimary?.response?.status;
      const details = errPrimary?.response?.data;
      logger.warn('Primary fetch pending photos failed', { statusCode, details });

      try {
        const fallback = await axios.get(`${this.adminPanelURL}/api/photos`, {
          headers,
          params: { eventId, status, limit },
        });
        const data = fallback.data;
        const photosArr = data?.photos || data?.data || data || [];
        const photos = normalize(Array.isArray(photosArr) ? photosArr : (photosArr.items || []));
        return {
          photos,
          count: data?.totalCount || data?.count || photos.length,
        };
      } catch (errFallback: any) {
        logger.error('Failed to fetch pending photos (fallback also failed)', {
          primaryStatus: statusCode,
          primaryData: details,
          fallbackStatus: errFallback?.response?.status,
          fallbackData: errFallback?.response?.data,
        });
        const message = errFallback?.response?.data?.message || errFallback?.message || 'Unknown error';
        throw new Error(`Failed to fetch pending photos from server: ${message}`);
      }
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

      // Support multiple possible shapes from admin panel
      const raw = (response.data?.data
        || response.data?.photo
        || response.data) as any;

      if (!raw || typeof raw !== 'object') {
        throw new Error('Invalid photo response shape');
      }

      const imageUrl = raw.url || raw.imageUrl || raw.originalUrl;
      if (!imageUrl) {
        throw new Error('Photo has no URL');
      }

      return {
        _id: raw._id || raw.id || String(photoId),
        eventId: raw.eventId || raw.event || 'unknown',
        imageData: imageUrl,
        originalUrl: raw.originalUrl || imageUrl,
        status: raw.status || raw.printStatus || 'pending',
        printStatus: raw.printStatus || raw.status || 'pending',
        createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
        metadata: {
          width: raw.metadata?.width || raw.width || 0,
          height: raw.metadata?.height || raw.height || 0,
          format: raw.metadata?.format || raw.format || 'jpeg',
          size: raw.metadata?.size || raw.size || 0
        }
      } as Photo;
    } catch (error) {
      logger.error(`Failed to fetch photo ${photoId}:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch photo ${photoId}: ${message}`);
    }
  }

  async markPhotoAsPrinted(photoId: string): Promise<void> {
    try {
      await axios.patch(
        `${this.adminPanelURL}/api/photos/${photoId}/print-status`,
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
        `${this.adminPanelURL}/api/photos/${photoId}/print-status`,
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
