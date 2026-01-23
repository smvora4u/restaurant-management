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
  Typography,
  IconButton,
  Divider,
  Paper,
  InputAdornment
} from '@mui/material';
import { Close as CloseIcon, CalendarToday, AttachMoney, Calculate, Payment, Note } from '@mui/icons-material';
import { getCurrencySymbolFromCode, getRestaurantCurrency } from '../../utils/currency';
import { isoToLocalDateString } from '../../utils/dateFormatting';

interface SalaryPaymentFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  salaryConfig?: any;
  unsettledAdvance?: number;
  restaurant?: any;
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
  restaurant,
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
        paymentPeriodStart: initialData.paymentPeriodStart ? isoToLocalDateString(initialData.paymentPeriodStart) : '',
        paymentPeriodEnd: initialData.paymentPeriodEnd ? isoToLocalDateString(initialData.paymentPeriodEnd) : '',
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
      
      // Auto-fill base amount from salary config if available
      const baseAmount = salaryConfig?.baseSalary ? salaryConfig.baseSalary.toString() : '';
      
      setFormData({
        paymentPeriodStart: firstDay.toISOString().split('T')[0],
        paymentPeriodEnd: lastDay.toISOString().split('T')[0],
        baseAmount: baseAmount,
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
    let advanceDeduction = parseFloat(formData.advanceDeduction) || 0;

    // Calculate available salary (before advance deduction)
    let availableSalary = base;
    if (hours > 0 && rate > 0) {
      availableSalary += hours * rate;
    }
    availableSalary += bonus - deduction;

    // Cap advance deduction to available salary (standard salary management practice)
    // Employee cannot receive negative payment - only deduct what's available
    const maxAdvanceDeduction = Math.max(0, availableSalary);
    if (advanceDeduction > maxAdvanceDeduction) {
      advanceDeduction = maxAdvanceDeduction;
      // Auto-adjust the advance deduction field if it exceeds available salary
      setFormData(prev => ({ ...prev, advanceDeduction: maxAdvanceDeduction.toFixed(2) }));
    }

    const total = availableSalary - advanceDeduction;

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

    // Calculate available salary to check if 0 total is valid
    const base = parseFloat(formData.baseAmount) || 0;
    const hours = parseFloat(formData.hoursWorked) || 0;
    const rate = parseFloat(formData.hourlyRate) || 0;
    const bonus = parseFloat(formData.bonusAmount) || 0;
    const deduction = parseFloat(formData.deductionAmount) || 0;
    const advanceDeduction = parseFloat(formData.advanceDeduction) || 0;
    const availableSalary = base + (hours * rate) + bonus - deduction;
    const totalAmount = parseFloat(formData.totalAmount) || 0;
    
    // Allow 0 total amount if advance deduction equals available salary (valid scenario)
    // This happens when all salary is used to settle advances - this is a standard practice
    const isZeroTotalValid = totalAmount === 0 && advanceDeduction > 0 && Math.abs(advanceDeduction - availableSalary) < 0.01;
    
    if (!formData.totalAmount) {
      newErrors.totalAmount = 'Total amount is required';
    } else if (totalAmount < 0) {
      newErrors.totalAmount = 'Total amount cannot be negative';
    } else if (totalAmount === 0 && !isZeroTotalValid) {
      // Only show error if total is 0 but it's not a valid scenario (advance deduction should equal available salary)
      newErrors.totalAmount = 'Total amount must be greater than 0, or advance deduction should equal available salary';
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

  // Get currency symbol - prioritize restaurant currency over salary config
  // Priority: restaurant currency > salary config currency > default USD
  const currencyCode = restaurant?.settings?.currency || salaryConfig?.currency || 'USD';
  const currencySymbol = restaurant?.settings?.currency
    ? getCurrencySymbolFromCode(restaurant.settings.currency)
    : salaryConfig?.currency
      ? getCurrencySymbolFromCode(salaryConfig.currency)
      : getCurrencySymbolFromCode('USD');

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
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
          {mode === 'create' ? 'Create Salary Payment' : 'Update Salary Payment'}
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
          {/* Payment Period Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarToday color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                PAYMENT PERIOD
              </Typography>
            </Box>
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
                  size="small"
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
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Amount Details Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AttachMoney color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                AMOUNT DETAILS
              </Typography>
            </Box>
            {(() => {
              const base = parseFloat(formData.baseAmount) || 0;
              const hours = parseFloat(formData.hoursWorked) || 0;
              const rate = parseFloat(formData.hourlyRate) || 0;
              const bonus = parseFloat(formData.bonusAmount) || 0;
              const deduction = parseFloat(formData.deductionAmount) || 0;
              const availableSalary = base + (hours * rate) + bonus - deduction;
              const advanceDeduction = parseFloat(formData.advanceDeduction) || 0;
              const exceedsAvailable = advanceDeduction > availableSalary;
              
              return exceedsAvailable && unsettledAdvance > availableSalary ? (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>Advance deduction exceeds available salary.</strong> Only {currencySymbol} {availableSalary.toFixed(2)} can be deducted from this payment. 
                    The remaining {currencySymbol} {(advanceDeduction - availableSalary).toFixed(2)} will remain unsettled and can be deducted from future payments.
                  </Typography>
                </Alert>
              ) : null;
            })()}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Base Amount"
                  type="number"
                  value={formData.baseAmount}
                  onChange={(e) => handleChange('baseAmount', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>
                  }}
                  size="small"
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
                      size="small"
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
                        startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>
                      }}
                      size="small"
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
                    startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>
                  }}
                  size="small"
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
                    startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>
                  }}
                  size="small"
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
                    startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>
                  }}
                  helperText={(() => {
                    const base = parseFloat(formData.baseAmount) || 0;
                    const hours = parseFloat(formData.hoursWorked) || 0;
                    const rate = parseFloat(formData.hourlyRate) || 0;
                    const bonus = parseFloat(formData.bonusAmount) || 0;
                    const deduction = parseFloat(formData.deductionAmount) || 0;
                    const availableSalary = base + (hours * rate) + bonus - deduction;
                    const advanceDeduction = parseFloat(formData.advanceDeduction) || 0;
                    
                    if (unsettledAdvance > 0 && advanceDeduction > availableSalary) {
                      return `Warning: Only ${currencySymbol} ${availableSalary.toFixed(2)} can be deducted. Remaining ${currencySymbol} ${(advanceDeduction - availableSalary).toFixed(2)} will be carried forward.`;
                    }
                    if (unsettledAdvance > 0) {
                      return `Unsettled advances: ${currencySymbol} ${unsettledAdvance.toFixed(2)}`;
                    }
                    return "Amount deducted for advance payments";
                  })()}
                  color={(() => {
                    const base = parseFloat(formData.baseAmount) || 0;
                    const hours = parseFloat(formData.hoursWorked) || 0;
                    const rate = parseFloat(formData.hourlyRate) || 0;
                    const bonus = parseFloat(formData.bonusAmount) || 0;
                    const deduction = parseFloat(formData.deductionAmount) || 0;
                    const availableSalary = base + (hours * rate) + bonus - deduction;
                    const advanceDeduction = parseFloat(formData.advanceDeduction) || 0;
                    return (unsettledAdvance > 0 || advanceDeduction > availableSalary) ? "warning" : undefined;
                  })()}
                  size="small"
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
                  helperText={errors.totalAmount || "Calculated automatically"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calculate fontSize="small" color="primary" sx={{ mr: 0.5 }} />
                        {currencySymbol}
                      </InputAdornment>
                    ),
                    readOnly: true
                  }}
                  disabled={true}
                  sx={{
                    '& .MuiInputBase-root': {
                      bgcolor: 'action.selected',
                      fontWeight: 600
                    }
                  }}
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Payment Status Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Payment color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                PAYMENT STATUS
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={formData.paymentStatus === 'paid' ? 12 : 6} md={formData.paymentStatus === 'paid' ? 4 : 6}>
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
              </Grid>

              {formData.paymentStatus === 'paid' ? (
                <>
                  <Grid item xs={12} sm={6} md={4}>
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
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Transaction ID (Optional)"
                      value={formData.paymentTransactionId}
                      onChange={(e) => handleChange('paymentTransactionId', e.target.value)}
                      size="small"
                    />
                  </Grid>
                </>
              ) : null}
            </Grid>
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
              placeholder="Add any additional notes or comments about this payment..."
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
          {loading ? 'Saving...' : mode === 'create' ? 'Create Payment' : 'Update Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

