const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'ambulance_finder';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const connectDB = async () => {
  try {
    // Automatically create database if it doesn't already exist
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await connection.end();

    // Authenticate and sync with Sequelize
    await sequelize.authenticate();
    console.log(`MySQL Connected successfully to: ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

    // Load models & associations
    require('../models');

    // Sync all tables (alter: true ensures columns are created/updated safely)
    await sequelize.sync({ alter: true });
    console.log('MySQL Database tables synchronized successfully.');

    // Auto-seed default accounts (Admin, User, Driver) if database is newly initialized
    const { User } = require('../models');
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('No existing users found in database. Auto-seeding default demo accounts (Admin, User, Driver)...');
      const seedData = require('../seed');
      await seedData(false);
    }
  } catch (error) {
    console.error(`Error connecting to MySQL: ${error.message}`);
    process.exit(1);
  }
};

connectDB.connectDB = connectDB;
connectDB.sequelize = sequelize;

module.exports = connectDB;
