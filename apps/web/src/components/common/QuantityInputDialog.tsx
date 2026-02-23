import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';

export interface QuantityInputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (qty: number) => void;
  title?: string;
  label?: string;
  minQuantity?: number;
  maxQuantity?: number;
  defaultValue?: number;
  confirmText?: string;
  cancelText?: string;
}

export default function QuantityInputDialog({
  open,
  onClose,
  onConfirm,
  title = 'Set quantity',
  label = 'Quantity',
  minQuantity = 1,
  maxQuantity = 99,
  defaultValue = 1,
  confirmText = 'Save',
  cancelText = 'Cancel',
}: QuantityInputDialogProps) {
  const [value, setValue] = useState<string>(String(defaultValue));

  useEffect(() => {
    if (open) {
      setValue(String(defaultValue));
    }
  }, [open, defaultValue]);

  const numValue = parseInt(value, 10);
  const isValid = !isNaN(numValue) && numValue >= minQuantity && numValue <= maxQuantity;

  const handleConfirm = () => {
    if (!isValid) return;
    const clamped = Math.max(minQuantity, Math.min(maxQuantity, numValue));
    onConfirm(clamped);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label={label}
            type="number"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d+$/.test(v)) {
                setValue(v);
              }
            }}
            onKeyDown={handleKeyDown}
            inputProps={{
              min: minQuantity,
              max: maxQuantity,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            autoFocus
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelText}</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!isValid}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
