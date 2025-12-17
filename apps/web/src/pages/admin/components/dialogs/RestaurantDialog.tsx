import React from 'react';
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
  CircularProgress
} from '@mui/material';

interface RestaurantDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  formData: {
    name: string;
    email: string;
    password: string;
    address: string;
    phone: string;
    isActive: boolean;
    settings: {
      currency: string;
      timezone: string;
      theme: string;
    };
  };
  formErrors?: Record<string, string>;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (field: string, value: any) => void;
}

export default function RestaurantDialog({
  open,
  mode,
  formData,
  formErrors = {},
  loading,
  onClose,
  onSubmit,
  onFormChange
}: RestaurantDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Restaurant' : 'Edit Restaurant'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Restaurant Name"
            value={formData.name}
            onChange={(e) => onFormChange('name', e.target.value)}
            error={!!formErrors.name}
            helperText={formErrors.name}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => onFormChange('email', e.target.value)}
            error={!!formErrors.email}
            helperText={formErrors.email}
            fullWidth
            required
          />
          <TextField
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => onFormChange('password', e.target.value)}
            error={!!formErrors.password}
            helperText={formErrors.password || (mode === 'edit' ? 'Leave blank to keep current password' : 'Required for new restaurants')}
            fullWidth
            required={mode === 'create'}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => onFormChange('isActive', e.target.value === 'active')}
              label="Status"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Address"
            value={formData.address}
            onChange={(e) => onFormChange('address', e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Phone"
            value={formData.phone}
            onChange={(e) => onFormChange('phone', e.target.value)}
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.settings.currency}
                onChange={(e) => onFormChange('settings.currency', e.target.value)}
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
                value={formData.settings.timezone}
                onChange={(e) => onFormChange('settings.timezone', e.target.value)}
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
              value={formData.settings.theme}
              onChange={(e) => onFormChange('settings.theme', e.target.value)}
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
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            mode === 'create' ? 'Create' : 'Update'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
