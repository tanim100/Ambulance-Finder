const { sequelize, Booking, Ambulance, Driver, User } = require('../models');
const { Op } = require('sequelize');

/**
 * POST /api/bookings
 * Create a new booking (user) with concurrency control & double-booking prevention
 */
const createBooking = async (req, res, next) => {
  const transaction = await sequelize.transaction();
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
      // Pessimistic row-level lock (SELECT ... FOR UPDATE) to prevent race conditions
      ambulance = await Ambulance.findOne({
        where: { id: ambulanceId },
        include: [{ model: Driver, as: 'driver' }],
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!ambulance) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Requested ambulance not found',
          data: null,
        });
      }

      if (ambulance.status !== 'available') {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Requested ambulance is currently busy or already booked. Please choose another ambulance.',
          data: null,
        });
      }

      // Concurrency check: Ensure no other active trip exists for this ambulance
      const activeTrip = await Booking.findOne({
        where: {
          ambulanceId: ambulance.id,
          status: { [Op.in]: ['pending', 'accepted', 'enroute', 'arrived'] },
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (activeTrip) {
        await ambulance.update({ status: 'busy' }, { transaction });
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Requested ambulance is already assigned to an ongoing emergency trip.',
          data: null,
        });
      }

      if (ambulance.driver) {
        driverId = ambulance.driver.id;
      }

      // Atomically mark ambulance as busy within transaction
      await ambulance.update({ status: 'busy' }, { transaction });
    }

    const booking = await Booking.create(
      {
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
      },
      { transaction }
    );

    await transaction.commit();

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
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
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

    // Authorization check: User can only view their own booking, Driver can only view assigned or unassigned pending, Admin has full access
    if (req.user.role === 'user') {
      if (String(booking.userId) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view this booking.',
          data: null,
        });
      }
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { userId: req.user.id } });
      const isAssigned = driver && booking.driverId && String(booking.driverId) === String(driver.id);
      const isPendingUnassigned = !booking.driverId && (booking.status || '').toLowerCase() === 'pending';
      if (!isAssigned && !isPendingUnassigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view this booking.',
          data: null,
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to view this booking.',
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
 * Update booking status with concurrency control against race conditions
 */
const updateBookingStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { status, estimatedTime, fare } = req.body;

    const booking = await Booking.findByPk(req.params.id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null,
      });
    }

    // Normalize incoming status
    let normalizedStatus = status;
    if (status) {
      const raw = String(status).trim().toLowerCase();
      if (raw === 'accepted') normalizedStatus = 'accepted';
      else if (['enroute', 'en route', 'en-route', 'heading to hospital', 'headingtohospital'].includes(raw)) normalizedStatus = 'enroute';
      else if (raw === 'arrived') normalizedStatus = 'arrived';
      else if (raw === 'completed') normalizedStatus = 'completed';
      else if (['cancelled', 'canceled'].includes(raw)) normalizedStatus = 'cancelled';
      else if (raw === 'pending') normalizedStatus = 'pending';
    }

    // Authorization check: Only assigned driver or admin can update booking status
    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { userId: req.user.id }, transaction });
      if (!driver) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied. Driver profile not found.',
          data: null,
        });
      }

      // If the booking is already assigned to a DIFFERENT driver, deny access
      if (booking.driverId && String(booking.driverId) !== String(driver.id)) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this booking.',
          data: null,
        });
      }

      // If the booking is unassigned:
      // A driver can only update status if they are accepting the booking
      if (!booking.driverId) {
        if (normalizedStatus === 'accepted') {
          // RACE CONDITION CHECK: Ensure booking is still pending and has not been accepted by another driver
          if (booking.status !== 'pending') {
            await transaction.rollback();
            return res.status(409).json({
              success: false,
              message: 'This booking has already been accepted by another driver or is no longer available.',
              data: null,
            });
          }

          // RACE CONDITION CHECK: Ensure driver's ambulance is not already busy or double-booked
          const ambulance = await Ambulance.findOne({
            where: { driverId: driver.id },
            lock: transaction.LOCK.UPDATE,
            transaction,
          });

          if (ambulance) {
            const activeTrip = await Booking.findOne({
              where: {
                ambulanceId: ambulance.id,
                status: { [Op.in]: ['accepted', 'enroute', 'arrived'] },
                id: { [Op.ne]: booking.id },
              },
              transaction,
            });

            if (activeTrip || ambulance.status === 'busy') {
              await transaction.rollback();
              return res.status(409).json({
                success: false,
                message: 'Your ambulance is already on an active trip. Complete your current trip before accepting another.',
                data: null,
              });
            }

            booking.ambulanceId = ambulance.id;
            await ambulance.update({ status: 'busy' }, { transaction });
          }

          booking.driverId = driver.id;
        } else {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'Access denied. You must accept this booking before updating its status.',
            data: null,
          });
        }
      }
    } else if (req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Driver or Admin privileges required.',
        data: null,
      });
    }

    // Check if booking is already in a terminal state
    const currentStatus = (booking.status || '').toLowerCase();
    if (['completed', 'cancelled'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot update status of a booking that is already ${booking.status}.`,
        data: null,
      });
    }

    if (normalizedStatus) booking.status = normalizedStatus;
    if (estimatedTime !== undefined) booking.estimatedTime = estimatedTime;
    if (fare !== undefined) booking.fare = fare;

    await booking.save({ transaction });

    // Release ambulance on completed or cancelled
    if (['completed', 'cancelled'].includes(normalizedStatus) && booking.ambulanceId) {
      await Ambulance.update(
        { status: 'available' },
        { where: { id: booking.ambulanceId }, transaction }
      );
    }

    // Increment driver trips on completed
    if (normalizedStatus === 'completed' && booking.driverId) {
      await Driver.increment('totalTrips', { by: 1, where: { id: booking.driverId }, transaction });
    }

    await transaction.commit();

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
      message: `Booking status updated to ${booking.status}`,
      data: { booking: updatedBooking },
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};

/**
 * DELETE /api/bookings/:id/cancel
 */
const cancelBooking = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null,
      });
    }

    // Authorization check: Only booking owner (user), assigned driver, or admin can cancel
    if (req.user.role === 'user') {
      if (String(booking.userId) !== String(req.user.id)) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to cancel this booking.',
          data: null,
        });
      }
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { userId: req.user.id }, transaction });
      if (!driver || !booking.driverId || String(booking.driverId) !== String(driver.id)) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this booking.',
          data: null,
        });
      }
    } else if (req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to cancel this booking.',
        data: null,
      });
    }

    const currentStatus = (booking.status || '').toLowerCase();
    if (currentStatus === 'cancelled') {
      await transaction.rollback();
      return res.status(200).json({
        success: true,
        message: 'Booking is already cancelled',
        data: { booking },
      });
    }

    if (!['pending', 'accepted', 'enroute'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is ${booking.status}`,
        data: null,
      });
    }

    booking.status = 'cancelled';
    await booking.save({ transaction });

    if (booking.ambulanceId) {
      await Ambulance.update(
        { status: 'available' },
        { where: { id: booking.ambulanceId }, transaction }
      );
    }

    await transaction.commit();

    // Emit real-time status update to booking room & global channel for drivers
    const io = req.app.get('io');
    if (io) {
      io.to(`booking-${booking.id}`).emit('booking:status', {
        bookingId: booking.id,
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
      io.emit('booking:cancelled', {
        bookingId: booking.id,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking },
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
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
