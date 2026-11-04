import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/utils';

export interface SideNavSection {
  to: string;
  label: string;
  /** Only active on exactly this path, not on its sub-pages (e.g. /account vs /account/addresses) */
  end?: boolean;
}

interface SideNavLayoutProps {
  title: string;
  /** Accessible name of the menu, e.g. "Account" */
  navLabel: string;
  sections: SideNavSection[];
  /** Width of the content column (forms read better narrow, tables need room) */
  contentClassName?: string;
}

/** Page title, side menu (top bar on small screens) and the child route in the Outlet */
export function SideNavLayout({ title, navLabel, sections, contentClassName }: SideNavLayoutProps) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
        <nav aria-label={navLabel}>
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {sections.map(({ to, label, end = false }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'hover:bg-accent block rounded-md px-3 py-2 text-sm whitespace-nowrap',
                      isActive ? 'bg-accent font-medium' : 'text-muted-foreground'
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={cn('flex min-w-0 flex-col gap-10', contentClassName)}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
