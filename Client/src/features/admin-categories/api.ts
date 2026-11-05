import type { Category } from '@/features/categories/types';
import { api } from '@/lib/api-client';

export interface CategoryInput {
  name: string;
  /** Omitted: generated from the name (new) or unchanged (edit) */
  slug?: string;
  description?: string;
  /** null = top level */
  parent_id: string | null;
}

export const createCategory = async (input: CategoryInput) =>
  (await api.post<{ category: Category }>('/categories', input)).category;

export const updateCategory = async ({ id, ...input }: CategoryInput & { id: string }) =>
  (await api.put<{ category: Category }>(`/categories/${id}`, input)).category;

export const deleteCategory = (id: string) => api.delete<void>(`/categories/${id}`);
