import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Logout,
  ShoppingCart,
  Restaurant,
  TrendingUp,
  AccessTime,
  CheckCircle,
  Cancel,
  Search,
  FilterList
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { formatDate } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import StaffLayout from '../components/StaffLayout';
import { DataFreshnessIndicator } from '../components/common';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { GET_ORDERS_FOR_STAFF } from '../graphql';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [staff, setStaff] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Queries
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ORDERS_FOR_STAFF, {
    variables: { restaurantId: staff?.restaurantId },
    skip: !staff?.restaurantId
  });

  // Data freshness management
  const {
    dataStaleWarning,
    refetchAllData: refetchAllDataHook
  } = useDataFreshness({
    onStaleData: () => {
      setSnackbar({
        open: true,
        message: 'Data might be outdated. Consider refreshing.',
        severity: 'warning'
      });
    }
  });

  // Enhanced refetch function
  const refetchAllData = async () => {
    try {
      await refetchAllDataHook([() => refetchOrders()]);
      setSnackbar({
        open: true,
        message: 'All data refreshed successfully!',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error refreshing data. Please try again.',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    const staffData = localStorage.getItem('staff');
    const restaurantData = localStorage.getItem('restaurant');
    if (!staffData) {
      navigate('/staff/login');
      return;
    }
    setStaff(JSON.parse(staffData));
    if (restaurantData) {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staff');
    navigate('/staff/login');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'preparing': return 'info';
      case 'ready': return 'primary';
      case 'confirmed': return 'secondary';
      case 'served': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'cancelled': return <Cancel />;
      case 'preparing': return <AccessTime />;
      case 'ready': return <Restaurant />;
      case 'served': return <CheckCircle />;
      default: return <ShoppingCart />;
    }
  };

  if (!staff) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const orders = ordersData?.ordersForStaff || [];

  // Filter orders based on search term and status
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((order: any) => order.status === 'pending').length;
  const preparingOrders = orders.filter((order: any) => order.status === 'preparing').length;
  const readyOrders = orders.filter((order: any) => order.status === 'ready').length;
  // const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);

  return (
    <StaffLayout staffPermissions={staff.permissions}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Staff Dashboard - {staff.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DataFreshnessIndicator
              dataStaleWarning={dataStaleWarning}
              onRefresh={refetchAllData}
              position="header"
            />
            <Chip
              label={staff.role.toUpperCase()}
              color="secondary"
              size="small"
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
        </Box>

        {/* Analytics Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ShoppingCart color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Total Orders
                    </Typography>
                    <Typography variant="h4">
                      {ordersLoading ? '...' : totalOrders}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AccessTime color="warning" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Pending
                    </Typography>
                    <Typography variant="h4">
                      {ordersLoading ? '...' : pendingOrders}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Restaurant color="info" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Preparing
                    </Typography>
                    <Typography variant="h4">
                      {ordersLoading ? '...' : preparingOrders}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUp color="success" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Ready
                    </Typography>
                    <Typography variant="h4">
                      {ordersLoading ? '...' : readyOrders}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Search and Filter */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setStatusFilter(statusFilter === 'all' ? 'pending' : 'all')}
              >
                {statusFilter === 'all' ? 'Show Pending Only' : 'Show All'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" component="h2">
              Orders ({filteredOrders.length})
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Table</TableCell>
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
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Alert severity="info">No orders found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.id.slice(-8)}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.orderType}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          {order.tableNumber ? `Table ${order.tableNumber}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">
                              {order.customerName || 'Walk-in'}
                            </Typography>
                            {order.customerPhone && (
                              <Typography variant="caption" color="text.secondary">
                                {order.customerPhone}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{formatCurrencyFromRestaurant(order.totalAmount, restaurant)}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(order.status)}
                            label={order.status}
                            size="small"
                            color={getStatusColor(order.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/staff/orders/${order.id}`)}
                          >
                            Manage
                          </Button>
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
            count={filteredOrders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Box>

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
        >
          {snackbar.message}
        </Alert>
      )}
    </StaffLayout>
  );
}