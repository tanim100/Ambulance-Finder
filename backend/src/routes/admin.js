const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, updateUser } = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

// GET /api/admin/stats
router.get('/stats', protect, requireAdmin, getStats);

// GET /api/admin/users
router.get('/users', protect, requireAdmin, getAllUsers);

// PUT /api/admin/users/:id
router.put('/users/:id', protect, requireAdmin, updateUser);

module.exports = router;
