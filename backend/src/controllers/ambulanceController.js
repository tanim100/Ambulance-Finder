const { Ambulance, Driver, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/ambulances
 * List all ambulances
 */
const getAllAmbulances = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows: ambulances } = await Ambulance.findAndCountAll({
      where,
      include: [
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'licenseNumber', 'isOnline', 'rating'],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Ambulances retrieved successfully',
      data: {
        ambulances,
        pagination: {
          total: count,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(count / parsedLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ambulances/nearby?lat=&lng=&radius=
 * Get nearby ambulances using MySQL Haversine distance formula
 */
const getNearbyAmbulances = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
        data: null,
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInKm = parseFloat(radius);

    // Haversine formula for distance in kilometers
    const distanceFormula = `(
      6371 * acos(
        cos(radians(${latitude})) *
        cos(radians(Ambulance.latitude)) *
        cos(radians(Ambulance.longitude) - radians(${longitude})) +
        sin(radians(${latitude})) *
        sin(radians(Ambulance.latitude))
      )
    )`;

    const ambulances = await Ambulance.findAll({
      attributes: {
        include: [[sequelize.literal(distanceFormula), 'distance']],
      },
      where: {
        status: 'available',
        [Op.and]: [
          sequelize.where(sequelize.literal(distanceFormula), '<=', radiusInKm),
        ],
      },
      include: [
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'licenseNumber', 'isOnline', 'rating', 'latitude', 'longitude'],
        },
      ],
      order: [[sequelize.literal('distance'), 'ASC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Nearby ambulances retrieved successfully',
      data: { ambulances, count: ambulances.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ambulances/:id
 */
const getAmbulanceById = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findByPk(req.params.id, {
      include: [
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'licenseNumber', 'isOnline', 'rating', 'totalTrips', 'latitude', 'longitude'],
        },
      ],
    });

    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message: 'Ambulance not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ambulance retrieved successfully',
      data: { ambulance },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ambulances — admin only
 */
const createAmbulance = async (req, res, next) => {
  try {
    const { vehicleNumber, type, status, hospital, latitude, longitude, driverId } = req.body;

    const existing = await Ambulance.findOne({ where: { vehicleNumber: vehicleNumber.toUpperCase() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ambulance with this vehicle number already exists',
        data: null,
      });
    }

    const ambulance = await Ambulance.create({
      vehicleNumber: vehicleNumber.toUpperCase(),
      type,
      status: status || 'available',
      hospital,
      latitude: latitude !== undefined ? latitude : 0,
      longitude: longitude !== undefined ? longitude : 0,
      driverId: driverId || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Ambulance created successfully',
      data: { ambulance },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/ambulances/:id — admin only
 */
const updateAmbulance = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findByPk(req.params.id);
    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message: 'Ambulance not found',
        data: null,
      });
    }

    const { vehicleNumber, type, status, hospital, latitude, longitude, driverId } = req.body;

    if (vehicleNumber) ambulance.vehicleNumber = vehicleNumber.toUpperCase();
    if (type) ambulance.type = type;
    if (status) ambulance.status = status;
    if (hospital !== undefined) ambulance.hospital = hospital;
    if (latitude !== undefined) ambulance.latitude = latitude;
    if (longitude !== undefined) ambulance.longitude = longitude;
    if (driverId !== undefined) ambulance.driverId = driverId;

    await ambulance.save();

    return res.status(200).json({
      success: true,
      message: 'Ambulance updated successfully',
      data: { ambulance },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ambulances/:id — admin only
 */
const deleteAmbulance = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findByPk(req.params.id);
    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message: 'Ambulance not found',
        data: null,
      });
    }

    await ambulance.destroy();

    return res.status(200).json({
      success: true,
      message: 'Ambulance deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAmbulances,
  getNearbyAmbulances,
  getAmbulanceById,
  createAmbulance,
  updateAmbulance,
  deleteAmbulance,
};
