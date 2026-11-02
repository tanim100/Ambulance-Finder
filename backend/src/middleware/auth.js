const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware to verify JWT access token and attach user to req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. No token provided.',
        data: null,
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Token expired. Please refresh your token.'
          : 'Invalid token. Please log in again.';
      return res.status(401).json({
        success: false,
        message,
        data: null,
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
        data: null,
      });
    }

    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access to admin users only
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.',
    data: null,
  });
};

/**
 * Middleware to restrict access to drivers only
 */
const requireDriver = (req, res, next) => {
  if (req.user && (req.user.role === 'driver' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Driver privileges required.',
    data: null,
  });
};

module.exports = { protect, requireAdmin, requireDriver };
