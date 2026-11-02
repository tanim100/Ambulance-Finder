/**
 * Global error handling middleware for Express & Sequelize (MySQL)
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Sequelize Unique Constraint error (Duplicate key)
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    const fields = err.errors ? err.errors.map((e) => e.path).join(', ') : 'field';
    message = `Duplicate value for ${fields}. Please use a different value.`;
  }

  // Sequelize Validation error
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors ? err.errors.map((e) => e.message).join(', ') : 'Validation error';
  }

  // Sequelize Database error / Foreign Key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  // Log error in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${err.stack || err}`);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
