import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TABLES } from '../graphql/queries/tables';
import { CREATE_TABLE } from '../graphql/mutations/tables';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  QrCode,
  Print,
  Share,
  Close,
  Clear,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { ConfirmationDialog } from '../components/common';


export default function QRCodeManagementPage() {
  const [customTableNumber, setCustomTableNumber] = useState('');
  const [showCustomQR, setShowCustomQR] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [hiddenQRs, setHiddenQRs] = useState<Set<string>>(new Set());
  const [restaurant, setRestaurant] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qrToDelete, setQrToDelete] = useState<string | null>(null);
  const [restoreAllConfirmOpen, setRestoreAllConfirmOpen] = useState(false);

  const { data: tablesData, loading, error, refetch } = useQuery(GET_TABLES);
  const [createTable] = useMutation(CREATE_TABLE);
  const tables = tablesData?.tables || [];

  // Get restaurant data from localStorage
  useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (restaurantData) {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, []);

  // Load hidden QR codes from localStorage
  useEffect(() => {
    const hiddenQRsData = localStorage.getItem('hiddenQRs');
    if (hiddenQRsData) {
      try {
        const hiddenArray = JSON.parse(hiddenQRsData);
        setHiddenQRs(new Set(hiddenArray));
      } catch (error) {
        console.error('Error parsing hidden QR codes:', error);
      }
    }
  }, []);

  // Memoize base URL to prevent QR code regeneration
  const baseUrl = window.location.origin;

  const handleGenerateCustomQR = async () => {
    if (customTableNumber) {
      const tableNumber = parseInt(customTableNumber);
      // Ensure table exists before showing QR code
      await ensureTableExists(tableNumber);
      setShowCustomQR(true);
      setSelectedTable(tableNumber);
    }
  };

  const handleTableSelect = async (tableNumber: number) => {
    // Ensure table exists before showing QR code
    await ensureTableExists(tableNumber);
    setSelectedTable(tableNumber);
    setShowCustomQR(true);
  };

  const handleDeleteQR = (qrId: string) => {
    setQrToDelete(qrId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (qrToDelete) {
      const newHiddenQRs = new Set([...hiddenQRs, qrToDelete]);
      setHiddenQRs(newHiddenQRs);
      // Persist to localStorage
      localStorage.setItem('hiddenQRs', JSON.stringify([...newHiddenQRs]));
    }
    setDeleteConfirmOpen(false);
    setQrToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setQrToDelete(null);
  };

  const handleClearCustomQR = () => {
    setShowCustomQR(false);
    setSelectedTable(null);
    setCustomTableNumber('');
  };

  const handleClearAllHidden = () => {
    setRestoreAllConfirmOpen(true);
  };

  const handleConfirmRestoreAll = () => {
    setHiddenQRs(new Set());
    // Clear from localStorage
    localStorage.removeItem('hiddenQRs');
    setRestoreAllConfirmOpen(false);
  };

  const handleCancelRestoreAll = () => {
    setRestoreAllConfirmOpen(false);
  };

  const ensureTableExists = async (tableNumber: number) => {
    // Check if table already exists
    const existingTable = tables.find((table: any) => table.number === tableNumber);
    
    if (!existingTable) {
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
          throw new Error('Restaurant information not available. Please refresh the page and try again.');
        }

        // Create the table
        await createTable({
          variables: {
            input: {
              restaurantId,
              number: tableNumber,
              capacity: 4, // Default capacity
              status: 'available',
              location: 'Auto-generated'
            }
          }
        });
        
        // Refetch tables to include the new table
        await refetch();
        
        console.log(`Table ${tableNumber} created automatically`);
      } catch (error) {
        console.error('Error creating table:', error);
        // Don't throw error, just log it - QR code can still be generated
      }
    }
  };

  // QR Code wrapper component with delete functionality
  const QRCodeWithDelete = ({ 
    value, 
    label, 
    qrId, 
    showDelete = false 
  }: { 
    value: string; 
    label: string; 
    qrId: string; 
    showDelete?: boolean;
  }) => {
    if (hiddenQRs.has(qrId)) return null;

    return (
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Box sx={{ position: 'relative' }}>
          <QRCodeGenerator value={value} label={label} />
          {showDelete && (
            <Box
              onClick={() => handleDeleteQR(qrId)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'rgba(244, 67, 54, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 1)',
                  transform: 'scale(1.1)',
                  transition: 'all 0.2s ease-in-out',
                },
              }}
            >
              <Close sx={{ fontSize: 16, color: 'white' }} />
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const printQRCode = (tableNumber: number) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - Table ${tableNumber}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                margin: 0;
              }
              .qr-container { 
                margin: 20px 0; 
              }
              .table-info {
                margin: 20px 0;
                font-size: 18px;
                font-weight: bold;
              }
              .instructions {
                margin: 20px 0;
                font-size: 14px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <h1>Restaurant QR Code</h1>
            <div class="table-info">Table ${tableNumber}</div>
            <div class="qr-container">
              <canvas id="qr-canvas"></canvas>
            </div>
            <div class="instructions">
              Scan this QR code to access the digital menu and place your order
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
                      QRCode.toCanvas(document.getElementById('qr-canvas'), '${baseUrl}/consumer/${restaurant?.slug || 'restaurant'}/${tableNumber}', {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

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
            QR Code Management
          </Typography>
        </Box>

        {/* Quick Access QR Codes */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCode color="primary" />
                <Typography variant="h6">
                  Quick Access QR Codes
                </Typography>
              </Box>
              {hiddenQRs.size > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleClearAllHidden}
                >
                  Restore All ({hiddenQRs.size})
                </Button>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              QR codes for your restaurant tables and parcel orders. Table QR codes are automatically generated based on your actual tables.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Table QR Codes
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {tables.length > 0 ? (
                    tables.map((table: any) => (
                      <QRCodeWithDelete 
                        key={`table-${table.number}`}
                        value={`${baseUrl}/consumer/${restaurant?.slug || 'restaurant'}/${table.number}`}
                        label={`Table ${table.number}`} 
                        qrId={`table-${table.number}`}
                        showDelete={true}
                      />
                    ))
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        No tables found.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create tables in the Tables page to generate QR codes automatically.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Parcel Order QR Codes
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <QRCodeWithDelete 
                    value={`${baseUrl}/parcel/${restaurant?.slug || 'restaurant'}/takeout`} 
                    label="Takeout" 
                    qrId="takeout"
                    showDelete={true}
                  />
                  <QRCodeWithDelete 
                    value={`${baseUrl}/parcel/${restaurant?.slug || 'restaurant'}/delivery`} 
                    label="Delivery" 
                    qrId="delivery"
                    showDelete={true}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Custom QR Code Generation */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generate Custom QR Code
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create QR codes for any table number or custom URL.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
              <TextField
                label="Table Number"
                type="number"
                value={customTableNumber}
                onChange={(e) => setCustomTableNumber(e.target.value)}
                size="small"
                sx={{ width: 200 }}
                inputProps={{ min: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleGenerateCustomQR}
                disabled={!customTableNumber}
                startIcon={<QrCode />}
              >
                Generate QR Code
              </Button>
              {showCustomQR && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleClearCustomQR}
                  startIcon={<Clear />}
                >
                  Clear
                </Button>
              )}
            </Box>
            
            {showCustomQR && selectedTable && (
              <Box sx={{ textAlign: 'center' }}>
                <QRCodeWithDelete 
                  value={`${baseUrl}/consumer/${restaurant?.slug || 'restaurant'}/${selectedTable}`} 
                  label={`Table ${selectedTable}`} 
                  qrId={`custom-table-${selectedTable}`}
                  showDelete={true}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={() => printQRCode(selectedTable)}
                  >
                    Print QR Code
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={() => {
                      navigator.share({
                        title: `QR Code for Table ${selectedTable}`,
                        text: `Scan this QR code to access the menu for Table ${selectedTable}`,
                                url: `${baseUrl}/consumer/${restaurant?.slug || 'restaurant'}/${selectedTable}`
                      }).catch(() => {
                        // Fallback to copying URL
                        navigator.clipboard.writeText(`${baseUrl}/consumer/${restaurant?.slug || 'restaurant'}/${selectedTable}`);
                        alert('URL copied to clipboard!');
                      });
                    }}
                  >
                    Share
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Table Management */}
        {tables.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generate QR Codes for Your Tables
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Click on any table to generate its QR code.
              </Typography>
              
              <Grid container spacing={2}>
                {tables.map((table: any) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={table.id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: 'action.hover',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleTableSelect(table.number)}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>
                          Table {table.number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Capacity: {table.capacity} {table.capacity === 1 ? 'person' : 'people'}
                        </Typography>
                        <Chip
                          label={table.status}
                          size="small"
                          color={
                            table.status === 'available' ? 'success' :
                            table.status === 'occupied' ? 'error' :
                            table.status === 'reserved' ? 'warning' : 'default'
                          }
                        />
                        {table.location && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            {table.location}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              How to Use QR Codes
            </Typography>
            <Box component="ol" sx={{ pl: 2 }}>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Download QR Codes:</strong> Click the "Download QR Code" button on any QR code to save it as a PNG file.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Print QR Codes:</strong> Use the print function to create printable versions of QR codes for your tables.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Delete QR Codes:</strong> Click the red delete button on any QR code to hide it from the display. Use "Restore All" to bring back deleted QR codes.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Place on Tables:</strong> Print and place QR codes on your restaurant tables for customers to scan.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  <strong>Test Links:</strong> Use the test links to verify that QR codes work correctly before printing.
                </Typography>
              </li>
            </Box>
          </CardContent>
        </Card>

        {/* Delete QR Code Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteConfirmOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete QR Code"
          message={
            <Box>
              <Typography variant="body1">
                Are you sure you want to delete this QR code? This action will hide the QR code from the display.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                You can restore it later using the "Restore All" button.
              </Typography>
            </Box>
          }
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="error"
        />

        {/* Restore All Confirmation Dialog */}
        <ConfirmationDialog
          open={restoreAllConfirmOpen}
          onClose={handleCancelRestoreAll}
          onConfirm={handleConfirmRestoreAll}
          title="Restore All QR Codes"
          message={
            <Box>
              <Typography variant="body1">
                Are you sure you want to restore all hidden QR codes? This will bring back all previously deleted QR codes.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This action cannot be undone.
              </Typography>
            </Box>
          }
          confirmText="Restore All"
          cancelText="Cancel"
          confirmColor="primary"
        />
      </Box>
    </Layout>
  );
}
