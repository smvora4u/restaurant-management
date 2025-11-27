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
  Box,
  Typography
} from '@mui/material';

interface SalaryPaymentFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  salaryConfig?: any;
  unsettledAdvance?: number;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function SalaryPaymentForm({
  open,
  mode,
  initialData,
  salaryConfig,
  unsettledAdvance = 0,
  loading = false,
  onClose,
  onSubmit
}: SalaryPaymentFormProps) {
  const [formData, setFormData] = useState({
    paymentPeriodStart: '',
    paymentPeriodEnd: '',
    baseAmount: '',
    hoursWorked: '',
    hourlyRate: '',
    bonusAmount: '',
    deductionAmount: '',
    advanceDeduction: '',
    totalAmount: '',
    paymentStatus: 'pending',
    paymentMethod: '',
    paymentTransactionId: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        paymentPeriodStart: initialData.paymentPeriodStart ? new Date(initialData.paymentPeriodStart).toISOString().split('T')[0] : '',
        paymentPeriodEnd: initialData.paymentPeriodEnd ? new Date(initialData.paymentPeriodEnd).toISOString().split('T')[0] : '',
        baseAmount: initialData.baseAmount?.toString() || '',
        hoursWorked: initialData.hoursWorked?.toString() || '',
        hourlyRate: initialData.hourlyRate?.toString() || '',
        bonusAmount: initialData.bonusAmount?.toString() || '',
        deductionAmount: initialData.deductionAmount?.toString() || '',
        advanceDeduction: initialData.advanceDeduction?.toString() || '',
        totalAmount: initialData.totalAmount?.toString() || '',
        paymentStatus: initialData.paymentStatus || 'pending',
        paymentMethod: initialData.paymentMethod || '',
        paymentTransactionId: initialData.paymentTransactionId || '',
        notes: initialData.notes || ''
      });
    } else {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setFormData({
        paymentPeriodStart: firstDay.toISOString().split('T')[0],
        paymentPeriodEnd: lastDay.toISOString().split('T')[0],
        baseAmount: '',
        hoursWorked: '',
        hourlyRate: salaryConfig?.hourlyRate?.toString() || '',
        bonusAmount: '',
        deductionAmount: '',
        advanceDeduction: unsettledAdvance > 0 ? unsettledAdvance.toFixed(2) : '',
        totalAmount: '',
        paymentStatus: 'pending',
        paymentMethod: '',
        paymentTransactionId: '',
        notes: ''
      });
    }
    setErrors({});
  }, [initialData, mode, open, salaryConfig]);

  // Calculate total amount when relevant fields change
  useEffect(() => {
    const base = parseFloat(formData.baseAmount) || 0;
    const hours = parseFloat(formData.hoursWorked) || 0;
    const rate = parseFloat(formData.hourlyRate) || 0;
    const bonus = parseFloat(formData.bonusAmount) || 0;
    const deduction = parseFloat(formData.deductionAmount) || 0;
    const advanceDeduction = parseFloat(formData.advanceDeduction) || 0;

    let total = base;
    
    // Add hourly calculation if applicable
    if (hours > 0 && rate > 0) {
      total += hours * rate;
    }
    
    total += bonus - deduction - advanceDeduction;

    setFormData(prev => ({ ...prev, totalAmount: Math.max(0, total).toFixed(2) }));
  }, [formData.baseAmount, formData.hoursWorked, formData.hourlyRate, formData.bonusAmount, formData.deductionAmount, formData.advanceDeduction]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.paymentPeriodStart) {
      newErrors.paymentPeriodStart = 'Payment period start is required';
    }

    if (!formData.paymentPeriodEnd) {
      newErrors.paymentPeriodEnd = 'Payment period end is required';
    }

    if (formData.paymentPeriodStart && formData.paymentPeriodEnd) {
      const start = new Date(formData.paymentPeriodStart);
      const end = new Date(formData.paymentPeriodEnd);
      if (end < start) {
        newErrors.paymentPeriodEnd = 'End date must be after start date';
      }
    }

    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0';
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
      paymentPeriodStart: formData.paymentPeriodStart,
      paymentPeriodEnd: formData.paymentPeriodEnd,
      baseAmount: parseFloat(formData.baseAmount) || 0,
      totalAmount: parseFloat(formData.totalAmount),
      paymentStatus: formData.paymentStatus,
      notes: formData.notes || undefined
    };

    if (formData.hoursWorked) {
      submitData.hoursWorked = parseFloat(formData.hoursWorked);
    }

    if (formData.hourlyRate) {
      submitData.hourlyRate = parseFloat(formData.hourlyRate);
    }

    if (formData.bonusAmount) {
      submitData.bonusAmount = parseFloat(formData.bonusAmount);
    }

    if (formData.deductionAmount) {
      submitData.deductionAmount = parseFloat(formData.deductionAmount);
    }

    if (formData.advanceDeduction) {
      submitData.advanceDeduction = parseFloat(formData.advanceDeduction);
    }

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

  const currency = salaryConfig?.currency || 'USD';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Create Salary Payment' : 'Update Salary Payment'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Period Start"
                type="date"
                value={formData.paymentPeriodStart}
                onChange={(e) => handleChange('paymentPeriodStart', e.target.value)}
                error={!!errors.paymentPeriodStart}
                helperText={errors.paymentPeriodStart}
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Period End"
                type="date"
                value={formData.paymentPeriodEnd}
                onChange={(e) => handleChange('paymentPeriodEnd', e.target.value)}
                error={!!errors.paymentPeriodEnd}
                helperText={errors.paymentPeriodEnd}
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Base Amount"
                type="number"
                value={formData.baseAmount}
                onChange={(e) => handleChange('baseAmount', e.target.value)}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>{currency}</span>
                }}
              />
            </Grid>

            {(salaryConfig?.salaryType === 'hourly' || salaryConfig?.salaryType === 'mixed') && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hours Worked"
                    type="number"
                    value={formData.hoursWorked}
                    onChange={(e) => handleChange('hoursWorked', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hourly Rate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => handleChange('hourlyRate', e.target.value)}
                    InputProps={{
                      startAdornment: <span style={{ marginRight: 8 }}>{currency}</span>
                    }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bonus Amount"
                type="number"
                value={formData.bonusAmount}
                onChange={(e) => handleChange('bonusAmount', e.target.value)}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>{currency}</span>
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Deduction Amount"
                type="number"
                value={formData.deductionAmount}
                onChange={(e) => handleChange('deductionAmount', e.target.value)}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>{currency}</span>
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Advance Deduction"
                type="number"
                value={formData.advanceDeduction}
                onChange={(e) => handleChange('advanceDeduction', e.target.value)}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>{currency}</span>
                }}
                helperText={unsettledAdvance > 0 ? `Unsettled advances: ${currency} ${unsettledAdvance.toFixed(2)}` : "Amount deducted for advance payments"}
                color={unsettledAdvance > 0 ? "warning" : undefined}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Amount"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => handleChange('totalAmount', e.target.value)}
                error={!!errors.totalAmount}
                helperText={errors.totalAmount}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>{currency}</span>
                }}
                disabled={true}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Calculated automatically
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
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
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Payment' : 'Update Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

