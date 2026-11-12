const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, updateUser, getAllBookings, getReports } = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

// GET /api/admin/stats
router.get('/stats', protect, requireAdmin, getStats);

// GET /api/admin/users
router.get('/users', protect, requireAdmin, getAllUsers);

// PUT /api/admin/users/:id
router.put('/users/:id', protect, requireAdmin, updateUser);

// GET /api/admin/bookings
router.get('/bookings', protect, requireAdmin, getAllBookings);

// GET /api/admin/reports
router.get('/reports', protect, requireAdmin, getReports);

module.exports = router;
