import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
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
  Collapse,
  MenuItem as MuiMenuItem,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CloudUpload,
  ExpandMore,
  ExpandLess,
  Category as CategoryIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { FormDialog, AppSnackbar, FormField, ConfirmationDialog } from '../components/common';
import { useRestaurant, useCrudOperations, useSnackbar } from '../hooks';
import {
  GET_MENU_ITEMS,
  GET_MENU_CATEGORIES,
  CREATE_MENU_ITEM,
  UPDATE_MENU_ITEM,
  DELETE_MENU_ITEM,
  CREATE_MENU_CATEGORY,
  UPDATE_MENU_CATEGORY,
  DELETE_MENU_CATEGORY,
} from '../graphql';
import { formatCurrencyFromRestaurant } from '../utils/currency';

interface MenuCategory {
  id: string;
  name: string;
  parentCategoryId: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function MenuPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
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
    categoryId: '',
    available: true,
    imageUrl: '',
    ingredients: '',
    allergens: '',
    preparationTime: '',
  });

  // Category management
  const [categorySectionOpen, setCategorySectionOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [quickAddCategoryOpen, setQuickAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>('');

  // Bulk edit state
  const [bulkEditData, setBulkEditData] = useState({
    categoryId: '' as string,
    applyCategory: false,
    available: true,
    applyAvailable: false,
    preparationTime: '' as string,
    applyPreparationTime: false,
    priceAdjustmentType: 'percentage' as 'percentage' | 'fixed',
    priceAdjustmentValue: '' as string,
    applyPriceAdjustment: false,
  });
  const [bulkEditLoading, setBulkEditLoading] = useState(false);

  // Custom hooks
  const { restaurant, getRestaurantId } = useRestaurant();
  const {
    snackbar: bulkSnackbar,
    showSuccess: showBulkSuccess,
    hideSnackbar: hideBulkSnackbar,
  } = useSnackbar();
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
  const { data: categoriesData, refetch: refetchCategories } = useQuery(GET_MENU_CATEGORIES);
  const menuItems = data?.menuItems || [];
  const menuCategories: MenuCategory[] = categoriesData?.menuCategories || [];

  const [createCategory] = useMutation(CREATE_MENU_CATEGORY, {
    onCompleted: () => refetchCategories(),
  });
  const [updateCategory] = useMutation(UPDATE_MENU_CATEGORY, {
    onCompleted: () => refetchCategories(),
  });
  const [deleteCategory] = useMutation(DELETE_MENU_CATEGORY, {
    onCompleted: () => refetchCategories(),
  });
  const [updateMenuItemMutation] = useMutation(UPDATE_MENU_ITEM);

  const parentCategories = menuCategories.filter((c) => !c.parentCategoryId);
  const subcategoriesByParent = menuCategories.reduce<Record<string, MenuCategory[]>>((acc, c) => {
    if (c.parentCategoryId) {
      acc[c.parentCategoryId] = acc[c.parentCategoryId] || [];
      acc[c.parentCategoryId].push(c);
    }
    return acc;
  }, {});

  const categoryOptionsForSelect = parentCategories.flatMap((parent) => {
    const subs = subcategoriesByParent[parent.id] || [];
    return [
      { value: parent.id, label: parent.name, isParent: true },
      ...subs.map((s) => ({ value: s.id, label: `  ${s.name}`, isParent: false })),
    ];
  });

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
        categoryId: item.categoryId || '',
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
        categoryId: '',
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
      categoryId: '',
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
    if (!formData.categoryId && categoryOptionsForSelect.length > 0) {
      alert('Please select a category');
      return;
    }
    if (!formData.categoryId && categoryOptionsForSelect.length === 0) {
      alert('Please add at least one category first using the "Add" button next to Category.');
      return;
    }
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

    const input: Record<string, unknown> = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      available: formData.available,
      imageUrl: finalImageUrl || null,
      ingredients: formData.ingredients ? formData.ingredients.split(',').map(i => i.trim()).filter(i => i) : [],
      allergens: formData.allergens ? formData.allergens.split(',').map(a => a.trim()).filter(a => a) : [],
      preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null,
    };
    if (formData.categoryId) {
      input.categoryId = formData.categoryId;
    } else if (formData.category) {
      input.category = formData.category;
    }

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

  // Paginated visible items
  const paginatedItems = menuItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const visibleIds = paginatedItems.map((item: any) => item.id);
  const selectedIdsSet = new Set(selectedIds);
  const allSelectedOnPage = visibleIds.length > 0 && visibleIds.every((id: string) => selectedIdsSet.has(id));
  const someSelectedOnPage = visibleIds.some((id: string) => selectedIdsSet.has(id));

  const toggleAllOnPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIdsSet.has(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleOpenBulkEdit = () => {
    setBulkEditData({
      categoryId: '',
      applyCategory: false,
      available: true,
      applyAvailable: false,
      preparationTime: '',
      applyPreparationTime: false,
      priceAdjustmentType: 'percentage',
      priceAdjustmentValue: '',
      applyPriceAdjustment: false,
    });
    setBulkEditOpen(true);
  };

  const handleCloseBulkEdit = () => {
    setBulkEditOpen(false);
  };

  const handleBulkEditSubmit = async () => {
    const hasChanges =
      bulkEditData.applyCategory ||
      bulkEditData.applyAvailable ||
      bulkEditData.applyPreparationTime ||
      bulkEditData.applyPriceAdjustment;

    if (!hasChanges) {
      alert('Please select at least one field to update.');
      return;
    }

    const restaurantId = getRestaurantId();
    if (!restaurantId) {
      alert('Restaurant information not available. Please refresh and try again.');
      return;
    }

    if (bulkEditData.applyCategory && !bulkEditData.categoryId) {
      alert('Please select a category.');
      return;
    }

    if (bulkEditData.applyPriceAdjustment) {
      const val = parseFloat(bulkEditData.priceAdjustmentValue);
      if (isNaN(val)) {
        alert('Please enter a valid price adjustment value.');
        return;
      }
      if (bulkEditData.priceAdjustmentType === 'percentage' && (val < -100 || val > 1000)) {
        alert('Percentage should be between -100 and 1000.');
        return;
      }
    }

    setBulkEditLoading(true);
    try {
      const itemsToUpdate = menuItems.filter((item: any) => selectedIds.includes(item.id));

      const updates = itemsToUpdate.map(async (item: any) => {
        const input: Record<string, unknown> = {
          restaurantId,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          available: item.available,
          imageUrl: item.imageUrl ?? null,
          ingredients: item.ingredients ?? [],
          allergens: item.allergens ?? [],
          preparationTime: item.preparationTime ?? null,
        };
        if (item.categoryId) input.categoryId = item.categoryId;
        else if (item.category) input.category = item.category;

        if (bulkEditData.applyCategory && bulkEditData.categoryId) {
          input.categoryId = bulkEditData.categoryId;
        }
        if (bulkEditData.applyAvailable) {
          input.available = bulkEditData.available;
        }
        if (bulkEditData.applyPreparationTime && bulkEditData.preparationTime !== '') {
          const pt = parseInt(bulkEditData.preparationTime, 10);
          if (!isNaN(pt)) input.preparationTime = pt;
        }
        if (bulkEditData.applyPriceAdjustment && bulkEditData.priceAdjustmentValue !== '') {
          const val = parseFloat(bulkEditData.priceAdjustmentValue);
          if (bulkEditData.priceAdjustmentType === 'percentage') {
            input.price = Math.round((item.price * (1 + val / 100)) * 100) / 100;
          } else {
            input.price = Math.round((item.price + val) * 100) / 100;
          }
        }

        return updateMenuItemMutation({
          variables: { id: item.id, input },
        });
      });

      await Promise.all(updates);
      refetch();
      setSelectedIds([]);
      handleCloseBulkEdit();
      showBulkSuccess(`${itemsToUpdate.length} menu item(s) updated successfully.`);
    } catch (error: any) {
      alert(error?.message || 'Failed to update menu items.');
    } finally {
      setBulkEditLoading(false);
    }
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

        {/* Category Management Section */}
        <Card sx={{ mb: 3 }}>
          <Button
            fullWidth
            onClick={() => setCategorySectionOpen(!categorySectionOpen)}
            sx={{ justifyContent: 'flex-start', textTransform: 'none', p: 2 }}
          >
            <CategoryIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Category Management</Typography>
            {categorySectionOpen ? <ExpandLess /> : <ExpandMore />}
          </Button>
          <Collapse in={categorySectionOpen}>
            <Box sx={{ p: 2, pt: 0 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryParentId('');
                  setCategoryDialogOpen(true);
                }}
                sx={{ mb: 2 }}
              >
                Add Category
              </Button>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parentCategories.map((parent) => (
                      <React.Fragment key={parent.id}>
                        <TableRow>
                          <TableCell>
                            <Typography fontWeight="medium">{parent.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label="Parent" size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingCategory(parent);
                                setNewCategoryName(parent.name);
                                setNewCategoryParentId('');
                                setCategoryDialogOpen(true);
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (window.confirm(`Delete "${parent.name}"? Subcategories will need to be removed first.`)) {
                                  deleteCategory({ variables: { id: parent.id } }).catch((e) => alert(e.message));
                                }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        {(subcategoriesByParent[parent.id] || []).map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell sx={{ pl: 4 }}>
                              <Typography variant="body2">{sub.name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label="Subcategory" size="small" variant="outlined" color="secondary" />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingCategory(sub);
                                  setNewCategoryName(sub.name);
                                  setNewCategoryParentId(sub.parentCategoryId || '');
                                  setCategoryDialogOpen(true);
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (window.confirm(`Delete "${sub.name}"?`)) {
                                    deleteCategory({ variables: { id: sub.id } }).catch((e) => alert(e.message));
                                  }
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                    {parentCategories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography variant="body2" color="text.secondary">
                            No categories yet. Add one above or when creating a menu item.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </Card>

        {/* Menu Items Table */}
        <Card>
          {selectedIds.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'action.selected',
              }}
            >
              <Typography variant="body2">
                {selectedIds.length} selected
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Edit />}
                onClick={handleOpenBulkEdit}
              >
                Bulk Edit
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedIds([])}
              >
                Clear selection
              </Button>
            </Box>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={!allSelectedOnPage && someSelectedOnPage}
                      checked={allSelectedOnPage}
                      onChange={(e) => toggleAllOnPage(e.target.checked)}
                      inputProps={{ 'aria-label': 'select all on page' }}
                    />
                  </TableCell>
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
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No menu items found. Click "Add Menu Item" to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIdsSet.has(item.id)}
                          onChange={() => toggleOne(item.id)}
                          inputProps={{ 'aria-label': `select ${item.name}` }}
                        />
                      </TableCell>
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
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <FormControl fullWidth required size="small">
                  <InputLabel id="menu-item-category-label" shrink>
                    Category
                  </InputLabel>
                  <Select
                    labelId="menu-item-category-label"
                    value={formData.categoryId}
                    label="Category"
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    displayEmpty
                    renderValue={(value) => {
                      if (!value) {
                        return categoryOptionsForSelect.length === 0 ? 'Add a category first' : 'Select category';
                      }
                      const opt = categoryOptionsForSelect.find((o) => o.value === value);
                      return opt?.label ?? value;
                    }}
                  >
                    <MuiMenuItem value="">
                      <em>—</em>
                    </MuiMenuItem>
                    {categoryOptionsForSelect.map((opt) => (
                      <MuiMenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => {
                    setNewCategoryParentId(formData.categoryId || '');
                    setNewCategoryName('');
                    setQuickAddCategoryOpen(true);
                  }}
                  sx={{ mt: 0.5 }}
                >
                  Add
                </Button>
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

        {/* Bulk Edit Dialog */}
        <Dialog open={bulkEditOpen} onClose={handleCloseBulkEdit} maxWidth="sm" fullWidth>
          <DialogTitle>Bulk Edit {selectedIds.length} Menu Item(s)</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={bulkEditData.categoryId}
                    label="Category"
                    onChange={(e) =>
                      setBulkEditData((prev) => ({ ...prev, categoryId: e.target.value }))
                    }
                  >
                    <MuiMenuItem value="">—</MuiMenuItem>
                    {categoryOptionsForSelect.map((opt) => (
                      <MuiMenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MuiMenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormField
                  type="switch"
                  name="applyCategory"
                  label="Apply to all"
                  value={bulkEditData.applyCategory}
                  onChange={(field, value) =>
                    setBulkEditData((prev) => ({ ...prev, [field]: value }))
                  }
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormField
                  type="switch"
                  name="available"
                  label="Available"
                  value={bulkEditData.available}
                  onChange={(field, value) =>
                    setBulkEditData((prev) => ({ ...prev, [field]: value }))
                  }
                />
                <FormField
                  type="switch"
                  name="applyAvailable"
                  label="Apply to all"
                  value={bulkEditData.applyAvailable}
                  onChange={(field, value) =>
                    setBulkEditData((prev) => ({ ...prev, [field]: value }))
                  }
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormField
                  type="number"
                  name="preparationTime"
                  label="Prep Time (min)"
                  value={bulkEditData.preparationTime}
                  onChange={(field, value) =>
                    setBulkEditData((prev) => ({ ...prev, [field]: value }))
                  }
                />
                <FormField
                  type="switch"
                  name="applyPreparationTime"
                  label="Apply to all"
                  value={bulkEditData.applyPreparationTime}
                  onChange={(field, value) =>
                    setBulkEditData((prev) => ({ ...prev, [field]: value }))
                  }
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Price</InputLabel>
                  <Select
                    value={bulkEditData.priceAdjustmentType}
                    label="Price"
                    onChange={(e) =>
                      setBulkEditData((prev) => ({
                        ...prev,
                        priceAdjustmentType: e.target.value as 'percentage' | 'fixed',
                      }))
                    }
                  >
                    <MuiMenuItem value="percentage">% change</MuiMenuItem>
                    <MuiMenuItem value="fixed">+/- amount</MuiMenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label={bulkEditData.priceAdjustmentType === 'percentage' ? '%' : 'Amount'}
                  type="number"
                  value={bulkEditData.priceAdjustmentValue}
                  onChange={(e) =>
                    setBulkEditData((prev) => ({ ...prev, priceAdjustmentValue: e.target.value }))
                  }
                  placeholder={
                    bulkEditData.priceAdjustmentType === 'percentage' ? 'e.g. 10 or -5' : 'e.g. 2.50'
                  }
                  sx={{ width: 120 }}
                />
                <FormField
                  type="switch"
                  name="applyPriceAdjustment"
                  label="Apply to all"
                  value={bulkEditData.applyPriceAdjustment}
                  onChange={(field, value) =>
                    setBulkEditData((prev) => ({ ...prev, [field]: value }))
                  }
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Select at least one field above and check &quot;Apply to all&quot; to update.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBulkEdit}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleBulkEditSubmit}
              disabled={bulkEditLoading}
              startIcon={bulkEditLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {bulkEditLoading ? 'Applying...' : 'Apply'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Category Create/Edit Dialog */}
        <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Parent Category (optional)</InputLabel>
                <Select
                  value={newCategoryParentId}
                  label="Parent Category (optional)"
                  onChange={(e) => setNewCategoryParentId(e.target.value)}
                >
                  <MuiMenuItem value=""> None (top-level) </MuiMenuItem>
                  {parentCategories.map((p) => (
                    <MuiMenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MuiMenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Category Name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!newCategoryName.trim()) return;
                const restaurantId = getRestaurantId();
                if (!restaurantId) return;
                try {
                  if (editingCategory) {
                    await updateCategory({
                      variables: {
                        id: editingCategory.id,
                        input: {
                          name: newCategoryName.trim(),
                          parentCategoryId: newCategoryParentId || null,
                        },
                      },
                    });
                  } else {
                    await createCategory({
                      variables: {
                        input: {
                          name: newCategoryName.trim(),
                          parentCategoryId: newCategoryParentId || null,
                          restaurantId,
                        },
                      },
                    });
                  }
                  setCategoryDialogOpen(false);
                } catch (e: any) {
                  alert(e.message || 'Failed to save category');
                }
              }}
            >
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Quick Add Category from Menu Form */}
        <Dialog open={quickAddCategoryOpen} onClose={() => setQuickAddCategoryOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Under parent (optional)</InputLabel>
                <Select
                  value={newCategoryParentId}
                  label="Under parent (optional)"
                  onChange={(e) => setNewCategoryParentId(e.target.value)}
                >
                  <MuiMenuItem value=""> None </MuiMenuItem>
                  {parentCategories.map((p) => (
                    <MuiMenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MuiMenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQuickAddCategoryOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!newCategoryName.trim()) return;
                const restaurantId = getRestaurantId();
                if (!restaurantId) return;
                try {
                  const result = await createCategory({
                    variables: {
                      input: {
                        name: newCategoryName.trim(),
                        parentCategoryId: newCategoryParentId || null,
                        restaurantId,
                      },
                    },
                  });
                  const newId = result.data?.createMenuCategory?.id;
                  if (newId) {
                    handleInputChange('categoryId', newId);
                  }
                  setQuickAddCategoryOpen(false);
                } catch (e: any) {
                  alert(e.message || 'Failed to create category');
                }
              }}
            >
              Add & Use
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <AppSnackbar
          open={bulkSnackbar.open || snackbar.open}
          onClose={bulkSnackbar.open ? hideBulkSnackbar : hideSnackbar}
          message={bulkSnackbar.open ? bulkSnackbar.message : snackbar.message}
          severity={bulkSnackbar.open ? bulkSnackbar.severity : snackbar.severity}
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
