import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Stack,
  useTheme,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  TableRestaurant as TableIcon,
  LocalShipping as ParcelIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Note as NoteIcon,
  AccessTime as TimeIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { getStatusColor, getStatusIcon, getPaidStatusLabel } from '../utils/statusColors';
import { ORDER_STATUSES } from '../constants/orderStatuses';
import { formatCurrency, formatCurrencySummary } from '../utils/currency';
import { formatDate, formatTimeAgo, getLocalDateString } from '../utils/dateFormatting';
import Layout from '../components/Layout';
import { GET_ORDERS, GET_MENU_ITEMS } from '../graphql';
import CreateOrderDialog from '../components/orders/CreateOrderDialog';
import { useOrderSubscriptions } from '../hooks/useOrderSubscriptions';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface OrderItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  price: number;
  status: string;
}

interface Order {
  id: string;
  tableNumber?: string | number;
  orderType: string;
  items: OrderItem[];
  status: string;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string | Date | number;
  updatedAt: string | Date | number;
  paid?: boolean;
  paidAt?: string;
  paymentMethod?: string;
}

interface OrdersData {
  orders: Order[];
}

interface MenuItemsData {
  menuItems: MenuItem[];
}

interface FilterState {
  search: string;
  tableNumber: string;
  orderType: string;
  status: string[];
  paymentFilter: 'all' | 'paid' | 'unpaid';
  fromDate: string;
  toDate: string;
}

export default function OrderListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filters, setFilters] = useState<FilterState>(() => ({
    search: '',
    tableNumber: '',
    orderType: '',
    status: [],
    paymentFilter: 'all' as const,
    fromDate: getLocalDateString(),
    toDate: getLocalDateString(),
  }));
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);

  // Get restaurant data
  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (restaurantData) {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, []);

  // Normalize filter date to YYYY-MM-DD for API (handles yyyy-mm-dd, dd-mm-yyyy, mm-dd-yyyy)
  const normalizeFilterDate = (value: string): string => {
    if (!value?.trim()) return '';
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parts = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (parts) {
      const a = parseInt(parts[1], 10);
      const b = parseInt(parts[2], 10);
      const year = parts[3];
      if (a > 31 || b > 31) return trimmed;
      if (b > 12) return `${year}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
      if (a > 12) return `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
      return `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return trimmed;
  };

  const { data, loading, error, refetch } = useQuery<OrdersData>(GET_ORDERS, {
    errorPolicy: 'all',
    variables: {
      fromDate: normalizeFilterDate(filters.fromDate) || undefined,
      toDate: normalizeFilterDate(filters.toDate) || undefined,
    },
  });

  useOrderSubscriptions({
    restaurantId: restaurant?.id || '',
    onOrderUpdated: () => refetch(),
    onOrderItemStatusUpdated: () => refetch(),
    onNewOrder: () => refetch(),
  });

  const { data: menuData } = useQuery<MenuItemsData>(GET_MENU_ITEMS, {
    errorPolicy: 'ignore',
  });

  const handleOrderCreated = (newOrder: any) => {
    setCreateOrderDialogOpen(false);
    // Navigate to the new order
    navigate(`/restaurant/orders/${newOrder.id}`);
  };

  // Filter orders based on current filter state (date filtering done on server)
  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];
    
    return data.orders.filter(order => {
      const matchesSearch = !filters.search || 
        order.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.customerPhone?.toLowerCase().includes(filters.search.toLowerCase()) ||
        order.notes?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesTable = !filters.tableNumber || 
        (order.tableNumber && order.tableNumber.toString() === filters.tableNumber);
      
      const matchesOrderType = !filters.orderType || order.orderType === filters.orderType;
      
      const matchesStatus = filters.status.length === 0 || filters.status.includes(order.status);

      const matchesPayment =
        filters.paymentFilter === 'all' ||
        (filters.paymentFilter === 'paid' && order.status === 'completed' && order.paid) ||
        (filters.paymentFilter === 'unpaid' && order.status === 'completed' && !order.paid);

      return matchesSearch && matchesTable && matchesOrderType && matchesStatus && matchesPayment;
    });
  }, [data?.orders, filters]);

  const handleFilterChange = (field: keyof FilterState, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      tableNumber: '',
      orderType: '',
      status: [],
      paymentFilter: 'all',
      fromDate: '',
      toDate: '',
    });
    setPage(0);
  };

  const handleAccordionChange = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  const getOrderTypeIcon = (orderType: string) => {
    switch (orderType) {
      case 'dine-in':
        return <TableIcon />;
      case 'takeout':
        return <ReceiptIcon />;
      case 'delivery':
        return <ParcelIcon />;
      default:
        return <ReceiptIcon />;
    }
  };

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType) {
      case 'dine-in':
        return 'Dine-in';
      case 'takeout':
        return 'Takeout';
      case 'delivery':
        return 'Delivery';
      default:
        return orderType;
    }
  };

  const getMenuItemDetails = (menuItemId: string) => {
    return menuData?.menuItems?.find(item => item.id === menuItemId) || null;
  };


  const paginatedOrders = filteredOrders.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalItems = filteredOrders.reduce((sum, order) => sum + order.items.length, 0);

  const renderOrderDetails = (order: Order) => {

    return (
      <AccordionDetails>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Order Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2
          }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Order Details
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' },
              alignItems: 'center'
            }}>
              <Chip
                label={order.status === 'completed' && order.paid ? getPaidStatusLabel() : order.status}
                color={(order.status === 'completed' && order.paid ? 'success' : getStatusColor(order.status)) as any}
                icon={<span>{order.status === 'completed' && order.paid ? '✓' : getStatusIcon(order.status)}</span>}
                sx={{ fontWeight: 500 }}
              />
              <Chip
                label={getOrderTypeLabel(order.orderType)}
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate(`/restaurant/orders/${order.id}`)}
                sx={{ ml: 1 }}
              >
                Manage Order
              </Button>
            </Box>
          </Box>

          {/* Customer Information */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Customer Information
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 2
              }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Customer Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Phone Number
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {order.customerPhone || '—'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <ReceiptIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Order Items ({order.items.length})
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'grid', 
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }
              }}>
                {order.items.map((item, index) => {
                  const menuItem = getMenuItemDetails(item.menuItemId);
                  return (
                    <Card key={`${order.id}-${item.menuItemId}-${index}`} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {menuItem?.name || `Item ${item.menuItemId}`}
                            </Typography>
                            {menuItem?.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {menuItem.description}
                              </Typography>
                            )}
                            {menuItem?.category && (
                              <Chip 
                                label={menuItem.category} 
                                size="small" 
                                variant="outlined"
                                sx={{ mb: 1 }}
                              />
                            )}
                          </Box>
                          <Chip
                            label={item.status}
                            size="small"
                            color={getStatusColor(item.status)}
                            icon={<span>{getStatusIcon(item.status)}</span>}
                          />
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 1
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            Quantity: <strong>{item.quantity}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Price: <strong>{formatCurrency(item.price)}</strong>
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: item.specialInstructions ? 1 : 0
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            Subtotal:
                          </Typography>
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                            {formatCurrency(item.price * item.quantity)}
                          </Typography>
                        </Box>
                        
                        {item.specialInstructions && (
                          <Box sx={{ 
                            mt: 1, 
                            p: 1, 
                            backgroundColor: 'grey.50', 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200'
                          }}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                              <NoteIcon sx={{ fontSize: 16, mt: 0.1 }} color="primary" />
                              <span style={{ fontStyle: 'italic' }}>{item.specialInstructions}</span>
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Order Notes */}
          {order.notes && (
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <NoteIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Order Notes
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.50', 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="body1">
                    {order.notes}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline & Summary */}
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TimeIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Order Timeline & Summary
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 3
              }}>
                {/* Timeline */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Timeline
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Order Created
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formatDate(order.createdAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(order.createdAt)}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formatDate(order.updatedAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(order.updatedAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Summary */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Order Summary
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'primary.50', 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'primary.200'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Items Count:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {order.items.length}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Quantity:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Total Amount:
                      </Typography>
                      <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </AccordionDetails>
    );
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography>Loading orders...</Typography>
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            Failed to load orders: {error.message}
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOrderDialogOpen(true)}
        >
          Create New Order
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3
      }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {filteredOrders.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Orders
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="secondary">
              {totalItems}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Items
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {formatCurrencySummary(filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Revenue
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {filteredOrders.filter(order => order.status === 'pending').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Orders
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Orders List with compact filters */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">
              Orders ({filteredOrders.length})
            </Typography>
            <Button variant="text" startIcon={<ClearIcon />} onClick={clearFilters} size="small">
              Clear Filters
            </Button>
          </Box>

          {/* Compact filter row */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mb: 2 }}
            useFlexGap
            flexWrap="wrap"
          >
            <TextField
              size="small"
              label="Search"
              placeholder="Order ID, customer, phone..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ minWidth: 140 }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />,
              }}
            />
            <TextField
              size="small"
              label="Table"
              placeholder="e.g., 5"
              value={filters.tableNumber}
              onChange={(e) => handleFilterChange('tableNumber', e.target.value)}
              sx={{ minWidth: 80 }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.orderType}
                label="Type"
                onChange={(e) => handleFilterChange('orderType', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="dine-in">Dine-in</MenuItem>
                <MenuItem value="takeout">Takeout</MenuItem>
                <MenuItem value="delivery">Delivery</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value as string[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((s) => (
                      <Chip key={s} label={s} size="small" sx={{ height: 20 }} />
                    ))}
                  </Box>
                )}
              >
                {ORDER_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Payment</InputLabel>
              <Select
                value={filters.paymentFilter}
                label="Payment"
                onChange={(e) => handleFilterChange('paymentFilter', e.target.value as 'all' | 'paid' | 'unpaid')}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="unpaid">Unpaid</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="From"
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 130 }}
            />
            <TextField
              size="small"
              label="To"
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 130 }}
            />
          </Stack>
          
          {isMobile ? (
            // Mobile view - Accordion layout
            <Box>
              {paginatedOrders.map((order) => (
                <Accordion
                  key={`mobile-${order.id}`}
                  expanded={expandedOrderId === order.id}
                  onChange={() => handleAccordionChange(order.id)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 1,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography variant="h6" component="div">
                        Order #{order.id.slice(-8)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={order.status === 'completed' && order.paid ? getPaidStatusLabel() : order.status}
                          color={(order.status === 'completed' && order.paid ? 'success' : getStatusColor(order.status)) as any}
                          size="small"
                          icon={<span>{order.status === 'completed' && order.paid ? '✓' : getStatusIcon(order.status)}</span>}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/restaurant/orders/${order.id}`);
                          }}
                        >
                          Manage
                        </Button>
                      </Box>
                    </Box>
                    
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getOrderTypeIcon(order.orderType)}
                        <Typography variant="body2">
                          {getOrderTypeLabel(order.orderType)}
                          {order.tableNumber && ` - Table ${order.tableNumber}`}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2">
                        <strong>Customer:</strong> {order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in')}
                      </Typography>
                      
                      <Typography variant="body2">
                        <strong>Items:</strong> {order.items.length} ({order.items.reduce((sum, item) => sum + item.quantity, 0)} total)
                      </Typography>
                      
                      <Typography variant="body2">
                        <strong>Total:</strong> {formatCurrency(order.totalAmount)}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        <strong>Created:</strong> {formatDate(order.createdAt)}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  {renderOrderDetails(order)}
                </Accordion>
              ))}
            </Box>
          ) : (
            // Desktop view - Accordion layout
            <Box>
              {/* Header row for desktop view */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '100px 120px 100px 150px 100px 80px 100px 150px',
                gap: 2,
                alignItems: 'center',
                width: '100%',
                minHeight: '40px',
                px: 2,
                py: 1,
                backgroundColor: 'grey.50',
                borderBottom: 1,
                borderColor: 'divider',
                fontWeight: 'medium'
              }}>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Order ID
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Table
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Items
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                  Created
                </Typography>
              </Box>
              {paginatedOrders.map((order) => (
                <Accordion
                  key={`desktop-${order.id}`}
                  expanded={expandedOrderId === order.id}
                  onChange={() => handleAccordionChange(order.id)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                        width: '100%',
                        mr: 2,
                      },
                    }}
                  >
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: '100px 120px 100px 150px 100px 80px 100px 150px',
                      gap: 2,
                      alignItems: 'center',
                      width: '100%',
                      minHeight: '40px'
                    }}>
                      <Typography variant="body2" fontFamily="monospace">
                        #{order.id.slice(-8)}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getOrderTypeIcon(order.orderType)}
                        <Typography variant="body2">
                          {getOrderTypeLabel(order.orderType)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        {order.tableNumber ? (
                          <Chip label={`Table ${order.tableNumber}`} size="small" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </Box>
                      
                      <Box>
                        <Typography variant="body2">{order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in')}</Typography>
                        {order.customerPhone && (
                          <Typography variant="caption" color="text.secondary">
                            {order.customerPhone}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box>
                        <Typography variant="body2">
                          {order.items.length} items
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} total
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                      
                      <Chip
                        label={order.status === 'completed' && order.paid ? getPaidStatusLabel() : order.status}
                        color={(order.status === 'completed' && order.paid ? 'success' : getStatusColor(order.status)) as any}
                        size="small"
                        icon={<span>{order.status === 'completed' && order.paid ? '✓' : getStatusIcon(order.status)}</span>}
                      />
                      
                      <Typography variant="body2">
                        {formatDate(order.createdAt)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  {renderOrderDetails(order)}
                </Accordion>
              ))}
            </Box>
          )}

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[50, 100, 150, 200]}
            component="div"
            count={filteredOrders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={createOrderDialogOpen}
        onClose={() => setCreateOrderDialogOpen(false)}
        onOrderCreated={handleOrderCreated}
        restaurant={restaurant}
      />
      </Box>
    </Layout>
  );
}