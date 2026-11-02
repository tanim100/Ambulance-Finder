const { sequelize } = require('../config/db');
const User = require('./User');
const Ambulance = require('./Ambulance');
const Driver = require('./Driver');
const Booking = require('./Booking');

// User <-> Driver (One-to-One)
User.hasOne(Driver, { foreignKey: 'userId', as: 'driverProfile', onDelete: 'CASCADE' });
Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Ambulance <-> Driver
Driver.hasOne(Ambulance, { foreignKey: 'driverId', as: 'ambulance', onDelete: 'SET NULL' });
Ambulance.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

// User <-> Booking
User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings', onDelete: 'CASCADE' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Ambulance <-> Booking
Ambulance.hasMany(Booking, { foreignKey: 'ambulanceId', as: 'bookings', onDelete: 'SET NULL' });
Booking.belongsTo(Ambulance, { foreignKey: 'ambulanceId', as: 'ambulance' });

// Driver <-> Booking
Driver.hasMany(Booking, { foreignKey: 'driverId', as: 'bookings', onDelete: 'SET NULL' });
Booking.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

module.exports = {
  sequelize,
  User,
  Ambulance,
  Driver,
  Booking,
};
