import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
} from '@mui/material';

interface FormFieldProps {
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'switch' | 'textarea';
  name: string;
  label: string;
  value: any;
  onChange: (field: string, value: any) => void;
  options?: { value: string; label: string }[];
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
}

export default function FormField({
  type,
  name,
  label,
  value,
  onChange,
  options = [],
  required = false,
  multiline = false,
  rows = 1,
  disabled = false,
  placeholder,
  helperText,
  error = false,
  fullWidth = true,
}: FormFieldProps) {
  const handleChange = (event: any) => {
    const newValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    onChange(name, newValue);
  };

  if (type === 'select') {
    return (
      <FormControl fullWidth={fullWidth} required={required} error={error}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          onChange={handleChange}
          label={label}
          disabled={disabled}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  if (type === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={value}
            onChange={handleChange}
            disabled={disabled}
          />
        }
        label={label}
      />
    );
  }

  return (
    <TextField
      type={type}
      name={name}
      label={label}
      value={value}
      onChange={handleChange}
      required={required}
      multiline={multiline}
      rows={rows}
      disabled={disabled}
      placeholder={placeholder}
      helperText={helperText}
      error={error}
      fullWidth={fullWidth}
    />
  );
}
