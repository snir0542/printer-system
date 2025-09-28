import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { setEventId, setStatus, selectEventId, selectStatus } from '../store/eventSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { getPrinters, testPrinter, startServerPolling, stopServerPolling } from '../services/api';
import { AxiosError } from 'axios';
import { useI18n } from '../i18n/I18nProvider';
import { useSnackbar } from 'notistack';

interface EventSearchProps {
  onClose?: () => void;
}

export default function EventSearch({ onClose }: EventSearchProps) {
  const dispatch = useAppDispatch();
  const eventId = useAppSelector(selectEventId);
  const status = useAppSelector(selectStatus);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { enqueueSnackbar } = useSnackbar();

  const { data: printersResponse } = useQuery({
    queryKey: ['printers'],
    queryFn: getPrinters,
  });
  
  const printers = printersResponse?.data || [];

  // Update URL when Redux state changes
  useEffect(() => {
    if (eventId) {
      const params = new URLSearchParams();
      if (status !== 'all') {
        params.set('status', status);
      }
      navigate(`/event/${eventId}${params.toString() ? `?${params.toString()}` : ''}`);
    }
  }, [eventId, status, navigate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem('eventId') as HTMLInputElement;
    const newEventId = input?.value?.trim();
    
    if (newEventId) {
      dispatch(setEventId(newEventId));
      if (onClose) onClose();
    }
  };

  const handleStartPolling = async (): Promise<void> => {
    if (!eventId) {
      enqueueSnackbar(t('polling.missingEvent'), { variant: 'warning' });
      return;
    }
    try {
      await startServerPolling(eventId);
      enqueueSnackbar(`${t('polling.started')} ${eventId}`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar((error as Error).message || 'Failed to start polling', { variant: 'error' });
    }
  };

  const handleStopPolling = async (): Promise<void> => {
    try {
      await stopServerPolling();
      enqueueSnackbar(t('polling.stopped'), { variant: 'info' });
    } catch (error) {
      enqueueSnackbar((error as Error).message || 'Failed to stop polling', { variant: 'error' });
    }
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    const newStatus = event.target.value as 'all' | 'pending' | 'printed';
    dispatch(setStatus(newStatus));
  };

  const handleTestPrint = async (): Promise<void> => {
    try {
      const result = await testPrinter();
      if (result.success) {
        enqueueSnackbar(result.message || 'Test print started successfully', { variant: 'success' });
      } else {
        enqueueSnackbar(result.message || 'Test print failed', { variant: 'error' });
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      enqueueSnackbar(axiosError.response?.data?.message || axiosError.message || 'Test print failed', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 2, width: '100%', maxWidth: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {t('eventSearch.title')}
      </Typography>
      
      {/* Single form: remove nested forms to avoid MUI Select issues */}
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
        <Box display="flex" gap={2} mb={2}>
          <FormControl fullWidth>
            <InputLabel id="status-filter-label">{t('eventSearch.statusLabel')}</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={status}
              label={t('eventSearch.statusLabel')}
              onChange={handleStatusChange}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">{t('eventSearch.status.all')}</MenuItem>
              <MenuItem value="pending">{t('eventSearch.status.pending')}</MenuItem>
              <MenuItem value="printed">{t('eventSearch.status.printed')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            name="eventId"
            label={t('eventSearch.eventIdLabel')}
            variant="outlined"
            defaultValue={eventId}
            size="small"
            required
          />
        </Box>
        <Button
          fullWidth
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SearchIcon />}
          size="large"
        >
          {t('eventSearch.searchBtn')}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box display="flex" gap={1} mb={2}>
        <Button variant="outlined" color="primary" onClick={handleStartPolling} fullWidth>
          {t('polling.start')}
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleStopPolling} fullWidth>
          {t('polling.stop')}
        </Button>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        {t('printer.statusTitle')}
      </Typography>
      
      {printers.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('printer.connected')}: {printers[0].name} ({printers[0].status})
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleTestPrint}
            sx={{ mt: 1 }}
            fullWidth
          >
            {t('printer.testButton')}
          </Button>
        </Box>
      ) : (
        <Typography variant="body2" color="error">
          {t('printer.noPrinter')}
        </Typography>
      )}
    </Box>
  );
}
