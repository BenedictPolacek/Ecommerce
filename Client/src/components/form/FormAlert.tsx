import { Alert, AlertDescription } from '@/components/ui/alert';

/** Form-level error, e.g. "Invalid email or password" or a network problem */
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
