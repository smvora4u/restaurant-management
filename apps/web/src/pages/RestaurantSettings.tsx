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
  TextField,
} from '@mui/material';
import { Settings as SettingsIcon, Usb as UsbIcon, ExpandMore, ExpandLess, Print as PrintIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import Layout from '../components/Layout';
import { GET_RESTAURANT_BY_SLUG } from '../graphql/queries/restaurant';
import { UPDATE_RESTAURANT_SETTINGS } from '../graphql/mutations/restaurant';
import { PRINTER_PROXY_STATUS } from '../graphql/queries/printer';
import {
  isDirectPrintSupported,
  connect,
  disconnect,
  getState,
  subscribe,
  reconnect,
  type DirectPrinterState
} from '../services/directPrinter';

export default function RestaurantSettings() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [billSize, setBillSize] = useState<string>('80mm');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  const [printerState, setPrinterState] = useState<DirectPrinterState>(getState());
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [limitsExpanded, setLimitsExpanded] = useState(false);
  const [networkPrinterHost, setNetworkPrinterHost] = useState('');
  const [networkPrinterPort, setNetworkPrinterPort] = useState(9100);

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
    skip: !slug,
  });

  const restaurantId = restaurant?.id || data?.restaurantBySlug?.id;
  const { data: proxyData } = useQuery(PRINTER_PROXY_STATUS, {
    variables: { restaurantId: restaurantId || '' },
    skip: !restaurantId,
    pollInterval: 5000,
  });
  const proxyConnected = proxyData?.printerProxyStatus?.connected ?? false;

  const [updateSettings, { loading: saving }] = useMutation(UPDATE_RESTAURANT_SETTINGS, {
    onCompleted: (data) => {
      const updated = data?.updateRestaurantSettings;
      if (updated?.settings?.billSize) {
        setBillSize(updated.settings.billSize);
      }
      if (updated?.settings?.networkPrinter) {
        setNetworkPrinterHost(updated.settings.networkPrinter.host || '');
        setNetworkPrinterPort(updated.settings.networkPrinter.port ?? 9100);
      } else {
        setNetworkPrinterHost('');
        setNetworkPrinterPort(9100);
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
      if (r.settings?.networkPrinter) {
        setNetworkPrinterHost(r.settings.networkPrinter.host || '');
        setNetworkPrinterPort(r.settings.networkPrinter.port ?? 9100);
      }
    }
  }, [data]);

  useEffect(() => {
    const unsub = subscribe(setPrinterState);
    return unsub;
  }, []);

  useEffect(() => {
    if (isDirectPrintSupported() && !printerState.isConnected) {
      reconnect().catch(() => {});
    }
  }, []);

  const handleSave = () => {
    const input: Record<string, unknown> = { billSize };
    if (networkPrinterHost.trim()) {
      input.networkPrinter = { host: networkPrinterHost.trim(), port: networkPrinterPort };
    } else {
      (input as any).networkPrinter = null;
    }
    updateSettings({
      variables: { input }
    });
  };

  const handleConnectPrinter = async () => {
    setPrinterConnecting(true);
    try {
      const ok = await connect();
      if (ok) {
        setSnackbar({ open: true, message: 'Printer connected.', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Could not connect. See limitations below.', severity: 'warning' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to connect printer.', severity: 'error' });
    } finally {
      setPrinterConnecting(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await disconnect();
    setSnackbar({ open: true, message: 'Printer disconnected.', severity: 'info' });
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
          Configure printer and billing preferences
        </Typography>

        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SettingsIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
              <Typography variant="h6">Bill / Receipt Printer</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set the thermal receipt width for customer bills. Choose the size that matches your printer.
            </Typography>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Bill Size</InputLabel>
              <Select
                value={billSize}
                label="Bill Size"
                onChange={(e) => setBillSize(e.target.value)}
              >
                <MenuItem value="58mm">2 inch (58mm)</MenuItem>
                <MenuItem value="80mm">3 inch (80mm)</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: 600, mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <UsbIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
              <Typography variant="h6">USB/Serial Printer</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect an ESC/POS thermal printer directly via USB or Serial (virtual COM port on Windows).
            </Typography>
            {isDirectPrintSupported() ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status: {printerState.isConnected ? (
                      <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>Connected: {printerState.printerName ?? 'Printer'}</Box>
                    ) : (
                      <span>Not connected</span>
                    )}
                  </Typography>
                  {printerState.isConnected ? (
                    <Button variant="outlined" color="secondary" size="small" onClick={handleDisconnectPrinter}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleConnectPrinter}
                      disabled={printerConnecting}
                    >
                      {printerConnecting ? 'Connecting...' : 'Connect printer'}
                    </Button>
                  )}
                </Box>
                <Button
                  size="small"
                  onClick={() => setLimitsExpanded(!limitsExpanded)}
                  endIcon={limitsExpanded ? <ExpandLess /> : <ExpandMore />}
                  sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                >
                  Limitations
                </Button>
                <Collapse in={limitsExpanded}>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, pl: 2 }}>
                    • USB/Serial: Chrome or Edge on HTTPS. Windows needs a driver with virtual serial port.
                    <br />
                    • Network: Run the printer proxy on a PC on the same LAN as the printer.
                    <br />
                    • Firefox/Safari: Use the standard print dialog.
                  </Typography>
                </Collapse>
              </>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                Direct print is not supported in this browser. Use Chrome or Edge on HTTPS. Firefox/Safari: use the standard print dialog.
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: 600, mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PrintIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
              <Typography variant="h6">Network Printer</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Wi-Fi/network thermal printer. Run the printer proxy on a PC on the same LAN as the printer.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Printer IP"
                value={networkPrinterHost}
                onChange={(e) => setNetworkPrinterHost(e.target.value)}
                placeholder="192.168.1.100"
                size="small"
                sx={{ minWidth: 160 }}
              />
              <TextField
                label="Port"
                type="number"
                value={networkPrinterPort}
                onChange={(e) => setNetworkPrinterPort(parseInt(e.target.value, 10) || 9100)}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Proxy status: {proxyConnected ? (
                  <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>Connected</Box>
                ) : (
                  <span>Not connected</span>
                )}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Run the proxy: <code style={{ fontSize: 11 }}>npx @restaurant/printer-proxy</code> with env: BACKEND_WS_URL, TOKEN, RESTAURANT_ID, PRINTER_HOST, PRINTER_PORT
            </Typography>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        {snackbar.open && (
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
          >
            {snackbar.message}
          </Alert>
        )}
      </Box>
    </Layout>
  );
}
