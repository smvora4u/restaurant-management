import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, Alert } from '@mui/material';
import { Wifi, WifiOff, Refresh } from '@mui/icons-material';

interface WebSocketStatusProps {
  onRetry?: () => void;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ onRetry }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastError, setLastError] = useState<string>('');

  useEffect(() => {
    // Listen for WebSocket connection errors
    const handleError = (event: any) => {
      if (event.detail?.message?.includes('Socket closed')) {
        setIsConnected(false);
        setLastError(event.detail.message);
      }
    };

    // Listen for successful connections
    const handleConnect = () => {
      setIsConnected(true);
      setLastError('');
    };

    window.addEventListener('websocket-error', handleError);
    window.addEventListener('websocket-connect', handleConnect);

    return () => {
      window.removeEventListener('websocket-error', handleError);
      window.removeEventListener('websocket-connect', handleConnect);
    };
  }, []);

  if (isConnected) {
    return (
      <Chip
        icon={<Wifi />}
        label="Live Updates"
        color="success"
        size="small"
        variant="outlined"
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={<WifiOff />}
        label="Offline Mode"
        color="warning"
        size="small"
        variant="outlined"
      />
      {onRetry && (
        <Chip
          icon={<Refresh />}
          label="Retry"
          color="primary"
          size="small"
          variant="outlined"
          onClick={onRetry}
          clickable
        />
      )}
    </Box>
  );
};
