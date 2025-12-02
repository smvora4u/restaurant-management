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

interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface CategoryTableProps {
  categories: Category[];
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export default function CategoryTable({
  categories,
  onEdit,
  onDelete
}: CategoryTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Status</TableCell>
            {(onEdit || onDelete) && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={onEdit || onDelete ? 4 : 3} align="center">
                No categories found
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.description || '-'}</TableCell>
                <TableCell>
                  {category.isActive ? (
                    <Box component="span" sx={{ color: 'success.main' }}>Active</Box>
                  ) : (
                    <Box component="span" sx={{ color: 'text.secondary' }}>Inactive</Box>
                  )}
                </TableCell>
                {(onEdit || onDelete) && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {onEdit && (
                        <IconButton size="small" onClick={() => onEdit(category)} color="primary">
                          <Edit />
                        </IconButton>
                      )}
                      {onDelete && (
                        <IconButton size="small" onClick={() => onDelete(category)} color="error">
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


