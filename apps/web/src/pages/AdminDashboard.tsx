import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Logout,
  Restaurant,
  ShoppingCart,
  TrendingUp,
  Add,
  Edit,
  Delete,
  Visibility,
  Search,
  Refresh,
  AdminPanelSettings,
  Group,
  Assessment,
  Settings,
  PersonAdd,
  SupervisorAccount,
  ToggleOff,
  Payment
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { formatDate, formatDateTime } from '../utils/dateFormatting';
import { formatCurrencyFromRestaurant, formatCurrency } from '../utils/currency';
import { GET_PLATFORM_ANALYTICS, GET_ALL_ORDERS, GET_AUDIT_LOGS, GET_RESTAURANT_FEE_CONFIG, GET_FEE_LEDGERS, GET_SETTLEMENTS, GET_DUE_FEES_SUMMARY } from '../graphql/queries/admin';
import { SET_RESTAURANT_FEE_CONFIG, GENERATE_WEEKLY_SETTLEMENT, UPDATE_FEE_PAYMENT_STATUS } from '../graphql/mutations/admin';
import { GET_ALL_RESTAURANTS } from '../graphql/queries/restaurant';
import { GET_STAFF_BY_RESTAURANT } from '../graphql/queries/staff';
import { CREATE_SAMPLE_DATA } from '../graphql/mutations/admin';
import { CREATE_STAFF, UPDATE_STAFF, DEACTIVATE_STAFF, ACTIVATE_STAFF } from '../graphql/mutations/staff';
import { CREATE_RESTAURANT, UPDATE_RESTAURANT } from '../graphql/mutations/restaurant';
import { ConfirmationDialog, TabPanel, a11yProps } from '../components/common';
import { useQuery as useGqlQuery, useSubscription } from '@apollo/client';
import { AUDIT_LOG_CREATED_SUBSCRIPTION, RESTAURANT_UPDATED_SUBSCRIPTION, STAFF_UPDATED_SUBSCRIPTION, PLATFORM_ANALYTICS_UPDATED_SUBSCRIPTION } from '../graphql/subscriptions/admin';
import { useFeeSubscriptions } from '../hooks/useFeeSubscriptions';

function AuditLogsPanel() {
  const [action, setAction] = React.useState<string>('');
  const [entityType, setEntityType] = React.useState<string>('');
  const [restaurantIdFilter, setRestaurantIdFilter] = React.useState<string>('');
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);

  const { data, loading, refetch } = useGqlQuery(GET_AUDIT_LOGS, {
    variables: { limit: rowsPerPage, offset: page * rowsPerPage, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined },
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000
  });

  useSubscription(AUDIT_LOG_CREATED_SUBSCRIPTION, {
    onData: ({ data: subData }) => {
      const newLog = subData.data?.auditLogCreated;
      if (!newLog) return;
      // Only refresh when the new log matches filters
      const matches = (
        (!action || newLog.action === action) &&
        (!entityType || newLog.entityType === entityType) &&
        (!restaurantIdFilter || newLog.restaurantId === restaurantIdFilter)
      );
      if (matches) {
        void refetch();
      }
    }
  });

  const logs = data?.auditLogs || [];

  const handleExportCsv = () => {
    const headers = ['createdAt', 'actorRole', 'actorId', 'action', 'entityType', 'entityId', 'reason', 'restaurantId'];
    const rows = logs.map((l: any) => [l.createdAt, l.actorRole || '', l.actorId || '', l.action, l.entityType, l.entityId, (l.reason || '').replace(/\n|\r/g, ' '), l.restaurantId || '']);
    const csv = [headers.join(','), ...rows.map((r: (string | number | boolean)[]) => r.map((f: string | number | boolean) => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6">Audit Logs</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Action</InputLabel>
            <Select label="Action" value={action} onChange={(e) => { setAction(e.target.value); void refetch({ limit: rowsPerPage, offset: 0, action: e.target.value || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="RESTAURANT_UPDATED">RESTAURANT_UPDATED</MenuItem>
              <MenuItem value="STAFF_ACTIVATED">STAFF_ACTIVATED</MenuItem>
              <MenuItem value="STAFF_DEACTIVATED">STAFF_DEACTIVATED</MenuItem>
              <MenuItem value="ORDER_UPDATED">ORDER_UPDATED</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Entity</InputLabel>
            <Select label="Entity" value={entityType} onChange={(e) => { setEntityType(e.target.value); void refetch({ limit: rowsPerPage, offset: 0, action: action || undefined, entityType: e.target.value || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="RESTAURANT">RESTAURANT</MenuItem>
              <MenuItem value="STAFF">STAFF</MenuItem>
              <MenuItem value="ORDER">ORDER</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Restaurant ID" value={restaurantIdFilter} onChange={(e) => setRestaurantIdFilter(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { void refetch({ limit: rowsPerPage, offset: 0, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); } }} />
          <Button variant="outlined" onClick={() => { void refetch({ limit: rowsPerPage, offset: 0, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); setPage(0); }}>Apply</Button>
          <Button variant="outlined" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="outlined" onClick={() => void refetch()}>Refresh</Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}><LinearProgress /></TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5}><Alert severity="info">No logs</Alert></TableCell></TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateTime(log.createdAt).date} {formatDateTime(log.createdAt).time}</TableCell>
                  <TableCell>{log.actorRole || 'SYSTEM'}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entityType} #{String(log.entityId).slice(-6)}</TableCell>
                  <TableCell>{log.reason || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        rowsPerPageOptions={[10, 25, 50]}
        count={-1}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => { setPage(newPage); void refetch({ limit: rowsPerPage, offset: newPage * rowsPerPage, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); }}
        onRowsPerPageChange={(e) => { const newRpp = parseInt(e.target.value, 10); setRowsPerPage(newRpp); setPage(0); void refetch({ limit: newRpp, offset: 0, action: action || undefined, entityType: entityType || undefined, restaurantId: restaurantIdFilter || undefined }); }}
      />
    </Box>
  );
}

function FeesPanel({ selectedRestaurant }: { selectedRestaurant: any }) {
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

function PaymentManagementPanel() {
  const { data: dueFeesData, loading: dueFeesLoading, refetch: refetchDueFees } = useGqlQuery(GET_DUE_FEES_SUMMARY, {
    fetchPolicy: 'cache-and-network'
  });

  const dueFeesSummary = dueFeesData?.dueFeesSummary || [];

  // Set up real-time fee subscriptions for payment management
  useFeeSubscriptions({
    onFeeLedgerUpdated: () => {
      console.log('Fee ledger updated - refetching due fees');
      void refetchDueFees();
    },
    onPaymentStatusUpdated: () => {
      console.log('Payment status updated - refetching due fees');
      void refetchDueFees();
    },
    onDueFeesUpdated: () => {
      console.log('Due fees updated - refetching due fees');
      void refetchDueFees();
    },
    fallbackRefetch: () => {
      console.log('Fallback polling - refetching due fees data');
      void refetchDueFees();
    }
  });

  const totalDueFees = dueFeesSummary.reduce((sum: number, item: any) => sum + item.totalDueFees, 0);
  const totalPendingCount = dueFeesSummary.reduce((sum: number, item: any) => sum + item.pendingCount, 0);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Payment Management Overview
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Payment sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Total Due Fees
                </Typography>
              </Box>
              <Typography variant="h5" color="error.main">
                {formatCurrency(totalDueFees)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across all restaurants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Pending Payments
                </Typography>
              </Box>
              <Typography variant="h5" color="warning.main">
                {totalPendingCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Individual fees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Restaurant sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Restaurants with Due Fees
                </Typography>
              </Box>
              <Typography variant="h5" color="info.main">
                {dueFeesSummary.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active restaurants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Average Due Amount
                </Typography>
              </Box>
              <Typography variant="h5" color="success.main">
                {dueFeesSummary.length > 0 ? formatCurrency(totalDueFees / dueFeesSummary.length) : '0.00'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per restaurant
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Due Fees Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Restaurants with Due Fees
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Restaurant</TableCell>
                  <TableCell align="right">Due Amount</TableCell>
                  <TableCell align="right">Pending Count</TableCell>
                  <TableCell>Last Payment</TableCell>
                  <TableCell>Oldest Due</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dueFeesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : dueFeesSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="success">No restaurants have due fees!</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  dueFeesSummary.map((summary: any) => (
                    <TableRow key={summary.restaurantId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {summary.restaurantName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="error.main">
                          {formatCurrency(summary.totalDueFees, summary.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={summary.pendingCount} 
                          size="small" 
                          color="warning"
                        />
                      </TableCell>
                      <TableCell>
                        {summary.lastPaymentDate ? (
                          <Typography variant="caption">
                            {formatDateTime(summary.lastPaymentDate).date}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No payments yet
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {summary.oldestDueDate ? (
                          <Typography variant="caption" color="error.main">
                            {formatDateTime(summary.oldestDueDate).date}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            // Navigate to fees tab with this restaurant selected
                            // This would require passing a callback to set the selected restaurant
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

function SettlementsPanel({ selectedRestaurant }: { selectedRestaurant: any }) {
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);
  const restaurantId = selectedRestaurant?.id || '';

  const { data, loading, refetch } = useGqlQuery(GET_SETTLEMENTS, {
    variables: { restaurantId, limit: rowsPerPage, offset: page * rowsPerPage },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network'
  });
  const [generate, { loading: generating }] = useMutation(GENERATE_WEEKLY_SETTLEMENT, {
    onCompleted: () => void refetch(),
  });

  const settlements = data?.settlements || [];

  const handleExportCsv = () => {
    const headers = ['periodStart', 'periodEnd', 'currency', 'totalOrders', 'totalOrderAmount', 'totalFees', 'generatedAt'];
    const rows = settlements.map((s: any) => [s.periodStart, s.periodEnd, s.currency, s.totalOrders, s.totalOrderAmount, s.totalFees, s.generatedAt]);
    const csv = [headers.join(','), ...rows.map((r: (string|number)[]) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlements-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const handleGenerateLastWeek = () => {
    if (!restaurantId) return;
    const today = new Date();
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 7);
    void generate({ variables: { restaurantId, periodStart: start.toISOString(), periodEnd: end.toISOString() } });
  };

  if (!restaurantId) {
    return <Alert severity="info">Select a restaurant to view settlements</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Settlements</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => void refetch()}>Refresh</Button>
          <Button variant="outlined" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="contained" onClick={handleGenerateLastWeek} disabled={generating}>Generate Last Week</Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell align="right">Total Orders</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell align="right">Total Fees</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}><LinearProgress /></TableCell></TableRow>
            ) : settlements.length === 0 ? (
              <TableRow><TableCell colSpan={5}><Alert severity="info">No settlements found</Alert></TableCell></TableRow>
            ) : (
              settlements.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{formatDateTime(s.periodStart).date} - {formatDateTime(s.periodEnd).date}</TableCell>
                  <TableCell align="right">{s.totalOrders}</TableCell>
                  <TableCell align="right">{s.currency} {s.totalOrderAmount.toFixed(2)}</TableCell>
                  <TableCell align="right">{s.currency} {s.totalFees.toFixed(2)}</TableCell>
                  <TableCell>{formatDateTime(s.generatedAt).date} {formatDateTime(s.generatedAt).time}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => window.open(`/settlements/${s.id}/pdf`, '_blank')}>PDF</Button>
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
        count={-1}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => { setPage(newPage); void refetch({ restaurantId, limit: rowsPerPage, offset: newPage * rowsPerPage }); }}
        onRowsPerPageChange={(e) => { const newRpp = parseInt(e.target.value, 10); setRowsPerPage(newRpp); setPage(0); void refetch({ restaurantId, limit: newRpp, offset: 0 }); }}
      />
    </Box>
  );
}


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [admin, setAdmin] = useState<any>(null);
  
  // Order management state
  const [orderPage, setOrderPage] = useState(0);
  const [orderRowsPerPage, setOrderRowsPerPage] = useState(10);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  
  // Restaurant management state
  const [restaurantPage, setRestaurantPage] = useState(0);
  const [restaurantRowsPerPage, setRestaurantRowsPerPage] = useState(10);
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState('');
  
  // Staff management state
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [staffDialogMode, setStaffDialogMode] = useState<'create' | 'edit'>('create');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    permissions: [] as string[],
    isActive: true
  });
  const [staffToConfirm, setStaffToConfirm] = useState<any>(null);
  const [staffConfirmOpen, setStaffConfirmOpen] = useState(false);
  const [staffSnackbar, setStaffSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  
  // Restaurant dialog state
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);
  const [restaurantDialogMode, setRestaurantDialogMode] = useState<'create' | 'edit'>('create');
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [restaurantFormData, setRestaurantFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    phone: '',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      theme: 'light'
    }
  });
  const [restaurantSnackbar, setRestaurantSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Confirmation dialog states
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [sampleDataConfirmOpen, setSampleDataConfirmOpen] = useState(false);
  const [restaurantToAction, setRestaurantToAction] = useState<any>(null);
  const [restaurantToggleReason, setRestaurantToggleReason] = useState('');

  // Queries
  const { data: analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useQuery(GET_PLATFORM_ANALYTICS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000
  });
  useSubscription(PLATFORM_ANALYTICS_UPDATED_SUBSCRIPTION, { onData: () => refetchAnalytics() });
  const { data: restaurantsData, loading: restaurantsLoading, refetch: refetchRestaurants } = useQuery(GET_ALL_RESTAURANTS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000
  });
  useSubscription(RESTAURANT_UPDATED_SUBSCRIPTION, { onData: () => refetchRestaurants() });
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ALL_ORDERS, {
    variables: { limit: orderRowsPerPage, offset: orderPage * orderRowsPerPage },
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000
  });
  
  const { data: staffData, loading: staffLoading, refetch: refetchStaff } = useQuery(GET_STAFF_BY_RESTAURANT, {
    variables: { restaurantId: selectedRestaurant?.id },
    skip: !selectedRestaurant,
    fetchPolicy: 'cache-and-network',
    // Only poll when a restaurant is selected
    pollInterval: selectedRestaurant ? 5000 : 0
  });
  useSubscription(STAFF_UPDATED_SUBSCRIPTION, {
    variables: { restaurantId: selectedRestaurant?.id || '' },
    skip: !selectedRestaurant,
    onData: () => {
      // Trigger refetch to reflect updates
      if (selectedRestaurant) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        (async () => { try { await refetchStaff(); } catch {} })();
      }
    }
  });

  // Mutations

  const [createSampleData] = useMutation(CREATE_SAMPLE_DATA, {
    onCompleted: () => {
      refetchRestaurants();
    }
  });

  // Restaurant mutations
  const [createRestaurant, { loading: createRestaurantLoading }] = useMutation(CREATE_RESTAURANT, {
    onCompleted: () => {
      setRestaurantDialogOpen(false);
      setRestaurantSnackbar({
        open: true,
        message: 'Restaurant created successfully!',
        severity: 'success'
      });
      refetchRestaurants();
      refetchAnalytics();
    },
    onError: (error) => {
      setRestaurantSnackbar({
        open: true,
        message: `Error creating restaurant: ${error.message}`,
        severity: 'error'
      });
    }
  });

  // Staff mutations
  const [createStaff, { loading: createStaffLoading }] = useMutation(CREATE_STAFF, {
    onCompleted: () => {
      setStaffDialogOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff created successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error creating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });

  const [updateStaff, { loading: updateStaffLoading }] = useMutation(UPDATE_STAFF, {
    onCompleted: () => {
      setStaffDialogOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff updated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error updating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });

  const [deactivateStaff] = useMutation(DEACTIVATE_STAFF, {
    onCompleted: () => {
      setStaffConfirmOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff deactivated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error updating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });
  const [activateStaff] = useMutation(ACTIVATE_STAFF, {
    onCompleted: () => {
      setStaffConfirmOpen(false);
      setStaffSnackbar({ open: true, message: 'Staff activated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setStaffSnackbar({ open: true, message: `Error activating staff: ${error.message}`, severity: 'error' });
    },
    refetchQueries: selectedRestaurant ? [{ query: GET_STAFF_BY_RESTAURANT, variables: { restaurantId: selectedRestaurant.id } }] : []
  });

  // Simple client-side audit logger (placeholder). Replace with backend call if needed.
  const addAuditLog = (entry: { actorRole: string; action: string; entityType: string; entityId: string; reason?: string; details?: any }) => {
    try {
      const prev = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      const record = { ...entry, timestamp: new Date().toISOString() };
      localStorage.setItem('auditLogs', JSON.stringify([record, ...prev].slice(0, 500)));
    } catch {}
  };

  const [updateRestaurant, { loading: updateRestaurantLoading }] = useMutation(UPDATE_RESTAURANT, {
    onCompleted: () => {
      setRestaurantDialogOpen(false);
      setRestaurantSnackbar({
        open: true,
        message: 'Restaurant updated successfully!',
        severity: 'success'
      });
      refetchRestaurants();
      refetchAnalytics(); // Also refetch analytics to update active restaurant count
    },
    onError: (error) => {
      // Check for conflict errors
      if (error.message.includes('conflict') || error.message.includes('stale')) {
        setRestaurantSnackbar({
          open: true,
          message: 'Data conflict detected. Please refresh and try again.',
          severity: 'error'
        });
      } else {
        setRestaurantSnackbar({
          open: true,
          message: `Error updating restaurant: ${error.message}`,
          severity: 'error'
        });
      }
    }
  });

  // Separate mutation for toggling restaurant status without dialog interference
  const [toggleRestaurantStatus] = useMutation(UPDATE_RESTAURANT, {
    onCompleted: () => {
      // Only refetch data, don't show snackbar or close dialog
      refetchRestaurants();
      refetchAnalytics();
    },
    onError: (error) => {
      console.error('Error toggling restaurant status:', error);
    }
  });

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      navigate('/login');
      return;
    }
    setAdmin(JSON.parse(adminData));
  }, [navigate]);

  // Simple refetch function
  const refetchAllData = async () => {
    try {
      await Promise.all([
        refetchAnalytics(),
        refetchRestaurants(),
        refetchOrders()
      ]);
      setRestaurantSnackbar({
        open: true,
        message: 'All data refreshed successfully!',
        severity: 'success'
      });
    } catch (error) {
      setRestaurantSnackbar({
        open: true,
        message: 'Error refreshing data. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Order management handlers
  const handleOrderPageChange = (_: unknown, newPage: number) => {
    setOrderPage(newPage);
  };

  const handleOrderRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOrderRowsPerPage(parseInt(event.target.value, 10));
    setOrderPage(0);
  };

  // Restaurant management handlers
  const handleRestaurantPageChange = (_: unknown, newPage: number) => {
    setRestaurantPage(newPage);
  };

  const handleRestaurantRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRestaurantRowsPerPage(parseInt(event.target.value, 10));
    setRestaurantPage(0);
  };

  const handleToggleRestaurantStatus = (restaurantId: string) => {
    const restaurant = restaurants.find((r: any) => r.id === restaurantId);
    setRestaurantToAction(restaurant);
    setDeactivateConfirmOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!restaurantToAction) return;
    
    try {
      const newStatus = !restaurantToAction.isActive;
      // Create clean settings object without __typename
      const cleanSettings = restaurantToAction.settings ? {
        currency: restaurantToAction.settings.currency || 'USD',
        timezone: restaurantToAction.settings.timezone || 'UTC',
        theme: restaurantToAction.settings.theme || 'light'
      } : {
        currency: 'USD',
        timezone: 'UTC',
        theme: 'light'
      };

      await toggleRestaurantStatus({ 
        variables: { 
          id: restaurantToAction.id,
          input: {
            name: restaurantToAction.name,
            email: restaurantToAction.email,
            address: restaurantToAction.address || '',
            phone: restaurantToAction.phone || '',
            isActive: newStatus,
            settings: cleanSettings
          }
        } 
      });
      
      addAuditLog({
        actorRole: 'ADMIN',
        action: newStatus ? 'RESTAURANT_ACTIVATED' : 'RESTAURANT_DEACTIVATED',
        entityType: 'RESTAURANT',
        entityId: restaurantToAction.id,
        reason: restaurantToggleReason,
        details: { name: restaurantToAction.name, isActive: newStatus }
      });

      setRestaurantSnackbar({
        open: true,
        message: `${restaurantToAction.name} has been ${newStatus ? 'activated' : 'deactivated'} successfully!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
      setRestaurantSnackbar({
        open: true,
        message: `Error updating ${restaurantToAction.name}: ${error}`,
        severity: 'error'
      });
    } finally {
      setDeactivateConfirmOpen(false);
      setRestaurantToAction(null);
      setRestaurantToggleReason('');
    }
  };

  const handleCancelToggle = () => {
    setDeactivateConfirmOpen(false);
    setRestaurantToAction(null);
    setRestaurantToggleReason('');
  };

  const handleCreateSampleData = (restaurantId: string) => {
    const restaurant = restaurants.find((r: any) => r.id === restaurantId);
    setRestaurantToAction(restaurant);
    setSampleDataConfirmOpen(true);
  };

  const handleConfirmSampleData = async () => {
    if (!restaurantToAction) return;
    
    try {
      await createSampleData({ variables: { restaurantId: restaurantToAction.id } });
      setRestaurantSnackbar({
        open: true,
        message: `Sample data created successfully for ${restaurantToAction.name}!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating sample data:', error);
      setRestaurantSnackbar({
        open: true,
        message: `Error creating sample data for ${restaurantToAction.name}: ${error}`,
        severity: 'error'
      });
    } finally {
      setSampleDataConfirmOpen(false);
      setRestaurantToAction(null);
    }
  };

  const handleCancelSampleData = () => {
    setSampleDataConfirmOpen(false);
    setRestaurantToAction(null);
  };

  const handleViewStaff = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setActiveTab(2); // Switch to Staff tab
  };

  const handleOpenStaffDialog = (mode: 'create' | 'edit', staff?: any) => {
    setStaffDialogMode(mode);
    if (mode === 'edit' && staff) {
      setEditingStaffId(staff.id);
      setStaffFormData({
        name: staff.name || '',
        email: staff.email || '',
        password: '',
        role: staff.role || 'STAFF',
        permissions: staff.permissions || [],
        isActive: !!staff.isActive
      });
    } else {
      setEditingStaffId(null);
      setStaffFormData({ name: '', email: '', password: '', role: 'STAFF', permissions: [], isActive: true });
    }
    setStaffDialogOpen(true);
  };

  const handleCloseStaffDialog = () => {
    setStaffDialogOpen(false);
    setEditingStaffId(null);
  };

  const handleStaffFormChange = (field: string, value: any) => {
    setStaffFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStaffSubmit = () => {
    if (!selectedRestaurant) {
      setStaffSnackbar({ open: true, message: 'Select a restaurant first', severity: 'warning' });
      return;
    }
    if (staffDialogMode === 'create') {
      createStaff({ variables: { input: { ...staffFormData, restaurantId: selectedRestaurant.id } } });
    } else if (editingStaffId) {
      const { password, ...updateData } = staffFormData;
      const input: any = { ...updateData };
      if (password) input.password = password;
      updateStaff({ variables: { id: editingStaffId, input } });
    }
  };

  const handleDeactivateStaff = (staff: any) => {
    setStaffToConfirm(staff);
    setStaffConfirmOpen(true);
  };

  const [staffConfirmReason, setStaffConfirmReason] = useState('');
  const confirmDeactivateStaff = async () => {
    if (!staffToConfirm) return;
    if (staffToConfirm.isActive) {
      await deactivateStaff({ variables: { id: staffToConfirm.id } });
      addAuditLog({
        actorRole: 'ADMIN',
        action: 'STAFF_DEACTIVATED',
        entityType: 'STAFF',
        entityId: staffToConfirm.id,
        reason: staffConfirmReason,
        details: { name: staffToConfirm.name, email: staffToConfirm.email }
      });
    } else {
      await activateStaff({ variables: { id: staffToConfirm.id } });
      addAuditLog({
        actorRole: 'ADMIN',
        action: 'STAFF_ACTIVATED',
        entityType: 'STAFF',
        entityId: staffToConfirm.id,
        reason: staffConfirmReason,
        details: { name: staffToConfirm.name, email: staffToConfirm.email }
      });
    }
    setStaffToConfirm(null);
    setStaffConfirmReason('');
  };

  // Restaurant dialog handlers
  const handleOpenRestaurantDialog = (mode: 'create' | 'edit', restaurant?: any) => {
    setRestaurantDialogMode(mode);
    if (mode === 'edit' && restaurant) {
      setEditingRestaurantId(restaurant.id);
      setRestaurantFormData({
        name: restaurant.name || '',
        email: restaurant.email || '',
        password: '', // Don't populate password for edit
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        isActive: restaurant.isActive !== undefined ? restaurant.isActive : true,
        settings: {
          currency: restaurant.settings?.currency || 'USD',
          timezone: restaurant.settings?.timezone || 'UTC',
          theme: restaurant.settings?.theme || 'light'
        }
      });
    } else {
      setEditingRestaurantId(null);
      setRestaurantFormData({
        name: '',
        email: '',
        password: '',
        address: '',
        phone: '',
        isActive: true,
        settings: {
          currency: 'USD',
          timezone: 'UTC',
          theme: 'light'
        }
      });
    }
    setRestaurantDialogOpen(true);
  };

  const handleCloseRestaurantDialog = () => {
    setRestaurantDialogOpen(false);
    setEditingRestaurantId(null);
    setRestaurantFormData({
      name: '',
      email: '',
      password: '',
      address: '',
      phone: '',
      isActive: true,
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        theme: 'light'
      }
    });
  };

  const handleRestaurantFormChange = (field: string, value: any) => {
    if (field.startsWith('settings.')) {
      const settingField = field.split('.')[1];
      setRestaurantFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingField]: value
        }
      }));
    } else {
      setRestaurantFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleRestaurantSubmit = () => {
    if (restaurantDialogMode === 'create') {
      createRestaurant({
        variables: {
          input: restaurantFormData
        }
      });
    } else if (editingRestaurantId) {
      // For edit mode, only include password if it's provided
      const { password, ...updateData } = restaurantFormData;
      if (password) {
        (updateData as any).password = password;
      }
      updateRestaurant({
        variables: {
          id: editingRestaurantId,
          input: updateData
        }
      });
    }
  };


  if (!admin) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const analytics = analyticsData?.platformAnalytics;
  const restaurants = restaurantsData?.allRestaurants || [];
  const orders = ordersData?.allOrders || [];
  const staff = staffData?.staffByRestaurant || [];

  // Calculate currency-wise revenues
  const getCurrencyWiseRevenue = () => {
    const currencyRevenue: Record<string, { total: number; count: number; symbol: string }> = {};
    
    orders.forEach((order: any) => {
      const restaurant = restaurants.find((r: any) => r.id === order.restaurantId);
      const currency = restaurant?.settings?.currency || 'USD';
      
      if (!currencyRevenue[currency]) {
        currencyRevenue[currency] = { total: 0, count: 0, symbol: '' };
      }
      
      currencyRevenue[currency].total += order.totalAmount;
      currencyRevenue[currency].count += 1;
      currencyRevenue[currency].symbol = getCurrencySymbol(currency);
    });
    
    return currencyRevenue;
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currencyMap: Record<string, string> = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };
    return currencyMap[currencyCode] || '$';
  };

  // Filter data
  const filteredRestaurants = restaurants.filter((restaurant: any) =>
    restaurant.name.toLowerCase().includes(restaurantSearchTerm.toLowerCase()) ||
    restaurant.email.toLowerCase().includes(restaurantSearchTerm.toLowerCase()) ||
    restaurant.slug.toLowerCase().includes(restaurantSearchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = !orderSearchTerm || 
      order.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.toLowerCase().includes(orderSearchTerm.toLowerCase()));
    
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Admin Dashboard
          </Typography>
          
          <Chip
            icon={<AdminPanelSettings />}
            label={admin.role.replace('_', ' ').toUpperCase()}
            color="primary"
            size="small"
            sx={{ mr: 2 }}
          />
          <IconButton onClick={handleMenuClick}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {admin.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Analytics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Restaurant sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Total Restaurants
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? '...' : analytics?.totalRestaurants || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUp sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Active Restaurants
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? '...' : analytics?.activeRestaurants || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ShoppingCart sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      Total Orders
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {analyticsLoading ? '...' : analytics?.totalOrders || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

        </Grid>

        {/* Main Content Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="admin dashboard tabs">
              <Tab icon={<Restaurant />} label="Restaurants" {...a11yProps(0)} />
              <Tab icon={<ShoppingCart />} label="Orders" {...a11yProps(1)} />
              <Tab icon={<Group />} label="Staff" {...a11yProps(2)} />
              <Tab icon={<Assessment />} label="Analytics" {...a11yProps(3)} />
              <Tab icon={<Settings />} label="Settings" {...a11yProps(4)} />
              <Tab icon={<Settings />} label="Fees" {...a11yProps(5)} />
              <Tab icon={<Assessment />} label="Settlements" {...a11yProps(6)} />
              <Tab icon={<Payment />} label="Payments" {...a11yProps(7)} />
              <Tab icon={<Assessment />} label="Audit Logs" {...a11yProps(8)} />
            </Tabs>
          </Box>

          {/* Restaurants Tab */}
          <TabPanel value={activeTab} index={0} sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextField
                placeholder="Search restaurants..."
                value={restaurantSearchTerm}
                onChange={(e) => setRestaurantSearchTerm(e.target.value)}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenRestaurantDialog('create')}
            >
              Add Restaurant
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                    <TableCell>Restaurant</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {restaurantsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                  ) : filteredRestaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="info">No restaurants found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                    filteredRestaurants
                      .slice(restaurantPage * restaurantRowsPerPage, restaurantPage * restaurantRowsPerPage + restaurantRowsPerPage)
                      .map((restaurant: any) => (
                    <TableRow key={restaurant.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                <Restaurant />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {restaurant.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {restaurant.address || 'No address'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                      <TableCell>{restaurant.email}</TableCell>
                          <TableCell>
                            <Chip label={restaurant.slug} size="small" variant="outlined" />
                          </TableCell>
                      <TableCell>
                        <Chip
                          label={restaurant.isActive ? 'Active' : 'Inactive'}
                          color={restaurant.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(restaurant.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Staff">
                          <IconButton size="small" onClick={() => handleViewStaff(restaurant)}>
                            <Group />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Restaurant">
                          <IconButton size="small" onClick={() => handleOpenRestaurantDialog('edit', restaurant)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Create Sample Data">
                          <IconButton 
                            size="small"
                            onClick={() => handleCreateSampleData(restaurant.id)}
                          >
                            <Add />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={restaurant.isActive ? "Deactivate Restaurant" : "Activate Restaurant"}>
                          <IconButton 
                            size="small"
                            onClick={() => handleToggleRestaurantStatus(restaurant.id)}
                            sx={{
                              color: restaurant.isActive ? 'success.main' : 'grey.500',
                              '&:hover': {
                                backgroundColor: restaurant.isActive ? 'success.light' : 'grey.100',
                                color: restaurant.isActive ? 'success.dark' : 'grey.700'
                              }
                            }}
                          >
                            {restaurant.isActive ? (
                              <ToggleOff sx={{ color: 'success.main' }} />
                            ) : (
                              <ToggleOff sx={{ color: 'grey.500', transform: 'rotate(180deg)' }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredRestaurants.length}
              rowsPerPage={restaurantRowsPerPage}
              page={restaurantPage}
              onPageChange={handleRestaurantPageChange}
              onRowsPerPageChange={handleRestaurantRowsPerPageChange}
            />
          </TabPanel>

          {/* Orders Tab */}
          <TabPanel value={activeTab} index={1} sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search orders..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                sx={{ width: 300 }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={orderStatusFilter}
                  label="Status"
                  onChange={(e: SelectChangeEvent) => setOrderStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => refetchOrders()}
              >
                Refresh
              </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Restaurant</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                  ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Alert severity="info">No orders found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                    filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {order.id.slice(-8)}
                          </Typography>
                        </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 1, bgcolor: 'primary.main', width: 24, height: 24 }}>
                            <Restaurant sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Typography variant="body2" fontWeight="bold">
                            {(() => {
                              const restaurant = restaurants.find((r: any) => r.id === order.restaurantId);
                              return restaurant?.name || 'N/A';
                            })()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.orderType}
                          size="small"
                          color="primary"
                            variant="outlined"
                        />
                      </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {order.customerName || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.customerPhone || 'No phone'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {(() => {
                              const restaurant = restaurants.find((r: any) => r.id === order.restaurantId);
                              return formatCurrencyFromRestaurant(order.totalAmount, restaurant);
                            })()}
                          </Typography>
                        </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          size="small"
                          color={
                            order.status === 'completed' ? 'success' :
                            order.status === 'pending' ? 'warning' :
                            order.status === 'cancelled' ? 'error' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const { date, time } = formatDateTime(order.createdAt);
                          return (
                            <>
                              <Typography variant="body2">
                                {date}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {time}
                              </Typography>
                            </>
                          );
                        })()}
                      </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <span>
                              <IconButton size="small">
                                <Visibility />
                              </IconButton>
                            </span>
                          </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
              count={-1}
              rowsPerPage={orderRowsPerPage}
              page={orderPage}
              onPageChange={handleOrderPageChange}
              onRowsPerPageChange={handleOrderRowsPerPageChange}
            />
          </TabPanel>

          {/* Staff Tab */}
          <TabPanel value={activeTab} index={2} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Staff Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a restaurant to view and manage its staff members
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {restaurants.map((restaurant: any) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={restaurant.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 },
                      border: selectedRestaurant?.id === restaurant.id ? 2 : 0,
                      borderColor: 'primary.main'
                    }}
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <Restaurant />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {restaurant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {restaurant.email}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={restaurant.isActive ? 'Active' : 'Inactive'}
                        color={restaurant.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {selectedRestaurant && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Staff for {selectedRestaurant.name}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  sx={{ mb: 2 }}
                  onClick={() => handleOpenStaffDialog('create')}
                >
                  Add Staff Member
                </Button>
                
                {staffLoading ? (
                  <LinearProgress />
                ) : staff.length === 0 ? (
                  <Alert severity="info">No staff members found for this restaurant</Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {staff.map((staffMember: any) => (
                          <TableRow key={staffMember.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                                  <SupervisorAccount />
                                </Avatar>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {staffMember.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{staffMember.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={staffMember.role.replace('_', ' ')}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={staffMember.isActive ? 'Active' : 'Inactive'}
                                color={staffMember.isActive ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {formatDate(staffMember.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Edit Staff">
                                <IconButton size="small" onClick={() => handleOpenStaffDialog('edit', staffMember)}>
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={staffMember.isActive ? 'Deactivate Staff' : 'Activate Staff'}>
                                <IconButton size="small" onClick={() => handleDeactivateStaff(staffMember)}>
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={activeTab} index={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Platform Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Comprehensive insights into platform performance and usage
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Restaurant Performance
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Active Restaurants</Typography>
                      <Typography fontWeight="bold">{analytics?.activeRestaurants || 0}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Total Restaurants</Typography>
                      <Typography fontWeight="bold">{analytics?.totalRestaurants || 0}</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={analytics ? (analytics.activeRestaurants / analytics.totalRestaurants) * 100 : 0}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {analytics ? ((analytics.activeRestaurants / analytics.totalRestaurants) * 100).toFixed(1) : 0}% Active Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Order Statistics
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Total Orders</Typography>
                      <Typography fontWeight="bold">{analytics?.totalOrders || 0}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Revenue by Currency
                      </Typography>
                      {Object.entries(getCurrencyWiseRevenue()).map(([currency, data]) => (
                        <Box key={currency} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            {currency} ({data.count} orders)
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {data.symbol}{data.total.toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                      {Object.keys(getCurrencyWiseRevenue()).length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No revenue data available
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={activeTab} index={4} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure platform-wide settings and preferences
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Platform Configuration
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Default Currency: USD
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Default Timezone: UTC
                      </Typography>
                    </Box>
                    <Button variant="outlined" size="small">
                      Update Settings
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Actions
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<Refresh />}
                        onClick={refetchAllData}
                      >
                        Refresh All Data
                      </Button>
                      <Button variant="outlined" startIcon={<Assessment />}>
                        Generate Reports
                      </Button>
                      <Button variant="outlined" startIcon={<Settings />}>
                        System Maintenance
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Fees Tab */}
          <TabPanel value={activeTab} index={5} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Fee Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a restaurant to configure fees and view fee ledgers
              </Typography>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Restaurant</InputLabel>
                <Select
                  value={selectedRestaurant?.id || ''}
                  label="Select Restaurant"
                  onChange={(e) => {
                    const restaurant = restaurants.find((r: any) => r.id === e.target.value);
                    setSelectedRestaurant(restaurant || null);
                  }}
                >
                  {restaurants.map((restaurant: any) => (
                    <MenuItem key={restaurant.id} value={restaurant.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 24, height: 24 }}>
                          <Restaurant sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {restaurant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {restaurant.email}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <FeesPanel selectedRestaurant={selectedRestaurant} />
          </TabPanel>

          {/* Settlements Tab */}
          <TabPanel value={activeTab} index={6} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Settlement Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a restaurant to view settlements and generate reports
              </Typography>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Restaurant</InputLabel>
                <Select
                  value={selectedRestaurant?.id || ''}
                  label="Select Restaurant"
                  onChange={(e) => {
                    const restaurant = restaurants.find((r: any) => r.id === e.target.value);
                    setSelectedRestaurant(restaurant || null);
                  }}
                >
                  {restaurants.map((restaurant: any) => (
                    <MenuItem key={restaurant.id} value={restaurant.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 24, height: 24 }}>
                          <Restaurant sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {restaurant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {restaurant.email}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <SettlementsPanel selectedRestaurant={selectedRestaurant} />
          </TabPanel>

          {/* Payment Management Tab */}
          <TabPanel value={activeTab} index={7} sx={{ p: 3 }}>
            <PaymentManagementPanel />
          </TabPanel>

          {/* Audit Logs Tab */}
          <TabPanel value={activeTab} index={8} sx={{ p: 3 }}>
            <AuditLogsPanel />
          </TabPanel>
        </Card>
      </Container>

      {/* Restaurant Dialog */}
      <Dialog open={restaurantDialogOpen} onClose={handleCloseRestaurantDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {restaurantDialogMode === 'create' ? 'Add New Restaurant' : 'Edit Restaurant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Restaurant Name"
              value={restaurantFormData.name}
              onChange={(e) => handleRestaurantFormChange('name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={restaurantFormData.email}
              onChange={(e) => handleRestaurantFormChange('email', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={restaurantFormData.password}
              onChange={(e) => handleRestaurantFormChange('password', e.target.value)}
              fullWidth
              required={restaurantDialogMode === 'create'}
              helperText={restaurantDialogMode === 'edit' ? 'Leave blank to keep current password' : 'Required for new restaurants'}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={restaurantFormData.isActive ? 'active' : 'inactive'}
                onChange={(e) => handleRestaurantFormChange('isActive', e.target.value === 'active')}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Address"
              value={restaurantFormData.address}
              onChange={(e) => handleRestaurantFormChange('address', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Phone"
              value={restaurantFormData.phone}
              onChange={(e) => handleRestaurantFormChange('phone', e.target.value)}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={restaurantFormData.settings.currency}
                  onChange={(e) => handleRestaurantFormChange('settings.currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="INR">INR</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={restaurantFormData.settings.timezone}
                  onChange={(e) => handleRestaurantFormChange('settings.timezone', e.target.value)}
                  label="Timezone"
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">America/New_York</MenuItem>
                  <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                  <MenuItem value="Europe/London">Europe/London</MenuItem>
                  <MenuItem value="Asia/Kolkata">Asia/Kolkata</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={restaurantFormData.settings.theme}
                onChange={(e) => handleRestaurantFormChange('settings.theme', e.target.value)}
                label="Theme"
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRestaurantDialog}>Cancel</Button>
          <Button 
            onClick={handleRestaurantSubmit} 
            variant="contained"
            disabled={createRestaurantLoading || updateRestaurantLoading}
          >
            {createRestaurantLoading || updateRestaurantLoading ? (
              <CircularProgress size={20} />
            ) : (
              restaurantDialogMode === 'create' ? 'Create' : 'Update'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onClose={handleCloseStaffDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{staffDialogMode === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={staffFormData.name}
              onChange={(e) => handleStaffFormChange('name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={staffFormData.email}
              onChange={(e) => handleStaffFormChange('email', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={staffFormData.password}
              onChange={(e) => handleStaffFormChange('password', e.target.value)}
              fullWidth
              required={staffDialogMode === 'create'}
              helperText={staffDialogMode === 'edit' ? 'Leave blank to keep current password' : 'Required for new staff'}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={staffFormData.role}
                label="Role"
                onChange={(e) => handleStaffFormChange('role', e.target.value)}
              >
                <MenuItem value="STAFF">Staff</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStaffDialog}>Cancel</Button>
          <Button 
            onClick={handleStaffSubmit} 
            variant="contained"
            disabled={createStaffLoading || updateStaffLoading}
          >
            {createStaffLoading || updateStaffLoading ? <CircularProgress size={20} /> : (staffDialogMode === 'create' ? 'Create' : 'Update')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Activate/Deactivate Confirmation */}
      <ConfirmationDialog
        open={staffConfirmOpen}
        onClose={() => setStaffConfirmOpen(false)}
        onConfirm={confirmDeactivateStaff}
        title={staffToConfirm?.isActive ? 'Deactivate Staff' : 'Activate Staff'}
        message={
          <Box>
            <Typography variant="body1">
              Are you sure you want to {staffToConfirm?.isActive ? 'deactivate' : 'activate'} <strong>{staffToConfirm?.name}</strong>?
            </Typography>
            <TextField
              fullWidth
              label="Reason (optional)"
              value={staffConfirmReason}
              onChange={(e) => setStaffConfirmReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        }
        confirmText={staffToConfirm?.isActive ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        confirmColor={staffToConfirm?.isActive ? 'error' : 'success'}
      />

      {/* Staff Snackbar */}
      {staffSnackbar.open && (
        <Alert
          severity={staffSnackbar.severity}
          onClose={() => setStaffSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ position: 'fixed', bottom: 80, right: 20, zIndex: 9999 }}
        >
          {staffSnackbar.message}
        </Alert>
      )}

      {/* Snackbar for notifications */}
      {restaurantSnackbar.open && (
        <Alert
          severity={restaurantSnackbar.severity}
          onClose={() => setRestaurantSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
        >
          {restaurantSnackbar.message}
        </Alert>
      )}

      {/* Toggle Restaurant Status Confirmation Dialog */}
      <ConfirmationDialog
        open={deactivateConfirmOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={restaurantToAction?.isActive ? "Deactivate Restaurant" : "Activate Restaurant"}
        message={
          <Box>
            <Typography variant="body1">
              Are you sure you want to {restaurantToAction?.isActive ? 'deactivate' : 'activate'} <strong>{restaurantToAction?.name}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {restaurantToAction?.isActive 
                ? "This will prevent the restaurant from logging in and accessing their dashboard."
                : "This will allow the restaurant to log in and access their dashboard."
              }
            </Typography>
            <TextField
              fullWidth
              label="Reason (optional)"
              value={restaurantToggleReason}
              onChange={(e) => setRestaurantToggleReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        }
        confirmText={restaurantToAction?.isActive ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        confirmColor={restaurantToAction?.isActive ? "error" : "success"}
      />

      {/* Create Sample Data Confirmation Dialog */}
      <ConfirmationDialog
        open={sampleDataConfirmOpen}
        onClose={handleCancelSampleData}
        onConfirm={handleConfirmSampleData}
        title="Create Sample Data"
        message={
          <Box>
            <Typography variant="body1">
              Are you sure you want to create sample data for <strong>{restaurantToAction?.name}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This will add sample menu items, tables, and other data to help the restaurant get started.
            </Typography>
          </Box>
        }
        confirmText="Create Sample Data"
        cancelText="Cancel"
        confirmColor="primary"
      />
    </Box>
  );
}