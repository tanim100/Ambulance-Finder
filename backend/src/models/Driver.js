const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Driver = sequelize.define(
  'Driver',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'License number is required' },
      },
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 5.0,
      validate: {
        min: 1,
        max: 5,
      },
    },
    totalTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
          lat: parseFloat(this.latitude || 0),
          lng: parseFloat(this.longitude || 0),
        };
      },
    },
  }
);

module.exports = Driver;
