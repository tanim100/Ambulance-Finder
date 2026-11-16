const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../models');

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

/**
 * Generate refresh token (long-lived)
 */
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        data: null,
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role && ['user', 'driver', 'admin'].includes(role) ? role : 'user',
    });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    user.refreshToken = refreshToken;
    await user.save();

    const userData = {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: accessToken,
      accessToken,
      refreshToken,
      user: userData,
      data: {
        token: accessToken,
        user: userData,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
        data: null,
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
      });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    user.refreshToken = refreshToken;
    await user.save();

    const userData = {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      accessToken,
      refreshToken,
      user: userData,
      data: {
        token: accessToken,
        user: userData,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        data: null,
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        data: null,
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        data: null,
      });
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshToken'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.update({ refreshToken: null }, { where: { id: req.user.id } });
    }
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/google
 * Handles Google OAuth Sign-in & Sign-up
 */
const googleAuth = async (req, res, next) => {
  try {
    const { token, credential, profile } = req.body;
    let googleUser = null;

    const idToken = credential || token;

    if (idToken) {
      try {
        // Verify with Google's public tokeninfo endpoint
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (response.ok) {
          const payload = await response.json();
          googleUser = {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name || payload.email?.split('@')[0] || 'Google User',
            avatar: payload.picture,
          };
        }
      } catch (err) {
        console.warn('Google token verification failed, checking payload fallback:', err.message);
      }
    }

    // Fallback: direct profile object if frontend handled decoding or mock demo
    if (!googleUser && profile && profile.email) {
      googleUser = {
        googleId: profile.googleId || profile.sub || `google_${Date.now()}`,
        email: profile.email,
        name: profile.name || profile.email?.split('@')[0] || 'Google User',
        avatar: profile.avatar || profile.picture,
      };
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google authentication credentials or missing email',
        data: null,
      });
    }

    // Normalize email
    googleUser.email = googleUser.email.toLowerCase().trim();

    // Check if user already exists by googleId or email
    let user = await User.findOne({
      where: {
        [Op.or]: [
          ...(googleUser.googleId ? [{ googleId: googleUser.googleId }] : []),
          { email: googleUser.email },
        ],
      },
    });

    if (user) {
      // Existing user — link googleId or update avatar if not present
      let needsSave = false;
      if (!user.googleId && googleUser.googleId) {
        user.googleId = googleUser.googleId;
        needsSave = true;
      }
      if (!user.avatar && googleUser.avatar) {
        user.avatar = googleUser.avatar;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    } else {
      // New user — Sign Up
      const randomPassword = crypto.randomBytes(16).toString('hex') + 'A1!';
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        password: randomPassword,
        role: 'user',
        googleId: googleUser.googleId,
        avatar: googleUser.avatar,
      });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    user.refreshToken = refreshToken;
    await user.save();

    const userData = {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      googleId: user.googleId,
    };

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      token: accessToken,
      accessToken,
      refreshToken,
      user: userData,
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        user: userData,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  refresh,
  getMe,
  logout,
};
