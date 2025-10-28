import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Chip
} from '@mui/material';
import { Payment, TrendingUp, Restaurant, Assessment } from '@mui/icons-material';
import { useQuery as useGqlQuery } from '@apollo/client';
import { GET_DUE_FEES_SUMMARY } from '../../../../graphql/queries/admin';
import { formatDateTime } from '../../../../utils/dateFormatting';
import { formatCurrency } from '../../../../utils/currency';
import { useFeeSubscriptions } from '../../../../hooks/useFeeSubscriptions';

export default function PaymentManagementPanel() {
  const { data: dueFeesData, loading: dueFeesLoading, refetch: refetchDueFees } = useGqlQuery(GET_DUE_FEES_SUMMARY, {
    fetchPolicy: 'cache-and-network'
  });

  const dueFeesSummary = dueFeesData?.dueFeesSummary || [];

  // Set up real-time fee subscriptions for payment management
  useFeeSubscriptions({
    onFeeLedgerUpdated: () => {
      console.log('Fee ledger updated - refetching due fees');
      void refetchDueFees();
    },
    onPaymentStatusUpdated: () => {
      console.log('Payment status updated - refetching due fees');
      void refetchDueFees();
    },
    onDueFeesUpdated: () => {
      console.log('Due fees updated - refetching due fees');
      void refetchDueFees();
    },
    fallbackRefetch: () => {
      console.log('Fallback polling - refetching due fees data');
      void refetchDueFees();
    }
  });

  const totalDueFees = dueFeesSummary.reduce((sum: number, item: any) => sum + item.totalDueFees, 0);
  const totalPendingCount = dueFeesSummary.reduce((sum: number, item: any) => sum + item.pendingCount, 0);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Payment Management Overview
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Payment sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Total Due Fees
                </Typography>
              </Box>
              <Typography variant="h5" color="error.main">
                {formatCurrency(totalDueFees)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across all restaurants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Pending Payments
                </Typography>
              </Box>
              <Typography variant="h5" color="warning.main">
                {totalPendingCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Individual fees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Restaurant sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Restaurants with Due Fees
                </Typography>
              </Box>
              <Typography variant="h5" color="info.main">
                {dueFeesSummary.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active restaurants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Average Due Amount
                </Typography>
              </Box>
              <Typography variant="h5" color="success.main">
                {dueFeesSummary.length > 0 ? formatCurrency(totalDueFees / dueFeesSummary.length) : '0.00'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per restaurant
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Due Fees Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Restaurants with Due Fees
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Restaurant</TableCell>
                  <TableCell align="right">Due Amount</TableCell>
                  <TableCell align="right">Pending Count</TableCell>
                  <TableCell>Last Payment</TableCell>
                  <TableCell>Oldest Due</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dueFeesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : dueFeesSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="success">No restaurants have due fees!</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  dueFeesSummary.map((summary: any) => (
                    <TableRow key={summary.restaurantId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {summary.restaurantName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="error.main">
                          {formatCurrency(summary.totalDueFees, summary.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={summary.pendingCount} 
                          size="small" 
                          color="warning"
                        />
                      </TableCell>
                      <TableCell>
                        {summary.lastPaymentDate ? (
                          <Typography variant="caption">
                            {formatDateTime(summary.lastPaymentDate).date}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No payments yet
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {summary.oldestDueDate ? (
                          <Typography variant="caption" color="error.main">
                            {formatDateTime(summary.oldestDueDate).date}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            // Navigate to fees tab with this restaurant selected
                            // This would require passing a callback to set the selected restaurant
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
