# MediBook — xác minh mã nguồn và dữ liệu ngày 04/10/2026

## Kết luận có bằng chứng

- Ứng dụng dùng HTML/CSS/JavaScript, EJS, Node.js/TypeScript và SQLite; không chạy PHP hoặc MySQL. EJS là template HTML, SQL là ngôn ngữ truy vấn CSDL.
- Schema SQLite mới có **27 bảng và 41 khóa ngoại**. ERD cũ ghi 26 bảng vì chưa có `contact_requests`. `src/db.ts` là nguồn migration; `database/schema.sql`, `docs/ERD.md`, `docs/MediBook_ERD.drawio` được sinh từ DB mới. `npm run erd:check` so khớp tài liệu và xác minh SQL xuất ra dựng lại cùng bảng/cột/khóa ngoại.
- DB local trước migration có **26 bảng**, 40 khóa ngoại, `user_version=0`, `integrity_check=ok`, không có FK lỗi. Bản sao thử nghiệm lên `user_version=2` đạt 27 bảng/41 khóa ngoại, giữ nguyên 108 người dùng và 7 lịch hẹn. Sau đó đã sao lưu DB gốc tại `database/medibook-backup-20261004-before-migration.sqlite`, khởi động lại ứng dụng và xác nhận DB local cũng đạt 27 bảng/41 khóa ngoại, 108 người dùng, 7 lịch hẹn, `integrity_check=ok`, không có FK lỗi; HTTP `/` trả 200. Ba FK có sẵn trong DB cũ nhưng thiếu ở định nghĩa DB mới đã được bổ sung (`medical_records.parent_visit_id`, `prescriptions.doctor_id`, `prescriptions.patient_id`).
- Bộ kiểm thử tích hợp chạy trên DB SQLite tạm: **154/154 assertion đạt**. Kiểm tra render **49/49 EJS đạt**. `npm run build`, `npm run erd:check`, `node --check public/assets/js/booking.js`, `git diff --check` đạt. `npm audit --omit=dev --audit-level=high` báo 0 lỗ hổng ở dependency production tại thời điểm kiểm tra.

## Vai trò và đồng bộ

| Vai trò | Luồng đã kiểm tra | Nguồn quyền |
|---|---|---|
| Admin | Quản lý tài khoản, danh mục, ca trực, báo cáo, tiếp nhận liên hệ | `user_roles` + trạng thái `users` |
| Doctor | Dashboard, hàng đợi, khám, kê đơn; cũng có thể nhận role patient | `user_roles` + hồ sơ `doctors` |
| Receptionist | Check-in, hàng đợi, thu viện phí, in biên lai | `user_roles` + hồ sơ `receptionists` |
| Patient | Đặt lịch, xem bệnh án/đơn thuốc của mình, đánh giá | `user_roles` + hồ sơ `patients` |

Quyền và trạng thái tài khoản được đọc lại ở mỗi request. Gỡ role doctor hoặc khóa tài khoản làm phiên cũ mất quyền ngay; danh sách bác sĩ và đặt lịch cũng ẩn bác sĩ không còn role. Tạo/sửa tài khoản nhiều role chạy trong transaction và tạo hồ sơ theo role. Sau khi xóa role hoặc ca trực, restart DB không tự khôi phục chúng. Mã cũ từng cấp role patient cho mọi user và tự điền ca trực khi restart; logic đó đã bỏ, ca demo chỉ sinh trong seed của môi trường phát triển.

## Giá trị cố định và dữ liệu mẫu

Trang đặt lịch và màn hình bác sĩ lấy phí từ bác sĩ/dịch vụ đang chọn, không còn hiển thị 200.000 ₫, 30 phút hay địa chỉ không có trong mô hình dữ liệu. Form tài khoản khách mô tả đúng mật khẩu ngẫu nhiên, mật khẩu nhập tay tối thiểu 8 ký tự. Số lượt xem bài viết mới mặc định 0; giao diện không cộng số lượt xem giả. Form dịch vụ/thuốc không tự điền giá/tồn kho mẫu. Các giá trị enum, giới hạn kiểm tra đầu vào, màu giao diện và dữ liệu demo trong `src/seed-data.json`/`src/db.ts` vẫn là hằng số có chủ đích; dữ liệu demo chỉ được nạp trong lần khởi tạo DB phát triển trống. Production mới không tự xuất bản bài viết hoặc tạo phòng/giường mẫu. Bài viết đã có trong DB cũ chưa được xóa vì cần người quản trị xác minh nội dung và quyền tác giả.

## Giới hạn còn lại

Không có phép thử nào chứng minh “hết mọi lỗi” hay “đồng bộ tuyệt đối” trong mọi tình huống. Dự án chưa có thực thể cơ sở y tế/chi nhánh nên chưa hỗ trợ đặt lịch theo nhiều bệnh viện; chưa có cổng thanh toán/đối soát/hoàn tiền, nhắc lịch, đổi lịch và quên mật khẩu. Chưa chạy kiểm thử trình duyệt trên thiết bị thật hoặc kiểm toán accessibility toàn diện. Một số enum chưa có `CHECK` ở SQLite, một số route nhập liệu ngoài nhóm đã kiểm tra chưa có test biên. Cần cấu hình `SESSION_SECRET`, tài khoản quản trị ban đầu và thông tin phòng khám thật trước khi vận hành production.

Các tài liệu `PROJECT_SPEC.md`, `MASTER_PROMPT.md`, `TEST_CASES.md` là đặc tả/kịch bản lịch sử; chỗ nhắc PHP/MySQL không mô tả ứng dụng hiện chạy.
