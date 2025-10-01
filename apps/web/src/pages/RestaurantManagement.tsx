import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Menu,
  MenuItem,
  Avatar
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Restaurant
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import AppSnackbar from '../components/common/AppSnackbar';
import { 
  GET_ALL_RESTAURANTS, 
  CREATE_RESTAURANT, 
  UPDATE_RESTAURANT, 
  DEACTIVATE_RESTAURANT 
} from '../graphql';

export default function RestaurantManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    phone: '',
    slug: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Queries
  const { data: restaurantsData, loading: restaurantsLoading, refetch } = useQuery(GET_ALL_RESTAURANTS);

  // Mutations
  const [createRestaurant, { loading: createLoading }] = useMutation(CREATE_RESTAURANT, {
    onCompleted: () => {
      setOpenDialog(false);
      resetForm();
      refetch();
      setSnackbar({
        open: true,
        message: 'Restaurant created successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  });

  const [updateRestaurant, { loading: updateLoading }] = useMutation(UPDATE_RESTAURANT, {
    onCompleted: () => {
      setOpenDialog(false);
      resetForm();
      refetch();
      setSnackbar({
        open: true,
        message: 'Restaurant updated successfully!',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  });

  const [deactivateRestaurant] = useMutation(DEACTIVATE_RESTAURANT, {
    onCompleted: () => {
      refetch();
    }
  });

  const restaurants = restaurantsData?.allRestaurants || [];
  const filteredRestaurants = restaurants.filter((restaurant: any) =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, restaurant: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRestaurant(restaurant);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRestaurant(null);
  };

  const handleOpenDialog = (mode: 'create' | 'edit', restaurant?: any) => {
    setDialogMode(mode);
    if (mode === 'edit' && restaurant) {
      setFormData({
        name: restaurant.name,
        email: restaurant.email,
        password: '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        slug: restaurant.slug
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      address: '',
      phone: '',
      slug: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      return;
    }

    const input = {
      name: formData.name,
      email: formData.email,
      address: formData.address,
      phone: formData.phone,
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')
    };

    if (dialogMode === 'create') {
      if (!formData.password) return;
      await createRestaurant({
        variables: { input: { ...input, password: formData.password } }
      });
    } else {
      await updateRestaurant({
        variables: { id: selectedRestaurant.id, input }
      });
    }
  };

  const handleDeactivate = async () => {
    if (selectedRestaurant) {
      await deactivateRestaurant({ variables: { id: selectedRestaurant.id } });
      handleMenuClose();
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <IconButton onClick={() => navigate('/admin/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Restaurant Management
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Search and Add Button */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog('create')}
          >
            Add Restaurant
          </Button>
        </Box>

        {/* Restaurants Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Restaurant</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {restaurantsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredRestaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="info">No restaurants found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRestaurants
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((restaurant: any) => (
                      <TableRow key={restaurant.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              <Restaurant />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {restaurant.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {restaurant.phone || 'No phone'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{restaurant.email}</TableCell>
                        <TableCell>
                          <Chip label={restaurant.slug} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{restaurant.address || 'No address'}</TableCell>
                        <TableCell>
                          <Chip
                            label={restaurant.isActive ? 'Active' : 'Inactive'}
                            color={restaurant.isActive ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(restaurant.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, restaurant)}
                          >
                            <MoreVert />
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
            count={filteredRestaurants.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { handleOpenDialog('edit', selectedRestaurant); handleMenuClose(); }}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={() => { /* Navigate to restaurant details */ }}>
            <Visibility sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem onClick={handleDeactivate} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        </Menu>

        {/* Create/Edit Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {dialogMode === 'create' ? 'Add New Restaurant' : 'Edit Restaurant'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  sx={{ flex: '1 1 300px', minWidth: '250px' }}
                  label="Restaurant Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <TextField
                  sx={{ flex: '1 1 300px', minWidth: '250px' }}
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Box>
              {dialogMode === 'create' && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    sx={{ flex: '1 1 300px', minWidth: '250px' }}
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  sx={{ flex: '1 1 300px', minWidth: '250px' }}
                  label="Slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated if empty"
                />
                <TextField
                  sx={{ flex: '1 1 300px', minWidth: '250px' }}
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Box>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={createLoading || updateLoading}
            >
              {createLoading || updateLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
      
      <AppSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Box>
  );
}
