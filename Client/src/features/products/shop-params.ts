/**
 * The shop's filters live in the URL (?q=shirt&category=clothing&page=2), not in React state:
 * links can be shared and bookmarked, and back/forward and reload keep the view.
 */
export interface ShopParams {
  q: string;
  category: string;
  page: number;
}

export function parseShopParams(searchParams: URLSearchParams): ShopParams {
  const page = Number(searchParams.get('page'));

  return {
    q: searchParams.get('q')?.trim() ?? '',
    category: searchParams.get('category') ?? '',
    // Anything that is not a positive whole number (?page=abc, ?page=-1) means page 1
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/**
 * Builds the query string for a shop link. Changing the search or category starts again
 * at page 1, because the old page number may not exist in the new result.
 */
export function shopSearch(current: ShopParams, changes: Partial<ShopParams>): string {
  const filtersChanged = 'q' in changes || 'category' in changes;
  const next = {
    ...current,
    ...changes,
    page: changes.page ?? (filtersChanged ? 1 : current.page),
  };

  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.category) params.set('category', next.category);
  if (next.page > 1) params.set('page', String(next.page));

  const search = params.toString();
  return search ? `?${search}` : '';
}
