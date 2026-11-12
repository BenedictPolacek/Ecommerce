import { Link, NavLink } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useLeaveSession, useLogout } from '@/features/auth/hooks';
import { CartLink } from '@/features/cart/components/CartLink';
import { DemoNotice } from './DemoNotice';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground';

export function Header() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const leaveSession = useLeaveSession();

  const handleLogout = () =>
    logout.mutate(undefined, {
      // Even if the request failed, the user wanted to leave: forget everything locally
      onSettled: async () => {
        await leaveSession();
        toast.success('You have been logged out.');
      },
    });

  return (
    <header className="border-b">
      {/* Inside the header landmark: axe flags page content outside of landmarks */}
      <DemoNotice />
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-bold">
          Ecommerce Shop
        </Link>

        <nav aria-label="Main" className="flex items-center gap-4 text-sm">
          <CartLink />
          {user ? (
            <>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
              <NavLink to="/orders" className={navLinkClass}>
                Orders
              </NavLink>
              <NavLink to="/account" className={navLinkClass}>
                {user.first_name}
              </NavLink>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logout.isPending}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>
              <Button asChild size="sm">
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
