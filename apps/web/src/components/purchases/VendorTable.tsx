import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

interface VendorTableProps {
  vendors: Vendor[];
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (vendor: Vendor) => void;
}

export default function VendorTable({
  vendors,
  onEdit,
  onDelete
}: VendorTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Contact Person</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Status</TableCell>
            {(onEdit || onDelete) && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {vendors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={onEdit || onDelete ? 6 : 5} align="center">
                No vendors found
              </TableCell>
            </TableRow>
          ) : (
            vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.name}</TableCell>
                <TableCell>{vendor.contactPerson || '-'}</TableCell>
                <TableCell>{vendor.phone || '-'}</TableCell>
                <TableCell>{vendor.email || '-'}</TableCell>
                <TableCell>
                  {vendor.isActive ? (
                    <Box component="span" sx={{ color: 'success.main' }}>Active</Box>
                  ) : (
                    <Box component="span" sx={{ color: 'text.secondary' }}>Inactive</Box>
                  )}
                </TableCell>
                {(onEdit || onDelete) && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {onEdit && (
                        <IconButton size="small" onClick={() => onEdit(vendor)} color="primary">
                          <Edit />
                        </IconButton>
                      )}
                      {onDelete && (
                        <IconButton size="small" onClick={() => onDelete(vendor)} color="error">
                          <Delete />
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
  );
}


