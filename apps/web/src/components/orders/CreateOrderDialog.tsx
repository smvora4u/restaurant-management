import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  Restaurant,
  TakeoutDining,
  DeliveryDining
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MENU_ITEMS } from '../../graphql/queries/menu';
import { GET_AVAILABLE_TABLES } from '../../graphql/queries/orders';
import { CREATE_ORDER } from '../../graphql/mutations/orders';
import { formatCurrencyFromRestaurant } from '../../utils/currency';

interface CreateOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onOrderCreated: (order: any) => void;
  restaurant: any;
}

interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions: string;
}

const ORDER_TYPES = [
  { value: 'dine-in', label: 'Dine In', icon: <Restaurant /> },
  { value: 'takeaway', label: 'Takeaway', icon: <TakeoutDining /> },
  { value: 'delivery', label: 'Delivery', icon: <DeliveryDining /> }
];

export default function CreateOrderDialog({ open, onClose, onOrderCreated, restaurant }: CreateOrderDialogProps) {
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: menuData, loading: menuLoading } = useQuery(GET_MENU_ITEMS);
  const { data: tablesData, loading: tablesLoading } = useQuery(GET_AVAILABLE_TABLES, {
    skip: orderType !== 'dine-in'
  });

  // Mutations
  const [createOrder] = useMutation(CREATE_ORDER);

  const menuItems = menuData?.menuItems || [];
  const availableTables = tablesData?.availableTables || [];

  useEffect(() => {
    if (orderType !== 'dine-in') {
      setTableNumber(null);
    }
  }, [orderType]);

  useEffect(() => {
    if (error) {
      scrollToError();
    }
  }, [error]);

  const handleAddItem = () => {
    if (!selectedMenuItemId) return;

    const menuItem = menuItems.find((item: any) => item.id === selectedMenuItemId);
    if (!menuItem) return;

    const existingItemIndex = items.findIndex(item => item.menuItemId === selectedMenuItemId);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += quantity;
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: OrderItem = {
        menuItemId: selectedMenuItemId,
        quantity,
        price: menuItem.price,
        specialInstructions
      };
      setItems([...items, newItem]);
    }

    // Reset form
    setSelectedMenuItemId('');
    setQuantity(1);
    setSpecialInstructions('');
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    
    const updatedItems = [...items];
    updatedItems[index].quantity = newQuantity;
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const scrollToError = () => {
    if (errorRef.current) {
      errorRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  const isFormValid = () => {
    // Check if items are added
    if (items.length === 0) return false;
    
    // Check customer information
    if (!customerName.trim()) return false;
    if (!customerPhone.trim()) return false;
    
    // Check table selection for dine-in orders
    if (orderType === 'dine-in' && !tableNumber) return false;
    
    return true;
  };

  const handleCreateOrder = async () => {
    // Form validation is handled by button disabled state
    // Only proceed if form is valid
    if (!isFormValid()) return;

    setIsCreating(true);
    setError('');

    try {
      const orderInput = {
        restaurantId: restaurant.id,
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : null,
        items: items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions,
          status: 'pending'
        })),
        totalAmount: calculateTotal(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim(),
        status: 'pending'
      };

      const result = await createOrder({
        variables: { input: orderInput }
      });

      onOrderCreated(result.data.createOrder);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      setTimeout(scrollToError, 100);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setOrderType('dine-in');
    setTableNumber(null);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setItems([]);
    setSelectedMenuItemId('');
    setQuantity(1);
    setSpecialInstructions('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Order</DialogTitle>
      <DialogContent>
        {error && (
          <Alert ref={errorRef} severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Order Type Selection */}
          <Grid size={12}>
            <Typography variant="h6" gutterBottom>
              Order Type
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {ORDER_TYPES.map((type) => (
                <Chip
                  key={type.value}
                  icon={type.icon}
                  label={type.label}
                  onClick={() => setOrderType(type.value)}
                  color={orderType === type.value ? 'primary' : 'default'}
                  variant={orderType === type.value ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Grid>

          {/* Table Selection (for dine-in) */}
          {orderType === 'dine-in' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Table</InputLabel>
                <Select
                  value={tableNumber || ''}
                  onChange={(e) => setTableNumber(Number(e.target.value))}
                  disabled={tablesLoading}
                  label="Table"
                >
                  {availableTables.map((table: any) => (
                    <MenuItem key={table.id} value={table.number}>
                      Table {table.number} ({table.capacity} seats) - {table.location || 'Main Area'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {tablesLoading && <CircularProgress size={20} />}
            </Grid>
          )}

          {/* Customer Information */}
          <Grid size={{ xs: 12, md: orderType === 'dine-in' ? 6 : 12 }}>
            <TextField
              fullWidth
              label="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              margin="normal"
            />
          </Grid>
          <Grid size={{ xs: 12, md: orderType === 'dine-in' ? 6 : 12 }}>
            <TextField
              fullWidth
              label="Customer Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              margin="normal"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          {/* Add Items */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Add Items
            </Typography>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <FormControl sx={{ minWidth: 200 }} margin="normal">
                <InputLabel>Menu Item</InputLabel>
                <Select
                  value={selectedMenuItemId}
                  onChange={(e) => setSelectedMenuItemId(e.target.value)}
                  disabled={menuLoading}
                  label="Menu Item"
                >
                  {menuItems.map((item: any) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name} - {formatCurrencyFromRestaurant(item.price, restaurant)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                type="number"
                label="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1 }}
                sx={{ width: 100 }}
              />
              
              <TextField
                label="Special Instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                sx={{ minWidth: 200 }}
              />
              
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddItem}
                disabled={!selectedMenuItemId || menuLoading}
              >
                Add Item
              </Button>
            </Box>
          </Grid>

          {/* Order Items */}
          {items.length > 0 && (
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>
              {items.map((item, index) => {
                const menuItem = menuItems.find((mi: any) => mi.id === item.menuItemId);
                return (
                  <Card key={`order-item-${index}-${item.menuItemId}-${item.quantity}-${item.specialInstructions || 'no-instructions'}`} sx={{ mb: 1 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1">
                            {menuItem?.name || 'Unknown Item'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrencyFromRestaurant(item.price, restaurant)} each
                          </Typography>
                          {item.specialInstructions && (
                            <Typography variant="caption" color="text.secondary">
                              Note: {item.specialInstructions}
                            </Typography>
                          )}
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                          >
                            <Remove />
                          </IconButton>
                          <Typography variant="body1" sx={{ minWidth: 30, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                          >
                            <Add />
                          </IconButton>
                          <Typography variant="subtitle1" sx={{ minWidth: 80, textAlign: 'right' }}>
                            {formatCurrencyFromRestaurant(item.price * item.quantity, restaurant)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
              
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Typography variant="h6">
                  Total: {formatCurrencyFromRestaurant(calculateTotal(), restaurant)}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateOrder}
          variant="contained"
          disabled={isCreating || !isFormValid()}
        >
          {isCreating ? <CircularProgress size={20} /> : 'Create Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
