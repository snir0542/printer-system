import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import { store } from './store/store';
import PhotoGallery from './pages/PhotoGallery';
import Layout from './components/Layout';
import { I18nProvider } from './i18n/I18nProvider';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

function App() {
  return (
    <I18nProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider maxSnack={3}>
              <Layout>
                <Routes>
                  <Route path="/" element={<PhotoGallery />} />
                  <Route path="/event/:eventId" element={<PhotoGallery />} />
                  <Route path="*" element={<PhotoGallery />} />
                </Routes>
              </Layout>
            </SnackbarProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </Provider>
    </I18nProvider>
  );
}

export default App;
