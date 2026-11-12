import { catchAsync } from '../../utils/catchAsync.js';
import { authService } from './auth.service.js';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { accessTokenTtlMs, refreshTokenTtlMs } from './tokens.js';
import { OAuthSignInError } from './oauth/oauth-error.js';
import {
  authorizationUrl,
  enabledProviders,
  fetchProfile,
  isProviderEnabled,
  newLoginAttempt,
} from './oauth/providers.js';
import { AppError } from '../../utils/AppError.js';

// The refresh token is only needed by /api/auth/* (refresh, logout), so the browser
// does not send it with every other request
const REFRESH_COOKIE_PATH = '/api/auth';

const baseCookieOptions = () => ({
  httpOnly: true, // Prevents JavaScript from reading the cookie (XSS protection)
  secure: config.isProduction, // HTTPS only in production
  sameSite: config.isProduction ? 'strict' : 'lax', // CSRF protection
});

const setAuthCookies = (res, { token, refreshToken }) => {
  res
    .cookie('token', token, { ...baseCookieOptions(), maxAge: accessTokenTtlMs() })
    .cookie('refresh_token', refreshToken, {
      ...baseCookieOptions(),
      path: REFRESH_COOKIE_PATH,
      maxAge: refreshTokenTtlMs(),
    });
};

export const clearAuthCookies = (res) => {
  res
    .clearCookie('token', baseCookieOptions())
    .clearCookie('refresh_token', { ...baseCookieOptions(), path: REFRESH_COOKIE_PATH });
};

/**
 * Browsers use the httpOnly cookies; other clients (Postman, mobile) the tokens in the body
 */
const sendTokenResponse = (result, statusCode, message, res) => {
  setAuthCookies(res, result);
  res.status(statusCode).json({
    success: true,
    message,
    data: result,
  });
};

// Cookie for browsers, body for other clients
const refreshTokenFrom = (req) => req.cookies?.refresh_token || req.body?.refreshToken;

const accessTokenFrom = (req) => {
  if (req.cookies?.token) return req.cookies.token;
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.split(' ')[1] : undefined;
};

const clientInfo = (req) => ({ userAgent: req.get('user-agent') });

// ─── Sign in with Google / GitHub ────────────────────────────────────────────

// state, PKCE verifier and nonce of the running login attempt, only sent to the callback
const OAUTH_COOKIE = 'oauth_attempt';
const OAUTH_COOKIE_PATH = '/api/auth/oauth';

const oauthCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  // lax, not strict: the callback is a navigation coming from the provider's site, and a
  // strict cookie would not be sent with it
  sameSite: 'lax',
  path: OAUTH_COOKIE_PATH,
});

/** Only paths inside the app (like safeRedirect in the client): no open redirect */
const safeRedirectPath = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  // Browsers treat "/\evil.com" like "//evil.com"
  !value.startsWith('/\\') &&
  value.length <= 500
    ? value
    : '/';

const oauthFailed = (res, code) =>
  res.redirect(302, `${config.appUrl}/login?oauth_error=${encodeURIComponent(code)}`);

export const authController = {
  /**
   * Handle user registration
   * POST /api/auth/register
   */
  register: catchAsync(async (req, res) => {
    const result = await authService.register(req.body, clientInfo(req));
    sendTokenResponse(result, 201, 'User registered successfully', res);
  }),

  /**
   * Handle user login
   * POST /api/auth/login
   */
  login: catchAsync(async (req, res) => {
    const result = await authService.login(req.body, clientInfo(req));
    sendTokenResponse(result, 200, 'Login successful', res);
  }),

  /**
   * Exchange the refresh token for a new token pair (rotation)
   * POST /api/auth/refresh
   */
  refresh: catchAsync(async (req, res) => {
    try {
      const tokens = await authService.refresh(refreshTokenFrom(req));
      sendTokenResponse(tokens, 200, 'Token refreshed', res);
    } catch (error) {
      // A dead refresh token is useless: remove it so the browser stops sending it
      clearAuthCookies(res);
      throw error;
    }
  }),

  /**
   * End the current session and clear the cookies
   * POST /api/auth/logout
   */
  logout: catchAsync(async (req, res) => {
    await authService.logout({
      refreshToken: refreshTokenFrom(req),
      accessToken: accessTokenFrom(req),
    });
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }),

  /**
   * End all sessions of the current user (every device)
   * POST /api/auth/logout-all
   */
  logoutAll: catchAsync(async (req, res) => {
    const count = await authService.logoutAll(req.user.id);
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: `Logged out of ${count} session(s)`,
    });
  }),

  /**
   * Active sessions (devices) of the current user
   * GET /api/auth/sessions
   */
  listSessions: catchAsync(async (req, res) => {
    const sessions = await authService.listSessions(req.user.id, req.user.sessionId);
    res.status(200).json({
      success: true,
      data: { sessions },
    });
  }),

  /**
   * End one session of the current user
   * DELETE /api/auth/sessions/:id
   */
  endSession: catchAsync(async (req, res) => {
    await authService.endSession(req.user.id, req.idParam);
    if (req.idParam === req.user.sessionId) clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: 'Session ended',
    });
  }),

  /**
   * Confirm the email address with the token from the email link
   * POST /api/auth/verify-email
   */
  verifyEmail: catchAsync(async (req, res) => {
    await authService.verifyEmail(req.body.token);
    res.status(200).json({
      success: true,
      message: 'Email address verified',
    });
  }),

  /**
   * Send a new verification email to the current user
   * POST /api/auth/verify-email/resend
   */
  resendVerification: catchAsync(async (req, res) => {
    await authService.resendVerification(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Verification email sent',
    });
  }),

  /**
   * Request a password reset link. Same answer whether or not the account exists.
   * POST /api/auth/forgot-password
   */
  forgotPassword: catchAsync(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, we have sent a password reset link.',
    });
  }),

  /**
   * Set a new password with the token from the reset link; ends all sessions
   * POST /api/auth/reset-password
   */
  resetPassword: catchAsync(async (req, res) => {
    await authService.resetPassword(req.body);
    // This browser's session was revoked as well
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: 'Password has been reset. Please log in with your new password.',
    });
  }),

  /**
   * Which sign-in providers are configured (the client shows a button for each)
   * GET /api/auth/oauth/providers
   */
  oauthProviders: (req, res) => {
    res.status(200).json({ success: true, data: { providers: enabledProviders() } });
  },

  /**
   * Starts the sign-in: remembers the attempt in a cookie and sends the browser to the provider
   * GET /api/auth/oauth/:provider?redirect=/cart
   */
  oauthStart: catchAsync(async (req, res) => {
    const { provider } = req.params;
    if (!isProviderEnabled(provider)) {
      throw new AppError('Unknown or disabled sign-in provider', 404);
    }

    const attempt = {
      ...newLoginAttempt(provider),
      redirect: safeRedirectPath(req.query.redirect),
    };
    const url = await authorizationUrl(attempt);
    // An object is stored as JSON ("j:" prefix), cookie-parser turns it back into one
    res.cookie(OAUTH_COOKIE, attempt, { ...oauthCookieOptions(), maxAge: 10 * 60 * 1000 });
    res.redirect(302, url.href);
  }),

  /**
   * The provider sends the browser back here with ?code=&state= (or ?error=).
   * On success: session cookies and a redirect into the app; otherwise to /login?oauth_error=
   * GET /api/auth/oauth/:provider/callback
   */
  oauthCallback: catchAsync(async (req, res) => {
    const { provider } = req.params;
    const attempt = req.cookies?.[OAUTH_COOKIE];
    // Single use: whatever happens, the attempt is over
    res.clearCookie(OAUTH_COOKIE, oauthCookieOptions());

    if (req.query.error) {
      return oauthFailed(res, req.query.error === 'access_denied' ? 'cancelled' : 'failed');
    }
    // No cookie: expired, or the callback was not started in this browser (login CSRF)
    if (!isProviderEnabled(provider) || attempt?.provider !== provider) {
      return oauthFailed(res, 'failed');
    }

    try {
      // The full URL with code and state; openid-client checks state, PKCE and nonce
      const callbackUrl = new URL(req.originalUrl, config.appUrl);
      const profile = await fetchProfile(callbackUrl, attempt);
      const result = await authService.oauthSignIn(provider, profile, clientInfo(req));
      setAuthCookies(res, result);
      return res.redirect(302, `${config.appUrl}${safeRedirectPath(attempt.redirect)}`);
    } catch (error) {
      if (error instanceof OAuthSignInError) return oauthFailed(res, error.code);
      // Provider errors (wrong state, invalid code, network): logged, the user just sees "failed"
      logger.warn({ reqId: req.id, provider, err: error }, 'OAuth sign-in failed');
      return oauthFailed(res, 'failed');
    }
  }),
};

export default authController;
