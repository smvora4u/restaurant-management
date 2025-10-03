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
import { 
  UPDATE_ORDER, 
  UPDATE_ORDER_ITEM_STATUS 
} from '../graphql/mutations/orders';

export default function RestaurantOrderManagement() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [itemStatusDialogOpen, setItemStatusDialogOpen] = useState(false);
  const [newItemStatus, setNewItemStatus] = useState('');
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Queries
  const { data, loading, error, refetch } = useQuery(GET_ORDER_BY_ID_FOR_RESTAURANT, {
    variables: { id: orderId },
    skip: !orderId,
    onError: (error) => {
      console.error('GraphQL Error:', error);
      console.error('Error details:', error.message);
      console.error('Network error:', error.networkError);
    },
    onCompleted: (data) => {
      console.log('Query completed successfully:', data);
    }
  });

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

  const [updateOrderItemStatus, { loading: updateItemLoading }] = useMutation(UPDATE_ORDER_ITEM_STATUS, {
    onCompleted: () => {
      setSelectedItemIndex(null);
      setItemStatusDialogOpen(false);
      setNewItemStatus('');
      refetch();
    },
    onError: (error) => {
      console.error('Error updating item status:', error);
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
    
    const parsedRestaurant = JSON.parse(restaurantData);
    console.log('Parsed restaurant data:', parsedRestaurant);
    setRestaurant(parsedRestaurant);
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
            }))
          }
        }
      });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleItemStatusUpdate = async () => {
    if (selectedItemIndex === null || !newItemStatus || !orderId) return;
    
    try {
      await updateOrderItemStatus({
        variables: {
          orderId: orderId,
          itemIndex: selectedItemIndex,
          status: newItemStatus
        }
      });
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const updatedItems = [...editingItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity
    };
    setEditingItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = editingItems.filter((_, i) => i !== index);
    setEditingItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const handleSaveOrderChanges = async () => {
    if (!orderId || !order) return;
    
    try {
      // Calculate new total amount
      const totalAmount = editingItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            status: order.status,
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: editingItems.map((item: any) => ({
              menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              specialInstructions: item.specialInstructions
            })),
            totalAmount: totalAmount
          }
        }
      });
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error updating order items:', error);
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
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Customer Information
                  </Typography>
                  <Typography variant="body2">
                    <strong>Name:</strong> {order.customerName || 'Walk-in'}
                  </Typography>
                  {order.customerPhone && (
                    <Typography variant="body2">
                      <strong>Phone:</strong> {order.customerPhone}
                    </Typography>
                  )}
                  {order.tableNumber && (
                    <Typography variant="body2">
                      <strong>Table:</strong> {order.tableNumber}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Order Items */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    Order Items
                  </Typography>
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
                              {typeof item.menuItemId === 'string' ? `Item ${item.menuItemId}` : item.menuItemId?.name || 'Unknown Item'}
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

                {/* Status Update */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Update Status</InputLabel>
                  <Select
                    value={newStatus}
                    onChange={(e: SelectChangeEvent) => setNewStatus(e.target.value)}
                    label="Update Status"
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

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updateLoading}
                  startIcon={<Update />}
                  sx={{ mb: 2 }}
                >
                  {updateLoading ? 'Updating...' : 'Update Order Status'}
                </Button>

                <Divider sx={{ my: 2 }} />

                {/* Order Information */}
                <Typography variant="subtitle2" gutterBottom>
                  Order Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Order ID:</strong> {order.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Type:</strong> {order.orderType}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {order.status}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Items:</strong> {order.items.length}
                </Typography>
                {order.specialRequests && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Special Requests:</strong> {order.specialRequests}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Item Status Update Dialog */}
        <Dialog open={itemStatusDialogOpen} onClose={() => setItemStatusDialogOpen(false)}>
          <DialogTitle>Update Item Status</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Item Status</InputLabel>
              <Select
                value={newItemStatus}
                onChange={(e: SelectChangeEvent) => setNewItemStatus(e.target.value)}
                label="Item Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="served">Served</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setItemStatusDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleItemStatusUpdate}
              disabled={updateItemLoading}
              variant="contained"
            >
              {updateItemLoading ? 'Updating...' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
