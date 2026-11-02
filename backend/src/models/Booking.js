const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Booking = sequelize.define(
  'Booking',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pickupAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Pickup address is required' },
      },
    },
    pickupLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    pickupLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
    },
    destinationAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    destinationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    destinationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'accepted',
        'enroute',
        'arrived',
        'completed',
        'cancelled'
      ),
      defaultValue: 'pending',
    },
    patientName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Patient name is required' },
      },
    },
    emergencyType: {
      type: DataTypes.ENUM('accident', 'cardiac', 'respiratory', 'general'),
      allowNull: false,
    },
    estimatedTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true,
    },
    fare: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    getterMethods: {
      _id() {
        return this.id;
      },
      pickupLocation() {
        return {
          address: this.pickupAddress,
          lat: parseFloat(this.pickupLat || 0),
          lng: parseFloat(this.pickupLng || 0),
        };
      },
      destinationLocation() {
        return {
          address: this.destinationAddress,
          lat: this.destinationLat ? parseFloat(this.destinationLat) : null,
          lng: this.destinationLng ? parseFloat(this.destinationLng) : null,
        };
      },
    },
  }
);

module.exports = Booking;
