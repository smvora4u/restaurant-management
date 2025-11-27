import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Divider
} from '@mui/material';
import {
  AttachMoney,
  Pending,
  Error,
  Receipt
} from '@mui/icons-material';

interface SalarySummaryCardProps {
  summary: {
    staffId: string;
    staffName: string;
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    paymentCount: number;
    lastPaymentDate?: string | null;
    currency: string;
  };
}

export default function SalarySummaryCard({ summary }: SalarySummaryCardProps) {
  const { currency } = summary;

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Salary Summary - {summary.staffName}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)'
            }}>
              <AttachMoney sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5 }}>
                Total Paid
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {currency} {summary.totalPaid.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)'
            }}>
              <Pending sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5 }}>
                Pending
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {currency} {summary.totalPending.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)'
            }}>
              <Error sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5 }}>
                Failed
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {currency} {summary.totalFailed.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)'
            }}>
              <Receipt sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5 }}>
                Total Payments
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {summary.paymentCount}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {summary.lastPaymentDate && (
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <Typography variant="body2" sx={{ opacity: 0.9, textAlign: 'center' }}>
              Last Payment Date: {new Date(summary.lastPaymentDate).toLocaleDateString()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

