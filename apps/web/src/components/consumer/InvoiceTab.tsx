import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { formatFullDateTime } from '../../utils/dateFormatting';
import { formatCurrencyFromContext } from '../../utils/currency';
import { getStatusColor } from '../../utils/statusColors';
import { 
  GET_ORDER_BY_TABLE, 
  GET_ORDER_BY_ID, 
  GET_ORDERS_BY_SESSION, 
  GET_ORDERS_BY_MOBILE 
} from '../../graphql/queries/orders';
import { MARK_ORDER_PAID } from '../../graphql/mutations/orders';


interface OrderItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  price: number;
}

interface Invoice {
  id: string;
  tableNumber?: string | number;
  orderType: string;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  paidAt?: string;
}

interface InvoiceTabProps {
  tableNumber: string | number;
  orderId?: string;
  orderType?: string;
  isParcelOrder?: boolean;
  sessionId?: string | null;
  currentUser?: any;
  isActive?: boolean;
  refreshTrigger?: number;
}

function InvoiceTab({ tableNumber, orderId, orderType, isParcelOrder, sessionId, currentUser, isActive, refreshTrigger }: InvoiceTabProps) {
  // Invoice tab component for consumer interface
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use different queries based on whether we have tableNumber or orderId
  const tableQuery = useQuery(GET_ORDER_BY_TABLE, {
    variables: { tableNumber },
    errorPolicy: 'all',
    skip: !!orderId || isParcelOrder, // Skip if we have orderId or parcel order
    fetchPolicy: 'cache-and-network', // Always fetch fresh data
  });

  const orderQuery = useQuery(GET_ORDER_BY_ID, {
    variables: { id: orderId },
    errorPolicy: 'all',
    skip: !orderId, // Only skip if we don't have orderId
    fetchPolicy: 'cache-and-network', // Always fetch fresh data
  });

  // Check for mobile-based orders for takeout/delivery
  const { data: mobileOrdersData, refetch: refetchMobileOrders } = useQuery(GET_ORDERS_BY_MOBILE, {
    variables: { mobileNumber: currentUser?.mobileNumber || '', orderType: orderType || 'takeout' },
    skip: !isParcelOrder || !currentUser?.mobileNumber,
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network' // Always fetch fresh data
  });

  // Check for session-based orders for takeout/delivery (fallback)
  const { data: sessionOrdersData, refetch: refetchSessionOrders } = useQuery(GET_ORDERS_BY_SESSION, {
    variables: { sessionId: sessionId || '', orderType: orderType || 'takeout' },
    skip: !isParcelOrder || !sessionId || !!currentUser?.id,
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network' // Always fetch fresh data
  });

  // For takeout orders, prioritize mobile-based orders, fallback to session-based
  const mobileOrders = mobileOrdersData?.ordersByMobile || [];
  const sessionOrders = sessionOrdersData?.ordersBySession || [];
  
  // Try to find the order by ID first
  let currentUserOrder = mobileOrders.find((order: any) => order.id === orderId) || 
                        sessionOrders.find((order: any) => order.id === orderId);
  
  // If no order found by ID but we have orders, use the most recent one
  if (!currentUserOrder && (mobileOrders.length > 0 || sessionOrders.length > 0)) {
    const allOrders = [...mobileOrders, ...sessionOrders];
    // Sort by createdAt and get the most recent
    allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    currentUserOrder = allOrders[0];
  }

  const { data, loading, error, refetch } = orderId ? orderQuery : tableQuery;
  const combinedRefetch = refetch || refetchMobileOrders || refetchSessionOrders;

  const [markOrderPaid] = useMutation(MARK_ORDER_PAID);

  // Refetch data when the tab becomes active or when refreshTrigger changes
  useEffect(() => {
    if (isActive && combinedRefetch) {
      combinedRefetch();
    }
  }, [isActive, combinedRefetch]);

  // Refetch data when refreshTrigger changes (order created/updated)
  useEffect(() => {
    if (combinedRefetch && refreshTrigger !== undefined) {
      combinedRefetch();
    }
  }, [refreshTrigger, combinedRefetch]);

  const invoice: Invoice | null = data?.orderByTable || data?.orderById || currentUserOrder || null;

  const handlePayment = async () => {
    if (!invoice) return;

    setIsProcessing(true);
    try {
      await markOrderPaid({
        variables: {
          id: invoice.id,
          paymentMethod,
          paymentTransactionId: paymentMethod === 'card' || paymentMethod === 'online'
            ? `TXN_${Date.now()}`
            : undefined,
        },
      });
      setShowPaymentDialog(false);
      if (combinedRefetch) combinedRefetch();
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };


  const calculateTip = (amount: number) => {
    return (amount * tipAmount) / 100;
  };

  const getFinalTotal = () => {
    if (!invoice) return 0;
    const tip = customTip ? parseFloat(customTip) : calculateTip(invoice.totalAmount);
    return invoice.totalAmount + tip;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load invoice details. Please try again later.
      </Alert>
    );
  }

  if (!invoice) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Invoice Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isParcelOrder 
            ? `Complete your ${orderType} order to view the invoice`
            : 'Complete an order to view the invoice'
          }
        </Typography>
      </Paper>
    );
  }

  const isPaid = invoice.status === 'paid' || invoice.paidAt;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {isParcelOrder 
          ? `Invoice - ${orderType === 'takeout' ? 'Takeout' : 'Delivery'} Order`
          : `Invoice - Table #${tableNumber}`
        }
      </Typography>

      {/* Invoice Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Invoice #{invoice.id.slice(-6)}
            </Typography>
            <Chip
              label={isPaid ? 'Paid' : 'Pending'}
              color={getStatusColor(isPaid ? 'paid' : invoice.status) as any}
              icon={isPaid ? <CheckCircleIcon /> : undefined}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Type: {invoice.orderType} {invoice.tableNumber && `• Table ${invoice.tableNumber}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Date: {formatFullDateTime(invoice.createdAt)}
          </Typography>
          {isPaid && invoice.paidAt && (
            <Typography variant="body2" color="text.secondary">
              Paid: {formatFullDateTime(invoice.paidAt)}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Order Details
          </Typography>
          <List>
            {invoice.items.map((item, index) => (
              <React.Fragment key={item.menuItemId}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={`Item ${item.menuItemId}`}
                    secondary={`Qty: ${item.quantity}`}
                  />
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrencyFromContext(item.price * item.quantity)}
                  </Typography>
                </ListItem>
                {index < invoice.items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Summary
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1">Subtotal:</Typography>
              <Typography variant="body1">{formatCurrencyFromContext(invoice.totalAmount)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1">Tax:</Typography>
              <Typography variant="body1">{formatCurrencyFromContext(0)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1">Tip:</Typography>
              <Typography variant="body1">
                {formatCurrencyFromContext(customTip ? parseFloat(customTip) : calculateTip(invoice.totalAmount))}
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">{formatCurrencyFromContext(getFinalTotal())}</Typography>
            </Box>
          </Box>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          {!isPaid ? (
            <Button
              variant="contained"
              startIcon={<PaymentIcon />}
              onClick={() => setShowPaymentDialog(true)}
              size="large"
            >
              Pay Now
            </Button>
          ) : (
            <Alert severity="success" sx={{ width: '100%' }}>
              <Typography variant="body2">
                Payment completed successfully!
              </Typography>
            </Alert>
          )}
        </CardActions>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {/* Payment Method */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Payment Method</FormLabel>
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <FormControlLabel
                  value="card"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCardIcon />
                      Credit/Debit Card
                    </Box>
                  }
                />
                <FormControlLabel
                  value="mobile"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon />
                      Mobile Payment
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {/* Tip Selection */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Tip Amount
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {[0, 15, 18, 20, 25].map((tip) => (
                  <Button
                    key={tip}
                    variant={tipAmount === tip ? 'contained' : 'outlined'}
                    onClick={() => {
                      setTipAmount(tip);
                      setCustomTip('');
                    }}
                    size="small"
                  >
                    {tip === 0 ? 'No Tip' : `${tip}%`}
                  </Button>
                ))}
              </Box>
              <TextField
                fullWidth
                label={`Custom Tip Amount (${formatCurrencyFromContext(0).replace('0.00', '').trim()})`}
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  setTipAmount(0);
                }}
                placeholder="Enter custom tip amount"
              />
            </Box>

            {/* Total Display */}
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" align="center">
                Total: {formatCurrencyFromContext(getFinalTotal())}
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            variant="contained"
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {isProcessing ? 'Processing...' : 'Pay Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvoiceTab;
