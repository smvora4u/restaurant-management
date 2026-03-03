import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Snackbar,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Notifications as NotifyIcon,
  EventSeat as SeatIcon,
  PersonRemove as RemoveIcon,
  QrCode as QRCodeIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import QRCodeGenerator from '../components/QRCodeGenerator';
import AddToWaitlistDialog from '../components/waitlist/AddToWaitlistDialog';
import CreateOrderDialog from '../components/orders/CreateOrderDialog';
import { useWaitlistSubscription } from '../hooks/useWaitlistSubscription';
import { GET_WAITLIST, GET_AVAILABLE_TABLES } from '../graphql';
import { REMOVE_FROM_WAITLIST, NOTIFY_WAITLIST_ENTRY, SEAT_WAITLIST_ENTRY } from '../graphql/mutations/waitlist';

export default function RestaurantWaitlistPage() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [seatEntry, setSeatEntry] = useState<any>(null);
  const [seatTableNumbers, setSeatTableNumbers] = useState<string[]>([]);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [createOrderPrefill, setCreateOrderPrefill] = useState<{ tableNumber: string; linkedTableNumbers: string[]; customerName: string; customerPhone: string } | null>(null);
  const [showWaitlistQR, setShowWaitlistQR] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: waitlistData, loading, refetch } = useQuery(GET_WAITLIST, { skip: !restaurant?.id });
  useWaitlistSubscription({ restaurantId: restaurant?.id || '', onWaitlistUpdated: refetch });
  const { data: availableTablesData } = useQuery(GET_AVAILABLE_TABLES, { skip: !seatDialogOpen });
  const [removeFromWaitlist] = useMutation(REMOVE_FROM_WAITLIST, { refetchQueries: ['GetWaitlist'] });
  const [notifyWaitlistEntry] = useMutation(NOTIFY_WAITLIST_ENTRY, { refetchQueries: ['GetWaitlist'] });
  const [seatWaitlistEntry] = useMutation(SEAT_WAITLIST_ENTRY, { refetchQueries: ['GetWaitlist'] });

  const waitlist = waitlistData?.waitlist || [];
  const availableTablesForSeat = availableTablesData?.availableTables || [];
  const baseUrl = window.location.origin;

  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (restaurantData) {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, []);

  const handleOpenSeatDialog = (entry: any) => {
    setSeatEntry(entry);
    setSeatTableNumbers([]);
    setSeatDialogOpen(true);
  };

  const handleTableToggle = (tableNumber: string, checked: boolean) => {
    setSeatTableNumbers((prev) =>
      checked ? [...prev, tableNumber] : prev.filter((t) => t !== tableNumber)
    );
  };

  const handleSeatConfirm = async () => {
    if (!seatEntry || seatTableNumbers.length === 0) return;
    try {
      await seatWaitlistEntry({ variables: { id: seatEntry.id, tableNumbers: seatTableNumbers } });
      const primary = seatTableNumbers[0];
      const linked = seatTableNumbers.slice(1);
      setSeatDialogOpen(false);
      setSeatEntry(null);
      setSnackbar({ open: true, message: `Seated ${seatEntry.customerName} at Table ${seatTableNumbers.join('+')}`, severity: 'success' });
      setCreateOrderPrefill({
        tableNumber: primary,
        linkedTableNumbers: linked,
        customerName: seatEntry.customerName,
        customerPhone: seatEntry.customerPhone
      });
      setCreateOrderDialogOpen(true);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to seat', severity: 'error' });
    }
  };

  const handleRemoveFromWaitlist = async (id: string) => {
    try {
      await removeFromWaitlist({ variables: { id } });
      setSnackbar({ open: true, message: 'Removed from waitlist', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to remove', severity: 'error' });
    }
  };

  const handleNotifyWaitlist = async (id: string) => {
    try {
      await notifyWaitlistEntry({ variables: { id } });
      setSnackbar({ open: true, message: 'Customer notified', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to notify', severity: 'error' });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  if (!restaurant) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h4" component="h1">
            Waitlist
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
            >
              Add to Waitlist
            </Button>
            <Button
              variant="outlined"
              startIcon={<QRCodeIcon />}
              onClick={() => setShowWaitlistQR(true)}
            >
              Waitlist QR
            </Button>
          </Box>
        </Box>

        <Card>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : waitlist.length === 0 ? (
            <CardContent>
              <Typography variant="body1" color="text.secondary" align="center">
                No one on the waitlist. Customers can join via the QR code at the entrance or when staff adds them from Create Order (when all tables are full).
              </Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Party</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {waitlist.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.queuePosition}</TableCell>
                      <TableCell>{entry.customerName}</TableCell>
                      <TableCell>{entry.customerPhone}</TableCell>
                      <TableCell>{entry.partySize}</TableCell>
                      <TableCell>{entry.notes || '-'}</TableCell>
                      <TableCell>
                        <Chip label={entry.status} size="small" color={entry.status === 'notified' ? 'warning' : 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleNotifyWaitlist(entry.id)} title="Notify">
                          <NotifyIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenSeatDialog(entry)} title="Seat">
                          <SeatIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleRemoveFromWaitlist(entry.id)} title="Remove">
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        <AddToWaitlistDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onSuccess={(msg) => setSnackbar({ open: true, message: msg, severity: 'success' })}
        />

        {/* Waitlist QR Dialog */}
        <Dialog open={showWaitlistQR} onClose={() => setShowWaitlistQR(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Waitlist QR Code</DialogTitle>
          <DialogContent sx={{ textAlign: 'center', py: 3 }}>
            <QRCodeGenerator
              value={`${baseUrl}/waitlist/${restaurant.slug}`}
              label="Join Waitlist"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Place this QR code at the entrance for customers to join the waitlist when all tables are full.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowWaitlistQR(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Seat Dialog */}
        <Dialog open={seatDialogOpen} onClose={() => setSeatDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Seat Customer</DialogTitle>
          <DialogContent>
            {seatEntry && (
              <>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Select table(s) for {seatEntry.customerName} (party of {seatEntry.partySize}). You can combine tables.
                </Typography>
                <FormGroup>
                  {availableTablesForSeat.map((table: any) => (
                    <FormControlLabel
                      key={table.id}
                      control={
                        <Checkbox
                          checked={seatTableNumbers.includes(table.number)}
                          onChange={(e) => handleTableToggle(table.number, e.target.checked)}
                        />
                      }
                      label={`Table ${table.number} (${table.capacity} seats)`}
                    />
                  ))}
                </FormGroup>
                {seatTableNumbers.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Combined: {seatTableNumbers.length} table(s) selected
                  </Typography>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSeatDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSeatConfirm} variant="contained" disabled={seatTableNumbers.length === 0}>
              Seat
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Order Dialog (after seating) */}
        <CreateOrderDialog
          open={createOrderDialogOpen}
          onClose={() => {
            setCreateOrderDialogOpen(false);
            setCreateOrderPrefill(null);
          }}
          onOrderCreated={(order) => {
            setCreateOrderDialogOpen(false);
            setCreateOrderPrefill(null);
            setSnackbar({ open: true, message: 'Order created successfully', severity: 'success' });
            navigate(`/restaurant/orders/${order.id}`);
          }}
          restaurant={restaurant}
          initialTableNumber={createOrderPrefill?.tableNumber ?? null}
          initialLinkedTableNumbers={createOrderPrefill?.linkedTableNumbers}
          initialCustomerName={createOrderPrefill?.customerName}
          initialCustomerPhone={createOrderPrefill?.customerPhone}
        />

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}
