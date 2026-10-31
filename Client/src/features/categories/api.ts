import { api } from '@/lib/api-client';
import type { CategoryNode } from './types';

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const { categories } = await api.get<{ categories: CategoryNode[] }>('/categories?tree=true');
  return categories;
}

/** Depth-first search through the tree, e.g. to turn a URL slug into the category */
export function findCategoryBySlug(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findCategoryBySlug(node.children, slug);
    if (found) return found;
  }
  return null;
}
