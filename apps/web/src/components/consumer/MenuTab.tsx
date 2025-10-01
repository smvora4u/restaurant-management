import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as ShoppingCartIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MENU_ITEMS } from '../../graphql/queries/menu';
import { CREATE_ORDER, UPDATE_ORDER } from '../../graphql/mutations/orders';
import { 
  GET_ORDER_BY_TABLE, 
  GET_ORDER_BY_ID, 
  GET_ORDERS_BY_SESSION, 
  GET_ORDERS_BY_MOBILE 
} from '../../graphql/queries/orders';
import { getStatusChipColor } from '../../utils/statusColors';


interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
}

interface OrderItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  price: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
}

interface MenuTabProps {
  tableNumber: number;
  orderId?: string;
  orderType?: string;
  isParcelOrder?: boolean;
  sessionId?: string | null;
  currentUser?: any;
  onOrderCreated?: (orderId?: string) => void;
}

export default function MenuTab({ tableNumber, orderId, orderType, isParcelOrder, sessionId, currentUser, onOrderCreated }: MenuTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isOrderUpdate, setIsOrderUpdate] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [modifiedOrderItems, setModifiedOrderItems] = useState<{ [itemId: string]: number }>({});
  const [hasOrderModifications, setHasOrderModifications] = useState(false);


  const { data, loading, error } = useQuery(GET_MENU_ITEMS);
  const [createOrder, { loading: orderLoading }] = useMutation(CREATE_ORDER);
  const [updateOrder, { loading: updateLoading }] = useMutation(UPDATE_ORDER);
  
  // Check for existing order for dine-in customers
  const { data: tableOrderData, refetch: refetchTableOrder } = useQuery(GET_ORDER_BY_TABLE, {
    variables: { tableNumber },
    skip: isParcelOrder || !tableNumber,
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network' // Always fetch fresh data
  });

  // Check for existing order for parcel orders
  const { data: parcelOrderData, refetch: refetchParcelOrder } = useQuery(GET_ORDER_BY_ID, {
    variables: { id: orderId },
    skip: !isParcelOrder || !orderId,
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network' // Always fetch fresh data
  });

  // Check for mobile-based orders for takeout/delivery
  const { data: mobileOrdersData, refetch: refetchMobileOrders } = useQuery(GET_ORDERS_BY_MOBILE, {
    variables: { mobileNumber: currentUser?.mobileNumber || '', orderType: orderType || 'takeout' },
    skip: !isParcelOrder || !currentUser?.mobileNumber,
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network' // Always fetch fresh data
  });

  // Check for session-based orders for takeout/delivery (fallback)
  const { data: sessionOrdersData, refetch: refetchSessionOrders } = useQuery(GET_ORDERS_BY_SESSION, {
    variables: { sessionId: sessionId || '', orderType: orderType || 'takeout' },
    skip: !isParcelOrder || !sessionId || !!currentUser?.id,
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network' // Always fetch fresh data
  });

  // Use the appropriate data and refetch function
  // For takeout orders, prioritize mobile-based orders, fallback to session-based
  const mobileOrders = mobileOrdersData?.ordersByMobile || [];
  const sessionOrders = sessionOrdersData?.ordersBySession || [];
  
  // Try to find the order by ID first
  let currentUserOrder = mobileOrders.find((order: any) => order.id === orderId) || 
                        sessionOrders.find((order: any) => order.id === orderId);
  
  // If no order found by ID but we have orders, use the most recent one
  if (!currentUserOrder && (mobileOrders.length > 0 || sessionOrders.length > 0)) {
    const allOrders = [...mobileOrders, ...sessionOrders];
    // Sort by createdAt and get the most recent
    allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    currentUserOrder = allOrders[0];
    console.log('MenuTab: Using most recent order as fallback:', currentUserOrder?.id);
    
    // Update the parent component with the found order ID
    if (currentUserOrder?.id && onOrderCreated) {
      onOrderCreated(currentUserOrder.id);
    }
  }
  
  // Debug logging
  console.log('MenuTab: Order lookup debug:', {
    orderId,
    mobileOrders: mobileOrders.length,
    sessionOrders: sessionOrders.length,
    currentUserOrder: currentUserOrder?.id,
    currentUser: currentUser?.mobileNumber,
    isParcelOrder
  });
  
  const currentOrderData = tableOrderData?.orderByTable || parcelOrderData?.orderById || currentUserOrder;
  const refetch = refetchTableOrder || refetchParcelOrder || refetchMobileOrders || refetchSessionOrders;


  const handleAddToCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const handleDecreaseQuantity = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const handleModifyOrderItem = (itemId: string, newQuantity: number) => {
    // Check if the item is in pending status
    const existingItem = currentOrderData?.items.find((item: any) => item.menuItemId === itemId);
    if (existingItem && existingItem.status !== 'pending') {
      return;
    }
    
    setModifiedOrderItems(prev => {
      const newModified = { ...prev };
      if (newQuantity <= 0) {
        delete newModified[itemId];
      } else {
        newModified[itemId] = newQuantity;
      }
      return newModified;
    });
    
    setHasOrderModifications(true);
  };

  const handleRemoveOrderItem = (itemId: string) => {
    // Check if the item is in pending status
    const existingItem = currentOrderData?.items.find((item: any) => item.menuItemId === itemId);
    if (existingItem && existingItem.status !== 'pending') {
      return;
    }
    
    setModifiedOrderItems(prev => {
      const newModified = { ...prev };
      newModified[itemId] = 0; // Mark for removal
      return newModified;
    });
    setHasOrderModifications(true);
  };

  const getModifiedOrderItemQuantity = (itemId: string, originalQuantity: number) => {
    return modifiedOrderItems[itemId] !== undefined ? modifiedOrderItems[itemId] : originalQuantity;
  };

  const handleCancelOrderModifications = () => {
    setModifiedOrderItems({});
    setHasOrderModifications(false);
    setShowConfirmDialog(false);
  };

  const handleSubmitClick = () => {
    if (!data?.menuItems) return;
    
    // Allow submission if there are cart items OR if there are order modifications
    const hasCartItems = getTotalItems() > 0;
    const hasOrderModifications = Object.keys(modifiedOrderItems).length > 0;
    
    if (!hasCartItems && !hasOrderModifications) {
      return;
    }
    
    setShowConfirmDialog(true);
  };

  const handleConfirmOrder = async () => {
    setShowConfirmDialog(false);
    
    try {
      // Check if there's an existing order for dine-in customers
      const currentOrder = currentOrderData;
      
      if (currentOrder) {
        // Clean existing order items to remove GraphQL-specific fields
        const existingItems = (currentOrder.items || []).map((item: any) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || undefined,
          price: item.price,
          status: item.status || 'pending' // Include status field
        }));

        const cartItems = Object.entries(cart).map(([itemId, quantity]) => {
          const item = data.menuItems.find((item: MenuItem) => item.id === itemId);
          return {
            menuItemId: itemId,
            quantity,
            price: item?.price || 0,
            status: 'pending'
          };
        });

        // Apply modifications to existing items (only pending items can be modified)
        const modifiedExistingItems = existingItems.map((item: OrderItem) => {
          const modifiedQuantity = modifiedOrderItems[item.menuItemId];
          if (item.status === 'pending' && modifiedQuantity !== undefined) {
            return {
              ...item,
              quantity: modifiedQuantity
            };
          }
          return item;
        }).filter((item: OrderItem) => item.quantity > 0); // Remove items with 0 quantity

        // Create a map of modified existing items for easy lookup
        const modifiedItemsMap = new Map<string, OrderItem>();
        modifiedExistingItems.forEach((item: OrderItem) => {
          modifiedItemsMap.set(item.menuItemId, item);
        });

        // Merge modified existing items with new cart items
        const mergedItems = [...modifiedExistingItems];
        
        cartItems.forEach(cartItem => {
          const existingItem = modifiedItemsMap.get(cartItem.menuItemId);
          if (existingItem) {
            // Update quantity of existing item
            existingItem.quantity += cartItem.quantity;
          } else {
            // Add new item
            mergedItems.push(cartItem);
          }
        });


        // Calculate total amount for merged items
        const totalAmount = mergedItems.reduce((total, item) => {
          return total + (item.price * item.quantity);
        }, 0);

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

        const orderInput = {
          restaurantId,
          tableNumber: isParcelOrder ? undefined : tableNumber,
          orderType: isParcelOrder ? (orderType || 'takeout') : 'dine-in',
          items: mergedItems,
          totalAmount: totalAmount,
          status: 'pending',
          sessionId: isParcelOrder ? sessionId : undefined,
          userId: currentUser?.id,
          customerName: currentUser?.name,
          customerPhone: currentUser?.mobileNumber
        };

        // Validate that we have items to update
        if (mergedItems.length === 0) {
          setOrderError('No items to update in the order');
          return;
        }

        // Update existing order
        setIsOrderUpdate(true);
        const result = await updateOrder({
          variables: { 
            id: currentOrder.id, 
            input: orderInput 
          },
          update: (cache, { data }) => {
            if (data?.updateOrder) {
              // Clear all relevant cache entries to force fresh data
              cache.evict({ fieldName: 'orderByTable' });
              cache.evict({ fieldName: 'orderById' });
              cache.evict({ fieldName: 'ordersByMobile' });
              cache.evict({ fieldName: 'ordersBySession' });
              cache.gc();
            }
          },
          refetchQueries: [
            GET_ORDER_BY_TABLE,
            GET_ORDER_BY_ID, 
            GET_ORDERS_BY_MOBILE,
            GET_ORDERS_BY_SESSION
          ],
          awaitRefetchQueries: true
        });

        if (result.data?.updateOrder) {
          // Show success message immediately
          setOrderSuccess(true);
          setOrderError(null);
          
          // Refetch all relevant queries to update the UI
          const refetchPromises = [];
          
          if (refetchTableOrder) {
            refetchPromises.push(refetchTableOrder());
          }
          if (refetchParcelOrder) {
            refetchPromises.push(refetchParcelOrder());
          }
          if (refetchMobileOrders) {
            refetchPromises.push(refetchMobileOrders());
          }
          if (refetchSessionOrders) {
            refetchPromises.push(refetchSessionOrders());
          }
          
          // Wait for all refetches to complete
          try {
            await Promise.all(refetchPromises);
            
            // Small delay to ensure UI updates properly
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Clear modification states AFTER refetch is complete
            setCart({});
            setModifiedOrderItems({});
            setHasOrderModifications(false);
          } catch (error) {
            // Still clear states even if refetch fails
            setCart({});
            setModifiedOrderItems({});
            setHasOrderModifications(false);
          }
          
          // Notify parent component that order was updated
          if (onOrderCreated) {
            onOrderCreated(currentOrder.id);
          }
        }
      } else {
        // Create new order (for parcel orders or when no existing order)
        const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
          const item = data.menuItems.find((item: MenuItem) => item.id === itemId);
          return {
            menuItemId: itemId,
            quantity,
            price: item?.price || 0,
            status: 'pending'
          };
        });

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

        const orderInput = {
          restaurantId,
          tableNumber: isParcelOrder ? undefined : tableNumber,
          orderType: isParcelOrder ? (orderType || 'takeout') : 'dine-in',
          items: orderItems,
          totalAmount: getTotalPrice(),
          status: 'pending',
          sessionId: isParcelOrder ? sessionId : undefined,
          userId: currentUser?.id,
          customerName: currentUser?.name,
          customerPhone: currentUser?.mobileNumber
        };

        setIsOrderUpdate(false);
        const result = await createOrder({
          variables: { input: orderInput }
        });

        if (result.data?.createOrder) {
          setCart({});
          setOrderSuccess(true);
          setOrderError(null);
          
          // Refetch the order data to show the newly created order
          if (refetch) {
            refetch();
          }
          
          // Notify parent component that order was created
          if (onOrderCreated) {
            onOrderCreated(result.data.createOrder.id);
          }
        }
      }
    } catch (err) {
      console.error('Order processing error:', err);
      setOrderError(err instanceof Error ? err.message : 'Failed to process order');
    }
  };


  const getCartQuantity = (itemId: string) => cart[itemId] || 0;

  const getTotalItems = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const getTotalPrice = () => {
    if (!data?.menuItems) return 0;
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = data.menuItems.find((item: MenuItem) => item.id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  const categories: string[] = data?.menuItems 
    ? ['all', ...new Set(data.menuItems.map((item: MenuItem) => item.category))] as string[]
    : ['all'];

  const filteredItems = data?.menuItems?.filter((item: MenuItem) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory && item.available;
  }) || [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load menu items. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {isParcelOrder 
          ? `Menu - ${orderType === 'takeout' ? 'Takeout' : 'Delivery'} Order`
          : `Menu - Table #${tableNumber}`
        }
      </Typography>

      {/* Current Order Summary */}
      {currentOrderData && (
        <Paper sx={{ p: 3, mb: 3, backgroundColor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ShoppingCartIcon sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="h6" color="success.dark">
              Current Order
            </Typography>
            <Chip 
              label={currentOrderData.status} 
              size="small" 
              sx={{ 
                ml: 2,
                backgroundColor: getStatusChipColor(currentOrderData.status).bgcolor,
                color: getStatusChipColor(currentOrderData.status).color,
                border: `1px solid ${getStatusChipColor(currentOrderData.status).border}`,
                fontWeight: 500
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
              Order #{currentOrderData.id.slice(-6)}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              px: 2,
              py: 0.5,
              backgroundColor: 'success.100',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: 'success.300'
            }}>
              <Typography variant="body1" color="success.dark" sx={{ fontWeight: 500 }}>
                {currentOrderData.items.length} item{currentOrderData.items.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              px: 2,
              py: 0.5,
              backgroundColor: 'primary.100',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: 'primary.300'
            }}>
              <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 600 }}>
                ${currentOrderData.totalAmount.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          <List dense>
            {currentOrderData.items.map((item: any, index: number) => {
              const menuItem = data?.menuItems?.find((menuItem: MenuItem) => menuItem.id === item.menuItemId);
              const currentQuantity = getModifiedOrderItemQuantity(item.menuItemId, item.quantity);
              const isRemoved = modifiedOrderItems[item.menuItemId] === 0;
              
              if (isRemoved) return null; // Don't render removed items
              
              const itemStatus = item.status || 'pending';
              const canEdit = itemStatus === 'pending';
              
              return (
                <ListItem key={index} sx={{ px: 0, opacity: isRemoved ? 0.5 : 1 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {menuItem?.name || `Item ${item.menuItemId}`}
                        </Typography>
                        <Chip 
                          label={itemStatus} 
                          size="small" 
                          sx={{ 
                            fontSize: '0.7rem', 
                            height: '20px',
                            backgroundColor: getStatusChipColor(itemStatus).bgcolor,
                            color: getStatusChipColor(itemStatus).color,
                            border: `1px solid ${getStatusChipColor(itemStatus).border}`,
                            fontWeight: 500
                          }}
                        />
                      </Box>
                    }
                    secondary={`$${item.price.toFixed(2)} each`}
                    sx={{ flex: 1 }}
                  />
                  
                  {canEdit && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const currentModification = modifiedOrderItems[item.menuItemId];
                          const baseQuantity = currentModification !== undefined ? currentModification : item.quantity;
                          handleModifyOrderItem(item.menuItemId, baseQuantity - 1);
                        }}
                        disabled={currentQuantity <= 1}
                        sx={{ minWidth: '32px', height: '32px', p: 0, borderRadius: '50%' }}
                      >
                        <RemoveIcon fontSize="small" />
                      </Button>
                      
                      <Typography variant="body2" sx={{ minWidth: '2rem', textAlign: 'center', fontWeight: 'bold' }}>
                        {currentQuantity}
                      </Typography>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const currentModification = modifiedOrderItems[item.menuItemId];
                          const baseQuantity = currentModification !== undefined ? currentModification : item.quantity;
                          handleModifyOrderItem(item.menuItemId, baseQuantity + 1);
                        }}
                        sx={{ minWidth: '32px', height: '32px', p: 0, borderRadius: '50%' }}
                      >
                        <AddIcon fontSize="small" />
                      </Button>
                    </Box>
                  )}
                  
                  <Typography variant="body1" fontWeight="bold" sx={{ ml: 2, minWidth: '60px', textAlign: 'right' }}>
                    ${(item.price * currentQuantity).toFixed(2)}
                  </Typography>
                  
                  {canEdit && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleRemoveOrderItem(item.menuItemId)}
                      sx={{ minWidth: '32px', height: '32px', p: 0, borderRadius: '50%', ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Button>
                  )}
                </ListItem>
              );
            })}
          </List>
          
          {hasOrderModifications && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'success.200' }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                fullWidth
                onClick={handleSubmitClick}
                disabled={orderLoading || updateLoading}
                startIcon={(orderLoading || updateLoading) ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
                sx={{ py: 1.5 }}
              >
                {(orderLoading || updateLoading) ? 'Updating Order...' : 'Update Order'}
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* New Items Order Summary */}
      {getTotalItems() > 0 && (
        <Paper sx={{ p: 3, mb: 3, backgroundColor: 'primary.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ShoppingCartIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              {currentOrderData ? 'Add to Order' : 'Order Summary'}
            </Typography>
          </Box>
          
          <List dense>
            {Object.entries(cart).map(([itemId, quantity]) => {
              const item = data?.menuItems?.find((item: MenuItem) => item.id === itemId);
              if (!item) return null;
              
              return (
                <ListItem key={itemId} sx={{ px: 0 }}>
                  <ListItemText
                    primary={item.name}
                    secondary={`$${item.price.toFixed(2)} each`}
                    sx={{ flex: 1 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleDecreaseQuantity(itemId)}
                      sx={{ minWidth: '32px', height: '32px', p: 0 }}
                    >
                      <RemoveIcon fontSize="small" />
                    </Button>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        minWidth: '24px', 
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}
                    >
                      {quantity}
                    </Typography>
                    
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddToCart(itemId)}
                      sx={{ minWidth: '32px', height: '32px', p: 0 }}
                    >
                      <AddIcon fontSize="small" />
                    </Button>
                    
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      sx={{ minWidth: '60px', textAlign: 'right' }}
                    >
                      ${(item.price * quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </ListItem>
              );
            })}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Total ({getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''})
          </Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">
              ${getTotalPrice().toFixed(2)}
          </Typography>
          </Box>
          
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmitClick}
            disabled={orderLoading || updateLoading}
            startIcon={(orderLoading || updateLoading) ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
            sx={{ py: 1.5 }}
          >
            {(orderLoading || updateLoading) ? 'Processing Order...' : 
             (currentOrderData ? 'Update Order' : 'Submit Order')}
          </Button>
        </Paper>
      )}

      {/* Search and Filter */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.map((category) => (
            <Chip
              key={category}
              label={category.charAt(0).toUpperCase() + category.slice(1)}
              onClick={() => setSelectedCategory(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>



      {/* Menu Items */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(auto-fit, minmax(280px, 1fr))',
          md: 'repeat(auto-fit, minmax(280px, 1fr))',
          lg: 'repeat(auto-fit, minmax(280px, 1fr))',
          xl: 'repeat(auto-fit, minmax(280px, 1fr))'
        },
        gap: 2,
        width: '100%',
        minWidth: 0,
        overflow: 'visible',
        gridAutoRows: 'minmax(400px, auto)'
      }}>
        {filteredItems.map((item: MenuItem) => (
            <Card 
              key={item.id}
              sx={{ 
                height: '100%', 
                width: '100%',
                minWidth: '280px',
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              {item.imageUrl && (
                <CardMedia
                  component="img"
                  height="200"
                  image={item.imageUrl}
                  alt={item.name}
                  sx={{ 
                    objectFit: 'cover',
                    width: '100%'
                  }}
                />
              )}
              <CardContent sx={{ 
                flexGrow: 1, 
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden'
              }}>
                <Typography 
                  variant="h6" 
                  component="h3" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    lineHeight: 1.3,
                    mb: 1,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '2.6rem',
                    maxHeight: '2.6rem'
                  }}
                >
                  {item.name}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  paragraph
                  sx={{ 
                    flexGrow: 1,
                    fontSize: '0.875rem',
                    lineHeight: 1.4,
                    mb: 2,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '3.15rem',
                    maxHeight: '3.15rem',
                    wordBreak: 'break-word'
                  }}
                >
                  {item.description}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mt: 'auto'
                }}>
                  <Typography 
                    variant="h6" 
                    color="primary"
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '1.2rem'
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </Typography>
                  <Chip
                    label={item.category}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.75rem',
                      height: '24px'
                    }}
                  />
                </Box>
              </CardContent>
              <CardActions sx={{ p: 1.5, px: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 1,
                  flexWrap: 'nowrap'
                }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleRemoveFromCart(item.id)}
                    disabled={getCartQuantity(item.id) === 0}
                    sx={{ 
                      minWidth: '40px',
                      width: '40px',
                      height: '40px',
                      p: 0,
                      borderRadius: '50%'
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </Button>
                  
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      minWidth: '2rem', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      color: 'primary.main',
                      px: 1
                    }}
                  >
                    {getCartQuantity(item.id)}
                  </Typography>
                  
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleAddToCart(item.id)}
                    sx={{ 
                      minWidth: '40px',
                      width: '40px',
                      height: '40px',
                      p: 0,
                      borderRadius: '50%'
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </Button>
                </Box>
              </CardActions>
            </Card>
        ))}
      </Box>

      {filteredItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No menu items found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filter criteria
          </Typography>
        </Box>
      )}

      {/* Success and Error Notifications */}
      <Snackbar
        open={orderSuccess}
        autoHideDuration={4000}
        onClose={() => setOrderSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOrderSuccess(false)} severity="success" sx={{ width: '100%' }}>
          {isOrderUpdate ? 'Order updated successfully!' : 'Order created successfully!'}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!orderError}
        autoHideDuration={6000}
        onClose={() => setOrderError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOrderError(null)} severity="error" sx={{ width: '100%' }}>
          {orderError}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentOrderData ? 'Update Order' : 'Submit Order'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            {currentOrderData 
              ? (hasOrderModifications 
                  ? 'Are you sure you want to update your order with these changes?'
                  : 'Are you sure you want to add these items to your existing order?'
                )
              : 'Are you sure you want to submit this order?'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hasOrderModifications && currentOrderData
              ? 'This will update your existing order with the modifications made.'
              : `Total: ${getTotalItems()} item${getTotalItems() !== 1 ? 's' : ''} - $${getTotalPrice().toFixed(2)}`
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelOrderModifications} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmOrder} 
            variant="contained" 
            color="primary"
            disabled={orderLoading || updateLoading}
          >
            {currentOrderData ? 'Update Order' : 'Submit Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
