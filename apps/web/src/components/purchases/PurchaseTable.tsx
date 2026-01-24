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
  Box,
  Collapse,
  Checkbox
} from '@mui/material';
import { Edit, Delete, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormatting';

interface PurchaseItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category?: {
    id: string;
    name: string;
  };
}

interface Purchase {
  id: string;
  vendor?: {
    name: string;
  };
  purchaseDate: string;
  items: PurchaseItem[];
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  paymentMethod?: string;
  paidAt?: string;
  invoiceNumber?: string;
}

interface PurchaseTableProps {
  purchases: Purchase[];
  currency?: string;
  onEdit?: (purchase: Purchase) => void;
  onDelete?: (purchase: Purchase) => void;
  canManage?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function PurchaseTable({
  purchases,
  currency = 'USD',
  onEdit,
  onDelete,
  canManage = false,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  selectedIds = [],
  onSelectionChange
}: PurchaseTableProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const selectable = Boolean(onSelectionChange);
  const selectedIdsSet = new Set(selectedIds);
  const unpaidIdsOnPage = purchases.filter((purchase) => purchase.paymentStatus === 'unpaid').map((purchase) => purchase.id);
  const allSelectedOnPage = selectable && unpaidIdsOnPage.length > 0 && unpaidIdsOnPage.every((id) => selectedIdsSet.has(id));
  const someSelectedOnPage = selectable && unpaidIdsOnPage.some((id) => selectedIdsSet.has(id));
  const columnCount = (canManage ? 8 : 7) + (selectable ? 1 : 0);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'unpaid':
        return 'error';
      case 'partial':
        return 'warning';
      default:
        return 'default';
    }
  };

  const toggleAllOnPage = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(Array.from(new Set([...selectedIds, ...unpaidIdsOnPage])));
      return;
    }
    onSelectionChange(selectedIds.filter((id) => !unpaidIdsOnPage.includes(id)));
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIdsSet.has(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    onSelectionChange([...selectedIds, id]);
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={!allSelectedOnPage && someSelectedOnPage}
                    checked={allSelectedOnPage}
                    onChange={(event) => toggleAllOnPage(event.target.checked)}
                    inputProps={{ 'aria-label': 'select unpaid purchases on page' }}
                  />
                </TableCell>
              )}
              <TableCell />
              <TableCell>Date</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell>Invoice #</TableCell>
              {canManage && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} align="center">
                  No purchases found
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <React.Fragment key={purchase.id}>
                  <TableRow>
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIdsSet.has(purchase.id)}
                          onChange={() => toggleOne(purchase.id)}
                          disabled={purchase.paymentStatus !== 'unpaid'}
                          inputProps={{ 'aria-label': `select purchase ${purchase.id}` }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRow(purchase.id)}
                      >
                        {expandedRows.has(purchase.id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell>{purchase.vendor?.name || '-'}</TableCell>
                    <TableCell align="right">
                      {currency} {purchase.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Chip
                          label={purchase.paymentStatus}
                          color={getStatusColor(purchase.paymentStatus) as any}
                          size="small"
                        />
                        {purchase.paidAt && (
                          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                            {formatDate(purchase.paidAt)}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{purchase.paymentMethod || '-'}</TableCell>
                    <TableCell>{purchase.invoiceNumber || '-'}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {onEdit && (
                            <IconButton size="small" onClick={() => onEdit(purchase)} color="primary">
                              <Edit />
                            </IconButton>
                          )}
                          {onDelete && (
                            <IconButton size="small" onClick={() => onDelete(purchase)} color="error">
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columnCount}>
                      <Collapse in={expandedRows.has(purchase.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Item Name</TableCell>
                                <TableCell align="right">Quantity</TableCell>
                                <TableCell>Unit</TableCell>
                                <TableCell align="right">Unit Price</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Category</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {purchase.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.itemName}</TableCell>
                                  <TableCell align="right">{item.quantity}</TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                  <TableCell align="right">
                                    {currency} {item.unitPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell align="right">
                                    {currency} {item.totalPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell>{item.category?.name || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {onPageChange && (
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


