import React from 'react';
import {
  Box,
  Avatar,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert
} from '@mui/material';
import { Restaurant, Visibility } from '@mui/icons-material';

interface OrdersTableProps {
  ordersLoading: boolean;
  filteredOrders: any[];
  restaurants: any[];
  orderPage: number;
  orderRowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  formatDateTime: (iso: string) => { date: string; time: string };
  formatCurrencyFromRestaurant: (amount: number, restaurant: any) => string;
}

export default function OrdersTable({
  ordersLoading,
  filteredOrders,
  restaurants,
  orderPage,
  orderRowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  formatDateTime,
  formatCurrencyFromRestaurant
}: OrdersTableProps) {
  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Restaurant</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordersLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Alert severity="info">No orders found</Alert>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders
                .slice(orderPage * orderRowsPerPage, orderPage * orderRowsPerPage + orderRowsPerPage)
                .map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {order.id.slice(-8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 1, bgcolor: 'primary.main', width: 24, height: 24 }}>
                          <Restaurant sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="body2" fontWeight="bold">
                          {(() => {
                            const restaurant = restaurants.find((r: any) => r.id === order.restaurantId);
                            return restaurant?.name || 'N/A';
                          })()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={order.orderType} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {order.customerName || (order.orderType === 'dine-in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Walk-in')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.customerPhone || '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {(() => {
                          const restaurant = restaurants.find((r: any) => r.id === order.restaurantId);
                          return formatCurrencyFromRestaurant(order.totalAmount, restaurant);
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        size="small"
                        color={
                          order.status === 'completed' ? 'success' :
                          order.status === 'pending' ? 'warning' :
                          order.status === 'cancelled' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const { date, time } = formatDateTime(order.createdAt);
                        return (
                          <>
                            <Typography variant="body2">{date}</Typography>
                            <Typography variant="caption" color="text.secondary">{time}</Typography>
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <span>
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredOrders.length}
        rowsPerPage={orderRowsPerPage}
        page={orderPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  );
}


