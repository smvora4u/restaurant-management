import React, { useState, useEffect } from 'react';
import { validateForm, validationRules, clearFieldError } from '../../utils/validation';
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
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material';
import { Close as CloseIcon, Add, Delete, CalendarToday, Payment, Note } from '@mui/icons-material';
import { getCurrencySymbolFromCode, getRestaurantCurrency } from '../../utils/currency';

interface PurchaseItem {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  categoryId?: string;
  notes?: string;
}

interface PurchaseFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  vendors: any[];
  categories: any[];
  restaurant?: any;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function PurchaseForm({
  open,
  mode,
  initialData,
  vendors,
  categories,
  restaurant,
  loading = false,
  onClose,
  onSubmit
}: PurchaseFormProps) {
  const [formData, setFormData] = useState({
    vendorId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'unpaid',
    paymentMethod: '',
    invoiceNumber: '',
    notes: ''
  });
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        vendorId: initialData.vendorId || '',
        purchaseDate: initialData.purchaseDate ? new Date(initialData.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paymentStatus: initialData.paymentStatus || 'unpaid',
        paymentMethod: initialData.paymentMethod || '',
        invoiceNumber: initialData.invoiceNumber || '',
        notes: initialData.notes || ''
      });
      setItems(initialData.items?.map((item: any) => ({
        itemName: item.itemName || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'piece',
        unitPrice: item.unitPrice || 0,
        categoryId: item.categoryId || '',
        notes: item.notes || ''
      })) || []);
    } else {
      setFormData({
        vendorId: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'unpaid',
        paymentMethod: '',
        invoiceNumber: '',
        notes: ''
      });
      setItems([{ itemName: '', quantity: 0, unit: 'piece', unitPrice: 0, categoryId: '', notes: '' }]);
    }
    setErrors({});
  }, [initialData, mode, open]);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleAddItem = () => {
    setItems([...items, { itemName: '', quantity: 0, unit: 'piece', unitPrice: 0, categoryId: '', notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    // Clear error for this field when user starts typing
    const errorKey = `item_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: '' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendorId) {
      newErrors.vendorId = 'Vendor is required';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    items.forEach((item, index) => {
      if (!item.itemName.trim()) {
        newErrors[`item_${index}_name`] = 'Item name is required';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice <= 0) {
        newErrors[`item_${index}_unitPrice`] = 'Unit price must be greater than 0';
      }
    });

    // Validate payment method is required when payment status is 'paid'
    if (formData.paymentStatus === 'paid' && !formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required when payment status is "paid"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const totalAmount = calculateTotal();
      const currency = restaurant?.settings?.currency || 'USD';
      
      onSubmit({
        ...formData,
        items: items.map(item => ({
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          categoryId: item.categoryId || null,
          notes: item.notes || null
        })),
        totalAmount,
        currency
      });
    }
  };

  const currencySymbol = restaurant ? getRestaurantCurrency(restaurant).symbol : getCurrencySymbolFromCode('USD');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {mode === 'create' ? 'Create Purchase' : 'Edit Purchase'}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.vendorId} size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Vendor *</InputLabel>
                <Select
                  value={formData.vendorId}
                  onChange={(e) => {
                    setFormData({ ...formData, vendorId: e.target.value });
                    if (errors.vendorId) setErrors({ ...errors, vendorId: '' });
                  }}
                  label="Vendor *"
                >
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.vendorId && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                    {errors.vendorId}
                  </Box>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Purchase Date *"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => {
                  setFormData({ ...formData, purchaseDate: e.target.value });
                  if (errors.purchaseDate) setErrors(clearFieldError(errors, 'purchaseDate'));
                }}
                error={!!errors.purchaseDate}
                helperText={errors.purchaseDate}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={formData.paymentStatus}
                  onChange={(e) => {
                    setFormData({ ...formData, paymentStatus: e.target.value });
                    if (errors.paymentMethod) setErrors(clearFieldError(errors, 'paymentMethod'));
                  }}
                  label="Payment Status"
                >
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={{ minWidth: 200 }} error={!!errors.paymentMethod}>
                <InputLabel>Payment Method{formData.paymentStatus === 'paid' ? ' *' : ''}</InputLabel>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => {
                    setFormData({ ...formData, paymentMethod: e.target.value });
                    if (errors.paymentMethod) setErrors(clearFieldError(errors, 'paymentMethod'));
                  }}
                  label={`Payment Method${formData.paymentStatus === 'paid' ? ' *' : ''}`}
                  required={formData.paymentStatus === 'paid'}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                </Select>
                {errors.paymentMethod && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                    {errors.paymentMethod}
                  </Box>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Invoice Number"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                size="small"
              />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>Items</Typography>
              <Button startIcon={<Add />} onClick={handleAddItem} size="small">
                Add Item
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item Name</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.itemName}
                          onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                          error={!!errors[`item_${index}_name`]}
                          helperText={errors[`item_${index}_name`]}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          error={!!errors[`item_${index}_quantity`]}
                          helperText={errors[`item_${index}_quantity`]}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          error={!!errors[`item_${index}_unitPrice`]}
                          helperText={errors[`item_${index}_unitPrice`]}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>
                          }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {currencySymbol} {(item.quantity * item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                          <Select
                            value={item.categoryId || ''}
                            onChange={(e) => handleItemChange(index, 'categoryId', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">None</MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="h6">
                Total: {currencySymbol} {calculateTotal().toFixed(2)}
              </Typography>
            </Box>
          </Paper>

          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

