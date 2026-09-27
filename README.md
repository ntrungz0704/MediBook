# MediBook - Nền tảng Đặt Lịch Khám & Quản Lý Phòng Khám Thông Minh (Node.js & Express)

Hệ thống **MediBook** đã được chuyển đổi và nâng cấp toàn diện sang **Node.js (Express + SQLite/JSON + EJS)** theo đúng yêu cầu môn học của thầy Long:
- ✅ **KHÔNG dùng PHP / PHP Built-in Server**.
- ✅ **KHÔNG phụ thuộc phpMyAdmin hay MySQL Server**, database SQLite tự động tạo và seed đầy đủ dữ liệu demo độc lập ngay trong project.
- ✅ Giữ trọn vẹn 100% giao diện sang trọng, responsive chuẩn Desktop (16:9) và Mobile (9:16) cùng toàn bộ tính năng của cả 4 vai trò (Admin, Doctor, Receptionist, Patient).

---

## 🌟 Tính năng nổi bật

- **4 Vai trò người dùng (RBAC)**:
  - **Bệnh nhân (Patient)**: Khám phá chuyên khoa, xem hồ sơ bác sĩ, đặt lịch khám trực tuyến 3 bước tự động tính khung giờ (slot), xem chi tiết phiếu khám, đơn thuốc, lịch sử khám và đánh giá bác sĩ.
  - **Bác sĩ (Doctor)**: Tổng quan ca trực, hàng đợi bệnh nhân thời gian thực, gọi số vào phòng khám, giao diện thăm khám lâm sàng đo chỉ số sinh tồn (tự tính BMI), kê đơn thuốc điện tử chọn nhanh từ kho dược, quản lý ca trực và gửi đơn xin nghỉ phép.
  - **Lễ tân (Receptionist)**: Quầy tiếp đón & điểm danh check-in 1 chạm, tự động cấp số thứ tự (Queue Number) theo phòng, đặt lịch trực tiếp tại quầy (walk-in) có tùy chọn tiếp đón ngay, thu ngân viện phí, xuất và in hóa đơn/biên lai chính thức.
  - **Quản trị viên (Admin)**: Thống kê KPI, doanh thu lũy kế, quản lý tài khoản người dùng, cấu hình hồ sơ bác sĩ & phân chuyên khoa, quản lý chuyên khoa & dịch vụ, quản lý kho thuốc, duyệt lịch trực & đơn xin nghỉ phép, nhật ký kiểm toán bảo mật (Audit trail).
- **Màn hình gọi số sảnh chờ (Live TV Board)**: Giao diện toàn màn hình trực quan cho TV phòng khám, tự động cập nhật thời gian thực số đang gọi và danh sách chờ theo từng phòng.

---

## 🚀 Hướng dẫn Khởi chạy (Node.js)

### 1. Cài đặt thư viện (nếu chưa cài)
```bash
npm install
```

### 2. Khởi chạy ứng dụng
```bash
npm start
```
Hoặc chạy chế độ tự động reload khi sửa code:
```bash
npm run dev
```

### 3. Truy cập hệ thống
👉 Mở trình duyệt tại: **[http://localhost:3000](http://localhost:3000)**

*(Cơ sở dữ liệu SQLite tại `database/medibook.sqlite` sẽ tự động khởi tạo bảng và nạp sẵn toàn bộ dữ liệu mẫu ngay khi server khởi động lần đầu).*

---

## 🔑 Tài khoản demo có sẵn

Tất cả các tài khoản demo đều sử dụng chung mật khẩu mặc định là: **`password`**

| Vai trò | Email đăng nhập | Mật khẩu | Chức năng chính |
|---|---|---|---|
| 👑 **Quản trị viên (Admin)** | `admin@medibook.local` | `password` | Quản trị toàn hệ thống, báo cáo doanh thu, CRUD người dùng & danh mục |
| 👩‍⚕️ **Bác sĩ (Doctor)** | `doctor@medibook.local` | `password` | Hàng đợi phòng P.101, gọi số, khám bệnh, đo vitals, kê đơn thuốc |
| 💁‍♀️ **Lễ tân (Receptionist)** | `receptionist@medibook.local` | `password` | Bàn tiếp đón, check-in cấp STT, thu viện phí, in hóa đơn |
| 🧑‍🦱 **Bệnh nhân (Patient)** | `patient@medibook.local` | `password` | Đặt lịch khám, xem lịch của tôi, xem đơn thuốc, đánh giá bác sĩ |

---

## 📁 Cấu trúc mã nguồn Node.js

```
medibook/
├── database/
│   └── medibook.sqlite       # Cơ sở dữ liệu SQLite độc lập
├── public/                   # Tài nguyên tĩnh
│   ├── assets/
│   │   ├── css/              # app.css, dashboard.css
│   │   ├── js/               # app.js, booking.js, queue.js
│   │   └── images/           # SVG avatars, logo, hero images
├── src/
│   ├── db.js                 # Khởi tạo bảng và seed dữ liệu tự động
│   ├── helpers.js            # Định dạng tiền tệ VND, ngày tháng, badge trạng thái
│   └── middleware.js         # Phân quyền RBAC & xác thực phiên đăng nhập
├── views/                    # Giao diện template EJS hoàn chỉnh
│   ├── layouts/              # main.ejs, admin.ejs, doctor.ejs, receptionist.ejs
│   ├── home/                 # Trang chủ index.ejs
│   ├── auth/                 # login.ejs, register.ejs
│   ├── specialties/          # Danh sách & chi tiết chuyên khoa
│   ├── doctors/              # Danh sách & hồ sơ chi tiết bác sĩ
│   ├── appointments/         # book.ejs, success.ejs, index.ejs, detail.ejs
│   ├── profile/              # index.ejs (hồ sơ & đổi mật khẩu)
│   ├── doctor/               # dashboard, queue, examine, schedule
│   ├── receptionist/         # dashboard, checkin, walkin_booking, payments, live_board, receipt_print
│   └── admin/                # dashboard, users, doctors, specialties, services, medicines, schedules, appointments, reports, logs
├── package.json              # Khai báo dependencies & scripts
├── server.js                 # Web Server chính (Express.js)
└── README.md
```
