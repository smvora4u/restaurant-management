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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Logout,
  Restaurant,
  ShoppingCart,
  TrendingUp,
  Add,
  Edit,
  Delete,
  Visibility,
  Search,
  Refresh,
  AdminPanelSettings,
  Group,
  Assessment,
  Settings,
  PersonAdd,
  AttachMoney,
  SupervisorAccount
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { formatDate, formatDateTime } from '../utils/dateFormatting';
import { GET_PLATFORM_ANALYTICS, GET_ALL_ORDERS } from '../graphql/queries/admin';
import { GET_ALL_RESTAURANTS } from '../graphql/queries/restaurant';
import { GET_STAFF_BY_RESTAURANT } from '../graphql/queries/staff';
import { DEACTIVATE_RESTAURANT, CREATE_SAMPLE_DATA } from '../graphql/mutations/admin';
import { CREATE_RESTAURANT, UPDATE_RESTAURANT, DEACTIVATE_RESTAURANT as DEACTIVATE_RESTAURANT_MUTATION } from '../graphql/mutations/restaurant';



interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}


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
  
  // Restaurant dialog state
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);
  const [restaurantDialogMode, setRestaurantDialogMode] = useState<'create' | 'edit'>('create');
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [restaurantFormData, setRestaurantFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      theme: 'light'
    }
  });
  const [restaurantSnackbar, setRestaurantSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Queries
  const { data: analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useQuery(GET_PLATFORM_ANALYTICS);
  const { data: restaurantsData, loading: restaurantsLoading, refetch: refetchRestaurants } = useQuery(GET_ALL_RESTAURANTS);
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ALL_ORDERS, {
    variables: { limit: orderRowsPerPage, offset: orderPage * orderRowsPerPage }
  });
  
  const { data: staffData, loading: staffLoading } = useQuery(GET_STAFF_BY_RESTAURANT, {
    variables: { restaurantId: selectedRestaurant?.id },
    skip: !selectedRestaurant
  });

  // Mutations
  const [deactivateRestaurant] = useMutation(DEACTIVATE_RESTAURANT, {
    onCompleted: () => {
      refetchRestaurants();
      refetchAnalytics();
    }
  });

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

  const [updateRestaurant, { loading: updateRestaurantLoading }] = useMutation(UPDATE_RESTAURANT, {
    onCompleted: () => {
      setRestaurantDialogOpen(false);
      setRestaurantSnackbar({
        open: true,
        message: 'Restaurant updated successfully!',
        severity: 'success'
      });
      refetchRestaurants();
    },
    onError: (error) => {
      setRestaurantSnackbar({
        open: true,
        message: `Error updating restaurant: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [deactivateRestaurantMutation] = useMutation(DEACTIVATE_RESTAURANT_MUTATION, {
    onCompleted: () => {
      setRestaurantSnackbar({
        open: true,
        message: 'Restaurant deactivated successfully!',
        severity: 'success'
      });
      refetchRestaurants();
      refetchAnalytics();
    },
    onError: (error) => {
      setRestaurantSnackbar({
        open: true,
        message: `Error deactivating restaurant: ${error.message}`,
        severity: 'error'
      });
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

  const handleDeactivateRestaurant = async (restaurantId: string) => {
    try {
      await deactivateRestaurant({ variables: { id: restaurantId } });
    } catch (error) {
      console.error('Error deactivating restaurant:', error);
    }
  };

  const handleCreateSampleData = async (restaurantId: string) => {
    try {
      await createSampleData({ variables: { restaurantId } });
    } catch (error) {
      console.error('Error creating sample data:', error);
    }
  };

  const handleViewStaff = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
  };

  // Restaurant dialog handlers
  const handleOpenRestaurantDialog = (mode: 'create' | 'edit', restaurant?: any) => {
    setRestaurantDialogMode(mode);
    if (mode === 'edit' && restaurant) {
      setEditingRestaurantId(restaurant.id);
      setRestaurantFormData({
        name: restaurant.name || '',
        email: restaurant.email || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
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
        address: '',
        phone: '',
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
    setRestaurantFormData({
      name: '',
      email: '',
      address: '',
      phone: '',
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
    }
  };

  const handleRestaurantSubmit = () => {
    if (restaurantDialogMode === 'create') {
      createRestaurant({
        variables: {
          input: restaurantFormData
        }
      });
    } else if (editingRestaurantId) {
      updateRestaurant({
        variables: {
          id: editingRestaurantId,
          input: restaurantFormData
        }
      });
    }
  };

  const handleDeactivateRestaurantFromDialog = async (restaurantId: string) => {
    try {
      await deactivateRestaurantMutation({
        variables: { id: restaurantId }
      });
    } catch (error) {
      console.error('Error deactivating restaurant:', error);
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AttachMoney sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Total Revenue
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      ${analyticsLoading ? '...' : (analytics?.totalRevenue || 0).toFixed(2)}
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
            </Tabs>
          </Box>

          {/* Restaurants Tab */}
          <TabPanel value={activeTab} index={0}>
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

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                    <TableCell>Restaurant</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {restaurantsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                  ) : filteredRestaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="info">No restaurants found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                    filteredRestaurants
                      .slice(restaurantPage * restaurantRowsPerPage, restaurantPage * restaurantRowsPerPage + restaurantRowsPerPage)
                      .map((restaurant: any) => (
                    <TableRow key={restaurant.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                <Restaurant />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {restaurant.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {restaurant.address || 'No address'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                      <TableCell>{restaurant.email}</TableCell>
                          <TableCell>
                            <Chip label={restaurant.slug} size="small" variant="outlined" />
                          </TableCell>
                      <TableCell>
                        <Chip
                          label={restaurant.isActive ? 'Active' : 'Inactive'}
                          color={restaurant.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(restaurant.createdAt)}
                      </TableCell>
                      <TableCell>
                            <IconButton size="small" onClick={() => handleViewStaff(restaurant)}>
                              <Group />
                        </IconButton>
                            <IconButton size="small" onClick={() => handleOpenRestaurantDialog('edit', restaurant)}>
                          <Edit />
                        </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => handleCreateSampleData(restaurant.id)}
                              title="Create Sample Data"
                            >
                              <Add />
                        </IconButton>
                        <IconButton 
                          size="small"
                          onClick={() => handleDeactivateRestaurant(restaurant.id)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredRestaurants.length}
              rowsPerPage={restaurantRowsPerPage}
              page={restaurantPage}
              onPageChange={handleRestaurantPageChange}
              onRowsPerPageChange={handleRestaurantRowsPerPageChange}
            />
          </TabPanel>

          {/* Orders Tab */}
          <TabPanel value={activeTab} index={1}>
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

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                  ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="info">No orders found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                    filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {order.id.slice(-8)}
                          </Typography>
                        </TableCell>
                      <TableCell>
                        <Chip
                          label={order.orderType}
                          size="small"
                          color="primary"
                            variant="outlined"
                        />
                      </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {order.customerName || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.customerPhone || 'No phone'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            ${order.totalAmount.toFixed(2)}
                          </Typography>
                        </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          size="small"
                          color={
                            order.status === 'completed' ? 'success' :
                            order.status === 'pending' ? 'warning' :
                            order.status === 'cancelled' ? 'error' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const { date, time } = formatDateTime(order.createdAt);
                          return (
                            <>
                              <Typography variant="body2">
                                {date}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {time}
                              </Typography>
                            </>
                          );
                        })()}
                      </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                          <IconButton size="small">
                            <Edit />
                          </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
              count={-1}
              rowsPerPage={orderRowsPerPage}
              page={orderPage}
              onPageChange={handleOrderPageChange}
              onRowsPerPageChange={handleOrderRowsPerPageChange}
            />
          </TabPanel>

          {/* Staff Tab */}
          <TabPanel value={activeTab} index={2}>
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
                >
                  Add Staff Member
                </Button>
                
                {staffLoading ? (
                  <LinearProgress />
                ) : staff.length === 0 ? (
                  <Alert severity="info">No staff members found for this restaurant</Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {staff.map((staffMember: any) => (
                          <TableRow key={staffMember.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                                  <SupervisorAccount />
                                </Avatar>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {staffMember.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{staffMember.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={staffMember.role.replace('_', ' ')}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={staffMember.isActive ? 'Active' : 'Inactive'}
                                color={staffMember.isActive ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {formatDate(staffMember.createdAt)}
                            </TableCell>
                            <TableCell>
                              <IconButton size="small">
                                <Edit />
                              </IconButton>
                              <IconButton size="small">
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={activeTab} index={3}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Total Revenue</Typography>
                      <Typography fontWeight="bold">${analytics?.totalRevenue?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Average Order Value</Typography>
                      <Typography fontWeight="bold">
                        ${analytics ? (analytics.totalRevenue / analytics.totalOrders).toFixed(2) : '0.00'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={activeTab} index={4}>
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
                      <Button variant="outlined" startIcon={<Refresh />}>
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
        </Card>
      </Container>

      {/* Restaurant Dialog */}
      <Dialog open={restaurantDialogOpen} onClose={handleCloseRestaurantDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {restaurantDialogMode === 'create' ? 'Add New Restaurant' : 'Edit Restaurant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Restaurant Name"
              value={restaurantFormData.name}
              onChange={(e) => handleRestaurantFormChange('name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={restaurantFormData.email}
              onChange={(e) => handleRestaurantFormChange('email', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Address"
              value={restaurantFormData.address}
              onChange={(e) => handleRestaurantFormChange('address', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Phone"
              value={restaurantFormData.phone}
              onChange={(e) => handleRestaurantFormChange('phone', e.target.value)}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={restaurantFormData.settings.currency}
                  onChange={(e) => handleRestaurantFormChange('settings.currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="INR">INR</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={restaurantFormData.settings.timezone}
                  onChange={(e) => handleRestaurantFormChange('settings.timezone', e.target.value)}
                  label="Timezone"
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">America/New_York</MenuItem>
                  <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                  <MenuItem value="Europe/London">Europe/London</MenuItem>
                  <MenuItem value="Asia/Kolkata">Asia/Kolkata</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={restaurantFormData.settings.theme}
                onChange={(e) => handleRestaurantFormChange('settings.theme', e.target.value)}
                label="Theme"
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRestaurantDialog}>Cancel</Button>
          <Button 
            onClick={handleRestaurantSubmit} 
            variant="contained"
            disabled={createRestaurantLoading || updateRestaurantLoading}
          >
            {createRestaurantLoading || updateRestaurantLoading ? (
              <CircularProgress size={20} />
            ) : (
              restaurantDialogMode === 'create' ? 'Create' : 'Update'
            )}
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}