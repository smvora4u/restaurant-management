import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Settings as SettingsIcon, ExpandMore, ExpandLess, Print as PrintIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import Layout from '../components/Layout';
import { GET_RESTAURANT_BY_SLUG } from '../graphql/queries/restaurant';
import { UPDATE_RESTAURANT_SETTINGS } from '../graphql/mutations/restaurant';
import { getApiBaseUrl, queueTestPrint } from '../services/printQueue';

export default function RestaurantSettings() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [billSize, setBillSize] = useState<string>('80mm');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  const [setupGuideExpanded, setSetupGuideExpanded] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [newAgentToken, setNewAgentToken] = useState('');
  const [issuingToken, setIssuingToken] = useState(false);

  const slug = (() => {
    if (restaurant?.slug) return restaurant.slug;
    const r = localStorage.getItem('restaurant');
    if (!r) return null;
    try {
      return JSON.parse(r).slug;
    } catch {
      return null;
    }
  })();

  const { data, loading } = useQuery(GET_RESTAURANT_BY_SLUG, {
    variables: { slug: slug || '' },
    skip: !slug
  });

  const [updateSettings, { loading: saving }] = useMutation(UPDATE_RESTAURANT_SETTINGS, {
    onCompleted: (data) => {
      const updated = data?.updateRestaurantSettings;
      if (updated?.settings?.billSize) {
        setBillSize(updated.settings.billSize);
      }
      setSnackbar({
        open: true,
        message: 'Settings saved successfully.',
        severity: 'success'
      });
      const r = localStorage.getItem('restaurant');
      if (r) {
        try {
          const parsed = JSON.parse(r);
          parsed.settings = { ...parsed.settings, ...updated?.settings };
          localStorage.setItem('restaurant', JSON.stringify(parsed));
        } catch {}
      }
    },
    onError: (e) => {
      setSnackbar({
        open: true,
        message: e.message || 'Failed to save settings.',
        severity: 'error'
      });
    }
  });

  useEffect(() => {
    const r = localStorage.getItem('restaurant');
    if (!r) {
      navigate('/login');
      return;
    }
    try {
      setRestaurant(JSON.parse(r));
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (data?.restaurantBySlug) {
      const r = data.restaurantBySlug;
      setRestaurant(r);
      if (r.settings?.billSize) {
        setBillSize(r.settings.billSize);
      }
    }
  }, [data]);

  const handleSave = () => {
    updateSettings({
      variables: { input: { billSize } }
    });
  };

  const authHeaders = () => {
    const token = localStorage.getItem('restaurantToken');
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const handleIssueAgentToken = async () => {
    setIssuingToken(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/print-agent/token`, {
        method: 'POST',
        headers: authHeaders()
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to issue token');
      }
      setNewAgentToken(body.token || '');
      setTokenDialogOpen(true);
      setSnackbar({ open: true, message: 'Token generated. Copy it now — it will not be shown again.', severity: 'warning' });
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to issue token', severity: 'error' });
    } finally {
      setIssuingToken(false);
    }
  };

  const handleRevokeAgentToken = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/print-agent/token`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to revoke');
      }
      setSnackbar({ open: true, message: 'Print agent token revoked.', severity: 'info' });
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to revoke token', severity: 'error' });
    }
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    try {
      const r = await queueTestPrint();
      setSnackbar({
        open: true,
        message: r.message,
        severity: r.ok ? 'success' : 'error'
      });
    } finally {
      setTestPrinting(false);
    }
  };

  if (!restaurant && !loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Restaurant Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure receipt layout and the local print agent
        </Typography>

        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SettingsIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
              <Typography variant="h6">Bill / Receipt</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Thermal receipt width (matches your printer). ESC/POS encoding uses this for line wrapping.
            </Typography>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Bill Size</InputLabel>
              <Select value={billSize} label="Bill Size" onChange={(e) => setBillSize(e.target.value)}>
                <MenuItem value="58mm">2 inch (58mm)</MenuItem>
                <MenuItem value="80mm">3 inch (80mm)</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: 600, mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PrintIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
              <Typography variant="h6">Local print agent</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Thermal printing runs on a PC on the same LAN as the printer. Install the <code>print-agent</code> app from
              this repo, set your API URL, printer IP (port 9100), and the token below. The agent polls for pending jobs and
              prints silently — no browser popups.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Button variant="contained" onClick={handleIssueAgentToken} disabled={issuingToken}>
                {issuingToken ? 'Generating…' : 'Generate new agent token'}
              </Button>
              <Button variant="outlined" color="warning" onClick={handleRevokeAgentToken}>
                Revoke token
              </Button>
              <Button variant="outlined" onClick={handleTestPrint} disabled={testPrinting}>
                {testPrinting ? 'Queueing…' : 'Test print'}
              </Button>
            </Box>
            <Button
              size="small"
              onClick={() => setSetupGuideExpanded(!setupGuideExpanded)}
              endIcon={setupGuideExpanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
            >
              Setup guide
            </Button>
            <Collapse in={setupGuideExpanded}>
              <Box sx={{ mt: 2, pl: 1, borderLeft: 2, borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  1. Generate token
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Click &quot;Generate new agent token&quot; and copy the value into the agent&apos;s config (or env).
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  2. Printer IP
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Find your TVS / Epson LAN printer IP (often port 9100). Set <code>printerHost</code> in the agent config.
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  3. API URL
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Set <code>baseUrl</code> to your backend origin (e.g. https://api.example.com) — no <code>/graphql</code>{' '}
                  suffix.
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  4. Run agent
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <code>node agent.js</code> (or <code>npm start</code> in <code>apps/print-agent</code>). Leave it running on the
                  restaurant PC.
                </Typography>
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        <Dialog open={tokenDialogOpen} onClose={() => setTokenDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Print agent token</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Copy this token into the print agent configuration. Store it securely; it cannot be retrieved again.
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: 12,
                wordBreak: 'break-all'
              }}
            >
              {newAgentToken}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(newAgentToken);
                setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
              }}
            >
              Copy
            </Button>
            <Button onClick={() => setTokenDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {snackbar.open && (
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
          >
            {snackbar.message}
          </Alert>
        )}
      </Box>
    </Layout>
  );
}
