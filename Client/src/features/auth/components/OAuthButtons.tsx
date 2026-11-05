import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { safeRedirect } from '@/lib/safe-redirect';
import { oauthStartUrl } from '../api';
import { useOAuthProviders } from '../hooks';
import type { OAuthProvider } from '../types';

const LABELS: Record<OAuthProvider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
};

/**
 * "Continue with Google/GitHub" for the login and register page. Only providers the server
 * has configured are shown; without any, nothing is rendered.
 */
export function OAuthButtons() {
  const { data: providers = [] } = useOAuthProviders();
  const [searchParams] = useSearchParams();
  // After signing in, the API sends the browser back to the page that asked for a login
  const redirect = safeRedirect(searchParams.get('redirect'));

  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          // A plain link: the browser leaves the app for the provider's login page
          <Button key={provider} asChild variant="outline">
            <a href={oauthStartUrl(provider, redirect)}>{LABELS[provider]}</a>
          </Button>
        ))}
      </div>
      <div className="text-muted-foreground flex items-center gap-3 text-xs" aria-hidden>
        <span className="bg-border h-px flex-1" />
        or with email
        <span className="bg-border h-px flex-1" />
      </div>
    </div>
  );
}
