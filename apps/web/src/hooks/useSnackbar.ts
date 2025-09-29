import { useState } from 'react';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message: string, severity: SnackbarState['severity'] = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const showSuccess = (message: string) => showSnackbar(message, 'success');
  const showError = (message: string) => showSnackbar(message, 'error');
  const showWarning = (message: string) => showSnackbar(message, 'warning');
  const showInfo = (message: string) => showSnackbar(message, 'info');

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
