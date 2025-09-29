import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useSnackbar } from './useSnackbar';

interface CrudOperationsConfig {
  createMutation: any;
  updateMutation: any;
  deleteMutation: any;
  refetch: () => void;
  entityName: string;
  getRestaurantId: () => string | null;
}

export function useCrudOperations({
  createMutation,
  updateMutation,
  deleteMutation,
  refetch,
  entityName,
  getRestaurantId,
}: CrudOperationsConfig) {
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const [createItem] = useMutation(createMutation);
  const [updateItem] = useMutation(updateMutation);
  const [deleteItem] = useMutation(deleteMutation);

  const handleCreate = async (input: any) => {
    try {
      setLoading(true);
      const restaurantId = getRestaurantId();
      
      if (!restaurantId) {
        showError(`${entityName} information not available. Please refresh the page and try again.`);
        return;
      }

      const result = await createItem({
        variables: { input: { ...input, restaurantId } }
      });
      
      showSuccess(`${entityName} created successfully!`);
      refetch();
    } catch (error: any) {
      console.error(`Error creating ${entityName}:`, error);
      showError(`Error creating ${entityName}: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, input: any) => {
    try {
      setLoading(true);
      const restaurantId = getRestaurantId();
      
      if (!restaurantId) {
        showError(`${entityName} information not available. Please refresh the page and try again.`);
        return;
      }

      const result = await updateItem({
        variables: { id, input: { ...input, restaurantId } }
      });
      
      showSuccess(`${entityName} updated successfully!`);
      refetch();
    } catch (error: any) {
      console.error(`Error updating ${entityName}:`, error);
      showError(`Error updating ${entityName}: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    
    try {
      setLoading(true);
      await deleteItem({
        variables: { id: deleteConfirm.id }
      });
      
      showSuccess(`${entityName} deleted successfully!`);
      refetch();
    } catch (error: any) {
      console.error(`Error deleting ${entityName}:`, error);
      showError(`Error deleting ${entityName}`);
    } finally {
      setLoading(false);
      setDeleteConfirm({ open: false, id: null });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ open: false, id: null });
  };

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    confirmDelete,
    cancelDelete,
    loading,
    snackbar,
    hideSnackbar,
    deleteConfirm,
  };
}
