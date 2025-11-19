import { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tooltip,
  Card,
  CardContent,
  CardMedia,
  InputAdornment,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Remove,
  Search,
  Image as ImageIcon
} from '@mui/icons-material';
import { formatCurrencyFromRestaurant } from '../../utils/currency';
import { ItemStatus, getStatusColor } from '../../utils/statusColors';
import { ConfirmationDialog } from '../common';

interface OrderItemsTableProps {
  items: any[];
  restaurant: any;
  menuItems: any[];
  onUpdateItemStatus: (itemIndex: number, status: ItemStatus, quantity?: number) => void;
  onUpdateItemQuantity: (itemIndex: number, newQuantity: number) => void;
  onRemoveItem: (itemIndex: number) => void;
  onAddItem: (menuItemId: string, quantity: number, specialInstructions: string) => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  restrictCancelToPending?: boolean;
}


const getStatusIcon = (status: ItemStatus) => {
  switch (status) {
    case 'cancelled': return '✗';
    case 'preparing': return '⏱';
    case 'ready': return '🍽';
    case 'served': return '✓';
    default: return '📋';
  }
};

export default function OrderItemsTable({
  items,
  restaurant,
  menuItems,
  onUpdateItemStatus,
  onUpdateItemQuantity,
  onRemoveItem,
  onAddItem,
  isEditing = false,
  onToggleEdit,
  hasUnsavedChanges = false,
  isSaving = false,
  restrictCancelToPending = false
}: OrderItemsTableProps) {
  const [itemStatusDialogOpen, setItemStatusDialogOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [newItemStatus, setNewItemStatus] = useState<ItemStatus>('pending');
  const [statusUpdateQuantity, setStatusUpdateQuantity] = useState<string>('1');
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState<string>('1');
  const [newItemSpecialInstructions, setNewItemSpecialInstructions] = useState('');
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const theme = useTheme();
  // Full screen on mobile, tablets, and small laptops (up to md breakpoint)
  const isSmallDevice = useMediaQuery(theme.breakpoints.down('md'));

  const getMenuItemDetails = (menuItemId: string) => {
    return menuItems.find((item: any) => item.id === menuItemId);
  };

  const handleConfirmDelete = () => {
    if (itemToDeleteIndex !== null) {
      onRemoveItem(itemToDeleteIndex);
      setDeleteConfirmationOpen(false);
      setItemToDeleteIndex(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmationOpen(false);
    setItemToDeleteIndex(null);
  };

  const getItemNameForDelete = () => {
    if (itemToDeleteIndex === null) return '';
    const item = items[itemToDeleteIndex];
    if (!item) return '';
    const menuItem = getMenuItemDetails(item.menuItemId);
    return menuItem?.name || 'this item';
  };

  const handleItemStatusClick = (itemIndex: number) => {
    setSelectedItemIndex(itemIndex);
    setNewItemStatus(items[itemIndex].status);
    setStatusUpdateQuantity(items[itemIndex].quantity.toString());
    setItemStatusDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    if (selectedItemIndex !== null) {
      const quantity = parseInt(statusUpdateQuantity) || 1;
      onUpdateItemStatus(selectedItemIndex, newItemStatus, quantity);
      setItemStatusDialogOpen(false);
      setSelectedItemIndex(null);
    }
  };

  const handleAddItem = () => {
    const quantity = parseInt(newItemQuantity) || 1;
    if (selectedMenuItemId && quantity > 0) {
      const menuItem = getMenuItemDetails(selectedMenuItemId);
      if (!menuItem?.available) {
        return; // silently ignore or optionally show feedback via parent in future
      }
      onAddItem(selectedMenuItemId, quantity, newItemSpecialInstructions);
      setAddItemDialogOpen(false);
      setSelectedMenuItemId('');
      setNewItemQuantity('1');
      setNewItemSpecialInstructions('');
      setSearchQuery('');
      setSelectedCategory('all');
    }
  };

  // Get unique categories from menu items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((item: any) => {
      if (item.category) {
        cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  }, [menuItems]);

  // Filter and group menu items
  const filteredAndGroupedItems = useMemo(() => {
    let filtered = menuItems.filter((item: any) => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Group by category
    const grouped: Record<string, any[]> = {};
    filtered.forEach((item: any) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  }, [menuItems, searchQuery, selectedCategory]);

  const handleMenuItemSelect = (menuItemId: string) => {
    setSelectedMenuItemId(menuItemId);
  };

  const handleQuantityChange = (itemIndex: number, newQuantity: number) => {
    if (newQuantity > 0) {
      onUpdateItemQuantity(itemIndex, newQuantity);
    }
  };

  return (
    <Box>
      {/* Table Header with Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Order Items ({items.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onToggleEdit && (
            <Button
              variant={isEditing ? 'contained' : 'outlined'}
              onClick={onToggleEdit}
              startIcon={<Edit />}
            >
              {isEditing ? 'Done Editing' : 'Edit Items'}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setAddItemDialogOpen(true)}
          >
            Add Item
          </Button>
        </Box>
      </Box>

      {/* Items Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Subtotal</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Special Instructions</TableCell>
              {isEditing && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const menuItem = getMenuItemDetails(item.menuItemId);
              return (
                <TableRow key={`${item.menuItemId}-${index}`}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {menuItem?.name || `Unknown Item (${item.menuItemId.slice(-8)})`}
                      </Typography>
                      {menuItem?.description && (
                        <Typography variant="caption" color="text.secondary">
                          {menuItem.description}
                        </Typography>
                      )}
                      {!menuItem && (
                        <Typography variant="caption" color="error">
                          Menu item no longer exists
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Remove />
                        </IconButton>
                        <Typography variant="body1" sx={{ minWidth: 30, textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(index, item.quantity + 1)}
                        >
                          <Add />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography variant="body1">{item.quantity}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrencyFromRestaurant(item.price, restaurant)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight={600}>
                      {formatCurrencyFromRestaurant(item.price * item.quantity, restaurant)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<span>{getStatusIcon(item.status)}</span>}
                      label={item.status}
                      color={getStatusColor(item.status)}
                      size="small"
                      clickable
                      onClick={() => handleItemStatusClick(index)}
                    />
                  </TableCell>
                  <TableCell>
                    {item.specialInstructions ? (
                      <Typography variant="body2" sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.specialInstructions}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None
                      </Typography>
                    )}
                  </TableCell>
                  {isEditing && (
                    <TableCell>
                      {(() => {
                        const isDeleteDisabled = restrictCancelToPending && item.status !== 'pending';
                        return (
                          <Tooltip 
                            title={isDeleteDisabled ? 'Cannot delete item once status changes from pending' : 'Delete item'}
                            arrow
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  if (isDeleteDisabled) {
                                    return; // Don't show dialog for non-pending items when restriction is enabled
                                  }
                                  setItemToDeleteIndex(index);
                                  setDeleteConfirmationOpen(true);
                                }}
                                disabled={isDeleteDisabled}
                              >
                                <Delete />
                              </IconButton>
                            </span>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Item Status Update Dialog */}
      <Dialog open={itemStatusDialogOpen} onClose={() => setItemStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Item Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={newItemStatus}
                onChange={(e) => setNewItemStatus(e.target.value as ItemStatus)}
                label="Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="served">Served</MenuItem>
                {/* Allow cancelling only from pending or confirmed */}
                <MenuItem 
                  value="cancelled" 
                  disabled={
                    selectedItemIndex !== null 
                      ? !['pending', 'confirmed'].includes(items[selectedItemIndex].status)
                      : true
                  }
                >
                  Cancelled
                </MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Quantity to Update"
              type="text"
              value={statusUpdateQuantity}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for editing, or valid numbers
                if (value === '' || /^\d+$/.test(value)) {
                  setStatusUpdateQuantity(value);
                }
              }}
              onBlur={(e) => {
                // Ensure minimum value of 1 when field loses focus
                const numValue = parseInt(e.target.value) || 1;
                const maxValue = selectedItemIndex !== null ? items[selectedItemIndex].quantity : 1;
                const finalValue = Math.max(1, Math.min(numValue, maxValue));
                setStatusUpdateQuantity(finalValue.toString());
              }}
              margin="normal"
              inputProps={{ 
                maxLength: 10,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained">
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Add Item Dialog */}
      <Dialog 
        open={addItemDialogOpen} 
        onClose={() => {
          setAddItemDialogOpen(false);
          setSearchQuery('');
          setSelectedCategory('all');
          setSelectedMenuItemId('');
          setNewItemQuantity('1');
        }} 
        maxWidth="lg" 
        fullWidth
        fullScreen={isSmallDevice}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Add New Item</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedMenuItemId && (
                <Chip 
                  label="Item Selected" 
                  color="primary" 
                  size="small"
                />
              )}
              {/* Search Bar in Header */}
              <TextField
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  width: { xs: 150, sm: 200, md: 250 },
                  '& .MuiOutlinedInput-root': {
                    height: 36
                  }
                }}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent 
          dividers
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            p: 0,
            overflow: 'hidden'
          }}
        >
          {/* Fixed Header Section - Only Category Tabs */}
          <Box sx={{ px: 3, pt: 2, pb: 1, flexShrink: 0 }}>
            {/* Category Filter Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={selectedCategory}
                onChange={(_e, newValue) => setSelectedCategory(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: -1 }}
              >
                <Tab label="All" value="all" />
                {categories.map((category) => (
                  <Tab key={category} label={category} value={category} />
                ))}
              </Tabs>
            </Box>
          </Box>

          {/* Scrollable Menu Items Grid */}
          <Box 
            sx={{ 
              flex: 1,
              overflow: 'auto',
              px: 3,
              pb: 3
            }}
          >
            {Object.keys(filteredAndGroupedItems).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No items found
                </Typography>
              </Box>
            ) : (
              Object.entries(filteredAndGroupedItems).map(([category, items]) => (
                <Box key={category} sx={{ mb: 4 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      color: 'primary.main',
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      pb: 0.5
                    }}
                  >
                    {category}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)'
                      },
                      gap: 2
                    }}
                  >
                    {items.map((item: any) => (
                      <Card
                        key={item.id}
                        onClick={() => handleMenuItemSelect(item.id)}
                        sx={{
                          cursor: item.available ? 'pointer' : 'not-allowed',
                          height: '100%',
                          border: selectedMenuItemId === item.id ? 2 : 1,
                          borderColor: selectedMenuItemId === item.id ? 'primary.main' : 'divider',
                          backgroundColor: selectedMenuItemId === item.id ? 'action.selected' : 'background.paper',
                          opacity: item.available ? 1 : 0.6,
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: item.available ? 'translateY(-4px)' : 'none',
                            boxShadow: item.available ? 4 : 1,
                          }
                        }}
                      >
                          <CardMedia
                            component="div"
                            sx={{
                              height: 140,
                              backgroundColor: 'grey.200',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}
                          >
                            {item.imageUrl ? (
                              <Box
                                component="img"
                                src={item.imageUrl}
                                alt={item.name}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <ImageIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                            )}
                            {!item.available && (
                              <Chip
                                label="Unavailable"
                                color="error"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8
                                }}
                              />
                            )}
                            {selectedMenuItemId === item.id && (
                              <Chip
                                label="Selected"
                                color="primary"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8
                                }}
                              />
                            )}
                          </CardMedia>
                          <CardContent>
                            <Typography 
                              variant="h6" 
                              component="div"
                              sx={{
                                fontWeight: 600,
                                mb: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}
                            >
                              {item.name}
                            </Typography>
                            {item.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mb: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  minHeight: '2.5em'
                                }}
                              >
                                {item.description}
                              </Typography>
                            )}
                            <Typography
                              variant="h6"
                              color="primary"
                              sx={{ fontWeight: 700 }}
                            >
                              {formatCurrencyFromRestaurant(item.price, restaurant)}
                            </Typography>
                          </CardContent>
                        </Card>
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          {/* Left side: Quantity and Special Instructions */}
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              flex: 1,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            <TextField
              label="Quantity"
              type="text"
              value={newItemQuantity}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for editing, or valid numbers
                if (value === '' || /^\d+$/.test(value)) {
                  setNewItemQuantity(value);
                }
              }}
              onBlur={(e) => {
                // Ensure minimum value of 1 when field loses focus
                const numValue = parseInt(e.target.value) || 1;
                setNewItemQuantity(Math.max(1, numValue).toString());
              }}
              inputProps={{ 
                min: 1,
                maxLength: 10,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
              size="small"
              sx={{ 
                minWidth: { xs: '100%', sm: 120 },
                flex: { xs: '1 1 auto', sm: '0 0 auto' }
              }}
              disabled={!selectedMenuItemId}
            />
            <TextField
              label="Special Instructions"
              value={newItemSpecialInstructions}
              onChange={(e) => setNewItemSpecialInstructions(e.target.value)}
              multiline
              rows={1}
              size="small"
              placeholder="e.g., No onions, extra cheese..."
              sx={{ 
                flex: { xs: '1 1 auto', sm: '1 1 200px' },
                minWidth: { xs: '100%', sm: 200 }
              }}
              disabled={!selectedMenuItemId}
            />
          </Box>

          {/* Right side: Buttons */}
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1,
              flexDirection: { xs: 'row', sm: 'row' },
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-end', sm: 'flex-end' }
            }}
          >
            <Button 
              onClick={() => {
                setAddItemDialogOpen(false);
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedMenuItemId('');
                setNewItemQuantity('1');
                setNewItemSpecialInstructions('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddItem} 
              variant="contained" 
              disabled={!selectedMenuItemId}
              startIcon={<Add />}
            >
              Add Item
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmationOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${getItemNameForDelete()}" from this order? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
      />
    </Box>
  );
}
