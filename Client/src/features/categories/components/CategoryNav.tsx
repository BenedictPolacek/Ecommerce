import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCategoryTree } from '../hooks';
import type { CategoryNode } from '../types';

interface CategoryNavProps {
  activeSlug: string;
  /** Link target for a category ('' = all products), so the page decides what to keep */
  hrefFor: (slug: string) => string;
}

export function CategoryNav({ activeSlug, hrefFor }: CategoryNavProps) {
  const { data: categories, isPending, isError } = useCategoryTree();

  if (isPending) {
    return (
      <div role="status" aria-label="Loading categories" className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-32" />
        ))}
      </div>
    );
  }

  if (isError) return <p className="text-muted-foreground text-sm">Categories unavailable.</p>;

  return (
    <nav aria-label="Categories">
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          <CategoryLink to={hrefFor('')} active={!activeSlug}>
            All products
          </CategoryLink>
        </li>
        {categories.map((node) => (
          <CategoryItem key={node.id} node={node} activeSlug={activeSlug} hrefFor={hrefFor} />
        ))}
      </ul>
    </nav>
  );
}

function CategoryItem({ node, activeSlug, hrefFor }: { node: CategoryNode } & CategoryNavProps) {
  return (
    <li>
      <CategoryLink to={hrefFor(node.slug)} active={node.slug === activeSlug}>
        {node.name}
      </CategoryLink>
      {node.children.length > 0 && (
        <ul className="mt-1 ml-3 flex flex-col gap-1 border-l pl-3">
          {node.children.map((child) => (
            <CategoryItem key={child.id} node={child} activeSlug={activeSlug} hrefFor={hrefFor} />
          ))}
        </ul>
      )}
    </li>
  );
}

function CategoryLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'hover:bg-accent block rounded-md px-2 py-1',
        active ? 'text-foreground font-medium' : 'text-muted-foreground'
      )}
    >
      {children}
    </Link>
  );
}
