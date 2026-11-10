-- MySQL dump 10.13  Distrib 26.7.0, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: ambulance_finder
-- ------------------------------------------------------
-- Server version	26.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'c9c75b85-dd35-11f1-99de-c60adf3f9b4f:1-61';

--
-- Table structure for table `ambulances`
--

DROP TABLE IF EXISTS `ambulances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ambulances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicleNumber` varchar(50) NOT NULL,
  `type` enum('basic','advanced','icu') NOT NULL,
  `status` enum('available','busy','offline') DEFAULT 'available',
  `latitude` decimal(10,8) DEFAULT '0.00000000',
  `longitude` decimal(11,8) DEFAULT '0.00000000',
  `hospital` varchar(150) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `driverId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicleNumber` (`vehicleNumber`),
  UNIQUE KEY `vehicleNumber_2` (`vehicleNumber`),
  KEY `driverId` (`driverId`),
  CONSTRAINT `ambulances_ibfk_1` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ambulances_ibfk_2` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ambulances`
--

LOCK TABLES `ambulances` WRITE;
/*!40000 ALTER TABLE `ambulances` DISABLE KEYS */;
INSERT INTO `ambulances` VALUES (1,'AMB-ICU-101','icu','available',23.81030000,90.41250000,'Central Metropolitan Hospital','2026-11-10 18:38:39','2026-11-10 18:38:39',1),(2,'AMB-ADV-202','advanced','available',23.79250000,90.40780000,'City General Medical Center','2026-11-10 18:38:39','2026-11-10 18:38:39',2),(3,'AMB-BAS-303','basic','available',23.78080000,90.41920000,'St. Jude Emergency Clinic','2026-11-10 18:38:39','2026-11-10 18:38:39',NULL);
/*!40000 ALTER TABLE `ambulances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pickupAddress` varchar(255) NOT NULL,
  `pickupLat` decimal(10,8) NOT NULL,
  `pickupLng` decimal(11,8) NOT NULL,
  `destinationAddress` varchar(255) DEFAULT NULL,
  `destinationLat` decimal(10,8) DEFAULT NULL,
  `destinationLng` decimal(11,8) DEFAULT NULL,
  `status` enum('pending','accepted','enroute','arrived','completed','cancelled') DEFAULT 'pending',
  `patientName` varchar(100) NOT NULL,
  `emergencyType` enum('accident','cardiac','respiratory','general') NOT NULL,
  `estimatedTime` int DEFAULT NULL,
  `fare` decimal(10,2) DEFAULT '0.00',
  `notes` varchar(500) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL,
  `ambulanceId` int DEFAULT NULL,
  `driverId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `ambulanceId` (`ambulanceId`),
  KEY `driverId` (`driverId`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_5` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bookings_ibfk_6` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,'Block C, Gulshan-2, Dhaka',23.79250000,90.40780000,'Central Metropolitan Hospital',23.81030000,90.41250000,'completed','Jane Doe','cardiac',12,85.00,'Patient requires oxygen support upon arrival.','2026-11-10 18:38:39','2026-11-10 18:38:39',2,1,1);
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drivers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `licenseNumber` varchar(100) NOT NULL,
  `isOnline` tinyint(1) DEFAULT '0',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `rating` float DEFAULT '5',
  `totalTrips` int DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `licenseNumber` (`licenseNumber`),
  UNIQUE KEY `licenseNumber_2` (`licenseNumber`),
  KEY `userId` (`userId`),
  CONSTRAINT `drivers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `drivers_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES (1,'DL-NY-2024-001',1,23.81030000,90.41250000,4.9,42,'2026-11-10 18:38:39','2026-11-10 18:38:39',3),(2,'DL-NY-2024-002',1,23.79250000,90.40780000,4.8,28,'2026-11-10 18:38:39','2026-11-10 18:38:39',4);
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','driver','admin') DEFAULT 'user',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `refreshToken` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'System Admin','admin@ambulance.com','+1234567890','$2a$12$qVwW64BSsMguVZgSdwD.Jueie7dREyRFYZc2Q1/JYpoOMsOf.QATG','admin',NULL,NULL,NULL,'2026-11-10 18:38:37','2026-11-10 18:38:37'),(2,'John Doe','user@ambulance.com','+1987654321','$2a$12$4hEah58FvATZnObnXIeZ6.W0vg57nrDj6jxvuq1uQzIoTzH21Ujcy','user',NULL,NULL,NULL,'2026-11-10 18:38:38','2026-11-10 18:38:38'),(3,'Michael Smith','driver1@ambulance.com','+1555123456','$2a$12$CXM6pc/t2ClL6HoNmIH6ROXGOk7ejmdQL2fZBJ5WtTm79ufmbFtSy','driver',NULL,NULL,NULL,'2026-11-10 18:38:38','2026-11-10 18:38:38'),(4,'David Johnson','driver2@ambulance.com','+1555987654','$2a$12$xuzkmNh88JAsq/NDKpusZOe3ZBxSjMkkRQLTFaHpJicw5EDfFC2bi','driver',NULL,NULL,NULL,'2026-11-10 18:38:39','2026-11-10 18:38:39');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-11  0:48:04
