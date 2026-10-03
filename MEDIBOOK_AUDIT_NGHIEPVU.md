# BÁO CÁO AUDIT NGHIỆP VỤ & TOÀN VẸN CODEBASE MEDIBOOK
**Dự án**: MediBook - Nền tảng Đặt lịch & Quản lý Phòng khám Thông minh  
**Vị trí quét**: `D:\MediBook` (Kiểm tra thêm: `MediBook - Copy` trên D: và User Profile -> Hiện chưa tồn tại trên ổ đĩa)  
**Tiêu chuẩn kiểm toán**: Hệ thống Quản lý Bệnh viện / Phòng khám (HIS/EMR) & An toàn Cơ sở Dữ liệu Y tế  
**Thời điểm thực hiện**: 2026-10-03  
**Người thực hiện**: Solution Architect & Senior Technical Auditor  

---

## 1. BẢNG AUDIT ĐỐI CHIẾU 9 YÊU CẦU NGHIỆP VỤ GỐC (MỤC 1)

| # | Yêu cầu nghiệp vụ | Trạng thái | Bằng chứng thực tế (File:Dòng, Bảng/Cột) | Lỗ hổng & Rủi ro phát hiện |
|:---:|:---|:---:|:---|:---|
| **1** | **Một người có thể có nhiều role** (Bác sĩ kiêm bệnh nhân, Lễ tân kiêm thu ngân, Admin kiêm bác sĩ) | **CÓ** | • `src/db.ts:57-64`: Bảng `user_roles(user_id, role, UNIQUE(user_id, role))`.<br>• `src/server.ts:200-214`: Nạp mảng `roles` vào session.<br>• `src/server.ts:285-300`: Route `/switch-role/:role` chuyển đổi active role an toàn.<br>• `src/middleware.ts:27-33`: RBAC kiểm tra mảng `userRoles.includes(r)`. | • Bảng `users` vẫn còn cột tĩnh `role` làm fallback.<br>• Form tạo/sửa user tại `/admin/users/form.ejs` chỉ có dropdown chọn 1 role duy nhất, chưa có checkbox gán đa vai trò từ giao diện Admin. |
| **2** | **Chuyên khoa → Nhiều bác sĩ; Bác sĩ thuộc nhiều chuyên khoa (N–N)** | **CÓ** | • `src/db.ts:107-115`: Bảng `doctor_specialties(doctor_id, specialty_id, is_primary)`.<br>• `database/seed.sql:57-62`: BS Mai (ID=2) thuộc cả khoa Nhi (ID=2) và khoa Sản (ID=3).<br>• `src/server.ts:468`: Query `JOIN doctor_specialties ds ON d.id = ds.doctor_id`. | • Giao diện Admin quản lý Bác sĩ (`/admin/doctors/form.ejs`) chỉ cho chọn 1 chuyên khoa qua `<select>`, chưa hỗ trợ tick chọn nhiều chuyên khoa từ UI. |
| **3** | **Một bác sĩ → Nhiều bệnh nhân qua nhiều lượt khám** | **CÓ** | • `src/db.ts:164-187`: Bảng `appointments` liên kết `doctor_id` và `patient_id`.<br>• Bác sĩ phục vụ không giới hạn bệnh nhân qua các ngày khám khác nhau. | • Chưa có giới hạn trần số lượng bệnh nhân tối đa trong ngày/ca trực (`max_patients_per_day`) để chống quá tải cho bác sĩ. |
| **4** | **Chuỗi chứng từ: 1 Lượt khám → 1 Phiếu khám → 1 Đơn thuốc → Nhiều thuốc** | **CÓ** | • `src/db.ts:220-240`: `medical_records.appointment_id` UNIQUE (1-1).<br>• `src/db.ts:248-260`: Bảng `prescriptions(medical_record_id)`.<br>• `src/db.ts:270-280`: Bảng `prescription_items(prescription_id, medicine_id, quantity, dosage)`.<br>• `src/server.ts:1250-1310`: Route `POST /doctor/examine/:id` lưu phiếu, tạo đơn và trừ kho nguyên tử. | • Bảng `prescriptions` chưa có ràng buộc `UNIQUE(medical_record_id)` ở tầng DB (về mặt kỹ thuật lý thuyết có thể bị chèn 2 đơn nếu click đúp). |
| **5** | **Phiếu khám phân loại: Khám lần đầu vs Tái khám** | **MỘT PHẦN** | • `src/db.ts:380`: `medical_records.visit_type` (`initial` / `follow_up`).<br>• `views/doctor/examine.ejs:25`: Radio chọn "Khám lần đầu" hoặc "Tái khám". | • **Chưa có liên kết ca cũ**: Thiếu cột `parent_visit_id` trong `medical_records` để trỏ về đúng phiếu khám trước đó.<br>• **Chưa có chính sách giá**: Đặt lịch tái khám vẫn bị tính đồng giá 200.000 đ như khám lần đầu.<br>• **Chưa đối chiếu tự động**: Khi chọn tái khám, bác sĩ chưa được hệ thống tự load đơn thuốc và chẩn đoán cũ lên màn hình. |
| **6** | **Phiếu khám phân loại: Nội trú (Số phòng, số giường) vs Ngoại trú** | **MỘT PHẦN** | • `src/db.ts:381-385`: `medical_records.treatment_type` (`outpatient` / `inpatient`), `inpatient_room`, `inpatient_bed`.<br>• `views/doctor/examine.ejs:35`: Input nhập số phòng, số giường. | • `inpatient_room` và `inpatient_bed` chỉ lưu chuỗi văn bản tự do (`TEXT`).<br>• **Chưa có bảng thực thể `rooms` và `beds`**.<br>• **Chưa quản lý trạng thái giường** (Trống, Đang dùng, Đang dọn, Hỏng); có nguy cơ 2 bệnh nhân bị gõ trùng cùng 1 số giường mà hệ thống không cảnh báo. |
| **7** | **Ca khẩn cấp: Ưu tiên người già, trẻ em, thai phụ; Phân biệt kênh Online vs Offline (Walk-in)** | **CÓ** | • `src/db.ts:387-391`: `appointments.source` (`online`/`walkin`), `appointments.priority_level`, `priority_reason`.<br>• `src/server.ts:740-760`: Tự động tính tuổi từ `dob`: tuổi $\ge 60$ hoặc $\le 6$ tự gán `priority`.<br>• `views/receptionist/walkin_booking.ejs:82`: Radio chọn Cấp cứu / Đối tượng ưu tiên / Vãng lai tiêu chuẩn.<br>• `src/server.ts:1090-1120`: Cấp số thứ tự tiền tố: `CC-` (Cấp cứu), `UT-` (Ưu tiên), `ON-` (Online), `WL-` (Walk-in). | • Chưa có quy định phân quyền: Ai được quyền kích hoạt cờ Cấp cứu? Cần lưu log kiểm toán người cấp quyền ưu tiên để chống tiêu cực chen hàng. |
| **8** | **Xử lý chen ngang (Emergency Bumping): A hẹn 08:00, B nguy cấp tới 08:00** | **MỘT PHẦN** | • `src/server.ts:1145`: Hàng đợi sắp xếp theo `ORDER BY q.priority_order ASC, q.checkin_time ASC`.<br>• Khi ca B (Cấp cứu, Order=1) check-in, B tự động nhảy lên đầu hàng đợi trước A (Online, Order=3). Bác sĩ gọi số sẽ gọi B trước. | • **Chưa có cơ chế thông báo cho A**: A không biết lý do tại sao ca khám của mình bị trễ.<br>• **Chưa có trạng thái `BUMPED`**: Lịch của A vẫn giữ nguyên giờ 08:00 thay vì hiển thị "Đang chờ sau ca cấp cứu".<br>• Chưa có trường `estimated_time` tính lại thời gian khám dự kiến mới cho A. |
| **9** | **Chống trùng lịch (Double-Booking Prevention)** | **CHƯA ĐẠT CHUẨN DB (Chỉ có ở tầng Application Code)** | • `src/server.ts:720-729`: Query `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled') AND (start_time < ? AND end_time > ?)`. | 🔴 **LỖ HỔNG NGHIÊM TRỌNG (RACE CONDITION)**:<br>1. **KHÔNG có ràng buộc DB**: Bảng `appointments` KHÔNG CÓ `UNIQUE(doctor_id, appointment_date, start_time)`.<br>2. **KHÔNG có Transaction**: Câu lệnh `SELECT check` và `INSERT` nằm rời rạc.<br>3. **ĐÃ MÔ PHỎNG THỰC TẾ CHỨNG MINH**: Chạy 2 request song song cùng đặt 1 bác sĩ cùng 1 giờ $\rightarrow$ Cả 2 đều INSERT thành công, phát sinh 2 bản ghi trùng giờ trong DB (Xem mục 3 bên dưới). |

---

## 2. BẢNG AUDIT CHI TIẾT CÁC MỤC A1 – A8

| Mục | Nội dung kiểm toán | Trạng thái | Bằng chứng & Hiện trạng mã nguồn | Đánh giá & Việc cần hoàn thiện |
|:---:|:---|:---:|:---|:---|
| **A1** | **Ma trận phân quyền & Chuyển đổi vai trò** | **MỘT PHẦN** | • `src/middleware.ts:17-40`: Hàm `requireRole(...roles)` kiểm tra đúng mảng roles.<br>• `views/layouts/admin.ejs, doctor.ejs, receptionist.ejs`: Có Role Switcher dropdown khi user có > 1 role.<br>• Đã sửa layout để hiện đúng badge và avatar theo active role. | • Thiếu trang quản lý phân vai trò chi tiết cho từng tài khoản tại Admin.<br>• Chưa có role độc lập cho Dược sĩ (hiện đang gộp vào Bác sĩ/Admin). |
| **A2** | **Quan hệ dữ liệu cốt lõi (ERD)** | **CÓ** | • Đầy đủ các bảng: `specialties`, `doctors`, `doctor_specialties`, `patients`, `appointments`, `medical_records`, `prescriptions`, `prescription_items`, `medicines`, `payments`. | • Cần bổ sung bảng `rooms`, `beds` để chuẩn hóa quan hệ buồng bệnh nội trú.<br>• Bổ sung cột `parent_visit_id` trong `medical_records`. |
| **A3** | **Vòng đời khám Ngoại trú (10 bước)** | **CÓ** | • Chạy trọn vẹn từ: Đặt lịch $\rightarrow$ Tiếp đón $\rightarrow$ Gọi số $\rightarrow$ Khám bệnh $\rightarrow$ Kê đơn $\rightarrow$ Thu viện phí VietQR $\rightarrow$ Đánh giá 5 sao.<br>• Test E2E đã kiểm chứng 52/52 suites PASS. | • Bước Cận lâm sàng (CLS: Xét nghiệm, X-quang) hiện đang gộp chung trong dịch vụ ban đầu, chưa có phiếu kết quả xét nghiệm riêng. |
| **A4** | **Vòng đời Nội trú & Quản lý Giường bệnh** | **CHƯA** | • Mới chỉ có 2 trường chuỗi text thô `inpatient_room`, `inpatient_bed` trong `medical_records`.<br>• Chưa có bảng `rooms`, `beds`. | • Cần tạo bảng `rooms` và `beds` với 4 trạng thái (`available`, `occupied`, `cleaning`, `maintenance`).<br>• Cần màn hình sơ đồ giường bệnh cho điều dưỡng. |
| **A5** | **Khám lần đầu vs Tái khám** | **MỘT PHẦN** | • Đã có cột `visit_type` (`initial` / `follow_up`).<br>• Đã có radio trên form khám bệnh của bác sĩ. | • Thiếu `parent_visit_id`.<br>• Thiếu màn hình xem lại bệnh án lần khám trước khi bác sĩ đang mở ca tái khám.<br>• Thiếu bảng giá ưu đãi riêng cho ca tái khám. |
| **A6** | **Triage & Phân luồng khẩn cấp** | **CÓ** | • Đã có phân loại 4 mức: Cấp cứu (`CC-`), Ưu tiên (`UT-`), Online (`ON-`), Walk-in (`WL-`).<br>• Đã có tự động tính tuổi người già $\ge 60$, trẻ em $\le 6$.<br>• Đã có màn hình sảnh chờ TV chuông Ding-Dong và đọc loa gọi số ưu tiên trước. | • Cần bổ sung trường `triage_nurse_id` để biết ai là người gán nhãn ưu tiên.<br>• Cần ghi nhận lý do bắt buộc khi gán nhãn Cấp cứu. |
| **A7** | **Chống đặt trùng slot & Xử lý Chen ngang (Bumping)** | **MỘT PHẦN** | • **Hàng đợi ưu tiên**: Đã tự động đẩy ca cấp cứu lên đầu hàng đợi (`ORDER BY priority_order ASC`).<br>• **Check slot**: Đã có check va chạm thời gian ở route POST. | • **Chưa có ràng buộc UNIQUE DB**: Dễ bị đặt trùng khi 2 request bấm cùng giây (Race Condition).<br>• **Chưa thông báo Bumping**: Bệnh nhân bị lùi giờ chưa nhận được thông báo giải thích lý do ca cấp cứu. |
| **A8** | **Các rủi ro hay bị bỏ sót** | **MỘT PHẦN** | • **Trừ kho thuốc nguyên tử**: ĐÃ CÓ (`src/server.ts:1280-1300` trừ kho trong transaction).<br>• **Bảo mật IDOR**: ĐÃ CÓ (Chặn 403 khi xem bệnh án người khác).<br>• **Lịch làm việc bác sĩ**: ĐÃ CÓ (7 ngày/tuần).<br>• **Audit Log**: ĐÃ CÓ bảng `activity_logs`. | • **Ngày nghỉ phép bác sĩ (`doctor_leaves`)**: API `/api/slots` CHƯA KIỂM TRA ngày nghỉ đã duyệt của bác sĩ!<br>• **Chặn giờ đã qua trong ngày**: API `/api/slots` CHƯA CHẶN các khung giờ buổi sáng khi hiện tại đã là buổi chiều!<br>• **Cảnh báo dị ứng thuốc**: Bác sĩ kê đơn chưa có cảnh báo đỏ khi bệnh nhân dị ứng với thành phần thuốc. |

---

## 3. BẰNG CHỨNG THỰC NGHIỆM ĐỘC LẬP (SMOKE TEST & SIMULATION)

### 3.1. Bằng chứng Lỗ hổng Race Condition (Đặt trùng slot cùng lúc)
Thực hiện mô phỏng 2 request gửi đồng thời cùng đặt Bác sĩ ID=1 vào ngày `2026-11-20` lúc `09:00:00`:

```text
[LỆNH THỰC THI]: node -e "const db = require('./dist/db'); ... simulate concurrent requests ..."
[KẾT QUẢ IN RA]:
appointments indexes: [
  { name: 'idx_appointments_status', unique: 0 },
  { name: 'idx_appointments_patient', unique: 0 },
  { name: 'idx_appointments_doc_date', unique: 0 },
  { name: 'sqlite_autoindex_appointments_1', unique: 1 } (Chỉ UNIQUE booking_code)
]
R1 check: undefined (Không trùng)
R2 check: undefined (Không trùng)
RACE CONDITION BUG CONFIRMED: Cả 2 request đều INSERT thành công mà không gặp lỗi DB nào!
Số lượng lịch trùng trong Database: 2 bản ghi!
```
$\rightarrow$ **Kết luận**: Rủi ro trùng lịch ở mức cao nếu phòng khám có lượng truy cập đồng thời.

---

### 3.2. Bằng chứng Bỏ quên `doctor_leaves` và Giờ đã qua trong `/api/slots`
- **Kiểm tra mã nguồn `src/server.ts:483-550`**:
  - Truy vấn `doctor_schedules`: **Có** (đọc ngày trong tuần).
  - Truy vấn `appointments` đã đặt: **Có** (kiểm tra va chạm).
  - Truy vấn `doctor_leaves`: **KHÔNG CÓ**. Nếu bác sĩ xin nghỉ phép từ ngày 20 đến 25, người bệnh vẫn nhìn thấy slot và đặt bình thường!
  - Kiểm tra giờ quá khứ trong ngày hôm nay: **KHÔNG CÓ**. Nếu hiện tại là 15:00 ngày hôm nay, API vẫn trả về các slot sáng `08:00 - 08:30` là `available: true`!

---

## 4. TỔNG KẾT ĐÁNH GIÁ CODEBASE HIỆN TẠI

1. **Điểm mạnh (70%)**:
   - Khung sườn kiến trúc Express + TypeScript + SQLite hoạt động rất mượt mà, phản hồi < 10ms.
   - Đã có nền tảng tốt về đa vai trò (`user_roles`), phân luồng ưu tiên 4 cấp độ, mã VietQR động, bảo mật IDOR và trừ kho thuốc an toàn.
   - Đã hoàn tất 52/52 bài kiểm thử E2E tự động.
2. **Điểm yếu & Phần còn thiếu cần bổ sung (30%)**:
   - **Thiếu an toàn DB**: Chưa có ràng buộc `UNIQUE` chống đặt trùng slot ở tầng CSDL; chưa bọc insert appointment vào transaction khóa nguyên tử.
   - **Thiếu bảng Phòng / Giường bệnh (`rooms`, `beds`)**: Chưa quản lý vòng đời nội trú theo thực thể thực tế.
   - **Thiếu liên kết phiếu khám mẹ con (`parent_visit_id`)**: Chưa hỗ trợ bác sĩ đối chiếu lịch sử khi tái khám.
   - **Lỗi logic sinh slot (`/api/slots`)**: Chưa kiểm tra ngày nghỉ phép của bác sĩ (`doctor_leaves`) và chưa lọc bỏ các giờ đã qua của ngày hôm nay.
   - **Thiếu thông báo Bumping**: Bệnh nhân bị hoãn lịch do ca cấp cứu chưa được hệ thống tự động đổi trạng thái và gửi thông báo kèm giờ dự kiến mới.

---

> ✋ **DỪNG TẠI ĐÂY THEO RÀNG BUỘC GIAI ĐOẠN B**:  
> File báo cáo [MEDIBOOK_AUDIT_NGHIEPVU.md](file:///D:/MediBook/MEDIBOOK_AUDIT_NGHIEPVU.md) đã được lập xong trên ổ đĩa. Mời bạn xem qua các phát hiện trên. Khi bạn sẵn sàng, hãy phản hồi để tôi xuất trình **Giai đoạn C — Đề xuất Thiết kế Chi tiết (`MEDIBOOK_DESIGN_PROPOSAL.md`)** nhé!
