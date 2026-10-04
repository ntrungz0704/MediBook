# MediBook - Kịch bản kiểm thử toàn diện (TEST_CASES)

> Bảng trạng thái bên dưới là tài liệu lịch sử; một số dòng còn ghi MySQL/FOR UPDATE. Kết quả tự động đang chạy nằm trong `test_full_suite.js` và [báo cáo xác minh](VERIFICATION_2026-10-04.md). Cơ chế chống đặt trùng hiện tại dùng transaction và unique index của SQLite.

Tài liệu này tổng hợp các trường hợp kiểm thử (Test Cases) đảm bảo tính toàn vẹn nghiệp vụ, an toàn bảo mật và trải nghiệm người dùng của hệ thống MediBook.

---

## 1. Kiểm thử Đăng ký, Đăng nhập & Phân quyền (Auth & RBAC)

| Mã TC | Mô tả kịch bản | Dữ liệu đầu vào | Kết quả kỳ vọng | Trạng thái |
|---|---|---|---|---|
| TC-AUTH-01 | Đăng ký tài khoản bệnh nhân hợp lệ | Tên, Email mới, SĐT, Mật khẩu khớp | Tạo người dùng thành công, tạo kèm bản ghi `patients`, tự động đăng nhập | Đạt |
| TC-AUTH-02 | Đăng ký với Email đã tồn tại | Email đã có trong bảng `users` | Báo lỗi validation "Địa chỉ email này đã được sử dụng trong hệ thống." | Đạt |
| TC-AUTH-03 | Đăng nhập đúng thông tin | `admin@medibook.local` / `password` | Đăng nhập thành công, chuyển hướng tự động đến `/admin/dashboard` | Đạt |
| TC-AUTH-04 | Đăng nhập sai mật khẩu | `admin@medibook.local` / `wrongpassword` | Báo lỗi "Email hoặc mật khẩu không chính xác." | Đạt |
| TC-AUTH-05 | Bệnh nhân cố truy cập trang Admin | Đăng nhập role `patient`, truy cập `/admin/dashboard` | Chặn truy cập, báo lỗi 403 hoặc chuyển hướng có thông báo flash | Đạt |
| TC-AUTH-06 | Bác sĩ truy cập Dashboard Bác sĩ | Đăng nhập role `doctor`, vào `/doctor/dashboard` | Hiển thị đúng giao diện bác sĩ và dữ liệu phòng khám | Đạt |

---

## 2. Kiểm thử Đặt lịch & Thuật toán chống trùng giờ (Booking & Conflict)

| Mã TC | Mô tả kịch bản | Dữ liệu đầu vào | Kết quả kỳ vọng | Trạng thái |
|---|---|---|---|---|
| TC-BOOK-01 | Đặt lịch vào ngày trong quá khứ | Chọn ngày < hôm nay | Bị chặn từ giao diện HTML5 (`min="today"`) và API trả về lỗi | Đạt |
| TC-BOOK-02 | Chọn ngày bác sĩ có đơn xin nghỉ phép | Chọn bác sĩ có bản ghi trong `doctor_leaves` trạng thái `approved` | API `/api/slots` báo lỗi "Bác sĩ có lịch nghỉ phép vào ngày này." | Đạt |
| TC-BOOK-03 | Chọn ngày bác sĩ không có ca trực | Chọn ngày trong tuần không khớp `doctor_schedules` | API thông báo bác sĩ không có lịch trực vào ngày này | Đạt |
| TC-BOOK-04 | Hiển thị khung giờ đã có người đặt | Khung 09:00 - 09:30 ngày 25/09 đã có mã MB250425-0012 | Nút giờ 09:00 bị disable, hiển thị gạch ngang, không thể click | Đạt |
| TC-BOOK-05 | Chống Race Condition (2 người cùng gửi đặt trùng giờ) | Hai request gửi đồng thời cùng slot | Transaction MySQL và khóa FOR UPDATE đảm bảo chỉ 1 người thành công, người còn lại nhận thông báo giờ đã có người đặt | Đạt |
| TC-BOOK-06 | Sinh mã đặt lịch chuẩn | Đặt lịch thành công | Sinh mã định dạng `MByymmdd-xxxx` độc nhất và ghi lịch sử trạng thái ban đầu | Đạt |

---

## 3. Kiểm thử Quy trình Tiếp đón & Hàng đợi (Reception & Queue)

| Mã TC | Mô tả kịch bản | Dữ liệu đầu vào | Kết quả kỳ vọng | Trạng thái |
|---|---|---|---|---|
| TC-QUEUE-01 | Lễ tân tìm kiếm lịch hẹn theo mã | Nhập `MB250425-0012` | Hiển thị chính xác cuộc hẹn của bệnh nhân | Đạt |
| TC-QUEUE-02 | Tiếp đón bệnh nhân (Check-in) | Bấm "Tiếp đón" tại quầy | Sinh số thứ tự STT chuẩn phòng (VD: `A-01`), đưa vào bảng `examination_queues`, đổi trạng thái lịch sang `checked_in` | Đạt |
| TC-QUEUE-03 | Hiển thị màn hình sảnh chờ (Live TV) | Mở `/receptionist/live-board` | Hiển thị danh sách các phòng khám, số đang gọi to rõ ràng, danh sách số chờ | Đạt |
| TC-QUEUE-04 | Bác sĩ gọi bệnh nhân | Bác sĩ bấm "Gọi bệnh nhân" tại phòng | Màn hình sảnh cập nhật ngay lập tức số đang gọi có hiệu ứng phát sáng | Đạt |

---

## 4. Kiểm thử Thăm khám & Kê toa & Thu ngân (Exam & Billing)

| Mã TC | Mô tả kịch bản | Dữ liệu đầu vào | Kết quả kỳ vọng | Trạng thái |
|---|---|---|---|---|
| TC-EXAM-01 | Tính toán BMI tự động | Nhập Chiều cao 170cm, Cân nặng 65kg | Ô BMI tự động tính bằng `22.5` | Đạt |
| TC-EXAM-02 | Thêm thuốc từ danh mục kho | Chọn thuốc `Paracetamol 500mg`, SL 10 | Tự nạp giá `2.000 đ`, thành tiền `20.000 đ`, cộng dồn vào tổng tiền thuốc | Đạt |
| TC-EXAM-03 | Hoàn tất khám bệnh | Bác sĩ bấm "Hoàn tất khám & Lưu bệnh án" | Lưu kết quả chẩn đoán vào `medical_records`, trừ kho `medicines`, sinh hóa đơn `payments` trạng thái `unpaid` | Đạt |
| TC-PAY-01 | Thu ngân nhận tiền viện phí | Lễ tân chọn "Tiền mặt", bấm "Thu tiền" | Hóa đơn chuyển trạng thái sang `paid`, ghi nhận thời gian thanh toán | Đạt |
| TC-PAY-02 | Xuất mẫu in biên lai viện phí | Bấm "In biên lai" | Hiển thị mẫu in đạt chuẩn, đầy đủ chi phí khám và tiền thuốc, ẩn thanh điều hướng | Đạt |
| TC-REV-01 | Bệnh nhân viết đánh giá bác sĩ | Bệnh nhân chấm 5 sao, ghi nhận xét sau khi đã khám xong | Lưu vào bảng `reviews`, cập nhật lại điểm trung bình sao của bác sĩ | Đạt |

---

## 5. Kiểm thử Bảo mật & Toàn vẹn (Security)

| Mã TC | Mô tả kịch bản | Kỹ thuật kiểm tra | Kết quả kỳ vọng | Trạng thái |
|---|---|---|---|---|
| TC-SEC-01 | Chống tấn công SQL Injection | Nhập chuỗi `' OR '1'='1` vào ô tìm kiếm hoặc form đăng nhập | Prepared Statements PDO xử lý như chuỗi thông thường, không phá vỡ câu lệnh SQL | Đạt |
| TC-SEC-02 | Chống tấn công Cross-Site Scripting (XSS) | Nhập `<script>alert('XSS')</script>` vào ô triệu chứng | Dữ liệu được mã hóa an toàn qua `Helper::e()` khi in ra màn hình | Đạt |
| TC-SEC-03 | Chống giả mạo CSRF | Submit form POST không có token hoặc token sai | Hệ thống từ chối yêu cầu và báo lỗi bảo mật | Đạt |
| TC-SEC-04 | Bảo mật mật khẩu | Kiểm tra trường `password_hash` trong database | Mật khẩu được mã hóa an toàn bằng thuật toán BCRYPT, không bao giờ lưu plain-text | Đạt |
