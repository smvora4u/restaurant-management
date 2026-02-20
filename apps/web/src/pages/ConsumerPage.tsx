import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_ORDER_BY_TABLE, GET_USER_TABLE_ORDERS } from '../graphql/queries/orders';
import { GET_RESTAURANT_BY_SLUG } from '../graphql/queries/restaurant';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  MenuBook as MenuBookIcon,
  Receipt as InvoiceIcon,
} from '@mui/icons-material';
import ConsumerLayout from '../components/ConsumerLayout';
import MenuTab from '../components/consumer/MenuTab';
import InvoiceTab from '../components/consumer/InvoiceTab';
import UserRegistrationDialog from '../components/UserRegistrationDialog';
import { TabPanel, a11yProps } from '../components/common';




export default function ConsumerPage() {
  const { restaurantSlug, tableNumber, orderId, orderType } = useParams<{ 
    restaurantSlug?: string;
    tableNumber?: string; 
    orderId?: string; 
    orderType?: string; 
  }>();
  const [activeTab, setActiveTab] = useState(0);
  const [isValidTable, setIsValidTable] = useState<boolean | null>(null);
  const [isValidOrder, setIsValidOrder] = useState<boolean | null>(null);
  const [isValidParcel, setIsValidParcel] = useState<boolean | null>(null);
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0);
  const [parcelOrderId, setParcelOrderId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserRegistration, setShowUserRegistration] = useState(false);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isTableOccupied, setIsTableOccupied] = useState(false);
  const [showTableOccupiedMessage, setShowTableOccupiedMessage] = useState(false);
  const [existingTableOrder, setExistingTableOrder] = useState<any>(null);
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [queryTimeout, setQueryTimeout] = useState(false);

  // Query to get restaurant data
  const { loading: restaurantLoading, error: restaurantError } = useQuery(GET_RESTAURANT_BY_SLUG, {
    variables: { slug: restaurantSlug || '' },
    skip: !restaurantSlug,
    onCompleted: (data) => {
      if (data?.restaurantBySlug) {
        setRestaurant(data.restaurantBySlug);
        // Store restaurant data in localStorage for context
        localStorage.setItem('currentRestaurant', JSON.stringify(data.restaurantBySlug));
      }
    },
  });

  // Handle restaurant query errors
  useEffect(() => {
    if (restaurantError) {
      console.error('Error fetching restaurant:', restaurantError);
    }
  }, [restaurantError]);

  // Set timeout to prevent showing error too quickly
  useEffect(() => {
    if (restaurantSlug && !restaurant && !restaurantLoading) {
      const timer = setTimeout(() => {
        setQueryTimeout(true);
      }, 2000); // Wait 2 seconds before showing error
      
      return () => clearTimeout(timer);
    } else {
      setQueryTimeout(false);
    }
  }, [restaurantSlug, restaurant, restaurantLoading]);


  // Query to check for existing table orders
  useQuery(GET_ORDER_BY_TABLE, {
    variables: { tableNumber: tableNumber || '' },
    skip: !tableNumber || !isValidTable || !restaurant,
    onCompleted: (data) => {
      if (data?.orderByTable && ['pending', 'confirmed', 'preparing', 'ready'].includes(data.orderByTable.status)) {
        
        // Check if current user is the owner of this order
        const currentUser = localStorage.getItem('currentUser');
        let isOwner = false;
        
        if (currentUser) {
          try {
            const user = JSON.parse(currentUser);
            // Check if user's mobile number matches the order's customer phone
            if (user.mobileNumber && data.orderByTable.customerPhone === user.mobileNumber) {
              isOwner = true;
            }
          } catch (err) {
            console.error('Error parsing current user:', err);
          }
        }
        
        if (!isOwner) {
          setIsTableOccupied(true);
          setShowTableOccupiedMessage(true);
          setExistingTableOrder(data.orderByTable);
        } else {
          // Don't set isTableOccupied to true, allow the user to continue
        }
      }
    },
  });

  // Suppress unused variable warning - tableOrderData is used in onCompleted callback
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  // Query to check for user's existing table orders
  const { loading: userTableOrdersLoading } = useQuery(GET_USER_TABLE_ORDERS, {
    variables: { mobileNumber: currentUser?.mobileNumber || '' },
    skip: !currentUser?.mobileNumber || !isValidTable,
    onCompleted: (data) => {
      if (data?.ordersByMobile && data.ordersByMobile.length > 0) {
        // Find incomplete orders (not completed)
        const incompleteOrders = data.ordersByMobile.filter((order: any) => order.status !== 'completed');
        if (incompleteOrders.length > 0) {
          const existingOrder = incompleteOrders[0];
          const currentTableNumber = tableNumber || '';
          
          // If user is trying to access a different table than their existing order
          if (String(existingOrder.tableNumber) !== String(currentTableNumber)) {
            setExistingTableOrder(existingOrder);
            setShowRedirectMessage(true);
            setRedirectCountdown(5);
          }
        }
      }
    },
  });

  // Check for existing user on page load
  useEffect(() => {
    
    if (isValidParcel) {
      // For takeout/delivery orders, check for existing user session
      const savedUser = localStorage.getItem('currentUser');
      const savedOrderType = localStorage.getItem('lastOrderType');
      
      // If this is a different order type than what was saved, clear the session
      if (savedOrderType && savedOrderType !== orderType) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastOrderType');
        setShowUserRegistration(true);
        setIsUserRegistered(true);
        return;
      }
      
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsUserRegistered(true);
          
          // Check if user has an existing order
          if (user.mobileNumber) {
            const existingOrderId = localStorage.getItem(`user_order_${user.mobileNumber}`);
            if (existingOrderId) {
              setParcelOrderId(existingOrderId);
            }
          }
        } catch (err) {
          console.error('Error parsing saved user:', err);
          localStorage.removeItem('currentUser');
          setShowUserRegistration(true);
          setIsUserRegistered(true);
        }
      } else {
        setShowUserRegistration(true);
        setIsUserRegistered(true);
      }
    } else {
      // For table orders, check for saved user
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsUserRegistered(true);
        } catch (err) {
          console.error('Error parsing saved user:', err);
          localStorage.removeItem('currentUser');
          setShowUserRegistration(true);
          setIsUserRegistered(true);
        }
      } else {
        setShowUserRegistration(true);
        setIsUserRegistered(true);
      }
    }
  }, [isValidParcel, orderType]);

  // Countdown timer for redirect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showRedirectMessage && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
    } else if (showRedirectMessage && redirectCountdown === 0) {
      // Redirect to existing table order
      if (existingTableOrder) {
        const redirectUrl = `/consumer/${restaurantSlug}/${existingTableOrder.tableNumber}`;
        window.location.href = redirectUrl;
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showRedirectMessage, redirectCountdown, existingTableOrder]);

  // Generate session ID for takeout orders
  useEffect(() => {
    if (orderType && ['takeout', 'delivery'].includes(orderType)) {
      // Generate or retrieve session ID for takeout orders
      let existingSessionId = localStorage.getItem(`takeout_session_${orderType}`);
      if (!existingSessionId) {
        existingSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(`takeout_session_${orderType}`, existingSessionId);
      }
      setSessionId(existingSessionId);
      
      // Check if this is a new QR code scan by comparing with saved session
      const savedSessionId = localStorage.getItem('lastSessionId');
      if (savedSessionId && savedSessionId !== existingSessionId) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastOrderType');
        setCurrentUser(null);
        setShowUserRegistration(true);
        setIsUserRegistered(true);
      }
      
      // Save current session ID
      localStorage.setItem('lastSessionId', existingSessionId);
    }
  }, [orderType]);


  // Validate table number, order ID, or parcel order type
  useEffect(() => {
    if (tableNumber && tableNumber.trim()) {
      setIsValidTable(true);
      setIsValidOrder(false);
      setIsValidParcel(false);
    } else if (orderId) {
      // Basic validation for order ID (MongoDB ObjectId format)
      if (orderId.length === 24 && /^[0-9a-fA-F]{24}$/.test(orderId)) {
        setIsValidOrder(true);
        setIsValidTable(false);
        setIsValidParcel(false);
      } else {
        setIsValidOrder(false);
        setIsValidTable(false);
        setIsValidParcel(false);
      }
    } else if (orderType && ['takeout', 'delivery'].includes(orderType)) {
      // Valid parcel order type
      setIsValidParcel(true);
      setIsValidTable(false);
      setIsValidOrder(false);
    } else {
      setIsValidTable(false);
      setIsValidOrder(false);
      setIsValidParcel(false);
    }
  }, [tableNumber, orderId, orderType]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOrderCreated = (orderId?: string) => {
    setOrderRefreshTrigger(prev => prev + 1);
    if (orderId && isValidParcel) {
      setParcelOrderId(orderId);
      // Store the order ID for this user using mobile number as key
      if (currentUser && currentUser.mobileNumber) {
        localStorage.setItem(`user_order_${currentUser.mobileNumber}`, orderId);
      }
    }
  };

  const handleUserRegistered = (user: any, orderId?: string) => {
    setCurrentUser(user);
    setIsUserRegistered(true);
    setShowUserRegistration(false);
    
    // Save the order type for session tracking
    if (isValidParcel) {
      localStorage.setItem('lastOrderType', orderType || 'takeout');
    }
    
    // If an order ID was provided (incomplete order found), use it
    if (orderId && isValidParcel) {
      setParcelOrderId(orderId);
      // Store the order ID for this user
      localStorage.setItem(`user_order_${user.mobileNumber}`, orderId);
    } else if (isValidParcel) {
      // Check if user has an existing order by mobile number
      const existingOrderId = localStorage.getItem(`user_order_${user.mobileNumber}`);
      if (existingOrderId) {
        setParcelOrderId(existingOrderId);
      }
    }
  };

  const handleUserRegistrationClose = () => {
    // If user closes without registering, redirect back or show error
    setShowUserRegistration(false);
    // You might want to redirect to home page or show an error message
  };

	const handleChangeUser = () => {
		// Clear current user and prompt for re-registration
		try {
			if (currentUser?.mobileNumber) {
				localStorage.removeItem(`user_order_${currentUser.mobileNumber}`);
			}
		} catch (_) {}
		localStorage.removeItem('currentUser');
		if (isValidParcel) {
			localStorage.removeItem('lastOrderType');
			setParcelOrderId(null);
		}
		setCurrentUser(null);
		setIsUserRegistered(false);
		setShowUserRegistration(true);
	};

  if (isValidTable === null && isValidOrder === null && isValidParcel === null) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show loading while fetching restaurant data
  if (restaurantLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading restaurant information...
        </Typography>
      </Box>
    );
  }

  // Show error if restaurant not found (only after query completed and timeout)
  if (restaurantError || (!restaurant && restaurantSlug && !restaurantLoading && queryTimeout)) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h5" color="error">
          Restaurant Not Found
        </Typography>
        <Typography variant="body1">
          The restaurant "{restaurantSlug}" could not be found or is not active.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please check the QR code and try again.
        </Typography>
      </Box>
    );
  }

  // Don't render main content until we have restaurant data or timeout
  if (!restaurant && restaurantSlug && !queryTimeout) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading restaurant information...
        </Typography>
      </Box>
    );
  }

  // Show loading only if we're still checking for user or table orders, but not if table is occupied or redirecting (show dialog instead)
  if ((!isUserRegistered && !showUserRegistration) || (isValidTable && userTableOrdersLoading && !isTableOccupied && !showRedirectMessage)) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If table is occupied, don't render main content - only show the dialog
  if (isTableOccupied) {
    return (
      <>
        {/* Table Occupied Dialog */}
        <Dialog
          open={showTableOccupiedMessage}
          onClose={() => setShowTableOccupiedMessage(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" color="error" align="center">
              Table Occupied
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" align="center" sx={{ mb: 2 }}>
              This table already has an active order that is not yet completed.
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary">
              Please scan another table QR code to place your order.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setShowTableOccupiedMessage(false);
                // Close the current page/tab
                window.close();
              }}
              sx={{ minWidth: 120 }}
            >
              Close Page
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // If user has existing order on different table, show redirect message
  if (showRedirectMessage) {
    return (
      <>
        {/* Redirect Message Dialog */}
        <Dialog
          open={showRedirectMessage}
          maxWidth="sm"
          fullWidth
          disableEscapeKeyDown
        >
          <DialogTitle>
            <Typography variant="h6" color="warning" align="center">
              Existing Order Found
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" align="center" sx={{ mb: 2 }}>
              You already have an active order on Table #{existingTableOrder?.tableNumber}.
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
              Redirecting you to your existing order...
            </Typography>
            <Typography variant="h4" align="center" color="primary" sx={{ fontWeight: 'bold' }}>
              {redirectCountdown}
            </Typography>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const tableNum = tableNumber || '';
  const orderIdValue = orderId || parcelOrderId || '';
  const parcelOrderType = orderType || '';

  if (isValidTable === false && isValidOrder === false && isValidParcel === false) {
    return (
      <ConsumerLayout tableNumber="" orderType={parcelOrderType} userName={currentUser?.name}>
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Invalid Access
          </Typography>
          <Typography>
            {tableNumber 
              ? `The table number "${tableNumber}" is not valid. Please scan the QR code again or contact staff for assistance.`
              : orderId
              ? `The order ID "${orderId}" is not valid. Please check the link or contact staff for assistance.`
              : `The order type "${orderType}" is not valid. Please scan the QR code again or contact staff for assistance.`
            }
          </Typography>
        </Alert>
      </ConsumerLayout>
    );
  }


  return (
    <>
      <ConsumerLayout 
        tableNumber={tableNum} 
        orderType={parcelOrderType}
        userName={currentUser?.name || (isValidParcel ? 'Guest' : undefined)}
      >
        <Box sx={{ 
          maxWidth: '100%', 
          mx: 'auto', 
          p: { xs: 1, sm: 2, md: 3 },
          paddingBottom: (theme) => ({
            xs: `calc(${theme.spacing(1)} + env(safe-area-inset-bottom))`,
            sm: `calc(${theme.spacing(2)} + env(safe-area-inset-bottom))`,
            md: theme.spacing(3),
          }),
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}>
          <Paper 
            elevation={3} 
            sx={{ 
              width: '100%',
              borderRadius: 3,
              overflow: 'visible',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
          >
            {currentUser && (
            <Box sx={{ p: { xs: 2, sm: 2 }, borderBottom: 1, borderColor: 'divider', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">You are ordering as</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{currentUser.name || 'Guest'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentUser.mobileNumber}{currentUser.email ? ` • ${currentUser.email}` : ''}
                </Typography>
              </Box>
              <Button variant="text" size="small" onClick={handleChangeUser}>Change</Button>
            </Box>
            )}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#fff' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="consumer tabs"
                variant="fullWidth"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  '& .MuiTab-root': {
                    minHeight: { xs: 48, sm: 56, md: 72 },
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    '&.Mui-selected': {
                      color: '#1976d2',
                      fontWeight: 600
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0'
                  }
                }}
              >
                <Tab
                  icon={<MenuBookIcon sx={{ fontSize: '1.2rem' }} />}
                  label="Menu"
                  {...a11yProps(0)}
                />
              <Tab
                icon={<InvoiceIcon sx={{ fontSize: '1.2rem' }} />}
                label="Invoice"
                {...a11yProps(1)}
              />
              </Tabs>
            </Box>

            <Box sx={{ backgroundColor: '#fff', minHeight: '60vh', overflow: 'visible' }}>
              <TabPanel 
                value={activeTab} 
                index={0}
                sx={{ p: { xs: 2, sm: 3, md: 4 }, overflow: 'visible' }}
              >
                <MenuTab 
                  tableNumber={tableNum} 
                  orderId={orderIdValue} 
                  orderType={parcelOrderType}
                  isParcelOrder={isValidParcel || false}
                  sessionId={sessionId}
                  currentUser={currentUser}
                  onOrderCreated={handleOrderCreated}
                />
              </TabPanel>

              <TabPanel 
                value={activeTab} 
                index={1}
                sx={{ p: { xs: 2, sm: 3, md: 4 }, overflow: 'visible' }}
              >
                <InvoiceTab 
                  tableNumber={tableNum} 
                  orderId={orderIdValue} 
                  orderType={parcelOrderType}
                  isParcelOrder={isValidParcel || false}
                  sessionId={sessionId}
                  currentUser={currentUser}
                  isActive={activeTab === 1}
                  refreshTrigger={orderRefreshTrigger}
                />
              </TabPanel>
            </Box>
          </Paper>
        </Box>
      </ConsumerLayout>

      {/* User Registration Dialog */}
      <UserRegistrationDialog
        open={showUserRegistration}
        onClose={handleUserRegistrationClose}
        onUserRegistered={handleUserRegistered}
        orderType={parcelOrderType}
        sessionId={sessionId}
      />

    </>
  );
}
