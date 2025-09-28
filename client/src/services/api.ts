import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface Photo {
  _id: string;
  eventId: string;
  imageData: string;
  status?: 'pending' | 'printed';
  printStatus?: 'pending' | 'printed';
  cloudUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PrinterInfo {
  name: string;
  isDefault: boolean;
  status: 'idle' | 'printing' | 'error';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  code?: string;
}

const RETRY_DELAY = 1000; // 1 second

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
  timeout: 15000, // 15 seconds timeout
});

// Request interceptor for adding auth token if needed
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Log error for debugging
    console.error('API Error:', {
      url: originalRequest.url,
      method: originalRequest.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Handle token refresh logic here if needed
      // For now, just redirect to login
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry logic for failed requests
    if (error.code === 'ECONNABORTED' || !error.response) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        return new Promise(resolve => {
          setTimeout(() => resolve(api(originalRequest)), RETRY_DELAY);
        });
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Fetch photos by event ID with optional status filter
 */

interface PhotosResponse {
  photos: Photo[];
  totalCount: number;
  hasMore: boolean;
}

export const fetchPhotosByEvent = async (
  eventId?: string, 
  status?: 'pending' | 'printed' | 'all'
): Promise<Photo[]> => {
  if (!eventId) {
    console.error('Event ID is required');
    return [];
  }

  try {
    const response = await api.get<PhotosResponse>(`/event/${eventId}/photos`, {
      params: { 
        status: status === 'all' || !status ? undefined : status,
        _t: Date.now() // Prevent caching
      }
    });

    if (!response.data || !Array.isArray(response.data.photos)) {
      console.error('Invalid response format:', response.data);
      return [];
    }

    return response.data.photos.map(photo => ({
      ...photo,
      // Ensure consistent format
      printStatus: photo.printStatus || 'pending',
      metadata: {
        width: photo.metadata?.width || 0,
        height: photo.metadata?.height || 0,
        format: photo.metadata?.format || 'jpeg',
        size: photo.metadata?.size || 0,
        ...photo.metadata
      }
    }));
  } catch (error) {
    console.error('Failed to fetch photos:', error);
    return [];
  }
};

/**
 * Send a print request for a specific photo
 */
export const printPhoto = async (photoId: string): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    // In development, simulate a successful print
    if (import.meta.env.DEV) {
      console.log(`Simulating print for photo ${photoId}`);
      return { success: true, data: { success: true } };
    }
    
    const response = await api.post(`/photos/${photoId}/print`);
    return response.data;
  } catch (error) {
    console.error('Error printing photo:', error);
    throw error;
  }
};

/**
 * Mark a photo as printed
 */
export const markAsPrinted = async (photoId: string): Promise<ApiResponse<{ photo: Photo }>> => {
  try {
    // In development, simulate marking as printed
    if (import.meta.env.DEV) {
      console.log(`Simulating mark as printed for photo ${photoId}`);
      // Return a mock photo with updated status
      const mockPhoto: Photo = {
        _id: photoId,
        eventId: 'event-1',
        imageData: `https://picsum.photos/seed/${photoId}/400/600`,
        status: 'printed',
        printStatus: 'printed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return { success: true, data: { photo: mockPhoto } };
    }
    
    const response = await api.patch(`/photos/${photoId}`, { status: 'printed' });
    return response.data;
  } catch (error) {
    console.error('Error marking photo as printed:', error);
    throw error;
  }
};

export const batchUpdateStatus = async (photoIds: string[], status: 'printed' | 'pending') => {
  // In development, simulate a successful batch update
  if (import.meta.env.DEV) {
    console.log(`Simulating batch update for ${photoIds.length} photos to status: ${status}`);
    return { success: true, data: { updatedCount: photoIds.length } };
  }
  
  const response: AxiosResponse<ApiResponse<{ updatedCount: number }>> = await api.patch('/photos/batch-status', { photoIds, status });
  return response.data;
};

export const getPrinters = async (): Promise<{ success: boolean; data: PrinterInfo[] }> => {
  // In development, return a mock printer
  if (import.meta.env.DEV) {
    return {
      success: true,
      data: [{
        name: 'Mock PDF Printer',
        isDefault: true,
        status: 'idle'
      }]
    };
  }
  
  const response = await api.get<{ printers: PrinterInfo[] }>('/printers');
  return {
    success: true,
    data: response.data?.printers || []
  };
};

export const testPrinter = async () => {
  const response: AxiosResponse<{ success: boolean; message?: string }> = await api.post('/print/test');
  return response.data;
};
