# 🧹 BÁO CÁO DỌN RÁC DỰ ÁN (PROJECT CLEANUP REPORT)
**Dự án**: MediBook - Nền tảng Đặt lịch Khám & Quản lý Phòng khám Thông minh  
**Vị trí Codebase**: `D:\MediBook` (Ổ đĩa `Study (D:)`)  
**Thời điểm dọn dẹp & kiểm chứng**: 2026-10-03T11:26:00+07:00  
**Repository Janitor & Verifier**: Senior Technical Auditor & Codebase Cleaner  
**Quy trình tuân thủ**: 7 Phase Protocol của skill `/cleanup-sweeper` (Có bằng chứng, an toàn tuyệt đối, có bản lưu ngoài dự án)  

---

## 1. KẾT LUẬN ĐIỀU HÀNH
- **Tổng quan dọn dẹp**: Đã dọn dẹp an toàn **1.77 MB** dung lượng rác và nhật ký tạm thời, thực hiện checkpoint thu gọn SQLite WAL log từ 1.74 MB về 0 bytes, untrack các file binary (`dist/`, `database/medibook.sqlite`) khỏi Git index để làm nhẹ repo, và bảo toàn 100% mã nguồn cốt lõi.
- **Kết quả kiểm chứng**: **100% XANH** (Biên dịch TypeScript 0 lỗi, dry-run 45/45 EJS views PASS, chạy 2 lần bộ kiểm thử tự động 52/52 test suites PASS 100%).
- **Bảo toàn dữ liệu & Lưới an toàn**: Đã tạo bản lưu dự phòng nguyên vẹn NGOÀI dự án tại `D:\MediBook-cleanup-backup-20261003-1125.zip` (Mã băm SHA256: `F89DD9AAE52E878E8D3AC50CE27A5E443E5D5F9C25B482878A3E36CF6BF4EB14`).
- **Mức tin cậy**: **CAO TUYỆT ĐỐI** (Mọi thay đổi đều được đo đạc, kiểm tra trước/sau bằng lệnh thực thi thật).

---

## 2. LƯỚI AN TOÀN (SAFETY NET)
- **Git Tag mốc an toàn**: `pre-cleanup-20261003` (commit `ede94ad`)
- **Git Branch làm việc**: `cleanup/20261003`
- **Bản lưu NGOÀI dự án (Bắt buộc)**:
  - **Đường dẫn**: `D:\MediBook-cleanup-backup-20261003-1125.zip`
  - **Dung lượng**: `21,298 bytes` (~20.8 KB)
  - **Mã băm SHA256**: `F89DD9AAE52E878E8D3AC50CE27A5E443E5D5F9C25B482878A3E36CF6BF4EB14`
  - **Kết quả kiểm tra tính toàn vẹn (Unzip test)**: `tar -tf` PASS (100% giải nén không lỗi).
  - **Bảng MANIFEST lưu trữ**:
    - `package.json` | `934 B`
    - `package-lock.json` | `70,765 B`
    - `tsconfig.json` | `469 B`
    - `.env.example` | `579 B`
    - `.gitignore` | `249 B`
    - `schema.sql` | `17,697 B`
    - `seed.sql` | `15,449 B`
- **Cách khôi phục khẩn cấp**:
  - Khôi phục file cấu hình từ bản lưu ngoài:
    ```powershell
    tar -xf ../MediBook-cleanup-backup-20261003-1125.zip
    ```
  - Hoàn tác toàn bộ về mốc trước dọn:
    ```powershell
    git checkout pre-cleanup-20261003
    ```

---

## 3. ĐƯỜNG CƠ SỞ TRƯỚC DỌN (BASELINE)

| Chỉ số | Giá trị trước dọn | Chi tiết |
|:---|:---:|:---|
| **Tổng file dự án** (trừ node_modules, .git) | **101 files** | 45 views, 4 ts, 2 css, 6 js, 2 sql, 8 docs/md, sqlite |
| **Tổng dung lượng thư mục** | **9.42 MB** | 9,418,125 bytes |
| `database/` (CSDL SQLite) | **2,103.5 KB** | File chính (299KB), wal log (1,738KB), shm (32KB), sql (33KB) |
| `public/` (Static assets) | **6.20 MB** | 10 ảnh JPG (~600KB/ảnh), 6 SVG, 3 JS, 2 CSS |
| `src/` (Mã nguồn backend) | **117.68 KB** | 4 files (`server.ts`, `db.ts`, `helpers.ts`, `middleware.ts`) |
| `dist/` (Build output) | **120.28 KB** | 4 files biên dịch |
| **Build TypeScript (`npm run build`)** | **PASS** | 0 error, 0 warning |
| **Dry-run Views (`test_render_views.js`)** | **PASS 45/45** | 100% template compile không lỗi |
| **Automated Test Suites (`npm test`)** | **PASS 52/52** | 10 nhóm nghiệp vụ & bảo mật |

---

## 4. BẢNG RÁC ĐÃ XỬ LÝ (J-xx)

| ID | Đường dẫn / Mục | Tầng | Bằng chứng không dùng | Hành động | Lô | Kết quả kiểm sau lô |
|:---|:---|:---:|:---|:---:|:---:|:---:|
| **J-01** | `database/medibook.sqlite-wal` (1,738 KB) & `-shm` (32 KB) | **A** | File nhật ký WAL tích tụ kích thước sau nhiều lượt chạy test tự động. | **Checkpoint nén gọn** qua `PRAGMA wal_checkpoint(TRUNCATE)` | Lô 1 | **PASS** (Flushed sạch vào file chính, giải phóng ~1.77 MB) |
| **J-02** | `dist/` & `database/medibook.sqlite` trong Git index | **A** | File build output và database runtime bị Git track trước đây, làm phình to lịch sử commit. | **Untrack khỏi Git** (`git rm --cached`) | Lô 2 | **PASS** (Git index sạch, file vật lý trên đĩa vẫn được giữ) |

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
| **K-07** | `.env` & `.env.example` | Cấu hình | File môi trường phục vụ cấu hình runtime an toàn vừa hoàn thiện tại Work Item W-01. |

---

## 6. MỤC CHỈ BÁO CÁO — CẦN NGƯỜI DÙNG QUYẾT (Q-xx)

| ID | Vấn đề phát hiện | Chi tiết bằng chứng | Khuyến nghị giải pháp |
|:---|:---|:---|:---|
| **Q-01** | Kích thước ảnh bác sĩ trong `public/assets/images/` còn khá nặng | 10 file `.jpg` (`doctor-1.jpg` đến `doctor-9.jpg` và `doctor-hero.jpg`) có dung lượng từ 585 KB đến 682 KB mỗi ảnh, chiếm tổng cộng hơn 6.2 MB trên tổng số 7.65 MB của toàn bộ dự án. | Đề xuất tối ưu hóa hình ảnh bằng công cụ nén WebP hoặc giảm độ phân giải xuống 400x400 (chỉ còn ~40-60 KB/ảnh) theo đúng Work Item W-06. Thao tác này sẽ giúp giảm > 5.5 MB dung lượng tải trang và tăng điểm Lighthouse di động đáng kể. |
| **Q-02** | Cơ chế tự động Checkpoint SQLite WAL định kỳ | Khi phòng khám hoạt động với lượng giao dịch lớn, file WAL sẽ tăng dần kích thước theo thời gian. | Khuyến nghị bổ sung task tự động chạy `PRAGMA wal_checkpoint(PASSIVE)` mỗi đêm trong module bảo trì Admin. |

---

## 7. KIỂM CHỨNG SAU DỌN (PHASE 5)

| STT | Hạng mục kiểm chứng | Lệnh thực hiện | Kết quả thực tế | Trạng thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Biên dịch TypeScript** | `npm run build` | `tsc` hoàn tất với **0 lỗi, 0 cảnh báo**. | 🟢 PASS |
| 2 | **Kiểm tra Dry-run Views** | `node test_render_views.js` | **45/45 EJS templates** biên dịch thành công 100%. | 🟢 PASS |
| 3 | **Kiểm tra E2E Test Suite** | `npm test` | **52/52 Test Suites PASS 100%** (Chạy lại 2 lần đều xanh). | 🟢 PASS |
| 4 | **Khởi động Server Local** | `node dist/server.js` | Server Express khởi chạy tức thì tại `http://localhost:3000`. | 🟢 PASS |
| 5 | **Không còn tham chiếu mồ côi** | `git check-ignore` & `git status` | Không có file bị gãy link hay import lỗi. | 🟢 PASS |
| 6 | **Diff Git đúng như dự kiến** | `git status` | Chỉ các thay đổi mong muốn được ghi nhận, không đụng danh mục cấm. | 🟢 PASS |
| 7 | **Không lộ bí mật** | `git ls-files .env` | File `.env` được ignore hoàn toàn, không lọt vào Git index. | 🟢 PASS |

---

## 8. SỐ LIỆU ĐỘ NẶNG WEB TRƯỚC → SAU DỌN

| Chỉ số | Trước dọn | Sau dọn | Mức giảm | % Giảm | Nhận xét trung thực |
|:---|:---:|:---:|:---:|:---:|:---|
| **Tổng dung lượng dự án** | **9.42 MB** | **7.65 MB** | **-1.77 MB** | **-18.8%** | Giảm rõ rệt nhờ nén gọn nhật ký SQLite WAL. |
| `database/` (CSDL) | **2,103.5 KB** | **340.3 KB** | **-1,763.2 KB** | **-83.8%** | Thu gọn tối đa, dữ liệu cam kết an toàn nguyên vẹn. |
| `src/` (Mã nguồn backend) | **117.68 KB** | **117.68 KB** | 0 KB | 0.0% | Giữ nguyên cấu trúc logic sạch sau W-01. |
| `public/assets` | **6.20 MB** | **6.20 MB** | 0 KB | 0.0% | Giữ nguyên theo nguyên tắc: không tự ý nén/sửa ảnh khi chưa qua W-06. |
| `dist/` (Build output) | **120.28 KB** | **120.28 KB** | 0 KB | 0.0% | Tái tạo chính xác từ mã TypeScript nguồn. |

---

## 9. ĐỀ XUẤT PHÒNG TÁI PHÁT (PHASE 6)
1. **Duy trì `.gitignore` chuẩn mực**: Đã bổ sung `.env`, `.env.*`, `dist/`, `database/*.sqlite` để ngăn chặn commit rác tự động.
2. **Quy tắc cho AI Agent**:
   - Mọi script kiểm tra tạm thời phải đặt trong thư mục tạm hoặc xóa ngay sau khi chạy xong.
   - Tuyệt đối không tạo bản sao nội bộ kiểu `*-copy.*` hay `*_backup.*` trong thư mục dự án.
   - Chạy `npm test` và checkpoint WAL định kỳ sau các đợt refactor lớn.

---

## 10. PHẠM VI ĐÃ QUÉT & GIỚI HẠN
- **Phạm vi quét sâu 100%**: Thư mục gốc, `src/`, `views/`, `public/`, `database/`, `docs/`.
- **Giới hạn an toàn**: Không tự ý xóa ảnh bác sĩ trong `public/assets/images/` vì các ảnh này đang được render động qua template; việc chuyển đổi sang WebP sẽ được thực hiện bài bản tại Work Item W-06.

---

## 11. HANDOFF CHO AI KHÁC
```text
DỰ ÁN: MediBook (D:\MediBook)
TÌNH TRẠNG CODEBASE: SẠCH SẼ 100%, ĐÃ HOÀN TẤT W-01 VÀ DỌN RÁC TOÀN DIỆN.
KẾT QUẢ KIỂM THỬ: npm run build (PASS), test_render_views (45/45 PASS), npm test (52/52 PASS).
DUNG LƯỢNG HIỆN TẠI: 7.65 MB (Database chỉ còn 340 KB, mã nguồn src 117 KB).
BẢN LƯU AN TOÀN: D:\MediBook-cleanup-backup-20261003-1125.zip (SHA256: F89DD9AA...).
LƯU Ý QUAN TRỌNG:
  - Ảnh bác sĩ doctor-1.jpg đến doctor-9.jpg được dùng qua dynamic template doctor-<%= doc.id %>.jpg, KHÔNG ĐƯỢC XÓA.
  - File .env và dist/ đã được untrack khỏi git, không commit file binary.
```
