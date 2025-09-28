import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { configureStore, AnyAction } from '@reduxjs/toolkit';
import eventReducer, { EventState, StatusType } from './store/eventSlice';

// Define the root state type
type RootState = {
  event: EventState;
};

// Create a test QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Setup store for tests
export const setupStore = (preloadedState?: Partial<EventState>) => {
  return configureStore({
    reducer: {
      event: (state: EventState | undefined, action: AnyAction) => {
        if (!state) {
          return {
            eventId: '',
            status: 'all' as StatusType,
            ...preloadedState
          };
        }
        return eventReducer(state, action);
      },
    },
    preloadedState: {
      event: {
        eventId: '',
        status: 'all' as StatusType,
        ...preloadedState,
      },
    },
  });
};

// Create a custom render with Redux and QueryClient
type RenderWithReduxOptions = Omit<RenderOptions, 'queries'> & {
  preloadedState?: Partial<EventState>;
  store?: ReturnType<typeof setupStore>;
};

export const renderWithRedux = (
  ui: React.ReactElement,
  {
    preloadedState,
    store = setupStore(preloadedState),
    ...renderOptions
  }: RenderWithReduxOptions = {}
) => {
  const testQueryClient = createTestQueryClient();
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store,
  };
};

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    ...renderOptions
  }: RenderWithReduxOptions = {}
) {
  const testQueryClient = createTestQueryClient();
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  
  return {
    ...result,
    rerender: (rerenderUi: ReactElement) => 
      result.rerender(<Wrapper>{rerenderUi}</Wrapper>),
  };
}
