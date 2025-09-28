import React from 'react';
import { screen, fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EventSearch from '../EventSearch';
import eventReducer, { StatusType } from '../../store/eventSlice';

// Mock the API calls
vi.mock('../../services/api', () => ({
  getPrinters: vi.fn().mockResolvedValue({ data: [] }),
  testPrinter: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'testKey',
    }),
  };
});

// Helper function to render with Redux, QueryClient, and Theme
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    ...renderOptions
  }: {
    preloadedState?: {
      eventId?: string;
      status?: StatusType;
    };
  } = {}
) => {
  const store = configureStore({
    reducer: {
      event: eventReducer,
    },
    preloadedState: {
      event: {
        eventId: '',
        status: 'all' as StatusType,
        ...preloadedState,
      },
    },
  });

  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 1,
        // Disable refetching on window focus for tests
        refetchOnWindowFocus: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={createTheme({ direction: 'rtl' })}>
      <QueryClientProvider client={testQueryClient}>
        <Provider store={store}>
          <MemoryRouter>
            {children}
          </MemoryRouter>
        </Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store,
    // Add testQueryClient to the returned object for testing
    testQueryClient,
  };
};

describe('EventSearch', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders with default values', async () => {
    renderWithProviders(<EventSearch />);
    
    // Wait for any async operations to complete
    await waitFor(() => {
      // Check for the title
      const title = screen.getByText('Search Event');
      expect(title).toBeInTheDocument();
      
      // Check for the status select
      const statusSelect = screen.getByLabelText('סטטוס');
      expect(statusSelect).toBeInTheDocument();
      
      // Check for the event ID input
      const eventIdInput = screen.getByLabelText('Event ID');
      expect(eventIdInput).toBeInTheDocument();
      expect(eventIdInput).toHaveValue('');
      
      // Check for the search button
      const searchButton = screen.getByRole('button', { name: /חפש/i });
      expect(searchButton).toBeInTheDocument();
    });
  });

  it('updates event ID on input change', async () => {
    const { store } = renderWithProviders(<EventSearch />);
    
    await waitFor(() => {
      const input = screen.getByLabelText('Event ID');
      fireEvent.change(input, { target: { value: 'test123' } });
      
      // Check the input value
      expect(input).toHaveValue('test123');
      // The Redux store is only updated on form submission
      expect(store.getState().event.eventId).toBe('');
    });
  });

  it('updates status filter on select change', async () => {
    const { store } = renderWithProviders(<EventSearch />);
    
    await waitFor(async () => {
      // Open the select dropdown
      const select = screen.getByLabelText('סטטוס');
      fireEvent.mouseDown(select);
      
      // Wait for options to appear and select 'ממתין להדפסה' (pending)
      const pendingOption = await screen.findByText('ממתין להדפסה');
      fireEvent.click(pendingOption);
      
      // Check the Redux store
      expect(store.getState().event.status).toBe('pending');
    });
  });

  it('handles form submission and updates Redux store', async () => {
    const { store } = renderWithProviders(<EventSearch />);
    
    await waitFor(async () => {
      // Set event ID
      const input = screen.getByLabelText('Event ID');
      fireEvent.change(input, { target: { value: 'event123' } });
      
      // Open and select 'ממתין להדפסה' (pending) from the status dropdown
      const select = screen.getByLabelText('סטטוס');
      fireEvent.mouseDown(select);
      const pendingOption = await screen.findByText('ממתין להדפסה');
      fireEvent.click(pendingOption);
      
      // Submit the form
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      
      // Verify navigation was called with correct URL
      expect(mockNavigate).toHaveBeenCalledWith('/event/event123?status=pending');
      
      // Verify store was updated
      expect(store.getState().event.eventId).toBe('event123');
      expect(store.getState().event.status).toBe('pending');
    });
  });
});
