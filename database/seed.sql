-- ====================================================================
-- MediBook Demo Seed Data
-- ====================================================================

-- 1. Chèn danh mục Chuyên khoa
INSERT INTO `specialties` (`id`, `name`, `slug`, `description`, `icon`, `image`, `status`) VALUES
(1, 'Nội tổng quát', 'noi-tong-quat', 'Chăm sóc sức khỏe toàn diện và chẩn đoán ban đầu', 'stethoscope', 'noi-tong-quat.svg', 'active'),
(2, 'Nhi khoa', 'nhi-khoa', 'Vì sự phát triển khỏe mạnh và an toàn của trẻ em', 'baby', 'nhi-khoa.svg', 'active'),
(3, 'Sản phụ khoa', 'san-phu-khoa', 'Đồng hành cùng sức khỏe và sự tự tin phụ nữ Việt', 'female', 'san-phu-khoa.svg', 'active'),
(4, 'Da liễu', 'da-lieu', 'Làn da khỏe mạnh, điều trị mụn và thẩm mỹ an toàn', 'sparkles', 'da-lieu.svg', 'active'),
(5, 'Tai mũi họng', 'tai-mui-hong', 'Hô hấp dễ dàng, chẩn đoán nội soi kỹ thuật số', 'head-side', 'tai-mui-hong.svg', 'active'),
(6, 'Cơ xương khớp', 'co-xuong-khop', 'Vận động linh hoạt, trị liệu phục hồi chức năng', 'bone', 'co-xuong-khop.svg', 'active'),
(7, 'Tim mạch', 'tim-mach', 'Trái tim khỏe mạnh, theo dõi huyết áp & tim đồ', 'heart-pulse', 'tim-mach.svg', 'active'),
(8, 'Tiêu hóa', 'tieu-hoa', 'Hệ tiêu hóa khỏe, điều trị dạ dày đại tràng', 'stomach', 'tieu-hoa.svg', 'active');

-- 2. Chèn danh mục Dịch vụ khám
INSERT INTO `services` (`id`, `specialty_id`, `name`, `description`, `price`, `duration_minutes`, `status`) VALUES
(1, 1, 'Khám Nội tổng quát định kỳ', 'Kiểm tra tổng quát các cơ quan, huyết áp, nhịp tim và tư vấn lối sống', 200000.00, 30, 'active'),
(2, 1, 'Gói khám tầm soát sức khỏe tổng quát VIP', 'Khám lâm sàng toàn diện kèm định hướng xét nghiệm chuyên sâu', 500000.00, 45, 'active'),
(3, 2, 'Khám Nhi tổng quát & Dinh dưỡng', 'Đánh giá tăng trưởng chiều cao, cân nặng và bệnh lý hô hấp tiêu hóa', 250000.00, 30, 'active'),
(4, 3, 'Khám Sản phụ khoa & Tư vấn thai kỳ', 'Khám phụ khoa định kỳ, tư vấn tiền sản và chăm sóc mẹ bầu', 300000.00, 30, 'active'),
(5, 4, 'Khám Da liễu & Soi da công nghệ cao', 'Chẩn đoán viêm da, dị ứng, mụn trứng cá và điều trị sắc tố', 250000.00, 30, 'active'),
(6, 5, 'Khám Tai Mũi Họng nội soi kỹ thuật số', 'Nội soi tầm soát viêm xoang, viêm họng, amidan, polyp', 280000.00, 30, 'active'),
(7, 6, 'Khám Cơ Xương Khớp & Tư vấn thoái hóa', 'Kiểm tra thoái hóa khớp, cột sống, đau thần kinh tọa', 300000.00, 30, 'active'),
(8, 7, 'Khám Tim mạch chuyên sâu & Đo điện tim', 'Tầm soát xơ vữa, tăng huyết áp, rối loạn nhịp tim', 350000.00, 30, 'active'),
(9, 8, 'Khám Tiêu hóa & Tư vấn nội soi', 'Chẩn đoán trào ngược dạ dày, viêm loét HP, đại tràng co thắt', 250000.00, 30, 'active');

-- 3. Chèn Người dùng (Users)
-- Mật khẩu mặc định: 'password' (đã hash Bcrypt: $2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC)
INSERT INTO `users` (`id`, `role`, `name`, `email`, `password_hash`, `phone`, `avatar`, `status`) VALUES
(1, 'admin', 'Quản trị viên Hệ thống', 'admin@medibook.local', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0901000001', 'avatar-admin.svg', 'active'),
(2, 'receptionist', 'Lễ tân Hoàng Thị Mai', 'receptionist@medibook.local', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0902000002', 'avatar-receptionist.svg', 'active'),
(3, 'doctor', 'BS. CKII. Nguyễn Minh Đức', 'doctor@medibook.local', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0903000003', 'avatar-doctor1.svg', 'active'),
(4, 'patient', 'Bệnh nhân Trần Văn Nam', 'patient@medibook.local', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0904000004', 'avatar-patient1.svg', 'active'),
(5, 'doctor', 'ThS. BS. Trần Thị Mai', 'bs.mai@medibook.local', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0903000005', 'avatar-doctor2.svg', 'active'),
(6, 'doctor', 'BS. CKI. Lê Quang Huy', 'bs.huy@medibook.local', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0903000006', 'avatar-doctor3.svg', 'active'),
(7, 'doctor', 'BS. Phạm Thúy An', 'bs.an@medibook.local', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0903000007', 'avatar-doctor4.svg', 'active'),
(8, 'patient', 'Lê Bùi Hồng Phúc', 'hongphuc@gmail.com', '$2y$12$WjeG48oWfQTRHy5Ckl3vauEQ50oTNXE/QvLg6ri4SGjWiqzy2DbFC', '0905000008', 'avatar-patient2.svg', 'active');

-- 4. Bảng Hồ sơ Bệnh nhân (Patients)
INSERT INTO `patients` (`id`, `user_id`, `dob`, `gender`, `blood_group`, `address`, `emergency_contact`, `health_insurance_no`, `medical_history`) VALUES
(1, 4, '1995-05-15', 'male', 'O+', 'Quận 1, TP. Hồ Chí Minh', 'Nguyễn Thị Hoa (Vợ) - 0912333444', 'DN4791234567890', 'Tiền sử dị ứng nhẹ với Penicillin, không có bệnh nền tim mạch.'),
(2, 8, '2000-08-20', 'female', 'A+', 'Quận 3, TP. Hồ Chí Minh', 'Lê Văn An (Bố) - 0988777666', 'DN4799876543210', 'Không có tiền sử bệnh lý mạn tính.');

-- 5. Bảng Hồ sơ Bác sĩ (Doctors)
INSERT INTO `doctors` (`id`, `user_id`, `title`, `bio`, `experience_years`, `consultation_fee`, `rating`, `rating_count`, `room_number`) VALUES
(1, 3, 'BS. CKII', 'Chuyên gia đầu ngành Nội khoa với hơn 10 năm kinh nghiệm công tác tại các bệnh viện lớn.', 10, 200000.00, 4.90, 320, 'P.101'),
(2, 5, 'ThS. BS', 'Tận tâm chu đáo, chuyên gia sản phụ khoa và chăm sóc sức khỏe toàn diện cho trẻ em.', 8, 250000.00, 4.80, 276, 'P.102'),
(3, 6, 'BS. CKI', 'Bác sĩ Tim mạch giàu kinh nghiệm, điều trị thành công hàng ngàn ca tăng huyết áp & mạch vành.', 12, 300000.00, 4.85, 189, 'P.103'),
(4, 7, 'BS', 'Bác sĩ Nhi khoa thân thiện, khéo léo giúp các bé thoải mái trong suốt quá trình thăm khám.', 6, 200000.00, 4.80, 365, 'P.104');

-- 6. Bảng Nhân viên Lễ tân (Receptionists)
INSERT INTO `receptionists` (`id`, `user_id`, `staff_code`, `department`, `shift_default`) VALUES
(1, 2, 'LT-001', 'Bộ phận Tiếp đón & Thu ngân', 'Ca Sáng (07:30 - 16:30)');

-- 7. Bác sĩ - Chuyên khoa (Doctor_Specialties)
INSERT INTO `doctor_specialties` (`id`, `doctor_id`, `specialty_id`, `is_primary`) VALUES
(1, 1, 1, 1), -- BS. Đức -> Nội tổng quát
(2, 2, 2, 0), -- BS. Mai -> Nhi khoa
(3, 2, 3, 1), -- BS. Mai -> Sản phụ khoa (chính)
(4, 3, 7, 1), -- BS. Huy -> Tim mạch
(5, 4, 2, 1); -- BS. An -> Nhi khoa

-- 8. Ca làm việc định kỳ của Bác sĩ (Doctor_Schedules: 1=Thứ 2 đến 6=Thứ 7, 0=Chủ nhật)
INSERT INTO `doctor_schedules` (`id`, `doctor_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration`, `max_patients`, `status`) VALUES
-- BS Đức (Thứ 2 đến Thứ 6)
(1, 1, 1, '08:00:00', '17:00:00', 30, 16, 'active'),
(2, 1, 2, '08:00:00', '17:00:00', 30, 16, 'active'),
(3, 1, 3, '08:00:00', '17:00:00', 30, 16, 'active'),
(4, 1, 4, '08:00:00', '17:00:00', 30, 16, 'active'),
(5, 1, 5, '08:00:00', '17:00:00', 30, 16, 'active'),
-- BS Mai (Thứ 2, 3, 4, 6)
(6, 2, 1, '08:00:00', '16:30:00', 30, 15, 'active'),
(7, 2, 2, '08:00:00', '16:30:00', 30, 15, 'active'),
(8, 2, 3, '08:00:00', '16:30:00', 30, 15, 'active'),
(9, 2, 5, '08:00:00', '16:30:00', 30, 15, 'active'),
-- BS Huy (Thứ 2, 4, 6, 7)
(10, 3, 1, '08:30:00', '17:30:00', 30, 14, 'active'),
(11, 3, 3, '08:30:00', '17:30:00', 30, 14, 'active'),
(12, 3, 5, '08:30:00', '17:30:00', 30, 14, 'active'),
(13, 3, 6, '08:30:00', '12:00:00', 30, 7, 'active'),
-- BS An (Thứ 3 đến Thứ 7)
(14, 4, 2, '08:00:00', '17:00:00', 30, 16, 'active'),
(15, 4, 3, '08:00:00', '17:00:00', 30, 16, 'active'),
(16, 4, 4, '08:00:00', '17:00:00', 30, 16, 'active'),
(17, 4, 5, '08:00:00', '17:00:00', 30, 16, 'active'),
(18, 4, 6, '08:00:00', '17:00:00', 30, 16, 'active');

-- 9. Danh mục Thuốc trong kho phòng khám (Medicines)
INSERT INTO `medicines` (`id`, `code`, `name`, `category`, `unit`, `unit_price`, `stock_quantity`, `usage_instruction`, `status`) VALUES
(1, 'MED-001', 'Paracetamol 500mg', 'Giảm đau, hạ sốt', 'Viên', 2000.00, 1500, 'Uống sau bữa ăn, cách 4-6 giờ nếu sốt', 'active'),
(2, 'MED-002', 'Amoxicillin 500mg', 'Kháng sinh đường hô hấp', 'Viên', 3500.00, 800, 'Uống sáng 1 viên, chiều 1 viên sau ăn', 'active'),
(3, 'MED-003', 'Cetirizine 10mg', 'Kháng histamin chống dị ứng', 'Viên', 4000.00, 600, 'Uống 1 viên vào buổi tối trước khi đi ngủ', 'active'),
(4, 'MED-004', 'Omeprazole 20mg', 'Ức chế tiết acid dạ dày', 'Viên', 5000.00, 900, 'Uống 1 viên trước bữa ăn sáng 30 phút', 'active'),
(5, 'MED-005', 'Amlodipine 5mg', 'Hạ huyết áp', 'Viên', 4500.00, 700, 'Uống 1 viên vào buổi sáng mỗi ngày', 'active'),
(6, 'MED-006', 'Vitamin C 500mg', 'Tăng cường sức đề kháng', 'Viên sủi', 3000.00, 1200, 'Hòa tan vào 200ml nước, uống sau bữa ăn sáng', 'active'),
(7, 'MED-007', 'Men vi sinh Enterogermina', 'Hỗ trợ tiêu hóa', 'Ống', 12000.00, 500, 'Uống 1-2 ống/ngày sau ăn', 'active'),
(8, 'MED-008', 'Siro ho Prospan 100ml', 'Thuốc ho thảo dược', 'Chai', 85000.00, 200, 'Uống 5ml/lần, 3 lần/ngày', 'active');

-- 10. Lịch hẹn mẫu (Appointments)
-- Lịch hẹn sắp tới chuẩn theo mockup mobile: Mã MB250425-0012, Khám Nội tổng quát, BS Nguyễn Minh Đức
INSERT INTO `appointments` (`id`, `booking_code`, `patient_id`, `doctor_id`, `specialty_id`, `service_id`, `appointment_date`, `start_time`, `end_time`, `status`, `symptoms`) VALUES
(1, 'MB250425-0012', 1, 1, 1, 1, '2026-09-25', '09:00:00', '09:30:00', 'confirmed', 'Khám sức khỏe tổng quát định kỳ, kiểm tra huyết áp.'),
(2, 'MB250424-0005', 1, 1, 1, 1, '2026-09-20', '08:30:00', '09:00:00', 'completed', 'Người mệt mỏi, đau đầu nhẹ và nghẹt mũi 2 ngày nay.'),
(3, 'MB250425-0015', 2, 3, 7, 8, '2026-09-25', '10:00:00', '10:30:00', 'confirmed', 'Đo điện tim và kiểm tra hồi hộp tim đập nhanh.');

-- 11. Lịch sử trạng thái cuộc hẹn
INSERT INTO `appointment_status_history` (`id`, `appointment_id`, `old_status`, `new_status`, `changed_by_user_id`, `note`) VALUES
(1, 1, 'pending', 'confirmed', 2, 'Lễ tân đã gọi điện xác nhận lịch hẹn.'),
(2, 2, 'pending', 'confirmed', 2, 'Xác nhận tự động qua cổng trực tuyến.'),
(3, 2, 'confirmed', 'checked_in', 2, 'Bệnh nhân có mặt tại quầy lễ tân.'),
(4, 2, 'checked_in', 'in_consultation', 3, 'Bác sĩ bắt đầu khám.'),
(5, 2, 'in_consultation', 'completed', 3, 'Bác sĩ hoàn tất khám và kê toa thuốc.'),
(6, 3, 'pending', 'confirmed', 2, 'Đã xác nhận lịch hẹn trực tuyến.');

-- 12. Hàng đợi khám (Examination Queues)
INSERT INTO `examination_queues` (`id`, `appointment_id`, `queue_number`, `room`, `status`, `checkin_time`, `finish_time`) VALUES
(1, 2, 'A-01', 'P.101', 'completed', '2026-09-20 08:15:00', '2026-09-20 08:55:00');

-- 13. Bệnh án điện tử cho lịch hẹn đã hoàn thành (Medical Records)
INSERT INTO `medical_records` (`id`, `appointment_id`, `patient_id`, `doctor_id`, `anamnesis`, `vital_signs`, `clinical_diagnosis`, `icd10_code`, `doctor_notes`, `re_examination_date`) VALUES
(1, 2, 1, 1, 'Bệnh nhân mệt mỏi, ho húng hắng, hắt hơi và sốt nhẹ (37.8°C). Không khó thở.', '{"blood_pressure": "120/80", "heart_rate": 78, "temperature": 37.8, "weight": 65, "height": 170, "bmi": 22.49}', 'Viêm đường hô hấp trên cấp tính do siêu vi (Cảm cúm thông thường)', 'J06.9', 'Nghỉ ngơi, uống nhiều nước ấm, tránh gió lạnh, dùng thuốc đúng theo đơn.', '2026-09-27');

-- 14. Đơn thuốc (Prescriptions)
INSERT INTO `prescriptions` (`id`, `medical_record_id`, `appointment_id`, `doctor_id`, `patient_id`, `total_amount`, `usage_instructions`) VALUES
(1, 1, 2, 1, 1, 86000.00, 'Dùng thuốc đều đặn sau bữa ăn trong vòng 5 ngày. Nếu sốt cao trở lại cần quay lại tái khám.');

-- 15. Chi tiết đơn thuốc (Prescription Items)
INSERT INTO `prescription_items` (`id`, `prescription_id`, `medicine_id`, `medicine_name`, `dosage`, `unit`, `quantity`, `morning`, `noon`, `afternoon`, `night`, `instructions`, `unit_price`, `amount`) VALUES
(1, 1, 1, 'Paracetamol 500mg', '500mg', 'Viên', 10, '1', '0', '1', '0', 'Uống sau ăn khi đau đầu hoặc sốt', 2000.00, 20000.00),
(2, 1, 3, 'Cetirizine 10mg', '10mg', 'Viên', 5, '0', '0', '0', '1', 'Uống 1 viên trước khi ngủ', 4000.00, 20000.00),
(3, 1, 6, 'Vitamin C 500mg', '500mg', 'Viên sủi', 10, '1', '0', '0', '0', 'Hòa tan nước uống buổi sáng', 3000.00, 30000.00),
(4, 1, 4, 'Omeprazole 20mg', '20mg', 'Viên', 5, '1', '0', '0', '0', 'Uống trước bữa ăn sáng', 3200.00, 16000.00);

-- 16. Hóa đơn thanh toán (Payments)
INSERT INTO `payments` (`id`, `appointment_id`, `invoice_code`, `service_fee`, `medicine_fee`, `total_amount`, `discount`, `final_amount`, `payment_method`, `payment_status`, `paid_at`, `cashier_user_id`, `note`) VALUES
(1, 2, 'HD250424-0001', 200000.00, 86000.00, 286000.00, 0.00, 286000.00, 'cash', 'paid', '2026-09-20 09:10:00', 2, 'Thanh toán tiền mặt đầy đủ tại quầy thu ngân.');

-- 17. Đánh giá của bệnh nhân (Reviews)
INSERT INTO `reviews` (`id`, `appointment_id`, `patient_id`, `doctor_id`, `rating`, `comment`, `is_anonymous`) VALUES
(1, 2, 1, 1, 5, 'Bác sĩ Đức tư vấn rất nhẹ nhàng, tận tình, giải thích cặn kẽ đơn thuốc và tình trạng sức khỏe. Phòng khám rất sạch sẽ và hiện đại!', 0);

-- 18. Thông báo (Notifications)
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `link`) VALUES
(1, 4, 'Lịch hẹn đã được xác nhận', 'Lịch hẹn mã MB250425-0012 khám Nội tổng quát với BS. Nguyễn Minh Đức vào lúc 09:00 ngày 25/09/2026 đã được xác nhận.', 'appointment', 1, '/appointments/MB250425-0012'),
(2, 3, 'Có lịch hẹn mới', 'Bệnh nhân Trần Văn Nam đã đặt lịch khám vào lúc 09:00 ngày 25/09/2026.', 'doctor_appointment', 0, '/doctor/queue'),
(3, 4, 'Đơn thuốc đã hoàn tất', 'Kết quả khám và đơn thuốc của bạn ngày 20/09/2026 đã được lưu vào hồ sơ y tế.', 'medical_record', 1, '/appointments/MB250424-0005');

-- 19. Nhật ký hoạt động (Activity Logs)
INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `details`) VALUES
(1, 1, 'SYSTEM_INIT', 'System', 1, '127.0.0.1', 'CLI', 'Khởi tạo dữ liệu mẫu MediBook thành công'),
(2, 4, 'BOOK_APPOINTMENT', 'Appointment', 1, '127.0.0.1', 'Mozilla/5.0', 'Bệnh nhân đặt lịch MB250425-0012'),
(3, 2, 'CONFIRM_APPOINTMENT', 'Appointment', 1, '127.0.0.1', 'Mozilla/5.0', 'Lễ tân xác nhận lịch hẹn MB250425-0012');
