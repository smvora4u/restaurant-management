import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import ResponsiveContainer, { ResponsiveContainerConfigs } from './ResponsiveContainer';
import {
  Menu as MenuIcon,
  Restaurant as RestaurantIcon,
  Dashboard as DashboardIcon,
  MenuBook as MenuBookIcon,
  TableRestaurant as TableIcon,
  Receipt as OrderIcon,
  CalendarToday as ReservationIcon,
  QrCode as QRCodeIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
  Logout,
} from '@mui/icons-material';

interface LayoutProps {
  children: ReactNode;
}

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/restaurant/dashboard' },
  { text: 'Menu', icon: <MenuBookIcon />, path: '/restaurant/menu' },
  { text: 'Tables', icon: <TableIcon />, path: '/restaurant/tables' },
  { text: 'Orders', icon: <OrderIcon />, path: '/restaurant/orders' },
  { text: 'Reservations', icon: <ReservationIcon />, path: '/restaurant/reservations' },
  { text: 'Staff', icon: <PersonIcon />, path: '/restaurant/staff-management' },
  { text: 'Purchases', icon: <InventoryIcon />, path: '/restaurant/purchases' },
  { text: 'Fees', icon: <PaymentIcon />, path: '/restaurant/fees' },
  { text: 'QR Codes', icon: <QRCodeIcon />, path: '/restaurant/qr-codes' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/restaurant/settings' },
];

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get restaurant data from localStorage
  const restaurantData = localStorage.getItem('restaurant');
  const restaurant = restaurantData ? JSON.parse(restaurantData) : null;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false); // Close mobile drawer after navigation
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('restaurantToken');
    localStorage.removeItem('restaurant');
    navigate('/restaurant/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div">
          Restaurant
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Restaurant Management System
          </Typography>
          
          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {restaurant && (
              <Chip
                label={restaurant.name}
                color="secondary"
                size="small"
              />
            )}
            <IconButton onClick={handleMenuClick}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {restaurant ? restaurant.name.charAt(0).toUpperCase() : 'R'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <ResponsiveContainer {...ResponsiveContainerConfigs.adaptive}>
          {children}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}