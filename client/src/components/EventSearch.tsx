import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { getPrinters, testPrinter } from '../services/api';
import { AxiosError } from 'axios';

interface EventSearchProps {
  onClose?: () => void;
}

export default function EventSearch({ onClose }: EventSearchProps) {
  const [eventId, setEventId] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: printersResponse } = useQuery({
    queryKey: ['printers'],
    queryFn: getPrinters,
  });
  
  const printers = printersResponse?.data || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventId.trim()) {
      navigate(`/event/${eventId.trim()}`);
      if (onClose) onClose();
    }
  };

  const handleTestPrint = async (): Promise<void> => {
    try {
      const result = await testPrinter();
      if (result.success) {
        console.log('Test print successful');
      } else {
        console.error('Test print failed:', result.message);
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Test print failed:', axiosError.response?.data?.message || axiosError.message);
    }
  };

  return (
    <Box sx={{ p: 2, width: '100%', maxWidth: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Search Event
      </Typography>
      
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Event ID"
            variant="outlined"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Enter event ID"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {isMobile ? 'Go' : 'Search'}
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Printer Status
      </Typography>
      
      {printers.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Connected: {printers[0].name} ({printers[0].status})
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleTestPrint}
            sx={{ mt: 1 }}
            fullWidth
          >
            Test Printer
          </Button>
        </Box>
      ) : (
        <Typography variant="body2" color="error">
          No printer connected
        </Typography>
      )}
    </Box>
  );
}
