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
  useMediaQuery,
  Autocomplete,
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

export interface AddItemEntry {
  menuItemId: string;
  quantity: number;
  specialInstructions: string;
}

interface OrderItemsTableProps {
  items: any[];
  restaurant: any;
  menuItems: any[];
  onUpdateItemStatus: (itemIndex: number, status: ItemStatus, quantity?: number) => void;
  onUpdateItemQuantity: (itemIndex: number, newQuantity: number) => void;
  onRemoveItem: (itemIndex: number) => void;
  onAddItems: (items: AddItemEntry[]) => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  restrictCancelToPending?: boolean;
  orderStatus?: string;
  hideItemImageInAddDialog?: boolean;
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
  onAddItems,
  isEditing = false,
  onToggleEdit,
  hasUnsavedChanges: _hasUnsavedChanges = false,
  isSaving: _isSaving = false,
  restrictCancelToPending = false,
  orderStatus,
  hideItemImageInAddDialog = false
}: OrderItemsTableProps) {
  const [itemStatusDialogOpen, setItemStatusDialogOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [newItemStatus, setNewItemStatus] = useState<ItemStatus>('pending');
  const [statusUpdateQuantity, setStatusUpdateQuantity] = useState<string>('1');
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; specialInstructions: string }>>({});
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const theme = useTheme();
  // Full screen on mobile, tablets, and small laptops (up to md breakpoint)
  const isSmallDevice = useMediaQuery(theme.breakpoints.down('md'));

  // Check if order can be edited (not cancelled or completed)
  const isOrderEditable = orderStatus !== 'cancelled' && orderStatus !== 'completed';

  const getMenuItemId = (menuItemId: string | { id?: string }) =>
    typeof menuItemId === 'string' ? menuItemId : menuItemId?.id ?? '';

  const getMenuItemDetails = (menuItemId: string | { id?: string }) => {
    const id = getMenuItemId(menuItemId);
    return menuItems.find((item: any) => item.id === id);
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
    const menuItem = getMenuItemDetails(getMenuItemId(item.menuItemId));
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

  const handleAddItems = () => {
    const entries: AddItemEntry[] = [];
    for (const [menuItemId, { quantity, specialInstructions }] of Object.entries(selectedItems)) {
      if (quantity > 0) {
        const menuItem = getMenuItemDetails(menuItemId);
        if (!menuItem?.available) continue;
        entries.push({ menuItemId, quantity, specialInstructions });
      }
    }
    if (entries.length > 0) {
      onAddItems(entries);
      setAddItemDialogOpen(false);
      setSelectedItems({});
      setSearchQuery('');
      setSelectedCategory('all');
    }
  };

  const handleMenuItemSelect = (menuItemId: string) => {
    setSelectedItems(prev => {
      if (prev[menuItemId]) {
        const next = { ...prev };
        delete next[menuItemId];
        return next;
      }
      return { ...prev, [menuItemId]: { quantity: 1, specialInstructions: '' } };
    });
  };

  const handleSelectedItemQuantityChange = (menuItemId: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[menuItemId];
      if (!current) return prev;
      const nextQty = Math.max(0, current.quantity + delta);
      if (nextQty <= 0) {
        const next = { ...prev };
        delete next[menuItemId];
        return next;
      }
      return { ...prev, [menuItemId]: { ...current, quantity: nextQty } };
    });
  };

  const INSTRUCTIONS_DELIMITER = '; ';
  const itemInstructions: string[] = restaurant?.settings?.itemInstructions ?? [];

  const handleSelectedItemInstructionsChange = (menuItemId: string, selected: string[]) => {
    const value = selected.join(INSTRUCTIONS_DELIMITER);
    setSelectedItems(prev => {
      const current = prev[menuItemId];
      if (!current) return prev;
      return { ...prev, [menuItemId]: { ...current, specialInstructions: value } };
    });
  };

  const selectedItemsCount = Object.values(selectedItems).filter(s => s.quantity > 0).length;
  const hasSelectedItems = selectedItemsCount > 0;

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
            <Tooltip title={!isOrderEditable ? 'Cannot edit cancelled or completed orders' : ''}>
              <span>
                <Button
                  variant={isEditing ? 'contained' : 'outlined'}
                  onClick={onToggleEdit}
                  startIcon={<Edit />}
                  disabled={!isOrderEditable}
                >
                  {isEditing ? 'Done Editing' : 'Edit Items'}
                </Button>
              </span>
            </Tooltip>
          )}
          <Tooltip title={!isOrderEditable ? 'Cannot add items to cancelled or completed orders' : ''}>
            <span>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setAddItemDialogOpen(true)}
                disabled={!isOrderEditable}
              >
                Add Item
              </Button>
            </span>
          </Tooltip>
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
                <TableRow key={`${getMenuItemId(item.menuItemId)}-${index}`}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {menuItem?.name || `Unknown Item (${getMenuItemId(item.menuItemId).slice(-8)})`}
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
                          disabled={item.quantity <= 1 || !isOrderEditable}
                        >
                          <Remove />
                        </IconButton>
                        <Typography variant="body1" sx={{ minWidth: 30, textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          disabled={!isOrderEditable}
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
                    <Tooltip title={!isOrderEditable ? 'Cannot update item status for cancelled or completed orders' : ''}>
                      <span>
                        <Chip
                          icon={<span>{getStatusIcon(item.status)}</span>}
                          label={item.status}
                          color={getStatusColor(item.status)}
                          size="small"
                          clickable={isOrderEditable}
                          onClick={() => isOrderEditable && handleItemStatusClick(index)}
                          sx={{ 
                            cursor: isOrderEditable ? 'pointer' : 'default',
                            opacity: isOrderEditable ? 1 : 0.7
                          }}
                        />
                      </span>
                    </Tooltip>
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
                        const isDeleteDisabled = !isOrderEditable || (restrictCancelToPending && item.status !== 'pending');
                        const deleteTooltip = !isOrderEditable 
                          ? 'Cannot delete items from cancelled or completed orders'
                          : (restrictCancelToPending && item.status !== 'pending')
                          ? 'Cannot delete item once status changes from pending'
                          : 'Delete item';
                        return (
                          <Tooltip 
                            title={deleteTooltip}
                            arrow
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  if (isDeleteDisabled) {
                                    return; // Don't show dialog for disabled items
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
          setSelectedItems({});
        }} 
        maxWidth="lg" 
        fullWidth
        fullScreen={isSmallDevice}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Add New Items</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {hasSelectedItems && (
                <Chip 
                  label={`${selectedItemsCount} item${selectedItemsCount !== 1 ? 's' : ''} selected`}
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
                    {items.map((item: any) => {
                      const sel = selectedItems[item.id];
                      const isSelected = !!sel;
                      const qty = sel?.quantity ?? 0;
                      return (
                      <Card
                        key={item.id}
                        onClick={() => item.available && handleMenuItemSelect(item.id)}
                        sx={{
                          cursor: item.available ? 'pointer' : 'not-allowed',
                          height: '100%',
                          border: isSelected ? 2 : 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                          opacity: item.available ? 1 : 0.6,
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: item.available ? 'translateY(-4px)' : 'none',
                            boxShadow: item.available ? 4 : 1,
                          }
                        }}
                      >
                          {!hideItemImageInAddDialog && (
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
                            {isSelected && (
                              <Chip
                                label={`Qty: ${qty}`}
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
                          )}
                          <CardContent sx={{ position: 'relative', ...(hideItemImageInAddDialog && { pt: 2, pr: 10 }) }}>
                            {hideItemImageInAddDialog && (
                              <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                                {!item.available && (
                                  <Chip
                                    label="Unavailable"
                                    color="error"
                                    size="small"
                                  />
                                )}
                                {isSelected && (
                                  <Chip
                                    label={`Qty: ${qty}`}
                                    color="primary"
                                    size="small"
                                  />
                                )}
                              </Box>
                            )}
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
                            {isSelected ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }} onClick={(e) => e.stopPropagation()}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleSelectedItemQuantityChange(item.id, -1)}
                                  sx={{ bgcolor: 'action.hover' }}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
                                  {qty}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleSelectedItemQuantityChange(item.id, 1)}
                                  sx={{ bgcolor: 'action.hover' }}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                                <Typography variant="body2" color="primary" sx={{ ml: 1, fontWeight: 600 }}>
                                  {formatCurrencyFromRestaurant(item.price * qty, restaurant)}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography
                                variant="h6"
                                color="primary"
                                sx={{ fontWeight: 700 }}
                              >
                                {formatCurrencyFromRestaurant(item.price, restaurant)}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                    );})}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexDirection: 'column', gap: 2, alignItems: 'stretch' }}>
          {/* Selected items list with per-item instructions (Option C - Hybrid) */}
          {hasSelectedItems && (
            <Box
              sx={{
                width: '100%',
                maxHeight: 200,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                bgcolor: 'grey.50'
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Selected items ({selectedItemsCount})
              </Typography>
              {Object.entries(selectedItems)
                .filter(([, s]) => s.quantity > 0)
                .map(([menuItemId, { quantity, specialInstructions }]) => {
                  const mi = getMenuItemDetails(menuItemId);
                  if (!mi) return null;
                  return (
                    <Box
                      key={menuItemId}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 0 }
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>
                        {mi.name} x{quantity}
                      </Typography>
                      <Typography variant="body2" color="primary" sx={{ minWidth: 60 }}>
                        {formatCurrencyFromRestaurant(mi.price * quantity, restaurant)}
                      </Typography>
                      {itemInstructions.length > 0 ? (
                        <Autocomplete
                          multiple
                          size="small"
                          options={itemInstructions}
                          value={specialInstructions
                            .split(INSTRUCTIONS_DELIMITER)
                            .filter(Boolean)
                            .filter((s) => itemInstructions.includes(s))}
                          onChange={(_, selected) => handleSelectedItemInstructionsChange(menuItemId, selected)}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select instructions" />
                          )}
                          sx={{ flex: 1, minWidth: 150 }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                          No instructions configured
                        </Typography>
                      )}
                    </Box>
                  );
                })}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setAddItemDialogOpen(false);
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedItems({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItems}
              variant="contained"
              disabled={!hasSelectedItems}
              startIcon={<Add />}
            >
              Add Items
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
