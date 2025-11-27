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

interface SalaryPayment {
  id: string;
  paymentPeriodStart: string;
  paymentPeriodEnd: string;
  baseAmount: number;
  hoursWorked?: number;
  hourlyRate?: number;
  bonusAmount: number;
  deductionAmount: number;
  advanceDeduction: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

interface SalaryPaymentTableProps {
  payments: SalaryPayment[];
  currency?: string;
  onEdit?: (payment: SalaryPayment) => void;
  onDelete?: (payment: SalaryPayment) => void;
  canManage?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

export default function SalaryPaymentTable({
  payments,
  currency = 'USD',
  onEdit,
  onDelete,
  canManage = false,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange
}: SalaryPaymentTableProps) {
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
              <TableCell>Period</TableCell>
              <TableCell align="right">Base Amount</TableCell>
              {payments.some(p => p.hoursWorked) && (
                <>
                  <TableCell align="right">Hours</TableCell>
                  <TableCell align="right">Rate</TableCell>
                </>
              )}
              <TableCell align="right">Bonus</TableCell>
              <TableCell align="right">Deduction</TableCell>
              <TableCell align="right">Advance</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment Method</TableCell>
              {canManage && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 10 : 9} align="center">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {formatDate(payment.paymentPeriodStart).date} - {formatDate(payment.paymentPeriodEnd).date}
                  </TableCell>
                  <TableCell align="right">
                    {currency} {payment.baseAmount.toFixed(2)}
                  </TableCell>
                  {payments.some(p => p.hoursWorked) && (
                    <>
                      <TableCell align="right">
                        {payment.hoursWorked ? `${payment.hoursWorked.toFixed(1)}h` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {payment.hourlyRate ? `${currency} ${payment.hourlyRate.toFixed(2)}` : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell align="right">
                    {currency} {payment.bonusAmount.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {currency} {payment.deductionAmount.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: payment.advanceDeduction > 0 ? 'warning.main' : 'inherit' }}>
                    {currency} {payment.advanceDeduction.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{currency} {payment.totalAmount.toFixed(2)}</strong>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.paymentStatus}
                      color={getStatusColor(payment.paymentStatus) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod ? (
                      <Box>
                        <div>{payment.paymentMethod}</div>
                        {payment.paymentTransactionId && (
                          <div style={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {payment.paymentTransactionId.slice(-8)}
                          </div>
                        )}
                        {payment.paidAt && (
                          <div style={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {formatDate(payment.paidAt).date}
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
                        {onEdit && (
                          <IconButton
                            size="small"
                            onClick={() => onEdit(payment)}
                            color="primary"
                            title="Edit payment"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                        {onDelete && payment.paymentStatus === 'pending' && (
                          <IconButton
                            size="small"
                            onClick={() => onDelete(payment)}
                            color="error"
                            title="Delete payment"
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

