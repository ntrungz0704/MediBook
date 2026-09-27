# MediBook - Master Prompt Hướng Dẫn Phát Triển Toàn Bộ Hệ Thống

Tài liệu này là **Master Prompt** quy chuẩn chứa toàn bộ ngữ cảnh, kiến trúc, triết lý thiết kế và quy tắc nghiệp vụ để các AI Agent hoặc Lập trình viên tiếp tục bảo trì, mở rộng hệ thống MediBook mà không làm sai lệch quy chuẩn ban đầu.

---

## 1. Ngữ cảnh & Triết lý cốt lõi (Core Philosophy)
- **MediBook** là hệ thống quản lý phòng khám và đặt lịch khám bệnh trực tuyến được xây dựng theo kiến trúc **PHP MVC thuần (Pure PHP)**, không sử dụng các framework cồng kềnh nhằm tối ưu tốc độ thực thi, dễ dàng triển khai trên mọi môi trường máy chủ (XAMPP, Laragon, Docker, cPanel hoặc VPS).
- **Trải nghiệm người dùng (UX/UI)**: Thiết kế đồng bộ bám sát chuẩn tỷ lệ Desktop 16:9 và Mobile 9:16 với thanh điều hướng cố định (Bottom Nav) và nút tắt đặt lịch nổi bật.
- **Bảo mật tuyệt đối**: 100% truy vấn dữ liệu phải qua PDO Prepared Statements. Tất cả form POST phải có token CSRF. Toàn bộ chuỗi hiển thị ra view phải qua hàm lọc XSS `Helper::e()`. Mật khẩu băm một chiều BCRYPT.

---

## 2. Bản đồ 20 Bảng Database (MySQL InnoDB utf8mb4)
1. `users`: Tài khoản định danh và phân quyền (`admin`, `receptionist`, `doctor`, `patient`).
2. `patients`: Hồ sơ bệnh nhân (BHYT, nhóm máu, tiền sử bệnh, người liên hệ).
3. `doctors`: Hồ sơ bác sĩ (phòng khám, kinh nghiệm, biểu phí, điểm đánh giá).
4. `receptionists`: Hồ sơ nhân viên lễ tân và quầy tiếp đón.
5. `specialties`: Danh mục chuyên khoa phòng khám.
6. `services`: Danh mục dịch vụ khám và biểu giá.
7. `doctor_specialties`: Liên kết nhiều - nhiều giữa Bác sĩ và Chuyên khoa.
8. `doctor_schedules`: Lịch làm việc định kỳ hàng tuần của bác sĩ theo thứ (0-6).
9. `doctor_leaves`: Lịch nghỉ phép / bận đột xuất đã duyệt của bác sĩ.
10. `appointments`: Cuộc hẹn khám bệnh (mã `MB...`, ngày, khung giờ 30 phút, trạng thái).
11. `appointment_status_history`: Nhật ký chuyển trạng thái cuộc hẹn.
12. `examination_queues`: Hàng đợi điều phối tại sảnh phòng khám (STT `A-01...`).
13. `medical_records`: Bệnh án điện tử: Chẩn đoán lâm sàng, chỉ số sinh tồn (vitals JSON), mã ICD-10.
14. `medicines`: Kho dược phẩm phòng khám: Tên, đơn vị, giá bán, số lượng tồn kho.
15. `prescriptions`: Đơn thuốc điện tử tổng quát.
16. `prescription_items`: Chi tiết các loại thuốc trong đơn (liều lượng, cữ S-T-C-Tối, thành tiền).
17. `payments`: Hóa đơn viện phí (tiền khám + tiền thuốc, mã `HD...`, trạng thái thu).
18. `reviews`: Đánh giá chất lượng bác sĩ từ bệnh nhân sau khám.
19. `notifications`: Hệ thống thông báo người dùng theo thời gian thực.
20. `activity_logs`: Nhật ký kiểm toán bảo mật các hành vi nhạy cảm.

---

## 3. Vòng đời trạng thái Lịch hẹn (Appointment Lifecycle)
```
[pending] (Chờ xác nhận)
   │
   ▼
[confirmed] (Đã xác nhận) ──────────┐ (Bệnh nhân/Lễ tân hủy)
   │                                ▼
   ▼ (Lễ tân Check-in tại quầy)   [cancelled]
[checked_in] (Cấp số STT A-01...)
   │
   ▼ (Bác sĩ gọi vào phòng)
[in_consultation] (Đang khám)
   │
   ▼ (Lưu bệnh án & Kê toa)
[completed] (Đã hoàn thành) ──► Chuyển Thu ngân ──► [paid] (Đã thanh toán)
```

---

## 4. Nguyên tắc mở rộng tính năng mới
1. **Khi thêm Controller mới**:
   - Kế thừa từ `App\Core\Controller`.
   - Sử dụng `$this->validate()` và `$this->validateCsrf()` cho các request POST.
   - Luôn kiểm tra quyền vai trò bằng Middleware hoặc `Auth::requireRole()`.
2. **Khi thêm Model mới**:
   - Kế thừa từ `App\Core\Model`.
   - Đặt tên thuộc tính `$table` tương ứng với bảng trong cơ sở dữ liệu.
3. **Khi thực hiện các thao tác ghi dữ liệu phức tạp**:
   - Sử dụng Database Transaction (`Database::beginTransaction()`, `Database::commit()`, `Database::rollBack()`).
   - Khóa bản ghi khi kiểm tra xung đột thời gian bằng `FOR UPDATE`.
4. **Quy tắc hiển thị**:
   - Sử dụng các phương thức định dạng có sẵn trong `App\Core\Helper` (`formatCurrency`, `formatDateWithDayVi`, `getAppointmentStatusBadge`).
