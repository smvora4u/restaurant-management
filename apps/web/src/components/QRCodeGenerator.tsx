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

  const displayLabel = label || (tableNumber ? `Table #${tableNumber}` : 'QR Code');

  const downloadQR = () => {
    if (!canvasRef.current) return;

    const qrCanvas = canvasRef.current;
    const padding = 16;
    const labelHeight = 24;
    const compositeWidth = size + padding * 2;
    const compositeHeight = size + labelHeight + padding * 2;

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = compositeWidth;
    compositeCanvas.height = compositeHeight;
    const ctx = compositeCanvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, compositeWidth, compositeHeight);
      ctx.drawImage(qrCanvas, padding, padding, size, size);
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(displayLabel, compositeWidth / 2, size + padding + 18);
    }

    const slug = displayLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = slug ? `${slug}-qr.png` : 'qr-code.png';

    const link = document.createElement('a');
    link.download = filename;
    link.href = compositeCanvas.toDataURL('image/png');
    link.click();
  };

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
