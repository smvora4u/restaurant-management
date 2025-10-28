import React from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useQuery as useGqlQuery, useMutation } from '@apollo/client';
import { GET_RESTAURANT_FEE_CONFIG, GET_FEE_LEDGERS } from '../../../../graphql/queries/admin';
import { SET_RESTAURANT_FEE_CONFIG, UPDATE_FEE_PAYMENT_STATUS } from '../../../../graphql/mutations/admin';
import { formatDateTime } from '../../../../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../../../../utils/currency';
import { useFeeSubscriptions } from '../../../../hooks/useFeeSubscriptions';

export default function FeesPanel({ selectedRestaurant }: { selectedRestaurant: any }) {
  const [mode, setMode] = React.useState<'fixed' | 'percentage'>('percentage');
  const [amount, setAmount] = React.useState<number>(10);
  const [freeOrders, setFreeOrders] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const restaurantId = selectedRestaurant?.id || '';
  const { data: cfgData, refetch: refetchCfg } = useGqlQuery(GET_RESTAURANT_FEE_CONFIG, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network'
  });
  const { data: ledgerData, loading: ledgerLoading, refetch: refetchLedger } = useGqlQuery(GET_FEE_LEDGERS, {
    variables: { restaurantId, limit: rowsPerPage, offset: page * rowsPerPage },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network'
  });
  const [setFeeConfig, { loading: saving }] = useMutation(SET_RESTAURANT_FEE_CONFIG, {
    onCompleted: () => { 
      void refetchCfg();
      setSnackbar({
        open: true,
        message: 'Fee configuration saved successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error saving fee configuration: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [updatePaymentStatus] = useMutation(UPDATE_FEE_PAYMENT_STATUS, {
    onCompleted: () => {
      void refetchLedger();
      setSnackbar({
        open: true,
        message: 'Payment status updated successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error updating payment status: ${error.message}`,
        severity: 'error'
      });
    }
  });

  // Set up real-time fee subscriptions
  useFeeSubscriptions({
    restaurantId: selectedRestaurant?.id,
    onFeeLedgerUpdated: () => {
      console.log('Fee ledger updated - refetching data');
      void refetchLedger();
    },
    onPaymentStatusUpdated: () => {
      console.log('Payment status updated - refetching data');
      void refetchLedger();
    },
    onDueFeesUpdated: () => {
      console.log('Due fees updated - refetching data');
      void refetchLedger();
    },
    fallbackRefetch: () => {
      console.log('Fallback polling - refetching fee ledger data');
      void refetchLedger();
    }
  });

  React.useEffect(() => {
    const cfg = cfgData?.restaurantFeeConfig;
    if (cfg) {
      setMode(cfg.mode);
      setAmount(cfg.amount);
      setFreeOrders(cfg.freeOrdersRemaining);
    }
  }, [cfgData?.restaurantFeeConfig]);

  const handleSaveFeeConfig = () => {
    // Validation
    if (!selectedRestaurant) {
      setSnackbar({
        open: true,
        message: 'Please select a restaurant first',
        severity: 'warning'
      });
      return;
    }

    if (amount < 0) {
      setSnackbar({
        open: true,
        message: 'Amount cannot be negative',
        severity: 'warning'
      });
      return;
    }

    if (freeOrders < 0) {
      setSnackbar({
        open: true,
        message: 'Free orders cannot be negative',
        severity: 'warning'
      });
      return;
    }

    // Proceed with save
    setFeeConfig({ 
      variables: { 
        restaurantId, 
        mode, 
        amount, 
        freeOrdersRemaining: freeOrders 
      } 
    });
  };

  const [paymentStatusDialogOpen, setPaymentStatusDialogOpen] = React.useState(false);
  const [selectedFeeLedgerId, setSelectedFeeLedgerId] = React.useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = React.useState<string>('paid');
  const [paymentMethod, setPaymentMethod] = React.useState<string>('manual');
  const [paymentTransactionId, setPaymentTransactionId] = React.useState<string>('');
  const [paymentReason, setPaymentReason] = React.useState<string>('');

  const handleMarkAsPaid = (feeLedgerId: string) => {
    setSelectedFeeLedgerId(feeLedgerId);
    setSelectedPaymentStatus('paid');
    setPaymentMethod('manual');
    setPaymentTransactionId(`MANUAL_${Date.now()}`);
    setPaymentReason('');
    setPaymentStatusDialogOpen(true);
  };

  const handleUpdatePaymentStatus = () => {
    if (!paymentReason.trim()) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for the payment status change',
        severity: 'warning'
      });
      return;
    }

    void updatePaymentStatus({
      variables: {
        feeLedgerId: selectedFeeLedgerId,
        paymentStatus: selectedPaymentStatus,
        paymentMethod,
        paymentTransactionId,
        reason: paymentReason
      }
    });
    setPaymentStatusDialogOpen(false);
  };

  const ledgers = ledgerData?.feeLedgers?.data || [];
  const totalCount = ledgerData?.feeLedgers?.totalCount || 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Fee Configuration</Typography>
      {!restaurantId ? (
        <Alert severity="info">Select a restaurant to configure fees</Alert>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Mode</InputLabel>
            <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <MenuItem value="fixed">Fixed</MenuItem>
              <MenuItem value="percentage">Percentage</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label={mode === 'fixed' ? 'Amount' : 'Percentage'} type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value || '0'))} />
          <TextField size="small" label="Free Orders" type="number" value={freeOrders} onChange={(e) => setFreeOrders(parseInt(e.target.value || '0', 10))} />
          <Button 
            variant="contained" 
            disabled={saving} 
            onClick={handleSaveFeeConfig}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      )}

      <Typography variant="h6" gutterBottom>Fee Ledgers</Typography>
      {!restaurantId ? (
        <Alert severity="info">Select a restaurant to view ledgers</Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell align="right">Order Total</TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Rate</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerLoading ? (
                  <TableRow><TableCell colSpan={11}><LinearProgress /></TableCell></TableRow>
                ) : ledgers.length === 0 ? (
                  <TableRow><TableCell colSpan={11}><Alert severity="info">No ledger entries</Alert></TableCell></TableRow>
                ) : (
                  ledgers.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDateTime(l.createdAt).date} {formatDateTime(l.createdAt).time}</TableCell>
                      <TableCell>#{String(l.orderId).slice(-6)}</TableCell>
                      <TableCell align="right">{formatCurrencyFromRestaurant(l.orderTotal, selectedRestaurant)}</TableCell>
                      <TableCell>{formatCurrencyFromRestaurant(l.feeAmount, selectedRestaurant)}</TableCell>
                      <TableCell>{l.feeMode}</TableCell>
                      <TableCell>{l.feeMode === 'fixed' ? l.feeRate.toFixed(2) : `${l.feeRate}%`}</TableCell>
                      <TableCell>{l.discountApplied ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={l.paymentStatus} 
                          size="small" 
                          color={
                            l.paymentStatus === 'paid' ? 'success' : 
                            l.paymentStatus === 'pending' ? 'warning' : 
                            l.paymentStatus === 'failed' ? 'error' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{l.paymentMethod || '-'}</TableCell>
                      <TableCell>
                        {l.paymentTransactionId ? (
                          <Typography variant="caption" fontFamily="monospace">
                            {l.paymentTransactionId.slice(-8)}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {l.paymentStatus === 'pending' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleMarkAsPaid(l.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
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
            onPageChange={(_, newPage) => { setPage(newPage); void refetchLedger({ restaurantId, limit: rowsPerPage, offset: newPage * rowsPerPage }); }}
            onRowsPerPageChange={(e) => { const newRpp = parseInt(e.target.value, 10); setRowsPerPage(newRpp); setPage(0); void refetchLedger({ restaurantId, limit: newRpp, offset: 0 }); }}
          />
        </>
      )}

      {/* Payment Status Update Dialog */}
      <Dialog open={paymentStatusDialogOpen} onClose={() => setPaymentStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Payment Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                label="Payment Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                label="Payment Method"
              >
                <MenuItem value="manual">Manual (Admin)</MenuItem>
                <MenuItem value="card">Credit/Debit Card</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              margin="normal"
              label="Transaction ID"
              value={paymentTransactionId}
              onChange={(e) => setPaymentTransactionId(e.target.value)}
              placeholder="Enter transaction ID or reference"
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Reason for Change"
              value={paymentReason}
              onChange={(e) => setPaymentReason(e.target.value)}
              placeholder="Explain why you're changing the payment status"
              multiline
              rows={3}
              required
            />
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action will be logged in the audit trail. Please ensure you have proper authorization and documentation for this change.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdatePaymentStatus} variant="contained" color="primary">
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
  );
}
