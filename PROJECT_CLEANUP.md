# PROJECT_CLEANUP.md — MediBook

> Dọn rác ngày 2026-10-04 · nhánh `cleanup/20261004` · mốc quay lại `pre-cleanup-20261004`.
> Nguyên tắc: không bằng chứng → không đụng; chỉ xóa sau khi có bản lưu **ngoài dự án** đã kiểm tra toàn vẹn; kiểm tra lại sau khi dọn.

---

## 1. Kết luận điều hành

- **Dự án vốn đã khá sạch** (đợt dọn 02/10 và 03/10 đã xử lý phần lớn). Lần này **không có file nào được theo dõi trong git bị xóa**.
- Đã xóa thật: **`dist/`** (Tầng A, build output bị `.gitignore`: 4 file, 0.17 MB). Build lại từ nguồn cho ra **4 file giống hệt từng byte (SHA256 khớp)** → không còn file build cũ/stale.
- Kiểm chứng sau dọn: build ✅ 0 lỗi · test **87/87 PASS ×2** (trên bản sao DB, không đụng DB thật) · smoke 51/51 route đúng · `git diff pre-cleanup-20261004..HEAD` = **rỗng** (không file tracked nào đổi) · không rác mới sinh ra trong dự án.
- **Độ nặng web không đổi** (không có gì để giảm bằng cách xóa). Thủ phạm thật là **6.13 MB ảnh bác sĩ** (xem Q-01) — chỉ báo cáo, không tự sửa.
- Cần bạn quyết: Q-01 … Q-08 (mục 6). Mức tin cậy: **cao** (mọi thay đổi đều có bản lưu và đối chiếu hash).
- File lưu ngoài dự án: `D:\MediBook-cleanup-backup-20261004-0015.zip` — **giữ lại** cho tới khi bạn yên tâm.

---

## 2. Lưới an toàn

| Hạng mục | Giá trị |
|---|---|
| Tag | `pre-cleanup-20261004` (commit `b948f78`, đã gồm 2 báo cáo audit/verify mới) |
| Nhánh | `cleanup/20261004` (đang đứng trên nhánh này; **chưa merge vào `main`**) |
| File lưu ngoài dự án | `D:\MediBook-cleanup-backup-20261004-0015.zip` |
| SHA256 zip | `CC4CF4DE93BAC37F70A613D0889C74789B76EBED3B3F634A0A8090324C38742B` |
| Kích thước / số file | 56 877 byte · 7 file (= 7 file trong kế hoạch) |
| Kiểm tra toàn vẹn | Mở zip, băm từng entry so với băm file nguồn: **khớp 7/7** |

**MANIFEST (đường dẫn gốc + SHA256):**

| Đường dẫn | Byte | SHA256 |
|---|---|---|
| `dist/db.js` | 49 070 | `CDBC2B30AD179B1DEECAC1719503AE02B0439D4765F8A73834F833AECEA38726` |
| `dist/helpers.js` | 5 646 | `B56A6D189185B5D95050D5BA5631F4A316B66D9B383A79F0D5C187775908385F` |
| `dist/middleware.js` | 1 420 | `714CCFC1324E0DECCE4652C43747610EC8FD0D06BA30A7DAAD55A3BA7EDF519E` |
| `dist/server.js` | 122 534 | `274FE2A6899C21F15AD9BCE51947B1D37D441D07A53DF13D28EDC6EE36CDEDC1` |
| `package.json` | 934 | `3BF499B5EF7C011AD2C68F2F253E1CBC96C9EDB8034B874E96F47C16A9993ABF` |
| `package-lock.json` | 70 765 | `6F8F1F9FC504479F8A6440F1736DDB3A2DDAE9474509E406421A2FDC1FA36F3D` |
| `tsconfig.json` | 469 | `03FEF32E7C4A2D12E1340AB58A3E2EF2D4CA5AEA89042D7EF84ACA6E4D0CEC5C` |

**Cách khôi phục**
- Khôi phục `dist/` bằng cách build lại (đơn giản nhất): `npm run build`.
- Từ zip (PowerShell): `Expand-Archive D:\MediBook-cleanup-backup-20261004-0015.zip -DestinationPath D:\MediBook -Force`
- File tracked bất kỳ: `git checkout pre-cleanup-20261004 -- <file>`; cả nhánh: `git switch main`.

---

## 3. Đường cơ sở trước dọn

| Chỉ số | Giá trị |
|---|---|
| File tracked | 99 (7 397 575 byte) |
| `src/` · `views/` · `public/` · `docs/` | 0.167 · 0.310 · 6.205 · 0.080 MB |
| `public/assets/images` | 6.132 MB (≈ 98.8 % của `public/`) |
| `public/assets/css` + `js` | 0.052 + 0.021 MB |
| `dist/` (build output) | 4 file · 0.170 MB (server.js 122 534 B) |
| `node_modules/` · `.git/` | 46.818 · 6.629 MB (không đụng) |
| Dependency runtime | 6 (đều được dùng) |
| Thời gian build (`tsc`) | 0.39 s |
| Build / typecheck | ✅ 0 lỗi |
| Lint | không có |
| Test (`test_full_suite.js` trên bản sao DB) | ✅ 87/87 |
| Lighthouse | không đo (không có công cụ trong môi trường) |

Top file nặng (loại trừ `node_modules`, `.git`): `database/medibook.sqlite-wal` 1.86 MB (runtime DB — bất khả xâm phạm), 10 ảnh `.jpg` 0.60–0.68 MB mỗi ảnh, `dist/server.js` 0.12 MB, `src/server.ts` 0.12 MB.

---

## 4. Bảng rác đã xử lý

Kế hoạch (Phase 3) — 1 lô vì chỉ có 1 hạng mục đủ bằng chứng:

| ID | Đường dẫn | Tầng | Bằng chứng | Hành động | Lô | Kết quả kiểm sau lô |
|---|---|---|---|---|---|---|
| J-01 | `dist/` (4 file) | A | `git status --ignored`: `!! dist/` (bị `.gitignore`, không tracked); sinh ra bởi `npm run build` (`package.json`); không có file `dist/*` nào không có `src/*` tương ứng | **Xóa thẳng** rồi build lại từ nguồn | 1 | Build 0 lỗi (0.39 s); 4 file SHA256 **trùng khớp** manifest; test 87/87; smoke 51/51 |

Lô này không có commit riêng vì `dist/` bị `.gitignore` (không có gì để commit); nhánh chỉ chứa commit báo cáo `b948f78` (+ commit của báo cáo này).

---

## 5. Mục giữ lại & lý do (K-xx)

| ID | Mục | Lý do giữ (bằng chứng) |
|---|---|---|
| K-01 | `public/assets/images/doctor-1.jpg … doctor-9.jpg` | Nạp **động** qua `doctor-<%= doc.id %>.jpg` (`views/doctors/detail.ejs:15`, `doctors/index.ejs:41`, `home/index.ejs:167`, `profile/index.ejs:120`, `specialties/detail.ejs:34`) — bác sĩ ID 1..10 trong DB. Quy tắc: tham chiếu động ⇒ không xóa |
| K-02 | `doctor-9.jpg` (trùng SHA256 `1d94064a2c6d…` với `doctor-1.jpg`, 599 396 B) | Là ảnh của bác sĩ ID 9 theo template động. Xóa sẽ gây 404 + fallback; riêng `profile/index.ejs:120` không có `onerror` ⇒ ảnh vỡ |
| K-03 | `avatar-doctor1…4.svg` | Giá trị `users.avatar` trong DB (`avatar-doctor1.svg`…) và `database/seed.sql` |
| K-04 | `logo.png`, `doctor-hero.jpg`, `doctor-2.jpg`, CSS ×2, JS ×3 | Có tham chiếu tĩnh thật trong layout/views |
| K-05 | `test_full_suite.js`, `test_render_views.js` | Công cụ kiểm thử (test chính được `npm test` gọi; `test_render_views.js` chạy được: 48 PASS — nhưng hard-code `D:/MediBook`, xem Q-05) |
| K-06 | `server.js` (root) | `package.json` `"main"` |
| K-07 | `database/*.sql`, `database/*.sqlite*`, `.env`, `.env.example`, lockfile, `tsconfig.json`, `docs/`, `README.md`, `.vscode/` | Danh mục bất khả xâm phạm |
| K-08 | `PROJECT_BASELINE.md` | `README.md` tham chiếu; 52 KB |
| K-09 | `PROJECT_AUDIT.md`, `PROJECT_VERIFY.md`, `PROJECT_CLEANUP.md` | Đầu ra của 3 skill trong cùng đợt |
| K-10 | `node_modules/` | Không phải rác |

---

## 6. Mục chỉ báo cáo — cần bạn quyết (Q-xx)

| ID | Vấn đề | Bằng chứng | Khuyến nghị |
|---|---|---|---|
| Q-01 | **Ảnh bác sĩ quá nặng** — 10 file `.jpg` ≈ 0.6 MB/ảnh, 6.13 MB chiếm ~99 % `public/` | `Get-ChildItem public/assets/images` (599–683 KB mỗi ảnh); mỗi ảnh chỉ hiển thị dạng thumbnail tròn/thẻ nhỏ | Nén/resize về ≤ 400 px WebP/JPG chất lượng 75–80 (ước tính còn ~30–60 KB/ảnh ⇒ giảm ~5.5 MB; **chưa đo**). Không tự sửa ảnh theo quy tắc |
| Q-02 | `avatar-default.svg` (537 B), `doctor-hero.svg` (2 576 B) **không có tham chiếu** trong code/view/DB | Quét tham chiếu theo tên file: chỉ xuất hiện trong báo cáo `.md`; lý do giữ ở đợt dọn trước ("SVG dự phòng khi ảnh raster lỗi") **không đúng với code** — không có `onerror` nào trỏ tới 2 SVG này | Xóa được (tiết kiệm ~3 KB, không đáng kể). Giữ nếu định dùng làm ảnh mặc định; nếu giữ, nên nối vào `onerror` |
| Q-03 | `MEDIBOOK_AUDIT_NGHIEPVU.md` (15 KB, không ai tham chiếu), `MEDIBOOK_DESIGN_PROPOSAL.md` (18 KB, chỉ tham chiếu lẫn nhau) | Quét tham chiếu | Nên chuyển vào `docs/` thay vì để ở root; xóa nếu không cần |
| Q-04 | `database/schema.sql` + `seed.sql` là dialect **MySQL**, không dùng được với SQLite; schema thật nằm ở `src/db.ts` | `AUTO_INCREMENT/ENGINE=InnoDB`; `seed.sql` lỗi trên DB mới (xem `PROJECT_AUDIT.md` F-17/B-02) | Thuộc danh mục bất khả xâm phạm ⇒ chỉ báo cáo. Sửa theo B-02/R-01 |
| Q-05 | `test_render_views.js` hard-code `D:/MediBook/views`, dữ liệu mock mojibake, không có trong `npm` scripts | `test_render_views.js:5` | Sửa đường dẫn thành tương đối + thêm script, hoặc xóa |
| Q-06 | **DB local bị làm bẩn bởi test**: `npm test` mặc định ghi thẳng vào `database/medibook.sqlite` (108 user, WAL 1.86 MB) — có cả lần chạy `npm test` đầu phiên này | `test_full_suite.js:8,14` dùng `./dist/db` mặc định | Chạy test với `DATABASE_PATH` tạm (đúng cách tôi đã làm trong phiên này) hoặc sửa theo `PROJECT_VERIFY.md` R-01. Không động tới DB (bất khả xâm phạm) |
| Q-07 | 20 tham số `req` không dùng + 1 biến `name` không dùng | `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` (21 cảnh báo TS6133, 0 import thừa) | Dự án không có linter nên không có autofix an toàn ⇒ chỉ báo cáo; vô hại, có thể đổi `req` → `_req` |
| Q-08 | Nhánh/zip dọn cũ: `cleanup/20261002`, `cleanup/20261003` (đã merge vào `main`), `D:\MediBook-cleanup-backup-20261002-2315.zip` (40 KB), `…20261003-1125.zip` (27 KB) | `git branch --merged main` | Bạn có thể xóa khi yên tâm (`git branch -d …`). Tôi **không** tự xóa. Ngoài ra nhánh `cleanup/20261004` chưa merge: `git switch main && git merge --ff-only cleanup/20261004` (chỉ thêm báo cáo) |

---

## 7. Kiểm chứng sau dọn (Phase 5)

| # | Hạng mục | Kết quả | Lệnh / bằng chứng |
|---|---|---|---|
| 1 | Bộ kiểm tra ≥ đường cơ sở | ✅ PASS | `npm run build` 0 lỗi; test 87/87 **×2** (bản sao DB); smoke 51 route / 4 vai trò: 0 NOK; RBAC âm đúng (patient→admin 302 `/`, anon→`/login`). Lint: không có |
| 2 | Không tham chiếu mồ côi | ✅ PASS | Không file tracked nào bị xóa; `dist/` được sinh lại, 4 file giống hệt (SHA256) |
| 3 | Rác đã hết thật | ✅ PASS | Quét lại Phase 1: `git ls-files --others --exclude-standard` = rỗng; chỉ còn ignored: `.env`, `database/*.sqlite*`, `dist/` (vừa build lại, cần để chạy app), `node_modules/`. 0 file 0-byte; 0 duplicate loại B ngoài K-02 (có tham chiếu động) |
| 4 | Diff đúng dự kiến | ✅ PASS | `git diff --stat pre-cleanup-20261004..HEAD` = rỗng (tại thời điểm kiểm; sau đó chỉ thêm file báo cáo này) |
| 5 | Không rác mới trong repo | ✅ PASS | Không có `.cleanup-trash/`, `.zip`, `.bak`… trong `D:\MediBook`; zip duy nhất nằm **ngoài** dự án; file tạm của phiên (`%TEMP%\mb-verify-A`, bản sao DB) đã xóa |
| 6 | Không lộ secret | ✅ PASS | `git ls-files` không chứa `.env`/`.sqlite`/khóa (0) |
| 7 | Số liệu độ nặng web trước → sau | ✅ đã đo | Xem mục 8 |

---

## 8. Số liệu độ nặng web trước → sau

| Chỉ số | Trước | Sau | Thay đổi |
|---|---|---|---|
| Source (`src/`) | 0.167 MB | 0.167 MB | 0 % |
| `public/` | 6.205 MB | 6.205 MB | 0 % |
| `public/assets/images` | 6.132 MB | 6.132 MB | 0 % |
| CSS + JS client | 0.073 MB | 0.073 MB | 0 % |
| Build output `dist/` | 0.170 MB (4 file) | 0.170 MB (4 file, hash trùng) | 0 % |
| Dependency runtime | 6 | 6 | 0 |
| Thời gian build | 0.39 s | 0.39 s | 0 % |
| Điểm Lighthouse | — | — | không đo |

**Nhận xét trung thực:** dọn dẹp lần này **không làm web nhẹ hơn** vì không còn gì thừa để xóa an toàn. Điểm nghẽn thật là ảnh (Q-01: 6.13 MB, ~99 % tài nguyên tĩnh; mỗi trang danh sách bác sĩ tải nhiều ảnh ~0.6 MB). Đây là cải thiện tốc độ tải lớn nhất còn lại.

---

## 9. Đề xuất phòng rác tái phát

- **`.gitignore`** (đã có `node_modules/`, `dist/`, `.env*`, `database/*.sqlite*`, `*.log`): nên thêm
  ```
  .scratch/
  tmp_*
  *.tmp
  *.bak
  *.orig
  ```
- **Quy tắc cho Agent** (`AGENTS.md`): file thử/scratch đặt ở `%TEMP%` hoặc `.scratch/`, không commit; xong việc liệt kê & xóa file tạm; không để file backup/copy trong repo; **test luôn chạy với `DATABASE_PATH` tạm, không ghi vào `database/medibook.sqlite`**; báo cáo `PROJECT_*.md` đặt vào `docs/reports/` thay vì root.
- **Script đề xuất** `npm run clean:check`: báo khi có `*.bak|*.orig|*.tmp`, file 0-byte, hoặc ảnh `public/assets/images/*` > 150 KB.
- **Cấu trúc:** chuyển `MEDIBOOK_*.md`, `PROJECT_*.md` vào `docs/`; chuyển `test_*.js` vào `tests/`.

---

## 10. Phạm vi đã quét & giới hạn

| Khu vực | Mức |
|---|---|
| Toàn bộ 99 file tracked (băm SHA256, nhóm trùng) | Sâu |
| `public/assets/*` (tham chiếu tĩnh + động + giá trị DB) | Sâu |
| `src/`, `views/` (grep ảnh, `console.log`, import/biến không dùng qua `tsc`) | Sâu |
| `dist/` | Sâu (xóa + so hash) |
| `package.json` dependencies | Sâu (6/6 đều được dùng) |
| `docs/`, `database/*.sql`, `.vscode/` | Chỉ liệt kê (bất khả xâm phạm) |
| `node_modules/`, `.git/` | Không quét |

**Giới hạn:** không đo Lighthouse; không có linter nên không có autofix Tầng C; giá trị ảnh trong DB chỉ quét cột chứa `assets/`, `.jpg`, `.png`, `.svg`.

---

## 11. HANDOFF CHO AI KHÁC

- **Tình trạng:** repo sạch; chỉ còn ignored hợp lệ (`.env`, `database/*.sqlite*`, `dist/`, `node_modules/`). Nhánh `cleanup/20261004` chỉ chứa báo cáo.
- **Cần người dùng quyết:** Q-01 (nén ảnh — hiệu quả lớn nhất), Q-02, Q-03, Q-05, Q-08.
- **Đừng xóa:** `doctor-*.jpg` (nạp động theo ID bác sĩ), `avatar-doctor*.svg` (DB), mọi `database/*`, `.env*`, lockfile.
- **Giữ repo sạch:** test luôn dùng `DATABASE_PATH` tạm; scratch ngoài repo; báo cáo vào `docs/`.
- **File lưu:** `D:\MediBook-cleanup-backup-20261004-0015.zip` — **không tự xóa**; giữ tới khi bạn chạy thử dự án kỹ.
