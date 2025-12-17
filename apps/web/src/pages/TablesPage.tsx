import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  TableRestaurant,
  QrCode,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { ConfirmationDialog } from '../components/common';
import { GET_TABLES, CREATE_TABLE, UPDATE_TABLE, DELETE_TABLE, GET_ORDERS_FOR_STAFF } from '../graphql';

const tableStatuses = [
  'available',
  'occupied',
  'reserved',
  'cleaning',
  'maintenance'
];

const statusColors = {
  available: 'success',
  occupied: 'error',
  reserved: 'warning',
  cleaning: 'info',
  maintenance: 'default'
} as const;

export default function TablesPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [restaurant, setRestaurant] = useState<any>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  // Form state
  const [formData, setFormData] = useState({
    number: '',
    capacity: '',
    status: 'available',
    location: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Queries and mutations
  const { data, loading, error, refetch } = useQuery(GET_TABLES);
  const { data: ordersData } = useQuery(GET_ORDERS_FOR_STAFF, {
    variables: { restaurantId: restaurant?.id },
    skip: !restaurant?.id,
    pollInterval: 5000
  });
  const [createTable] = useMutation(CREATE_TABLE);
  const [updateTable] = useMutation(UPDATE_TABLE);
  const [deleteTable] = useMutation(DELETE_TABLE);

  const tables = data?.tables || [];
  const orders = ordersData?.ordersForStaff || [];

  // Determine occupancy based on active dine-in orders
  const activeStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready', 'served']);
  const occupiedTableNumbers = new Set(
    orders
      .filter((o: any) => o.orderType === 'dine-in' && o.tableNumber && activeStatuses.has(o.status))
      .map((o: any) => o.tableNumber)
  );
  const isTableOccupied = (tableNumber?: number) => !!tableNumber && occupiedTableNumbers.has(tableNumber);

  // Load restaurant data from localStorage
  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (restaurantData) {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, []);

  // Memoize base URL to prevent QR code regeneration
  const baseUrl = window.location.origin;

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (table?: any) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        number: table.number?.toString() || '',
        capacity: table.capacity?.toString() || '',
        status: table.status || 'available',
        location: table.location || '',
      });
    } else {
      setEditingTable(null);
      setFormData({
        number: '',
        capacity: '',
        status: 'available',
        location: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTable(null);
    setFormData({
      number: '',
      capacity: '',
      status: 'available',
      location: '',
    });
    setFormErrors({});
  };

  const handleShowQRCode = (tableNumber: number) => {
    setShowQRCode(tableNumber.toString());
  };

  const handleCloseQRCode = () => {
    setShowQRCode(null);
  };

  const handleInputChange = (field: string) => (event: any) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    
    // Validate table number
    if (!formData.number.trim()) {
      errors.number = 'Table number is required';
    } else {
      const tableNumber = parseInt(formData.number);
      if (isNaN(tableNumber) || tableNumber < 1) {
        errors.number = 'Table number must be a positive number';
      } else if (!editingTable) {
        const existingTable = tables.find((table: any) => table.number === tableNumber);
        if (existingTable) {
          errors.number = `Table ${tableNumber} already exists`;
        }
      }
    }
    
    // Validate capacity
    const capacityErrors = validateForm(formData, [
      validationRules.positiveInteger('capacity', true, 1, 'Capacity must be a positive number')
    ]);
    Object.assign(errors, capacityErrors);
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    try {
      // Get restaurant ID from localStorage
      const currentRestaurant = localStorage.getItem('restaurant');
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
        setSnackbar({ open: true, message: 'Restaurant information not available. Please refresh the page and try again.', severity: 'error' });
        return;
      }

      const tableNumber = parseInt(formData.number);

      const input = {
        restaurantId,
        number: tableNumber,
        capacity: parseInt(formData.capacity),
        status: formData.status,
        location: formData.location || null,
      };

      if (editingTable) {
        await updateTable({
          variables: {
            id: editingTable.id,
            input
          }
        });
        setSnackbar({ open: true, message: 'Table updated successfully!', severity: 'success' });
      } else {
        const result = await createTable({
          variables: { input }
        });
        
        // Show QR code for newly created table
        if (result.data?.createTable) {
          setShowQRCode(result.data.createTable.number.toString());
        }
        
        setSnackbar({ open: true, message: 'Table created successfully! QR code generated.', severity: 'success' });
      }

      handleCloseDialog();
      refetch();
    } catch (error) {
      console.error('Error saving table:', error);
      setSnackbar({ open: true, message: 'Error saving table', severity: 'error' });
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    
    try {
      await deleteTable({
        variables: { id: deleteConfirm.id }
      });
      setSnackbar({ open: true, message: 'Table deleted successfully!', severity: 'success' });
      refetch();
    } catch (error) {
      console.error('Error deleting table:', error);
      setSnackbar({ open: true, message: 'Error deleting table', severity: 'error' });
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ open: false, id: null });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Calculate statistics
  const totalTables = tables.length;
  const occupiedTables = tables.filter((table: any) => isTableOccupied(table.number)).length;
  const availableTables = tables.filter((table: any) => !isTableOccupied(table.number)).length;
  const reservedTables = tables.filter((table: any) => table.status === 'reserved').length;

  if (loading) {
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
          Error loading tables: {error.message}
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
            Table Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Table
          </Button>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TableRestaurant color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Total Tables
                    </Typography>
                    <Typography variant="h4">
                      {totalTables}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TableRestaurant color="success" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Available
                    </Typography>
                    <Typography variant="h4">
                      {availableTables}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TableRestaurant color="error" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Occupied
                    </Typography>
                    <Typography variant="h4">
                      {occupiedTables}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TableRestaurant color="warning" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Reserved
                    </Typography>
                    <Typography variant="h4">
                      {reservedTables}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tables Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Table Number</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No tables found. Click "Add Table" to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tables
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((table: any) => (
                      <TableRow key={table.id}>
                        <TableCell>
                          <Typography variant="h6" fontWeight="bold">
                            Table {table.number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">
                            {table.capacity} {table.capacity === 1 ? 'person' : 'people'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const occupied = isTableOccupied(table.number);
                            const effectiveStatus = occupied ? 'occupied' : table.status;
                            const label = effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1);
                            return (
                              <Chip
                                label={label}
                                color={statusColors[effectiveStatus as keyof typeof statusColors] || 'default'}
                                size="small"
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {table.location || 'No location specified'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleShowQRCode(table.number)} title="Show QR Code">
                            <QrCode />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenDialog(table)}>
                            <Edit />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(table.id)}>
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
            count={tables.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTable ? 'Edit Table' : 'Add New Table'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Table Number"
                type="text"
                value={formData.number}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string for editing, or valid numbers
                  if (value === '' || /^\d+$/.test(value)) {
                    handleInputChange('number')(e);
                    if (formErrors.number) setFormErrors(clearFieldError(formErrors, 'number'));
                  }
                }}
                onBlur={(e) => {
                  // Ensure minimum value of 1 when field loses focus
                  const numValue = parseInt(e.target.value) || 1;
                  setFormData(prev => ({ ...prev, number: Math.max(1, numValue).toString() }));
                }}
                error={!!formErrors.number}
                helperText={formErrors.number}
                fullWidth
                required
                inputProps={{ 
                  min: 1,
                  maxLength: 10,
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
              />
              <TextField
                label="Capacity"
                type="text"
                value={formData.capacity}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string for editing, or valid numbers
                  if (value === '' || /^\d+$/.test(value)) {
                    handleInputChange('capacity')(e);
                    if (formErrors.capacity) setFormErrors(clearFieldError(formErrors, 'capacity'));
                  }
                }}
                onBlur={(e) => {
                  // Ensure minimum value of 1 when field loses focus
                  const numValue = parseInt(e.target.value) || 1;
                  setFormData(prev => ({ ...prev, capacity: Math.max(1, numValue).toString() }));
                }}
                error={!!formErrors.capacity}
                helperText={formErrors.capacity}
                fullWidth
                required
                inputProps={{ 
                  min: 1,
                  maxLength: 10,
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
              />
              <TextField
                label="Status"
                select
                value={formData.status}
                onChange={handleInputChange('status')}
                fullWidth
                required
              >
                {tableStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Location"
                value={formData.location}
                onChange={handleInputChange('location')}
                fullWidth
                placeholder="e.g., Main Dining, Patio, Private Room"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingTable ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog
          open={!!showQRCode}
          onClose={handleCloseQRCode}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            QR Code for Table {showQRCode}
            <IconButton
              aria-label="close"
              onClick={handleCloseQRCode}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
              }}
            >
              <Delete />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ textAlign: 'center', py: 3 }}>
            {showQRCode && restaurant && (
              <QRCodeGenerator
                value={`${baseUrl}/consumer/${restaurant.slug}/${showQRCode}`}
                label={`Table ${showQRCode}`}
              />
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Customers can scan this QR code to access the digital menu and place orders for this table.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseQRCode}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteConfirm.open}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Table"
          message={`Are you sure you want to delete this table? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="error"
        />
      </Box>
    </Layout>
  );
}
