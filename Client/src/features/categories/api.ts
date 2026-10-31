import { api } from '@/lib/api-client';
import type { CategoryNode } from './types';

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const { categories } = await api.get<{ categories: CategoryNode[] }>('/categories?tree=true');
  return categories;
}

/** Depth-first search for the node matching the predicate */
function findCategory(
  nodes: CategoryNode[],
  matches: (node: CategoryNode) => boolean
): CategoryNode | null {
  for (const node of nodes) {
    if (matches(node)) return node;
    const found = findCategory(node.children, matches);
    if (found) return found;
  }
  return null;
}

/** Turns a URL slug into the category */
export const findCategoryBySlug = (nodes: CategoryNode[], slug: string) =>
  findCategory(nodes, (node) => node.slug === slug);

export const findCategoryById = (nodes: CategoryNode[], id: string) =>
  findCategory(nodes, (node) => node.id === id);
