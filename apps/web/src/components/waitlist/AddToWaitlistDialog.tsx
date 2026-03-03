import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import { ADD_TO_WAITLIST } from '../../graphql/mutations/waitlist';

interface AddToWaitlistDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function AddToWaitlistDialog({ open, onClose, onSuccess }: AddToWaitlistDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addToWaitlist] = useMutation(ADD_TO_WAITLIST, {
    refetchQueries: ['GetWaitlist'],
  });

  const handleClose = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPartySize('2');
    setNotes('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    const name = customerName?.trim();
    const phone = customerPhone?.trim();
    const size = parseInt(partySize, 10);
    if (!name) {
      setError('Customer name is required');
      return;
    }
    if (!phone) {
      setError('Customer phone is required');
      return;
    }
    if (isNaN(size) || size < 1) {
      setError('Party size must be at least 1');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const result = await addToWaitlist({
        variables: {
          input: {
            customerName: name,
            customerPhone: phone,
            partySize: size,
            notes: notes?.trim() || null,
          },
        },
      });
      const position = result.data?.addToWaitlist?.queuePosition ?? '?';
      handleClose();
      onSuccess?.(`Added to waitlist. Position #${position}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to add to waitlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add to Waitlist</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Customer Phone"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Party Size"
          type="number"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          margin="normal"
          inputProps={{ min: 1 }}
        />
        <TextField
          fullWidth
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          margin="normal"
          multiline
          rows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={20} /> : 'Add to Waitlist'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
