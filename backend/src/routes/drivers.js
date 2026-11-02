const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriverLocation,
  updateDriverStatus,
} = require('../controllers/driverController');
const { protect, requireAdmin, requireDriver } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: { errors: errors.array() },
    });
  }
  next();
};

// GET /api/drivers — admin only
router.get('/', protect, requireAdmin, getAllDrivers);

// GET /api/drivers/:id
router.get('/:id', protect, getDriverById);

// POST /api/drivers — admin only
router.post(
  '/',
  protect,
  requireAdmin,
  [
    body('userId').notEmpty().withMessage('userId is required'),
    body('licenseNumber').notEmpty().withMessage('licenseNumber is required'),
  ],
  validate,
  createDriver
);

// PUT /api/drivers/:id/location — driver or admin
router.put(
  '/:id/location',
  protect,
  requireDriver,
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  ],
  validate,
  updateDriverLocation
);

// PUT /api/drivers/:id/status — driver or admin
router.put(
  '/:id/status',
  protect,
  requireDriver,
  [body('isOnline').isBoolean().withMessage('isOnline must be a boolean')],
  validate,
  updateDriverStatus
);

module.exports = router;
