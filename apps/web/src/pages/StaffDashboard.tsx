import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
  InputAdornment,
  Chip
} from '@mui/material';
import {
  ShoppingCart,
  Restaurant,
  TrendingUp,
  AccessTime,
  Search,
  FilterList,
  Add as AddIcon
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { formatDate } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import StaffLayout from '../components/StaffLayout';
import { GET_ORDERS_FOR_STAFF } from '../graphql';
import CreateOrderDialog from '../components/orders/CreateOrderDialog';
import { getStatusColor, getStatusMuiIcon } from '../utils/statusColors';

export default function StaffDashboard() {
  const navigate = useNavigate();
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
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);

  // Queries
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ORDERS_FOR_STAFF, {
    variables: { restaurantId: staff?.restaurantId },
    skip: !staff?.restaurantId
  });

  // Simple refetch function (currently unused)

  const handleOrderCreated = (order: any) => {
    setCreateOrderDialogOpen(false);
    setSnackbar({
      open: true,
      message: `Order #${order.id.slice(-8)} created successfully!`,
      severity: 'success'
    });
    refetchOrders();
    navigate(`/staff/orders/${order.id}`);
  };

  useEffect(() => {
    const staffData = localStorage.getItem('staff');
    const restaurantData = localStorage.getItem('restaurant');
    if (!staffData) {
      navigate('/staff/login');
      return;
    }
    setStaff(JSON.parse(staffData));
    if (restaurantData && restaurantData !== 'undefined' && restaurantData !== 'null') {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, [navigate]);


  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
    <StaffLayout staffPermissions={staff.permissions} staff={staff} restaurant={restaurant}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1">
              Staff Dashboard - {staff.name}
            </Typography>
            {restaurant && (
              <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
                Managing: <strong>{restaurant.name}</strong>
                {restaurant.address && ` • ${restaurant.address}`}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {Array.isArray(staff?.permissions) && staff.permissions.includes('manage_orders') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOrderDialogOpen(true)}
              >
                Create New Order
              </Button>
            )}
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
                          {(() => {
                            const StatusIconComp = getStatusMuiIcon(order.status);
                            return (
                              <Chip
                                icon={<StatusIconComp fontSize="small" />}
                                label={order.status}
                                size="small"
                                color={getStatusColor(order.status)}
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          {Array.isArray(staff?.permissions) && staff.permissions.includes('manage_orders') ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => navigate(`/staff/orders/${order.id}`)}
                            >
                              Manage
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              View Only
                            </Typography>
                          )}
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

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={createOrderDialogOpen}
        onClose={() => setCreateOrderDialogOpen(false)}
        onOrderCreated={handleOrderCreated}
        restaurant={restaurant}
      />
    </StaffLayout>
  );
}