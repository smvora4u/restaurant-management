import React, { useState, useEffect } from 'react';
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
  Grid,
  Alert,
  Box
} from '@mui/material';

interface AdvancePaymentFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  currency?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function AdvancePaymentForm({
  open,
  mode,
  initialData,
  currency = 'USD',
  loading = false,
  onClose,
  onSubmit
}: AdvancePaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: '',
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
        paymentStatus: initialData.paymentStatus || 'paid',
        paymentMethod: initialData.paymentMethod || '',
        paymentTransactionId: initialData.paymentTransactionId || '',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        amount: '',
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

    const submitData: any = {
      amount: parseFloat(formData.amount),
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Create Advance Payment' : 'Update Advance Payment'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Advance Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                error={!!errors.amount}
                helperText={errors.amount}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>{currency}</span>
                }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={formData.paymentStatus}
                  onChange={(e) => handleChange('paymentStatus', e.target.value)}
                  label="Payment Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.paymentStatus === 'paid' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.paymentMethod}>
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
                    {errors.paymentMethod && <Alert severity="error" sx={{ mt: 1 }}>{errors.paymentMethod}</Alert>}
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Transaction ID (Optional)"
                    value={formData.paymentTransactionId}
                    onChange={(e) => handleChange('paymentTransactionId', e.target.value)}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Reason for advance payment..."
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Advance' : 'Update Advance'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

