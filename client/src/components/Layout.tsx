import { ReactNode, useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
  Theme,
  SxProps,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import EventSearch from './EventSearch';

const drawerWidth = 300;

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const theme: Theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  const drawerSx: SxProps<Theme> = {
    display: { xs: 'block', sm: 'none' },
    '& .MuiDrawer-paper': { 
      boxSizing: 'border-box', 
      width: drawerWidth,
      backgroundColor: theme.palette.background.paper,
    },
  };

  const permanentDrawerSx: SxProps<Theme> = {
    display: { xs: 'none', sm: 'block' },
    '& .MuiDrawer-paper': { 
      boxSizing: 'border-box', 
      width: drawerWidth,
      backgroundColor: theme.palette.background.paper,
    },
  };

  const appBarSx: SxProps<Theme> = {
    width: { sm: `calc(100% - ${drawerWidth}px)` },
    ml: { sm: `${drawerWidth}px` },
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  };

  const mainContentSx: SxProps<Theme> = {
    flexGrow: 1,
    p: 3,
    width: { sm: `calc(100% - ${drawerWidth}px)` },
    marginTop: '64px',
    backgroundColor: theme.palette.background.default,
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={appBarSx}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Photo Printer System
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={drawerSx}
        >
          <EventSearch onClose={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={permanentDrawerSx}
          open
        >
          <EventSearch />
        </Drawer>
      </Box>
      <Box component="main" sx={mainContentSx}>
        {children}
      </Box>
    </Box>
  );
}
