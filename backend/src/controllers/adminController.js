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

/**
 * GET /api/admin/bookings
 * Paginated list of all bookings for admin
 */
const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'licenseNumber', 'rating'],
          required: false,
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }],
        },
        { model: Ambulance, as: 'ambulance', attributes: ['id', 'vehicleNumber', 'type'], required: false },
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
 * GET /api/admin/reports
 * Monthly booking trends, revenue summary, and type breakdown
 */
const getReports = async (req, res, next) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Monthly booking counts by status (last 6 months)
    const monthlyBookings = await sequelize.query(
      `SELECT
         DATE_FORMAT(createdAt, '%Y-%m') AS month,
         status,
         COUNT(*) AS count,
         COALESCE(SUM(fare), 0) AS revenue
       FROM Bookings
       WHERE createdAt >= :from
       GROUP BY month, status
       ORDER BY month ASC`,
      {
        replacements: { from: sixMonthsAgo.toISOString().slice(0, 10) },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Emergency type breakdown
    const typeBreakdown = await sequelize.query(
      `SELECT emergencyType, COUNT(*) AS count
       FROM Bookings
       GROUP BY emergencyType
       ORDER BY count DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // Top drivers by completed bookings
    const topDrivers = await sequelize.query(
      `SELECT u.name, u.phone, COUNT(b.id) AS completed, COALESCE(SUM(b.fare),0) AS earned
       FROM Drivers d
       JOIN Users u ON d.userId = u.id
       LEFT JOIN Bookings b ON b.driverId = d.id AND b.status = 'completed'
       GROUP BY d.id, u.name, u.phone
       ORDER BY completed DESC
       LIMIT 5`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // Overall totals
    const [totals] = await sequelize.query(
      `SELECT
         COUNT(*) AS totalBookings,
         COALESCE(SUM(CASE WHEN status='completed'  THEN 1 ELSE 0 END),0) AS completed,
         COALESCE(SUM(CASE WHEN status='cancelled'  THEN 1 ELSE 0 END),0) AS cancelled,
         COALESCE(SUM(CASE WHEN status='pending'    THEN 1 ELSE 0 END),0) AS pending,
         COALESCE(SUM(CASE WHEN status='completed'  THEN fare ELSE 0 END),0) AS totalRevenue
       FROM Bookings`,
      { type: sequelize.QueryTypes.SELECT }
    );

    return res.status(200).json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        monthlyBookings,
        typeBreakdown,
        topDrivers,
        totals,
      },
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
  getAllBookings,
  getReports,
};
