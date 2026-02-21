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
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import StaffLayout from '../components/StaffLayout';
import Layout from '../components/Layout';
import KitchenItemCard from '../components/kitchen/KitchenItemCard';
import { useOrderSubscriptions } from '../hooks/useOrderSubscriptions';
import { GET_ORDERS_FOR_STAFF, GET_MENU_ITEMS } from '../graphql';
import { GET_ORDER_BY_ID } from '../graphql/queries/orders';
import { UPDATE_ORDER } from '../graphql/mutations/orders';
import { updatePartialQuantityStatus, mergeOrderItemsByStatus } from '../utils/orderItemManagement';
import { calculateOrderStatus } from '../utils/statusManagement';
import { getStatusBackgroundColor } from '../utils/statusColors';

interface FlattenedItem {
  orderId: string;
  itemIndex: number;
  menuItemId: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  tableNumber?: string | number;
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

  // Derive restaurantId from staff (staff user) or restaurant (restaurant user)
  const restaurantId = staff?.restaurantId || restaurant?.id;

  // Queries
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ORDERS_FOR_STAFF, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network'
  });

  const { data: menuData } = useQuery(GET_MENU_ITEMS, {
    skip: !restaurantId
  });

  const apolloClient = useApolloClient();

  // Mutation - use updateOrder for unified order update path
  const [updateOrder] = useMutation(UPDATE_ORDER, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Item status updated successfully!',
        severity: 'success'
      });
      refetchOrders();
    },
    onError: (error) => {
      console.error('Kitchen Board - Update order error:', error);
      setSnackbar({
        open: true,
        message: error.message?.includes('terminal state')
          ? 'Order was completed or cancelled by another user. Refreshing.'
          : `Error updating status: ${error.message}`,
        severity: 'error'
      });
      refetchOrders();
    }
  });

  // Real-time subscriptions
  useOrderSubscriptions({
    restaurantId: restaurantId || '',
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

  // Initialize staff and/or restaurant data (staff user has both, restaurant user has only restaurant)
  useEffect(() => {
    const staffData = localStorage.getItem('staff');
    const restaurantData = localStorage.getItem('restaurant');

    if (staffData && staffData !== 'undefined' && staffData !== 'null') {
      setStaff(JSON.parse(staffData));
    }
    if (restaurantData && restaurantData !== 'undefined' && restaurantData !== 'null') {
      setRestaurant(JSON.parse(restaurantData));
    }

    // Require either staff or restaurant context
    if (!staffData && !restaurantData) {
      navigate('/login');
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
    
    [...ordersData.ordersForStaff].reverse().forEach((order: any) => {
      if (order.status === 'cancelled') return; // Skip cancelled orders - items should not appear on kitchen board
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
      
      const getMenuItemId = (obj: any) => (typeof obj === 'string' ? obj : obj?.id ?? obj);

      // Convert merged items to FlattenedItem format
      mergedItemsMap.forEach(({ item, itemIndex }) => {
        const normalizedInstructions = (item.specialInstructions && item.specialInstructions.trim()) || '';
        const itemKey = `${order.id}-${getMenuItemId(item.menuItemId)}-${item.status}-${normalizedInstructions}`;
        const isItemUpdating = updatingItems.has(itemKey);

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

    const normalizeInstructions = (instructions: any) => (instructions && instructions.trim()) || '';
    const itemInstructions = normalizeInstructions(item.specialInstructions);
    const itemKey = `${item.orderId}-${item.menuItemId}-${item.status}-${itemInstructions}`;

    // Prevent double-click
    if (updatingItems.has(itemKey)) return;
    setUpdatingItems(prev => new Set(prev).add(itemKey));

    try {
      // Fetch latest order to avoid stale overwrite
      const { data } = await apolloClient.query({
        query: GET_ORDER_BY_ID,
        variables: { id: item.orderId },
        fetchPolicy: 'network-only'
      });

      const order = data?.order;
      if (!order) {
        setSnackbar({ open: true, message: 'Order not found', severity: 'error' });
        return;
      }

      const effectiveRestaurantId = (order as any).restaurantId || restaurantId;
      if (!effectiveRestaurantId) {
        setSnackbar({ open: true, message: 'Restaurant context missing. Please refresh and try again.', severity: 'error' });
        return;
      }

      // Block update if order is already completed/cancelled
      if (order.status === 'completed' || order.status === 'cancelled') {
        setSnackbar({
          open: true,
          message: 'Order was completed or cancelled by another user. Refreshing.',
          severity: 'info'
        });
        refetchOrders();
        return;
      }

      // Find first raw item matching the clicked item (handle populated objects with _id or id)
      const getMenuItemId = (obj: any): string => {
        if (obj == null) return '';
        if (typeof obj === 'string') return obj;
        const id = obj?.id ?? obj?._id;
        return id != null ? String(id) : '';
      };
      const rawItemIndex = order.items.findIndex((orderItem: any) => {
        const orderItemInstructions = normalizeInstructions(orderItem.specialInstructions);
        return getMenuItemId(orderItem.menuItemId) === getMenuItemId(item.menuItemId) &&
          orderItem.status === item.status &&
          orderItemInstructions === itemInstructions;
      });

      if (rawItemIndex === -1) {
        setSnackbar({ open: true, message: 'Item not found in order', severity: 'error' });
        return;
      }

      // Update 1 unit to next status (preserves partial-quantity behavior)
      const updatedItems = updatePartialQuantityStatus(
        order.items,
        rawItemIndex,
        nextStatus as 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled',
        1
      );
      const mergedItems = mergeOrderItemsByStatus(updatedItems);
      const newOrderStatus = calculateOrderStatus(mergedItems);
      const totalAmount = mergedItems.reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 0), 0);

      // Clean items for API (normalize menuItemId, remove __typename)
      const cleanItems = mergedItems.map((i: any) => ({
        menuItemId: getMenuItemId(i.menuItemId),
        quantity: i.quantity,
        price: i.price,
        status: i.status,
        specialInstructions: i.specialInstructions
      }));

      await updateOrder({
        variables: {
          id: item.orderId,
          input: {
            restaurantId: effectiveRestaurantId,
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: cleanItems,
            status: newOrderStatus,
            totalAmount
          }
        }
      });

      setSnackbar({ open: true, message: `Item moved to ${nextStatus}`, severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error'
      });
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };


  if (!restaurantId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const totalItems = flattenedItems.length;
  const isRestaurantUser = !staff && restaurant;

  const content = (
    <>
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
                        const normInstr = (item.specialInstructions && item.specialInstructions.trim()) || '';
                        const mid = typeof item.menuItemId === 'string' ? item.menuItemId : (item.menuItemId as any)?.id ?? item.menuItemId;
                        const itemKey = `${item.orderId}-${mid}-${item.status}-${normInstr}`;
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
    </>
  );

  return isRestaurantUser ? (
    <Layout>{content}</Layout>
  ) : (
    <StaffLayout staffPermissions={staff?.permissions || []} staff={staff!} restaurant={restaurant}>
      {content}
    </StaffLayout>
  );
}
