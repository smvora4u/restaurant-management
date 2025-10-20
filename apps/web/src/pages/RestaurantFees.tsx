import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Payment,
  History,
  Settings,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AccountBalance,
  Receipt,
  Download
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import Layout from '../components/Layout';
import { GET_RESTAURANT_FEE_CONFIG, GET_FEE_LEDGERS } from '../graphql/queries/admin';
import { PAY_PLATFORM_FEES } from '../graphql/mutations/admin';
import { formatDateTime } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../utils/currency';
import { useFeeSubscriptions } from '../hooks/useFeeSubscriptions';

export default function RestaurantFees() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Payment mutation
  const [payPlatformFees] = useMutation(PAY_PLATFORM_FEES, {
    onCompleted: (data) => {
      setIsProcessingPayment(false);
      setPaymentDialogOpen(false);
      setSnackbar({
        open: true,
        message: data.payPlatformFees.message,
        severity: 'success'
      });
      void refetchLedger(); // Refresh the fee ledger
    },
    onError: (error) => {
      setIsProcessingPayment(false);
      setSnackbar({
        open: true,
        message: `Payment failed: ${error.message}`,
        severity: 'error'
      });
    }
  });

  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (!restaurantData) {
      navigate('/login');
      return;
    }
    setRestaurant(JSON.parse(restaurantData));
  }, [navigate]);

  // Queries
  const { data: feeConfigData, loading: feeConfigLoading } = useQuery(GET_RESTAURANT_FEE_CONFIG, {
    variables: { restaurantId: restaurant?.id || '' },
    skip: !restaurant?.id,
    fetchPolicy: 'cache-and-network'
  });

  const { data: ledgerData, loading: ledgerLoading, refetch: refetchLedger } = useQuery(GET_FEE_LEDGERS, {
    variables: { 
      restaurantId: restaurant?.id || '', 
      limit: rowsPerPage, 
      offset: page * rowsPerPage 
    },
    skip: !restaurant?.id,
    fetchPolicy: 'cache-and-network'
  });

  // Set up real-time fee subscriptions
  useFeeSubscriptions({
    restaurantId: restaurant?.id,
    onFeeLedgerUpdated: () => {
      console.log('Restaurant fees - Fee ledger updated - refetching data');
      void refetchLedger();
    },
    onPaymentStatusUpdated: () => {
      console.log('Restaurant fees - Payment status updated - refetching data');
      void refetchLedger();
    },
    onDueFeesUpdated: () => {
      console.log('Restaurant fees - Due fees updated - refetching data');
      void refetchLedger();
    },
    fallbackRefetch: () => {
      console.log('Restaurant fees - Fallback polling - refetching data');
      void refetchLedger();
    }
  });

  const feeConfig = feeConfigData?.restaurantFeeConfig;
  const ledgers = ledgerData?.feeLedgers?.data || [];
  const totalCount = ledgerData?.feeLedgers?.totalCount || 0;

  // Calculate due fees (unpaid fees)
  const calculateDueFees = () => {
    if (!ledgers.length) return 0;
    
    // Only count fees with 'pending' payment status
    return ledgers.reduce((total: number, ledger: any) => {
      if (ledger.paymentStatus === 'pending') {
        return total + ledger.feeAmount;
      }
      return total;
    }, 0);
  };

  const dueFees = calculateDueFees();

  // Calculate total fees paid (all time)
  const totalFeesPaid = ledgers.reduce((total: number, ledger: any) => {
    if (ledger.paymentStatus === 'paid') {
      return total + ledger.feeAmount;
    }
    return total;
  }, 0);

  // Calculate fees this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const feesThisMonth = ledgers.reduce((total: number, ledger: any) => {
    const ledgerDate = new Date(ledger.createdAt);
    if (ledgerDate.getMonth() === currentMonth && ledgerDate.getFullYear() === currentYear) {
      return total + ledger.feeAmount;
    }
    return total;
  }, 0);

  const handlePayment = async () => {
    if (!restaurant?.id) {
      setSnackbar({
        open: true,
        message: 'Restaurant information not available',
        severity: 'error'
      });
      return;
    }

    setIsProcessingPayment(true);
    
    // Generate a transaction ID (in real implementation, this would come from payment processor)
    const transactionId = `REST_${restaurant.id}_${Date.now()}`;
    
    try {
      await payPlatformFees({
        variables: {
          restaurantId: restaurant.id,
          paymentMethod: selectedPaymentMethod,
          paymentTransactionId: transactionId
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessingPayment(false);
    }
  };

  const handleExportLedger = () => {
    const headers = ['Date', 'Order ID', 'Order Total', 'Fee Amount', 'Mode', 'Rate', 'Discount Applied'];
    const rows = ledgers.map((l: any) => [
      formatDateTime(l.createdAt).date + ' ' + formatDateTime(l.createdAt).time,
      '#' + String(l.orderId).slice(-6),
      `${l.currency} ${l.orderTotal.toFixed(2)}`,
      `${l.currency} ${l.feeAmount.toFixed(2)}`,
      l.feeMode,
      l.feeMode === 'fixed' ? l.feeRate.toFixed(2) : l.feeRate + '%',
      l.discountApplied ? 'Yes' : 'No'
    ]);
    
    const csv = [headers.join(','), ...rows.map((r: string[]) => r.map(f => `"${f.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fee-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!restaurant) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Fees & Payments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your platform fees and payment history
          </Typography>
        </Box>

        {/* Fee Configuration Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Settings sx={{ mr: 1 }} />
              <Typography variant="h6">Current Fee Configuration</Typography>
            </Box>
            
            {feeConfigLoading ? (
              <CircularProgress size={24} />
            ) : feeConfig ? (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Fee Mode
                    </Typography>
                    <Typography variant="h6">
                      <Chip 
                        label={feeConfig.mode === 'fixed' ? 'Fixed Amount' : 'Percentage'} 
                        color="primary" 
                        size="small" 
                      />
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Fee Rate
                    </Typography>
                    <Typography variant="h6">
                      {feeConfig.mode === 'fixed' 
                        ? `${formatCurrencyFromRestaurant(feeConfig.amount, restaurant)} per order`
                        : `${feeConfig.amount}% of order total`
                      }
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Free Orders Remaining
                    </Typography>
                    <Typography variant="h6">
                      {feeConfig.freeOrdersRemaining}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                No fee configuration found. Contact support for assistance.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Fee Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Due Fees
                  </Typography>
                </Box>
                <Typography variant="h5" color="error.main">
                  {formatCurrencyFromRestaurant(dueFees, restaurant)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingDown sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    This Month
                  </Typography>
                </Box>
                <Typography variant="h5" color="success.main">
                  {formatCurrencyFromRestaurant(feesThisMonth, restaurant)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Receipt sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Paid
                  </Typography>
                </Box>
                <Typography variant="h5" color="primary.main">
                  {formatCurrencyFromRestaurant(totalFeesPaid, restaurant)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  All time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <History sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                </Box>
                <Typography variant="h5" color="info.main">
                  {ledgers.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  With fees
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Payment Section */}
        {dueFees > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Payment Required
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    You have {formatCurrencyFromRestaurant(dueFees, restaurant)} in due fees. Make a payment to avoid service interruption.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Payment />}
                  onClick={() => setPaymentDialogOpen(true)}
                  size="large"
                >
                  Pay Now
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Fee History */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1 }} />
                <Typography variant="h6">Fee History</Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportLedger}
                disabled={ledgers.length === 0}
              >
                Export CSV
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Order ID</TableCell>
                    <TableCell align="right">Order Total</TableCell>
                    <TableCell align="right">Fee Amount</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>Discount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell>Transaction ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : ledgers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Alert severity="info">No fee history found</Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgers.map((ledger: any) => (
                      <TableRow key={ledger.id}>
                        <TableCell>
                          {formatDateTime(ledger.createdAt).date}
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(ledger.createdAt).time}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            #{String(ledger.orderId).slice(-6)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrencyFromRestaurant(ledger.orderTotal, restaurant)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrencyFromRestaurant(ledger.feeAmount, restaurant)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ledger.feeMode} 
                            size="small" 
                            color={ledger.feeMode === 'fixed' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>
                          {ledger.feeMode === 'fixed' 
                            ? `$${ledger.feeRate.toFixed(2)}`
                            : `${ledger.feeRate}%`
                          }
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ledger.discountApplied ? 'Yes' : 'No'} 
                            size="small" 
                            color={ledger.discountApplied ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ledger.paymentStatus || 'pending'} 
                            size="small" 
                            color={
                              ledger.paymentStatus === 'paid' ? 'success' : 
                              ledger.paymentStatus === 'pending' ? 'warning' : 
                              ledger.paymentStatus === 'failed' ? 'error' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {ledger.paymentMethod || '-'}
                        </TableCell>
                        <TableCell>
                          {ledger.paymentTransactionId ? (
                            <Typography variant="caption" fontFamily="monospace">
                              {ledger.paymentTransactionId.slice(-8)}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              rowsPerPageOptions={[10, 25, 50]}
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => {
                setPage(newPage);
                refetchLedger({
                  restaurantId: restaurant.id,
                  limit: rowsPerPage,
                  offset: newPage * rowsPerPage
                });
              }}
              onRowsPerPageChange={(e) => {
                const newRpp = parseInt(e.target.value, 10);
                setRowsPerPage(newRpp);
                setPage(0);
                refetchLedger({
                  restaurantId: restaurant.id,
                  limit: newRpp,
                  offset: 0
                });
              }}
            />
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Amount Due: {formatCurrencyFromRestaurant(dueFees, restaurant)}
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="card">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CreditCard sx={{ mr: 1 }} />
                      Credit/Debit Card
                    </Box>
                  </MenuItem>
                  <MenuItem value="bank_transfer">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccountBalance sx={{ mr: 1 }} />
                      Bank Transfer
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                This will mark all your pending platform fees as paid. In a production environment, this would integrate with Stripe, PayPal, or bank transfers for secure payment processing.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)} disabled={isProcessingPayment}>
              Cancel
            </Button>
            <Button 
              onClick={handlePayment} 
              variant="contained"
              disabled={isProcessingPayment}
              startIcon={isProcessingPayment ? <CircularProgress size={20} /> : <Payment />}
            >
              {isProcessingPayment ? 'Processing...' : 'Pay Platform Fees'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        {snackbar.open && (
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
          >
            {snackbar.message}
          </Alert>
        )}
      </Box>
    </Layout>
  );
}
