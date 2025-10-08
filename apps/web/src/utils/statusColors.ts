// Status color utilities for consistent status display across the application
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Restaurant as RestaurantIcon,
  LocalDining as LocalDiningIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type ItemStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'warning'; // Orange
    case 'confirmed':
      return 'info'; // Blue
    case 'preparing':
      return 'primary'; // Dark blue
    case 'ready':
      return 'success'; // Green
    case 'served':
      return 'success'; // Green (same as ready)
    case 'completed':
      return 'success'; // Green
    case 'cancelled':
      return 'error'; // Red
    default:
      return 'default'; // Gray
  }
};

export const getStatusChipColor = (status: string) => {
  switch (status) {
    case 'pending':
      return { bgcolor: '#fff3cd', color: '#856404', border: '#ffeaa7' }; // Light orange
    case 'confirmed':
      return { bgcolor: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }; // Light blue
    case 'preparing':
      return { bgcolor: '#cce5ff', color: '#004085', border: '#99d6ff' }; // Light dark blue
    case 'ready':
      return { bgcolor: '#d4edda', color: '#155724', border: '#c3e6cb' }; // Light green
    case 'served':
      return { bgcolor: '#d1f2eb', color: '#0e6b47', border: '#a7f3d0' }; // Light green (different shade)
    case 'completed':
      return { bgcolor: '#d1f2eb', color: '#0e6b47', border: '#a7f3d0' }; // Light green (same as served)
    case 'cancelled':
      return { bgcolor: '#f8d7da', color: '#721c24', border: '#f5c6cb' }; // Light red
    default:
      return { bgcolor: '#f8f9fa', color: '#6c757d', border: '#dee2e6' }; // Light gray
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return '⏳'; // Hourglass
    case 'confirmed':
      return '✅'; // Check mark
    case 'preparing':
      return '👨‍🍳'; // Chef
    case 'ready':
      return '🍽️'; // Plate
    case 'served':
      return '🎉'; // Party
    case 'completed':
      return '✅'; // Check mark
    case 'cancelled':
      return '❌'; // X mark
    default:
      return '❓'; // Question mark
  }
};

export const getStatusDescription = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Waiting for confirmation';
    case 'confirmed':
      return 'Order confirmed by kitchen';
    case 'preparing':
      return 'Being prepared in kitchen';
    case 'ready':
      return 'Ready for service';
    case 'served':
      return 'Served to customer';
    case 'completed':
      return 'Order completed';
    case 'cancelled':
      return 'Order cancelled';
    default:
      return 'Unknown status';
  }
};

/**
 * Returns background colors for status columns and cards
 */
export const getStatusBackgroundColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#fff3cd'; // Light yellow
    case 'confirmed':
      return '#d1ecf1'; // Light blue
    case 'preparing':
      return '#d1ecf1'; // Light blue
    case 'ready':
      return '#d4edda'; // Light green
    case 'served':
      return '#e2e3e5'; // Light gray
    case 'completed':
      return '#d4edda'; // Light green
    case 'cancelled':
      return '#f8d7da'; // Light red
    default:
      return '#f8f9fa'; // Light gray
  }
};

/**
 * Returns MUI icon components for statuses
 */
export const getStatusMuiIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return AccessTimeIcon;
    case 'confirmed':
      return CheckCircleIcon;
    case 'preparing':
      return RestaurantIcon;
    case 'ready':
      return CheckCircleIcon;
    case 'served':
      return LocalDiningIcon;
    case 'completed':
      return CheckCircleIcon;
    case 'cancelled':
      return CancelIcon;
    default:
      return AccessTimeIcon;
  }
};
