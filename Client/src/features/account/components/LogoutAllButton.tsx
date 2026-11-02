import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useLeaveSession } from '@/features/auth/hooks';
import { getErrorMessage } from '@/lib/form-errors';
import { useLogoutAll } from '../hooks';

/** E.g. after logging in on a public computer: ends every session, this one too */
export function LogoutAllButton() {
  const logoutAll = useLogoutAll();
  const leaveSession = useLeaveSession();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="self-start" disabled={logoutAll.isPending}>
          Log out everywhere
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log out on all devices?</AlertDialogTitle>
          <AlertDialogDescription>
            This includes this device. You will need to log in again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              logoutAll.mutate(undefined, {
                onSuccess: async () => {
                  await leaveSession();
                  toast.success('You have been logged out on all devices.');
                },
                onError: (error) => toast.error(getErrorMessage(error)),
              })
            }
          >
            Log out everywhere
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
