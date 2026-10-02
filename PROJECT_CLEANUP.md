# 🧹 BÁO CÁO DỌN RÁC DỰ ÁN (PROJECT CLEANUP REPORT)
**Dự án**: MediBook - Nền tảng Quản lý Phòng khám Đa khoa & Đặt lịch Khám bệnh Thông minh  
**Vị trí Codebase**: `D:\MediBook` (Ổ đĩa `Study (D:)`)  
**Thời điểm dọn dẹp & kiểm chứng**: 2026-10-02T23:15:00+07:00  
**Repository Janitor & Verifier**: Senior Technical Auditor & Codebase Cleaner  

---

## 1. KẾT LUẬN ĐIỀU HÀNH
- **Tổng quan dọn dẹp**: Đã dọn dẹp an toàn **1 file backup nội bộ** (`232 KB`), gỡ bỏ **2 dependencies thừa** (`multer` và `method-override` cùng `@types`) loại bỏ **14 packages npm** không dùng trong `node_modules`, và thực hiện checkpoint nén gọn SQLite WAL log.
- **Kết quả kiểm chứng**: **100% XANH** (Biên dịch TypeScript 0 lỗi, dry-run 45/45 EJS views PASS, chạy 2 lần bộ kiểm thử tự động 52/52 test suites PASS 100%).
- **Bảo toàn dữ liệu & Lưới an toàn**: Đã tạo bản lưu dự phòng nguyên vẹn NGOÀI dự án tại `D:\MediBook-cleanup-backup-20261002-2315.zip` (SHA256: `41332a5008317cf1c135916ea30b8f3c7a2e25fb0b206eafadb736a191be308e`).
- **Mức tin cậy**: **CAO TUYỆT ĐỐI** (Mọi thay đổi đều được kiểm tra trước/sau bằng lệnh thực thi thật).

---

## 2. LƯỚI AN TOÀN (SAFETY NET)
- **Git Tag mốc an toàn**: `pre-cleanup-20261002` (commit `3f23b33`)
- **Git Branch làm việc**: `cleanup/20261002` (đã fast-forward merge vào `main` sau khi kiểm chứng đạt)
- **Bản lưu NGOÀI dự án (Bắt buộc)**:
  - **Đường dẫn**: `D:\MediBook-cleanup-backup-20261002-2315.zip`
  - **Dung lượng**: `40,043 bytes` (~39.1 KB)
  - **Mã băm SHA256**: `41332a5008317cf1c135916ea30b8f3c7a2e25fb0b206eafadb736a191be308e`
  - **Kết quả kiểm tra tính toàn vẹn (Unzip test)**: `tar -tf` PASS (100% giải nén không lỗi).
  - **Bảng MANIFEST lưu trữ**:
    - `database/medibook.sqlite.pre_audit_backup` | `237,568 B` | `f0cab533a4b610187f8c2d45eb8baf6d798305397b0bcdb145517e55c92b42d2`
    - `package.json` | `1,066 B` | `109f4725983fa393b3475388b2c4c339b4ec256ff50e6d257942320b4c30e359`
    - `package-lock.json` | `76,486 B` | `5b716614b7c4cb98ebef8645f5343a9addd51c418bc92e0e1ab37e00a17e93d1`
    - `tsconfig.json` | `469 B` | `03fef32e7c4a2d12e1340ab58a3e2ef2d4ca5aea89042d7ef84aca6e4d0cec5c`
- **Cách khôi phục khẩn cấp**:
  - Khôi phục file backup SQLite:
    ```powershell
    tar -xf ../MediBook-cleanup-backup-20261002-2315.zip database/medibook.sqlite.pre_audit_backup
    ```
  - Hoàn tác toàn bộ về mốc trước dọn:
    ```powershell
    git checkout pre-cleanup-20261002
    ```

---

## 3. ĐƯỜNG CƠ SỞ TRƯỚC DỌN (BASELINE)

| Chỉ số | Giá trị trước dọn | Chi tiết |
|:---|:---:|:---|
| **Tổng file dự án** (trừ node_modules, .git) | **98 files** | 45 views, 4 ts, 2 css, 6 js, 2 sql, 9 docs/drawio, sqlite |
| **Tổng dung lượng thư mục** | **8.59 MB** | 9,008,015 bytes |
| `src/` (Mã nguồn backend) | **115.94 KB** | 4 files (`server.ts`, `db.ts`, `helpers.ts`, `middleware.ts`) |
| `views/` (EJS Templates) | **267.53 KB** | 45 files (4 layouts, 41 views) |
| `public/` (Static assets) | **6.20 MB** | 17 images, 3 js, 2 css |
| `database/` (CSDL SQLite) | **1,719.13 KB** | Gồm file chính, wal log và pre_audit_backup |
| `node_modules` | **1,779 files / 48.1 MB** | Đang chứa packages không sử dụng |
| **Build TypeScript (`npm run build`)** | **PASS** | 0 error, 0 warning |
| **Dry-run Views (`test_render_views.js`)** | **PASS 45/45** | 100% template compile không lỗi |
| **Automated Test Suites (`npm test`)** | **PASS 52/52** | 10 nhóm nghiệp vụ & bảo mật |

---

## 4. BẢNG RÁC ĐÃ XỬ LÝ (J-xx)

| ID | Đường dẫn / Mục | Tầng | Bằng chứng không dùng | Hành động | Lô | Kết quả kiểm sau lô |
|:---|:---|:---:|:---|:---:|:---:|:---:|
| **J-01** | `database/medibook.sqlite.pre_audit_backup` (232 KB) | **B** | File backup SQLite tạm thời sinh ra trước đợt audit; không được git theo dõi (untracked); không có mã nguồn nào import hay tham chiếu tới file này. | **Xóa thẳng** (đã lưu vào zip ngoài dự án) | Lô 1 | **PASS** (`build` 0 lỗi, `test` 52/52 PASS) |
| **J-02** | `multer` & `@types/multer` | **B2** | Khai báo trong `package.json` nhưng `grep` toàn bộ thư mục `src/`, `views/`, `public/` không có bất kỳ lệnh `require('multer')`, `import multer` hay upload multipart nào. | **Gỡ bỏ bằng npm** (`npm uninstall multer @types/multer`) | Lô 2 | **PASS** (Gỡ 9 packages, `build` 0 lỗi, `test` 52/52 PASS) |
| **J-03** | `method-override` & `@types/method-override` | **B2** | Khai báo trong `package.json` nhưng không được sử dụng ở bất kỳ middleware Express hay route handler nào (chỉ có chuỗi `payment_method` trong DB). | **Gỡ bỏ bằng npm** (`npm uninstall method-override @types/method-override`) | Lô 3 | **PASS** (Gỡ 5 packages, `build` 0 lỗi, `test` 52/52 PASS) |
| **J-04** | `database/medibook.sqlite-wal` (1,154 KB) | **A** | File nhật ký WAL tích tụ kích thước sau nhiều lượt chạy test tự động. | **Checkpoint nén gọn** qua `PRAGMA wal_checkpoint(TRUNCATE)` | Lô 1 | **PASS** (Flushed sạch vào file chính, giải phóng ~1.15 MB) |

---

## 5. MỤC GIỮ LẠI & LÝ DO (K-xx)

| ID | Đường dẫn | Phân loại | Lý do giữ lại (Bằng chứng không phải rác) |
|:---|:---|:---:|:---|
| **K-01** | `public/assets/images/doctor-9.jpg` (585 KB) | Tài nguyên | Trùng mã băm SHA256 (`1d94064a2c6d...`) với `doctor-1.jpg`. Tuy nhiên file này được nạp động qua template `<img src="/assets/images/doctor-<%= doc.id %>.jpg">` cho Bác sĩ ID 9 (`Bác sĩ Minh`). Nếu xóa sẽ gây lỗi vỡ ảnh trên giao diện. |
| **K-02** | `public/assets/images/doctor-1.jpg` → `doctor-8.jpg` | Tài nguyên | Ảnh đại diện của 8 bác sĩ khác trong phòng khám, nạp động qua `doctor-<%= doc.id %>.jpg`. |
| **K-03** | `public/assets/images/avatar-default.svg`, `doctor-hero.svg` | Tài nguyên | File SVG dự phòng hiển thị avatar và banner khi trình duyệt không tải được ảnh raster. |
| **K-04** | `test_render_views.js` & `test_full_suite.js` | Công cụ test | Bộ công cụ kiểm thử tự động tích hợp 45 views dry-run và 52 E2E suites sống còn của hệ thống. |
| **K-05** | `server.js` (Root) | Entrypoint | Điểm khởi chạy chính được định nghĩa trong `package.json` (`"main": "server.js"`). |
| **K-06** | `database/schema.sql` & `database/seed.sql` | Dữ liệu gốc | Thuộc danh mục BẤT KHẢ XÂM PHẠM, phục vụ khởi tạo lại hệ thống khi cần. |

---

## 6. MỤC CHỈ BÁO CÁO — CẦN NGƯỜI DÙNG QUYẾT (Q-xx)

| ID | Vấn đề phát hiện | Bằng chứng thực tế | Khuyến nghị & Đề xuất |
|:---|:---|:---|:---|
| **Q-01** | Kích thước ảnh bác sĩ trong `public/assets/images/` còn khá nặng | 10 file `.jpg` (`doctor-1.jpg` đến `doctor-9.jpg` và `doctor-hero.jpg`) có dung lượng từ 585 KB đến 682 KB mỗi ảnh, chiếm tổng cộng hơn 6.0 MB trên tổng số 8.59 MB của toàn bộ dự án. | Đề xuất tối ưu hóa hình ảnh bằng công cụ nén WebP hoặc giảm độ phân giải xuống 400x400 (chỉ cần ~40-60 KB/ảnh). Thao tác này sẽ giúp giảm > 5 MB dung lượng tải trang và tăng điểm Lighthouse di động đáng kể. |
| **Q-02** | Node.js 22 Deprecation Warning từ dependency ngoài | Cảnh báo `[DEP0044] DeprecationWarning: The util.isArray API is deprecated` xuất phát từ bên trong thư viện `connect-flash` / `express-session`. | Mã nguồn nội bộ của dự án đã dùng 100% `Array.isArray()`. Khi các thư viện trên phát hành bản cập nhật hỗ trợ Node 22, có thể chạy `npm update` để loại bỏ cảnh báo. |

---

## 7. KIỂM CHỨNG SAU DỌN (PHASE 5 PROTOCOL)

| Hạng mục kiểm tra | Lệnh thực hiện | Kết quả kiểm tra | Đánh giá |
|:---|:---|:---|:---:|
| **1. Đủ bộ kiểm tra** | `npm run build`<br>`node test_render_views.js`<br>`npm test` (chạy 2 lần) | - `tsc`: 0 lỗi, 0 cảnh báo.<br>- Views: 45/45 PASS.<br>- Tests: Lần 1: 52/52 PASS. Lần 2: 52/52 PASS. | 🟢 PASS |
| **2. Không còn tham chiếu mồ côi** | `grep -rn` tìm `pre_audit_backup`, `multer`, `method-override` | Không còn bất kỳ file mã nguồn (`.ts`, `.js`, `.ejs`, `.json`) nào chứa import gãy hay tham chiếu đến file đã xóa. | 🟢 PASS |
| **3. Rác đã hết thật** | Quét lại Phase 1 lần 2 | 0 file 0-byte, 0 file backup nội bộ trong repo, 0 dependency thừa. | 🟢 PASS |
| **4. Diff đúng như dự kiến** | `git diff --stat pre-cleanup-20261002..HEAD` | Chỉ gồm `package.json` và `package-lock.json` (bỏ 2 deps), `medibook.sqlite` (checkpoint). Không có file lạ bị xóa. | 🟢 PASS |
| **5. Không sinh rác mới** | Kiểm tra thư mục repo | Không có file tạm, log, hay thư mục `.cleanup-trash/` nào trong repo. File zip duy nhất nằm NGOÀI dự án tại `D:\`. | 🟢 PASS |
| **6. Không lộ bí mật** | `git ls-files` kiểm tra token/secret | 100% file theo dõi không chứa API key, mật khẩu hay token bảo mật. | 🟢 PASS |
| **7. Khởi động ứng dụng** | `node -e "require('./dist/server')"` | Máy chủ Express 5 khởi động nạp 90 routes thành công, sẵn sàng phục vụ. | 🟢 PASS |

---

## 8. SỐ LIỆU ĐỘ NẶNG WEB TRƯỚC → SAU DỌN

| Chỉ số | Trước dọn | Sau dọn | Chênh lệch / Giảm | Nhận xét trung thực |
|:---|:---:|:---:|:---:|:---|
| **Số file trong repo** (trừ node_modules, .git) | 98 files | **97 files** | **-1 file** | Đã dọn sạch file backup nội bộ repo |
| **Tổng dung lượng file mã nguồn & tài nguyên** | 8.59 MB | **7.20 MB** | **-1.39 MB (-16.2%)** | Giảm đáng kể nhờ dọn backup SQLite và checkpoint WAL log |
| **Số lượng Dependencies (package.json)** | 8 runtime + 9 dev | **6 runtime + 7 dev** | **-4 packages** | Gỡ bỏ hoàn toàn `multer` và `method-override` |
| **Kích thước thư mục `node_modules`** | 1,779 files / 48.1 MB | **1,765 files / 46.8 MB** | **-14 packages (-1.3 MB)** | Dự án gọn gàng hơn khi cài đặt `npm install` |
| **Thời gian biên dịch (`npm run build`)** | ~1.2s | **~1.0s** | Nhanh hơn | Không còn gánh @types của packages thừa |
| **Tỷ lệ kiểm thử thành công** | 52/52 PASS | **52/52 PASS** | **100% bảo toàn** | Không có bất kỳ regression hay lỗi mới nào phát sinh |

---

## 9. ĐỀ XUẤT PHÒNG TÁI PHÁT (PHASE 6)
Để giữ cho repository luôn sạch sẽ sau các phiên làm việc của AI Agent tiếp theo, đề xuất:
1. **Bổ sung mẫu file vào `.gitignore`**:
   ```gitignore
   # Temporary backups & scratch files
   *.backup
   *.pre_audit_backup
   *.bak
   *.tmp
   scratch/
   tmp/
   ```
2. **Thêm script kiểm tra rác nhanh vào `package.json`**:
   ```json
   "clean:check": "node -e \"const fs = require('fs'); const bad = fs.readdirSync('.').filter(f => /tmp|scratch|backup|copy/i.test(f)); if(bad.length) { console.error('Phát hiện file rác:', bad); process.exit(1); } else console.log('Repo sạch!');\""
   ```
3. **Quy tắc cho AI Agent trong tương lai**:
   * Tuyệt đối không tạo file backup dạng `*.pre_audit_backup` trực tiếp trong thư mục dữ liệu `database/` mà nên lưu ra thư mục tạm bên ngoài dự án.
   * Khi hoàn tất công việc, kiểm tra lại danh sách package trong `package.json` để không để sót package cài thử.

---

## 10. PHẠM VI ĐÃ QUÉT & GIỚI HẠN
* **Đã quét sâu 100%**:
  * Thư mục gốc `.`, `src/`, `views/`, `public/`, `database/`, `docs/`.
  * Toàn bộ 45 view EJS, 4 file TypeScript, 2 file CSS, 3 file Client JS, 2 file Test JS.
* **Giới hạn an toàn**:
  * Không can thiệp nén đổi định dạng 10 ảnh bác sĩ `.jpg` trong `public/assets/images/` để tránh thay đổi chất lượng đồ họa mà chưa có sự đồng ý của người dùng (đã ghi nhận tại mục Q-01).

---

## 11. HANDOFF CHO AI KHÁC
```text
DỰ ÁN: MediBook - Nền tảng Quản lý Phòng khám Đa khoa
VỊ TRÍ: D:\MediBook
HIỆN TRẠNG: ĐÃ ĐƯỢC DỌN DẸP SẠCH SẼ & KIỂM CHỨNG TOÀN DIỆN (Cleaned & 100% Verified).
LƯỚI AN TOÀN NGOÀI DỰ ÁN: D:\MediBook-cleanup-backup-20261002-2315.zip
TEST SUITES: 52/52 PASS, Views: 45/45 PASS, Build: tsc 0 lỗi.
QUY TẮC DUY TRÌ REPO SẠCH:
  - Không tạo file backup/scratch trực tiếp trong thư mục dự án.
  - Sử dụng đúng 6 runtime packages: bcryptjs, better-sqlite3, connect-flash, ejs, express, express-session.
  - Ảnh bác sĩ doctor-1.jpg đến doctor-9.jpg được dùng qua dynamic template doctor-<%= doc.id %>.jpg, KHÔNG ĐƯỢC XÓA.
```
