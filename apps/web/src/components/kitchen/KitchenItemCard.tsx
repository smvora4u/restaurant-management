import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Tooltip
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
    orderId,
    isUpdating: itemIsUpdating
  } = item;

  const displayTableNumber = tableNumber ? `Table ${tableNumber}` : 
    orderType === 'takeout' ? 'Parcel' : 
    orderType === 'delivery' ? 'Delivery' : 'N/A';

  const StatusIcon = getStatusMuiIcon(status);

  return (
    <Tooltip title={`Order: ${orderId.slice(-8)}`} placement="top">
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
          {/* Table Number - Large and Prominent */}
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
            {displayTableNumber}
          </Typography>

          {/* Item Name */}
          <Typography
            variant="h6"
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

          {/* Quantity - bigger for readability */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Chip
              icon={<StatusIcon />}
              label={`Qty: ${quantity}`}
              color={getStatusColor(status) as any}
              size="medium"
              sx={{
                fontSize: '1rem',
                height: 36,
                px: 1.5,
                fontWeight: 700
              }}
            />
          </Box>

          {/* Special Instructions */}
          {specialInstructions && (
            <Box
              sx={{
                mt: 1,
                p: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: 1,
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  textAlign: 'center'
                }}
              >
                <strong>Note:</strong> {specialInstructions}
              </Typography>
            </Box>
          )}

          {/* Order ID Reference */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1,
              color: 'text.secondary',
              fontFamily: 'monospace'
            }}
          >
            #{orderId.slice(-8)}
          </Typography>
        </CardContent>
      </Card>
    </Tooltip>
  );
}
