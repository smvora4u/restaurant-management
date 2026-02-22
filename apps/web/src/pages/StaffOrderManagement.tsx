import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import { CheckCircle, Print } from '@mui/icons-material';
import { formatFullDateTime } from '../utils/dateFormatting';
import StaffLayout from '../components/StaffLayout';
import OrderHeader from '../components/orders/OrderHeader';
import OrderItemsTable from '../components/orders/OrderItemsTable';
import { ConfirmationDialog, AppSnackbar } from '../components/common';
import { useOrderManagement } from '../hooks/useOrderManagement';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { GET_ORDER_BY_ID } from '../graphql/queries/orders';
import { GET_MENU_ITEMS } from '../graphql/queries/menu';
import { useOrderSubscriptions } from '../hooks/useOrderSubscriptions';
import { MARK_ORDER_PAID } from '../graphql/mutations/orders';
import { REQUEST_NETWORK_PRINT } from '../graphql/mutations/printer';
import { calculateOrderStatus, canCompleteOrder as canCompleteFromItems } from '../utils/statusManagement';
import { printBill } from '../components/orders/BillPrint';

export default function StaffOrderManagement() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  
  const [staff, setStaff] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [completeConfirmationOpen, setCompleteConfirmationOpen] = useState(false);
  const [markPaidConfirmationOpen, setMarkPaidConfirmationOpen] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);

  // Queries
  const { data: orderData, loading: orderLoading, error: orderError, refetch } = useQuery(GET_ORDER_BY_ID, {
    variables: { id: orderId },
    skip: !orderId
  });

  // Handle query errors
  useEffect(() => {
    if (orderError) {
      console.error('GraphQL Error:', orderError);
      setSnackbarMessage(`Error loading order: ${orderError.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [orderError]);

  const { data: menuData } = useQuery(GET_MENU_ITEMS, { fetchPolicy: 'cache-and-network' });

  // Mutation for marking order as paid
  const [requestNetworkPrint] = useMutation(REQUEST_NETWORK_PRINT, {
    onError: () => {}
  });
  const [markOrderPaid, { loading: paying }] = useMutation(MARK_ORDER_PAID, {
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

  // Custom hooks for order management
  const {
    editingItems,
    hasUnsavedChanges,
    isSaving,
    initializeEditing,
    handleQuantityChange,
    handleRemoveItem,
    handleAddItems,
    handleUpdateItemStatus,
    canCancelOrder
  } = useOrderManagement({
    orderId: orderId!,
    originalOrder: orderData?.order,
    restaurantId: staff?.restaurantId,
    autoSave: true, // Enable auto-save
    autoSaveDelay: 100, // 100ms delay to debounce rapid changes
    onSuccess: () => {
      // Auto-save: silently refetch without showing notification
      refetch();
    },
    onError: (error) => {
      // Only show error for manual saves (auto-save errors are logged but not shown)
      console.error('Auto-save error (silent):', error);
    }
  });

  // Store order data before update to check for table detachment
  const orderBeforeUpdateRef = useRef<any>(null);
  
  useEffect(() => {
    if (orderData?.order) {
      orderBeforeUpdateRef.current = orderData.order;
    }
  }, [orderData?.order]);

  const {
    statusDialogOpen,
    newStatus,
    isUpdating,
    setStatusDialogOpen,
    setNewStatus,
    openStatusDialog,
    handleStatusUpdate,
    handleCompleteOrder,
    handleCancelOrder
  } = useOrderStatus({
    orderId: orderId!,
    order: orderData?.order, // Pass order data for auto-detach functionality
    onSuccess: () => {
      // Check if order was completed/cancelled and table was detached
      // Use stored order data before update to check if table was present
      const orderBeforeUpdate = orderBeforeUpdateRef.current || orderData?.order;
      const hadTable = orderBeforeUpdate?.orderType === 'dine-in' && orderBeforeUpdate?.tableNumber;
      
      // Refetch to get updated order data
      refetch().then((result) => {
        const updatedOrder = result?.data?.order ?? orderData?.order;
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

        // Auto-print bill when order is completed
        if (isCompleted && orderBeforeUpdate && restaurant) {
          const menuItemsList = menuData?.menuItems || [];
          const doNetworkPrint = async (orderId: string) => {
            try {
              const res = await requestNetworkPrint({ variables: { orderId } });
              return !!res.data?.requestNetworkPrint;
            } catch {
              return false;
            }
          };
          printBill(
            {
              id: orderBeforeUpdate.id,
              tableNumber: orderBeforeUpdate.tableNumber,
              orderType: orderBeforeUpdate.orderType,
              items: orderBeforeUpdate.items.map((i: any) => ({
                menuItemId: typeof i.menuItemId === 'string' ? i.menuItemId : i.menuItemId?.id,
                quantity: i.quantity,
                price: i.price,
                specialInstructions: i.specialInstructions
              })),
              totalAmount: orderBeforeUpdate.totalAmount,
              customerName: orderBeforeUpdate.customerName,
              customerPhone: orderBeforeUpdate.customerPhone,
              createdAt: orderBeforeUpdate.createdAt
            },
            restaurant,
            menuItemsList.map((m: any) => ({ id: m.id, name: m.name })),
            true,
            { requestNetworkPrint: doNetworkPrint }
          );
        }
      });
    },
    onError: (error) => {
      setSnackbarMessage(`Error updating status: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  });

  // Set up real-time subscriptions
  useOrderSubscriptions({
    restaurantId: staff?.restaurantId || '',
    onOrderUpdated: (updatedOrder) => {
      // Only refetch if this is the order we're currently viewing
      if (updatedOrder.id === orderId) {
        refetch();
      }
    },
    onOrderItemStatusUpdated: (updatedOrder) => {
      // Only process if this is the order we're currently viewing
      if (updatedOrder.id !== orderId) {
        return;
      }
      // Recalculate order status based on updated item statuses
      if (updatedOrder && updatedOrder.items) {
        const calculatedStatus = calculateOrderStatus(updatedOrder.items);
        if (calculatedStatus !== updatedOrder.status) {
          console.log('Order status needs update:', updatedOrder.status, '->', calculatedStatus);
          // Note: Staff might not have permission to update order status
          // This is just for logging - the restaurant management page will handle the actual update
        }
      }
      refetch();
    },
    onNewOrder: (_newOrder) => {
      // Don't refetch on new orders - we're viewing a specific order
    }
  });

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

  // Initialize editing when order data loads
  useEffect(() => {
    if (orderData?.order?.items) {
      initializeEditing(orderData.order.items);
    }
  }, [orderData?.order?.items, initializeEditing]);

  const handleBack = () => {
    navigate('/staff/dashboard');
  };

  const handleStatusUpdateClick = () => {
    if (orderData?.order) {
      openStatusDialog(orderData.order.status);
    }
  };



  const handleCompleteOrderClick = () => {
    setCompleteConfirmationOpen(true);
  };

  const handleCancelOrderClick = () => {
    setCancelConfirmationOpen(true);
  };

  const confirmCompleteOrder = async () => {
    setCompleteConfirmationOpen(false);
    try {
      await handleCompleteOrder();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const confirmCancelOrder = async () => {
    setCancelConfirmationOpen(false);
    try {
      await handleCancelOrder();
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

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

  if (!staff) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (orderLoading) {
    return (
      <StaffLayout staffPermissions={staff.permissions} staff={staff} restaurant={restaurant}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  if (orderError || !orderData?.order) {
    return (
      <StaffLayout staffPermissions={staff.permissions} staff={staff} restaurant={restaurant}>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Order Not Found
            </Typography>
            <Typography>
              The order you're looking for doesn't exist or you don't have permission to view it.
            </Typography>
            <Button onClick={handleBack} sx={{ mt: 2 }}>
              Back to Dashboard
            </Button>
          </Alert>
        </Box>
      </StaffLayout>
    );
  }

  const order = orderData.order;
  const menuItems = menuData?.menuItems || [];

  return (
    <StaffLayout staffPermissions={staff.permissions} staff={staff} restaurant={restaurant}>
      <Box sx={{ p: 3 }}>
        {/* Order Header */}
        <OrderHeader
          order={order}
          restaurant={restaurant}
          onBack={handleBack}
          onStatusUpdate={handleStatusUpdateClick}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          canCompleteOrder={canCompleteFromItems(editingItems) && order.status !== 'completed'}
          canCancelOrder={canCancelOrder(order.status)}
          onCompleteOrder={handleCompleteOrderClick}
          onCancelOrder={handleCancelOrderClick}
        />

        {/* Staff Mark Paid (permission-gated) and Print Bill */}
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {(staff?.permissions || []).includes('manage_orders') && (
            <>
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
                  disabled={paying || order.status !== 'completed'}
                  onClick={() => setMarkPaidConfirmationOpen(true)}
                >
                  Mark Paid
                </Button>
              )}
            </>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<Print />}
            onClick={() => {
              if (order && restaurant) {
                const doNetworkPrint = async (orderId: string) => {
                  try {
                    const res = await requestNetworkPrint({ variables: { orderId } });
                    return !!res.data?.requestNetworkPrint;
                  } catch {
                    return false;
                  }
                };
                printBill(
                  {
                    id: order.id,
                    tableNumber: order.tableNumber,
                    orderType: order.orderType,
                    items: order.items.map((i: any) => ({
                      menuItemId: typeof i.menuItemId === 'string' ? i.menuItemId : i.menuItemId?.id,
                      quantity: i.quantity,
                      price: i.price,
                      specialInstructions: i.specialInstructions
                    })),
                    totalAmount: order.totalAmount,
                    customerName: order.customerName,
                    customerPhone: order.customerPhone,
                    createdAt: order.createdAt
                  },
                  restaurant,
                  menuItems.map((m: any) => ({ id: m.id, name: m.name })),
                  true,
                  { requestNetworkPrint: doNetworkPrint }
                );
              }
            }}
          >
            Print Bill
          </Button>
        </Box>

        {/* Order Items Table */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <OrderItemsTable
              items={editingItems}
              restaurant={restaurant}
              menuItems={menuItems}
              onUpdateItemStatus={handleUpdateItemStatus}
              onUpdateItemQuantity={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
              onAddItems={handleAddItemsWrapper}
              isEditing={true}
              restrictCancelToPending={true}
              orderStatus={order.status}
              hideItemImageInAddDialog={true}
            />
          </CardContent>
        </Card>

        {/* Status Update Dialog */}
        <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>New Status</InputLabel>
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  label="New Status"
                  disabled={order.status === 'cancelled' || order.status === 'completed'}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="served">Served</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled" disabled={order.status === 'cancelled'}>Cancelled</MenuItem>
                </Select>
              </FormControl>
              {(order.status === 'cancelled' || order.status === 'completed') && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This order is {order.status} and cannot be updated to another status.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleStatusUpdate(order.status)} 
              variant="contained"
              disabled={isUpdating || order.status === 'cancelled' || order.status === 'completed'}
            >
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialogs */}
        <ConfirmationDialog
          open={markPaidConfirmationOpen}
          title="Mark Order as Paid"
          message="This will record this order as paid (cash). Are you sure?"
          onConfirm={async () => {
            setMarkPaidConfirmationOpen(false);
            await markOrderPaid({
              variables: {
                id: order.id,
                paymentMethod: 'cash',
                paymentTransactionId: `CASH_${Date.now()}`
              }
            });
          }}
          onClose={() => setMarkPaidConfirmationOpen(false)}
          confirmText="Yes, Mark Paid"
          cancelText="Cancel"
          confirmColor="success"
          loading={paying}
        />

        <ConfirmationDialog
          open={completeConfirmationOpen}
          title="Complete Order"
          message={`Are you sure you want to complete this order? ${order.orderType === 'dine-in' && order.tableNumber ? 'This will also detach the table and make it available for new customers.' : 'This action cannot be undone.'}`}
          onConfirm={confirmCompleteOrder}
          onClose={() => setCompleteConfirmationOpen(false)}
        />

        <ConfirmationDialog
          open={cancelConfirmationOpen}
          title="Cancel Order"
          message="Are you sure you want to cancel this order? This action cannot be undone."
          onConfirm={confirmCancelOrder}
          onClose={() => setCancelConfirmationOpen(false)}
        />

        {/* Snackbar for notifications */}
        <AppSnackbar
          open={snackbarOpen}
          message={snackbarMessage}
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
        />
      </Box>
    </StaffLayout>
  );
}