import React from 'react';
import { Chip, Box } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface DataFreshnessIndicatorProps {
  dataStaleWarning: boolean;
  onRefresh: () => void;
  position?: 'header' | 'inline';
  size?: 'small' | 'medium';
}

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  dataStaleWarning,
  onRefresh,
  position = 'header',
  size = 'small'
}) => {
  if (!dataStaleWarning) return null;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      ...(position === 'inline' && { mb: 2 })
    }}>
      <Chip
        icon={<Refresh />}
        label="Data Stale"
        color="warning"
        size={size}
        onClick={onRefresh}
        sx={{ 
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'warning.dark',
            color: 'white'
          }
        }}
      />
    </Box>
  );
};
