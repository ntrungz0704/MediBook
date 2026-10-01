# MediBook - Sơ đồ Quan hệ Thực thể & Thiết kế Cơ sở Dữ liệu (ERD)

## 1. Chuẩn hóa & Khắc phục Lỗi Kiến trúc theo Yêu cầu Thực tế

Bản vẽ đã hoàn thiện và đáp ứng đầy đủ các yêu cầu cốt lõi của hội đồng và giảng viên:
1. **Cơ chế 1 Người Có Nhiều Role (Multi-Role Support)**:
   - Thêm danh mục chuẩn `roles (code PK, name, description)`.
   - Thêm bảng liên kết N-N `user_roles (user_id, role, assigned_at)` với ràng buộc `UNIQUE(user_id, role)`.
   - Một người dùng có thể đồng thời sở hữu nhiều vai trò (ví dụ: vừa là Bác sĩ vừa là Bệnh nhân, hoặc Quản trị viên kiêm Bác sĩ) và chuyển đổi giao diện làm việc linh hoạt (`/switch-role/:role`).
2. **Chuỗi Nghiệp vụ Lâm sàng (Clinical Domain Chain)**:
   - **Chuyên khoa (Specialties)** &rarr; nhiều **Bác sĩ (Doctors)** qua bảng `doctor_specialties`.
   - 1 **Bác sĩ** tiếp nhận khám nhiều **Bệnh nhân (Patients)** qua các lượt khám `appointments`.
   - 1 Lượt khám sinh ra duy nhất 1 **Phiếu khám / Bệnh án điện tử (medical_records)** (`appointment_id UNIQUE`).
   - 1 Phiếu khám sinh ra 1 **Đơn thuốc điện tử (prescriptions)** (`medical_record_id UNIQUE`).
   - 1 Đơn thuốc bao gồm nhiều **Khoản thuốc (prescription_items)** &rarr; liên kết danh mục kho thuốc **medicines**.
3. **Phân loại Phiếu khám & Điều trị Nội trú / Ngoại trú**:
   - `visit_type`: **Lần đầu khám** (`initial`) vs **Tái khám** (`follow_up`).
   - `treatment_type`: **Điều trị Ngoại trú** (`outpatient` - kê đơn về nhà) vs **Nhập viện Nội trú** (`inpatient`).
   - Quản lý buồng bệnh nội trú: `inpatient_room` (Số phòng), `inpatient_bed` (Số giường), `admission_date` (Ngày vào viện), `discharge_date` (Ngày xuất viện).
4. **Phân Luồng Ưu Tiên Hàng Đợi (Triage Queue Priority)**:
   - Thứ tự ưu tiên khám bệnh: **Khẩn cấp &rarr; Người già, Trẻ em, Thai phụ &rarr; Đặt hẹn Online &rarr; Vãng lai tại quầy (Offline)**.
   - Mức 1 (`emergency`): Cấp cứu nguy kịch &rarr; Mã STT tiền tố `CC-xx`, `priority_order = 1` (Gọi số đầu tiên, ưu tiên tuyệt đối).
   - Mức 2 (`priority`): Người cao tuổi (≥60t), Trẻ em (≤6t), Phụ nữ mang thai &rarr; Mã STT tiền tố `UT-xx`, `priority_order = 2`.
   - Mức 3 (`online`): Đặt lịch trước qua mạng &rarr; `priority_order = 3`.
   - Mức 4 (`walkin`): Khách vãng lai đăng ký tại quầy &rarr; `priority_order = 4`.
5. **Đồng bộ Tài chính & Viện phí**:
   - `payments`: Tự động tính toán minh bạch `service_fee + medicine_fee - discount = final_amount`.
   - Snapshot giá thuốc `prescription_items.unit_price` cố định tại thời điểm kê đơn.

---

## 2. Sơ đồ Thực thể ERD (Mermaid Diagram)

```mermaid
erDiagram
    roles ||--o{ user_roles : "danh mục vai trò"
    users ||--o{ user_roles : "1 người có nhiều vai trò (1 - 1..N)"
    
    users ||--o| patients : "hồ sơ bệnh nhân (1 - 0..1)"
    users ||--o| doctors : "hồ sơ bác sĩ (1 - 0..1)"
    users ||--o{ activity_logs : "nhật ký kiểm toán (1 - 0..N)"

    specialties ||--o{ doctor_specialties : "thuộc chuyên khoa"
    doctors ||--o{ doctor_specialties : "phụ trách chuyên khoa (1 - 1..N)"
    specialties ||--o{ services : "cung cấp dịch vụ y tế"

    doctors ||--o{ doctor_schedules : "lịch trực tuần (1 - 0..N)"
    doctors ||--o{ doctor_leaves : "đơn xin nghỉ phép (1 - 0..N)"

    patients ||--o{ favorite_doctors : "bác sĩ yêu thích (1 - 0..N)"
    doctors ||--o{ favorite_doctors : "được yêu thích"

    patients ||--o{ appointments : "đặt lịch khám (1 - 0..N)"
    doctors ||--o{ appointments : "phụ trách khám (1 - 0..N)"
    specialties ||--o{ appointments : "khám tại chuyên khoa"
    services ||--o{ appointments : "gói dịch vụ lựa chọn"

    appointments ||--o| examination_queues : "phân luồng cấp STT (1 - 0..1)"
    appointments ||--o| payments : "hóa đơn viện phí (1 - 0..1)"
    appointments ||--o| medical_records : "1 lượt khám sinh 1 phiếu khám (1 - 0..1)"
    appointments ||--o| reviews : "đánh giá chất lượng (1 - 0..1)"

    medical_records ||--o| prescriptions : "1 phiếu khám sinh 1 đơn thuốc (1 - 0..1)"
    prescriptions ||--|{ prescription_items : "gồm nhiều khoản thuốc (1 - 1..N)"
    medicines ||--o{ prescription_items : "danh mục kho thuốc phòng khám"

    roles {
        string code PK "admin | doctor | receptionist | patient"
        string name "Tên vai trò hiển thị"
        string description "Mô tả quyền hạn"
    }

    user_roles {
        int id PK
        int user_id FK
        string role FK "Tham chiếu roles.code"
        datetime assigned_at
    }

    users {
        int id PK
        string role "Vai trò mặc định"
        string name "Họ và tên"
        string email UK "Email đăng nhập"
        string password_hash
        string phone
        string status "active | inactive"
        datetime created_at
    }

    patients {
        int id PK
        int user_id FK "UNIQUE, NULLABLE nếu khách vãng lai"
        string priority_category "normal | elderly | child | pregnant | emergency"
        string full_name
        string phone
        string dob "Ngày sinh"
        string gender "male | female | other"
        string health_insurance_no "Số thẻ BHYT"
        string address
    }

    doctors {
        int id PK
        int user_id FK "UNIQUE"
        string title "Bác sĩ | ThS.BS | BSCKI | PGS.TS"
        int experience_years
        int consultation_fee "VNĐ"
        real rating "1.0 - 5.0"
        int rating_count
        string room_number "Số phòng khám (VD: P.101)"
    }

    specialties {
        int id PK
        string name "Tên chuyên khoa"
        string slug UK
        string description
        string icon
    }

    doctor_specialties {
        int id PK
        int doctor_id FK
        int specialty_id FK
        int is_primary "1: Chính, 0: Phụ"
    }

    appointments {
        int id PK
        string booking_code UK "Mã đặt lịch MBxxxx"
        int patient_id FK
        int doctor_id FK
        int specialty_id FK
        int service_id FK
        string appointment_date "YYYY-MM-DD"
        string start_time "HH:mm:ss"
        string end_time "HH:mm:ss"
        string status "pending | confirmed | checked_in | in_consultation | completed | cancelled"
        string source "online | walkin"
        string priority_level "emergency | priority | online | walkin"
        string priority_reason "Lý do ưu tiên tiếp đón"
        string symptoms "Triệu chứng ban đầu"
        datetime created_at
    }

    examination_queues {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        string queue_number "Mã gọi số (CC-01, UT-02, P101-03)"
        string room "Phòng khám"
        string status "waiting | calling | in_room | completed | skipped"
        string priority_level "emergency | priority | online | walkin"
        int priority_order "1: Cấp cứu, 2: Ưu tiên, 3: Online, 4: Vãng lai"
        datetime checkin_time
        datetime called_time
    }

    medical_records {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        int patient_id FK
        int doctor_id FK
        string visit_type "initial: Khám lần đầu | follow_up: Tái khám"
        string treatment_type "outpatient: Ngoại trú | inpatient: Nội trú"
        string inpatient_room "Số phòng điều trị nội trú"
        string inpatient_bed "Số giường điều trị nội trú"
        string admission_date "Ngày nhập viện"
        string discharge_date "Ngày xuất viện"
        string vital_signs "JSON: HA, Mạch, Nhiệt độ, BMI"
        string anamnesis "Bệnh sử & Khám thực thể"
        string clinical_diagnosis "Chẩn đoán lâm sàng"
        string icd10_code "Mã bệnh ICD-10"
        string doctor_notes "Lời dặn của bác sĩ"
        string re_examination_date "Ngày hẹn tái khám"
        datetime created_at
    }

    prescriptions {
        int id PK
        int medical_record_id FK "UNIQUE (1 - 0..1)"
        int appointment_id FK
        int doctor_id FK
        int patient_id FK
        int total_amount "Tổng tiền thuốc (VNĐ)"
        string usage_instructions "Lưu ý chung của toa thuốc"
        datetime created_at
    }

    prescription_items {
        int id PK
        int prescription_id FK
        int medicine_id FK
        string medicine_name "Tên thuốc"
        string dosage "Liều dùng (VD: 500mg)"
        string unit "Đơn vị (Viên, Chai, Gói)"
        int quantity "Số lượng cấp"
        string morning "Liều Sáng"
        string noon "Liều Trưa"
        string afternoon "Liều Chiều"
        string night "Liều Tối"
        int unit_price "Snapshot giá thuốc tại thời điểm kê (VNĐ)"
        int amount "quantity * unit_price"
        string instructions "Cách dùng chi tiết"
    }

    medicines {
        int id PK
        string code UK "Mã thuốc"
        string name "Tên biệt dược / hoạt chất"
        string unit "Đơn vị tính"
        int unit_price "Đơn giá danh mục (VNĐ)"
        int stock_quantity "Tồn kho khả dụng"
        string status "active | inactive"
    }

    payments {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        string invoice_code UK "Mã hóa đơn HDxxxx"
        int service_fee "Phí khám & dịch vụ (VNĐ)"
        int medicine_fee "Tiền thuốc theo đơn (VNĐ)"
        int discount "Miễn giảm / BHYT (VNĐ)"
        int final_amount "Tổng thanh toán cuối cùng (VNĐ)"
        string payment_method "cash | vnpay | transfer | card"
        string payment_status "unpaid | paid | refunded"
        datetime paid_at
        int cashier_user_id FK "Lễ tân thu tiền"
    }

    reviews {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        int patient_id FK
        int doctor_id FK
        int rating "1 đến 5 sao"
        string comment "Nhận xét của bệnh nhân"
        datetime created_at
    }

    activity_logs {
        int id PK
        int user_id FK "NULLABLE"
        string action "Hành động thực hiện"
        string entity_type "Bảng bị tác động"
        int entity_id
        string ip_address
        string details "Chi tiết thao tác"
        datetime created_at
    }
```

---

## 3. Đặc tả Chi tiết các Bảng Mới & Các Trường Mở Rộng

### 3.1. Bảng `roles` & `user_roles` (Hỗ trợ 1 Người Có Nhiều Role)
- **`roles`**: Danh mục 4 vai trò chuẩn (`admin`, `doctor`, `receptionist`, `patient`).
- **`user_roles`**: Cho phép 1 tài khoản `users.id` liên kết với nhiều `role`. Khi đăng nhập, session lưu mảng `roles: ['admin', 'doctor']` và `active_role`. Người dùng có thể chuyển đổi vai trò tức thì qua route `/switch-role/:role`.

### 3.2. Bảng `medical_records` (Phiếu khám Lâm sàng & Nội trú)
- `visit_type`:
  - `'initial'`: Bệnh nhân khám lần đầu tại phòng khám.
  - `'follow_up'`: Khám lại theo lịch hẹn tái khám của bác sĩ.
- `treatment_type`:
  - `'outpatient'`: Khám ngoại trú, kê đơn thuốc về nhà tự điều trị.
  - `'inpatient'`: Chỉ định nhập viện điều trị nội trú.
- Thông tin buồng bệnh nội trú:
  - `inpatient_room`: Số phòng bệnh (ví dụ: `Phòng 402 - Khoa Tim Mạch`).
  - `inpatient_bed`: Số giường bệnh (ví dụ: `Giường C-12`).
  - `admission_date`: Ngày giờ nhập viện điều trị.
  - `discharge_date`: Ngày dự kiến hoặc thực tế xuất viện.
- Mối quan hệ kê toa:
  - **1 Phiếu khám &rarr; 1 Đơn thuốc điện tử** (`prescriptions.medical_record_id UNIQUE`).
  - **1 Đơn thuốc &rarr; Nhiều thuốc** (`prescription_items` liên kết `medicines`).

### 3.3. Bảng `examination_queues` & `appointments` (Phân Luồng Ưu Tiên Khám)
- Thuật toán sắp xếp thứ tự gọi số phòng khám:
  ```sql
  ORDER BY 
    CASE 
      WHEN status = 'calling' THEN 0 
      WHEN status = 'in_room' THEN 1 
      WHEN status = 'waiting' THEN 2 
      ELSE 3 
    END,
    priority_order ASC,
    id ASC
  ```
- Các cấp độ ưu tiên (`priority_order`):
  1. `priority_order = 1` (`priority_level = 'emergency'`): Trường hợp cấp cứu, sốc phản vệ, khó thở cấp. Mã số `CC-xx`. Gọi loa đầu tiên.
  2. `priority_order = 2` (`priority_level = 'priority'`): Đối tượng ưu tiên theo luật y tế: Người già ≥ 60 tuổi, Trẻ em ≤ 6 tuổi, Phụ nữ có thai. Mã số `UT-xx`.
  3. `priority_order = 3` (`priority_level = 'online'`): Bệnh nhân đặt lịch hẹn trước qua website. Mã số `Pxxx-xx`.
  4. `priority_order = 4` (`priority_level = 'walkin'`): Bệnh nhân vãng lai bốc số trực tiếp tại sảnh tiếp đón.
