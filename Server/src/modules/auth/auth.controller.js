import { catchAsync } from '../../utils/catchAsync.js';
import { authService } from './auth.service.js';
import { config } from '../../config/env.js';
import { accessTokenTtlMs, refreshTokenTtlMs } from './tokens.js';

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

const clearAuthCookies = (res) => {
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
};

export default authController;
