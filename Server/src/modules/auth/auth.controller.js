import { catchAsync } from '../../utils/catchAsync.js';
import { authService } from './auth.service.js';

/**
 * Attaches the JWT to a secure httpOnly cookie and sends the response.
 */
const sendTokenResponse = (result, statusCode, message, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: true, // Prevents JavaScript from reading the cookie (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res
    .status(statusCode)
    .cookie('token', result.token, cookieOptions)
    .json({
      success: true,
      message,
      data: result,
    });
};

export const authController = {
  /**
   * Handle user registration
   * POST /api/auth/register
   */
  register: catchAsync(async (req, res) => {
    const result = await authService.register(req.body);
    sendTokenResponse(result, 201, 'User registered successfully', res);
  }),

  /**
   * Handle user login
   * POST /api/auth/login
   */
  login: catchAsync(async (req, res) => {
    const result = await authService.login(req.body);
    sendTokenResponse(result, 200, 'Login successful', res);
  }),

  /**
   * Handle user logout (clears the httpOnly cookie)
   * POST /api/auth/logout
   */
  logout: (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },
};

export default authController;
