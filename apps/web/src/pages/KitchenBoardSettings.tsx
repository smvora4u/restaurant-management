import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { Kitchen as KitchenIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import Layout from '../components/Layout';
import { GET_RESTAURANT_FOR_OWNER } from '../graphql/queries/restaurant';
import { UPDATE_RESTAURANT_SETTINGS } from '../graphql/mutations/restaurant';

export default function KitchenBoardSettings() {
  const [value, setValue] = useState<number | ''>('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const { data, loading, refetch } = useQuery(GET_RESTAURANT_FOR_OWNER, {
    fetchPolicy: 'cache-and-network'
  });

  const currentValue = data?.restaurantForOwner?.settings?.kitchenBoardClickIncrement ?? 1;
  const displayValue = value === '' ? currentValue : value;

  const [updateSettings, { loading: saving }] = useMutation(UPDATE_RESTAURANT_SETTINGS, {
    onCompleted: (result) => {
      const updated = result.updateRestaurantSettings;
      const restaurantData = localStorage.getItem('restaurant');
      if (restaurantData) {
        try {
          const restaurant = JSON.parse(restaurantData);
          restaurant.settings = updated.settings;
          localStorage.setItem('restaurant', JSON.stringify(restaurant));
        } catch (_) {}
      }
      setSnackbar({ open: true, message: 'Kitchen board settings saved successfully!', severity: 'success' });
      setValue('');
      void refetch();
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Failed to save: ${error.message}`, severity: 'error' });
    }
  });

  const handleSave = () => {
    const num = value === '' ? currentValue : (typeof value === 'number' ? value : parseInt(String(value), 10));
    if (isNaN(num) || num < 1 || num > 99) {
      setSnackbar({ open: true, message: 'Please enter a number between 1 and 99', severity: 'warning' });
      return;
    }
    updateSettings({ variables: { input: { kitchenBoardClickIncrement: num } } });
  };

  const effectiveValue = value === '' ? currentValue : value;
  const canSave = effectiveValue >= 1 && effectiveValue <= 99;

  if (loading && !data) {
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
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <KitchenIcon color="primary" />
              <Typography variant="h6">Kitchen Board Settings</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              When a kitchen item is clicked, this many units move to the next column. Set to 1 for one-at-a-time, or higher to move multiple units per click.
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                type="number"
                size="small"
                label="Quantity moved per click"
                value={displayValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setValue('');
                  else {
                    const n = parseInt(v, 10);
                    if (!isNaN(n)) setValue(Math.min(99, Math.max(1, n)));
                  }
                }}
                inputProps={{ min: 1, max: 99 }}
                sx={{ width: 160 }}
              />
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !canSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Layout>
  );
}
