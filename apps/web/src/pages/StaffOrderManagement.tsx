import { useState, useEffect } from 'react';
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
  Button,
  Chip
} from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import { CheckCircle } from '@mui/icons-material';
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
import { calculateOrderStatus } from '../utils/statusManagement';

export default function StaffOrderManagement() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  
  const [staff, setStaff] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [completeConfirmationOpen, setCompleteConfirmationOpen] = useState(false);
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

  const { data: menuData } = useQuery(GET_MENU_ITEMS, { fetchPolicy: 'cache-and-network', pollInterval: 5000 });

  // Mutation for marking order as paid
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

  // Custom hooks for order management
  const {
    editingItems,
    hasUnsavedChanges,
    isSaving,
    initializeEditing,
    handleQuantityChange,
    handleRemoveItem,
    handleAddItem,
    handleUpdateItemStatus,
    saveChanges,
    canCompleteOrder,
    canCancelOrder
  } = useOrderManagement({
    orderId: orderId!,
    originalOrder: orderData?.order,
    restaurantId: staff?.restaurantId,
    onSuccess: () => {
      setSnackbarMessage('Order updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      refetch();
    },
    onError: (error) => {
      setSnackbarMessage(`Error updating order: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  });

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
    onSuccess: () => {
      setSnackbarMessage('Order status updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      refetch();
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
    onOrderUpdated: (_updatedOrder) => {
      refetch();
    },
    onOrderItemStatusUpdated: (updatedOrder) => {
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
    onNewOrder: (newOrder) => {
      console.log('New order received:', newOrder);
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


  const handleSaveChanges = async () => {
    try {
      await saveChanges();
    } catch (error) {
      console.error('Error saving changes:', error);
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

  const handleAddItemWrapper = (menuItemId: string, quantity: number, specialInstructions: string) => {
    const menuItem = menuData?.menuItems?.find((item: any) => item.id === menuItemId);
    if (menuItem) {
      handleAddItem(menuItemId, quantity, specialInstructions, menuItem.price);
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
          onSaveChanges={handleSaveChanges}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          canCompleteOrder={canCompleteOrder(order.status)}
          canCancelOrder={canCancelOrder(order.status)}
          onCompleteOrder={handleCompleteOrderClick}
          onCancelOrder={handleCancelOrderClick}
        />

        {/* Staff Mark Paid (permission-gated) */}
        {(staff?.permissions || []).includes('mark_order_paid') && (
          <Box sx={{ mb: 2 }}>
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
                onClick={() => setCompleteConfirmationOpen(true)}
              >
                Mark Paid
              </Button>
            )}
          </Box>
        )}

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
              onAddItem={handleAddItemWrapper}
              isEditing={true}
              restrictCancelToPending={true}
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
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="served">Served</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleStatusUpdate(order.status)} 
              variant="contained"
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialogs */}
        <ConfirmationDialog
          open={completeConfirmationOpen}
          title="Complete Order"
          message="Are you sure you want to complete this order? This action cannot be undone."
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