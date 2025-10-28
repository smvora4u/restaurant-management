import React from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Alert,
  LinearProgress
} from '@mui/material';
import { useQuery as useGqlQuery, useMutation } from '@apollo/client';
import { GET_SETTLEMENTS } from '../../../../graphql/queries/admin';
import { GENERATE_WEEKLY_SETTLEMENT } from '../../../../graphql/mutations/admin';
import { formatDateTime } from '../../../../utils/dateFormatting';

export default function SettlementsPanel({ selectedRestaurant }: { selectedRestaurant: any }) {
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);
  const restaurantId = selectedRestaurant?.id || '';

  const { data, loading, refetch } = useGqlQuery(GET_SETTLEMENTS, {
    variables: { restaurantId, limit: rowsPerPage, offset: page * rowsPerPage },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network'
  });
  const [generate, { loading: generating }] = useMutation(GENERATE_WEEKLY_SETTLEMENT, {
    onCompleted: () => void refetch(),
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
    link.download = `settlements-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const handleGenerateLastWeek = () => {
    if (!restaurantId) return;
    const today = new Date();
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 7);
    void generate({ variables: { restaurantId, periodStart: start.toISOString(), periodEnd: end.toISOString() } });
  };

  if (!restaurantId) {
    return <Alert severity="info">Select a restaurant to view settlements</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Settlements</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => void refetch()}>Refresh</Button>
          <Button variant="outlined" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="contained" onClick={handleGenerateLastWeek} disabled={generating}>Generate Last Week</Button>
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
              <TableRow><TableCell colSpan={5}><LinearProgress /></TableCell></TableRow>
            ) : settlements.length === 0 ? (
              <TableRow><TableCell colSpan={5}><Alert severity="info">No settlements found</Alert></TableCell></TableRow>
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
        onPageChange={(_, newPage) => { setPage(newPage); void refetch({ restaurantId, limit: rowsPerPage, offset: newPage * rowsPerPage }); }}
        onRowsPerPageChange={(e) => { const newRpp = parseInt(e.target.value, 10); setRowsPerPage(newRpp); setPage(0); void refetch({ restaurantId, limit: newRpp, offset: 0 }); }}
      />
    </Box>
  );
}


