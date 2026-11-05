/**
 * Messages for /login?oauth_error=<code>: the API redirects there when a sign-in with
 * Google/GitHub did not work (the callback is a navigation, so there is no JSON error)
 */
const OAUTH_ERRORS: Record<string, string> = {
  cancelled: 'Sign-in was cancelled.',
  email_unverified:
    'Your email address is not verified at Google or GitHub. Verify it there, or sign up with email and password.',
  already_linked:
    'Your account is already linked to another Google or GitHub account. Use that one, or log in with your password.',
  failed: 'Sign-in did not work. Please try again.',
};

/** Message for the code, or undefined without one (unknown codes get the general message) */
export const oauthErrorMessage = (code: string | null) =>
  code ? (OAUTH_ERRORS[code] ?? OAUTH_ERRORS.failed) : undefined;
