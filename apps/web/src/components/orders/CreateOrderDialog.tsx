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
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Restaurant,
  TakeoutDining,
  DeliveryDining
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { GET_AVAILABLE_TABLES, GET_ORDERS } from '../../graphql/queries/orders';
import { GET_ORDERS_FOR_STAFF } from '../../graphql/queries/staff';
import { CREATE_ORDER } from '../../graphql/mutations/orders';
import { validateForm, clearFieldError } from '../../utils/validation';
import { getLocalDateString } from '../../utils/dateFormatting';

interface CreateOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onOrderCreated: (order: any) => void;
  restaurant: any;
  /** Pre-fill table when opening (e.g. after seating from waitlist) */
  initialTableNumber?: string | null;
  /** Linked tables (e.g. when seating with merged tables from waitlist) */
  initialLinkedTableNumbers?: string[];
  /** Pre-fill customer name when opening */
  initialCustomerName?: string;
  /** Pre-fill customer phone when opening */
  initialCustomerPhone?: string;
}

const ORDER_TYPES = [
  { value: 'dine-in', label: 'Dine In', icon: <Restaurant /> },
  { value: 'takeout', label: 'Takeout', icon: <TakeoutDining /> },
  { value: 'delivery', label: 'Delivery', icon: <DeliveryDining /> }
];

export default function CreateOrderDialog({ open, onClose, onOrderCreated, restaurant, initialTableNumber, initialLinkedTableNumbers, initialCustomerName, initialCustomerPhone }: CreateOrderDialogProps) {
  const theme = useTheme();
  const isSmallDevice = useMediaQuery(theme.breakpoints.down('md'));
  
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: tablesData, loading: tablesLoading, refetch: refetchTables } = useQuery(GET_AVAILABLE_TABLES, {
    skip: orderType !== 'dine-in',
    fetchPolicy: 'network-only' // Always fetch fresh data when query runs
  });

  // Mutations - refetch orders lists so new orders appear without page refresh (e.g. when created from waitlist)
  // Use today's date for GET_ORDERS to match OrderListPage default filter (Apollo caches by query + variables)
  const today = getLocalDateString();
  const [createOrder] = useMutation(CREATE_ORDER, {
    refetchQueries: [
      { query: GET_ORDERS, variables: { fromDate: today, toDate: today } },
      ...(restaurant?.id ? [{ query: GET_ORDERS_FOR_STAFF, variables: { restaurantId: restaurant.id } }] : []),
    ],
  });

  const availableTables = tablesData?.availableTables || [];
  const noTablesAvailable = orderType === 'dine-in' && !tablesLoading && availableTables.length === 0;

  // Handle orderType changes and dialog opening: 
  // - Clear table when switching away from dine-in
  // - Refetch tables when switching to dine-in (only if dialog is open)
  // - Refetch tables when dialog opens and orderType is already dine-in
  // - Pre-fill from initialTableNumber, initialCustomerName, initialCustomerPhone when provided
  useEffect(() => {
    if (orderType !== 'dine-in') {
      setTableNumber(null);
      return;
    }
    
    // Only refetch if dialog is open
    if (open) {
      refetchTables();
    }
  }, [orderType, open, refetchTables]);

  useEffect(() => {
    if (open && initialTableNumber != null) {
      setTableNumber(initialTableNumber);
    }
    if (open && initialCustomerName != null) {
      setCustomerName(initialCustomerName);
    }
    if (open && initialCustomerPhone != null) {
      setCustomerPhone(initialCustomerPhone);
    }
  }, [open, initialTableNumber, initialCustomerName, initialCustomerPhone]);

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

  // Pure validation function that doesn't update state (for use in render)
  const checkFormValid = () => {
    const formData = {
      tableNumber: orderType === 'dine-in' ? tableNumber : null
    };
    
    const rules: any[] = [];
    if (orderType === 'dine-in') {
      rules.push({
        field: 'tableNumber',
        validator: (value: any) => value != null && value !== '',
        message: 'Table selection is required for dine-in orders'
      });
    }
    
    const errors = validateForm(formData, rules);
    return Object.keys(errors).length === 0;
  };

  // Validation function that updates state (for use in handlers)
  const isFormValid = () => {
    const formData = {
      tableNumber: orderType === 'dine-in' ? tableNumber : null
    };
    
    const rules: any[] = [];
    if (orderType === 'dine-in') {
      rules.push({
        field: 'tableNumber',
        validator: (value: any) => value != null && value !== '',
        message: 'Table selection is required for dine-in orders'
      });
    }
    
    const errors = validateForm(formData, rules);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
        linkedTableNumbers: orderType === 'dine-in' && initialLinkedTableNumbers?.length ? initialLinkedTableNumbers : undefined,
        items: [],
        totalAmount: 0,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
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
    setFieldErrors({});
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth={!isSmallDevice}
      fullScreen={isSmallDevice}
    >
      <DialogTitle>Create New Order</DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert ref={errorRef} severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={{ xs: 2, sm: 3 }}>
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
              {noTablesAvailable ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  All tables are currently occupied. Go to the Waitlist page to add customers.
                </Alert>
              ) : (
                <>
                  <FormControl fullWidth margin="normal" error={!!fieldErrors.tableNumber}>
                    <InputLabel>Table</InputLabel>
                    <Select
                      value={tableNumber || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTableNumber(val ? val : null);
                        if (fieldErrors.tableNumber) setFieldErrors(clearFieldError(fieldErrors, 'tableNumber'));
                      }}
                      disabled={tablesLoading}
                      label="Table"
                    >
                      {availableTables.map((table: any) => (
                        <MenuItem key={table.id} value={table.number}>
                          Table {table.number} ({table.capacity} seats) - {table.location || 'Main Area'}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldErrors.tableNumber && (
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                        {fieldErrors.tableNumber}
                      </Box>
                    )}
                  </FormControl>
                  {tablesLoading && <CircularProgress size={20} />}
                </>
              )}
            </Grid>
          )}

          {/* Customer Information */}
          <Grid size={{ xs: 12, md: orderType === 'dine-in' ? 6 : 12 }}>
            <TextField
              fullWidth
              label="Customer Name"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (fieldErrors.customerName) setFieldErrors(clearFieldError(fieldErrors, 'customerName'));
              }}
              error={!!fieldErrors.customerName}
              helperText={fieldErrors.customerName}
              margin="normal"
            />
          </Grid>
          <Grid size={{ xs: 12, md: orderType === 'dine-in' ? 6 : 12 }}>
            <TextField
              fullWidth
              label="Customer Phone"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (fieldErrors.customerPhone) setFieldErrors(clearFieldError(fieldErrors, 'customerPhone'));
              }}
              error={!!fieldErrors.customerPhone}
              helperText={fieldErrors.customerPhone}
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
          disabled={isCreating || !checkFormValid()}
        >
          {isCreating ? <CircularProgress size={20} /> : 'Create Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
