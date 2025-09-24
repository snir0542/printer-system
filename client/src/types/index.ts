export interface Photo {
  _id: string;
  eventId: string;
  imageData: string;
  originalUrl: string;
  printStatus: 'pending' | 'printed' | 'failed';
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
  printedAt?: string | Date;
}

export interface BatchUpdateStatusParams {
  ids: string[];
  status: 'pending' | 'printed' | 'failed';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
