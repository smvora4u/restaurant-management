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
  Grid
} from '@mui/material';
import {
  Restaurant,
  TakeoutDining,
  DeliveryDining
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { GET_AVAILABLE_TABLES } from '../../graphql/queries/orders';
import { CREATE_ORDER } from '../../graphql/mutations/orders';

interface CreateOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onOrderCreated: (order: any) => void;
  restaurant: any;
}

const ORDER_TYPES = [
  { value: 'dine-in', label: 'Dine In', icon: <Restaurant /> },
  { value: 'takeout', label: 'Takeout', icon: <TakeoutDining /> },
  { value: 'delivery', label: 'Delivery', icon: <DeliveryDining /> }
];

export default function CreateOrderDialog({ open, onClose, onOrderCreated, restaurant }: CreateOrderDialogProps) {
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: tablesData, loading: tablesLoading, refetch: refetchTables } = useQuery(GET_AVAILABLE_TABLES, {
    skip: orderType !== 'dine-in',
    fetchPolicy: 'network-only' // Always fetch fresh data when query runs
  });

  // Mutations
  const [createOrder] = useMutation(CREATE_ORDER);

  const availableTables = tablesData?.availableTables || [];

  // Refetch tables when dialog opens
  useEffect(() => {
    if (open && orderType === 'dine-in') {
      refetchTables();
    }
  }, [open, orderType, refetchTables]);

  useEffect(() => {
    if (orderType !== 'dine-in') {
      setTableNumber(null);
    } else {
      // Refetch tables when switching to dine-in
      refetchTables();
    }
  }, [orderType, refetchTables]);

  useEffect(() => {
    if (error) {
      scrollToError();
    }
  }, [error]);

  const scrollToError = () => {
    if (errorRef.current) {
      errorRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  const isFormValid = () => {
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
        items: [],
        totalAmount: 0,
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
