import React, { useState } from 'react';
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
  CalendarToday,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { ConfirmationDialog } from '../components/common';
import { formatDate } from '../utils/dateFormatting';
import { GET_RESERVATIONS, CREATE_RESERVATION, UPDATE_RESERVATION, DELETE_RESERVATION } from '../graphql';

const reservationStatuses = [
  'confirmed',
  'pending',
  'cancelled',
  'completed',
  'no-show'
];

const statusColors = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'default',
  'no-show': 'error'
} as const;

export default function ReservationsPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    tableNumber: '',
    date: '',
    time: '',
    partySize: '',
    status: 'confirmed',
    specialRequests: '',
  });

  // Queries and mutations
  const { data, loading, error, refetch } = useQuery(GET_RESERVATIONS);
  const [createReservation] = useMutation(CREATE_RESERVATION);
  const [updateReservation] = useMutation(UPDATE_RESERVATION);
  const [deleteReservation] = useMutation(DELETE_RESERVATION);

  const reservations = data?.reservations || [];

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (reservation?: any) => {
    if (reservation) {
      setEditingReservation(reservation);
      setFormData({
        customerName: reservation.customerName || '',
        customerPhone: reservation.customerPhone || '',
        customerEmail: reservation.customerEmail || '',
        tableNumber: reservation.tableNumber?.toString() || '',
        date: reservation.date || '',
        time: reservation.time || '',
        partySize: reservation.partySize?.toString() || '',
        status: reservation.status || 'confirmed',
        specialRequests: reservation.specialRequests || '',
      });
    } else {
      setEditingReservation(null);
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        tableNumber: '',
        date: '',
        time: '',
        partySize: '',
        status: 'confirmed',
        specialRequests: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingReservation(null);
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      tableNumber: '',
      date: '',
      time: '',
      partySize: '',
      status: 'confirmed',
      specialRequests: '',
    });
  };

  const handleInputChange = (field: string) => (event: any) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    try {
      const input = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || null,
        tableNumber: parseInt(formData.tableNumber),
        date: formData.date,
        time: formData.time,
        partySize: parseInt(formData.partySize),
        status: formData.status,
        specialRequests: formData.specialRequests || null,
      };

      if (editingReservation) {
        await updateReservation({
          variables: {
            id: editingReservation.id,
            input
          }
        });
        setSnackbar({ open: true, message: 'Reservation updated successfully!', severity: 'success' });
      } else {
        await createReservation({
          variables: { input }
        });
        setSnackbar({ open: true, message: 'Reservation created successfully!', severity: 'success' });
      }

      handleCloseDialog();
      refetch();
    } catch (error) {
      console.error('Error saving reservation:', error);
      setSnackbar({ open: true, message: 'Error saving reservation', severity: 'error' });
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    
    try {
      await deleteReservation({
        variables: { id: deleteConfirm.id }
      });
      setSnackbar({ open: true, message: 'Reservation deleted successfully!', severity: 'success' });
      refetch();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      setSnackbar({ open: true, message: 'Error deleting reservation', severity: 'error' });
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
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter((res: any) => res.status === 'confirmed').length;
  const pendingReservations = reservations.filter((res: any) => res.status === 'pending').length;
  const todayReservations = reservations.filter((res: any) => {
    const today = new Date().toISOString().split('T')[0];
    return res.date === today;
  }).length;

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
          Error loading reservations: {error.message}
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
            Reservation Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Reservation
          </Button>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CalendarToday color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Total Reservations
                    </Typography>
                    <Typography variant="h4">
                      {totalReservations}
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
                  <CalendarToday color="success" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Confirmed
                    </Typography>
                    <Typography variant="h4">
                      {confirmedReservations}
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
                  <CalendarToday color="warning" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Pending
                    </Typography>
                    <Typography variant="h4">
                      {pendingReservations}
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
                  <CalendarToday color="info" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      Today
                    </Typography>
                    <Typography variant="h4">
                      {todayReservations}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Reservations Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Table</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Party Size</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No reservations found. Click "Add Reservation" to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((reservation: any) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {reservation.customerName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {reservation.customerPhone}
                            </Typography>
                            {reservation.customerEmail && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {reservation.customerEmail}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" fontWeight="bold">
                            Table {reservation.tableNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">
                            {formatDate(reservation.date)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {reservation.time}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1">
                            {reservation.partySize} {reservation.partySize === 1 ? 'person' : 'people'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                            color={statusColors[reservation.status as keyof typeof statusColors] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog(reservation)}>
                            <Edit />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(reservation.id)}>
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
            count={reservations.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingReservation ? 'Edit Reservation' : 'Add New Reservation'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Customer Name"
                  value={formData.customerName}
                  onChange={handleInputChange('customerName')}
                  fullWidth
                  required
                />
                <TextField
                  label="Phone Number"
                  value={formData.customerPhone}
                  onChange={handleInputChange('customerPhone')}
                  fullWidth
                  required
                />
              </Box>
              <TextField
                label="Email (Optional)"
                type="email"
                value={formData.customerEmail}
                onChange={handleInputChange('customerEmail')}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Table Number"
                  type="text"
                  value={formData.tableNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for editing, or valid numbers
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('tableNumber')(e);
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure minimum value of 1 when field loses focus
                    const numValue = parseInt(e.target.value) || 1;
                    setFormData(prev => ({ ...prev, tableNumber: Math.max(1, numValue).toString() }));
                  }}
                  required
                  inputProps={{ 
                    min: 1,
                    maxLength: 10,
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                />
                <TextField
                  label="Party Size"
                  type="text"
                  value={formData.partySize}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for editing, or valid numbers
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('partySize')(e);
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure minimum value of 1 when field loses focus
                    const numValue = parseInt(e.target.value) || 1;
                    setFormData(prev => ({ ...prev, partySize: Math.max(1, numValue).toString() }));
                  }}
                  required
                  inputProps={{ 
                    min: 1,
                    maxLength: 10,
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange('date')}
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Time"
                  type="time"
                  value={formData.time}
                  onChange={handleInputChange('time')}
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Status"
                  select
                  value={formData.status}
                  onChange={handleInputChange('status')}
                  required
                >
                  {reservationStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <TextField
                label="Special Requests"
                value={formData.specialRequests}
                onChange={handleInputChange('specialRequests')}
                fullWidth
                multiline
                rows={3}
                placeholder="Any special dietary requirements, seating preferences, etc."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingReservation ? 'Update' : 'Create'}
            </Button>
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
          title="Delete Reservation"
          message={`Are you sure you want to delete this reservation? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="error"
        />
      </Box>
    </Layout>
  );
}
