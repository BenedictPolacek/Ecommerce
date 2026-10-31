export type PageItem = number | 'gap';

/** 1 … 4 5 6 … 10: first, last and the neighbours of the current page */
export function getPageItems(current: number, total: number): PageItem[] {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  return pages.flatMap((page, i) =>
    i > 0 && page - pages[i - 1] > 1 ? (['gap', page] as PageItem[]) : [page]
  );
}
