import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton
} from '@mui/material';
import {
  ShoppingCart,
  Restaurant,
  AccessTime,
  CheckCircle,
  Cancel,
  ArrowBack,
  Print
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { formatFullDateTime } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import Layout from '../components/Layout';
import OrderItemsTable from '../components/orders/OrderItemsTable';
import { GET_ORDER_BY_ID } from '../graphql/queries/orders';
import { GET_MENU_ITEMS } from '../graphql/queries/menu';
import { UPDATE_ORDER_STATUS_FOR_STAFF } from '../graphql/mutations/staff';
import { mergeOrderItemsByStatus } from '../utils/orderItemManagement';
import { calculateOrderStatus, getItemStatusSummary, canCompleteOrder, canCancelOrder } from '../utils/statusManagement';
import { ConfirmationDialog, AppSnackbar } from '../components/common';
import { MARK_ORDER_PAID } from '../graphql/mutations/orders';
import { REQUEST_NETWORK_PRINT } from '../graphql/mutations/printer';
import { useOrderSubscriptions } from '../hooks/useOrderSubscriptions';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useOrderManagement } from '../hooks/useOrderManagement';
import { getStatusColor } from '../utils/statusColors';
import { printBill } from '../components/orders/BillPrint';

export default function RestaurantOrderManagement() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmMarkPaidOpen, setConfirmMarkPaidOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [requestNetworkPrint] = useMutation(REQUEST_NETWORK_PRINT);
  const [markPaid, { loading: paying }] = useMutation(MARK_ORDER_PAID, {
    onCompleted: () => {
      setSnackbarMessage('Order marked as paid.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      refetch();
    },
    onError: (e) => {
      setSnackbarMessage(e.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  });

  // Queries
  const { data, loading, error, refetch } = useQuery(GET_ORDER_BY_ID, {
    variables: { id: orderId },
    skip: !orderId,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false // Prevent re-renders on network status changes
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error('GraphQL Error:', error);
      console.error('Error details:', error.message);
      console.error('Network error:', error.networkError);
    }
  }, [error]);

  const { data: menuData } = useQuery(GET_MENU_ITEMS, { 
    fetchPolicy: 'cache-first' // Use cache-first to prevent unnecessary network requests
  });
  const menuItems = menuData?.menuItems || [];

  // Use order status hook for consistent status management
  // Store order data before update to check for table detachment
  const orderBeforeUpdateRef = useRef<any>(null);
  
  useEffect(() => {
    if (data?.order) {
      orderBeforeUpdateRef.current = data.order;
    }
  }, [data?.order]);

  const {
    editingItems,
    hasUnsavedChanges,
    isSaving,
    handleQuantityChange,
    handleRemoveItem,
    handleAddItems,
    handleUpdateItemStatus,
    syncFromExternal
  } = useOrderManagement({
    orderId: orderId!,
    originalOrder: data?.order,
    restaurantId: restaurant?.id,
    autoSave: true,
    autoSaveDelay: 100,
    onSuccess: () => refetch(),
    onError: () => {
      setSnackbarMessage('Failed to save order changes. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  });

  const {
    isUpdating,
    handleCompleteOrder,
    handleCancelOrder: hookHandleCancelOrder
  } = useOrderStatus({
    orderId: orderId!,
    order: data?.order,
    onSuccess: () => {
      // Check if order was completed/cancelled and table was detached
      // Use stored order data before update to check if table was present
      const orderBeforeUpdate = orderBeforeUpdateRef.current || data?.order;
      const hadTable = orderBeforeUpdate?.orderType === 'dine-in' && orderBeforeUpdate?.tableNumber;
      
      // Refetch to get updated order data
      refetch().then((result) => {
        const updatedOrder = result?.data?.order ?? data?.order;
        const isCompleted = updatedOrder?.status === 'completed';
        const isCancelled = updatedOrder?.status === 'cancelled';
        const tableDetached = hadTable && updatedOrder && !updatedOrder?.tableNumber;
        
        if (isCompleted && tableDetached) {
          setSnackbarMessage('Order completed and table detached successfully!');
        } else if (isCancelled && tableDetached) {
          setSnackbarMessage('Order cancelled and table released successfully!');
        } else if (isCancelled) {
          setSnackbarMessage('Order cancelled successfully!');
        } else if (isCompleted) {
          setSnackbarMessage('Order completed successfully!');
        } else {
          setSnackbarMessage('Order status updated successfully!');
        }
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        // Print is triggered in Complete Order confirmation before status update
      });
    },
    onError: (error) => {
      setSnackbarMessage(`Error updating status: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  });


  const [updateOrderStatusOnly] = useMutation(UPDATE_ORDER_STATUS_FOR_STAFF, {
    onError: (error) => {
      console.error('Error updating order status only:', error);
    }
  });

  // Track recently updated orders to prevent infinite loops
  const recentlyUpdatedOrders = useRef<Set<string>>(new Set());
  
  // Circuit breaker to prevent rapid successive updates
  const updateCounts = useRef<Map<string, { count: number; lastUpdate: number; userInitiated: number }>>(new Map());
  const MAX_UPDATES_PER_MINUTE = 15; // Increased from 5 to allow more legitimate updates
  const MAX_AUTO_UPDATES_PER_MINUTE = 8; // Separate limit for automatic updates
  
  // Global emergency brake to completely stop updates if we detect a severe loop
  const emergencyBrake = useRef<boolean>(false);
  const EMERGENCY_THRESHOLD = 10; // If any order gets updated 10+ times in a minute, stop all updates
  
  // Debounced refetch to prevent rapid successive calls
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      refetch();
    }, 100); // 100ms debounce
  }, [refetch]);
  
  // Check if order is being updated too frequently (circuit breaker)
  const isOrderUpdateBlocked = useCallback((orderId: string, isUserInitiated: boolean = false) => {
    const now = Date.now();
    const orderUpdateInfo = updateCounts.current.get(orderId);
    
    if (!orderUpdateInfo) {
      return false;
    }
    
    // Reset count if more than a minute has passed
    if (now - orderUpdateInfo.lastUpdate > 60000) {
      updateCounts.current.set(orderId, { count: 1, lastUpdate: now, userInitiated: isUserInitiated ? 1 : 0 });
      return false;
    }
    
    // Use different limits for user-initiated vs automatic updates
    const maxUpdates = isUserInitiated ? MAX_UPDATES_PER_MINUTE : MAX_AUTO_UPDATES_PER_MINUTE;
    
    // Block if too many updates in the last minute
    if (orderUpdateInfo.count >= maxUpdates) {
      console.log(`Order ${orderId} is being updated too frequently (${isUserInitiated ? 'user-initiated' : 'automatic'}), blocking update`);
      return true;
    }
    
    return false;
  }, []);
  
  // Record an update attempt
  const recordOrderUpdate = useCallback((orderId: string, isUserInitiated: boolean = false) => {
    const now = Date.now();
    const orderUpdateInfo = updateCounts.current.get(orderId);
    
    if (!orderUpdateInfo) {
      updateCounts.current.set(orderId, { count: 1, lastUpdate: now, userInitiated: isUserInitiated ? 1 : 0 });
    } else {
      const newCount = orderUpdateInfo.count + 1;
      const newUserInitiated = orderUpdateInfo.userInitiated + (isUserInitiated ? 1 : 0);
      updateCounts.current.set(orderId, { 
        count: newCount, 
        lastUpdate: now,
        userInitiated: newUserInitiated
      });
      
      // Activate emergency brake if any order is updated too frequently
      if (newCount >= EMERGENCY_THRESHOLD) {
        console.error(`EMERGENCY BRAKE ACTIVATED: Order ${orderId} updated ${newCount} times in a minute!`);
        emergencyBrake.current = true;
        
        // Reset emergency brake after 2 minutes
        setTimeout(() => {
          emergencyBrake.current = false;
          console.log('Emergency brake reset');
        }, 120000);
      }
    }
  }, []);
  
  // Reset circuit breaker for a specific order (useful for manual intervention)
  const resetOrderCircuitBreaker = useCallback((orderId: string) => {
    updateCounts.current.delete(orderId);
    console.log(`Circuit breaker reset for order: ${orderId}`);
  }, []);
  
  // Get restaurant ID for subscriptions
  const restaurantId = data?.order?.restaurantId || '';
  console.log('Restaurant page - restaurantId for subscriptions:', restaurantId);

  // Also try to get restaurant ID from localStorage as fallback
  const getRestaurantIdFromAuth = () => {
    const restaurantData = localStorage.getItem('restaurant');
    if (restaurantData) {
      try {
        const restaurant = JSON.parse(restaurantData);
        return restaurant.id;
      } catch (error) {
        console.error('Error parsing restaurant data:', error);
      }
    }
    return '';
  };

  const authRestaurantId = getRestaurantIdFromAuth();
  const finalRestaurantId = restaurantId || authRestaurantId;
  console.log('Restaurant page - final restaurantId:', finalRestaurantId);

  // Set up real-time subscriptions
  useOrderSubscriptions({
    restaurantId: finalRestaurantId,
    onOrderUpdated: (updatedOrder) => {
      console.log('Restaurant page - Order updated received:', updatedOrder);
      // Only process if this is the order we're currently viewing
      if (updatedOrder.id !== orderId) {
        console.log('Skipping order updated event - different order:', updatedOrder.id);
        return;
      }
      // If this is an order we recently updated, don't process it to prevent loops
      if (recentlyUpdatedOrders.current.has(updatedOrder.id)) {
        console.log('Skipping order updated event - recently updated by us:', updatedOrder.id);
        return;
      }
      // Update local state from subscription data instead of refetching
      // This prevents the loop: update -> subscription -> refetch -> update
      // The subscription already provides the updated order data
      if (updatedOrder.items) {
        const mergedItems = mergeOrderItemsByStatus(updatedOrder.items);
        syncFromExternal(mergedItems);
      }
    },
    onOrderItemStatusUpdated: (updatedOrder) => {
      console.log('Restaurant page - Order item status updated received:', updatedOrder);
      
      // Only process if this is the order we're currently viewing
      if (updatedOrder.id !== orderId) {
        console.log('Skipping order item status update - different order:', updatedOrder.id);
        return;
      }
      
      // Emergency brake check - stop all updates if we detect a severe loop
      if (emergencyBrake.current) {
        console.log('EMERGENCY BRAKE ACTIVE - Skipping all order updates');
        return;
      }
      
      // Skip if we recently updated this order to prevent infinite loops
      if (recentlyUpdatedOrders.current.has(updatedOrder.id)) {
        console.log('Skipping order status update - recently updated:', updatedOrder.id);
        recentlyUpdatedOrders.current.delete(updatedOrder.id);
        // Don't refetch here to prevent loops
        return;
      }
      
      // Recalculate order status based on updated item statuses
      if (updatedOrder && updatedOrder.items) {
        const calculatedStatus = calculateOrderStatus(updatedOrder.items);
        console.log('Current order status:', updatedOrder.status, 'Calculated status:', calculatedStatus);
        
        // Additional check: if order is already completed, don't try to update it
        if (updatedOrder.status === 'completed' && calculatedStatus === 'completed') {
          console.log('Order is already completed, skipping update');
          // Don't refetch - status is already correct and we don't need to update
          return;
        }
        
        if (calculatedStatus !== updatedOrder.status) {
          console.log('Order status needs update:', updatedOrder.status, '->', calculatedStatus);
          
          // Check circuit breaker first (automatic update)
          if (isOrderUpdateBlocked(updatedOrder.id, false)) {
            console.log('Order update blocked by circuit breaker:', updatedOrder.id);
            // Don't refetch if blocked - prevents loops
            return;
          }
          
          // Record this update attempt (automatic update)
          recordOrderUpdate(updatedOrder.id, false);
          
          // Mark this order as recently updated BEFORE making the API call
          recentlyUpdatedOrders.current.add(updatedOrder.id);
          
          // Update the order status on the server
          updateOrderStatusOnly({
            variables: {
              id: updatedOrder.id,
              status: calculatedStatus
            }
          }).then(() => {
            console.log('Order status updated successfully to:', calculatedStatus);
            // Don't refetch immediately - the subscription will notify us of the update
            // This prevents loops where update -> subscription -> refetch -> update
          }).catch((error) => {
            console.error('Failed to update order status:', error);
            // Remove from tracking set on error so it can be retried
            recentlyUpdatedOrders.current.delete(updatedOrder.id);
            // Only refetch on error to get the actual state
            debouncedRefetch();
          });
          
          // Clear the flag after a longer delay for completed orders
          const delay = calculatedStatus === 'completed' ? 5000 : 2000;
          setTimeout(() => {
            recentlyUpdatedOrders.current.delete(updatedOrder.id);
            console.log('Cleared tracking for order:', updatedOrder.id);
          }, delay);
        } else {
          console.log('Order status is already correct, no update needed');
          // Don't refetch if status is already correct - prevents unnecessary requests
        }
      }
      // Removed else block that was always refetching - this was causing continuous requests
    },
    onNewOrder: (newOrder) => {
      console.log('Restaurant page - New order received:', newOrder);
      // Don't refetch on new orders - we're viewing a specific order, not the list
      // Only refetch if somehow the new order is the one we're viewing (shouldn't happen)
      if (newOrder.id === orderId) {
        debouncedRefetch();
      }
    }
  });



  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    const restaurantToken = localStorage.getItem('restaurantToken');
    
    if (!restaurantData || !restaurantToken) {
      navigate('/restaurant/login');
      return;
    }
    
    if (restaurantData && restaurantData !== 'undefined' && restaurantData !== 'null') {
      const parsedRestaurant = JSON.parse(restaurantData);
      setRestaurant(parsedRestaurant);
    }
  }, [navigate]);

  // Initialize editing items when order data loads
  // Use a ref to track the last order ID to prevent re-initializing on every data change
  const lastOrderIdRef = useRef<string | null>(null);
  const lastItemsHashRef = useRef<string>('');
  
  useEffect(() => {
    if (data?.order?.items && data?.order?.id) {
      // Only update if order ID changed or items actually changed
      const currentOrderId = data.order.id;
      const itemsHash = JSON.stringify(data.order.items);
      
      // Skip if same order and same items (prevent loop from refetches)
      if (lastOrderIdRef.current === currentOrderId && lastItemsHashRef.current === itemsHash) {
        return;
      }
      
      // Merge any duplicate items with same status, menuItemId, and specialInstructions
      const mergedItems = mergeOrderItemsByStatus(data.order.items);
      syncFromExternal(mergedItems);
      
      // Update refs
      lastOrderIdRef.current = currentOrderId;
      lastItemsHashRef.current = itemsHash;
    }
  }, [data?.order?.id, data?.order?.items, syncFromExternal]);

  const handleAddItemsWrapper = (entries: Array<{ menuItemId: string; quantity: number; specialInstructions: string }>) => {
    const itemsWithPrice = entries
      .map(({ menuItemId, quantity, specialInstructions }) => {
        const menuItem = menuData?.menuItems?.find((item: any) => item.id === menuItemId);
        return menuItem ? { menuItemId, quantity, specialInstructions, price: menuItem.price } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (itemsWithPrice.length > 0) {
      handleAddItems(itemsWithPrice);
    }
  };


  const handleCancelOrder = () => {
    setCancelConfirmationOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderId || !order) return;
    
    setIsCancelling(true);
    setCancelConfirmationOpen(false);
    
    try {
      await hookHandleCancelOrder();
    } catch (error) {
      console.error('Error cancelling order:', error);
      setSnackbarMessage('Failed to cancel order. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsCancelling(false);
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

  if (!restaurant) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert severity="error">Error loading order: {error.message}</Alert>
      </Layout>
    );
  }

  const order = data?.order;

  if (!order) {
    return (
      <Layout>
        <Alert severity="error">Order not found</Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/restaurant/orders')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Order Management
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Order Details */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order #{order.id.slice(-8)}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status)}
                    icon={getStatusIcon(order.status)}
                  />
                  <Chip
                    label={order.orderType}
                    variant="outlined"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Customer Information */}
                <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Restaurant />
                    Customer Information
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Customer Details
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in Customer')}
                  </Typography>
                  {order.customerPhone && (
                        <Typography variant="body2" color="text.secondary">
                          📞 {order.customerPhone}
                        </Typography>
                      )}
                      {order.customerEmail && (
                        <Typography variant="body2" color="text.secondary">
                          ✉️ {order.customerEmail}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Order Details
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip 
                          label={order.orderType} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                        {order.tableNumber && (
                          <Chip 
                            label={`Table ${order.tableNumber}`} 
                            size="small" 
                            variant="outlined"
                            color="secondary"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        🕒 {formatFullDateTime(order.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {order.notes && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                      <Typography variant="body2" color="warning.800" fontWeight="medium">
                        📝 Special Notes:
                      </Typography>
                      <Typography variant="body2" color="warning.700">
                        {order.notes}
                    </Typography>
                    </Box>
                  )}
                  
                  {order.specialRequests && (
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                      <Typography variant="body2" color="info.800" fontWeight="medium">
                        🎯 Special Requests:
                      </Typography>
                      <Typography variant="body2" color="info.700">
                        {order.specialRequests}
                    </Typography>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />


                {/* Order Items Table */}
                <OrderItemsTable
                  items={editingItems}
                  restaurant={restaurant}
                  menuItems={menuItems}
                  onUpdateItemStatus={handleUpdateItemStatus}
                  onUpdateItemQuantity={handleQuantityChange}
                  onRemoveItem={handleRemoveItem}
                  onAddItems={handleAddItemsWrapper}
                  isEditing={true}
                  hasUnsavedChanges={hasUnsavedChanges}
                  isSaving={isSaving}
                  restrictCancelToPending={true}
                  orderStatus={order.status}
                  hideItemImageInAddDialog={true}
                />

                <Divider sx={{ my: 2 }} />

                {/* Order Summary */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Total: {formatCurrencyFromRestaurant(
                      editingItems.reduce((total, item) => total + (item.price * item.quantity), 0), 
                      restaurant
                    )}
                    {hasUnsavedChanges && (
                      <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                        (Modified)
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatFullDateTime(order.createdAt)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Order Actions */}
          <Box sx={{ width: { xs: '100%', md: '300px' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Actions
                </Typography>

                {/* Current Order Status */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Status
                  </Typography>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status)}
                    icon={getStatusIcon(order.status)}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    {(() => {
                      const calculatedStatus = calculateOrderStatus(editingItems);
                      return calculatedStatus !== order.status 
                        ? `Will update to: ${calculatedStatus}` 
                        : 'Status is in sync';
                    })()}
                  </Typography>
                </Box>

                {/* Quick Status Actions */}
                <Typography variant="subtitle2" gutterBottom>
                  Quick Actions
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  {(() => {
                    const canComplete = canCompleteOrder(editingItems);
                    const canCancel = canCancelOrder(order.status as any, editingItems);
                    const isTerminalState = order.status === 'cancelled' || order.status === 'completed';
                    
                    return (
                      <>
                        {canComplete && order.status !== 'completed' && !isTerminalState && (
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => setConfirmCompleteOpen(true)}
                            disabled={isUpdating}
                            startIcon={<CheckCircle />}
                            size="small"
                          >
                            Complete Order
                          </Button>
                        )}
                        
                        {canCancel && !isTerminalState && (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={handleCancelOrder}
                            disabled={isUpdating || isCancelling}
                            startIcon={<Cancel />}
                            size="small"
                            sx={{ mt: 1 }}
                          >
                            {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                          </Button>
                        )}
                        {order.paid ? (
                          <Box
                            sx={{
                              p: 1.5,
                              border: '1px solid',
                              borderColor: 'success.light',
                              bgcolor: 'success.50',
                              borderRadius: 1,
                              minWidth: 220
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                              <CheckCircle color="success" fontSize="small" />
                              <Typography variant="subtitle2" color="success.main">Paid</Typography>
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1, rowGap: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">Method</Typography>
                              <Typography variant="caption" fontWeight="bold">{order.paymentMethod || '-'}</Typography>
                              <Typography variant="caption" color="text.secondary">Transaction</Typography>
                              <Typography variant="caption" fontFamily="monospace">{order.paymentTransactionId || '-'}</Typography>
                              <Typography variant="caption" color="text.secondary">Paid at</Typography>
                              <Typography variant="caption">{order.paidAt ? formatFullDateTime(order.paidAt) : '-'}</Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => setConfirmMarkPaidOpen(true)}
                            disabled={paying || order.status !== 'completed'}
                            startIcon={<CheckCircle />}
                            size="small"
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Print />}
                          onClick={() => {
                            const o = data?.order || order;
                            if (o && restaurant) {
                              const doNetworkPrint = async (orderId: string) => {
                                try {
                                  setSnackbarMessage('Sending to printer...');
                                  setSnackbarSeverity('info');
                                  setSnackbarOpen(true);
                                  const res = await requestNetworkPrint({ variables: { orderId } });
                                  const ok = !!res.data?.requestNetworkPrint;
                                  if (ok) {
                                    setSnackbarMessage('Print sent to printer');
                                    setSnackbarSeverity('success');
                                  } else {
                                    setSnackbarMessage('Print failed, trying browser...');
                                    setSnackbarSeverity('warning');
                                  }
                                  setSnackbarOpen(true);
                                  return ok;
                                } catch (e: any) {
                                  setSnackbarMessage('Print failed: ' + (e?.message || 'Unknown error'));
                                  setSnackbarSeverity('error');
                                  setSnackbarOpen(true);
                                  return false;
                                }
                              };
                              printBill(
                                {
                                  id: o.id,
                                  tableNumber: o.tableNumber,
                                  orderType: o.orderType,
                                  items: o.items.map((i: any) => ({
                                    menuItemId: typeof i.menuItemId === 'string' ? i.menuItemId : i.menuItemId?.id,
                                    quantity: i.quantity,
                                    price: i.price,
                                    specialInstructions: i.specialInstructions
                                  })),
                                  totalAmount: o.totalAmount,
                                  customerName: o.customerName,
                                  customerPhone: o.customerPhone,
                                  createdAt: o.createdAt
                                },
                                restaurant,
                                menuItems.map((m: any) => ({ id: m.id, name: m.name })),
                                true,
                                { requestNetworkPrint: doNetworkPrint }
                              );
                            }
                          }}
                          sx={{ mt: 1 }}
                        >
                          Print Bill
                        </Button>

                      </>
                    );
                  })()}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Order Statistics */}
                <Typography variant="subtitle2" gutterBottom>
                  Order Statistics
                </Typography>
                
                {(() => {
                  const summary = getItemStatusSummary(editingItems);
                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Total Items:</strong> {summary.total}
                      </Typography>
                      {summary.pending > 0 && (
                        <Typography variant="body2" color="warning.main">
                          • {summary.pending} pending
                        </Typography>
                      )}
                      {summary.preparing > 0 && (
                        <Typography variant="body2" color="info.main">
                          • {summary.preparing} preparing
                        </Typography>
                      )}
                      {summary.ready > 0 && (
                        <Typography variant="body2" color="primary.main">
                          • {summary.ready} ready
                        </Typography>
                      )}
                      {summary.served > 0 && (
                        <Typography variant="body2" color="success.main">
                          • {summary.served} served
                        </Typography>
                      )}
                      {summary.cancelled > 0 && (
                        <Typography variant="body2" color="error.main">
                          • {summary.cancelled} cancelled
                        </Typography>
                      )}
                    </Box>
                  );
                })()}

                {/* Circuit Breaker Reset (only show if there might be issues) */}
                {orderId && updateCounts.current.has(orderId) && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      onClick={() => resetOrderCircuitBreaker(orderId)}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Reset Update Limits
                    </Button>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      If order updates are blocked, click to reset
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Order Information */}
                <Typography variant="subtitle2" gutterBottom>
                  Order Details
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Order ID & Type */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Order ID:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                      #{order.id.slice(-8)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                      Type:
                </Typography>
                    <Chip 
                      label={order.orderType} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  
                  {/* Table & Customer */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                      Table:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {order.tableNumber ? `#${order.tableNumber}` : 'N/A'}
                </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                      Customer:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" sx={{ maxWidth: '60%', textAlign: 'right' }}>
                      {order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in')}
                    </Typography>
                  </Box>
                  
                  {/* Timing Information */}
                  <Divider />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Timing
                </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                      Created:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatFullDateTime(order.createdAt)}
                </Typography>
                  </Box>
                  
                  {order.updatedAt !== order.createdAt && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                        Updated:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatFullDateTime(order.updatedAt)}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Financial Information */}
                  <Divider />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Financial
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Items:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {editingItems.length}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      {formatCurrencyFromRestaurant(
                        editingItems.reduce((total, item) => total + (item.price * item.quantity), 0), 
                        restaurant
                      )}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>


        {/* Mark Paid Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmMarkPaidOpen}
          onClose={() => setConfirmMarkPaidOpen(false)}
          onConfirm={async () => {
            setConfirmMarkPaidOpen(false);
            await markPaid({ variables: { id: order.id, paymentMethod: 'cash', paymentTransactionId: `CASH_${Date.now()}` } });
          }}
          title="Mark Order as Paid"
          message="This will record this order as paid (cash). Are you sure?"
          confirmText="Yes, Mark Paid"
          cancelText="Cancel"
          confirmColor="success"
        />

        {/* Complete Order Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmCompleteOpen}
          onClose={() => setConfirmCompleteOpen(false)}
          onConfirm={async () => {
            setConfirmCompleteOpen(false);
            // Print bill first (while order still has table number) then complete
            const order = data?.order;
            if (order && restaurant?.settings?.networkPrinter?.host) {
              try {
                await requestNetworkPrint({ variables: { orderId: order.id } });
              } catch {
                // Print failed, continue with complete
              }
            }
            await handleCompleteOrder();
          }}
          title="Complete Order"
          message={`Are you sure you want to complete this order? ${order.orderType === 'dine-in' && order.tableNumber ? 'This will also detach the table and make it available for new customers.' : 'This action cannot be undone.'}`}
          confirmText="Yes, Complete Order"
          cancelText="Cancel"
          confirmColor="success"
          loading={isUpdating}
        />

        {/* Cancel Order Confirmation Dialog */}
        <ConfirmationDialog
          open={cancelConfirmationOpen}
          onClose={() => setCancelConfirmationOpen(false)}
          onConfirm={confirmCancelOrder}
          title="Cancel Order"
          message={
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to cancel this order? The order will be marked as cancelled and cannot be reactivated.
              </Typography>
              <Typography variant="body2" color="warning.main" fontWeight="bold">
                Order #{order.id.slice(-8)} - {order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in Customer')}
              </Typography>
              {order.orderType === 'dine-in' && order.tableNumber && (
                <Typography variant="body2" color="info.main" sx={{ mt: 1, fontWeight: 'medium' }}>
                  This will also release Table {order.tableNumber} and make it available for new customers.
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This action will change the order status to "cancelled" and notify the customer.
              </Typography>
            </Box>
          }
          confirmText="Cancel Order"
          cancelText="Keep Order"
          confirmColor="error"
          loading={isCancelling}
        />

        {/* Snackbar for notifications */}
        <AppSnackbar
          open={snackbarOpen}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
          severity={snackbarSeverity}
        />

      </Box>
    </Layout>
  );
}
