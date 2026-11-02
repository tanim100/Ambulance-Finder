const { Driver, User, Ambulance } = require('../models');

/**
 * GET /api/drivers — admin only
 */
const getAllDrivers = async (req, res, next) => {
  try {
    const { isOnline, page = 1, limit = 20 } = req.query;
    const where = {};
    if (isOnline !== undefined) where.isOnline = isOnline === 'true';

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows: drivers } = await Driver.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: Ambulance,
          as: 'ambulance',
          attributes: ['id', 'vehicleNumber', 'type', 'status'],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Drivers retrieved successfully',
      data: {
        drivers,
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
 * GET /api/drivers/:id
 */
const getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: Ambulance,
          as: 'ambulance',
          attributes: ['id', 'vehicleNumber', 'type', 'status', 'hospital'],
        },
      ],
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Driver retrieved successfully',
      data: { driver },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/drivers — admin only
 */
const createDriver = async (req, res, next) => {
  try {
    const { userId, licenseNumber, ambulanceId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    const existingDriver = await Driver.findOne({ where: { userId } });
    if (existingDriver) {
      return res.status(409).json({
        success: false,
        message: 'A driver profile already exists for this user',
        data: null,
      });
    }

    const driver = await Driver.create({
      userId,
      licenseNumber: licenseNumber.toUpperCase(),
      ambulanceId: ambulanceId || null,
    });

    // Update user role to driver
    user.role = 'driver';
    await user.save();

    // If ambulance assigned, link it
    if (ambulanceId) {
      await Ambulance.update({ driverId: driver.id }, { where: { id: ambulanceId } });
    }

    const fullDriver = await Driver.findByPk(driver.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Ambulance, as: 'ambulance', attributes: ['id', 'vehicleNumber', 'type', 'status'] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Driver profile created successfully',
      data: { driver: fullDriver },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/drivers/:id/location
 * Update driver current GPS coordinates
 */
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, bookingId } = req.body;

    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        data: null,
      });
    }

    // Authorization check
    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own location',
        data: null,
      });
    }

    driver.latitude = lat;
    driver.longitude = lng;
    await driver.save();

    // Update assigned ambulance location too
    await Ambulance.update(
      { latitude: lat, longitude: lng },
      { where: { driverId: driver.id } }
    );

    // Broadcast over Socket.io if io instance is present
    const io = req.app.get('io');
    if (io && bookingId) {
      io.to(`booking-${bookingId}`).emit('ambulance:location', {
        bookingId,
        driverId: driver.id,
        lat,
        lng,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: { location: { lat, lng } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/drivers/:id/status
 * Toggle driver online / offline
 */
const toggleStatus = async (req, res, next) => {
  try {
    const { isOnline } = req.body;

    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        data: null,
      });
    }

    if (req.user.role !== 'admin' && driver.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only toggle your own status',
        data: null,
      });
    }

    driver.isOnline = isOnline;
    await driver.save();

    // Sync ambulance status
    const ambulanceStatus = isOnline ? 'available' : 'offline';
    await Ambulance.update(
      { status: ambulanceStatus },
      { where: { driverId: driver.id, status: { [require('sequelize').Op.ne]: 'busy' } } }
    );

    return res.status(200).json({
      success: true,
      message: `Driver is now ${isOnline ? 'online' : 'offline'}`,
      data: { driver },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateLocation,
  updateDriverLocation: updateLocation,
  toggleStatus,
  updateDriverStatus: toggleStatus,
};
