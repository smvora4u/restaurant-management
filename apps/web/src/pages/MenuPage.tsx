import React, { useState, useRef } from 'react';
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
  TextField,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CloudUpload,
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
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get backend URL from GraphQL URI
  const getBackendUrl = () => {
    const graphqlUri = (import.meta as any).env?.VITE_GRAPHQL_URI || 
                      (import.meta as any).env?.VITE_API_URL || 
                      'http://localhost:4000/graphql';
    return graphqlUri.replace('/graphql', '');
  };

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
      setImagePreview(item.imageUrl || null);
      setSelectedFile(null);
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
      setImagePreview(null);
      setSelectedFile(null);
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
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear URL field when file is selected
      setFormData(prev => ({ ...prev, imageUrl: '' }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      const fullUrl = `${backendUrl}${data.url}`;
      setFormData(prev => ({ ...prev, imageUrl: fullUrl }));
      setSelectedFile(null);
      setImagePreview(fullUrl);
    } catch (error: any) {
      alert(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    // If a file is selected but not uploaded yet, upload it first
    let finalImageUrl = formData.imageUrl;
    
    if (selectedFile && !formData.imageUrl) {
      setUploading(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedFile);

        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/upload/image`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();
        finalImageUrl = `${backendUrl}${data.url}`;
      } catch (error: any) {
        alert(error.message || 'Failed to upload image');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const input = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      category: formData.category,
      available: formData.available,
      imageUrl: finalImageUrl || null,
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
            {/* Image Upload Section */}
            <Box>
              <InputLabel sx={{ mb: 1 }}>Image</InputLabel>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Image Preview */}
                {imagePreview && (
                  <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Preview"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}

                {/* File Upload */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="image-upload-input"
                  />
                  <label htmlFor="image-upload-input">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUpload />}
                      disabled={uploading}
                    >
                      {selectedFile ? 'Change Image' : 'Upload Image'}
                    </Button>
                  </label>
                  {selectedFile && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedFile.name}
                    </Typography>
                  )}
                </Box>

                {/* Or URL Input */}
                <Box>
                  <TextField
                    fullWidth
                    label="Or enter image URL"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      handleInputChange('imageUrl', e.target.value);
                      if (e.target.value) {
                        setImagePreview(e.target.value);
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }
                    }}
                    placeholder="https://example.com/image.jpg"
                    helperText="Enter a URL or upload an image from your device"
                  />
                </Box>
              </Box>
            </Box>
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
