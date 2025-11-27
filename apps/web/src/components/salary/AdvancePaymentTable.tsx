import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TablePagination,
  Box
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormatting';

interface AdvancePayment {
  id: string;
  amount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  paidAt?: string;
  notes?: string;
  isSettled: boolean;
  settledAt?: string;
  settledByPaymentId?: string;
  createdAt: string;
}

interface AdvancePaymentTableProps {
  advances: AdvancePayment[];
  currency?: string;
  onEdit?: (advance: AdvancePayment) => void;
  onDelete?: (advance: AdvancePayment) => void;
  canManage?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

export default function AdvancePaymentTable({
  advances,
  currency = 'USD',
  onEdit,
  onDelete,
  canManage = false,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange
}: AdvancePaymentTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Settlement</TableCell>
              <TableCell>Payment Method</TableCell>
              {canManage && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {advances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} align="center">
                  No advance payments found
                </TableCell>
              </TableRow>
            ) : (
              advances.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell>
                    {formatDate(advance.createdAt)}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{currency} {advance.amount.toFixed(2)}</strong>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={advance.paymentStatus}
                      color={getStatusColor(advance.paymentStatus) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {advance.isSettled ? (
                      <Box>
                        <Chip label="Settled" color="success" size="small" />
                        {advance.settledAt && (
                          <div style={{ fontSize: '0.75rem', color: 'text.secondary', marginTop: 4 }}>
                            {formatDate(advance.settledAt)}
                          </div>
                        )}
                      </Box>
                    ) : (
                      <Chip label="Pending" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {advance.paymentMethod ? (
                      <Box>
                        <div>{advance.paymentMethod}</div>
                        {advance.paymentTransactionId && (
                          <div style={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {advance.paymentTransactionId.slice(-8)}
                          </div>
                        )}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {onEdit && !advance.isSettled && (
                          <IconButton
                            size="small"
                            onClick={() => onEdit(advance)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                        {onDelete && !advance.isSettled && (
                          <IconButton
                            size="small"
                            onClick={() => onDelete(advance)}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {onPageChange && onRowsPerPageChange && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50]}
        />
      )}
    </Box>
  );
}

