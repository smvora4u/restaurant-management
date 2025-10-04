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
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
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
import { getStatusColor, getStatusIcon } from '../utils/statusColors';
import { formatCurrency, formatCurrencySummary } from '../utils/currency';
import { formatDate, formatTimeAgo } from '../utils/dateFormatting';
import Layout from '../components/Layout';
import { GET_ORDERS, GET_MENU_ITEMS } from '../graphql';
import CreateOrderDialog from '../components/orders/CreateOrderDialog';

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
  tableNumber?: number;
  orderType: string;
  items: OrderItem[];
  status: string;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string | Date | number;
  updatedAt: string | Date | number;
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
  status: string;
}

export default function OrderListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tableNumber: '',
    orderType: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);

  const { data, loading, error, refetch } = useQuery<OrdersData>(GET_ORDERS, {
    errorPolicy: 'all',
    pollInterval: 30000, // Refresh every 30 seconds
  });

  const { data: menuData } = useQuery<MenuItemsData>(GET_MENU_ITEMS, {
    errorPolicy: 'ignore',
  });

  // Get restaurant data
  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (restaurantData) {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, []);

  const handleOrderCreated = (newOrder: any) => {
    setCreateOrderDialogOpen(false);
    // Navigate to the new order
    navigate(`/restaurant/orders/${newOrder.id}`);
  };

  // Filter orders based on current filter state
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
      
      const matchesStatus = !filters.status || order.status === filters.status;
      
      return matchesSearch && matchesTable && matchesOrderType && matchesStatus;
    });
  }, [data?.orders, filters]);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      tableNumber: '',
      orderType: '',
      status: '',
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
                label={order.status}
                color={getStatusColor(order.status)}
                icon={<span>{getStatusIcon(order.status)}</span>}
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
          {(order.customerName || order.customerPhone) && (
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
                  {order.customerName && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Customer Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {order.customerName}
                      </Typography>
                    </Box>
                  )}
                  {order.customerPhone && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Phone Number
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {order.customerPhone}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

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
              {data?.orders.length || 0}
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
              {formatCurrencySummary(data?.orders.reduce((sum, order) => sum + order.totalAmount, 0) || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Revenue
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {data?.orders.filter(order => order.status === 'pending').length || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Orders
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: showFilters ? 2 : 0
          }}>
            <Typography variant="h6">
              Orders ({filteredOrders.length})
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                size="small"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
                size="small"
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Filters */}
          {showFilters && (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
              gap: 2
            }}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Order ID, customer name, phone, notes..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              
              <TextField
                fullWidth
                label="Table Number"
                placeholder="e.g., 5"
                value={filters.tableNumber}
                onChange={(e) => handleFilterChange('tableNumber', e.target.value)}
                type="number"
              />
              
              <FormControl fullWidth>
                <InputLabel>Order Type</InputLabel>
                <Select
                  value={filters.orderType}
                  label="Order Type"
                  onChange={(e) => handleFilterChange('orderType', e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="dine-in">Dine-in</MenuItem>
                  <MenuItem value="takeout">Takeout</MenuItem>
                  <MenuItem value="delivery">Delivery</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Clear Filters Button */}
          {showFilters && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="text"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
              >
                Clear Filters
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Orders ({filteredOrders.length})
          </Typography>
          
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
                          label={order.status}
                          color={getStatusColor(order.status)}
                          size="small"
                          icon={<span>{getStatusIcon(order.status)}</span>}
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
                      
                      {order.customerName && (
                        <Typography variant="body2">
                          <strong>Customer:</strong> {order.customerName}
                        </Typography>
                      )}
                      
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
                        {order.customerName ? (
                          <Box>
                            <Typography variant="body2">{order.customerName}</Typography>
                            {order.customerPhone && (
                              <Typography variant="caption" color="text.secondary">
                                {order.customerPhone}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
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
                        label={order.status}
                        color={getStatusColor(order.status)}
                        size="small"
                        icon={<span>{getStatusIcon(order.status)}</span>}
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
            rowsPerPageOptions={[5, 10, 25, 50]}
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