require('dotenv').config();
const connectDB = require('./config/db');
const { User, Ambulance, Driver, Booking } = require('./models');

const seedData = async (exitOnComplete = true) => {
  try {
    // Only connect if sequelize connection is not yet established
    if (!connectDB.sequelize || !connectDB.sequelize.connectionManager) {
      console.log('Connecting to MySQL and synchronizing database...');
      await connectDB();
    }

    console.log('Clearing existing data (if any)...');
    await Booking.destroy({ where: {} });
    await Ambulance.destroy({ where: {} });
    await Driver.destroy({ where: {} });
    await User.destroy({ where: {} });

    console.log('Creating users...');
    // 1. Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@ambulance.com',
      phone: '+1234567890',
      password: 'password123',
      role: 'admin',
    });

    // 2. Regular User
    const user = await User.create({
      name: 'John Doe',
      email: 'user@ambulance.com',
      phone: '+1987654321',
      password: 'password123',
      role: 'user',
    });

    // 3. Driver User 1
    const driverUser1 = await User.create({
      name: 'Michael Smith',
      email: 'driver1@ambulance.com',
      phone: '+1555123456',
      password: 'password123',
      role: 'driver',
    });

    // 4. Driver User 2
    const driverUser2 = await User.create({
      name: 'David Johnson',
      email: 'driver2@ambulance.com',
      phone: '+1555987654',
      password: 'password123',
      role: 'driver',
    });

    console.log('Creating driver profiles...');
    const driver1 = await Driver.create({
      userId: driverUser1.id,
      licenseNumber: 'DL-NY-2024-001',
      isOnline: true,
      latitude: 23.8103,
      longitude: 90.4125,
      rating: 4.9,
      totalTrips: 42,
    });

    const driver2 = await Driver.create({
      userId: driverUser2.id,
      licenseNumber: 'DL-NY-2024-002',
      isOnline: true,
      latitude: 23.7925,
      longitude: 90.4078,
      rating: 4.8,
      totalTrips: 28,
    });

    console.log('Creating ambulances...');
    const amb1 = await Ambulance.create({
      vehicleNumber: 'AMB-ICU-101',
      type: 'icu',
      status: 'available',
      hospital: 'Central Metropolitan Hospital',
      latitude: 23.8103,
      longitude: 90.4125,
      driverId: driver1.id,
    });

    const amb2 = await Ambulance.create({
      vehicleNumber: 'AMB-ADV-202',
      type: 'advanced',
      status: 'available',
      hospital: 'City General Medical Center',
      latitude: 23.7925,
      longitude: 90.4078,
      driverId: driver2.id,
    });

    const amb3 = await Ambulance.create({
      vehicleNumber: 'AMB-BAS-303',
      type: 'basic',
      status: 'available',
      hospital: 'St. Jude Emergency Clinic',
      latitude: 23.7808,
      longitude: 90.4192,
    });

    // Link assigned ambulances back to drivers
    driver1.ambulanceId = amb1.id;
    await driver1.save();

    driver2.ambulanceId = amb2.id;
    await driver2.save();

    console.log('Creating sample booking...');
    await Booking.create({
      userId: user.id,
      ambulanceId: amb1.id,
      driverId: driver1.id,
      pickupAddress: 'Block C, Gulshan-2, Dhaka',
      pickupLat: 23.7925,
      pickupLng: 90.4078,
      destinationAddress: 'Central Metropolitan Hospital',
      destinationLat: 23.8103,
      destinationLng: 90.4125,
      status: 'completed',
      patientName: 'Jane Doe',
      emergencyType: 'cardiac',
      estimatedTime: 12,
      fare: 85.0,
      notes: 'Patient requires oxygen support upon arrival.',
    });

    console.log(`
════════════════════════════════════════════════════════════
✅ MySQL Database 'ambulance_finder' successfully populated!
════════════════════════════════════════════════════════════

Tables created and populated:
  - Users       : 4 records
  - Drivers     : 2 records
  - Ambulances  : 3 records
  - Bookings    : 1 record

Default Demo Accounts:
  👑 Admin  : admin@ambulance.com   / password123
  👤 User   : user@ambulance.com    / password123
  🚑 Driver : driver1@ambulance.com / password123
════════════════════════════════════════════════════════════
    `);

    if (exitOnComplete) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    if (exitOnComplete) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = seedData;
