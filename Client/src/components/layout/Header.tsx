import { Link, NavLink, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useLogout } from '@/features/auth/hooks';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground';

export function Header() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        navigate('/');
        toast.success('You have been logged out.');
      },
    });

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-bold">
          Ecommerce Shop
        </Link>

        <nav aria-label="Main" className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
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
