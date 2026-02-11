import React, { useMemo } from 'react';
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
  Box,
  Typography
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormatting';

interface AdvancePayment {
  id: string;
  amount: number;
  advanceDate: string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  paidAt?: string;
  notes?: string;
  isSettled: boolean;
  settledAt?: string;
  settledByPaymentId?: string;
  originalAdvanceId?: string | null;
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

function groupAdvances(advances: AdvancePayment[]): { groupKey: string; advances: AdvancePayment[] }[] {
  const groupMap = new Map<string, AdvancePayment[]>();
  for (const advance of advances) {
    const key = advance.originalAdvanceId || advance.id;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(advance);
  }
  return Array.from(groupMap.entries())
    .map(([groupKey, groupItems]) => ({
      groupKey,
      advances: groupItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }))
    .sort((a, b) => {
      const dateA = a.advances[0]?.advanceDate || a.advances[0]?.createdAt || '';
      const dateB = b.advances[0]?.advanceDate || b.advances[0]?.createdAt || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
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
  const groups = useMemo(() => groupAdvances(advances), [advances]);

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
              groups.map(({ groupKey, advances: groupAdvances }) => {
                const totalAmount = groupAdvances.reduce((sum, a) => sum + a.amount, 0);
                const rootAdvance = groupAdvances.find((a) => a.id === groupKey) || groupAdvances[0];
                const isSingleItem = groupAdvances.length === 1;

                return (
                  <React.Fragment key={groupKey}>
                    <TableRow
                      sx={{
                        bgcolor: 'grey.200',
                        borderTop: '2px solid',
                        borderTopColor: 'divider',
                        '& td': { borderBottom: 'none' }
                      }}
                    >
                      <TableCell colSpan={canManage ? 6 : 5} sx={{ py: 1.5, pl: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          Original advance: {formatDate(rootAdvance.advanceDate)} — {currency} {totalAmount.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {groupAdvances.map((advance, idx) => (
                      <TableRow
                        key={advance.id}
                        sx={{
                          bgcolor: isSingleItem ? undefined : 'grey.50',
                          borderBottom: idx === groupAdvances.length - 1 ? '2px solid' : '1px solid',
                          borderBottomColor: 'divider',
                          '&:hover': { bgcolor: isSingleItem ? undefined : 'grey.100' }
                        }}
                      >
                        <TableCell sx={{ pl: isSingleItem ? 2 : 4 }}>
                          {advance.isSettled && advance.settledAt
                            ? `Settled ${formatDate(advance.settledAt)}`
                            : formatDate(advance.advanceDate)}
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
                                <IconButton size="small" onClick={() => onEdit(advance)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              )}
                              {onDelete && !advance.isSettled && (
                                <IconButton size="small" onClick={() => onDelete(advance)} color="error">
                                  <Delete fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })
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
