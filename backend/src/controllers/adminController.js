const { User, Ambulance, Booking, Driver, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/admin/stats
 * Dashboard statistics
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAmbulances,
      totalBookings,
      totalDrivers,
      availableAmbulances,
      activeBookings,
      completedBookings,
      totalRevenue,
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Ambulance.count(),
      Booking.count(),
      Driver.count(),
      Ambulance.count({ where: { status: 'available' } }),
      Booking.count({
        where: {
          status: { [Op.in]: ['pending', 'accepted', 'enroute', 'arrived'] },
        },
      }),
      Booking.count({ where: { status: 'completed' } }),
      Booking.sum('fare', { where: { status: 'completed' } }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved',
      data: {
        stats: {
          totalUsers,
          totalAmbulances,
          totalBookings,
          totalDrivers,
          availableAmbulances,
          activeBookings,
          completedBookings,
          totalRevenue: totalRevenue || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'refreshToken'] },
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
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
 * PUT /api/admin/users/:id
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified',
        data: null,
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getAllUsers,
  updateUserRole,
  updateUser: updateUserRole,
};
