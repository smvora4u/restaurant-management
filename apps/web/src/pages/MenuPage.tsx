import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { FormDialog, AppSnackbar, FormField, ConfirmationDialog } from '../components/common';
import { useRestaurant, useCrudOperations } from '../hooks';
import { GET_MENU_ITEMS, CREATE_MENU_ITEM, UPDATE_MENU_ITEM, DELETE_MENU_ITEM } from '../graphql';
import { formatCurrencyFromRestaurant } from '../utils/currency';

const categories = [
  'Appetizers',
  'Main Course',
  'Desserts',
  'Beverages',
  'Salads',
  'Soups',
  'Pizza',
  'Pasta',
  'Seafood',
  'Vegetarian',
  'Vegan',
  'Kids Menu'
];

export default function MenuPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    available: true,
    imageUrl: '',
    ingredients: '',
    allergens: '',
    preparationTime: '',
  });

  // Custom hooks
  const { restaurant, getRestaurantId } = useRestaurant();
  const { 
    handleCreate, 
    handleUpdate, 
    handleDelete, 
    confirmDelete, 
    cancelDelete, 
    loading, 
    snackbar, 
    hideSnackbar, 
    deleteConfirm 
  } = useCrudOperations({
    createMutation: CREATE_MENU_ITEM,
    updateMutation: UPDATE_MENU_ITEM,
    deleteMutation: DELETE_MENU_ITEM,
    refetch: () => refetch(),
    entityName: 'Menu item',
    getRestaurantId,
  });

  // Queries
  const { data, loading: queryLoading, error, refetch } = useQuery(GET_MENU_ITEMS);
  const menuItems = data?.menuItems || [];

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price?.toString() || '',
        category: item.category || '',
        available: item.available ?? true,
        imageUrl: item.imageUrl || '',
        ingredients: item.ingredients?.join(', ') || '',
        allergens: item.allergens?.join(', ') || '',
        preparationTime: item.preparationTime?.toString() || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        available: true,
        imageUrl: '',
        ingredients: '',
        allergens: '',
        preparationTime: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      available: true,
      imageUrl: '',
      ingredients: '',
      allergens: '',
      preparationTime: '',
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const input = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      category: formData.category,
      available: formData.available,
      imageUrl: formData.imageUrl || null,
      ingredients: formData.ingredients ? formData.ingredients.split(',').map(i => i.trim()).filter(i => i) : [],
      allergens: formData.allergens ? formData.allergens.split(',').map(a => a.trim()).filter(a => a) : [],
      preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null,
    };

    if (editingItem) {
      await handleUpdate(editingItem.id, input);
    } else {
      await handleCreate(input);
    }

    handleCloseDialog();
  };

  const handleDeleteItem = async (id: string) => {
    await handleDelete(id);
  };

  if (queryLoading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert severity="error">
          Error loading menu items: {error.message}
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Menu Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Menu Item
          </Button>
        </Box>

        {/* Menu Items Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prep Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {menuItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No menu items found. Click "Add Menu Item" to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  menuItems
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.description || 'No description'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={item.category} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{formatCurrencyFromRestaurant(item.price, restaurant)}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.available ? 'Available' : 'Unavailable'}
                            color={item.available ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{item.preparationTime ? `${item.preparationTime} min` : 'N/A'}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                            <Edit />
                          </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={menuItems.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>

        {/* Add/Edit Dialog */}
        <FormDialog
          open={openDialog}
          onClose={handleCloseDialog}
          onSubmit={handleSubmit}
          title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          submitText={editingItem ? 'Update' : 'Create'}
          loading={loading}
          maxWidth="md"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormField
              type="text"
              name="name"
              label="Name"
              value={formData.name}
              onChange={(field, value) => handleInputChange(field, value)}
              required
            />
            <FormField
              type="text"
              name="description"
              label="Description"
              value={formData.description}
              onChange={(field, value) => handleInputChange(field, value)}
              multiline
              rows={3}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <FormField
                  type="number"
                  name="price"
                  label="Price"
                  value={formData.price}
                  onChange={(field, value) => handleInputChange(field, value)}
                  required
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FormField
                  type="select"
                  name="category"
                  label="Category"
                  value={formData.category}
                  onChange={(field, value) => handleInputChange(field, value)}
                  options={categories.map(cat => ({ value: cat, label: cat }))}
                  required
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <FormField
                  type="number"
                  name="preparationTime"
                  label="Preparation Time (minutes)"
                  value={formData.preparationTime}
                  onChange={(field, value) => handleInputChange(field, value)}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FormField
                  type="switch"
                  name="available"
                  label="Available"
                  value={formData.available}
                  onChange={(field, value) => handleInputChange(field, value)}
                />
              </Box>
            </Box>
            <FormField
              type="text"
              name="imageUrl"
              label="Image URL"
              value={formData.imageUrl}
              onChange={(field, value) => handleInputChange(field, value)}
            />
            <FormField
              type="text"
              name="ingredients"
              label="Ingredients (comma-separated)"
              value={formData.ingredients}
              onChange={(field, value) => handleInputChange(field, value)}
              placeholder="e.g., Chicken, Rice, Vegetables"
            />
            <FormField
              type="text"
              name="allergens"
              label="Allergens (comma-separated)"
              value={formData.allergens}
              onChange={(field, value) => handleInputChange(field, value)}
              placeholder="e.g., Nuts, Dairy, Gluten"
            />
          </Box>
        </FormDialog>

        {/* Snackbar */}
        <AppSnackbar
          open={snackbar.open}
          onClose={hideSnackbar}
          message={snackbar.message}
          severity={snackbar.severity}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteConfirm.open}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Menu Item"
          message={`Are you sure you want to delete this menu item? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="error"
          loading={loading}
        />
      </Box>
    </Layout>
  );
}
