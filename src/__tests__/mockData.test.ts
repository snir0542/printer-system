import { Photo } from '../types';

// Test suite for mock data
const testMockData = () => {
  const mockPhotos: Photo[] = [
    {
      _id: 'photo-1',
      eventId: 'event-1',
      imageData: 'https://picsum.photos/seed/photo-1/400/600',
      originalUrl: 'https://picsum.photos/seed/photo-1/400/600',
      printStatus: 'pending',
      status: 'pending',
      metadata: {
        width: 400,
        height: 600,
        format: 'jpeg',
        size: 500000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Simple test function that can be called directly
  const testPhotoData = (photos: Photo[]) => {
    if (!Array.isArray(photos)) {
      console.error('Photos is not an array');
      return false;
    }
    if (photos.length === 0) {
      console.error('No photos in the array');
      return false;
    }
    
    const photo = photos[0];
    const requiredProps = ['_id', 'eventId', 'imageData', 'status'];
    
    for (const prop of requiredProps) {
      if (!(prop in photo)) {
        console.error(`Missing required property: ${prop}`);
        return false;
      }
    }
    
    return true;
  };

  return {
    mockPhotos,
    testPhotoData
  };
};

export const { mockPhotos, testPhotoData } = testMockData();

// Run tests if this file is executed directly
if (require.main === module) {
  const { mockPhotos } = testMockData();
  const result = testPhotoData(mockPhotos);
  console.log('Mock data test:', result ? 'PASSED' : 'FAILED');
}
