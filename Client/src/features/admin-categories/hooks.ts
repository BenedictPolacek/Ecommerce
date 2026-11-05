import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminProductKeys } from '@/features/admin-products/hooks';
import { categoryKeys } from '@/features/categories/hooks';
import { productKeys } from '@/features/products/hooks';
import { createCategory, deleteCategory, updateCategory } from './api';

/**
 * Admins see the same tree as the shop, so there is no admin query to keep in sync.
 * Products carry their category name, so their lists reload too.
 */
function useCategoryMutation<TInput, TData>(mutationFn: (input: TInput) => Promise<TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminProductKeys.all }),
      ]),
  });
}

export const useCreateCategory = () => useCategoryMutation(createCategory);

export const useUpdateCategory = () => useCategoryMutation(updateCategory);

export const useDeleteCategory = () => useCategoryMutation(deleteCategory);
