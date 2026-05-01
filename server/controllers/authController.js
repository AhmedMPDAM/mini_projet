// server/controllers/authController.js
// Authentication business logic: login, refresh, logout, forgot-password
// =========================================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { sendResetEmail } = require('../utils/emailService');

// =============================================================
// POST /api/auth/register
// Registers a new user and returns tokens
// =============================================================
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // --- Input validation ---
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // SECURITY: Returning "Email already in use" allows user enumeration
      // but in signup forms it's common practice to explicitly tell the user. 
      // If strict no-enumeration is required, you could just say "Registration failed"
      // or send an email instead. For now, we return explicit error.
      return res.status(400).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Create new user (password is hashed automatically by pre-save hook)
    const newUser = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
    });

    // Generate token pair
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Hash refresh token and save
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    newUser.refreshToken = refreshTokenHash;
    await newUser.save({ validateBeforeSave: false });

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    // Return user data and access token
    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: newUser.toJSON(),
        accessToken,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};


// =============================================================
// Helper: Generate access & refresh token pair
// =============================================================
const generateTokens = (user) => {
  // SECURITY: Include only the minimum necessary claims in the JWT payload.
  // Never include sensitive data like passwords or full user objects.
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  });

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

// =============================================================
// POST /api/auth/login
// Authenticates user with email + password, returns tokens
// =============================================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Input validation ---
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // SECURITY: Use .select('+password') to explicitly include the
    // password field which is excluded by default in the User schema.
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password +refreshToken'
    );

    // SECURITY: Return a generic message to prevent user enumeration.
    // An attacker should not be able to determine if an email exists.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if the account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Contact an administrator.',
      });
    }

    // SECURITY: bcrypt.compare is timing-safe to prevent timing attacks
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate token pair
    const { accessToken, refreshToken } = generateTokens(user);

    // SECURITY: Store a hash of the refresh token in the database,
    // not the plaintext token. This way, even if the DB is compromised,
    // the attacker cannot use the stored value directly.
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = refreshTokenHash;
    await user.save({ validateBeforeSave: false });

    // SECURITY: Set the refresh token in an HttpOnly cookie to prevent
    // XSS attacks from stealing it. The 'secure' flag ensures the cookie
    // is only sent over HTTPS in production.
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Not accessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'strict', // Prevents CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/api/auth', // Only sent to auth endpoints
    });

    // Return user data and access token
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// POST /api/auth/refresh-token
// Issues a new access token using the refresh token from cookie
// =============================================================
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found. Please log in again.',
      });
    }

    // SECURITY: Verify the refresh token signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
      });
    }

    // Find the user and verify the stored refresh token hash matches
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || !user.refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token revoked. Please log in again.',
      });
    }

    // SECURITY: Compare the provided refresh token against the stored hash.
    // This implements refresh token rotation detection.
    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isTokenValid) {
      // SECURITY: If the token doesn't match, it might have been stolen
      // and already rotated. Invalidate all sessions for this user.
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });

      return res.status(401).json({
        success: false,
        message: 'Refresh token reuse detected. All sessions invalidated.',
      });
    }

    // SECURITY: Implement refresh token rotation – issue a new pair
    // and invalidate the old refresh token.
    const tokens = generateTokens(user);
    const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshToken = newRefreshTokenHash;
    await user.save({ validateBeforeSave: false });

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// POST /api/auth/logout
// Invalidates the refresh token and clears the cookie
// =============================================================
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Decode without verification to get the userId for cleanup
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded?.userId) {
          await User.findByIdAndUpdate(decoded.userId, {
            refreshToken: null,
          });
        }
      } catch {
        // Silently handle decode errors – we still want to clear the cookie
      }
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// POST /api/auth/forgot-password
// Generates a password-reset token and sends it via email
// =============================================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    // SECURITY: Always return a success response regardless of whether
    // the email exists. This prevents user enumeration attacks.
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Return the same response to prevent enumeration
      return res.status(200).json({
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // SECURITY: Generate a cryptographically secure random token
    // using Node.js built-in crypto module.
    const resetToken = crypto.randomBytes(32).toString('hex');

    // SECURITY: Store only the hash of the reset token in the database.
    // This way, even if the DB is compromised, the attacker cannot
    // forge a valid reset link.
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = resetTokenHash;
    // SECURITY: Token expires in 1 hour to limit the window of vulnerability
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Build the reset URL pointing to the frontend reset page
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      await sendResetEmail({
        to: user.email,
        firstName: user.firstName,
        resetUrl,
      });
    } catch (emailError) {
      // If email sending fails, clean up the reset token
      console.error('Email sending failed:', emailError);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message:
          'Failed to send password reset email. Please try again later.',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

// =============================================================
// POST /api/auth/reset-password/:token
// Resets the password using a valid reset token
// =============================================================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and password confirmation are required.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // SECURITY: Hash the provided token and compare against the stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: Date.now() }, // token must not be expired
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    // Update the password (will be hashed by the pre-save middleware)
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // SECURITY: Invalidate existing sessions by clearing the refresh token
    user.refreshToken = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
};
