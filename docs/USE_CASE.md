# MediBook - Tài liệu Use Case & Đặc tả Luồng Tương tác Nghiệp vụ (USE_CASE)

## 1. Bản Cập nhật & Đặc tả Nghiệp vụ Theo Yêu cầu Hội đồng & Giảng viên

Tài liệu Use Case này đã được chuẩn hóa và nâng cấp toàn diện để phản ánh chính xác 100% các yêu cầu nghiệp vụ thực tế của bệnh viện / phòng khám:
1. **Một người có nhiều vai trò (Multi-Role User)**:
   - Một người dùng (`User`) có thể sở hữu đồng thời nhiều vai trò: Quản trị viên (`Admin`), Bác sĩ (`Doctor`), Lễ tân (`Receptionist`), Bệnh nhân (`Patient`).
   - Tác tử `User` có thể thực hiện Use Case **`Chuyển đổi vai trò làm việc linh hoạt (Switch Role)`** mà không cần đăng xuất.
   - Quản trị viên thực hiện Use Case **`Phân quyền đa vai trò cho người dùng (Multi-role Assignment)`**.
2. **Chuỗi Nghiệp vụ Khám chữa bệnh Lâm sàng (Clinical Chain)**:
   - **Chuyên khoa (Specialty)** có nhiều **Bác sĩ (Doctor)**.
   - 1 **Bác sĩ** tiếp nhận khám nhiều **Bệnh nhân (Patient)**.
   - 1 Lượt khám sinh ra 1 **Phiếu khám / Bệnh án điện tử (Medical Record)**.
   - Phân loại Phiếu khám:
     - Hình thức: **Khám lần đầu** (`initial`) vs **Tái khám** (`follow_up`).
     - Chế độ điều trị: **Ngoại trú** (`outpatient` - kê đơn về nhà) vs **Nội trú** (`inpatient` - chỉ định nhập viện, bố trí **Số phòng** và **Số giường** điều trị).
   - 1 Phiếu khám sinh ra 1 **Đơn thuốc điện tử (Prescription)**.
   - 1 Đơn thuốc bao gồm **Nhiều thuốc (Prescription Items)** liên kết danh mục kho thuốc của phòng khám.
3. **Phân Luồng Ưu Tiên Tiếp Đón & Khám Bệnh (Triage Priority Queue)**:
   - Hệ thống tự động phân cấp và điều phối hàng đợi theo thứ bậc ưu tiên tuyệt đối:
     - **Ưu tiên 1 - Khẩn cấp / Cấp cứu (`emergency`)**: Cấp mã STT tiền tố `CC-xx`, ưu tiên tuyệt đối, gọi số đầu tiên vào phòng khám.
     - **Ưu tiên 2 - Đối tượng ưu tiên (`priority`)**: Người cao tuổi (≥60 tuổi), Trẻ em nhỏ (≤6 tuổi), Phụ nữ mang thai &rarr; Cấp mã STT tiền tố `UT-xx`.
     - **Ưu tiên 3 - Đặt lịch trước trực tuyến (`online`)**: Bệnh nhân đặt trước qua website MediBook.
     - **Ưu tiên 4 - Vãng lai trực tiếp tại quầy (`walkin` / offline)**: Bệnh nhân đến sảnh bốc số thông thường.

---

## 2. Biểu đồ Use Case Tổng Thể (Mermaid Diagram)

```mermaid
flowchart LR
    %% Actors
    User["fa:fa-users Người dùng đa vai trò (User)"]
    Patient["fa:fa-user Bệnh nhân"]
    Receptionist["fa:fa-id-badge Lễ tân & Thu ngân"]
    Doctor["fa:fa-user-md Bác sĩ chuyên khoa"]
    Admin["fa:fa-user-shield Quản trị viên hệ thống"]
    LiveBoard["fa:fa-tv Màn hình gọi số sảnh chờ"]

    %% Generalization (Kế thừa vai trò)
    Patient -.->|kế thừa| User
    Receptionist -.->|kế thừa| User
    Doctor -.->|kế thừa| User
    Admin -.->|kế thừa| User

    %% Shared Account Use Cases
    subgraph UC_General [Tài khoản & Phân quyền Đa vai trò]
        UC_Login(["Đăng nhập hệ thống"]):::common
        UC_Logout(["Đăng xuất"]):::common
        UC_Profile(["Quản lý hồ sơ cá nhân & Đổi MK"]):::common
        UC_SwitchRole(["Chuyển đổi vai trò làm việc (Switch Role)"]):::core
    end

    %% Patient Subgraph
    subgraph UC_Patient [Phân hệ Bệnh nhân (Patient Portal)]
        UC_Search(["Tra cứu Bác sĩ & Chuyên khoa"]):::core
        UC_Fav(["Lưu Bác sĩ yêu thích"]):::sub
        UC_BookOnline(["Đặt lịch khám Online (Chọn đối tượng ưu tiên)"]):::core
        UC_MyAppt(["Theo dõi tiến trình & STT lịch hẹn"]):::core
        UC_Cancel(["Hủy lịch hẹn khám"]):::sub
        UC_ViewExam(["Xem phiếu khám (Lần đầu/Tái khám, Nội/Ngoại trú)"]):::core
        UC_ViewRx(["Xem đơn thuốc điều trị"]):::core
        UC_Review(["Đánh giá chất lượng bác sĩ 5 sao"]):::sub
    end

    %% Receptionist Subgraph
    subgraph UC_Receptionist [Phân hệ Tiếp đón & Điều phối Triage]
        UC_Walkin(["Tiếp nhận đăng ký vãng lai & Cấp độ ưu tiên"]):::core
        UC_TriageCheckin(["Tiếp đón, Check-in & Phân luồng ưu tiên (CC/UT)"]):::core
        UC_CallDisplay(["Điều phối màn hình gọi số sảnh chờ"]):::core
        UC_Payment(["Thu ngân & Quyết toán viện phí (Khám + Thuốc)"]):::core
        UC_PrintReceipt(["In biên lai hóa đơn viện phí"]):::sub
    end

    %% Doctor Subgraph
    subgraph UC_Doctor [Phân hệ Khám bệnh & Điều trị Lâm sàng]
        UC_Queue(["Xem hàng đợi ưu tiên theo phòng khám"]):::core
        UC_CallPatient(["Gọi loa mời bệnh nhân vào phòng"]):::core
        UC_Examine(["Khám bệnh, Đo sinh tồn & Phân loại Nội/Ngoại trú"]):::core
        UC_AssignBed(["Bố trí Số phòng & Số giường bệnh (Nội trú)"]):::sub
        UC_Prescribe(["Kê đơn thuốc điện tử từ kho dược"]):::core
        UC_CompleteExam(["Hoàn tất khám & Lưu bệnh án điện tử"]):::core
        UC_Schedule(["Quản lý ca trực & Xin nghỉ phép"]):::sub
    end

    %% Admin Subgraph
    subgraph UC_Admin [Phân hệ Quản trị & Giám sát]
        UC_AdminDash(["Dashboard KPI & Báo cáo doanh thu"]):::admin
        UC_UserMultiRole(["Quản lý Người dùng & Gán nhiều vai trò"]):::admin
        UC_DoctorManage(["Quản lý Bác sĩ & Phân bổ Chuyên khoa"]):::admin
        UC_SpecialtyManage(["Quản lý Danh mục Chuyên khoa & Dịch vụ"]):::admin
        UC_MedicineManage(["Quản lý Danh mục & Tồn kho Thuốc"]):::admin
        UC_AuditLog(["Nhật ký kiểm toán hệ thống (Audit Logs)"]):::admin
    end

    %% Connections
    User --> UC_Login
    User --> UC_Profile
    User --> UC_SwitchRole

    Patient --> UC_Search
    Patient --> UC_Fav
    Patient --> UC_BookOnline
    Patient --> UC_MyAppt
    Patient --> UC_ViewExam
    Patient --> UC_ViewRx

    Receptionist --> UC_Walkin
    Receptionist --> UC_TriageCheckin
    Receptionist --> UC_Payment

    Doctor --> UC_Queue
    Doctor --> UC_CallPatient
    Doctor --> UC_Examine
    Doctor --> UC_Prescribe
    Doctor --> UC_Schedule

    Admin --> UC_AdminDash
    Admin --> UC_UserMultiRole
    Admin --> UC_DoctorManage
    Admin --> UC_SpecialtyManage
    Admin --> UC_MedicineManage
    Admin --> UC_AuditLog

    %% Include Relationships
    UC_BookOnline -.->|«include»| UC_Login
    UC_TriageCheckin -.->|«include»| UC_CallDisplay
    UC_CallDisplay -.->|«include»| LiveBoard
    UC_Payment -.->|«include»| UC_PrintReceipt
    UC_Examine -.->|«include»| UC_CompleteExam
    UC_Prescribe -.->|«include»| UC_CompleteExam

    %% Extend Relationships
    UC_AssignBed -.->|«extend: khi điều trị nội trú»| UC_Examine
    UC_Review -.->|«extend»| UC_ViewExam
    UC_Cancel -.->|«extend»| UC_MyAppt

    classDef core fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef sub fill:#f0fdf4,stroke:#16a34a,stroke-width:1.5px;
    classDef common fill:#fffbeb,stroke:#d97706,stroke-width:1.5px;
    classDef admin fill:#fdf2f8,stroke:#db2777,stroke-width:1.5px;
```

---

## 3. Bảng Đặc tả Các Use Case Trọng Tâm

### UC-01: Chuyển đổi vai trò làm việc linh hoạt (Switch Active Role)
- **Tác tử**: Người dùng đa vai trò (User).
- **Mục đích**: Cho phép 1 người dùng sở hữu đồng thời nhiều vai trò (ví dụ: Admin kiêm Bác sĩ, hoặc Bác sĩ đi khám bệnh với vai trò Bệnh nhân) chuyển đổi giao diện làm việc mà không cần đăng xuất tài khoản.
- **Tiền điều kiện**: Người dùng đã đăng nhập và được gán từ 2 vai trò trở lên trong bảng `user_roles`.
- **Luồng chính**:
  1. Người dùng bấm vào thanh chọn vai trò (`Role Switcher`) trên thanh điều hướng topbar.
  2. Chọn vai trò mong muốn (Admin / Bác sĩ / Lễ tân / Bệnh nhân).
  3. Hệ thống kiểm tra quyền hạn thực tế trong CSDL `user_roles`.
  4. Cập nhật `session.user.role` thành vai trò được chọn và điều hướng tức thì đến trang chủ phân hệ tương ứng.

### UC-02: Khám bệnh, Phân loại Phiếu khám & Chỉ định Nội trú
- **Tác tử**: Bác sĩ chuyên khoa (Doctor).
- **Mục đích**: Ghi nhận bệnh án lâm sàng, đo chỉ số sinh tồn, chẩn đoán ICD-10 và phân loại chế độ điều trị nội trú hoặc ngoại trú.
- **Luồng chính**:
  1. Bác sĩ mở hồ sơ khám bệnh từ hàng đợi phòng khám.
  2. Nhập các chỉ số sinh tồn (Huyết áp, Nhịp tim, Thân nhiệt, Chiều cao, Cân nặng, BMI).
  3. Chọn **Loại phiếu khám**:
     - *Lần đầu khám*: Bệnh nhân khám đợt mới.
     - *Tái khám*: Bệnh nhân đến kiểm tra lại theo hẹn.
  4. Chọn **Chế độ điều trị**:
     - *Điều trị ngoại trú*: Kê đơn thuốc điều trị tại nhà.
     - *Nhập viện nội trú*: Hệ thống mở rộng các trường chỉ định buồng bệnh nội trú:
       - Nhập **Số phòng điều trị** (ví dụ: `Phòng 402 - Khoa Tim Mạch`).
       - Nhập **Số giường bệnh** (ví dụ: `Giường C-12`).
       - Ngày nhập viện và Ngày dự kiến xuất viện.
  5. Nhập chẩn đoán lâm sàng, mã bệnh ICD-10 và lời dặn bác sĩ.
  6. Kê đơn thuốc điện tử (UC-03).
  7. Bấm "Hoàn tất khám & Lưu bệnh án" &rarr; Hệ thống lưu trữ đồng thời vào `medical_records` và `prescriptions`.

### UC-03: Kê đơn thuốc điện tử (Electronic Prescription)
- **Tác tử**: Bác sĩ chuyên khoa (Doctor).
- **Mục đích**: Kê các loại thuốc điều trị tương ứng với phiếu khám lâm sàng từ danh mục kho thuốc.
- **Ràng buộc**: **1 Phiếu khám &rarr; 1 Đơn thuốc &rarr; Nhiều thuốc**.
- **Luồng chính**:
  1. Bác sĩ chọn thuốc từ danh mục kho dược hoặc nhập thuốc tự do.
  2. Hệ thống tự động điền đơn giá niêm yết và đơn vị tính (Viên, Gói, Chai...).
  3. Nhập số lượng và phân chia cữ dùng chi tiết (Sáng - Trưa - Chiều - Tối).
  4. Bảng tính tự động cập nhật thành tiền từng khoản thuốc và tổng tiền viện phí đơn thuốc.

### UC-04: Tiếp đón, Phân loại Triage & Cấp số thứ tự ưu tiên
- **Tác tử**: Lễ tân & Thu ngân (Receptionist).
- **Mục đích**: Tiếp nhận bệnh nhân tại quầy hoặc check-in lịch hẹn online, phân luồng theo 4 cấp độ ưu tiên y khoa:
  1. **Khẩn cấp (`emergency`)**: Cấp cứu nguy kịch &rarr; STT `CC-xx`, `priority_order = 1`.
  2. **Đối tượng ưu tiên (`priority`)**: Người già ≥60t, Trẻ em ≤6t, Phụ nữ mang thai &rarr; STT `UT-xx`, `priority_order = 2`.
  3. **Đặt hẹn trước trực tuyến (`online`)**: Bệnh nhân đặt qua app &rarr; `priority_order = 3`.
  4. **Vãng lai tại quầy (`walkin`)**: Khách xếp hàng tại sảnh &rarr; `priority_order = 4`.
- **Hệ quả**: Bảng điều phối hàng đợi phòng khám của bác sĩ và màn hình TV sảnh chờ (`Live Board`) tự động đưa bệnh nhân cấp cứu và ưu tiên lên đầu danh sách gọi số.
