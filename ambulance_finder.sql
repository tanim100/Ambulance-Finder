-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 10, 2026 at 06:47 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ambulance_finder`
--

-- --------------------------------------------------------

--
-- Table structure for table `ambulances`
--

CREATE TABLE `ambulances` (
  `id` int(11) NOT NULL,
  `vehicleNumber` varchar(50) NOT NULL,
  `type` enum('basic','advanced','icu') NOT NULL,
  `status` enum('available','busy','offline') DEFAULT 'available',
  `latitude` decimal(10,8) DEFAULT 0.00000000,
  `longitude` decimal(11,8) DEFAULT 0.00000000,
  `hospital` varchar(150) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `driverId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ambulances`
--

INSERT INTO `ambulances` (`id`, `vehicleNumber`, `type`, `status`, `latitude`, `longitude`, `hospital`, `createdAt`, `updatedAt`, `driverId`) VALUES
(4, 'AMB-ICU-101', 'icu', 'available', 23.81030000, 90.41250000, 'Central Metropolitan Hospital', '2026-10-29 19:54:19', '2026-10-29 19:54:19', 3),
(5, 'AMB-ADV-202', 'advanced', 'available', 23.79250000, 90.40780000, 'City General Medical Center', '2026-10-29 19:54:19', '2026-10-29 19:54:19', 4),
(6, 'AMB-BAS-303', 'basic', 'available', 23.78080000, 90.41920000, 'St. Jude Emergency Clinic', '2026-10-29 19:54:19', '2026-10-29 19:54:19', NULL),
(7, 'AMB-33', 'icu', 'available', 0.00000000, 0.00000000, 'GoodHealth Hospital', '2026-11-08 11:05:57', '2026-11-08 11:05:57', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `pickupAddress` varchar(255) NOT NULL,
  `pickupLat` decimal(10,8) NOT NULL,
  `pickupLng` decimal(11,8) NOT NULL,
  `destinationAddress` varchar(255) DEFAULT NULL,
  `destinationLat` decimal(10,8) DEFAULT NULL,
  `destinationLng` decimal(11,8) DEFAULT NULL,
  `status` enum('pending','accepted','enroute','arrived','completed','cancelled') DEFAULT 'pending',
  `patientName` varchar(100) NOT NULL,
  `emergencyType` enum('accident','cardiac','respiratory','general') NOT NULL,
  `estimatedTime` int(11) DEFAULT NULL,
  `fare` decimal(10,2) DEFAULT 0.00,
  `notes` varchar(500) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int(11) DEFAULT NULL,
  `ambulanceId` int(11) DEFAULT NULL,
  `driverId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `pickupAddress`, `pickupLat`, `pickupLng`, `destinationAddress`, `destinationLat`, `destinationLng`, `status`, `patientName`, `emergencyType`, `estimatedTime`, `fare`, `notes`, `createdAt`, `updatedAt`, `userId`, `ambulanceId`, `driverId`) VALUES
(2, 'Block C, Gulshan-2, Dhaka', 23.79250000, 90.40780000, 'Central Metropolitan Hospital', 23.81030000, 90.41250000, 'completed', 'Jane Doe', 'cardiac', 12, 85.00, 'Patient requires oxygen support upon arrival.', '2026-10-29 19:54:19', '2026-10-29 19:54:19', 6, 4, 3);

-- --------------------------------------------------------

--
-- Table structure for table `drivers`
--

CREATE TABLE `drivers` (
  `id` int(11) NOT NULL,
  `licenseNumber` varchar(100) NOT NULL,
  `isOnline` tinyint(1) DEFAULT 0,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `rating` float DEFAULT 5,
  `totalTrips` int(11) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `drivers`
--

INSERT INTO `drivers` (`id`, `licenseNumber`, `isOnline`, `latitude`, `longitude`, `rating`, `totalTrips`, `createdAt`, `updatedAt`, `userId`) VALUES
(3, 'DL-NY-2024-001', 1, 23.81030000, 90.41250000, 4.9, 42, '2026-10-29 19:54:19', '2026-10-29 19:54:19', 7),
(4, 'DL-NY-2024-002', 1, 23.79250000, 90.40780000, 4.8, 28, '2026-10-29 19:54:19', '2026-10-29 19:54:19', 8);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','driver','admin') DEFAULT 'user',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `refreshToken` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `latitude`, `longitude`, `refreshToken`, `createdAt`, `updatedAt`) VALUES
(5, 'System Admin', 'admin@ambulance.com', '+1234567890', '$2a$12$u1sJJdR6uiRJTOHLLzMjLeV3Qx2.zvCP6bWv7eWAWLVt542FnC79q', 'admin', NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwiaWF0IjoxNzk0MTM2NjQ5LCJleHAiOjE3OTQ3NDE0NDl9.IbGPF9GDVNXreKUO1198h1vwWo4bf9pwosogPFxKPZM', '2026-10-29 19:54:18', '2026-11-08 11:17:29'),
(6, 'John Doe', 'user@ambulance.com', '+1987654321', '$2a$12$V1AefoLEdp/dDAW1eT8Y5.0.D6pfwHBPGwVHuIw0jK7wLL2LzOgsy', 'user', NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiaWF0IjoxNzk0MTM2NjE5LCJleHAiOjE3OTQ3NDE0MTl9.m6KpNOFa6Q2C_8f_ddgT30BYYM60onrq-4ebpAkhYIg', '2026-10-29 19:54:18', '2026-11-08 11:16:59'),
(7, 'Michael Smith', 'driver1@ambulance.com', '+1555123456', '$2a$12$/HRiRoWl24P3Nq3rIGWOAuDE3LCzc9YIcPyTpi9XCWm8FA.75jNLy', 'driver', NULL, NULL, NULL, '2026-10-29 19:54:18', '2026-10-29 19:54:18'),
(8, 'David Johnson', 'driver2@ambulance.com', '+1555987654', '$2a$12$fqkmLP0WYqdbfV49JvZpO.KTI22vaIaYGN8ZhD8kydXQALu.BMTTG', 'driver', NULL, NULL, NULL, '2026-10-29 19:54:18', '2026-10-29 19:54:18');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ambulances`
--
ALTER TABLE `ambulances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `vehicleNumber` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_2` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_3` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_4` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_5` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_6` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_7` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_8` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_9` (`vehicleNumber`),
  ADD UNIQUE KEY `vehicleNumber_10` (`vehicleNumber`),
  ADD KEY `driverId` (`driverId`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `ambulanceId` (`ambulanceId`),
  ADD KEY `driverId` (`driverId`);

--
-- Indexes for table `drivers`
--
ALTER TABLE `drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `licenseNumber` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_2` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_3` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_4` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_5` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_6` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_7` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_8` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_9` (`licenseNumber`),
  ADD UNIQUE KEY `licenseNumber_10` (`licenseNumber`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `email_3` (`email`),
  ADD UNIQUE KEY `email_4` (`email`),
  ADD UNIQUE KEY `email_5` (`email`),
  ADD UNIQUE KEY `email_6` (`email`),
  ADD UNIQUE KEY `email_7` (`email`),
  ADD UNIQUE KEY `email_8` (`email`),
  ADD UNIQUE KEY `email_9` (`email`),
  ADD UNIQUE KEY `email_10` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ambulances`
--
ALTER TABLE `ambulances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `drivers`
--
ALTER TABLE `drivers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ambulances`
--
ALTER TABLE `ambulances`
  ADD CONSTRAINT `ambulances_ibfk_1` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_10` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_2` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_3` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_4` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_5` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_6` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_7` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_8` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ambulances_ibfk_9` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_10` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_11` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_12` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_13` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_14` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_15` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_16` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_17` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_18` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_19` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_20` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_21` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_22` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_23` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_24` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_25` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_26` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_27` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_28` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_29` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_30` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_5` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_6` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_7` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_8` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_9` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `drivers`
--
ALTER TABLE `drivers`
  ADD CONSTRAINT `drivers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_10` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_3` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_4` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_5` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_6` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_7` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_8` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `drivers_ibfk_9` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
