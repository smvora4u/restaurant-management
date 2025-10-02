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
  TextField
} from '@mui/material';
import {
  Logout,
  Restaurant,
  ShoppingCart,
  TableRestaurant,
  TrendingUp,
  Add,
  Edit,
  Delete,
  QrCode
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { formatDate } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import { GET_TABLES } from '../graphql/queries/tables';
import { GET_MENU_ITEMS } from '../graphql/queries/menu';
import { GET_ORDERS } from '../graphql/queries/orders';
import Layout from '../components/Layout';
import QRCodeGenerator from '../components/QRCodeGenerator';


export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [customTableNumber, setCustomTableNumber] = useState('');
  const [showCustomQR, setShowCustomQR] = useState(false);

  // Queries
  const { data: menuData, loading: menuLoading } = useQuery(GET_MENU_ITEMS);
  const { data: ordersData, loading: ordersLoading } = useQuery(GET_ORDERS);
  const { data: tablesData, loading: tablesLoading } = useQuery(GET_TABLES);

  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (!restaurantData) {
      navigate('/restaurant/login');
      return;
    }
    setRestaurant(JSON.parse(restaurantData));
  }, [navigate]);

  // Memoize base URL to prevent QR code regeneration
  const baseUrl = window.location.origin;

  const handleLogout = () => {
    localStorage.removeItem('restaurantToken');
    localStorage.removeItem('restaurant');
    navigate('/restaurant/login');
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

  if (!restaurant) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const menuItems = menuData?.menuItems || [];
  const orders = ordersData?.orders || [];
  const tables = tablesData?.tables || [];

  // Calculate statistics
  const totalMenuItems = menuItems.length;
  const availableMenuItems = menuItems.filter((item: any) => item.available).length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            {restaurant.name} - Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label="RESTAURANT"
              color="primary"
              size="small"
            />
            <IconButton onClick={handleMenuClick}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {restaurant.name.charAt(0).toUpperCase()}
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
          <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Restaurant color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Menu Items
                    </Typography>
                    <Typography variant="h4">
                      {menuLoading ? '...' : totalMenuItems}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {availableMenuItems} available
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ShoppingCart color="success" sx={{ fontSize: 40, mr: 2 }} />
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

          <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUp color="warning" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Total Revenue
                    </Typography>
                    <Typography variant="h4">
                      {ordersLoading ? '...' : formatCurrencyFromRestaurant(totalRevenue, restaurant)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TableRestaurant color="info" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Tables
                    </Typography>
                    <Typography variant="h4">
                      {tablesLoading ? '...' : tables.length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* QR Code Management */}
        <Card sx={{ mb: 4 }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCode color="primary" />
              <Typography variant="h6" component="h2">
                QR Code Management
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/qr-codes')}
              startIcon={<QrCode />}
            >
              View All QR Codes
            </Button>
          </Box>
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              QR codes for your restaurant tables and parcel orders. Table QR codes are automatically generated based on your actual tables.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                For Tables (Dine-in Orders):
              </Typography>
              {tablesData?.tables && tablesData.tables.length > 0 ? (
                tablesData.tables.slice(0, 3).map((table: any) => (
                  <QRCodeGenerator 
                    key={`dashboard-table-${table.number}`}
                    value={`${baseUrl}/consumer/${restaurant?.slug || 'restaurant'}/${table.number}`} 
                    label={`Table ${table.number}`} 
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tables found. Create tables to generate QR codes.
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                For Parcel Orders:
              </Typography>
              <QRCodeGenerator 
                value={`${baseUrl}/parcel/${restaurant?.slug || 'restaurant'}/takeout`} 
                label="Takeout Order" 
              />
              <QRCodeGenerator 
                value={`${baseUrl}/parcel/${restaurant?.slug || 'restaurant'}/delivery`} 
                label="Delivery Order" 
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                Test Links:
              </Typography>
              {tablesData?.tables && tablesData.tables.length > 0 ? (
                tablesData.tables.slice(0, 3).map((table: any) => (
                  <Button
                    key={`test-table-${table.number}`}
                    variant="outlined"
                    href={`/consumer/${restaurant?.slug || 'restaurant'}/${table.number}`}
                    target="_blank"
                    size="small"
                  >
                    Test Table {table.number}
                  </Button>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tables available for testing.
                </Typography>
              )}
              <Button
                variant="outlined"
                href={`/parcel/${restaurant?.slug || 'restaurant'}/takeout`}
                target="_blank"
                size="small"
              >
                Test Takeout
              </Button>
              <Button
                variant="outlined"
                href={`/parcel/${restaurant?.slug || 'restaurant'}/delivery`}
                target="_blank"
                size="small"
              >
                Test Delivery
              </Button>
            </Box>

            {/* Custom QR Code Generation */}
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Generate Custom QR Code
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Table Number"
                  type="number"
                  value={customTableNumber}
                  onChange={(e) => setCustomTableNumber(e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                  inputProps={{ min: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={() => setShowCustomQR(!!customTableNumber)}
                  disabled={!customTableNumber}
                >
                  Generate QR Code
                </Button>
              </Box>
              
              {showCustomQR && customTableNumber && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <QRCodeGenerator 
                    value={`${baseUrl}/consumer/${restaurant?.slug || 'restaurant'}/${customTableNumber}`} 
                    label={`Table ${customTableNumber}`} 
                  />
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Menu Items Table */}
        <Card sx={{ mb: 4 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2">
              Menu Items
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/restaurant/menu/new')}
            >
              Add Menu Item
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prep Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {menuLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : menuItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="info">No menu items found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  menuItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.description || 'No description'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{formatCurrencyFromRestaurant(item.price, restaurant)}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.available ? 'Available' : 'Unavailable'}
                          color={item.available ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.preparationTime || 'N/A'} min</TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                        <IconButton size="small">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Recent Orders Table */}
        <Card>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" component="h2">
              Recent Orders
            </Typography>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="info">No orders found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders
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
                          {formatDate(order.createdAt)}
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
            count={orders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Box>
    </Layout>
  );
}