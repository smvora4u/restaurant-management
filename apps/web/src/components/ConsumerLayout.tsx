import { ReactNode } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
} from '@mui/icons-material';
import ResponsiveContainer from './ResponsiveContainer';

interface ConsumerLayoutProps {
  children: ReactNode;
  tableNumber: number;
  orderType?: string;
  userName?: string;
}

export default function ConsumerLayout({ children, tableNumber, orderType, userName }: ConsumerLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={2} sx={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <RestaurantIcon sx={{ mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h1" noWrap>
              Restaurant Menu
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {orderType === 'takeout' || orderType === 'delivery' 
                ? (userName ? `Order for ${userName}` : `${orderType === 'delivery' ? 'Delivery' : 'Takeout'} Order`)
                : `Table #${tableNumber}`
              }
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: 'background.default',
          py: { xs: 2, sm: 3 },
        }}
      >
        <ResponsiveContainer maxWidth="lg">
          {children}
        </ResponsiveContainer>
      </Box>

      <Box
        component="footer"
        sx={{
          backgroundColor: 'grey.100',
          py: 2,
          paddingBottom: (theme) => `max(${theme.spacing(2)}, env(safe-area-inset-bottom))`,
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            {orderType === 'takeout' || orderType === 'delivery' 
              ? (userName ? `Order for ${userName}` : `${orderType === 'delivery' ? 'Delivery' : 'Takeout'} Order`)
              : `Table #${tableNumber}`
            } • Restaurant Management System
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
