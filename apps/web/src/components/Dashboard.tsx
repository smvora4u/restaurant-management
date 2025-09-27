import { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import ResponsiveGrid from './ResponsiveGrid';
import QRCodeGenerator from './QRCodeGenerator';
import TestHooks from '../TestHooks';

const HEALTH_QUERY = gql`
  query Health {
    health { 
      ok 
      mongo 
    }
  }
`;

interface HealthData {
  health: {
    ok: boolean;
    mongo: boolean;
  };
}

export default function Dashboard(): JSX.Element {
  const [backendStatus, setBackendStatus] = useState<string>('checking');
  const [manualTest, setManualTest] = useState<any>(null);
  
  const { data, loading, error } = useQuery<HealthData>(HEALTH_QUERY, {
    errorPolicy: 'all',
    onCompleted: (data) => {
      console.log('GraphQL query completed:', data);
      setBackendStatus('connected');
    },
    onError: (error) => {
      console.error('GraphQL query error:', error);
      setBackendStatus('error');
    }
  });

  // Manual backend test
  const testBackend = async () => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'query { health { ok mongo } }'
        })
      });
      const result = await response.json();
      setManualTest(result);
    } catch (err) {
      setManualTest({ error: err instanceof Error ? err.message : String(err) });
    }
  };

  useEffect(() => {
    // Test backend connection on component mount
    testBackend();
  }, []);

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'connected':
        return <Chip icon={<CheckCircleIcon />} label="Connected" color="success" />;
      case 'error':
        return <Chip icon={<ErrorIcon />} label="Error" color="error" />;
      case 'checking':
        return <Chip icon={<RefreshIcon />} label="Checking..." color="info" />;
      default:
        return <Chip label="Unknown" color="default" />;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          🍽️ Restaurant Management System
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome to your restaurant management dashboard
        </Typography>
      </Box>

      <ResponsiveGrid spacing={3}>
        {/* Backend Status Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Backend Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Apollo Client Status:
                </Typography>
                {loading && <Chip icon={<RefreshIcon />} label="Loading..." color="info" />}
                {error && <Chip icon={<ErrorIcon />} label="Error" color="error" />}
                {data && <Chip icon={<CheckCircleIcon />} label="Connected" color="success" />}
                {!loading && !error && !data && <Chip label="Unknown" color="default" />}
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Manual Test Status:
                </Typography>
                {getStatusChip(backendStatus)}
              </Box>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={testBackend}
                sx={{ mt: 1 }}
              >
                Test Backend Manually
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Services Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Services
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ComputerIcon color="primary" />
                  <Typography variant="body2">
                    <strong>Web Frontend:</strong> http://localhost:5173
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="primary" />
                  <Typography variant="body2">
                    <strong>Backend API:</strong> http://localhost:4000/graphql
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlayIcon color="primary" />
                  <Typography variant="body2">
                    <strong>GraphQL Playground:</strong> http://localhost:4000/graphql
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Consumer Access Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consumer Access
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Customers can access the consumer interface by scanning a QR code or visiting the consumer page directly.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Button
                  variant="outlined"
                  href="/consumer/1"
                  target="_blank"
                >
                  Test Table 1
                </Button>
                <Button
                  variant="outlined"
                  href="/consumer/5"
                  target="_blank"
                >
                  Test Table 5
                </Button>
                <Button
                  variant="outlined"
                  href="/consumer/10"
                  target="_blank"
                >
                  Test Table 10
                </Button>
                <Button
                  variant="outlined"
                  href="/parcel/takeout"
                  target="_blank"
                >
                  Test Takeout Order
                </Button>
                <Button
                  variant="outlined"
                  href="/parcel/delivery"
                  target="_blank"
                >
                  Test Delivery Order
                </Button>
                <Button
                  variant="outlined"
                  href="/order/507f1f77bcf86cd799439011"
                  target="_blank"
                >
                  Test Existing Order
                </Button>
              </Box>
              
              {/* QR Code Generator */}
              <Typography variant="subtitle1" gutterBottom>
                Generate QR Codes
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                  For Tables (Dine-in Orders):
                </Typography>
                <QRCodeGenerator 
                  value="http://localhost:5173/consumer/1" 
                  label="Table 1" 
                />
                <QRCodeGenerator 
                  value="http://localhost:5173/consumer/5" 
                  label="Table 5" 
                />
                <QRCodeGenerator 
                  value="http://localhost:5173/consumer/10" 
                  label="Table 10" 
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                  For Parcel Orders:
                </Typography>
                <QRCodeGenerator 
                  value="http://localhost:5173/parcel/takeout" 
                  label="Takeout Order" 
                />
                <QRCodeGenerator 
                  value="http://localhost:5173/parcel/delivery" 
                  label="Delivery Order" 
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Error Display */}
        {error && (
          <Box>
            <Alert severity="error">
              <AlertTitle>GraphQL Error</AlertTitle>
              {error.message}
              <details style={{ marginTop: 8 }}>
                <summary>Error Details</summary>
                <pre style={{ fontSize: '0.75rem', marginTop: 8 }}>
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            </Alert>
          </Box>
        )}

        {/* Success Display */}
        {data && (
          <Box>
            <Alert severity="success">
              <AlertTitle>GraphQL Connected Successfully!</AlertTitle>
              <pre style={{ fontSize: '0.75rem', marginTop: 8 }}>
                {JSON.stringify(data.health, null, 2)}
              </pre>
            </Alert>
          </Box>
        )}

        {/* Manual Test Result */}
        {manualTest && (
          <Box>
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Manual Test Result
              </Typography>
              <pre style={{ fontSize: '0.75rem', margin: 0 }}>
                {JSON.stringify(manualTest, null, 2)}
              </pre>
            </Paper>
          </Box>
        )}

        {/* Debug Info */}
        <Box>
          <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Debug Info
            </Typography>
            <Typography variant="body2" paragraph>
              If you see this page, React is working correctly!
            </Typography>
            <Typography variant="body2">
              Check the browser console (F12) for detailed error messages.
            </Typography>
          </Paper>
        </Box>
      </ResponsiveGrid>

      <Divider sx={{ my: 4 }} />
      
      <TestHooks />
    </Box>
  );
}
