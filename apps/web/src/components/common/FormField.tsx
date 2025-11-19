import React, { useState, useEffect } from 'react';
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
  min?: number;
  max?: number;
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
  min,
  max,
}: FormFieldProps) {
  // For number type, use string state for better mobile editing
  const [stringValue, setStringValue] = useState<string>(
    type === 'number' ? (value?.toString() || '') : ''
  );

  // Sync stringValue with external value changes
  useEffect(() => {
    if (type === 'number') {
      setStringValue(value?.toString() || '');
    }
  }, [value, type]);

  const handleChange = (event: any) => {
    if (type === 'number') {
      const inputValue = event.target.value;
      // Allow empty string for editing, or valid numbers (including decimals for price)
      if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
        setStringValue(inputValue);
        // Parse and pass number to onChange, or empty string if invalid
        const numValue = inputValue === '' ? '' : (inputValue.includes('.') ? parseFloat(inputValue) : parseInt(inputValue, 10));
        onChange(name, isNaN(numValue as number) ? '' : numValue);
      }
    } else {
      const newValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      onChange(name, newValue);
    }
  };

  const handleBlur = (event: any) => {
    if (type === 'number') {
      // Ensure valid number when field loses focus
      const numValue = parseFloat(event.target.value);
      if (isNaN(numValue)) {
        setStringValue('');
        onChange(name, '');
      } else {
        // Apply min/max constraints
        let finalValue = numValue;
        if (min !== undefined && finalValue < min) finalValue = min;
        if (max !== undefined && finalValue > max) finalValue = max;
        setStringValue(finalValue.toString());
        onChange(name, finalValue);
      }
    }
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

  // For number type, use text input with numeric keyboard for better mobile UX
  if (type === 'number') {
    return (
      <TextField
        type="text"
        name={name}
        label={label}
        value={stringValue}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        helperText={helperText}
        error={error}
        fullWidth={fullWidth}
        inputProps={{
          inputMode: 'decimal',
          pattern: min !== undefined && min >= 0 ? '[0-9]*' : '[-0-9]*',
          ...(min !== undefined && { min }),
          ...(max !== undefined && { max }),
        }}
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
