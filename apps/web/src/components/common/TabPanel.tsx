import React from 'react';
import { Box } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  sx?: any;
}

export default function TabPanel(props: TabPanelProps) {
  const { children, value, index, sx, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={sx}>
          {children}
        </Box>
      )}
    </div>
  );
}

export function a11yProps(index: number, prefix: string = 'tab') {
  return {
    id: `${prefix}-${index}`,
    'aria-controls': `${prefix}panel-${index}`,
  };
}
