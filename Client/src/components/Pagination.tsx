import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { getPageItems } from '@/lib/pagination';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Link target (query string) for a page, e.g. "?q=shirt&page=2" */
  hrefFor: (page: number) => string;
}

/** Real links, not buttons: every page has its own URL that can be opened in a new tab */
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <PageLink to={hrefFor(page - 1)} disabled={page <= 1} label="Previous page">
        <ChevronLeft />
      </PageLink>

      {getPageItems(page, totalPages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="text-muted-foreground px-2" aria-hidden>
            …
          </span>
        ) : (
          <Button key={item} asChild size="icon" variant={item === page ? 'default' : 'ghost'}>
            <Link
              to={hrefFor(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Link>
          </Button>
        )
      )}

      <PageLink to={hrefFor(page + 1)} disabled={page >= totalPages} label="Next page">
        <ChevronRight />
      </PageLink>
    </nav>
  );
}

function PageLink({
  to,
  disabled,
  label,
  children,
}: {
  to: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <Button size="icon" variant="ghost" disabled aria-label={label}>
        {children}
      </Button>
    );
  }

  return (
    <Button asChild size="icon" variant="ghost">
      <Link to={to} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
