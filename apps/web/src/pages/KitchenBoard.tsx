import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Button
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import StaffLayout from '../components/StaffLayout';
import KitchenItemCard from '../components/kitchen/KitchenItemCard';
import { useOrderSubscriptions } from '../hooks/useOrderSubscriptions';
import { GET_ORDERS_FOR_STAFF, GET_MENU_ITEMS } from '../graphql';
import { UPDATE_ORDER_ITEM_STATUS_FOR_STAFF } from '../graphql/mutations/staff';

interface FlattenedItem {
  orderId: string;
  itemIndex: number;
  menuItemId: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  tableNumber?: number;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  specialInstructions?: string;
  itemName?: string;
}

const statusColumns = [
  { key: 'pending', label: 'Pending', color: '#fff3cd' },
  { key: 'preparing', label: 'Preparing', color: '#d1ecf1' },
  { key: 'ready', label: 'Ready', color: '#d4edda' },
  { key: 'served', label: 'Served', color: '#e2e3e5' }
] as const;

const getNextStatus = (currentStatus: string): string | null => {
  switch (currentStatus) {
    case 'pending': return 'preparing';
    case 'preparing': return 'ready';
    case 'ready': return 'served';
    case 'served': return null; // No next status
    default: return null;
  }
};

export default function KitchenBoard() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Queries
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ORDERS_FOR_STAFF, {
    variables: { restaurantId: staff?.restaurantId },
    skip: !staff?.restaurantId,
    fetchPolicy: 'cache-and-network'
  });

  const { data: menuData } = useQuery(GET_MENU_ITEMS, {
    skip: !staff?.restaurantId
  });

  // Mutation
  const [updateItemStatus] = useMutation(UPDATE_ORDER_ITEM_STATUS_FOR_STAFF, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Item status updated successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error updating status: ${error.message}`,
        severity: 'error'
      });
    }
  });

  // Real-time subscriptions
  useOrderSubscriptions({
    restaurantId: staff?.restaurantId || '',
    onOrderUpdated: () => {
      refetchOrders();
    },
    onOrderItemStatusUpdated: () => {
      refetchOrders();
    },
    onNewOrder: () => {
      refetchOrders();
    }
  });

  // Initialize staff data
  useEffect(() => {
    const staffData = localStorage.getItem('staff');
    const restaurantData = localStorage.getItem('restaurant');
    
    if (!staffData) {
      navigate('/login');
      return;
    }
    
    setStaff(JSON.parse(staffData));
    if (restaurantData && restaurantData !== 'undefined' && restaurantData !== 'null') {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, [navigate]);

  // Create menu items lookup
  const menuItemsMap = useMemo(() => {
    if (!menuData?.menuItems) return {};
    return menuData.menuItems.reduce((acc: any, item: any) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [menuData]);

  // Flatten and process order items
  const flattenedItems = useMemo(() => {
    if (!ordersData?.ordersForStaff) return [];
    
    const items: FlattenedItem[] = [];
    
    ordersData.ordersForStaff.forEach((order: any) => {
      order.items.forEach((item: any, itemIndex: number) => {
        // Skip cancelled items
        if (item.status === 'cancelled') return;
        
        // Create individual cards for each quantity
        for (let i = 0; i < item.quantity; i++) {
          items.push({
            orderId: order.id,
            itemIndex,
            menuItemId: item.menuItemId,
            quantity: 1, // Each card represents 1 quantity
            status: item.status,
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            specialInstructions: item.specialInstructions,
            itemName: menuItemsMap[item.menuItemId]?.name || 'Loading...'
          });
        }
      });
    });
    
    return items;
  }, [ordersData, menuItemsMap]);

  // Group items by status
  const itemsByStatus = useMemo(() => {
    const grouped: Record<string, FlattenedItem[]> = {
      pending: [],
      preparing: [],
      ready: [],
      served: []
    };
    
    flattenedItems.forEach(item => {
      if (grouped[item.status]) {
        grouped[item.status].push(item);
      }
    });
    
    return grouped;
  }, [flattenedItems]);

  const handleItemClick = async (item: FlattenedItem) => {
    const nextStatus = getNextStatus(item.status);
    if (!nextStatus) {
      setSnackbar({
        open: true,
        message: 'This item is already served and cannot be moved further.',
        severity: 'info'
      });
      return;
    }

    const itemKey = `${item.orderId}-${item.itemIndex}`;
    setUpdatingItems(prev => new Set(prev).add(itemKey));

    try {
      await updateItemStatus({
        variables: {
          orderId: item.orderId,
          itemIndex: item.itemIndex,
          status: nextStatus
        }
      });
    } catch (error) {
      console.error('Error updating item status:', error);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refetchOrders();
      setSnackbar({
        open: true,
        message: 'Kitchen board refreshed!',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error refreshing data',
        severity: 'error'
      });
    }
  };

  if (!staff) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const totalItems = flattenedItems.length;

  return (
    <StaffLayout staffPermissions={staff.permissions} staff={staff} restaurant={restaurant}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1
        }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RestaurantIcon />
              Kitchen Board
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Real-time order item management
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={`${totalItems} Items`} 
              color="primary" 
              variant="outlined" 
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={ordersLoading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Kitchen Board Columns */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {statusColumns.map((column) => (
              <Grid item xs={12} sm={6} md={3} key={column.key} sx={{ height: '100%' }}>
                <Paper
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: column.color,
                    border: '2px solid',
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  {/* Column Header */}
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: '2px solid', 
                    borderColor: 'divider',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    <Typography variant="h5" component="h2" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {column.label}
                    </Typography>
                    <Typography variant="h6" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      {itemsByStatus[column.key]?.length || 0} items
                    </Typography>
                  </Box>

                  {/* Items Container */}
                  <Box sx={{ 
                    flex: 1, 
                    p: 2, 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      backgroundColor: 'rgba(0,0,0,0.5)',
                    },
                  }}>
                    {ordersLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : itemsByStatus[column.key]?.length === 0 ? (
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '200px',
                        color: 'text.secondary'
                      }}>
                        <Typography variant="h6">No items</Typography>
                      </Box>
                    ) : (
                      itemsByStatus[column.key]?.map((item, index) => {
                        const itemKey = `${item.orderId}-${item.itemIndex}`;
                        const isUpdating = updatingItems.has(itemKey);
                        
                        return (
                          <KitchenItemCard
                            key={`${item.orderId}-${item.itemIndex}-${index}`}
                            item={item}
                            isUpdating={isUpdating}
                            onClick={() => handleItemClick(item)}
                          />
                        );
                      })
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Instructions */}
        <Box sx={{ p: 2, backgroundColor: 'background.paper', mt: 2, borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            💡 Click on any item card to move it to the next status. Items flow: Pending → Preparing → Ready → Served
          </Typography>
        </Box>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StaffLayout>
  );
}
