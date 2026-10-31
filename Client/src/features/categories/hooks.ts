import { useQuery } from '@tanstack/react-query';
import { getCategoryTree } from './api';

export const categoryKeys = {
  all: ['categories'] as const,
  tree: () => [...categoryKeys.all, 'tree'] as const,
};

export function useCategoryTree() {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: getCategoryTree,
    // Categories rarely change
    staleTime: 10 * 60 * 1000,
  });
}
