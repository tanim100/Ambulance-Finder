const { Booking, Ambulance, Driver, User } = require('../models');

/**
 * POST /api/bookings
 * Create a new booking (user)
 */
const createBooking = async (req, res, next) => {
  try {
    const {
      pickupLocation,
      destinationLocation,
      patientName,
      emergencyType,
      notes,
      ambulanceId,
    } = req.body;

    let ambulance = null;
    let driverId = null;

    if (ambulanceId) {
      ambulance = await Ambulance.findOne({
        where: { id: ambulanceId, status: 'available' },
        include: [{ model: Driver, as: 'driver' }],
      });

      if (!ambulance) {
        return res.status(400).json({
          success: false,
          message: 'Requested ambulance is not available',
          data: null,
        });
      }

      if (ambulance.driver) {
        driverId = ambulance.driver.id;
      }
    }

    const booking = await Booking.create({
      userId: req.user.id,
      ambulanceId: ambulance ? ambulance.id : null,
      driverId: driverId || null,
      pickupAddress: pickupLocation ? pickupLocation.address : 'Emergency Location',
      pickupLat: pickupLocation ? pickupLocation.lat : 0,
      pickupLng: pickupLocation ? pickupLocation.lng : 0,
      destinationAddress: destinationLocation ? destinationLocation.address : null,
      destinationLat: destinationLocation ? destinationLocation.lat : null,
      destinationLng: destinationLocation ? destinationLocation.lng : null,
      patientName,
      emergencyType,
      notes,
      fare: 50.0, // Base emergency dispatch fare
    });

    if (ambulance) {
      await ambulance.update({ status: 'busy' });
    }

    const fullBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Ambulance, as: 'ambulance', attributes: ['id', 'vehicleNumber', 'type'] },
        { model: Driver, as: 'driver', attributes: ['id', 'licenseNumber', 'rating'] },
      ],
    });

    // Notify drivers in the area via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('booking:new', {
        bookingId: booking.id,
        patientName,
        emergencyType,
        pickupLocation,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking: fullBooking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings
 * Get all bookings for the logged-in user (or driver/admin)
 */
const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'user') {
      where.userId = req.user.id;
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { userId: req.user.id } });
      if (driver) {
        where.driverId = driver.id;
      }
    }
    // Admin sees all

    if (status) where.status = status;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Ambulance, as: 'ambulance', attributes: ['id', 'vehicleNumber', 'type', 'status'] },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'licenseNumber', 'rating', 'totalTrips'],
          include: [{ model: User, as: 'user', attributes: ['name', 'phone'] }],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: {
        bookings,
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
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Ambulance, as: 'ambulance', attributes: ['id', 'vehicleNumber', 'type', 'status', 'latitude', 'longitude'] },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'licenseNumber', 'rating', 'totalTrips', 'latitude', 'longitude'],
          include: [{ model: User, as: 'user', attributes: ['name', 'phone'] }],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking retrieved successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/bookings/:id/status
 * Update booking status
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, estimatedTime, fare } = req.body;

    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null,
      });
    }

    if (status) booking.status = status;
    if (estimatedTime !== undefined) booking.estimatedTime = estimatedTime;
    if (fare !== undefined) booking.fare = fare;

    await booking.save();

    // Release ambulance on completed or cancelled
    if (['completed', 'cancelled'].includes(status) && booking.ambulanceId) {
      await Ambulance.update({ status: 'available' }, { where: { id: booking.ambulanceId } });
    }

    // Increment driver trips on completed
    if (status === 'completed' && booking.driverId) {
      await Driver.increment('totalTrips', { by: 1, where: { id: booking.driverId } });
    }

    const updatedBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Ambulance, as: 'ambulance', attributes: ['id', 'vehicleNumber', 'type'] },
        { model: Driver, as: 'driver', attributes: ['id', 'licenseNumber', 'rating'] },
      ],
    });

    // Emit real-time status update to booking room
    const io = req.app.get('io');
    if (io) {
      io.to(`booking-${booking.id}`).emit('booking:status', {
        bookingId: booking.id,
        status: booking.status,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: { booking: updatedBooking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/bookings/:id/cancel
 */
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null,
      });
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is ${booking.status}`,
        data: null,
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    if (booking.ambulanceId) {
      await Ambulance.update({ status: 'available' }, { where: { id: booking.ambulanceId } });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
};
