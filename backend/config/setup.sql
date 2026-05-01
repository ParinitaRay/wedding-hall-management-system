-- Run this file to set up the database:
-- mysql -u root -p < setup.sql

CREATE DATABASE IF NOT EXISTS wedding_hall_db;
USE wedding_hall_db;

-- Users
CREATE TABLE IF NOT EXISTS Users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user'
);

-- Halls
CREATE TABLE IF NOT EXISTS Halls (
  hall_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  size_sqft INT NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  status ENUM('Active','Inactive') DEFAULT 'Active'
);

-- Hall Images
CREATE TABLE IF NOT EXISTS Hall_Images (
  img_id INT AUTO_INCREMENT PRIMARY KEY,
  hall_id INT,
  image_url TEXT NOT NULL,
  cloudinary_id VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (hall_id) REFERENCES Halls(hall_id) ON DELETE CASCADE
);

-- Time Slots
CREATE TABLE IF NOT EXISTS TimeSlots (
  slot_id INT AUTO_INCREMENT PRIMARY KEY,
  hall_id INT,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (hall_id) REFERENCES Halls(hall_id) ON DELETE CASCADE,
  UNIQUE (hall_id, slot_date, start_time)
);

-- Bookings
CREATE TABLE IF NOT EXISTS Bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  hall_id INT,
  slot_id INT,
  booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Pending','Confirmed','Cancelled') DEFAULT 'Pending',
  notes TEXT,
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(150),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (hall_id) REFERENCES Halls(hall_id) ON DELETE RESTRICT,
  FOREIGN KEY (slot_id) REFERENCES TimeSlots(slot_id) ON DELETE RESTRICT
);

-- Payments
CREATE TABLE IF NOT EXISTS Payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  amount DECIMAL(10,2) NOT NULL,
  payment_type ENUM('Advance','Final','Refund') NOT NULL,
  payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE
);

-- Seed admin user (password: admin123)
INSERT IGNORE INTO Users (username, email, password, role)
VALUES ('Admin', 'admin@weddinghall.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Seed sample halls
INSERT IGNORE INTO Halls (name, capacity, size_sqft, price_per_day, description, location, status) VALUES
('Royal Grand Hall', 500, 8000, 50000.00, 'A magnificent venue with chandeliers and marble flooring, perfect for grand weddings.', 'MG Road, Kokrajhar', 'Active'),
('Garden Paradise Venue', 300, 5000, 30000.00, 'A beautiful outdoor garden venue surrounded by lush greenery and floral decorations.', 'NH-17, Kokrajhar', 'Active'),
('Crystal Ballroom', 200, 3500, 20000.00, 'An elegant indoor ballroom with crystal lighting and premium sound system.', 'Station Road, Kokrajhar', 'Active');

-- Seed sample slots (next 30 days)
INSERT IGNORE INTO TimeSlots (hall_id, slot_date, start_time, end_time, is_available) VALUES
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '14:00:00', TRUE),
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:00:00', '22:00:00', TRUE),
(1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', '14:00:00', TRUE),
(1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '09:00:00', '14:00:00', TRUE),
(1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '16:00:00', '22:00:00', TRUE),
(2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '22:00:00', TRUE),
(2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', '22:00:00', TRUE),
(2, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '09:00:00', '22:00:00', TRUE),
(3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '15:00:00', TRUE),
(3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '15:00:00', TRUE),
(3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '10:00:00', '15:00:00', TRUE);
