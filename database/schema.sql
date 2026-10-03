-- ====================================================================
-- MediBook Database Schema (20 Tables)
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `prescription_items`;
DROP TABLE IF EXISTS `prescriptions`;
DROP TABLE IF EXISTS `medicines`;
DROP TABLE IF EXISTS `medical_records`;
DROP TABLE IF EXISTS `examination_queues`;
DROP TABLE IF EXISTS `appointment_status_history`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `doctor_leaves`;
DROP TABLE IF EXISTS `doctor_schedules`;
DROP TABLE IF EXISTS `doctor_specialties`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `specialties`;
DROP TABLE IF EXISTS `receptionists`;
DROP TABLE IF EXISTS `doctors`;
DROP TABLE IF EXISTS `patients`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Bảng người dùng hệ thống (4 vai trò: admin, receptionist, doctor, patient)
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role` ENUM('admin', 'receptionist', 'doctor', 'patient') NOT NULL DEFAULT 'patient',
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `avatar` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng hồ sơ chi tiết bệnh nhân
CREATE TABLE `patients` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `dob` DATE NULL,
  `gender` ENUM('male', 'female', 'other') DEFAULT 'other',
  `blood_group` VARCHAR(10) NULL,
  `address` VARCHAR(255) NULL,
  `emergency_contact` VARCHAR(100) NULL,
  `health_insurance_no` VARCHAR(30) NULL,
  `medical_history` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_patients_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng hồ sơ chi tiết bác sĩ
CREATE TABLE `doctors` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `title` VARCHAR(50) NOT NULL DEFAULT 'Bác sĩ',
  `bio` TEXT NULL,
  `experience_years` INT UNSIGNED DEFAULT 1,
  `consultation_fee` DECIMAL(12,2) NOT NULL DEFAULT 200000.00,
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  `rating_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `room_number` VARCHAR(20) NOT NULL DEFAULT 'P.101',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_doctors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng hồ sơ chi tiết nhân viên lễ tân / tiếp đón
CREATE TABLE `receptionists` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `staff_code` VARCHAR(30) NOT NULL UNIQUE,
  `department` VARCHAR(100) NOT NULL DEFAULT 'Bộ phận Tiếp đón & Thu ngân',
  `shift_default` VARCHAR(50) DEFAULT 'Sáng - Chiều',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_receptionists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng danh mục chuyên khoa
CREATE TABLE `specialties` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(120) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `icon` VARCHAR(100) DEFAULT 'stethoscope',
  `image` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng danh mục dịch vụ khám
CREATE TABLE `services` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `specialty_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `duration_minutes` INT UNSIGNED NOT NULL DEFAULT 30,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_services_specialty` FOREIGN KEY (`specialty_id`) REFERENCES `specialties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng liên kết Bác sĩ - Chuyên khoa
CREATE TABLE `doctor_specialties` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT UNSIGNED NOT NULL,
  `specialty_id` INT UNSIGNED NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY `uk_doctor_specialty` (`doctor_id`, `specialty_id`),
  CONSTRAINT `fk_ds_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ds_specialty` FOREIGN KEY (`specialty_id`) REFERENCES `specialties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng ca làm việc định kỳ của bác sĩ (0: Chủ nhật, 1-6: Thứ 2 đến Thứ 7)
CREATE TABLE `doctor_schedules` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT UNSIGNED NOT NULL,
  `day_of_week` TINYINT UNSIGNED NOT NULL COMMENT '0=Sunday, 1=Monday... 6=Saturday',
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `slot_duration` INT UNSIGNED NOT NULL DEFAULT 30,
  `max_patients` INT UNSIGNED NOT NULL DEFAULT 20,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_doc_schedule_day` (`doctor_id`, `day_of_week`),
  CONSTRAINT `fk_schedules_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng ngày nghỉ phép / bận đột xuất của bác sĩ
CREATE TABLE `doctor_leaves` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT UNSIGNED NOT NULL,
  `leave_date` DATE NOT NULL,
  `reason` VARCHAR(255) NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_doc_leave_date` (`doctor_id`, `leave_date`),
  CONSTRAINT `fk_leaves_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng cuộc hẹn khám bệnh (Appointments)
CREATE TABLE `appointments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `booking_code` VARCHAR(30) NOT NULL UNIQUE,
  `patient_id` INT UNSIGNED NOT NULL,
  `doctor_id` INT UNSIGNED NOT NULL,
  `specialty_id` INT UNSIGNED NOT NULL,
  `service_id` INT UNSIGNED NULL,
  `appointment_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('pending', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'confirmed',
  `symptoms` TEXT NULL,
  `cancellation_reason` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_app_date_doc` (`appointment_date`, `doctor_id`, `status`),
  INDEX `idx_app_patient` (`patient_id`),
  CONSTRAINT `fk_app_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_specialty` FOREIGN KEY (`specialty_id`) REFERENCES `specialties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng lịch sử thay đổi trạng thái cuộc hẹn
CREATE TABLE `appointment_status_history` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT UNSIGNED NOT NULL,
  `old_status` VARCHAR(30) NULL,
  `new_status` VARCHAR(30) NOT NULL,
  `changed_by_user_id` INT UNSIGNED NULL,
  `note` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ash_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ash_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bảng hàng đợi khám trực tiếp tại phòng khám (Queues)
CREATE TABLE `examination_queues` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT UNSIGNED NOT NULL UNIQUE,
  `queue_number` VARCHAR(20) NOT NULL,
  `room` VARCHAR(20) NOT NULL,
  `status` ENUM('waiting', 'calling', 'in_room', 'completed', 'skipped') NOT NULL DEFAULT 'waiting',
  `estimated_time` TIME NULL,
  `checkin_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `call_time` TIMESTAMP NULL,
  `finish_time` TIMESTAMP NULL,
  INDEX `idx_queue_room_status` (`room`, `status`),
  CONSTRAINT `fk_queue_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng kết quả khám bệnh (Bệnh án điện tử)
CREATE TABLE `medical_records` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT UNSIGNED NOT NULL UNIQUE,
  `patient_id` INT UNSIGNED NOT NULL,
  `doctor_id` INT UNSIGNED NOT NULL,
  `anamnesis` TEXT NULL COMMENT 'Tiền sử bệnh & lý do đến khám',
  `vital_signs` JSON NULL COMMENT 'Huyết áp, nhịp tim, nhiệt độ, chiều cao, cân nặng, BMI',
  `clinical_diagnosis` TEXT NOT NULL COMMENT 'Chẩn đoán lâm sàng',
  `icd10_code` VARCHAR(20) NULL,
  `doctor_notes` TEXT NULL COMMENT 'Lời dặn bác sĩ',
  `re_examination_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_mr_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mr_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mr_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Bảng danh mục kho thuốc phòng khám
CREATE TABLE `medicines` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'Kháng sinh / Giảm đau',
  `unit` VARCHAR(30) NOT NULL DEFAULT 'Viên',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` INT NOT NULL DEFAULT 100,
  `usage_instruction` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Bảng đơn thuốc tổng quát
CREATE TABLE `prescriptions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `medical_record_id` INT UNSIGNED NOT NULL UNIQUE,
  `appointment_id` INT UNSIGNED NOT NULL,
  `doctor_id` INT UNSIGNED NOT NULL,
  `patient_id` INT UNSIGNED NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `usage_instructions` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rx_mr` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rx_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rx_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rx_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Bảng chi tiết từng loại thuốc trong đơn thuốc
CREATE TABLE `prescription_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `prescription_id` INT UNSIGNED NOT NULL,
  `medicine_id` INT UNSIGNED NULL,
  `medicine_name` VARCHAR(150) NOT NULL,
  `dosage` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(30) NOT NULL DEFAULT 'Viên',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `morning` VARCHAR(20) DEFAULT '1',
  `noon` VARCHAR(20) DEFAULT '0',
  `afternoon` VARCHAR(20) DEFAULT '1',
  `night` VARCHAR(20) DEFAULT '0',
  `instructions` VARCHAR(255) NULL,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT `fk_pxi_prescription` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pxi_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Bảng hóa đơn & thanh toán (Payments)
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT UNSIGNED NOT NULL UNIQUE,
  `invoice_code` VARCHAR(30) NOT NULL UNIQUE,
  `service_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `medicine_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `final_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('cash', 'bank_transfer', 'momo', 'vnpay') NOT NULL DEFAULT 'cash',
  `payment_status` ENUM('unpaid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid',
  `paid_at` TIMESTAMP NULL,
  `cashier_user_id` INT UNSIGNED NULL,
  `note` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pay_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pay_cashier` FOREIGN KEY (`cashier_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Bảng đánh giá và nhận xét từ bệnh nhân
CREATE TABLE `reviews` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT UNSIGNED NOT NULL UNIQUE,
  `patient_id` INT UNSIGNED NOT NULL,
  `doctor_id` INT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `comment` TEXT NULL,
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rev_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rev_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rev_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Bảng thông báo người dùng (Notifications)
CREATE TABLE `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'info',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `link` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_user` (`user_id`, `is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Bảng nhật ký hoạt động hệ thống (Activity Logs)
CREATE TABLE `activity_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NULL,
  `entity_id` INT UNSIGNED NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_agent` VARCHAR(255) NULL,
  `details` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_act_user` (`user_id`),
  INDEX `idx_act_action` (`action`),
  CONSTRAINT `fk_act_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Bảng Tin tức & Cẩm nang Y tế (Articles: Thuốc, Dược liệu, Bệnh, Cơ thể)
CREATE TABLE IF NOT EXISTS `articles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category` ENUM('thuoc', 'duoc-lieu', 'benh', 'co-the') NOT NULL DEFAULT 'thuoc',
  `category_name` VARCHAR(100) NOT NULL,
  `pill_label` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) DEFAULT '💊',
  `slug` VARCHAR(190) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `summary` TEXT NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `author_name` VARCHAR(100) NOT NULL,
  `author_role` VARCHAR(100) NOT NULL,
  `views_count` INT UNSIGNED DEFAULT 120,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_articles_category` (`category`),
  INDEX `idx_articles_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
