/**
 * A sign-in with Google/GitHub that ends on the login page with ?oauth_error=<code>.
 * The callback is a browser navigation, not a fetch: there is no JSON error to show.
 */
export class OAuthSignInError extends Error {
  /**
   * @param {'cancelled' | 'failed' | 'email_unverified' | 'already_linked'} code
   */
  constructor(code, message = code) {
    super(message);
    this.name = 'OAuthSignInError';
    this.code = code;
  }
}
