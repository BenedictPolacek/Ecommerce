import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/utils';

const sections = [
  // end: only active on /account itself, not on /account/addresses
  { to: '/account', label: 'Profile', end: true },
  { to: '/orders', label: 'Orders', end: false },
];

/** Shared frame of all account pages: title and side menu, the page itself in the Outlet */
export function AccountLayout() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold">My account</h1>
      <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
        <nav aria-label="Account">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {sections.map(({ to, label, end }) => (
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
        <div className="flex max-w-2xl flex-col gap-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
