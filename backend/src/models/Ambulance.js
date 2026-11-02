const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ambulance = sequelize.define(
  'Ambulance',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    vehicleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Vehicle number is required' },
      },
    },
    type: {
      type: DataTypes.ENUM('basic', 'advanced', 'icu'),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Ambulance type is required' },
      },
    },
    status: {
      type: DataTypes.ENUM('available', 'busy', 'offline'),
      defaultValue: 'available',
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      defaultValue: 0.0,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      defaultValue: 0.0,
    },
    hospital: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    getterMethods: {
      _id() {
        return this.id;
      },
      currentLocation() {
        return {
          type: 'Point',
          coordinates: [
            parseFloat(this.longitude || 0),
            parseFloat(this.latitude || 0),
          ],
        };
      },
    },
  }
);

module.exports = Ambulance;
