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

interface StaffDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  formData: {
    name: string;
    email: string;
    password: string;
    role: string;
  };
  formErrors?: Record<string, string>;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (field: string, value: any) => void;
}

export default function StaffDialog({
  open,
  mode,
  formData,
  formErrors = {},
  loading,
  onClose,
  onSubmit,
  onFormChange
}: StaffDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Name"
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
            helperText={formErrors.password || (mode === 'edit' ? 'Leave blank to keep current password' : 'Required for new staff')}
            fullWidth
            required={mode === 'create'}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => onFormChange('role', e.target.value)}
            >
              <MenuItem value="STAFF">Staff</MenuItem>
              <MenuItem value="MANAGER">Manager</MenuItem>
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
          {loading ? <CircularProgress size={20} /> : (mode === 'create' ? 'Create' : 'Update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
