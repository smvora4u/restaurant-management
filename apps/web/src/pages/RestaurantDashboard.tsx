import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Restaurant,
  ShoppingCart,
  TableRestaurant,
  TrendingUp,
  QrCode
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import { GET_TABLES } from '../graphql/queries/tables';
import { GET_MENU_ITEMS } from '../graphql/queries/menu';
import { GET_ORDERS } from '../graphql/queries/orders';
import Layout from '../components/Layout';
import { DataFreshnessIndicator } from '../components/common';
import { useDataFreshness } from '../hooks/useDataFreshness';


export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Queries
  const { data: menuData, loading: menuLoading, refetch: refetchMenu } = useQuery(GET_MENU_ITEMS);
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ORDERS);
  const { data: tablesData, loading: tablesLoading, refetch: refetchTables } = useQuery(GET_TABLES);

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
      await refetchAllDataHook([
        () => refetchMenu(),
        () => refetchOrders(),
        () => refetchTables()
      ]);
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
    const restaurantData = localStorage.getItem('restaurant');
    if (!restaurantData) {
      navigate('/restaurant/login');
      return;
    }
    setRestaurant(JSON.parse(restaurantData));
  }, [navigate]);


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
            <DataFreshnessIndicator
              dataStaleWarning={dataStaleWarning}
              onRefresh={refetchAllData}
              position="header"
            />
            <Chip
              label="RESTAURANT"
              color="primary"
              size="small"
            />
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



        {/* Quick Actions */}
        <Card sx={{ mb: 4 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Restaurant />}
                onClick={() => navigate('/restaurant/menu')}
              >
                Manage Menu Items
              </Button>
              <Button
                variant="outlined"
                startIcon={<QrCode />}
                onClick={() => navigate('/restaurant/qr-codes')}
              >
                Manage QR Codes
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShoppingCart />}
                onClick={() => navigate('/restaurant/orders')}
              >
                View All Orders
              </Button>
              <Button
                variant="outlined"
                startIcon={<TableRestaurant />}
                onClick={() => navigate('/restaurant/tables')}
              >
                Manage Tables
              </Button>
            </Box>
          </Box>
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
    </Layout>
  );
}