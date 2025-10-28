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
  Paper,
  LinearProgress,
  Alert
} from '@mui/material';
import { SupervisorAccount, Edit, Delete } from '@mui/icons-material';

interface StaffTableProps {
  staffLoading: boolean;
  staff: any[];
  formatDate: (iso: string) => string;
  onEdit: (staff: any) => void;
  onToggleActive: (staff: any) => void;
}

export default function StaffTable({ staffLoading, staff, formatDate, onEdit, onToggleActive }: StaffTableProps) {
  if (staffLoading) {
    return <LinearProgress />;
  }

  if (staff.length === 0) {
    return <Alert severity="info">No staff members found for this restaurant</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {staff.map((staffMember: any) => (
            <TableRow key={staffMember.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                    <SupervisorAccount />
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {staffMember.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{staffMember.email}</TableCell>
              <TableCell>
                <Chip label={staffMember.role.replace('_', ' ')} size="small" color="primary" variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip label={staffMember.isActive ? 'Active' : 'Inactive'} color={staffMember.isActive ? 'success' : 'error'} size="small" />
              </TableCell>
              <TableCell>{formatDate(staffMember.createdAt)}</TableCell>
              <TableCell>
                <Tooltip title="Edit Staff">
                  <IconButton size="small" onClick={() => onEdit(staffMember)}>
                    <Edit />
                  </IconButton>
                </Tooltip>
                <Tooltip title={staffMember.isActive ? 'Deactivate Staff' : 'Activate Staff'}>
                  <IconButton size="small" onClick={() => onToggleActive(staffMember)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}


