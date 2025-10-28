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
import { Restaurant, Group, Edit, Add, ToggleOff } from '@mui/icons-material';

interface RestaurantsTableProps {
  restaurantsLoading: boolean;
  filteredRestaurants: any[];
  restaurantPage: number;
  restaurantRowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onViewStaff: (restaurant: any) => void;
  onEditRestaurant: (restaurant: any) => void;
  onCreateSampleData: (restaurantId: string) => void;
  onToggleRestaurantStatus: (restaurantId: string) => void;
  formatDate: (iso: string) => string;
}

export default function RestaurantsTable({
  restaurantsLoading,
  filteredRestaurants,
  restaurantPage,
  restaurantRowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onViewStaff,
  onEditRestaurant,
  onCreateSampleData,
  onToggleRestaurantStatus,
  formatDate
}: RestaurantsTableProps) {
  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Restaurant</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {restaurantsLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredRestaurants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Alert severity="info">No restaurants found</Alert>
                </TableCell>
              </TableRow>
            ) : (
              filteredRestaurants
                .slice(restaurantPage * restaurantRowsPerPage, restaurantPage * restaurantRowsPerPage + restaurantRowsPerPage)
                .map((restaurant: any) => (
                  <TableRow key={restaurant.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <Restaurant />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {restaurant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {restaurant.address || 'No address'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{restaurant.email}</TableCell>
                    <TableCell>
                      <Chip label={restaurant.slug} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={restaurant.isActive ? 'Active' : 'Inactive'}
                        color={restaurant.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatDate(restaurant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Staff">
                        <IconButton size="small" onClick={() => onViewStaff(restaurant)}>
                          <Group />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Restaurant">
                        <IconButton size="small" onClick={() => onEditRestaurant(restaurant)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Create Sample Data">
                        <IconButton size="small" onClick={() => onCreateSampleData(restaurant.id)}>
                          <Add />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={restaurant.isActive ? 'Deactivate Restaurant' : 'Activate Restaurant'}>
                        <IconButton
                          size="small"
                          onClick={() => onToggleRestaurantStatus(restaurant.id)}
                          sx={{
                            color: restaurant.isActive ? 'success.main' : 'grey.500',
                            '&:hover': {
                              backgroundColor: restaurant.isActive ? 'success.light' : 'grey.100',
                              color: restaurant.isActive ? 'success.dark' : 'grey.700'
                            }
                          }}
                        >
                          {restaurant.isActive ? (
                            <ToggleOff sx={{ color: 'success.main' }} />
                          ) : (
                            <ToggleOff sx={{ color: 'grey.500', transform: 'rotate(180deg)' }} />
                          )}
                        </IconButton>
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
        count={filteredRestaurants.length}
        rowsPerPage={restaurantRowsPerPage}
        page={restaurantPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  );
}


