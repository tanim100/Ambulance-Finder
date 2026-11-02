const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect, requireDriver } = require('../middleware/auth');

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

// POST /api/bookings — create booking (any authenticated user)
router.post(
  '/',
  protect,
  [
    body('pickupLocation.address').notEmpty().withMessage('Pickup address is required'),
    body('pickupLocation.lat').isFloat().withMessage('Valid pickup latitude is required'),
    body('pickupLocation.lng').isFloat().withMessage('Valid pickup longitude is required'),
    body('patientName').trim().notEmpty().withMessage('Patient name is required'),
    body('emergencyType')
      .isIn(['accident', 'cardiac', 'respiratory', 'general'])
      .withMessage('Valid emergency type is required'),
  ],
  validate,
  createBooking
);

// GET /api/bookings — get bookings (filtered by role)
router.get('/', protect, getBookings);

// GET /api/bookings/:id — get single booking
router.get('/:id', protect, getBookingById);

// PUT /api/bookings/:id/status — update booking status (driver/admin)
router.put(
  '/:id/status',
  protect,
  requireDriver,
  [
    body('status')
      .isIn(['accepted', 'enroute', 'arrived', 'completed', 'cancelled'])
      .withMessage('Valid status is required'),
  ],
  validate,
  updateBookingStatus
);

// DELETE /api/bookings/:id/cancel — cancel booking (user)
router.delete('/:id/cancel', protect, cancelBooking);

module.exports = router;
