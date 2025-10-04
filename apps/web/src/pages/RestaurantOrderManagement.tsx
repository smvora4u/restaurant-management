import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  TextField
} from '@mui/material';
import {
  ArrowBack,
  ShoppingCart,
  Restaurant,
  AccessTime,
  CheckCircle,
  Cancel,
  Update,
  Add,
  Remove,
  Delete,
  Save
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { formatFullDateTime } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import Layout from '../components/Layout';
import { GET_ORDER_BY_ID_FOR_RESTAURANT } from '../graphql/queries/restaurant';
import { GET_MENU_ITEMS } from '../graphql/queries/menu';
import { 
  UPDATE_ORDER
} from '../graphql/mutations/orders';
import { handleQuantityChange as handleQuantityChangeUtil, removeOrderItem, addNewOrderItem, updatePartialQuantityStatus } from '../utils/orderItemManagement';
import { syncOrderStatus, calculateOrderStatus, isValidStatusTransition, getItemStatusSummary, getNextStatus, canCompleteOrder, canCancelOrder } from '../utils/statusManagement';
import { ConfirmationDialog, AppSnackbar } from '../components/common';

export default function RestaurantOrderManagement() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [itemStatusDialogOpen, setItemStatusDialogOpen] = useState(false);
  const [newItemStatus, setNewItemStatus] = useState('');
  const [statusUpdateQuantity, setStatusUpdateQuantity] = useState(1);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemSpecialInstructions, setNewItemSpecialInstructions] = useState('');
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [isSaving, setIsSaving] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Queries
  const { data, loading, error, refetch } = useQuery(GET_ORDER_BY_ID_FOR_RESTAURANT, {
    variables: { id: orderId },
    skip: !orderId
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error('GraphQL Error:', error);
      console.error('Error details:', error.message);
      console.error('Network error:', error.networkError);
    }
  }, [error]);

  const { data: menuData } = useQuery(GET_MENU_ITEMS);

  // Mutations
  const [updateOrderStatus, { loading: updateLoading }] = useMutation(UPDATE_ORDER, {
    onCompleted: () => {
      setNewStatus('');
      refetch();
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
    }
  });



  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    const restaurantToken = localStorage.getItem('restaurantToken');
    
    console.log('Restaurant data from localStorage:', restaurantData);
    console.log('Restaurant token from localStorage:', restaurantToken);
    
    if (!restaurantData || !restaurantToken) {
      console.log('Missing restaurant data or token, redirecting to login');
      navigate('/restaurant/login');
      return;
    }
    
    if (restaurantData && restaurantData !== 'undefined' && restaurantData !== 'null') {
      const parsedRestaurant = JSON.parse(restaurantData);
      console.log('Parsed restaurant data:', parsedRestaurant);
      setRestaurant(parsedRestaurant);
    }
  }, [navigate]);

  // Initialize editing items when order data loads
  useEffect(() => {
    if (data?.order?.items) {
      setEditingItems([...data.order.items]);
      setHasUnsavedChanges(false);
    }
  }, [data]);

  const handleStatusUpdate = async () => {
    if (!orderId || !newStatus || !order) return;
    
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            restaurantId: restaurant?.id,
            status: newStatus,
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: order.items.map((item: any) => ({
              menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              specialInstructions: item.specialInstructions
            })),
            totalAmount: order.totalAmount
          }
        }
      });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleItemStatusUpdate = async () => {
    if (selectedItemIndex === null || !newItemStatus) return;
    
    try {
      // Use the new partial quantity status update logic
      const updatedItems = updatePartialQuantityStatus(
        editingItems, 
        selectedItemIndex, 
        newItemStatus as any, 
        statusUpdateQuantity
      );
      
      setEditingItems(updatedItems);
      setHasUnsavedChanges(true);
      
      // Close dialog and reset state
      setItemStatusDialogOpen(false);
      setSelectedItemIndex(null);
      setNewItemStatus('');
      setStatusUpdateQuantity(1);
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const updatedItems = handleQuantityChangeUtil(editingItems, index, newQuantity);
    setEditingItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = removeOrderItem(editingItems, index);
    setEditingItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const handleAddNewItem = () => {
    if (!selectedMenuItemId || !menuData?.menuItems) return;
    
    const selectedMenuItem = menuData.menuItems.find((item: any) => item.id === selectedMenuItemId);
    if (!selectedMenuItem) return;
    
    const newItem = {
      menuItemId: selectedMenuItemId,
      quantity: newItemQuantity,
      price: selectedMenuItem.price,
      status: 'pending' as const, // Will be overridden by addNewOrderItem
      specialInstructions: newItemSpecialInstructions
    };
    
    const updatedItems = addNewOrderItem(editingItems, newItem);
    setEditingItems(updatedItems);
    setHasUnsavedChanges(true);
    
    // Reset form
    setSelectedMenuItemId('');
    setNewItemQuantity(1);
    setNewItemSpecialInstructions('');
    setAddItemDialogOpen(false);
  };

  const getMenuItemName = (menuItemId: string) => {
    if (!menuData?.menuItems) return `Item ${menuItemId}`;
    const menuItem = menuData.menuItems.find((item: any) => item.id === menuItemId);
    return menuItem?.name || `Item ${menuItemId}`;
  };

  const canCancelItem = (itemStatus: string) => {
    return !['served', 'completed'].includes(itemStatus);
  };

  const handleSaveOrderChanges = () => {
    setSaveConfirmationOpen(true);
  };

  const handleCancelOrder = () => {
    setCancelConfirmationOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderId || !order) return;
    
    setIsCancelling(true);
    setCancelConfirmationOpen(false);
    
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            restaurantId: restaurant?.id,
            status: 'cancelled',
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: order.items.map((item: any) => ({
              menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              specialInstructions: item.specialInstructions
            })),
            totalAmount: order.totalAmount
          }
        }
      });
      
      setSnackbarMessage('Order cancelled successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error cancelling order:', error);
      setSnackbarMessage('Failed to cancel order. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsCancelling(false);
    }
  };


  const confirmSaveChanges = async () => {
    if (!orderId || !order) return;
    
    setIsSaving(true);
    setSaveConfirmationOpen(false);
    
    try {
      // Calculate new total amount
      const totalAmount = editingItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      // Sync order status based on item statuses
      const syncedOrder = syncOrderStatus({
        id: order.id,
        status: order.status,
        items: editingItems.map((item: any) => ({
          menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
          quantity: item.quantity,
          price: item.price,
          status: item.status,
          specialInstructions: item.specialInstructions
        }))
      });

      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            restaurantId: restaurant?.id,
            status: syncedOrder.status, // Use synced status
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: syncedOrder.items,
            totalAmount: totalAmount
          }
        }
      });
      
      setHasUnsavedChanges(false);
      setSnackbarMessage(`Order changes saved successfully! Order status updated to: ${syncedOrder.status}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating order items:', error);
      setSnackbarMessage('Failed to save order changes. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'preparing': return 'info';
      case 'ready': return 'primary';
      case 'confirmed': return 'secondary';
      case 'served': return 'success';
      default: return 'default';
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
                        {order.customerName || 'Walk-in Customer'}
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

                {/* Order Items */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                  Order Items
                </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setAddItemDialogOpen(true)}
                    color="primary"
                    size="small"
                  >
                    Add Item
                  </Button>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  {hasUnsavedChanges && (
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveOrderChanges}
                      color="success"
                      size="small"
                    >
                      Save Changes
                    </Button>
                  )}
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editingItems.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {getMenuItemName(item.menuItemId)}
                            </Typography>
                            {item.specialInstructions && (
                              <Typography variant="caption" color="text.secondary">
                                {item.specialInstructions}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(index, Math.max(0, item.quantity - 1))}
                                disabled={item.quantity <= 0}
                              >
                                <Remove />
                              </IconButton>
                              <TextField
                                size="small"
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                sx={{ width: 60 }}
                                inputProps={{ min: 0, style: { textAlign: 'center' } }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(index, item.quantity + 1)}
                              >
                                <Add />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell>{formatCurrencyFromRestaurant(item.price * item.quantity, restaurant)}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.status || 'pending'}
                              size="small"
                              color={getStatusColor(item.status || 'pending')}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedItemIndex(index);
                                setNewItemStatus(item.status || 'pending');
                                setItemStatusDialogOpen(true);
                              }}
                            >
                                Status
                            </Button>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

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
                    const nextStatus = getNextStatus(order.status as any);
                    const canComplete = canCompleteOrder(editingItems);
                    const canCancel = canCancelOrder(order.status as any, editingItems);
                    
                    return (
                      <>
                        {nextStatus && (
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setNewStatus(nextStatus);
                              handleStatusUpdate();
                            }}
                            disabled={updateLoading}
                            startIcon={<Update />}
                            size="small"
                          >
                            Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                          </Button>
                        )}
                        
                        {canComplete && (
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                              setNewStatus('completed');
                              handleStatusUpdate();
                            }}
                            disabled={updateLoading}
                            startIcon={<CheckCircle />}
                            size="small"
                          >
                            Complete Order
                          </Button>
                        )}
                        
                        {canCancel && (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={handleCancelOrder}
                            disabled={updateLoading || isCancelling}
                            startIcon={<Cancel />}
                            size="small"
                            sx={{ mt: 1 }}
                          >
                            {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Manual Status Update */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Manual Status Update</InputLabel>
                  <Select
                    value={newStatus}
                    onChange={(e: SelectChangeEvent) => setNewStatus(e.target.value)}
                    label="Manual Status Update"
                  >
                    {['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'].map(status => {
                      const isValid = isValidStatusTransition(order.status as any, status as any);
                      const isCancelled = status === 'cancelled';
                      const cannotCancel = isCancelled && !canCancelOrder(order.status as any, editingItems);
                      
                      return (
                        <MenuItem 
                          key={status} 
                          value={status}
                          disabled={!isValid || cannotCancel}
                          sx={{ 
                            opacity: (isValid && !cannotCancel) ? 1 : 0.5,
                            fontStyle: (isValid && !cannotCancel) ? 'normal' : 'italic'
                          }}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                          {!isValid && ' (Invalid)'}
                          {cannotCancel && ' (Cannot cancel - items served)'}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updateLoading}
                  startIcon={<Update />}
                  sx={{ mb: 2 }}
                >
                  {updateLoading ? 'Updating...' : 'Update Status'}
                </Button>

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
                      {order.customerName || 'Walk-in'}
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

        {/* Item Status Update Dialog */}
        <Dialog open={itemStatusDialogOpen} onClose={() => {
          setItemStatusDialogOpen(false);
          setSelectedItemIndex(null);
          setNewItemStatus('');
          setStatusUpdateQuantity(1);
        }}>
          <DialogTitle>Update Item Status</DialogTitle>
          <DialogContent>
            {selectedItemIndex !== null && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                Updating: {getMenuItemName(editingItems[selectedItemIndex]?.menuItemId)} 
                (Current: {editingItems[selectedItemIndex]?.quantity}x {editingItems[selectedItemIndex]?.status})
              </Typography>
            )}
            
            <TextField
              fullWidth
              margin="normal"
              label="Quantity to Update"
              type="number"
              value={statusUpdateQuantity}
              onChange={(e) => setStatusUpdateQuantity(parseInt(e.target.value) || 1)}
              inputProps={{ 
                min: 1, 
                max: selectedItemIndex !== null ? editingItems[selectedItemIndex]?.quantity : 1 
              }}
              helperText={`Max: ${selectedItemIndex !== null ? editingItems[selectedItemIndex]?.quantity : 1}`}
            />
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={newItemStatus}
                onChange={(e: SelectChangeEvent) => setNewItemStatus(e.target.value)}
                label="New Status"
              >
                {selectedItemIndex !== null && (() => {
                  const currentItem = editingItems[selectedItemIndex];
                  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];
                  
                  return validStatuses.map(status => {
                    const isValid = isValidStatusTransition(currentItem.status as any, status as any);
                    const isCancelled = status === 'cancelled';
                    const cannotCancel = isCancelled && !canCancelItem(currentItem.status);
                    
                    return (
                      <MenuItem 
                        key={status} 
                        value={status}
                        disabled={!isValid || cannotCancel}
                        sx={{ 
                          opacity: (isValid && !cannotCancel) ? 1 : 0.5,
                          fontStyle: (isValid && !cannotCancel) ? 'normal' : 'italic'
                        }}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                        {!isValid && ' (Invalid transition)'}
                        {cannotCancel && ' (Cannot cancel served item)'}
                      </MenuItem>
                    );
                  });
                })()}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setItemStatusDialogOpen(false);
              setSelectedItemIndex(null);
              setNewItemStatus('');
              setStatusUpdateQuantity(1);
            }}>Cancel</Button>
            <Button 
              onClick={handleItemStatusUpdate}
              disabled={!newItemStatus || statusUpdateQuantity < 1}
              variant="contained"
            >
              Update Status
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Item Dialog */}
        <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Menu Item</InputLabel>
              <Select
                value={selectedMenuItemId}
                onChange={(e) => setSelectedMenuItemId(e.target.value)}
                label="Menu Item"
              >
                {menuData?.menuItems?.map((item: any) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} - {formatCurrencyFromRestaurant(item.price, restaurant)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              margin="normal"
              label="Quantity"
              type="number"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1 }}
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Special Instructions"
              multiline
              rows={3}
              value={newItemSpecialInstructions}
              onChange={(e) => setNewItemSpecialInstructions(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddNewItem}
              variant="contained"
              disabled={!selectedMenuItemId}
            >
              Add Item
            </Button>
          </DialogActions>
        </Dialog>

        {/* Save Confirmation Dialog */}
        <ConfirmationDialog
          open={saveConfirmationOpen}
          onClose={() => setSaveConfirmationOpen(false)}
          onConfirm={confirmSaveChanges}
          title="Save Order Changes"
          message="Are you sure you want to save these changes to the order? This action cannot be undone."
          confirmText="Save Changes"
          cancelText="Cancel"
          confirmColor="success"
          loading={isSaving}
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
                Order #{order.id.slice(-8)} - {order.customerName || 'Walk-in Customer'}
              </Typography>
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
