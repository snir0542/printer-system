export interface Photo {
  _id: string;
  eventId: string;
  imageData: string;
  originalUrl: string;
  status: 'pending' | 'printed' | 'failed';
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
  };
  cloudUrl?: string;
  printStatus: 'pending' | 'printed' | 'failed';
  printedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingPhotosResponse {
  photos: Photo[];
  count: number;
}

export interface PrintJob {
  id: string;
  photoId: string;
  eventId: string;
  status: 'queued' | 'printing' | 'completed' | 'failed';
  attempts: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface PrinterConfig {
  name: string;
  quality: 'draft' | 'normal' | 'high';
  size: '4x6' | '5x7' | '8x10';
  copies: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
