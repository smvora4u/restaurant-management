import { useEffect, useRef } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  tableNumber?: string | number;
  value?: string;
  label?: string;
  size?: number;
}

export default function QRCodeGenerator({ tableNumber, value, label, size = 200 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (canvasRef.current) {
        const url = value || `${window.location.origin}/consumer/${tableNumber}`;
        try {
          await QRCode.toCanvas(canvasRef.current, url, {
            width: size,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      }
    };

    generateQR();
  }, [tableNumber, value, size]);

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      const filename = tableNumber ? `table-${tableNumber}-qr.png` : 'qr-code.png';
      link.download = filename;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const displayLabel = label || (tableNumber ? `Table #${tableNumber}` : 'QR Code');
  const description = tableNumber 
    ? `Scan this QR code to access the menu for Table #${tableNumber}`
    : 'Scan this QR code to access the service';

  return (
    <Paper sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        QR Code for {displayLabel}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <canvas ref={canvasRef} />
      </Box>
      <Typography variant="body2" color="text.secondary" paragraph>
        {description}
      </Typography>
      <Button variant="outlined" onClick={downloadQR}>
        Download QR Code
      </Button>
    </Paper>
  );
}
