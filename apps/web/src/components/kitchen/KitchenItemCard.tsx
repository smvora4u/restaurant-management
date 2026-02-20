import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import { getStatusColor, getStatusBackgroundColor, getStatusMuiIcon } from '../../utils/statusColors';

interface KitchenItemCardProps {
  item: {
    orderId: string;
    itemIndex: number;
    menuItemId: string;
    quantity: number;
    status: 'pending' | 'preparing' | 'ready' | 'served';
    tableNumber?: number;
    orderType: 'dine-in' | 'takeout' | 'delivery';
    specialInstructions?: string;
    itemName?: string;
    customerName?: string;
    isUpdating?: boolean;
  };
  isUpdating?: boolean;
  onClick: () => void;
}


export default function KitchenItemCard({ item, isUpdating = false, onClick }: KitchenItemCardProps) {
  const { 
    tableNumber, 
    orderType, 
    quantity, 
    specialInstructions, 
    itemName, 
    status, 
    customerName,
    isUpdating: itemIsUpdating
  } = item;

  const displayTableNumber = tableNumber ? `Table ${tableNumber}` : 
    orderType === 'takeout' ? 'Parcel' : 
    orderType === 'delivery' ? 'Delivery' : 'N/A';

  const StatusIcon = getStatusMuiIcon(status);

  return (
    <Card
        onClick={onClick}
        sx={{
          cursor: (isUpdating || itemIsUpdating) ? 'not-allowed' : 'pointer',
          mb: 2,
          backgroundColor: getStatusBackgroundColor(status),
          border: `2px solid ${status === 'served' ? '#6c757d' : 'transparent'}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: (isUpdating || itemIsUpdating) ? 'none' : 'translateY(-2px)',
            boxShadow: (isUpdating || itemIsUpdating) ? 'none' : 4,
            borderColor: status === 'served' ? '#6c757d' : '#1976d2'
          },
          opacity: (isUpdating || itemIsUpdating) ? 0.7 : 1,
          position: 'relative'
        }}
      >
        {(isUpdating || itemIsUpdating) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
        
        <CardContent sx={{ p: 2 }}>
          {/* Table Number / Customer Name - Large and Prominent */}
          <Typography
            variant="h4"
            component="div"
            sx={{
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 1,
              color: status === 'served' ? '#6c757d' : 'text.primary'
            }}
          >
            {orderType === 'takeout' && customerName ? customerName : displayTableNumber}
          </Typography>
          
          {/* Show "Parcel" label for takeout orders with customer name */}
          {orderType === 'takeout' && customerName && (
            <Typography
              variant="caption"
              component="div"
              sx={{
                textAlign: 'center',
                mb: 1,
                color: 'text.secondary',
                fontStyle: 'italic'
              }}
            >
              Parcel Order
            </Typography>
          )}

          {/* Item Name */}
          <Typography
            variant="h5"
            component="div"
            sx={{
              textAlign: 'center',
              mb: 1,
              fontWeight: 'medium',
              color: status === 'served' ? '#6c757d' : 'text.primary'
            }}
          >
            {itemName || 'Loading...'}
          </Typography>

          {/* Special Instructions - prominent, same visual weight as item name */}
          {specialInstructions && (
            <Box
              sx={{
                mb: 1,
                py: 0.75,
                px: 1.5,
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                borderRadius: 1,
                border: '1px solid rgba(0, 0, 0, 0.12)'
              }}
            >
              <Typography
                variant="h5"
                component="div"
                sx={{
                  display: 'block',
                  fontWeight: 'medium',
                  color: status === 'served' ? '#6c757d' : 'text.primary',
                  textAlign: 'center'
                }}
              >
                {specialInstructions}
              </Typography>
            </Box>
          )}

          {/* Quantity - bigger for readability */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Chip
              icon={<StatusIcon />}
              label={`Qty: ${quantity}`}
              color={getStatusColor(status) as any}
              size="medium"
              sx={{
                fontSize: '1.25rem',
                height: 42,
                px: 2,
                fontWeight: 700
              }}
            />
          </Box>
        </CardContent>
      </Card>
  );
}
