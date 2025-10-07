import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Button,
  TablePagination
} from '@mui/material';
import { useQuery } from '@apollo/client';
import Layout from '../components/Layout';
import { GET_SETTLEMENTS } from '../graphql/queries/admin';
import { formatDateTime } from '../utils/dateFormatting';

export default function RestaurantSettlements() {
  const [restaurant, setRestaurant] = React.useState<any>(null);
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);

  React.useEffect(() => {
    const restaurantData = localStorage.getItem('restaurant');
    if (restaurantData && restaurantData !== 'undefined' && restaurantData !== 'null') {
      setRestaurant(JSON.parse(restaurantData));
    }
  }, []);

  const { data, loading, refetch } = useQuery(GET_SETTLEMENTS, {
    variables: { restaurantId: restaurant?.id || '', limit: rowsPerPage, offset: page * rowsPerPage },
    skip: !restaurant?.id,
    fetchPolicy: 'cache-and-network'
  });

  const settlements = data?.settlements || [];

  const handleExportCsv = () => {
    const headers = ['periodStart', 'periodEnd', 'currency', 'totalOrders', 'totalOrderAmount', 'totalFees', 'generatedAt'];
    const rows = settlements.map((s: any) => [s.periodStart, s.periodEnd, s.currency, s.totalOrders, s.totalOrderAmount, s.totalFees, s.generatedAt]);
    const csv = [headers.join(','), ...rows.map((r: (string|number)[]) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `restaurant-settlements-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (!restaurant) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Settlements</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => void refetch()}>Refresh</Button>
            <Button variant="outlined" onClick={handleExportCsv}>Export CSV</Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell align="right">Total Orders</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell align="right">Total Fees</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5}><CircularProgress size={20} /></TableCell></TableRow>
              ) : settlements.length === 0 ? (
                <TableRow><TableCell colSpan={5}><Alert severity="info">No settlements yet</Alert></TableCell></TableRow>
              ) : (
                settlements.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDateTime(s.periodStart).date} - {formatDateTime(s.periodEnd).date}</TableCell>
                    <TableCell align="right">{s.totalOrders}</TableCell>
                    <TableCell align="right">{s.currency} {s.totalOrderAmount.toFixed(2)}</TableCell>
                    <TableCell align="right">{s.currency} {s.totalFees.toFixed(2)}</TableCell>
                    <TableCell>{formatDateTime(s.generatedAt).date} {formatDateTime(s.generatedAt).time}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => window.open(`/settlements/${s.id}/pdf`, '_blank')}>PDF</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 25, 50]}
          count={-1}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => { setPage(newPage); void refetch({ restaurantId: restaurant.id, limit: rowsPerPage, offset: newPage * rowsPerPage }); }}
          onRowsPerPageChange={(e) => { const newRpp = parseInt(e.target.value, 10); setRowsPerPage(newRpp); setPage(0); void refetch({ restaurantId: restaurant.id, limit: newRpp, offset: 0 }); }}
        />
      </Box>
    </Layout>
  );
}


