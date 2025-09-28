import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { setEventId, setStatus, selectEventId, selectStatus } from '../store/eventSlice';
import {
  Box,
  Grid,
  Typography,
  Button,
  Checkbox,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  useTheme,
  Theme,
  SxProps,
} from '@mui/material';
import {
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import { 
  fetchPhotosByEvent, 
  printPhoto, 
  markAsPrinted, 
  batchUpdateStatus,
  type Photo 
} from '../services/api';

const PhotoGallery = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const reduxEventId = useAppSelector(selectEventId);
  const reduxStatus = useAppSelector(selectStatus);
  const { eventId: urlEventId } = useParams<{ eventId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme: Theme = useTheme();
  const queryClient = useQueryClient();
  
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState<boolean>(false);

  // Sync URL with Redux state (Redux is source of truth)
  useEffect(() => {
    // Ensure eventId in Redux matches URL param
    if (urlEventId && urlEventId !== reduxEventId) {
      dispatch(setEventId(urlEventId));
    }

    const urlStatus = searchParams.get('status') as 'pending' | 'printed' | 'all' | null;

    // If Redux is 'all', remove status param from URL if present
    if (reduxStatus === 'all') {
      if (urlStatus !== null) {
        const params = new URLSearchParams(searchParams);
        params.delete('status');
        navigate({ search: params.toString() }, { replace: true });
      }
      return;
    }

    // For 'pending' or 'printed', make sure URL reflects Redux
    if (urlStatus !== reduxStatus) {
      const params = new URLSearchParams(searchParams);
      params.set('status', reduxStatus);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [urlEventId, reduxEventId, reduxStatus, searchParams, dispatch, navigate]);

  // Fetch photos from API
  const { data: photos = [], isLoading, refetch } = useQuery({
    queryKey: ['photos', reduxEventId, reduxStatus],
    queryFn: async () => {
      if (!reduxEventId) return [];
      
      try {
        const data = await fetchPhotosByEvent(
          reduxEventId, 
          reduxStatus === 'all' ? undefined : reduxStatus as 'pending' | 'printed'
        );
        return data || [];
      } catch (error) {
        console.error('Error fetching photos:', error);
        return [];
      }
    },
    enabled: !!reduxEventId,
    // Force refetch when status changes
    refetchOnWindowFocus: false,
    retry: 2,
    // Refresh data when the component mounts or when status changes
    refetchOnMount: true,
  });

  // Refresh data when status changes
  useEffect(() => {
    if (reduxEventId) {
      refetch();
    }
  }, [reduxStatus, refetch, reduxEventId]);

  const printMutation = useMutation({
    mutationFn: async (photoId: string) => {
      if (!reduxEventId) throw new Error('No event ID');
      const result = await printPhoto(photoId);
      return { ...result, photoId };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Update the photo status in the cache
        queryClient.setQueryData<Photo[]>(
          ['photos', reduxEventId, reduxStatus],
          (oldData) =>
            oldData?.map((photo) =>
              photo._id === (data as any).photoId ? { ...photo, printStatus: 'printed' } : photo
            ) || []
        );
      }
    },
  });

  const markAsPrintedMutation = useMutation({
    mutationFn: async (photoId: string) => {
      if (!reduxEventId) throw new Error('No event ID');
      const result = await markAsPrinted(photoId);
      return { ...result, photoId };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Update the photo status in the cache
        queryClient.setQueryData<Photo[]>(
          ['photos', reduxEventId, reduxStatus],
          (oldData) =>
            oldData?.map((photo) =>
              photo._id === (data as any).photoId ? { ...photo, printStatus: 'printed' } : photo
            ) || []
        );
      }
    },
  });

  const batchUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status: newStatus }: { ids: string[]; status: 'printed' | 'pending' }) => {
      if (!reduxEventId) throw new Error('No event ID');
      const result = await batchUpdateStatus(ids, newStatus);
      return { ...result, ids, status: newStatus };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Update the photos status in the cache
        queryClient.setQueryData<Photo[]>(
          ['photos', reduxEventId, reduxStatus],
          (oldData) =>
            oldData?.map((photo) =>
              (data as any).ids.includes(photo._id) 
                ? { ...photo, printStatus: (data as any).status } 
                : photo
            ) || []
        );
        setSelected([]);
        setSelectMode(false);
      }
    },
  });

  const handleSelect = (photoId: string) => {
    setSelected(prev => 
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  // Cleaned up unused functions

  const handlePrintSelected = async (): Promise<void> => {
    try {
      // Print each selected photo
      for (const photoId of selected) {
        await printMutation.mutateAsync(photoId);
      }
      // Mark all as printed
      await batchUpdateStatusMutation.mutateAsync({ 
        ids: selected, 
        status: 'printed' 
      });
      setSelected([]);
      await refetch();
    } catch (error) {
      console.error('Error printing photos:', error);
    }
  };

  const handleMarkAsPrinted = async (photo: Photo): Promise<void> => {
    try {
      await markAsPrintedMutation.mutateAsync(photo._id);
      await refetch();
    } catch (error) {
      console.error('Error marking as printed:', error);
    }
  };

  // Reset selection when changing events or status
  useEffect(() => {
    setSelected([]);
    setSelectMode(false);
    if (reduxEventId) {
      refetch();
    }
  }, [reduxEventId, reduxStatus, refetch]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!reduxEventId) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6" color="text.secondary">
          Enter an Event ID to view photos
        </Typography>
      </Box>
    );
  }

  if (photos.length === 0) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6" color="text.secondary">
          No photos found for this event
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => refetch()}
          startIcon={<RefreshIcon />}
          sx={{ mt: 2 }}
        >
          Refresh
        </Button>
      </Box>
    );
  }

  const headerSx: SxProps<Theme> = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 2,
    flexWrap: 'wrap',
    gap: 2,
  };

  const buttonSx: SxProps<Theme> = {
    mr: 1,
  };

  const getPaperSx = (photo: Photo): SxProps<Theme> => ({
    position: 'relative',
    overflow: 'hidden',
    cursor: selectMode ? 'pointer' : 'default',
    border: selected.includes(photo._id) 
      ? `2px solid ${theme.palette.primary.main}` 
      : '2px solid transparent',
  });

  const checkboxSx: SxProps<Theme> = {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  };

  const imageSx: React.CSSProperties = {
    width: '100%',
    height: 'auto',
    display: 'block',
  };

  const infoBoxSx: SxProps<Theme> = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    p: 1,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const actionBoxSx: SxProps<Theme> = {
    position: 'absolute',
    top: 0,
    right: 0,
    p: 1,
    display: 'flex',
    gap: 1,
  };

  const iconButtonSx: SxProps<Theme> = {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
  };

  return (
    <Box>
      <Box sx={headerSx}>
        <Typography variant="h5">
          {reduxEventId ? `Photos for Event: ${reduxEventId}` : 'All Photos'}
        </Typography>
        <Box>
          {selectMode ? (
            <>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setSelectMode(false)}
                startIcon={<DeselectIcon />}
                sx={buttonSx}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePrintSelected}
                startIcon={<PrintIcon />}
                disabled={selected.length === 0}
                sx={buttonSx}
              >
                Print Selected ({selected.length})
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setSelectMode(true)}
                startIcon={<SelectAllIcon />}
                sx={buttonSx}
              >
                Select Multiple
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => void refetch()}
                startIcon={<RefreshIcon />}
              >
                Refresh
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={2}>
        {photos.map((photo: Photo) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={photo._id}>
            <Paper
              elevation={3}
              sx={getPaperSx(photo)}
              onClick={() => selectMode && handleSelect(photo._id)}
            >
              {selectMode && (
                <Checkbox
                  checked={selected.includes(photo._id)}
                  onChange={() => handleSelect(photo._id)}
                  sx={checkboxSx}
                />
              )}
              <img
                src={photo.imageData}
                alt={`Photo ${photo._id}`}
                style={imageSx}
              />
              <Box sx={infoBoxSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" noWrap>
                    {new Date(photo.createdAt).toLocaleString()}
                  </Typography>
                  {photo.printStatus === 'printed' ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <HourglassEmptyIcon color="warning" fontSize="small" />
                  )}
                </Box>
              </Box>
              {!selectMode && (
                <Box sx={actionBoxSx}>
                  <Tooltip title="Mark as printed">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkAsPrinted(photo);
                      }}
                      sx={iconButtonSx}
                    >
                      <CheckCircleIcon fontSize="small" color="success" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PhotoGallery;
