import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  IconButton,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { formatDate } from '../utils/dateFormatting';
import Layout from '../components/Layout';
import { 
  GET_STAFF_BY_RESTAURANT, 
  CREATE_STAFF, 
  UPDATE_STAFF, 
  DEACTIVATE_STAFF 
} from '../graphql';

export default function StaffManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter',
    permissions: [] as string[]
  });
  const [restaurant, setRestaurant] = useState<any>(null);

  // Queries
  const { data: staffData, loading: staffLoading, refetch } = useQuery(GET_STAFF_BY_RESTAURANT, {
    variables: { restaurantId: restaurant?.id },
    skip: !restaurant?.id
  });

  // Mutations
  const [createStaff, { loading: createLoading }] = useMutation(CREATE_STAFF, {
    onCompleted: () => {
      setOpenDialog(false);
      resetForm();
      refetch();
    }
  });

  const [updateStaff, { loading: updateLoading }] = useMutation(UPDATE_STAFF, {
    onCompleted: () => {
      setOpenDialog(false);
      resetForm();
      refetch();
    }
  });

  const [deactivateStaff] = useMutation(DEACTIVATE_STAFF, {
    onCompleted: () => {
      refetch();
    }
  });

  React.useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (!restaurantData) {
      navigate('/restaurant/login');
      return;
    }
    setRestaurant(JSON.parse(restaurantData));
  }, [navigate]);

  const staff = staffData?.staffByRestaurant || [];
  const filteredStaff = staff.filter((member: any) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, staffMember: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedStaff(staffMember);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStaff(null);
  };

  const handleOpenDialog = (mode: 'create' | 'edit', staffMember?: any) => {
    setDialogMode(mode);
    if (mode === 'edit' && staffMember) {
      setFormData({
        name: staffMember.name,
        email: staffMember.email,
        password: '',
        role: staffMember.role,
        permissions: staffMember.permissions
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
      role: 'waiter',
      permissions: []
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || (!formData.password && dialogMode === 'create')) {
      return;
    }

    const input = {
      ...formData,
      restaurantId: restaurant.id,
      permissions: formData.permissions.length > 0 ? formData.permissions : getDefaultPermissions(formData.role)
    };

    try {
      if (dialogMode === 'create') {
        await createStaff({ variables: { input } });
      } else {
        await updateStaff({ 
          variables: { 
            id: selectedStaff.id, 
            input: { ...input, password: formData.password || undefined }
          } 
        });
      }
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };

  const getDefaultPermissions = (role: string) => {
    const permissions = {
      manager: ['manage_orders', 'view_orders', 'update_order_status', 'manage_menu', 'view_analytics'],
      waiter: ['view_orders', 'update_order_status'],
      kitchen_staff: ['view_orders', 'update_order_status'],
      cashier: ['view_orders', 'update_order_status']
    };
    return permissions[role as keyof typeof permissions] || permissions.waiter;
  };

  const handlePermissionChange = (permission: string) => {
    const newPermissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'error';
      case 'waiter': return 'primary';
      case 'kitchen_staff': return 'warning';
      case 'cashier': return 'success';
      default: return 'default';
    }
  };

  if (!restaurant) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/restaurant/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Staff Management
          </Typography>
        </Box>

        {/* Search and Add Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <TextField
            placeholder="Search staff..."
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
            Add Staff Member
          </Button>
        </Box>

        {/* Staff Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="info">No staff members found</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((staffMember: any) => (
                      <TableRow key={staffMember.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: 'primary.main' }}>
                              {staffMember.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="subtitle2">
                              {staffMember.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{staffMember.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={staffMember.role.replace('_', ' ')}
                            size="small"
                            color={getRoleColor(staffMember.role)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {staffMember.permissions.slice(0, 2).map((permission: string) => (
                              <Chip
                                key={permission}
                                label={permission.replace('_', ' ')}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {staffMember.permissions.length > 2 && (
                              <Chip
                                label={`+${staffMember.permissions.length - 2}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={staffMember.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={staffMember.isActive ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>
                          {formatDate(staffMember.createdAt)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, staffMember)}
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
            count={filteredStaff.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>

        {/* Staff Form Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {dialogMode === 'create' ? 'Add New Staff Member' : 'Edit Staff Member'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={dialogMode === 'create'}
                helperText={dialogMode === 'edit' ? 'Leave empty to keep current password' : ''}
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="waiter">Waiter</MenuItem>
                  <MenuItem value="kitchen_staff">Kitchen Staff</MenuItem>
                  <MenuItem value="cashier">Cashier</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Permissions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {['manage_orders', 'view_orders', 'update_order_status', 'manage_menu', 'view_analytics'].map((permission) => (
                    <Chip
                      key={permission}
                      label={permission.replace('_', ' ')}
                      onClick={() => handlePermissionChange(permission)}
                      color={formData.permissions.includes(permission) ? 'primary' : 'default'}
                      variant={formData.permissions.includes(permission) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={createLoading || updateLoading}
            >
              {(createLoading || updateLoading) ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { handleOpenDialog('edit', selectedStaff); handleMenuClose(); }}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem 
            onClick={() => {
              if (selectedStaff) {
                deactivateStaff({ variables: { id: selectedStaff.id } });
                handleMenuClose();
              }
            }}
          >
            <Delete sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        </Menu>
      </Box>
    </Layout>
  );
}
