import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Notes as NotesIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import Layout from '../components/Layout';
import { GET_RESTAURANT_FOR_OWNER } from '../graphql/queries/restaurant';
import { UPDATE_RESTAURANT_SETTINGS } from '../graphql/mutations/restaurant';

export default function ItemInstructionsSettings() {
  const [newInstruction, setNewInstruction] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const { data, loading, refetch } = useQuery(GET_RESTAURANT_FOR_OWNER, {
    fetchPolicy: 'cache-and-network'
  });

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
      setSnackbar({ open: true, message: 'Item instructions saved successfully!', severity: 'success' });
      void refetch();
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Failed to save: ${error.message}`, severity: 'error' });
    }
  });

  const instructions: string[] = data?.restaurantForOwner?.settings?.itemInstructions ?? [];

  const handleAdd = () => {
    const trimmed = newInstruction.trim();
    if (!trimmed) return;
    if (instructions.includes(trimmed)) {
      setSnackbar({ open: true, message: 'This instruction already exists', severity: 'warning' });
      return;
    }
    const updated = [...instructions, trimmed];
    updateSettings({ variables: { input: { itemInstructions: updated } } });
    setNewInstruction('');
  };

  const handleRemove = (index: number) => {
    const updated = instructions.filter((_, i) => i !== index);
    updateSettings({ variables: { input: { itemInstructions: updated } } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

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
              <NotesIcon color="primary" />
              <Typography variant="h6">Item Instructions</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Define the special instructions customers and staff can select when adding items to an order (e.g., &quot;No onions&quot;, &quot;Extra cheese&quot;). These will appear as a multi-select dropdown instead of a free-text field.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="e.g., No onions, extra cheese"
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                onKeyDown={handleKeyDown}
                inputProps={{ maxLength: 100 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                disabled={!newInstruction.trim() || saving}
              >
                Add
              </Button>
            </Box>

            {instructions.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No instructions defined yet. Add instructions above to enable the select box when creating orders.
              </Alert>
            ) : (
              <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mt: 2 }}>
                {instructions.map((text, index) => (
                  <ListItem
                    key={`${index}-${text}`}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemove(index)}
                        disabled={saving}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={text} />
                  </ListItem>
                ))}
              </List>
            )}
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
