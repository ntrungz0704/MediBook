# MediBook - Tài liệu Use Case & Đặc tả luồng tương tác (USE_CASE)

## 1. Biểu đồ Use Case tổng thể (Chuẩn UML)

Bao gồm:
- **Tác tử chính**: Bệnh nhân, Lễ tân & Thu ngân, Bác sĩ khám bệnh, Quản trị viên (Admin).
- **Tác tử phụ / Hệ thống**: Màn hình gọi số sảnh chờ (Live TV Display).
- **Quan hệ bắt buộc `«include»`**:
  - `Đặt lịch khám trực tuyến` **«include»** `Đăng nhập hệ thống`
  - `Tiếp đón & Check-in` **«include»** `Cấp số thứ tự khám (STT)`
  - `Thu viện phí dịch vụ & thuốc` **«include»** `In biên lai / Hóa đơn`
  - `Gọi bệnh nhân vào phòng` **«include»** `Hiển thị Màn hình sảnh chờ`
- **Quan hệ mở rộng `«extend»`**:
  - `Kê đơn thuốc điện tử` **«extend»** `Khám, Nhập sinh tồn & Chẩn đoán`
  - `Hủy / Đổi lịch hẹn` **«extend»** `Xem & Theo dõi trạng thái lịch hẹn`
  - `Đánh giá bác sĩ sau khám` **«extend»** `Xem bệnh án & Đơn thuốc`

```mermaid
flowchart LR
    %% Actors
    Patient["fa:fa-user Bệnh nhân"]
    Receptionist["fa:fa-id-badge Lễ tân & Thu ngân"]
    Doctor["fa:fa-user-md Bác sĩ"]
    Admin["fa:fa-user-shield Quản trị viên"]
    LiveBoard["fa:fa-tv Màn hình gọi số sảnh"]

    %% Auth & Profile
    subgraph UC_General [Tài khoản & Cá nhân]
        UC_Login(["Đăng nhập"]):::common
        UC_Logout(["Đăng xuất"]):::common
        UC_Profile(["Quản lý hồ sơ cá nhân & Đổi MK"]):::common
    end

    %% Patient Subgraph
    subgraph UC_Patient [Phân hệ Bệnh nhân]
        UC_Search(["Tìm kiếm Bác sĩ & Chuyên khoa"]):::core
        UC_Fav(["Lưu Bác sĩ yêu thích"]):::sub
        UC_Book(["Đặt lịch khám trực tuyến"]):::core
        UC_MyAppt(["Xem & Theo dõi trạng thái lịch hẹn"]):::core
        UC_Cancel(["Hủy / Đổi lịch hẹn"]):::sub
        UC_History(["Xem bệnh án & Đơn thuốc"]):::core
        UC_Review(["Đánh giá bác sĩ sau khám"]):::sub
    end

    %% Receptionist Subgraph
    subgraph UC_Receptionist [Phân hệ Tiếp đón & Thu ngân]
        UC_Walkin(["Đặt lịch tại quầy (Vãng lai)"]):::core
        UC_Checkin(["Tiếp đón & Check-in bệnh nhân"]):::core
        UC_STT(["Cấp số thứ tự khám (STT)"]):::sub
        UC_NoShow(["Đánh dấu vắng mặt (No-show)"]):::sub
        UC_Payment(["Thu viện phí dịch vụ & thuốc"]):::core
        UC_Receipt(["In biên lai / Hóa đơn"]):::sub
    end

    %% Doctor Subgraph
    subgraph UC_Doctor [Phân hệ Bác sĩ khám]
        UC_Queue(["Xem danh sách hàng đợi khám"]):::core
        UC_Call(["Gọi bệnh nhân vào phòng"]):::core
        UC_Examine(["Khám, Nhập sinh tồn & Chẩn đoán"]):::core
        UC_Prescribe(["Kê đơn thuốc điện tử"]):::sub
        UC_Complete(["Hoàn tất ca khám & Kết luận"]):::core
        UC_Shift(["Xem lịch trực của tôi"]):::sub
        UC_Leave(["Gửi yêu cầu xin nghỉ phép"]):::sub
    end

    %% Admin Subgraph
    subgraph UC_Admin [Phân hệ Quản trị]
        UC_Dash(["Dashboard & Thống kê doanh thu"]):::admin
        UC_Users(["Quản lý Người dùng & Phân quyền"]):::admin
        UC_Docs(["Quản lý Bác sĩ & Chuyên khoa"]):::admin
        UC_Sched(["Quản lý Ca trực & Lịch làm việc"]):::admin
        UC_ApproveLeave(["Duyệt đơn xin nghỉ phép"]):::admin
        UC_Meds(["Quản lý Kho thuốc & Bảng giá DV"]):::admin
        UC_Appts(["Xem & Giám sát toàn bộ Lịch hẹn"]):::admin
        UC_Logs(["Nhật ký kiểm toán (Activity Logs)"]):::admin
    end

    %% Actor Connections
    Patient --> UC_Profile
    Patient --> UC_Search
    Patient --> UC_Fav
    Patient --> UC_Book
    Patient --> UC_MyAppt
    Patient --> UC_History

    Receptionist --> UC_Profile
    Receptionist --> UC_Walkin
    Receptionist --> UC_Checkin
    Receptionist --> UC_NoShow
    Receptionist --> UC_Payment

    Doctor --> UC_Profile
    Doctor --> UC_Queue
    Doctor --> UC_Call
    Doctor --> UC_Examine
    Doctor --> UC_Shift
    Doctor --> UC_Leave

    Admin --> UC_Profile
    Admin --> UC_Dash
    Admin --> UC_Users
    Admin --> UC_Docs
    Admin --> UC_Sched
    Admin --> UC_ApproveLeave
    Admin --> UC_Meds
    Admin --> UC_Appts
    Admin --> UC_Logs

    %% Include relationships
    UC_Book -.->|«include»| UC_Login
    UC_Checkin -.->|«include»| UC_STT
    UC_Payment -.->|«include»| UC_Receipt
    UC_Call -.->|«include»| LiveBoard

    %% Extend relationships
    UC_Cancel -.->|«extend»| UC_MyAppt
    UC_Review -.->|«extend»| UC_History
    UC_Prescribe -.->|«extend»| UC_Examine
    UC_Complete -.->|«extend»| UC_Examine

    %% Common logout
    UC_Logout -.-> Patient
    UC_Logout -.-> Receptionist
    UC_Logout -.-> Doctor
    UC_Logout -.-> Admin

    classDef core fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef sub fill:#f1f8e9,stroke:#689f38,stroke-width:1.5px;
    classDef common fill:#fff3e0,stroke:#f57c00,stroke-width:1.5px;
    classDef admin fill:#fce4ec,stroke:#c2185b,stroke-width:1.5px;
```
