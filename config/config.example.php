<?php
/**
 * MediBook - System Configuration
 */

// Application configuration
define('APP_NAME', 'MediBook');
define('APP_TAGLINE', 'Khỏe hơn mỗi ngày');
define('APP_URL', 'http://localhost:8000');
define('APP_ENV', 'development'); // 'development' or 'production'
define('APP_TIMEZONE', 'Asia/Ho_Chi_Minh');

// Base Paths
define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
define('CONFIG_PATH', ROOT_PATH . '/config');
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('STORAGE_PATH', ROOT_PATH . '/storage');

// Database configuration (MySQL)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'medibook_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// Clinic Information (Displayed on vouchers, receipts and headers)
define('CLINIC_NAME', 'Phòng khám Đa khoa Quốc tế MediBook');
define('CLINIC_PHONE', '1900 6868');
define('CLINIC_HOTLINE', '0901 234 567');
define('CLINIC_EMAIL', 'hotro@medibook.local');
define('CLINIC_ADDRESS', 'Số 123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
define('CLINIC_OPENING_HOURS', '07:30 - 20:00 (Thứ 2 - Chủ Nhật)');

// Session Configuration
define('SESSION_LIFETIME', 86400); // 1 day
define('SESSION_COOKIE_NAME', 'medibook_session');

// Appointment Rules
define('APPOINTMENT_MIN_ADVANCE_HOURS', 1); // Đặt trước ít nhất 1 giờ
define('APPOINTMENT_MAX_ADVANCE_DAYS', 30); // Đặt trước tối đa 30 ngày
define('APPOINTMENT_DEFAULT_DURATION', 30); // 30 phút mỗi lượt khám
