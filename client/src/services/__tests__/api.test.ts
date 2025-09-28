import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPhotosByEvent } from '../api';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('axios');

describe('fetchPhotosByEvent', () => {
  const mockPhotos = [
    { _id: '1', eventId: 'event1', printStatus: 'pending' },
    { _id: '2', eventId: 'event1', printStatus: 'printed' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch photos for an event', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: { photos: mockPhotos, totalCount: 2 }
    });

    const result = await fetchPhotosByEvent('event1');
    expect(axios.get).toHaveBeenCalledWith(
      '/event/event1/photos',
      { params: { status: undefined } }
    );
    expect(result).toEqual(mockPhotos);
  });

  it('should filter by status when provided', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: { photos: [mockPhotos[0]], totalCount: 1 }
    });

    const result = await fetchPhotosByEvent('event1', 'pending');
    expect(axios.get).toHaveBeenCalledWith(
      '/event/event1/photos',
      { params: { status: 'pending' } }
    );
    expect(result).toHaveLength(1);
    expect(result[0].printStatus).toBe('pending');
  });

  it('should return empty array on error', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('Network error'));
    console.error = vi.fn();
    
    const result = await fetchPhotosByEvent('event1');
    expect(console.error).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
