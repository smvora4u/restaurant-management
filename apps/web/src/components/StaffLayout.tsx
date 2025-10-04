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
  Chip,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import ResponsiveContainer, { ResponsiveContainerConfigs } from './ResponsiveContainer';
import {
  Menu as MenuIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Logout,
} from '@mui/icons-material';

interface StaffLayoutProps {
  children: ReactNode;
  staffPermissions: string[];
  staff?: {
    name: string;
    role: string;
  };
  restaurant?: {
    name: string;
    address?: string;
  };
}

const drawerWidth = 240;

// Define menu items based on staff permissions
const getMenuItems = (permissions: string[]) => {
  const baseItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/staff/dashboard', permission: 'view_orders' },
  ];

  const conditionalItems: Array<{ text: string; icon: React.ReactElement; path: string; permission: string }> = [];

  // Filter items based on permissions
  const allowedItems = baseItems.filter(item => 
    !item.permission || permissions.includes(item.permission)
  );

  const allowedConditionalItems = conditionalItems.filter(item => 
    permissions.includes(item.permission)
  );

  return [...allowedItems, ...allowedConditionalItems];
};

export default function StaffLayout({ children, staffPermissions, staff, restaurant }: StaffLayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('staff');
    localStorage.removeItem('restaurant');
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <PersonIcon sx={{ mr: 2 }} />
        <Box>
          <Typography variant="h6" noWrap component="div">
            Staff Portal
          </Typography>
          {restaurant && (
            <Typography variant="caption" color="text.secondary">
              {restaurant.name}
            </Typography>
          )}
        </Box>
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
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap component="div">
              Staff Management System
            </Typography>
            {restaurant && (
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {restaurant.name}
                {restaurant.address && ` • ${restaurant.address}`}
              </Typography>
            )}
          </Box>
          
          {/* Staff Info and Logout */}
          {staff && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={staff.role.toUpperCase()}
                color="secondary"
                size="small"
                sx={{ color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              />
              <IconButton onClick={handleMenuClick}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {staff.name.charAt(0).toUpperCase()}
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
          )}
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