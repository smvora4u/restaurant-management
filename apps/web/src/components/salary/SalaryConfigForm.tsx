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

interface SalaryConfigFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function SalaryConfigForm({
  open,
  mode,
  initialData,
  loading = false,
  onClose,
  onSubmit
}: SalaryConfigFormProps) {
  const [formData, setFormData] = useState({
    salaryType: 'fixed',
    baseSalary: '',
    hourlyRate: '',
    currency: 'USD',
    paymentFrequency: 'monthly',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        salaryType: initialData.salaryType || 'fixed',
        baseSalary: initialData.baseSalary?.toString() || '',
        hourlyRate: initialData.hourlyRate?.toString() || '',
        currency: initialData.currency || 'USD',
        paymentFrequency: initialData.paymentFrequency || 'monthly',
        effectiveDate: initialData.effectiveDate ? new Date(initialData.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        salaryType: 'fixed',
        baseSalary: '',
        hourlyRate: '',
        currency: 'USD',
        paymentFrequency: 'monthly',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setErrors({});
  }, [initialData, mode, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.salaryType) {
      newErrors.salaryType = 'Salary type is required';
    }

    if (formData.salaryType === 'fixed' || formData.salaryType === 'mixed') {
      if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
        newErrors.baseSalary = 'Base salary must be greater than 0';
      }
    }

    if (formData.salaryType === 'hourly' || formData.salaryType === 'mixed') {
      if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) {
        newErrors.hourlyRate = 'Hourly rate must be greater than 0';
      }
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }

    if (!formData.paymentFrequency) {
      newErrors.paymentFrequency = 'Payment frequency is required';
    }

    if (!formData.effectiveDate) {
      newErrors.effectiveDate = 'Effective date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const submitData: any = {
      salaryType: formData.salaryType,
      currency: formData.currency,
      paymentFrequency: formData.paymentFrequency,
      effectiveDate: formData.effectiveDate,
      notes: formData.notes || undefined
    };

    if (formData.salaryType === 'fixed' || formData.salaryType === 'mixed') {
      submitData.baseSalary = parseFloat(formData.baseSalary);
    }

    if (formData.salaryType === 'hourly' || formData.salaryType === 'mixed') {
      submitData.hourlyRate = parseFloat(formData.hourlyRate);
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Set Salary Configuration' : 'Update Salary Configuration'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.salaryType}>
                <InputLabel>Salary Type</InputLabel>
                <Select
                  value={formData.salaryType}
                  onChange={(e) => handleChange('salaryType', e.target.value)}
                  label="Salary Type"
                >
                  <MenuItem value="fixed">Fixed Salary</MenuItem>
                  <MenuItem value="hourly">Hourly Rate</MenuItem>
                  <MenuItem value="mixed">Mixed (Fixed + Hourly)</MenuItem>
                </Select>
                {errors.salaryType && <Alert severity="error" sx={{ mt: 1 }}>{errors.salaryType}</Alert>}
              </FormControl>
            </Grid>

            {(formData.salaryType === 'fixed' || formData.salaryType === 'mixed') && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Base Salary"
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => handleChange('baseSalary', e.target.value)}
                  error={!!errors.baseSalary}
                  helperText={errors.baseSalary}
                  InputProps={{
                    startAdornment: <span style={{ marginRight: 8 }}>{formData.currency}</span>
                  }}
                />
              </Grid>
            )}

            {(formData.salaryType === 'hourly' || formData.salaryType === 'mixed') && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Hourly Rate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => handleChange('hourlyRate', e.target.value)}
                  error={!!errors.hourlyRate}
                  helperText={errors.hourlyRate}
                  InputProps={{
                    startAdornment: <span style={{ marginRight: 8 }}>{formData.currency}</span>
                  }}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.currency}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="INR">INR</MenuItem>
                </Select>
                {errors.currency && <Alert severity="error" sx={{ mt: 1 }}>{errors.currency}</Alert>}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.paymentFrequency}>
                <InputLabel>Payment Frequency</InputLabel>
                <Select
                  value={formData.paymentFrequency}
                  onChange={(e) => handleChange('paymentFrequency', e.target.value)}
                  label="Payment Frequency"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="biweekly">Bi-weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
                {errors.paymentFrequency && <Alert severity="error" sx={{ mt: 1 }}>{errors.paymentFrequency}</Alert>}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => handleChange('effectiveDate', e.target.value)}
                error={!!errors.effectiveDate}
                helperText={errors.effectiveDate}
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Grid>

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
          {loading ? 'Saving...' : mode === 'create' ? 'Set Salary' : 'Update Salary'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

