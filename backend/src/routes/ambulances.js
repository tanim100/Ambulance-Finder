const express = require('express');
const router = express.Router();
const {
  getAllAmbulances,
  getNearbyAmbulances,
  getAmbulanceById,
  createAmbulance,
  updateAmbulance,
  deleteAmbulance,
} = require('../controllers/ambulanceController');
const { protect, requireAdmin } = require('../middleware/auth');

// GET /api/ambulances
router.get('/', protect, getAllAmbulances);

// GET /api/ambulances/nearby?lat=&lng=&radius=
router.get('/nearby', protect, getNearbyAmbulances);

// GET /api/ambulances/:id
router.get('/:id', protect, getAmbulanceById);

// POST /api/ambulances — admin only
router.post('/', protect, requireAdmin, createAmbulance);

// PUT /api/ambulances/:id — admin only
router.put('/:id', protect, requireAdmin, updateAmbulance);

// DELETE /api/ambulances/:id — admin only
router.delete('/:id', protect, requireAdmin, deleteAmbulance);

module.exports = router;
