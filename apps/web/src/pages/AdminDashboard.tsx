import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  LinearProgress
} from '@mui/material';
import {
  Logout,
  Restaurant,
  ShoppingCart,
  TrendingUp,
  Add,
  Search,
  Refresh,
  AdminPanelSettings,
  Group,
  Assessment,
  Settings,
  PersonAdd,
  Payment
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import CryptoJS from 'crypto-js';
import { formatDate, formatDateTime } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import { GET_PLATFORM_ANALYTICS, GET_ALL_ORDERS } from '../graphql/queries/admin';
import { GET_ALL_RESTAURANTS } from '../graphql/queries/restaurant';
import { GET_STAFF_BY_RESTAURANT } from '../graphql/queries/staff';
import { CREATE_SAMPLE_DATA } from '../graphql/mutations/admin';
import { CREATE_STAFF, UPDATE_STAFF, DEACTIVATE_STAFF, ACTIVATE_STAFF } from '../graphql/mutations/staff';
import { CREATE_RESTAURANT, UPDATE_RESTAURANT } from '../graphql/mutations/restaurant';
import { ConfirmationDialog, TabPanel, a11yProps } from '../components/common';
import { useSubscription } from '@apollo/client';
import { RESTAURANT_UPDATED_SUBSCRIPTION, STAFF_UPDATED_SUBSCRIPTION, PLATFORM_ANALYTICS_UPDATED_SUBSCRIPTION } from '../graphql/subscriptions/admin';
import { AuditLogsPanel, FeesPanel, PaymentManagementPanel, SettlementsPanel } from './admin/components/panels';
import { RestaurantDialog, StaffDialog } from './admin/components/dialogs';
import { RestaurantsTable, OrdersTable, StaffTable } from './admin/components/tables';
import { isValidEmail, validateForm, validationRules, clearFieldError } from '../utils/validation';

// Hash password client-side for additional security
const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [admin, setAdmin] = useState<any>(null);
  
  // Order management state
  const [orderPage, setOrderPage] = useState(0);
  const [orderRowsPerPage, setOrderRowsPerPage] = useState(10);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  
  // Restaurant management state
  const [restaurantPage, setRestaurantPage] = useState(0);
  const [restaurantRowsPerPage, setRestaurantRowsPerPage] = useState(10);
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState('');
  
  // Staff management state
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [staffDialogMode, setStaffDialogMode] = useState<'create' | 'edit'>('create');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    permissions: [] as string[],
    isActive: true
  });
  const [staffFormErrors, setStaffFormErrors] = useState<Record<string, string>>({});
  const [staffToConfirm, setStaffToConfirm] = useState<any>(null);
  const [staffConfirmOpen, setStaffConfirmOpen] = useState(false);
  const [staffConfirmReason, setStaffConfirmReason] = useState('');
  const [staffSnackbar, setStaffSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  
  // Restaurant dialog state
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);
  const [restaurantDialogMode, setRestaurantDialogMode] = useState<'create' | 'edit'>('create');
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [restaurantFormData, setRestaurantFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    phone: '',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      theme: 'light'
    }
  });
  const [restaurantFormErrors, setRestaurantFormErrors] = useState<Record<string, string>>({});
  const [restaurantSnackbar, setRestaurantSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Confirmation dialog states
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [sampleDataConfirmOpen, setSampleDataConfirmOpen] = useState(false);
  const [restaurantToAction, setRestaurantToAction] = useState<any>(null);
  const [restaurantToggleReason, setRestaurantToggleReason] = useState('');

  // Queries
  const { data: analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useQuery(GET_PLATFORM_ANALYTICS, {
    fetchPolicy: 'cache-and-network'
  });
  useSubscription(PLATFORM_ANALYTICS_UPDATED_SUBSCRIPTION, { onData: () => refetchAnalytics() });
  const { data: restaurantsData, loading: restaurantsLoading, refetch: refetchRestaurants } = useQuery(GET_ALL_RESTAURANTS, {
    fetchPolicy: 'cache-and-network'
  });
  useSubscription(RESTAURANT_UPDATED_SUBSCRIPTION, { onData: () => refetchRestaurants() });
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ALL_ORDERS, {
    variables: { limit: orderRowsPerPage, offset: orderPage * orderRowsPerPage },
    fetchPolicy: 'cache-and-network'
  });
  
  const { data: staffData, loading: staffLoading, refetch: refetchStaff } = useQuery(GET_STAFF_BY_RESTAURANT, {
    variables: { restaurantId: selectedRestaurant?.id },
    skip: !selectedRestaurant,
    fetchPolicy: 'cache-and-network'
  });
  useSubscription(STAFF_UPDATED_SUBSCRIPTION, {
    variables: { restaurantId: selectedRestaurant?.id || '' },
    skip: !selectedRestaurant,
    onData: () => {
      // Trigger refetch to reflect updates
      if (selectedRestaurant) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        (async () => { try { await refetchStaff(); } catch {} })();
      }
    }
  });

  // Mutations

  const [createSampleData] = useMutation(CREATE_SAMPLE_DATA, {
    onCompleted: () => {
      refetchRestaurants();
    }
  });

  // Restaurant mutations
  const [createRestaurant, { loading: createRestaurantLoading }] = useMutation(CREATE_RESTAURANT, {
    onCompleted: () => {
      setRestaurantDialogOpen(false);
      setRestaurantSnackbar({
        open: true,
        message: 'Restaurant created successfully!',
        severity: 'success'
      });
      refetchRestaurants();
      refetchAnalytics();
    },
    onError: (error) => {
      setRestaurantSnackbar({
        open: true,
        message: `Error creating restaurant: ${error.message}`,
        severity: 'error'
      });
    }
  });

  // Staff mutations
  const [createStaff, { loading: createStaffLoading }] = useMutation(CREATE_STAFF, {
    onCompleted: () => {
      setStaffDialogOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff created successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error creating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });

  const [updateStaff, { loading: updateStaffLoading }] = useMutation(UPDATE_STAFF, {
    onCompleted: () => {
      setStaffDialogOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff updated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error updating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });

  const [deactivateStaff] = useMutation(DEACTIVATE_STAFF, {
    onCompleted: () => {
      setStaffConfirmOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff deactivated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error updating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });
  const [activateStaff] = useMutation(ACTIVATE_STAFF, {
    onCompleted: () => {
      setStaffConfirmOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff activated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error activating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });

  // Simple client-side audit logger (placeholder). Replace with backend call if needed.
  const addAuditLog = (entry: { actorRole: string; action: string; entityType: string; entityId: string; reason?: string; details?: any }) => {
    try {
      const prev = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      const record = { ...entry, timestamp: new Date().toISOString() };
      localStorage.setItem('auditLogs', JSON.stringify([record, ...prev].slice(0, 500)));
    } catch {}
  };

  const [updateRestaurant, { loading: updateRestaurantLoading }] = useMutation(UPDATE_RESTAURANT, {
    onCompleted: () => {
      setRestaurantDialogOpen(false);
      setRestaurantSnackbar({
        open: true,
        message: 'Restaurant updated successfully!',
        severity: 'success'
      });
      refetchRestaurants();
      refetchAnalytics(); // Also refetch analytics to update active restaurant count
    },
    onError: (error) => {
      // Check for conflict errors
      if (error.message.includes('conflict') || error.message.includes('stale')) {
        setRestaurantSnackbar({
          open: true,
          message: 'Data conflict detected. Please refresh and try again.',
          severity: 'error'
        });
      } else {
        setRestaurantSnackbar({
          open: true,
          message: `Error updating restaurant: ${error.message}`,
          severity: 'error'
        });
      }
    }
  });

  // Separate mutation for toggling restaurant status without dialog interference
  const [toggleRestaurantStatus] = useMutation(UPDATE_RESTAURANT, {
    onCompleted: () => {
      // Only refetch data, don't show snackbar or close dialog
      refetchRestaurants();
      refetchAnalytics();
    },
    onError: (error) => {
      console.error('Error toggling restaurant status:', error);
    }
  });

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      navigate('/login');
      return;
    }
    setAdmin(JSON.parse(adminData));
  }, [navigate]);

  // Simple refetch function
  const refetchAllData = async () => {
    try {
      await Promise.all([
        refetchAnalytics(),
        refetchRestaurants(),
        refetchOrders()
      ]);
      setRestaurantSnackbar({
        open: true,
        message: 'All data refreshed successfully!',
        severity: 'success'
      });
    } catch (error) {
      setRestaurantSnackbar({
        open: true,
        message: 'Error refreshing data. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Order management handlers
  const handleOrderPageChange = (_: unknown, newPage: number) => {
    setOrderPage(newPage);
  };

  const handleOrderRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOrderRowsPerPage(parseInt(event.target.value, 10));
    setOrderPage(0);
  };

  // Restaurant management handlers
  const handleRestaurantPageChange = (_: unknown, newPage: number) => {
    setRestaurantPage(newPage);
  };

  const handleRestaurantRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRestaurantRowsPerPage(parseInt(event.target.value, 10));
    setRestaurantPage(0);
  };

  const handleToggleRestaurantStatus = (restaurantId: string) => {
    const restaurant = restaurants.find((r: any) => r.id === restaurantId);
    setRestaurantToAction(restaurant);
    setDeactivateConfirmOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!restaurantToAction) return;
    
    try {
      const newStatus = !restaurantToAction.isActive;
      // Create clean settings object without __typename
      const cleanSettings = restaurantToAction.settings ? {
        currency: restaurantToAction.settings.currency || 'USD',
        timezone: restaurantToAction.settings.timezone || 'UTC',
        theme: restaurantToAction.settings.theme || 'light'
      } : {
        currency: 'USD',
        timezone: 'UTC',
        theme: 'light'
      };

      await toggleRestaurantStatus({ 
        variables: { 
          id: restaurantToAction.id,
          input: {
            name: restaurantToAction.name,
            email: restaurantToAction.email,
            address: restaurantToAction.address || '',
            phone: restaurantToAction.phone || '',
            isActive: newStatus,
            settings: cleanSettings
          }
        } 
      });
      
      addAuditLog({
        actorRole: 'ADMIN',
        action: newStatus ? 'RESTAURANT_ACTIVATED' : 'RESTAURANT_DEACTIVATED',
        entityType: 'RESTAURANT',
        entityId: restaurantToAction.id,
        reason: restaurantToggleReason,
        details: { name: restaurantToAction.name, isActive: newStatus }
      });

      setRestaurantSnackbar({
        open: true,
        message: `${restaurantToAction.name} has been ${newStatus ? 'activated' : 'deactivated'} successfully!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
      setRestaurantSnackbar({
        open: true,
        message: `Error updating ${restaurantToAction.name}: ${error}`,
        severity: 'error'
      });
    } finally {
      setDeactivateConfirmOpen(false);
      setRestaurantToAction(null);
      setRestaurantToggleReason('');
    }
  };

  const handleCancelToggle = () => {
    setDeactivateConfirmOpen(false);
    setRestaurantToAction(null);
    setRestaurantToggleReason('');
  };

  const handleCreateSampleData = (restaurantId: string) => {
    const restaurant = restaurants.find((r: any) => r.id === restaurantId);
    setRestaurantToAction(restaurant);
    setSampleDataConfirmOpen(true);
  };

  const handleConfirmSampleData = async () => {
    if (!restaurantToAction) return;
    
    try {
      await createSampleData({ variables: { restaurantId: restaurantToAction.id } });
      setRestaurantSnackbar({
        open: true,
        message: `Sample data created successfully for ${restaurantToAction.name}!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating sample data:', error);
      setRestaurantSnackbar({
        open: true,
        message: `Error creating sample data for ${restaurantToAction.name}: ${error}`,
        severity: 'error'
      });
    } finally {
      setSampleDataConfirmOpen(false);
      setRestaurantToAction(null);
    }
  };

  const handleCancelSampleData = () => {
    setSampleDataConfirmOpen(false);
    setRestaurantToAction(null);
  };

  const handleViewStaff = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setActiveTab(2); // Switch to Staff tab
  };

  const handleOpenStaffDialog = (mode: 'create' | 'edit', staff?: any) => {
    setStaffDialogMode(mode);
    setStaffFormErrors({});
    if (mode === 'edit' && staff) {
      setEditingStaffId(staff.id);
      setStaffFormData({
        name: staff.name || '',
        email: staff.email || '',
        password: '',
        role: staff.role || 'STAFF',
        permissions: staff.permissions || [],
        isActive: !!staff.isActive
      });
    } else {
      setEditingStaffId(null);
      setStaffFormData({ name: '', email: '', password: '', role: 'STAFF', permissions: [], isActive: true });
    }
    setStaffDialogOpen(true);
  };

  const handleCloseStaffDialog = () => {
    setStaffDialogOpen(false);
    setEditingStaffId(null);
    setStaffFormErrors({});
  };

  const handleStaffFormChange = (field: string, value: any) => {
    setStaffFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStaffSubmit = () => {
    if (!selectedRestaurant) {
      setStaffSnackbar({ open: true, message: 'Select a restaurant first', severity: 'warning' });
      return;
    }
    
    const errors = validateForm(staffFormData, [
      validationRules.required('name', 'Name is required'),
      validationRules.email('email', true, 'Please enter a valid email address'),
      validationRules.password('password', staffDialogMode === 'create', 'Password is required')
    ]);
    
    setStaffFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (staffDialogMode === 'create') {
      // Hash password for new staff
      const hashedPassword = hashPassword(staffFormData.password);
      createStaff({ variables: { input: { ...staffFormData, password: hashedPassword, restaurantId: selectedRestaurant.id } } });
    } else if (editingStaffId) {
      const { password, ...updateData } = staffFormData;
      const input: any = { ...updateData };
      if (password) {
        // Hash password for staff update
        input.password = hashPassword(password);
      }
      updateStaff({ variables: { id: editingStaffId, input } });
    }
  };

  const handleDeactivateStaff = (staff: any) => {
    setStaffToConfirm(staff);
    setStaffConfirmOpen(true);
  };

  const confirmDeactivateStaff = async () => {
    if (!staffToConfirm) return;
    if (staffToConfirm.isActive) {
      await deactivateStaff({ variables: { id: staffToConfirm.id } });
      addAuditLog({
        actorRole: 'ADMIN',
        action: 'STAFF_DEACTIVATED',
        entityType: 'STAFF',
        entityId: staffToConfirm.id,
        reason: staffConfirmReason,
        details: { name: staffToConfirm.name, email: staffToConfirm.email }
      });
    } else {
      await activateStaff({ variables: { id: staffToConfirm.id } });
      addAuditLog({
        actorRole: 'ADMIN',
        action: 'STAFF_ACTIVATED',
        entityType: 'STAFF',
        entityId: staffToConfirm.id,
        reason: staffConfirmReason,
        details: { name: staffToConfirm.name, email: staffToConfirm.email }
      });
    }
    setStaffToConfirm(null);
    setStaffConfirmReason('');
  };

  // Restaurant dialog handlers
  const handleOpenRestaurantDialog = (mode: 'create' | 'edit', restaurant?: any) => {
    setRestaurantDialogMode(mode);
    setRestaurantFormErrors({});
    if (mode === 'edit' && restaurant) {
      setEditingRestaurantId(restaurant.id);
      setRestaurantFormData({
        name: restaurant.name || '',
        email: restaurant.email || '',
        password: '', // Don't populate password for edit
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        isActive: restaurant.isActive !== undefined ? restaurant.isActive : true,
        settings: {
          currency: restaurant.settings?.currency || 'USD',
          timezone: restaurant.settings?.timezone || 'UTC',
          theme: restaurant.settings?.theme || 'light'
        }
      });
    } else {
      setEditingRestaurantId(null);
      setRestaurantFormData({
        name: '',
        email: '',
        password: '',
        address: '',
        phone: '',
        isActive: true,
        settings: {
          currency: 'USD',
          timezone: 'UTC',
          theme: 'light'
        }
      });
    }
    setRestaurantDialogOpen(true);
  };

  const handleCloseRestaurantDialog = () => {
    setRestaurantDialogOpen(false);
    setEditingRestaurantId(null);
    setRestaurantFormErrors({});
    setRestaurantFormData({
      name: '',
      email: '',
      password: '',
      address: '',
      phone: '',
      isActive: true,
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        theme: 'light'
      }
    });
  };

  const handleRestaurantFormChange = (field: string, value: any) => {
    if (field.startsWith('settings.')) {
      const settingField = field.split('.')[1];
      setRestaurantFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingField]: value
        }
      }));
    } else {
      setRestaurantFormData(prev => ({
        ...prev,
        [field]: value
      }));
      // Clear error for this field when user starts typing
      if (restaurantFormErrors[field]) {
        setRestaurantFormErrors(clearFieldError(restaurantFormErrors, field));
      }
    }
  };

  const handleRestaurantSubmit = () => {
    const errors = validateForm(restaurantFormData, [
      validationRules.required('name', 'Restaurant name is required'),
      validationRules.email('email', true, 'Please enter a valid email address'),
      validationRules.password('password', restaurantDialogMode === 'create', 'Password is required')
    ]);
    
    setRestaurantFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    if (restaurantDialogMode === 'create') {
      // Hash password for new restaurant
      const hashedPassword = hashPassword(restaurantFormData.password);
      createRestaurant({
        variables: {
          input: { ...restaurantFormData, password: hashedPassword }
        }
      });
    } else if (editingRestaurantId) {
      // For edit mode, only include password if it's provided
      const { password, ...updateData } = restaurantFormData;
      if (password) {
        // Hash password for restaurant update
        (updateData as any).password = hashPassword(password);
      }
      updateRestaurant({
        variables: {
          id: editingRestaurantId,
          input: updateData
        }
      });
    }
  };


  if (!admin) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const analytics = analyticsData?.platformAnalytics;
  const restaurants = restaurantsData?.allRestaurants || [];
  const orders = ordersData?.allOrders || [];
  const staff = staffData?.staffByRestaurant || [];

  // Calculate currency-wise revenues
  const getCurrencyWiseRevenue = () => {
    const currencyRevenue: Record<string, { total: number; count: number; symbol: string }> = {};
    
    orders.forEach((order: any) => {
      const restaurant = restaurants.find((r: any) => r.id === order.restaurantId);
      const currency = restaurant?.settings?.currency || 'USD';
      
      if (!currencyRevenue[currency]) {
        currencyRevenue[currency] = { total: 0, count: 0, symbol: '' };
      }
      
      currencyRevenue[currency].total += order.totalAmount;
      currencyRevenue[currency].count += 1;
      currencyRevenue[currency].symbol = getCurrencySymbol(currency);
    });
    
    return currencyRevenue;
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currencyMap: Record<string, string> = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };
    return currencyMap[currencyCode] || '$';
  };

  // Filter data
  const filteredRestaurants = restaurants.filter((restaurant: any) =>
    restaurant.name.toLowerCase().includes(restaurantSearchTerm.toLowerCase()) ||
    restaurant.email.toLowerCase().includes(restaurantSearchTerm.toLowerCase()) ||
    restaurant.slug.toLowerCase().includes(restaurantSearchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = !orderSearchTerm || 
      order.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.toLowerCase().includes(orderSearchTerm.toLowerCase()));
    
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Admin Dashboard
          </Typography>
          
          <Chip
            icon={<AdminPanelSettings />}
            label={admin.role.replace('_', ' ').toUpperCase()}
            color="primary"
            size="small"
            sx={{ mr: 2 }}
          />
          <IconButton onClick={handleMenuClick}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {admin.name.charAt(0).toUpperCase()}
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
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Analytics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Restaurant sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Total Restaurants
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? '...' : analytics?.totalRestaurants || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUp sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Active Restaurants
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? '...' : analytics?.activeRestaurants || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ShoppingCart sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Total Orders
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? '...' : analytics?.totalOrders || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

        </Grid>

        {/* Main Content Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="admin dashboard tabs">
              <Tab icon={<Restaurant />} label="Restaurants" {...a11yProps(0)} />
              <Tab icon={<ShoppingCart />} label="Orders" {...a11yProps(1)} />
              <Tab icon={<Group />} label="Staff" {...a11yProps(2)} />
              <Tab icon={<Assessment />} label="Analytics" {...a11yProps(3)} />
              <Tab icon={<Settings />} label="Settings" {...a11yProps(4)} />
              <Tab icon={<Settings />} label="Fees" {...a11yProps(5)} />
              <Tab icon={<Assessment />} label="Settlements" {...a11yProps(6)} />
              <Tab icon={<Payment />} label="Payments" {...a11yProps(7)} />
              <Tab icon={<Assessment />} label="Audit Logs" {...a11yProps(8)} />
            </Tabs>
          </Box>

          {/* Restaurants Tab */}
          <TabPanel value={activeTab} index={0} sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextField
                placeholder="Search restaurants..."
                value={restaurantSearchTerm}
                onChange={(e) => setRestaurantSearchTerm(e.target.value)}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenRestaurantDialog('create')}
            >
              Add Restaurant
            </Button>
          </Box>

          <RestaurantsTable
            restaurantsLoading={restaurantsLoading}
            filteredRestaurants={filteredRestaurants}
            restaurantPage={restaurantPage}
            restaurantRowsPerPage={restaurantRowsPerPage}
            onPageChange={handleRestaurantPageChange}
            onRowsPerPageChange={handleRestaurantRowsPerPageChange}
            onViewStaff={handleViewStaff}
            onEditRestaurant={(r) => handleOpenRestaurantDialog('edit', r)}
            onCreateSampleData={handleCreateSampleData}
            onToggleRestaurantStatus={handleToggleRestaurantStatus}
            formatDate={formatDate}
          />
          </TabPanel>

          {/* Orders Tab */}
          <TabPanel value={activeTab} index={1} sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search orders..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={orderStatusFilter}
                  label="Status"
                  onChange={(e: SelectChangeEvent) => setOrderStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => refetchOrders()}
              >
                Refresh
              </Button>
          </Box>

          <OrdersTable
            ordersLoading={ordersLoading}
            filteredOrders={filteredOrders}
            restaurants={restaurants}
            orderPage={orderPage}
            orderRowsPerPage={orderRowsPerPage}
            onPageChange={handleOrderPageChange}
            onRowsPerPageChange={handleOrderRowsPerPageChange}
            formatDateTime={formatDateTime}
            formatCurrencyFromRestaurant={formatCurrencyFromRestaurant}
          />
          </TabPanel>

          {/* Staff Tab */}
          <TabPanel value={activeTab} index={2} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Staff Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a restaurant to view and manage its staff members
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {restaurants.map((restaurant: any) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={restaurant.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 },
                      border: selectedRestaurant?.id === restaurant.id ? 2 : 0,
                      borderColor: 'primary.main'
                    }}
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <Restaurant />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {restaurant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {restaurant.email}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={restaurant.isActive ? 'Active' : 'Inactive'}
                        color={restaurant.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {selectedRestaurant && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Staff for {selectedRestaurant.name}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  sx={{ mb: 2 }}
                  onClick={() => handleOpenStaffDialog('create')}
                >
                  Add Staff Member
                </Button>
                
                <StaffTable
                  staffLoading={staffLoading}
                  staff={staff}
                  formatDate={formatDate}
                  onEdit={(s) => handleOpenStaffDialog('edit', s)}
                  onToggleActive={handleDeactivateStaff}
                />
              </Box>
            )}
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={activeTab} index={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Platform Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Comprehensive insights into platform performance and usage
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Restaurant Performance
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Active Restaurants</Typography>
                      <Typography fontWeight="bold">{analytics?.activeRestaurants || 0}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Total Restaurants</Typography>
                      <Typography fontWeight="bold">{analytics?.totalRestaurants || 0}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={analytics ? (analytics.activeRestaurants / analytics.totalRestaurants) * 100 : 0}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {analytics ? ((analytics.activeRestaurants / analytics.totalRestaurants) * 100).toFixed(1) : 0}% Active Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Order Statistics
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Total Orders</Typography>
                      <Typography fontWeight="bold">{analytics?.totalOrders || 0}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Revenue by Currency
                      </Typography>
                      {Object.entries(getCurrencyWiseRevenue()).map(([currency, data]) => (
                        <Box key={currency} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            {currency} ({data.count} orders)
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {data.symbol}{data.total.toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                      {Object.keys(getCurrencyWiseRevenue()).length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No revenue data available
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={activeTab} index={4} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure platform-wide settings and preferences
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Platform Configuration
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Default Currency: USD
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Default Timezone: UTC
                      </Typography>
                    </Box>
                    <Button variant="outlined" size="small">
                      Update Settings
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Actions
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<Refresh />}
                        onClick={refetchAllData}
                      >
                        Refresh All Data
                      </Button>
                      <Button variant="outlined" startIcon={<Assessment />}>
                        Generate Reports
                      </Button>
                      <Button variant="outlined" startIcon={<Settings />}>
                        System Maintenance
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Fees Tab */}
          <TabPanel value={activeTab} index={5} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Fee Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a restaurant to configure fees and view fee ledgers
              </Typography>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Restaurant</InputLabel>
                <Select
                  value={selectedRestaurant?.id || ''}
                  label="Select Restaurant"
                  onChange={(e) => {
                    const restaurant = restaurants.find((r: any) => r.id === e.target.value);
                    setSelectedRestaurant(restaurant || null);
                  }}
                >
                  {restaurants.map((restaurant: any) => (
                    <MenuItem key={restaurant.id} value={restaurant.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 24, height: 24 }}>
                          <Restaurant sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {restaurant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {restaurant.email}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <FeesPanel selectedRestaurant={selectedRestaurant} />
          </TabPanel>

          {/* Settlements Tab */}
          <TabPanel value={activeTab} index={6} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Settlement Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a restaurant to view settlements and generate reports
              </Typography>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Restaurant</InputLabel>
                <Select
                  value={selectedRestaurant?.id || ''}
                  label="Select Restaurant"
                  onChange={(e) => {
                    const restaurant = restaurants.find((r: any) => r.id === e.target.value);
                    setSelectedRestaurant(restaurant || null);
                  }}
                >
                  {restaurants.map((restaurant: any) => (
                    <MenuItem key={restaurant.id} value={restaurant.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 24, height: 24 }}>
                          <Restaurant sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {restaurant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {restaurant.email}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <SettlementsPanel selectedRestaurant={selectedRestaurant} />
          </TabPanel>

          {/* Payment Management Tab */}
          <TabPanel value={activeTab} index={7} sx={{ p: 3 }}>
            <PaymentManagementPanel />
          </TabPanel>

          {/* Audit Logs Tab */}
          <TabPanel value={activeTab} index={8} sx={{ p: 3 }}>
            <AuditLogsPanel />
          </TabPanel>
        </Card>
      </Container>

      {/* Restaurant Dialog */}
      <RestaurantDialog
        open={restaurantDialogOpen}
        mode={restaurantDialogMode}
        formData={restaurantFormData}
        formErrors={restaurantFormErrors}
        loading={createRestaurantLoading || updateRestaurantLoading}
        onClose={handleCloseRestaurantDialog}
        onSubmit={handleRestaurantSubmit}
        onFormChange={handleRestaurantFormChange}
      />

      {/* Staff Dialog */}
      <StaffDialog
        open={staffDialogOpen}
        mode={staffDialogMode}
        formData={staffFormData}
        formErrors={staffFormErrors}
        loading={createStaffLoading || updateStaffLoading}
        onClose={handleCloseStaffDialog}
        onSubmit={handleStaffSubmit}
        onFormChange={(field: string, value: any) => {
          handleStaffFormChange(field, value);
          if (staffFormErrors[field]) {
            setStaffFormErrors(clearFieldError(staffFormErrors, field));
          }
        }}
      />

      {/* Staff Activate/Deactivate Confirmation */}
      <ConfirmationDialog
        open={staffConfirmOpen}
        onClose={() => setStaffConfirmOpen(false)}
        onConfirm={confirmDeactivateStaff}
        title={staffToConfirm?.isActive ? 'Deactivate Staff' : 'Activate Staff'}
        message={
          <Box>
            <Typography variant="body1">
              Are you sure you want to {staffToConfirm?.isActive ? 'deactivate' : 'activate'} <strong>{staffToConfirm?.name}</strong>?
            </Typography>
            <TextField
              fullWidth
              label="Reason (optional)"
              value={staffConfirmReason}
              onChange={(e) => setStaffConfirmReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        }
        confirmText={staffToConfirm?.isActive ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        confirmColor={staffToConfirm?.isActive ? 'error' : 'success'}
      />

      {/* Staff Snackbar */}
      {staffSnackbar.open && (
        <Alert
          severity={staffSnackbar.severity}
          onClose={() => setStaffSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ position: 'fixed', bottom: 80, right: 20, zIndex: 9999 }}
        >
          {staffSnackbar.message}
        </Alert>
      )}

      {/* Snackbar for notifications */}
      {restaurantSnackbar.open && (
        <Alert
          severity={restaurantSnackbar.severity}
          onClose={() => setRestaurantSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
        >
          {restaurantSnackbar.message}
        </Alert>
      )}

      {/* Toggle Restaurant Status Confirmation Dialog */}
      <ConfirmationDialog
        open={deactivateConfirmOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={restaurantToAction?.isActive ? "Deactivate Restaurant" : "Activate Restaurant"}
        message={
          <Box>
            <Typography variant="body1">
              Are you sure you want to {restaurantToAction?.isActive ? 'deactivate' : 'activate'} <strong>{restaurantToAction?.name}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {restaurantToAction?.isActive 
                ? "This will prevent the restaurant from logging in and accessing their dashboard."
                : "This will allow the restaurant to log in and access their dashboard."
              }
            </Typography>
            <TextField
              fullWidth
              label="Reason (optional)"
              value={restaurantToggleReason}
              onChange={(e) => setRestaurantToggleReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        }
        confirmText={restaurantToAction?.isActive ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        confirmColor={restaurantToAction?.isActive ? "error" : "success"}
      />

      {/* Create Sample Data Confirmation Dialog */}
      <ConfirmationDialog
        open={sampleDataConfirmOpen}
        onClose={handleCancelSampleData}
        onConfirm={handleConfirmSampleData}
        title="Create Sample Data"
        message={
          <Box>
            <Typography variant="body1">
              Are you sure you want to create sample data for <strong>{restaurantToAction?.name}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This will add sample menu items, tables, and other data to help the restaurant get started.
            </Typography>
          </Box>
        }
        confirmText="Create Sample Data"
        cancelText="Cancel"
        confirmColor="primary"
      />
    </Box>
  );
}