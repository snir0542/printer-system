import { useQuery } from '@tanstack/react-query';
import { fetchPhotosByEvent, type Photo } from '../services/api';

export type PhotoStatus = 'all' | 'pending' | 'printed';

interface UsePhotosOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function usePhotos(eventId?: string, status: PhotoStatus = 'all', options: UsePhotosOptions = {}) {
  const interval = options.intervalMs ?? 5000;
  const enabled = options.enabled ?? Boolean(eventId);

  const query = useQuery<Photo[]>({
    queryKey: ['photos', eventId, status],
    queryFn: async () => {
      if (!eventId) return [];
      const filter = status === 'all' ? undefined : (status as 'pending' | 'printed');
      const data: Photo[] = await fetchPhotosByEvent(eventId, filter);
      return Array.isArray(data) ? data : [];
    },
    enabled,
    refetchInterval: enabled && interval > 0 ? interval : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: true,
  });

  const sortedPhotos = (query.data || []).slice().sort((a: any, b: any) => {
    const aTime = new Date(a?.createdAt as any).getTime();
    const bTime = new Date(b?.createdAt as any).getTime();
    return bTime - aTime;
  });

  return {
    photos: query.data || [],
    sortedPhotos,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  } as const;
}
