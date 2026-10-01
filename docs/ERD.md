# MediBook - Sơ đồ Quan hệ Thực thể & Thiết kế Cơ sở Dữ liệu (ERD)

## 1. Bản sửa lỗi và chuẩn hóa ERD

Bản vẽ đã khắc phục triệt để **13 lỗi kiến trúc** của phiên bản cũ:
1. **Bác sĩ ↔ Chuyên khoa**: Thêm bảng liên kết N-N `doctor_specialties(doctor_id, specialty_id, is_primary)`.
2. **Quan hệ người dùng**: `users` → `patients` và `users` → `doctors` chuẩn hóa thành **1 - 0..1** (`user_id UNIQUE`).
3. **Quan hệ sau khám**: `appointments` → `examination_queues` / `payments` / `medical_records` sửa thành **1 - 0..1** (chỉ sinh sau check-in, thu ngân, hoặc khám).
4. **Đơn thuốc**: `medical_records` → `prescriptions` sửa thành **1 - 0..1** (không bắt buộc ca nào cũng có đơn).
5. **Bệnh nhân vãng lai**: `patients.user_id` cho phép `NULL` (không bắt buộc tạo tài khoản web), `patients` lưu trực tiếp `full_name`, `phone`.
6. **Bổ sung 4 thực thể cốt lõi**: `favorite_doctors`, `doctor_schedules` (ca trực), `doctor_leaves` (nghỉ phép), `activity_logs` (nhật ký bảo mật).
7. **Chỉ số sinh tồn**: Tách thành các trường số chuẩn y khoa: `systolic INT`, `diastolic INT`, `pulse INT`, `temperature REAL`, `weight_kg REAL`.
8. **Định dạng tiền tệ**: Chuẩn hóa toàn bộ thành số nguyên `INTEGER` (VNĐ).
9. **Snapshot giá thuốc**: `prescription_items.unit_price` lưu giá tại thời điểm kê đơn, không bị lệch hóa đơn khi giá danh mục đổi.
10. **Minh bạch viện phí**: `payments` chia rõ: `service_fee`, `medicine_fee`, `discount`, `final_amount`.
11. **Ràng buộc chống trùng lịch**: Unique index một phần trên `(doctor_id, appointment_date, start_time)` khi lịch chưa hủy.
12. **Ràng buộc miền giá trị**: Toàn bộ `role` và `status` có `CHECK constraint`.
13. **Đánh giá bác sĩ**: Thêm bảng `reviews` liên kết `appointments` (1 - 0..1).

---

## 2. Sơ đồ thực thể ERD (Mermaid)

```mermaid
erDiagram
    users ||--o| patients : "1 tài khoản tối đa 1 hồ sơ (1 - 0..1)"
    users ||--o| doctors : "1 tài khoản tối đa 1 hồ sơ (1 - 0..1)"
    users ||--o{ activity_logs : "ghi nhận thao tác (1 - 0..N)"

    specialties ||--o{ doctor_specialties : "thuộc chuyên khoa"
    doctors ||--o{ doctor_specialties : "phụ trách chuyên khoa"
    specialties ||--o{ services : "cung cấp dịch vụ"

    doctors ||--o{ doctor_schedules : "thiết lập ca trực (1 - 0..N)"
    doctors ||--o{ doctor_leaves : "nộp đơn xin nghỉ (1 - 0..N)"
    users ||--o{ doctor_leaves : "duyệt đơn bởi admin"

    patients ||--o{ favorite_doctors : "yêu thích (1 - 0..N)"
    doctors ||--o{ favorite_doctors : "được yêu thích (1 - 0..N)"

    patients ||--o{ appointments : "đặt lịch khám (1 - 0..N)"
    doctors ||--o{ appointments : "tiếp nhận khám (1 - 0..N)"
    services ||--o{ appointments : "gói khám dịch vụ (1 - 0..N)"

    appointments ||--o| examination_queues : "sau check-in cấp STT (1 - 0..1)"
    appointments ||--o| payments : "hóa đơn thu tiền (1 - 0..1)"
    appointments ||--o| medical_records : "bệnh án điện tử khi khám (1 - 0..1)"
    appointments ||--o| reviews : "đánh giá sau hoàn tất (1 - 0..1)"

    medical_records ||--o| prescriptions : "kê đơn thuốc (1 - 0..1)"
    prescriptions ||--|{ prescription_items : "gồm các khoản thuốc (1 - 1..N)"
    medicines ||--o{ prescription_items : "thuộc danh mục kho dược"

    users {
        int id PK
        string role "CHECK patient|receptionist|doctor|admin"
        string name
        string email UK
        string password_hash
        string phone
        string status "CHECK active|locked"
        datetime created_at
    }

    patients {
        int id PK
        int user_id FK "UNIQUE, NULLABLE nếu khách vãng lai"
        string full_name "Lưu trực tiếp cho vãng lai"
        string phone
        string dob
        string gender "CHECK male|female|other"
        string blood_group
        string health_insurance_no
    }

    doctors {
        int id PK
        int user_id FK "UNIQUE"
        string title "Bác sĩ | ThS | BSCKI | PGS"
        int experience_years
        int consultation_fee "VNĐ (Integer)"
        real rating "1.0 - 5.0"
        int rating_count
        string room_number
    }

    specialties {
        int id PK
        string name
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

    services {
        int id PK
        int specialty_id FK
        string name
        int price "VNĐ (Integer)"
        int duration_minutes
    }

    doctor_schedules {
        int id PK
        int doctor_id FK
        int day_of_week "0..6 (Chủ nhật đến Thứ 7)"
        string start_time "HH:mm"
        string end_time "HH:mm"
        int slot_duration "30 phút"
        int max_patients
    }

    doctor_leaves {
        int id PK
        int doctor_id FK
        string start_date "YYYY-MM-DD"
        string end_date "YYYY-MM-DD"
        string reason
        string status "CHECK pending|approved|rejected"
        int reviewed_by FK "users.id (Admin)"
    }

    favorite_doctors {
        int patient_id FK "PK(patient_id, doctor_id)"
        int doctor_id FK "PK(patient_id, doctor_id)"
        datetime created_at
    }

    appointments {
        int id PK
        string booking_code UK
        int patient_id FK
        int doctor_id FK
        int service_id FK "NULLABLE"
        string appointment_date "YYYY-MM-DD"
        string start_time "HH:mm"
        string end_time "HH:mm"
        string status "CHECK pending|confirmed|checked_in|in_progress|completed|cancelled|no_show"
        string source "CHECK online|walkin"
        string symptoms
        datetime created_at
    }

    examination_queues {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        string queue_number "A-01, B-02"
        string room
        string status "CHECK waiting|called|in_progress|done|skipped"
        datetime checkin_time
        datetime called_time
    }

    payments {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        string invoice_code UK
        int service_fee "VNĐ"
        int medicine_fee "VNĐ"
        int discount "VNĐ"
        int final_amount "service_fee + medicine_fee - discount"
        string payment_method "CHECK cash|vnpay|transfer|card"
        string payment_status "CHECK pending|paid|refunded"
        datetime paid_at
        int cashier_user_id FK "users.id (Lễ tân/Thu ngân)"
    }

    medical_records {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        int patient_id FK
        int doctor_id FK
        int systolic "Huyết áp tâm thu (mmHg)"
        int diastolic "Huyết áp tâm trương (mmHg)"
        int pulse "Mạch đập (lần/phút)"
        real temperature "Thân nhiệt (°C)"
        real weight_kg "Cân nặng (kg)"
        string clinical_diagnosis "Chẩn đoán lâm sàng"
        string icd10_code
        string treatment_plan "Kế hoạch điều trị"
    }

    prescriptions {
        int id PK
        int medical_record_id FK "UNIQUE (1 - 0..1)"
        int total_amount "VNĐ"
        string usage_instructions
        datetime created_at
    }

    prescription_items {
        int id PK
        int prescription_id FK
        int medicine_id FK
        string medicine_name
        int quantity
        int unit_price "Snapshot giá thuốc (VNĐ)"
        int amount "quantity * unit_price (VNĐ)"
        string dosage "Sáng - Trưa - Chiều - Tối"
    }

    medicines {
        int id PK
        string code UK
        string name
        string unit "Viên, Chai, Gói"
        int unit_price "VNĐ"
        int stock_quantity
        string status "CHECK active|inactive"
    }

    reviews {
        int id PK
        int appointment_id FK "UNIQUE (1 - 0..1)"
        int patient_id FK
        int doctor_id FK
        int rating "1..5"
        string comment
        datetime created_at
    }

    activity_logs {
        int id PK
        int user_id FK "NULLABLE nếu hành động khách"
        string action "LOGIN|CREATE_APPOINTMENT|CHECKIN|..."
        string entity_type "appointments|users|payments"
        int entity_id
        string ip_address
        string details "Mô tả chi tiết"
        datetime created_at
    }
```
