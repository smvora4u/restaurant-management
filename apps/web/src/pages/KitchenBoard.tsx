import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';
import {
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import StaffLayout from '../components/StaffLayout';
import KitchenItemCard from '../components/kitchen/KitchenItemCard';
import { useOrderSubscriptions } from '../hooks/useOrderSubscriptions';
import { GET_ORDERS_FOR_STAFF, GET_MENU_ITEMS } from '../graphql';
import { UPDATE_ORDER_ITEM_STATUS_FOR_STAFF } from '../graphql/mutations/staff';
import { getStatusBackgroundColor } from '../utils/statusColors';

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
  customerName?: string;
  isUpdating?: boolean;
}

const statusColumns = [
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'served', label: 'Served' }
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  
  // Track which items are currently being updated to prevent duplicate backend updates
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

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
    onCompleted: (data) => {
      console.log('Kitchen Board - Mutation completed successfully:', data);
      setSnackbar({
        open: true,
        message: 'Item status updated successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      console.error('Kitchen Board - Mutation error:', error);
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
    onOrderUpdated: (updatedOrder) => {
      console.log('Kitchen Board - Order updated received:', updatedOrder);
      refetchOrders();
    },
    onOrderItemStatusUpdated: (updatedOrder) => {
      console.log('Kitchen Board - Order item status updated received:', updatedOrder);
      refetchOrders();
    },
    onNewOrder: (newOrder) => {
      console.log('Kitchen Board - New order received:', newOrder);
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

  // Cleanup updating items when component unmounts
  useEffect(() => {
    return () => {
      setUpdatingItems(new Set());
    };
  }, []);

  // Create menu items lookup
  const menuItemsMap = useMemo(() => {
    if (!menuData?.menuItems) return {};
    return menuData.menuItems.reduce((acc: any, item: any) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [menuData]);

  // Flatten and process order items with merging
  const flattenedItems = useMemo(() => {
    if (!ordersData?.ordersForStaff) return [];
    
    const items: FlattenedItem[] = [];
    
    ordersData.ordersForStaff.forEach((order: any) => {
      // Merge items within each order that have same menuItemId, status, and specialInstructions
      const mergedItemsMap = new Map<string, { item: any; itemIndex: number }>();
      
      order.items.forEach((item: any, itemIndex: number) => {
        // Skip cancelled items
        if (item.status === 'cancelled') return;
        
        // Normalize specialInstructions: undefined, null, or empty string all become empty string
        const normalizedInstructions = (item.specialInstructions && item.specialInstructions.trim()) || '';
        const key = `${item.menuItemId}-${item.status}-${normalizedInstructions}`;
        
        if (mergedItemsMap.has(key)) {
          // Merge with existing item - update quantity
          const existing = mergedItemsMap.get(key)!;
          existing.item.quantity += item.quantity;
          // Ensure specialInstructions is normalized in the merged item
          existing.item.specialInstructions = normalizedInstructions || undefined;
        } else {
          // Add new item with normalized specialInstructions
          const newItem = { ...item };
          newItem.specialInstructions = normalizedInstructions || undefined;
          mergedItemsMap.set(key, { item: newItem, itemIndex });
        }
      });
      
      // Convert merged items to FlattenedItem format
      mergedItemsMap.forEach(({ item, itemIndex }) => {
        const itemKey = `${order.id}-${itemIndex}`;
        const isItemUpdating = updatingItems.has(itemKey);
        
        // Preserve the normalized specialInstructions to ensure consistency
        const normalizedInstructions = (item.specialInstructions && item.specialInstructions.trim()) || '';
        
        items.push({
          orderId: order.id,
          itemIndex, // Use original index for tracking
          menuItemId: item.menuItemId,
          quantity: item.quantity, // Show merged quantity
          status: item.status as 'pending' | 'preparing' | 'ready' | 'served',
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          specialInstructions: normalizedInstructions || undefined, // Use normalized value, or undefined if empty
          itemName: menuItemsMap[item.menuItemId]?.name || 'Loading...',
          customerName: order.customerName,
          isUpdating: isItemUpdating
        });
      });
    });
    
    return items;
  }, [ordersData, menuItemsMap, updatingItems]);

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

    // Find the actual item index in the order (since items may be merged)
    const order = ordersData?.ordersForStaff?.find((o: any) => o.id === item.orderId);
    if (!order) {
      setSnackbar({
        open: true,
        message: 'Order not found',
        severity: 'error'
      });
      return;
    }

    // Find the first item that matches this menuItemId, current status, and specialInstructions
    // Normalize specialInstructions for comparison
    const normalizeInstructions = (instructions: any) => (instructions && instructions.trim()) || '';
    const itemInstructions = normalizeInstructions(item.specialInstructions);
    
    const actualItemIndex = order.items.findIndex((orderItem: any) => {
      const orderItemInstructions = normalizeInstructions(orderItem.specialInstructions);
      return orderItem.menuItemId === item.menuItemId &&
        orderItem.status === item.status &&
        orderItemInstructions === itemInstructions;
    });

    if (actualItemIndex === -1) {
      setSnackbar({
        open: true,
        message: 'Item not found in order',
        severity: 'error'
      });
      return;
    }

    const itemKey = `${item.orderId}-${actualItemIndex}`;
    
    // Check if this item is already being updated
    if (updatingItems.has(itemKey)) {
      console.log('Item is already being updated:', itemKey);
      return;
    }
    
    // Mark this item as being updated
    setUpdatingItems(prev => new Set(prev).add(itemKey));
    
    console.log('Updating item status:', {
      orderId: item.orderId,
      itemIndex: actualItemIndex,
      status: nextStatus,
      quantity: item.quantity
    });
    
    try {
      await updateItemStatus({
        variables: {
          orderId: item.orderId,
          itemIndex: actualItemIndex,
          status: nextStatus
        }
      });
      
      console.log('Item status update successful');
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Item moved to ${nextStatus}`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error updating item status:', error);
      
      // Show error message
      setSnackbar({
        open: true,
        message: `Error updating item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      // Remove from updating set
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
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
          </Box>
        </Box>

        {/* Kitchen Board Columns */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Box sx={{ 
            display: 'flex', 
            height: '100%', 
            gap: 2,
            '& > *': {
              flex: '1 1 25%', // Each column takes exactly 25% width
              minWidth: 0 // Prevent flex items from overflowing
            }
          }}>
            {statusColumns.map((column) => (
              <Box key={column.key} sx={{ height: '100%' }}>
                <Paper
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: getStatusBackgroundColor(column.key),
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
                        color: 'text.secondary',
                        textAlign: 'center'
                      }}>
                        <Typography variant="h6" sx={{ opacity: 0.6 }}>
                          No {column.label.toLowerCase()} items
                        </Typography>
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
              </Box>
            ))}
          </Box>
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
