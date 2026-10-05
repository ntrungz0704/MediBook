# MediBook — hướng dẫn đọc ERD 27 bảng

Sinh từ schema SQLite hiện tại: **27 bảng, 273 trường, 41 khóa ngoại thật**. Sơ đồ đầy đủ: [SVG phóng to](MediBook_ERD_Complete.svg), [PNG](MediBook_ERD_Complete.png); sơ đồ tổng quan: [SVG](MediBook_ERD_Overview.svg), [PNG](MediBook_ERD_Overview.png); bản có thể chỉnh: [draw.io](MediBook_ERD.drawio).

## Đối chiếu với ảnh cũ

- Ảnh cũ có 18 ô; cần thêm `roles`, `user_roles`, `receptionists`, `appointment_status_history`, `notifications`, `articles`, `rooms`, `beds`, `contact_requests`.
- Đổi tên `doctors_specialties` → `doctor_specialties`, `doctors_leaves` → `doctor_leaves`, `prescriptions_items` → `prescription_items`.
- `patients.full_name`, `users.password`, `doctors.rating_counts`, các cột sinh hiệu rời như `systolic`/`pulse` trong ảnh không phải cột hiện tại. Tên người ở `users.name`, mật khẩu băm ở `users.password_hash`, số đánh giá ở `doctors.rating_count`, sinh hiệu ở `medical_records.vital_signs` (text/JSON).
- `gender` là trường giới tính trong `patients`: `male` = nam, `female` = nữ, `other` = khác. Schema mặc định `other`; không nên tự diễn giải `other` thành giới tính thực khi người dùng chưa tự khai. Ứng dụng hiện chặn giá trị ngoài ba mã này ở form hồ sơ.

## Cách bổ sung vào ảnh ERD cũ

1. Vẽ `roles` và `user_roles` cạnh `users`. Nối `users.id` → `user_roles.user_id` bằng dây FK 1 → 0..N. Vẽ **nét đứt** từ `roles.code` sang `user_roles.role` và `users.role`, vì hai dây này hiện chỉ là quy ước nghiệp vụ.
2. Vẽ `receptionists` cạnh `patients` và `doctors`; nối `users.id` → `receptionists.user_id` theo 1 → 0..1. Hai hồ sơ còn lại cũng là 1 → 0..1, không phải 1 → N.
3. Vẽ `appointment_status_history` cạnh `appointments`: lịch hẹn 1 → 0..N lịch sử; `changed_by_user_id` nối tùy chọn về `users.id`. Vẽ `notifications` cạnh `users`: tài khoản 1 → 0..N thông báo.
4. Vẽ `rooms` và `beds` cạnh phần nội trú: phòng 1 → 0..N giường. Từ `beds`, nối thêm các FK tùy chọn sang `patients`, `doctors`, `medical_records`. Từ `medical_records.bed_id` nối ngược tới `beds.id`; xem cảnh báo đồng bộ hai chiều ở cuối tài liệu.
5. Vẽ `contact_requests` gần `users` (người gửi có thể là khách nên `user_id` để trống); `articles` đứng độc lập vì tác giả hiện lưu bằng chữ. Giữ các dây thuốc, tiền, chuyên khoa có sẵn và sửa đúng tên/cột trong mục đối chiếu.
6. Với từng dây còn lại, đối chiếu mã R01–R41 trên SVG với bảng 41 dây bên dưới. Đầu nối ký hiệu `||` là đúng một, `o|` là không hoặc một, `o{` là không hoặc nhiều.

## Cách đọc khóa và dây nối

- **PK** = khóa chính, mã duy nhất mỗi hàng. **FK** = khóa ngoại, giá trị trỏ đến PK/UNIQUE ở bảng khác. **UNIQUE** = giá trị hoặc cặp giá trị không trùng.
- `A ||--o{ B`: mỗi B phải trỏ đúng 1 A; một A có 0 đến nhiều B. `A ||--o| B`: mỗi B phải trỏ đúng 1 A; một A có 0 hoặc 1 B. `A o|--o{ B`: một B có thể không trỏ A vì FK cho phép NULL.
- `users` → `patients`/`doctors`/`receptionists` đều 1 → 0..1 do `user_id` vừa FK vừa UNIQUE ở từng bảng con. Cùng một `users.id` có thể có nhiều **loại** hồ sơ, nên một người vừa là bác sĩ vừa là bệnh nhân không mâu thuẫn.
- `users` → `user_roles` là 1 → 0..N; cặp `(user_id, role)` UNIQUE nên một role chỉ cấp một lần cho một người. `roles.code` và `user_roles.role` có liên hệ **nghiệp vụ** (nét đứt trên hình) nhưng **chưa có FK vật lý** trong SQLite. `users.role` là vai trò chính/di sản; kiểm quyền hiện đọc `user_roles`.
- `doctor_specialties` nối nhiều bác sĩ với nhiều chuyên khoa; `favorite_doctors` nối nhiều bệnh nhân với nhiều bác sĩ. Mỗi bảng nối có hai FK và khóa UNIQUE cho cặp.
- `ON DELETE CASCADE`: xóa hàng cha sẽ xóa hàng con; `SET NULL`: giữ hàng con nhưng bỏ liên kết; `NO ACTION`: SQLite ngăn xóa cha khi còn con tham chiếu. Đây là quy tắc dữ liệu, không có nghĩa giao diện cho phép xóa tùy ý.

## 27 bảng và 273 trường: Anh → Việt

### Tài khoản & liên hệ

#### users

Tài khoản đăng nhập và thông tin định danh chung.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của users | INTEGER; PK; tự tăng/duy nhất |
| `role` | Vai trò chính/giá trị tương thích cũ; quyền thực đọc user_roles | TEXT; Bắt buộc; Mặc định 'patient' |
| `name` | Tên hiển thị của bản ghi | TEXT; Bắt buộc |
| `email` | Địa chỉ email | TEXT; Bắt buộc; UNIQUE |
| `password_hash` | Mật khẩu đã băm; không lưu mật khẩu gốc | TEXT; Bắt buộc |
| `phone` | Số điện thoại | TEXT; Có thể NULL |
| `avatar` | Đường dẫn ảnh đại diện | TEXT; Có thể NULL |
| `status` | active=được đăng nhập, inactive=tài khoản bị khóa | TEXT; Bắt buộc; Mặc định 'active' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### roles

Danh mục mã vai trò dùng để giải thích quyền trong hệ thống.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của roles | INTEGER; PK; tự tăng/duy nhất |
| `code` | Mã role: admin, doctor, receptionist, patient | TEXT; Bắt buộc; UNIQUE |
| `name` | Tên vai trò tiếng Việt | TEXT; Bắt buộc |
| `description` | Mô tả quyền của vai trò | TEXT; Có thể NULL |

#### user_roles

Những vai trò được cấp cho tài khoản; một tài khoản có nhiều dòng.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của user_roles | INTEGER; PK; tự tăng/duy nhất |
| `user_id` | Mã tài khoản users.id | INTEGER; Bắt buộc; FK R41 → users.id |
| `role` | Vai trò thực sự được cấp cho user; một dòng/một role | TEXT; Bắt buộc |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### patients

Thông tin y tế của tài khoản có vai trò bệnh nhân.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của patients | INTEGER; PK; tự tăng/duy nhất |
| `user_id` | Mã tài khoản users.id | INTEGER; Bắt buộc; UNIQUE; FK R27 → users.id |
| `dob` | Ngày sinh (date of birth) | TEXT; Có thể NULL |
| `gender` | Giới tính: male=nam, female=nữ, other=khác | TEXT; Có thể NULL; Mặc định 'other' |
| `blood_group` | Nhóm máu | TEXT; Có thể NULL |
| `address` | Địa chỉ liên hệ | TEXT; Có thể NULL |
| `emergency_contact` | Người liên hệ khẩn cấp | TEXT; Có thể NULL |
| `health_insurance_no` | Số thẻ bảo hiểm y tế | TEXT; Có thể NULL |
| `medical_history` | Tiền sử bệnh | TEXT; Có thể NULL |
| `priority_category` | Nhóm ưu tiên tiếp đón | TEXT; Có thể NULL; Mặc định 'normal' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### doctors

Thông tin nghề nghiệp và biểu phí của một tài khoản bác sĩ.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của doctors | INTEGER; PK; tự tăng/duy nhất |
| `user_id` | Mã tài khoản users.id | INTEGER; Bắt buộc; UNIQUE; FK R17 → users.id |
| `title` | Học vị/chức danh bác sĩ | TEXT; Bắt buộc; Mặc định 'Bác sĩ' |
| `bio` | Tiểu sử và kinh nghiệm mô tả | TEXT; Có thể NULL |
| `experience_years` | Số năm kinh nghiệm | INTEGER; Có thể NULL; Mặc định 1 |
| `consultation_fee` | Phí khám mặc định của bác sĩ | REAL; Bắt buộc; Mặc định 0.00 |
| `rating` | Điểm đánh giá trung bình | REAL; Bắt buộc; Mặc định 0.00 |
| `rating_count` | Số lượt đánh giá | INTEGER; Bắt buộc; Mặc định 0 |
| `room_number` | Mã phòng khám đang phụ trách | TEXT; Bắt buộc; Mặc định '' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### receptionists

Hồ sơ nhân viên lễ tân của một tài khoản.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của receptionists | INTEGER; PK; tự tăng/duy nhất |
| `user_id` | Mã tài khoản users.id | INTEGER; Bắt buộc; UNIQUE; FK R36 → users.id |
| `staff_code` | Mã nhân viên lễ tân duy nhất | TEXT; Bắt buộc; UNIQUE |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `department` | Bộ phận làm việc | TEXT; Có thể NULL; Mặc định 'Bộ phận Tiếp đón & Thu ngân' |
| `shift_default` | Ca làm việc mặc định mô tả bằng chữ | TEXT; Có thể NULL; Mặc định 'Sáng - Chiều' |

#### notifications

Thông báo trong ứng dụng cho tài khoản.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của notifications | INTEGER; PK; tự tăng/duy nhất |
| `user_id` | Mã tài khoản users.id | INTEGER; Bắt buộc; FK R26 → users.id |
| `title` | Tiêu đề thông báo | TEXT; Bắt buộc |
| `message` | Nội dung thông báo | TEXT; Bắt buộc |
| `type` | Loại thông báo | TEXT; Có thể NULL; Mặc định 'general' |
| `link` | Đường dẫn trang liên quan | TEXT; Có thể NULL |
| `is_read` | Đã đọc thông báo hay chưa (0/1) | INTEGER; Có thể NULL; Mặc định 0 |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### activity_logs

Nhật ký thao tác để truy vết người dùng và đối tượng bị thay đổi.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của activity_logs | INTEGER; PK; tự tăng/duy nhất |
| `user_id` | Mã tài khoản users.id | INTEGER; Có thể NULL; FK R01 → users.id |
| `action` | Mã hành động được ghi lại | TEXT; Bắt buộc |
| `entity_type` | Loại đối tượng bị tác động | TEXT; Có thể NULL |
| `entity_id` | Mã đối tượng bị tác động; không có FK chung | INTEGER; Có thể NULL |
| `details` | Chi tiết thao tác | TEXT; Có thể NULL |
| `ip_address` | Địa chỉ IP gửi yêu cầu | TEXT; Có thể NULL |
| `user_agent` | Thông tin trình duyệt/thiết bị | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### contact_requests

Yêu cầu liên hệ do khách hoặc tài khoản gửi.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của contact_requests | INTEGER; PK; tự tăng/duy nhất |
| `user_id` | Mã tài khoản users.id | INTEGER; Có thể NULL; FK R12 → users.id |
| `name` | Tên người gửi liên hệ | TEXT; Bắt buộc |
| `phone` | Số điện thoại | TEXT; Bắt buộc |
| `email` | Địa chỉ email | TEXT; Bắt buộc |
| `subject` | Chủ đề cần hỗ trợ | TEXT; Có thể NULL |
| `message` | Nội dung lời nhắn | TEXT; Bắt buộc |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Bắt buộc; Mặc định CURRENT_TIMESTAMP |

### Danh mục & lịch làm việc

#### specialties

Danh mục chuyên khoa khám.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của specialties | INTEGER; PK; tự tăng/duy nhất |
| `name` | Tên hiển thị của bản ghi | TEXT; Bắt buộc; UNIQUE |
| `slug` | Đoạn URL duy nhất của chuyên khoa | TEXT; Bắt buộc; UNIQUE |
| `description` | Nội dung mô tả | TEXT; Có thể NULL |
| `icon` | Tên biểu tượng hiển thị | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `image` | Đường dẫn ảnh hiển thị | TEXT; Có thể NULL |
| `status` | active=hiển thị, inactive=ẩn khỏi đặt lịch | TEXT; Bắt buộc; Mặc định 'active' |

#### doctor_specialties

Bảng nối bác sĩ với chuyên khoa mà bác sĩ phụ trách.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của doctor_specialties | INTEGER; PK; tự tăng/duy nhất |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Bắt buộc; FK R15 → doctors.id |
| `specialty_id` | Mã chuyên khoa specialties.id | INTEGER; Bắt buộc; FK R16 → specialties.id |
| `is_primary` | Chuyên khoa chính của bác sĩ (0/1) | INTEGER; Có thể NULL; Mặc định 0 |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### services

Dịch vụ khám và giá gắn với chuyên khoa.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của services | INTEGER; PK; tự tăng/duy nhất |
| `specialty_id` | Mã chuyên khoa specialties.id | INTEGER; Có thể NULL; FK R40 → specialties.id |
| `name` | Tên hiển thị của bản ghi | TEXT; Bắt buộc |
| `description` | Nội dung mô tả | TEXT; Có thể NULL |
| `price` | Giá dịch vụ | REAL; Bắt buộc |
| `duration_minutes` | Thời lượng dịch vụ tính bằng phút | INTEGER; Có thể NULL; Mặc định 30 |
| `status` | active=đang cung cấp, inactive=ngừng cung cấp | TEXT; Bắt buộc; Mặc định 'active' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### doctor_schedules

Ca làm việc lặp theo thứ trong tuần của bác sĩ.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của doctor_schedules | INTEGER; PK; tự tăng/duy nhất |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Bắt buộc; FK R14 → doctors.id |
| `day_of_week` | Thứ trong tuần: 0 Chủ nhật, 1 Thứ hai…6 Thứ bảy | INTEGER; Bắt buộc |
| `start_time` | Giờ bắt đầu | TEXT; Bắt buộc |
| `end_time` | Giờ kết thúc | TEXT; Bắt buộc |
| `max_patients` | Số bệnh nhân tối đa của ca | INTEGER; Có thể NULL; Mặc định 20 |
| `is_active` | Cờ hoạt động cũ; ứng dụng hiện đọc status | INTEGER; Có thể NULL; Mặc định 1 |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `slot_duration` | Số phút một khung khám | INTEGER; Có thể NULL; Mặc định 30 |
| `status` | Ca đang hoạt động (active) hoặc ngừng (inactive) | TEXT; Có thể NULL; Mặc định 'active' |

#### doctor_leaves

Khoảng thời gian bác sĩ xin nghỉ hoặc được duyệt nghỉ.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của doctor_leaves | INTEGER; PK; tự tăng/duy nhất |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Bắt buộc; FK R13 → doctors.id |
| `start_date` | Ngày bắt đầu | TEXT; Bắt buộc |
| `end_date` | Ngày kết thúc | TEXT; Bắt buộc |
| `reason` | Lý do | TEXT; Có thể NULL |
| `status` | pending=chờ duyệt, approved=đã duyệt, rejected=từ chối | TEXT; Bắt buộc; Mặc định 'approved' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### favorite_doctors

Danh sách bác sĩ được bệnh nhân lưu yêu thích.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của favorite_doctors | INTEGER; PK; tự tăng/duy nhất |
| `patient_id` | Mã hồ sơ bệnh nhân patients.id | INTEGER; Bắt buộc; FK R20 → patients.id |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Bắt buộc; FK R19 → doctors.id |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### medicines

Danh mục thuốc và số lượng tồn kho.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của medicines | INTEGER; PK; tự tăng/duy nhất |
| `code` | Mã nghiệp vụ | TEXT; Có thể NULL; UNIQUE |
| `name` | Tên hiển thị của bản ghi | TEXT; Bắt buộc |
| `unit` | Đơn vị tính | TEXT; Bắt buộc; Mặc định 'Viên' |
| `usage_instruction` | Hướng dẫn dùng thuốc mặc định | TEXT; Có thể NULL |
| `unit_price` | Giá một đơn vị | REAL; Bắt buộc; Mặc định 0.00 |
| `stock_quantity` | Số lượng hiện còn trong kho | INTEGER; Bắt buộc; Mặc định 100 |
| `status` | active=được kê, inactive=ngừng dùng | TEXT; Bắt buộc; Mặc định 'active' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `category` | Nhóm thuốc | TEXT; Có thể NULL |

#### articles

Bài viết/cẩm nang y tế hiển thị công khai khi được bật.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của articles | INTEGER; PK; tự tăng/duy nhất |
| `category` | Mã nhóm bài viết | TEXT; Bắt buộc |
| `category_name` | Tên nhóm bài viết | TEXT; Bắt buộc |
| `pill_label` | Nhãn ngắn trên thẻ bài | TEXT; Bắt buộc |
| `icon` | Tên biểu tượng hiển thị | TEXT; Có thể NULL; Mặc định '💊' |
| `slug` | Đoạn URL duy nhất của bài | TEXT; Bắt buộc; UNIQUE |
| `title` | Tiêu đề bài viết | TEXT; Bắt buộc |
| `summary` | Tóm tắt bài | TEXT; Bắt buộc |
| `content` | Nội dung HTML của bài | TEXT; Bắt buộc |
| `author_name` | Tên tác giả ghi trong bài; không liên kết users | TEXT; Bắt buộc |
| `author_role` | Vai trò/chức danh tác giả ghi trong bài | TEXT; Bắt buộc |
| `views_count` | Số lần xem được đếm | INTEGER; Bắt buộc; Mặc định 0 |
| `status` | Bật hoặc ẩn bài viết; chỉ active hiển thị công khai | TEXT; Bắt buộc; Mặc định 'active' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

### Đặt lịch & khám bệnh

#### appointments

Một lần đặt khám của một bệnh nhân với một bác sĩ.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của appointments | INTEGER; PK; tự tăng/duy nhất |
| `booking_code` | Mã đặt khám duy nhất gửi bệnh nhân | TEXT; Bắt buộc; UNIQUE |
| `patient_id` | Mã hồ sơ bệnh nhân patients.id | INTEGER; Bắt buộc; FK R05 → patients.id |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Bắt buộc; FK R04 → doctors.id |
| `specialty_id` | Mã chuyên khoa specialties.id | INTEGER; Có thể NULL; FK R07 → specialties.id |
| `service_id` | Mã dịch vụ services.id | INTEGER; Có thể NULL; FK R06 → services.id |
| `appointment_date` | Ngày đến khám | TEXT; Bắt buộc |
| `start_time` | Giờ bắt đầu | TEXT; Bắt buộc |
| `end_time` | Giờ kết thúc | TEXT; Bắt buộc |
| `status` | Trạng thái lịch: chờ xác nhận, đã xác nhận, đã đến, đang khám, hoàn tất, hủy hoặc vắng mặt | TEXT; Bắt buộc; Mặc định 'pending' |
| `symptoms` | Triệu chứng bệnh nhân mô tả | TEXT; Có thể NULL |
| `notes` | Ghi chú | TEXT; Có thể NULL |
| `cancellation_reason` | Lý do hủy lịch | TEXT; Có thể NULL |
| `source` | Nguồn đặt: trực tuyến hoặc tại quầy | TEXT; Bắt buộc; Mặc định 'online' |
| `priority_level` | Mức ưu tiên hàng đợi | TEXT; Bắt buộc; Mặc định 'online' |
| `priority_reason` | Lý do được ưu tiên | TEXT; Có thể NULL |
| `is_bumped` | Có bị nhường khung giờ hay không (0/1) | INTEGER; Có thể NULL; Mặc định 0 |
| `bumped_from_slot` | Khung giờ cũ trước khi nhường | TEXT; Có thể NULL |
| `estimated_start_time` | Giờ khám dự kiến sau điều phối | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### appointment_status_history

Lịch sử mỗi lần lịch hẹn đổi trạng thái.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của appointment_status_history | INTEGER; PK; tự tăng/duy nhất |
| `appointment_id` | Mã lịch hẹn appointments.id | INTEGER; Bắt buộc; FK R02 → appointments.id |
| `old_status` | Trạng thái lịch hẹn trước thay đổi | TEXT; Có thể NULL |
| `new_status` | Trạng thái sau thay đổi | TEXT; Bắt buộc |
| `changed_by_user_id` | Tài khoản thực hiện đổi trạng thái | INTEGER; Có thể NULL; FK R03 → users.id |
| `note` | Ghi chú | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### examination_queues

Một số thứ tự tiếp đón ứng với một lịch hẹn.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của examination_queues | INTEGER; PK; tự tăng/duy nhất |
| `appointment_id` | Mã lịch hẹn appointments.id | INTEGER; Bắt buộc; UNIQUE; FK R18 → appointments.id |
| `queue_number` | Số thứ tự hiển thị khi gọi | TEXT; Bắt buộc |
| `queue_date` | Ngày của hàng đợi | TEXT; Có thể NULL |
| `room` | Phòng xếp hàng | TEXT; Bắt buộc |
| `status` | waiting=chờ, calling=đang gọi, in_room=đã vào phòng, completed=hoàn tất | TEXT; Bắt buộc; Mặc định 'waiting' |
| `priority_level` | Loại ưu tiên | TEXT; Bắt buộc; Mặc định 'online' |
| `priority_order` | Thứ tự ưu tiên để sắp hàng | INTEGER; Bắt buộc; Mặc định 3 |
| `is_bumped` | Lượt có bị đẩy/nhường không (0/1) | INTEGER; Có thể NULL; Mặc định 0 |
| `bumped_reason` | Lý do thay đổi thứ tự | TEXT; Có thể NULL |
| `checkin_time` | Lúc đến quầy tiếp đón | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `called_time` | Lúc bác sĩ gọi số | DATETIME; Có thể NULL |
| `finish_time` | Lúc kết thúc lượt | DATETIME; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### medical_records

Bệnh án tạo từ một lịch hẹn đã khám.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của medical_records | INTEGER; PK; tự tăng/duy nhất |
| `appointment_id` | Mã lịch hẹn appointments.id | INTEGER; Bắt buộc; UNIQUE; FK R21 → appointments.id |
| `patient_id` | Mã hồ sơ bệnh nhân patients.id | INTEGER; Bắt buộc; FK R25 → patients.id |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Bắt buộc; FK R23 → doctors.id |
| `parent_visit_id` | Bệnh án trước mà lần tái khám nối tiếp | INTEGER; Có thể NULL; FK R24 → medical_records.id |
| `visit_type` | Loại lượt: khám đầu hoặc tái khám | TEXT; Bắt buộc; Mặc định 'initial' |
| `treatment_type` | Ngoại trú hay nội trú | TEXT; Bắt buộc; Mặc định 'outpatient' |
| `inpatient_room` | Mã phòng nội trú ghi tại thời điểm khám | TEXT; Có thể NULL |
| `inpatient_bed` | Mã giường nội trú ghi tại thời điểm khám | TEXT; Có thể NULL |
| `admission_date` | Ngày nhập viện | TEXT; Có thể NULL |
| `discharge_date` | Ngày xuất viện | TEXT; Có thể NULL |
| `vital_signs` | Chỉ số sinh tồn lưu dạng JSON/text | TEXT; Có thể NULL |
| `anamnesis` | Bệnh sử do bác sĩ ghi | TEXT; Có thể NULL |
| `clinical_diagnosis` | Chẩn đoán lâm sàng | TEXT; Bắt buộc |
| `icd10_code` | Mã bệnh theo ICD-10 nếu có | TEXT; Có thể NULL |
| `treatment_plan` | Kế hoạch điều trị | TEXT; Có thể NULL |
| `doctor_notes` | Ghi chú của bác sĩ | TEXT; Có thể NULL |
| `re_examination_date` | Ngày hẹn tái khám | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `bed_id` | Giường nội trú được cấp | INTEGER; Có thể NULL; FK R22 → beds.id |

#### reviews

Đánh giá sau khám do bệnh nhân gửi cho bác sĩ.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của reviews | INTEGER; PK; tự tăng/duy nhất |
| `patient_id` | Mã hồ sơ bệnh nhân patients.id | INTEGER; Bắt buộc; FK R39 → patients.id |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Bắt buộc; FK R38 → doctors.id |
| `appointment_id` | Mã lịch hẹn appointments.id | INTEGER; Có thể NULL; UNIQUE; FK R37 → appointments.id |
| `rating` | Điểm đánh giá từ 1 đến 5 (DB có CHECK) | INTEGER; Bắt buộc |
| `comment` | Nội dung nhận xét | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `is_anonymous` | Ẩn tên người đánh giá hay không (0/1) | INTEGER; Có thể NULL; Mặc định 0 |

### Đơn thuốc, tiền & nội trú

#### prescriptions

Đầu đơn thuốc thuộc một bệnh án.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của prescriptions | INTEGER; PK; tự tăng/duy nhất |
| `medical_record_id` | Mã bệnh án medical_records.id | INTEGER; Bắt buộc; UNIQUE; FK R34 → medical_records.id |
| `appointment_id` | Mã lịch hẹn appointments.id | INTEGER; Có thể NULL; FK R32 → appointments.id |
| `doctor_id` | Mã hồ sơ bác sĩ doctors.id | INTEGER; Có thể NULL; FK R33 → doctors.id |
| `patient_id` | Mã hồ sơ bệnh nhân patients.id | INTEGER; Có thể NULL; FK R35 → patients.id |
| `total_amount` | Tổng tiền trước giảm giá | REAL; Bắt buộc; Mặc định 0.00 |
| `usage_instructions` | Hướng dẫn dùng chung toàn đơn thuốc | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### prescription_items

Từng dòng thuốc, liều và giá đã chốt trong đơn.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của prescription_items | INTEGER; PK; tự tăng/duy nhất |
| `prescription_id` | Mã đơn thuốc prescriptions.id | INTEGER; Bắt buộc; FK R31 → prescriptions.id |
| `medicine_id` | Mã thuốc medicines.id | INTEGER; Có thể NULL; FK R30 → medicines.id |
| `medicine_name` | Tên thuốc chốt lúc kê; giữ khi danh mục đổi | TEXT; Bắt buộc |
| `dosage` | Hàm lượng/liều thuốc | TEXT; Có thể NULL |
| `unit` | Đơn vị tính | TEXT; Có thể NULL; Mặc định 'Viên' |
| `quantity` | Số lượng | REAL; Bắt buộc; Mặc định 1 |
| `morning` | Liều buổi sáng | TEXT; Có thể NULL; Mặc định '0' |
| `noon` | Liều buổi trưa | TEXT; Có thể NULL; Mặc định '0' |
| `afternoon` | Liều buổi chiều | TEXT; Có thể NULL; Mặc định '0' |
| `night` | Liều buổi tối | TEXT; Có thể NULL; Mặc định '0' |
| `instructions` | Dặn dò riêng cho dòng thuốc | TEXT; Có thể NULL |
| `unit_price` | Giá một đơn vị | REAL; Bắt buộc; Mặc định 0.00 |
| `amount` | Thành tiền của dòng | REAL; Bắt buộc; Mặc định 0.00 |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### payments

Hóa đơn và trạng thái thanh toán của lịch hẹn.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của payments | INTEGER; PK; tự tăng/duy nhất |
| `appointment_id` | Mã lịch hẹn appointments.id | INTEGER; Bắt buộc; UNIQUE; FK R28 → appointments.id |
| `invoice_code` | Mã hóa đơn duy nhất | TEXT; Bắt buộc; UNIQUE |
| `service_fee` | Tiền công khám/dịch vụ | REAL; Bắt buộc; Mặc định 0.00 |
| `medicine_fee` | Tiền thuốc trong đơn | REAL; Bắt buộc; Mặc định 0.00 |
| `discount` | Số tiền được giảm | REAL; Bắt buộc; Mặc định 0.00 |
| `total_amount` | Tổng tiền trước giảm giá | REAL; Bắt buộc; Mặc định 0.00 |
| `final_amount` | Số tiền cuối cùng phải thu | REAL; Bắt buộc; Mặc định 0.00 |
| `payment_method` | Cách trả: tiền mặt/chuyển khoản… | TEXT; Bắt buộc; Mặc định 'cash' |
| `payment_status` | Trạng thái chưa trả/đã trả | TEXT; Bắt buộc; Mặc định 'unpaid' |
| `paid_at` | Ngày giờ đã thanh toán | DATETIME; Có thể NULL |
| `cashier_user_id` | Tài khoản thu ngân ghi nhận thanh toán | INTEGER; Có thể NULL; FK R29 → users.id |
| `notes` | Ghi chú hóa đơn hiện dùng | TEXT; Có thể NULL |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |
| `note` | Ghi chú tương thích dữ liệu cũ | TEXT; Có thể NULL |

#### rooms

Phòng nội trú chứa các giường.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của rooms | INTEGER; PK; tự tăng/duy nhất |
| `room_number` | Mã phòng nội trú duy nhất | TEXT; Bắt buộc; UNIQUE |
| `room_name` | Tên phòng nội trú | TEXT; Bắt buộc |
| `department_name` | Tên khoa phụ trách | TEXT; Có thể NULL; Mặc định 'Khoa Nội' |
| `room_type` | Loại phòng, ví dụ inpatient hoặc ICU | TEXT; Có thể NULL; Mặc định 'inpatient' |
| `total_beds` | Số giường thiết kế của phòng | INTEGER; Có thể NULL; Mặc định 4 |
| `status` | Trạng thái hoạt động của phòng; mặc định active | TEXT; Có thể NULL; Mặc định 'active' |
| `created_at` | Thời điểm tạo bản ghi | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

#### beds

Giường thuộc phòng nội trú và tình trạng sử dụng hiện tại.

| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |
|---|---|---|
| `id` | Mã duy nhất của beds | INTEGER; PK; tự tăng/duy nhất |
| `room_id` | Mã phòng nội trú rooms.id | INTEGER; Bắt buộc; FK R11 → rooms.id |
| `bed_number` | Số giường trong phòng | TEXT; Bắt buộc |
| `status` | available=trống, occupied=đang nằm, cleaning=đang dọn, maintenance=bảo trì | TEXT; Bắt buộc; Mặc định 'available' |
| `current_patient_id` | Bệnh nhân đang nằm giường, nếu có | INTEGER; Có thể NULL; FK R10 → patients.id |
| `current_medical_record_id` | Bệnh án gắn lần nằm giường hiện tại | INTEGER; Có thể NULL; FK R09 → medical_records.id |
| `current_doctor_id` | Bác sĩ phụ trách giường hiện tại | INTEGER; Có thể NULL; FK R08 → doctors.id |
| `admission_date` | Ngày giờ nhận giường | DATETIME; Có thể NULL |
| `notes` | Ghi chú | TEXT; Có thể NULL |
| `updated_at` | Thời điểm cập nhật gần nhất | DATETIME; Có thể NULL; Mặc định CURRENT_TIMESTAMP |

## 41 dây nối khóa ngoại thật

Số đầu **bảng cha** cho biết một bản ghi con cần bao nhiêu cha; số đầu **bảng con** cho biết một cha có thể có bao nhiêu con. Số tối thiểu ở đầu bảng con là 0 vì FK/UNIQUE không bắt buộc phải có bản ghi con.

| Dây | Bảng cha → bảng con | Mỗi con có cha | Mỗi cha có con | Vì sao nối | Khi xóa cha |
|---|---|---|---|---|---|
| R01 | `users.id` → `activity_logs.user_id` | 0 hoặc 1 | 0 đến nhiều | Biết ai đã thao tác; xóa tài khoản vẫn giữ nhật ký. | SET NULL |
| R02 | `appointments.id` → `appointment_status_history.appointment_id` | Đúng 1 | 0 đến nhiều | Mọi lần đổi trạng thái phải thuộc một lịch hẹn. | CASCADE |
| R03 | `users.id` → `appointment_status_history.changed_by_user_id` | 0 hoặc 1 | 0 đến nhiều | Ghi ai đã đổi trạng thái, có thể là tác vụ hệ thống. | SET NULL |
| R04 | `doctors.id` → `appointments.doctor_id` | Đúng 1 | 0 đến nhiều | Lịch khám phải có bác sĩ phụ trách. | CASCADE |
| R05 | `patients.id` → `appointments.patient_id` | Đúng 1 | 0 đến nhiều | Lịch khám phải có bệnh nhân. | CASCADE |
| R06 | `services.id` → `appointments.service_id` | 0 hoặc 1 | 0 đến nhiều | Lưu dịch vụ được chọn nếu có. | SET NULL |
| R07 | `specialties.id` → `appointments.specialty_id` | 0 hoặc 1 | 0 đến nhiều | Lưu chuyên khoa đã chọn, có thể bỏ liên kết khi xóa danh mục. | SET NULL |
| R08 | `doctors.id` → `beds.current_doctor_id` | 0 hoặc 1 | 0 đến nhiều | Chỉ ra bác sĩ phụ trách giường hiện tại. | SET NULL |
| R09 | `medical_records.id` → `beds.current_medical_record_id` | 0 hoặc 1 | 0 đến nhiều | Chỉ ra bệnh án của đợt nằm giường hiện tại. | SET NULL |
| R10 | `patients.id` → `beds.current_patient_id` | 0 hoặc 1 | 0 đến nhiều | Chỉ ra bệnh nhân đang dùng giường; trống khi giường chưa được cấp. | SET NULL |
| R11 | `rooms.id` → `beds.room_id` | Đúng 1 | 0 đến nhiều | Mỗi giường phải nằm trong một phòng nội trú. | CASCADE |
| R12 | `users.id` → `contact_requests.user_id` | 0 hoặc 1 | 0 đến nhiều | Gắn lời nhắn với tài khoản khi người gửi đã đăng nhập; khách thì để trống. | SET NULL |
| R13 | `doctors.id` → `doctor_leaves.doctor_id` | Đúng 1 | 0 đến nhiều | Đơn nghỉ phép thuộc bác sĩ nào. | CASCADE |
| R14 | `doctors.id` → `doctor_schedules.doctor_id` | Đúng 1 | 0 đến nhiều | Ca trực thuộc bác sĩ nào. | CASCADE |
| R15 | `doctors.id` → `doctor_specialties.doctor_id` | Đúng 1 | 0 đến nhiều | Một đầu của quan hệ nhiều bác sĩ–nhiều chuyên khoa. | CASCADE |
| R16 | `specialties.id` → `doctor_specialties.specialty_id` | Đúng 1 | 0 đến nhiều | Đầu còn lại của quan hệ nhiều bác sĩ–nhiều chuyên khoa. | CASCADE |
| R17 | `users.id` → `doctors.user_id` | Đúng 1 | 0 hoặc 1 | Hồ sơ nghề nghiệp chỉ thuộc một tài khoản và user_id là duy nhất. | CASCADE |
| R18 | `appointments.id` → `examination_queues.appointment_id` | Đúng 1 | 0 hoặc 1 | Một lịch hẹn có tối đa một số thứ tự tiếp đón. | CASCADE |
| R19 | `doctors.id` → `favorite_doctors.doctor_id` | Đúng 1 | 0 đến nhiều | Bác sĩ nào được bệnh nhân lưu. | CASCADE |
| R20 | `patients.id` → `favorite_doctors.patient_id` | Đúng 1 | 0 đến nhiều | Bệnh nhân nào đã lưu mục yêu thích. | CASCADE |
| R21 | `appointments.id` → `medical_records.appointment_id` | Đúng 1 | 0 hoặc 1 | Một lịch khám có tối đa một bệnh án. | CASCADE |
| R22 | `beds.id` → `medical_records.bed_id` | 0 hoặc 1 | 0 đến nhiều | Khi nhập viện, bệnh án có thể được gán một giường. | NO ACTION |
| R23 | `doctors.id` → `medical_records.doctor_id` | Đúng 1 | 0 đến nhiều | Bác sĩ nào lập/chịu trách nhiệm bệnh án. | CASCADE |
| R24 | `medical_records.id` → `medical_records.parent_visit_id` | 0 hoặc 1 | 0 đến nhiều | Tái khám có thể nối đến bệnh án trước của chính bệnh nhân. | NO ACTION |
| R25 | `patients.id` → `medical_records.patient_id` | Đúng 1 | 0 đến nhiều | Bệnh án thuộc bệnh nhân nào để tìm lịch sử khám. | CASCADE |
| R26 | `users.id` → `notifications.user_id` | Đúng 1 | 0 đến nhiều | Thông báo được gửi cho đúng tài khoản nhận. | CASCADE |
| R27 | `users.id` → `patients.user_id` | Đúng 1 | 0 hoặc 1 | Hồ sơ y tế chỉ thuộc một tài khoản và user_id là duy nhất. | CASCADE |
| R28 | `appointments.id` → `payments.appointment_id` | Đúng 1 | 0 hoặc 1 | Một lịch hẹn có tối đa một hóa đơn. | CASCADE |
| R29 | `users.id` → `payments.cashier_user_id` | 0 hoặc 1 | 0 đến nhiều | Ghi tài khoản thu ngân khi hóa đơn được thu. | SET NULL |
| R30 | `medicines.id` → `prescription_items.medicine_id` | 0 hoặc 1 | 0 đến nhiều | Tùy chọn tham chiếu thuốc danh mục; dòng vẫn giữ tên/giá khi danh mục đổi. | SET NULL |
| R31 | `prescriptions.id` → `prescription_items.prescription_id` | Đúng 1 | 0 đến nhiều | Mỗi dòng thuốc phải nằm trong một đơn thuốc. | CASCADE |
| R32 | `appointments.id` → `prescriptions.appointment_id` | 0 hoặc 1 | 0 đến nhiều | Liên kết trực tiếp đơn với lịch hẹn để tra cứu/báo cáo. | CASCADE |
| R33 | `doctors.id` → `prescriptions.doctor_id` | 0 hoặc 1 | 0 đến nhiều | Bác sĩ kê đơn là ai. | CASCADE |
| R34 | `medical_records.id` → `prescriptions.medical_record_id` | Đúng 1 | 0 hoặc 1 | Một bệnh án có tối đa một đầu đơn thuốc. | CASCADE |
| R35 | `patients.id` → `prescriptions.patient_id` | 0 hoặc 1 | 0 đến nhiều | Bệnh nhân nhận đơn là ai. | CASCADE |
| R36 | `users.id` → `receptionists.user_id` | Đúng 1 | 0 hoặc 1 | Hồ sơ nhân viên chỉ thuộc một tài khoản và user_id là duy nhất. | CASCADE |
| R37 | `appointments.id` → `reviews.appointment_id` | 0 hoặc 1 | 0 hoặc 1 | Đánh giá gắn với lượt khám; mỗi lịch tối đa một đánh giá. | SET NULL |
| R38 | `doctors.id` → `reviews.doctor_id` | Đúng 1 | 0 đến nhiều | Bác sĩ nào được đánh giá. | CASCADE |
| R39 | `patients.id` → `reviews.patient_id` | Đúng 1 | 0 đến nhiều | Bệnh nhân nào gửi đánh giá. | CASCADE |
| R40 | `specialties.id` → `services.specialty_id` | 0 hoặc 1 | 0 đến nhiều | Dịch vụ thuộc chuyên khoa nào nếu đã phân loại. | SET NULL |
| R41 | `users.id` → `user_roles.user_id` | Đúng 1 | 0 đến nhiều | Mỗi role được cấp cho một tài khoản; nhiều dòng tạo nhiều vai trò. | CASCADE |

## Dây nghiệp vụ nét đứt (không phải FK)

- `roles.code` ⇢ `user_roles.role`: danh mục bốn mã role và role được cấp. SQLite hiện không tạo ràng buộc FK ở đây; ứng dụng dùng danh sách mã hợp lệ trong code.
- `roles.code` ⇢ `users.role`: vai trò chính/di sản để điều hướng và tương thích. Quyền thực của phiên được đối chiếu `user_roles` mỗi request.
- `activity_logs.entity_type` + `entity_id`: tham chiếu đa hình đến nhiều loại đối tượng; SQLite không thể vẽ một FK cố định.
- `articles.author_name`/`author_role` là văn bản tên tác giả, không trỏ `users`.

## Các chỗ dễ hiểu nhầm / còn cần cải thiện

- `patients.gender` mặc định `other`, nên dữ liệu cũ có thể dùng `other` cho người chưa khai báo; không thể suy ra giới tính thật từ giá trị đó.
- `user_roles.role` không có FK tới `roles.code` và nhiều cột trạng thái chưa có CHECK ở DB. Điều này được ghi đúng trên sơ đồ thay vì vẽ dây FK không tồn tại.
- `payments.note` và `payments.notes` cùng tồn tại để tương thích lịch sử; `doctor_schedules.is_active` là cờ cũ bên cạnh `status`. Không xóa cột cũ khi chưa migration dữ liệu.
- `medical_records.bed_id` trỏ giường được cấp cho bệnh án; `beds.current_medical_record_id` trỏ bệnh án đang chiếm giường. Đây là hai chiều lưu trạng thái khác nhau, tạo vòng tham chiếu; phải cập nhật nhất quán trong nghiệp vụ.
- Các bảng không đồng nghĩa với chức năng đã hoàn chỉnh: chưa có bảng cơ sở y tế/chi nhánh nên hiện không có FK phòng khám/bệnh viện như ảnh thiết kế tương lai.
