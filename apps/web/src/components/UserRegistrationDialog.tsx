import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Person as PersonIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { useMutation, useQuery } from '@apollo/client';
import { CREATE_USER } from '../graphql/mutations/user';
import { GET_ORDERS_BY_MOBILE } from '../graphql/queries/orders';



interface UserRegistrationDialogProps {
  open: boolean;
  onClose: () => void;
  onUserRegistered: (user: any, orderId?: string) => void;
  orderType?: string;
  sessionId?: string | null;
}

export default function UserRegistrationDialog({
  open,
  onClose,
  onUserRegistered,
  orderType,
  sessionId
}: UserRegistrationDialogProps) {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [createUser] = useMutation(CREATE_USER);

  // Query to check for incomplete orders by mobile number
  const { data: ordersData } = useQuery(GET_ORDERS_BY_MOBILE, {
    variables: { 
      mobileNumber: mobileNumber.replace(/\D/g, ''), 
      orderType: orderType || 'takeout' 
    },
    skip: !mobileNumber || mobileNumber.length < 10,
    errorPolicy: 'ignore'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!mobileNumber.trim()) {
      setError('Mobile number is required');
      return;
    }

    // Basic mobile number validation
    const mobileRegex = /^[0-9]{10,15}$/;
    if (!mobileRegex.test(mobileNumber.replace(/\D/g, ''))) {
      setError('Please enter a valid mobile number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cleanMobileNumber = mobileNumber.replace(/\D/g, '');
      
      // Check for incomplete orders with this mobile number
      const incompleteOrders = ordersData?.ordersByMobile || [];
      const mostRecentOrder = incompleteOrders.length > 0 ? incompleteOrders[0] : null;
      
      let user;
      let orderToRestore = null;
      
      // Create consistent user ID based on mobile number
      const userId = `user_${cleanMobileNumber}`;
      
      if (mostRecentOrder) {
        // User has incomplete order, continue with that order
        orderToRestore = mostRecentOrder;
        
        // Create user object with the order's customer info
        user = {
          id: userId,
          name: mostRecentOrder.customerName || name.trim(),
          mobileNumber: cleanMobileNumber,
          email: email.trim() || undefined,
          sessionId: sessionId || undefined,
          createdAt: new Date().toISOString()
        };
      } else {
        // No incomplete order, create new user and order
        
        user = {
          id: userId,
          name: name.trim(),
          mobileNumber: cleanMobileNumber,
          email: email.trim() || undefined,
          sessionId: sessionId || undefined,
          createdAt: new Date().toISOString()
        };
      }
      
      // Try to create/update user in database
      try {
        // Get restaurant ID from localStorage
        const currentRestaurant = localStorage.getItem('currentRestaurant');
        let restaurantId = null;
        
        if (currentRestaurant) {
          try {
            const restaurant = JSON.parse(currentRestaurant);
            restaurantId = restaurant.id;
          } catch (error) {
            console.error('Error parsing restaurant data:', error);
          }
        }

        if (!restaurantId) {
          throw new Error('Restaurant information not available. Please refresh the page and try again.');
        }

        const result = await createUser({
          variables: {
            input: {
              restaurantId,
              name: user.name,
              mobileNumber: user.mobileNumber,
              email: user.email,
              sessionId: user.sessionId
            }
          }
        });
        
        // Use the database user if creation was successful
        const dbUser = result.data?.createUser;
        if (dbUser) {
          user.id = dbUser.id;
          user.createdAt = dbUser.createdAt;
        }
      } catch (createError: any) {
        // If user creation fails (e.g., duplicate), continue with local user
      }
      
      // Store user info in localStorage with mobile number as key
      localStorage.setItem(`user_${cleanMobileNumber}`, JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // If we found an incomplete order, pass it to the parent
      if (orderToRestore) {
        onUserRegistered(user, orderToRestore.id);
      } else {
        onUserRegistered(user);
      }
      
      onClose();
    } catch (err) {
      console.error('User registration error:', err);
      setError('Failed to register user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={isLoading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">
            {orderType === 'takeout' ? 'New Takeout Order' : 
             orderType === 'delivery' ? 'New Delivery Order' : 
             'Table Order'} - Registration
          </Typography>
        </Box>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {orderType === 'takeout' || orderType === 'delivery' 
              ? 'Please provide your details to start a new order. Each person can place their own individual order from this QR code.'
              : 'Please provide your details to continue with your order. This information will be used to track your order and provide updates.'
            }
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              helperText="Enter your full name as it appears on your ID"
            />

            <TextField
              fullWidth
              label="Mobile Number *"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              disabled={isLoading}
              required
              type="tel"
              InputProps={{
                startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              helperText="Enter your 10-digit mobile number"
              placeholder="9876543210"
            />

            <TextField
              fullWidth
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              type="email"
              helperText="Optional - for order updates and receipts"
              placeholder="your.email@example.com"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={isLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !name.trim() || !mobileNumber.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : <PersonIcon />}
          >
            {isLoading ? 'Registering...' : 'Continue to Order'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
