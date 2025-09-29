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
  const { showSuccess, showError } = useSnackbar();
  const [loading, setLoading] = useState(false);

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

      await createItem({
        variables: { input: { ...input, restaurantId } }
      });
      
      showSuccess(`${entityName} created successfully!`);
      refetch();
    } catch (error) {
      console.error(`Error creating ${entityName}:`, error);
      showError(`Error creating ${entityName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, input: any) => {
    try {
      setLoading(true);
      await updateItem({
        variables: { id, input }
      });
      
      showSuccess(`${entityName} updated successfully!`);
      refetch();
    } catch (error) {
      console.error(`Error updating ${entityName}:`, error);
      showError(`Error updating ${entityName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this ${entityName.toLowerCase()}?`)) {
      try {
        setLoading(true);
        await deleteItem({
          variables: { id }
        });
        
        showSuccess(`${entityName} deleted successfully!`);
        refetch();
      } catch (error) {
        console.error(`Error deleting ${entityName}:`, error);
        showError(`Error deleting ${entityName}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    loading,
  };
}
