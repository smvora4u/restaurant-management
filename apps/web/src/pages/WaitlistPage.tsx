import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import ConsumerLayout from '../components/ConsumerLayout';
import { GET_RESTAURANT_BY_SLUG } from '../graphql/queries/restaurant';
import { ADD_TO_WAITLIST } from '../graphql/mutations/waitlist';

export default function WaitlistPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ position: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loading: restaurantLoading, error: restaurantError } = useQuery(GET_RESTAURANT_BY_SLUG, {
    variables: { slug: restaurantSlug || '' },
    skip: !restaurantSlug,
    onCompleted: (data) => {
      if (data?.restaurantBySlug) {
        setRestaurant(data.restaurantBySlug);
        localStorage.setItem('currentRestaurant', JSON.stringify(data.restaurantBySlug));
      }
    },
  });

  const [addToWaitlist] = useMutation(ADD_TO_WAITLIST);

  useEffect(() => {
    if (restaurantError) {
      setError('Restaurant not found. Please check the link.');
    }
  }, [restaurantError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = customerName.trim();
    const phone = customerPhone.trim();
    const size = parseInt(partySize, 10);
    if (!name) {
      setError('Please enter your name');
      return;
    }
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }
    if (isNaN(size) || size < 1) {
      setError('Party size must be at least 1');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addToWaitlist({
        variables: {
          input: {
            customerName: name,
            customerPhone: phone,
            partySize: size,
            notes: notes.trim() || null,
          },
        },
      });
      const position = result.data?.addToWaitlist?.queuePosition ?? 0;
      setSuccess({ position });
      setCustomerName('');
      setCustomerPhone('');
      setPartySize('2');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to join waitlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (restaurantLoading || (!restaurant && !restaurantError)) {
    return (
      <ConsumerLayout tableNumber="" headerSubtitle="Join Waitlist">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      </ConsumerLayout>
    );
  }

  if (restaurantError || !restaurant) {
    return (
      <ConsumerLayout tableNumber="" headerSubtitle="Join Waitlist">
        <Alert severity="error" sx={{ mt: 2 }}>
          Restaurant not found. Please check the link or scan the QR code at the entrance.
        </Alert>
      </ConsumerLayout>
    );
  }

  if (success) {
    return (
      <ConsumerLayout tableNumber="" headerSubtitle="Join Waitlist">
        <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto', mt: 3 }}>
          <Box textAlign="center">
            <PeopleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              You're on the list!
            </Typography>
            <Typography variant="h4" color="primary" fontWeight="bold" sx={{ my: 2 }}>
              Position #{success.position}
            </Typography>
            <Typography color="text.secondary">
              We'll notify you when a table is ready. Please stay nearby.
            </Typography>
          </Box>
        </Paper>
      </ConsumerLayout>
    );
  }

  return (
    <ConsumerLayout tableNumber="" headerSubtitle="Join Waitlist">
      <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto', mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Join the Waitlist
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All tables are currently full. Add your name and we'll notify you when a table is ready.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Your Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            margin="normal"
            required
            type="tel"
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
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="e.g. booth preferred, high chair needed"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isSubmitting}
            sx={{ mt: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Join Waitlist'}
          </Button>
        </Box>
      </Paper>
    </ConsumerLayout>
  );
}
