import { useState, useEffect } from 'react';
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
  IconButton,
  Paper,
  InputAdornment
} from '@mui/material';
import { Close as CloseIcon, AttachMoney, Payment, Note } from '@mui/icons-material';
import { getCurrencySymbolFromCode, getRestaurantCurrency } from '../../utils/currency';
import { timestampToInputDate, toTimestamp } from '../../utils/dateFormatting';

interface AdvancePaymentFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  currency?: string;
  restaurant?: any;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function AdvancePaymentForm({
  open,
  mode,
  initialData,
  currency = 'USD',
  restaurant,
  loading = false,
  onClose,
  onSubmit
}: AdvancePaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: '',
    advanceDate: timestampToInputDate(Date.now()),
    paymentStatus: 'paid',
    paymentMethod: '',
    paymentTransactionId: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        amount: initialData.amount?.toString() || '',
        advanceDate: timestampToInputDate(initialData.advanceDate),
        paymentStatus: initialData.paymentStatus || 'paid',
        paymentMethod: initialData.paymentMethod || '',
        paymentTransactionId: initialData.paymentTransactionId || '',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        amount: '',
        advanceDate: timestampToInputDate(Date.now()),
        paymentStatus: 'paid',
        paymentMethod: '',
        paymentTransactionId: '',
        notes: ''
      });
    }
    setErrors({});
  }, [initialData, mode, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.advanceDate) {
      newErrors.advanceDate = 'Advance date is required';
    }

    if (formData.paymentStatus === 'paid' && !formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required when status is paid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const advanceDateTimestamp = toTimestamp(formData.advanceDate);
    if (advanceDateTimestamp === null) {
      setErrors(prev => ({ ...prev, advanceDate: 'Advance date is invalid' }));
      return;
    }
    const submitData: any = {
      amount: parseFloat(formData.amount),
      advanceDate: String(advanceDateTimestamp),
      paymentStatus: formData.paymentStatus,
      notes: formData.notes || undefined
    };

    if (formData.paymentMethod) {
      submitData.paymentMethod = formData.paymentMethod;
    }

    if (formData.paymentTransactionId) {
      submitData.paymentTransactionId = formData.paymentTransactionId;
    }

    onSubmit(submitData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {mode === 'create' ? 'Create Advance Payment' : 'Update Advance Payment'}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Amount Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AttachMoney color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                ADVANCE AMOUNT
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Advance Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                error={!!errors.amount}
                helperText={errors.amount || "Enter the advance amount to be paid to the staff"}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{
                    restaurant 
                      ? getRestaurantCurrency(restaurant).symbol 
                      : getCurrencySymbolFromCode(currency)
                  }</InputAdornment>
                }}
                required
                size="small"
              />
              <TextField
                fullWidth
                label="Advance Date"
                type="date"
                value={formData.advanceDate}
                onChange={(e) => handleChange('advanceDate', e.target.value)}
                error={!!errors.advanceDate}
                helperText={errors.advanceDate || "Select the actual date when the advance is given"}
                InputLabelProps={{
                  shrink: true
                }}
                required
                size="small"
              />
            </Box>
          </Paper>

          {/* Payment Status Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Payment color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                PAYMENT STATUS
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: formData.paymentStatus === 'paid' ? 'repeat(2, 1fr)' : '1fr',
                  md: formData.paymentStatus === 'paid' ? 'repeat(2, 1fr)' : '1fr'
                }, 
                gap: 2 
              }}>
                <Box>
                  <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={formData.paymentStatus}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        handleChange('paymentStatus', newStatus);
                        // Clear payment method if status changes away from paid
                        if (newStatus !== 'paid') {
                          handleChange('paymentMethod', '');
                          handleChange('paymentTransactionId', '');
                        }
                      }}
                      label="Payment Status"
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {formData.paymentStatus === 'paid' ? (
                  <Box>
                    <FormControl fullWidth error={!!errors.paymentMethod} size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={formData.paymentMethod}
                        onChange={(e) => handleChange('paymentMethod', e.target.value)}
                        label="Payment Method"
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="card">Card</MenuItem>
                        <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                      {errors.paymentMethod && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          {errors.paymentMethod}
                        </Typography>
                      )}
                    </FormControl>
                  </Box>
                ) : null}
              </Box>

              {formData.paymentStatus === 'paid' ? (
                <Box>
                  <TextField
                    fullWidth
                    label="Transaction ID (Optional)"
                    value={formData.paymentTransactionId}
                    onChange={(e) => handleChange('paymentTransactionId', e.target.value)}
                    size="small"
                    helperText="Enter the transaction ID if available"
                  />
                </Box>
              ) : null}
            </Box>
          </Paper>

          {/* Notes Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Note color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                ADDITIONAL NOTES
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Reason for advance payment..."
              size="small"
            />
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          size="large"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          size="large"
          sx={{ minWidth: 150 }}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Advance' : 'Update Advance'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

