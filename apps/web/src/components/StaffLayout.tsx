import React, { ReactNode } from 'react';
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
} from '@mui/material';
import ResponsiveContainer, { ResponsiveContainerConfigs } from './ResponsiveContainer';
import {
  Menu as MenuIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Receipt as OrderIcon,
} from '@mui/icons-material';

interface StaffLayoutProps {
  children: ReactNode;
  staffPermissions: string[];
}

const drawerWidth = 240;

// Define menu items based on staff permissions
const getMenuItems = (permissions: string[]) => {
  const baseItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/staff/dashboard', permission: 'view_orders' },
  ];

  const conditionalItems = [
    { text: 'Orders', icon: <OrderIcon />, path: '/staff/orders', permission: 'view_orders' },
  ];

  // Filter items based on permissions
  const allowedItems = baseItems.filter(item => 
    !item.permission || permissions.includes(item.permission)
  );

  const allowedConditionalItems = conditionalItems.filter(item => 
    permissions.includes(item.permission)
  );

  return [...allowedItems, ...allowedConditionalItems];
};

export default function StaffLayout({ children, staffPermissions }: StaffLayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = getMenuItems(staffPermissions);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <PersonIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div">
          Staff Portal
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
          <Typography variant="h6" noWrap component="div">
            Staff Management System
          </Typography>
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
            keepMounted: true,
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