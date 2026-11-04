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

export interface CategoryOption {
  id: string;
  name: string;
  /** 0 = top level, 1 = subcategory, ... (for indenting in a select) */
  depth: number;
}

/** The tree as a flat list in display order, e.g. for a <select> */
export function flattenCategoryTree(nodes: CategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ]);
}

// Non-breaking space: written as a char code, an invisible literal would look like a space
const NBSP = String.fromCharCode(0xa0);

/** "Audio", then "Headphones" indented: <option> cannot be indented with CSS */
export const categoryOptionLabel = ({ name, depth }: CategoryOption) =>
  NBSP.repeat(depth * 4) + name;
