import { flattenCategoryTree, type CategoryOption } from '@/features/categories/api';
import type { CategoryNode } from '@/features/categories/types';

// Mirrors MAX_CATEGORY_DEPTH on the server: e.g. Clothing → Men → Shirts
export const MAX_CATEGORY_DEPTH = 3;

/** Levels of a category and its subcategories: 1 = no subcategories */
export const subtreeHeight = (node: CategoryNode): number =>
  1 + Math.max(0, ...node.children.map(subtreeHeight));

const subtreeIds = (node: CategoryNode): string[] => [
  node.id,
  ...node.children.flatMap(subtreeIds),
];

/**
 * Categories that can be the parent of `category` (or of a new category without it):
 * not the category itself or one of its subcategories (that would be a cycle), and the
 * whole subtree must still fit into MAX_CATEGORY_DEPTH. The server checks the same.
 */
export function parentOptions(tree: CategoryNode[], category?: CategoryNode): CategoryOption[] {
  const excluded = new Set(category ? subtreeIds(category) : []);
  const height = category ? subtreeHeight(category) : 1;

  // option.depth is 0-based: a top-level parent puts the category on level 2
  return flattenCategoryTree(tree).filter(
    (option) => !excluded.has(option.id) && option.depth + 1 + height <= MAX_CATEGORY_DEPTH
  );
}
