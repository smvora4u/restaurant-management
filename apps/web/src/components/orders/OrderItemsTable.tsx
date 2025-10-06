import { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Remove,
  Update
} from '@mui/icons-material';
import { formatCurrencyFromRestaurant } from '../../utils/currency';
import { ItemStatus } from '../../utils/statusColors';

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
  onSaveChanges?: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  restrictCancelToPending?: boolean;
}

const getStatusColor = (status: ItemStatus) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'cancelled': return 'error';
    case 'preparing': return 'info';
    case 'ready': return 'primary';
    case 'confirmed': return 'secondary';
    case 'served': return 'success';
    default: return 'default';
  }
};

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
  onSaveChanges,
  hasUnsavedChanges = false,
  isSaving = false,
  restrictCancelToPending = false
}: OrderItemsTableProps) {
  const [itemStatusDialogOpen, setItemStatusDialogOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [newItemStatus, setNewItemStatus] = useState<ItemStatus>('pending');
  const [statusUpdateQuantity, setStatusUpdateQuantity] = useState(1);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemSpecialInstructions, setNewItemSpecialInstructions] = useState('');

  const getMenuItemDetails = (menuItemId: string) => {
    return menuItems.find((item: any) => item.id === menuItemId);
  };

  const handleItemStatusClick = (itemIndex: number) => {
    setSelectedItemIndex(itemIndex);
    setNewItemStatus(items[itemIndex].status);
    setStatusUpdateQuantity(items[itemIndex].quantity);
    setItemStatusDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    if (selectedItemIndex !== null) {
      onUpdateItemStatus(selectedItemIndex, newItemStatus, statusUpdateQuantity);
      setItemStatusDialogOpen(false);
      setSelectedItemIndex(null);
    }
  };

  const handleAddItem = () => {
    if (selectedMenuItemId && newItemQuantity > 0) {
      const menuItem = getMenuItemDetails(selectedMenuItemId);
      if (!menuItem?.available) {
        return; // silently ignore or optionally show feedback via parent in future
      }
      onAddItem(selectedMenuItemId, newItemQuantity, newItemSpecialInstructions);
      setAddItemDialogOpen(false);
      setSelectedMenuItemId('');
      setNewItemQuantity(1);
      setNewItemSpecialInstructions('');
    }
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
          {onSaveChanges && hasUnsavedChanges && (
            <Button
              variant="contained"
              startIcon={<Update />}
              onClick={onSaveChanges}
              color="success"
              size="small"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
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
                      <Tooltip 
                        title={(restrictCancelToPending && item.status !== 'pending') ? 'Cannot delete item once status changes from pending' : 'Delete item'}
                        arrow
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onRemoveItem(index)}
                            disabled={restrictCancelToPending ? (item.status !== 'pending') : false}
                          >
                            <Delete />
                          </IconButton>
                        </span>
                      </Tooltip>
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
              type="number"
              value={statusUpdateQuantity}
              onChange={(e) => setStatusUpdateQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              margin="normal"
              inputProps={{ min: 1, max: selectedItemIndex !== null ? items[selectedItemIndex].quantity : 1 }}
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

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Menu Item</InputLabel>
              <Select
                value={selectedMenuItemId}
                onChange={(e) => setSelectedMenuItemId(e.target.value)}
                label="Menu Item"
              >
                {menuItems.map((item: any) => (
                  <MenuItem key={item.id} value={item.id} disabled={!item.available}>
                    {item.name} - {formatCurrencyFromRestaurant(item.price, restaurant)} {item.available ? '' : '(Unavailable)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              margin="normal"
              inputProps={{ min: 1 }}
            />
            
            <TextField
              fullWidth
              label="Special Instructions"
              value={newItemSpecialInstructions}
              onChange={(e) => setNewItemSpecialInstructions(e.target.value)}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddItem} variant="contained" disabled={!selectedMenuItemId}>
            Add Item
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
