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
  SelectChangeEvent
} from '@mui/material';
import {
  ArrowBack,
  ShoppingCart,
  Restaurant,
  AccessTime,
  CheckCircle,
  Cancel,
  Update
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { formatFullDateTime } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import StaffLayout from '../components/StaffLayout';
import { 
  GET_ORDER_BY_ID_FOR_STAFF, 
  UPDATE_ORDER_STATUS_FOR_STAFF, 
  UPDATE_ORDER_ITEM_STATUS_FOR_STAFF 
} from '../graphql';

export default function StaffOrderManagement() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [staff, setStaff] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [itemStatusDialogOpen, setItemStatusDialogOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState('');

  // Queries
  const { data: orderData, loading: orderLoading, refetch } = useQuery(GET_ORDER_BY_ID_FOR_STAFF, {
    variables: { id: orderId },
    skip: !orderId
  });

  // Mutations
  const [updateOrderStatus, { loading: updateLoading }] = useMutation(UPDATE_ORDER_STATUS_FOR_STAFF, {
    onCompleted: () => {
      setStatusDialogOpen(false);
      refetch();
    }
  });

  const [updateOrderItemStatus, { loading: updateItemLoading }] = useMutation(UPDATE_ORDER_ITEM_STATUS_FOR_STAFF, {
    onCompleted: () => {
      setItemStatusDialogOpen(false);
      setSelectedItemIndex(null);
      refetch();
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
    if (restaurantData) {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, [navigate]);

  const handleStatusUpdate = async () => {
    if (!orderId || !newStatus) return;
    
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          status: newStatus
        }
      });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleItemStatusUpdate = async () => {
    if (!orderId || selectedItemIndex === null || !newStatus) return;
    
    try {
      await updateOrderItemStatus({
        variables: {
          orderId: orderId,
          itemIndex: selectedItemIndex,
          status: newStatus
        }
      });
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const openItemStatusDialog = (itemIndex: number) => {
    setSelectedItemIndex(itemIndex);
    setItemStatusDialogOpen(true);
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

  if (!staff) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const order = orderData?.orderByIdForStaff;

  if (orderLoading) {
    return (
      <StaffLayout staffPermissions={staff.permissions}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  if (!order) {
    return (
      <StaffLayout staffPermissions={staff.permissions}>
        <Alert severity="error">Order not found</Alert>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout staffPermissions={staff.permissions}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/staff/dashboard')} sx={{ mr: 2 }}>
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
                  Order Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Order ID
                  </Typography>
                  <Typography variant="body1">
                    {order.id.slice(-8)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Order Type
                  </Typography>
                  <Chip
                    label={order.orderType}
                    size="small"
                    color="primary"
                  />
                </Box>

                {order.tableNumber && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Table Number
                    </Typography>
                    <Typography variant="body1">
                      {order.tableNumber}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="body1">
                    {order.customerName || 'Walk-in Customer'}
                  </Typography>
                  {order.customerPhone && (
                    <Typography variant="body2" color="text.secondary">
                      {order.customerPhone}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrencyFromRestaurant(order.totalAmount, restaurant)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(order.status)}
                    label={order.status}
                    size="small"
                    color={getStatusColor(order.status)}
                  />
                </Box>

                {order.notes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {order.notes}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body1">
                    {formatFullDateTime(order.createdAt)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1">
                    {formatFullDateTime(order.updatedAt)}
                  </Typography>
                </Box>

                {/* Update Order Status Button */}
                <Button
                  variant="contained"
                  startIcon={<Update />}
                  onClick={() => setStatusDialogOpen(true)}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Update Order Status
                </Button>
              </CardContent>
            </Card>
          </Box>

          {/* Order Items */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Items
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Qty</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2">
                                Item #{item.menuItemId.slice(-6)}
                              </Typography>
                              {item.specialInstructions && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.specialInstructions}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrencyFromRestaurant(item.price, restaurant)}</TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(item.status)}
                              label={item.status}
                              size="small"
                              color={getStatusColor(item.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openItemStatusDialog(index)}
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Update Order Status Dialog */}
        <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e: SelectChangeEvent) => setNewStatus(e.target.value)}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleStatusUpdate} 
              variant="contained"
              disabled={updateLoading || !newStatus}
            >
              {updateLoading ? <CircularProgress size={20} /> : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Update Item Status Dialog */}
        <Dialog open={itemStatusDialogOpen} onClose={() => setItemStatusDialogOpen(false)}>
          <DialogTitle>Update Item Status</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e: SelectChangeEvent) => setNewStatus(e.target.value)}
                label="New Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="served">Served</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setItemStatusDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleItemStatusUpdate} 
              variant="contained"
              disabled={updateItemLoading || !newStatus}
            >
              {updateItemLoading ? <CircularProgress size={20} /> : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </StaffLayout>
  );
}