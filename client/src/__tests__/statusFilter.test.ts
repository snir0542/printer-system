import { describe, it, expect } from 'vitest';

// Test the status filter logic directly
describe('Status Filter', () => {
  it('should filter photos by status', () => {
    const photos = [
      { id: '1', printStatus: 'pending' },
      { id: '2', printStatus: 'printed' },
      { id: '3', printStatus: 'pending' },
    ];

    const filterByStatus = (status: string) => 
      status === 'all' 
        ? photos 
        : photos.filter(photo => photo.printStatus === status);

    // Test all status
    expect(filterByStatus('all')).toHaveLength(3);
    
    // Test pending status
    expect(filterByStatus('pending')).toHaveLength(2);
    expect(filterByStatus('pending')[0].printStatus).toBe('pending');
    
    // Test printed status
    expect(filterByStatus('printed')).toHaveLength(1);
    expect(filterByStatus('printed')[0].printStatus).toBe('printed');
  });

  it('should handle URL parameters correctly', () => {
    const createApiUrl = (eventId: string, status?: string) => {
      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.set('status', status);
      }
      return `/event/${eventId}/photos${params.toString() ? `?${params.toString()}` : ''}`;
    };

    expect(createApiUrl('event1')).toBe('/event/event1/photos');
    expect(createApiUrl('event1', 'pending')).toBe('/event/event1/photos?status=pending');
    expect(createApiUrl('event1', 'all')).toBe('/event/event1/photos');
  });
});
