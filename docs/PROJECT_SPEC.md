# MediBook - Đặc tả yêu cầu kỹ thuật & Nghiệp vụ hệ thống (PROJECT_SPEC)

## 1. Giới thiệu tổng quan
**MediBook** là nền tảng trực tuyến quản lý đặt lịch khám bệnh và điều phối quy trình phòng khám thông minh, hỗ trợ toàn diện 4 nhóm đối tượng: Bệnh nhân, Bác sĩ, Nhân viên Lễ tân và Quản trị viên (Admin).

Hệ thống được thiết kế tối ưu cho cả giao diện màn hình Desktop (tỷ lệ 16:9) và giao diện thiết bị di động (tỷ lệ 9:16) với thanh điều hướng cố định phía dưới (Bottom Navigation Bar) và nút tắt đặt lịch nhanh nổi bật.

---

## 2. Kiến trúc công nghệ
- **Ngôn ngữ nền tảng**: PHP 8.0+ theo mô hình MVC (Model - View - Controller).
- **Cơ sở dữ liệu**: MySQL 8.0+ (hỗ trợ InnoDB, UTF-8 MB4, ràng buộc khóa ngoại, chỉ mục index và transaction locking).
- **Giao diện người dùng**: HTML5, CSS3 hiện đại, Vanilla JavaScript không phụ thuộc framework nặng, responsive đa thiết bị.
- **Bảo mật**:
  - Mã hóa mật khẩu một chiều BCRYPT (`password_hash` và `password_verify`).
  - Chống tấn công CSRF (Cross-Site Request Forgery) trên tất cả các biểu mẫu POST.
  - Sử dụng 100% Prepared Statements qua PDO ngăn ngừa SQL Injection.
  - Thoát ký tự HTML (XSS prevention) khi hiển thị dữ liệu người dùng.
  - Phân quyền theo vai trò (Role-Based Access Control - RBAC) tại tầng Router & Middleware.
  - Chống Race Condition khi đặt lịch (Transaction + Overlap interval check).

---

## 3. Đặc tả 4 Vai trò người dùng (Roles)

### 3.1. Bệnh nhân (Patient)
- **Đăng ký & Đăng nhập**: Đăng ký tài khoản nhanh qua email/SĐT, đăng nhập bảo mật.
- **Khám phá dịch vụ & Bác sĩ**: Tra cứu danh mục chuyên khoa, tìm kiếm bác sĩ theo chuyên môn, đánh giá sao.
- **Quy trình đặt lịch trực tuyến 3 bước**:
  - Bước 1: Chọn Chuyên khoa, Dịch vụ & Bác sĩ.
  - Bước 2: Chọn Ngày khám & Khung giờ (Slot 30 phút). Các khung giờ đã kín hoặc trong quá khứ sẽ tự động bị khóa.
  - Bước 3: Điền triệu chứng / lý do khám và xác nhận.
- **Quản lý lịch khám ("Lịch của tôi")**: Xem danh sách các cuộc hẹn, trạng thái (Chờ xác nhận, Đã xác nhận, Đã tiếp đón, Đang khám, Đã hoàn thành, Đã hủy).
- **Xem bệnh án & Đơn thuốc**: Xem chẩn đoán của bác sĩ, hướng dẫn dùng thuốc sau khi buổi khám hoàn tất.
- **Đánh giá bác sĩ**: Chấm điểm từ 1 đến 5 sao và viết nhận xét sau khi hoàn thành lượt khám.

### 3.2. Bác sĩ (Doctor)
- **Tổng quan ca trực**: Theo dõi số lượng bệnh nhân hôm nay, số người đang chờ, số ca đã hoàn tất.
- **Quản lý hàng đợi phòng khám**:
  - Xem danh sách bệnh nhân đã check-in vào phòng khám của mình.
  - Gọi bệnh nhân vào phòng (cập nhật trạng thái và hiển thị trên màn hình sảnh chờ).
  - Tạm qua lượt (skip) nếu bệnh nhân chưa có mặt.
- **Thăm khám lâm sàng & Bệnh án điện tử**:
  - Xem tiền sử bệnh tật, dị ứng của bệnh nhân.
  - Ghi nhận chỉ số sinh tồn: Huyết áp, Nhịp tim, Thân nhiệt, Chiều cao, Cân nặng (tự động tính BMI).
  - Nhập chẩn đoán lâm sàng, mã bệnh ICD-10, lời dặn bác sĩ, hẹn ngày tái khám.
- **Kê đơn thuốc điện tử**:
  - Chọn thuốc từ danh mục kho dược hoặc nhập thuốc tự do.
  - Phân chia cữ uống (Sáng - Trưa - Chiều - Tối), số lượng, số ngày dùng, hướng dẫn dùng.
  - Tự động tính thành tiền thuốc và chuyển dữ liệu sang quầy thu ngân.
- **Quản lý ca trực & Xin nghỉ**: Xem lịch trực cố định trong tuần, gửi đơn xin nghỉ phép đột xuất.

### 3.3. Lễ tân (Receptionist)
- **Quầy tiếp đón & Điểm danh (Check-in)**:
  - Tra cứu bệnh nhân theo mã đặt lịch hoặc số điện thoại.
  - Bấm nút tiếp đón: Hệ thống tự động cấp Số Thứ Tự (Queue Number) theo phòng khám và đưa vào bảng điều phối.
- **Màn hình gọi số sảnh chờ (Live TV Board)**:
  - Giao diện toàn màn hình tối ưu cho TV tại sảnh phòng khám.
  - Hiển thị theo từng phòng: Số đang gọi, số đang khám, danh sách các số tiếp theo đang chờ.
  - Tự động cập nhật thời gian thực không cần tải lại trang.
- **Đặt lịch trực tiếp tại quầy (Walk-in)**: Tiếp nhận bệnh nhân đến trực tiếp phòng khám mà chưa đặt trước qua mạng, tùy chọn tiếp đón ngay.
- **Thu ngân & Quản lý viện phí**:
  - Xem danh sách hóa đơn viện phí (tiền khám + tiền thuốc).
  - Ghi nhận thanh toán (tiền mặt, chuyển khoản, ví điện tử).
  - In biên lai / hóa đơn thu tiền chính thức cho bệnh nhân.

### 3.4. Quản trị viên (Admin)
- **Bảng điều khiển KPI**: Tổng doanh thu, tổng lượt khám, tỷ lệ hoàn tất/hủy, biểu đồ doanh thu theo tháng.
- **Quản lý người dùng**: Thêm, sửa, khóa/mở khóa tài khoản người dùng, phân vai trò.
- **Quản lý Bác sĩ**: Cấu hình phòng khám, phí khám ban đầu, năm kinh nghiệm, gán chuyên khoa.
- **Quản lý Chuyên khoa & Dịch vụ**: Thêm/sửa danh mục chuyên khoa, biểu giá dịch vụ khám.
- **Quản lý Kho thuốc**: Quản lý danh mục thuốc, đơn giá bán, số lượng tồn kho, đơn vị tính.
- **Phân công ca trực & Duyệt nghỉ phép**: Thiết lập khung giờ trực hàng tuần cho từng bác sĩ, phê duyệt đơn xin nghỉ.
- **Quản trị lịch hẹn**: Tra cứu, lọc theo ngày/bác sĩ/trạng thái, điều chỉnh trạng thái thủ công.
- **Nhật ký bảo mật (Audit Logs)**: Ghi nhận vết hoạt động nhạy cảm (đăng nhập, đổi trạng thái, hủy lịch, thu tiền).
