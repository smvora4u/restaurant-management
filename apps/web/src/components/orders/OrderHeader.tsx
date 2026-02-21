import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  ShoppingCart,
  Restaurant,
  AccessTime,
  CheckCircle,
  Cancel,
  Update
} from '@mui/icons-material';
import { formatFullDateTime } from '../../utils/dateFormatting';
import { formatCurrencyFromRestaurant } from '../../utils/currency';
import { OrderStatus, getStatusColor } from '../../utils/statusColors';

interface OrderHeaderProps {
  order: any;
  restaurant: any;
  onBack: () => void;
  onStatusUpdate: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  canCompleteOrder?: boolean;
  canCancelOrder?: boolean;
  onCompleteOrder?: () => void;
  onCancelOrder?: () => void;
}


const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'completed': return <CheckCircle />;
    case 'cancelled': return <Cancel />;
    case 'preparing': return <AccessTime />;
    case 'ready': return <Restaurant />;
    case 'served': return <CheckCircle />;
    default: return <ShoppingCart />;
  }
};

const getOrderTypeIcon = (orderType: string) => {
  switch (orderType) {
    case 'dine-in': return <Restaurant />;
    case 'takeout': return <ShoppingCart />;
    case 'delivery': return <ShoppingCart />;
    default: return <ShoppingCart />;
  }
};

export default function OrderHeader({
  order,
  restaurant,
  onBack,
  onStatusUpdate,
  hasUnsavedChanges = false,
  isSaving = false,
  canCompleteOrder = false,
  canCancelOrder = false,
  onCompleteOrder,
  onCancelOrder
}: OrderHeaderProps) {
  if (!order) return null;

  return (
    <Box>
      {/* Navigation and Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Order #{order.id.slice(-8)}
        </Typography>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Update />}
            onClick={onStatusUpdate}
            disabled={order.status === 'cancelled' || order.status === 'completed'}
            title={order.status === 'cancelled' || order.status === 'completed' ? 'Cannot update status of cancelled or completed orders' : ''}
          >
            Update Status
          </Button>
          
          {canCompleteOrder && onCompleteOrder && (
            <Button
              variant="contained"
              color="success"
              onClick={onCompleteOrder}
            >
              Complete Order
            </Button>
          )}
          
          {canCancelOrder && onCancelOrder && (
            <Button
              variant="contained"
              color="error"
              onClick={onCancelOrder}
            >
              Cancel Order
            </Button>
          )}
        </Box>
      </Box>

      {/* Order Information Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
        {/* Order Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={getStatusIcon(order.status)}
            label={order.status.toUpperCase()}
            color={getStatusColor(order.status)}
            size="medium"
            sx={{ fontSize: '1rem', fontWeight: 600 }}
          />
          <Chip
            icon={getOrderTypeIcon(order.orderType)}
            label={order.orderType}
            variant="outlined"
            size="medium"
          />
        </Box>

        {/* Customer Information */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Customer Information
          </Typography>
          <Typography variant="body1">
            <strong>Name:</strong> {order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in Customer')}
          </Typography>
          {order.customerPhone && (
            <Typography variant="body1">
              <strong>Phone:</strong> {order.customerPhone}
            </Typography>
          )}
          {order.tableNumber && (
            <Typography variant="body1">
              <strong>Table:</strong> {order.tableNumber}
            </Typography>
          )}
        </Box>

        {/* Order Details */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Order Details
          </Typography>
          <Typography variant="body1">
            <strong>Total Amount:</strong> {formatCurrencyFromRestaurant(order.totalAmount, restaurant)}
          </Typography>
          <Typography variant="body1">
            <strong>Items:</strong> {order.items?.length || 0}
          </Typography>
          <Typography variant="body1">
            <strong>Created:</strong> {formatFullDateTime(order.createdAt)}
          </Typography>
          {order.updatedAt && order.updatedAt !== order.createdAt && (
            <Typography variant="body1">
              <strong>Last Updated:</strong> {formatFullDateTime(order.updatedAt)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Notes */}
      {order.notes && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notes
          </Typography>
          <Typography variant="body1" sx={{ 
            p: 2, 
            backgroundColor: 'grey.50', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            {order.notes}
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />
    </Box>
  );
}
