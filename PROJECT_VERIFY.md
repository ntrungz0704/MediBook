# PROJECT_VERIFY.md — MediBook

> Kiểm chứng độc lập ngày 2026-10-04 · HEAD `bec294b` · Verifier KHÔNG sửa code dự án (chỉ ghi file này + `PROJECT_AUDIT.md`).
> Thí nghiệm phá code chỉ làm trên **bản clone tạm** (`%TEMP%\mb-verify-A`, đã `npm ci` sạch); các lần chạy server dùng **bản sao DB** (`VACUUM INTO`). Bằng chứng = diff/code thật (`file:dòng`) + lệnh tôi tự chạy; tóm tắt/commit message của agent chỉ được coi là *lời khai*.

---

## 1. Kết luận điều hành

**Phán quyết: TIN MỘT PHẦN** — nghiệp vụ lâm sàng tin được; độ an toàn và độ "chạy được từ clone sạch" **không** như báo cáo trước.

| Chỉ số | Giá trị |
|---|---|
| Tỷ lệ lời khai đúng | **68.8 %** (11 ✅ / 16 lời khai) |
| FALSE-CLAIM / REGRESSION | **1 / 0** |
| Điểm tin cậy báo cáo sửa | **40 / 100** |
| Tiến độ | báo cáo cũ khai **100 %** → thực tế **73.3 %** ước tính, **52.8 %** VERIFIED (−26.7 điểm % — do báo cáo cũ quá tay, không phải code thụt lùi) |

**Top 3 vấn đề nghiêm trọng**
1. ❌ **C-15**: "Bảo mật XUẤT SẮC / 100 % VERIFIED" là sai — chiếm tài khoản qua đặt lịch khách + mật khẩu mặc định `password` có từ commit đầu `6590313` (2026-09-27) và vẫn còn (`server.ts:720,1824`).
2. 🟠 **C-16**: "87/87 PASS" chỉ đúng với file SQLite local cũ (không nằm trong git). **Clone sạch → `npm ci` OK → `npm run build` OK → `npm test` FAIL ở assertion đầu tiên** (`SqliteError: no such column: status`). Lỗi có từ trước (xác nhận ở `d6c17ff`, `3f23b33`, `1135837`, `HEAD`): `db.ts` chưa bao giờ tạo `specialties.status/image`.
3. 🟠 **C-10 / C-12**: chặn bác sĩ tự đặt lịch bị **lách được** qua đường đặt lịch khách; "trừ kho nguyên tử" không có test bảo vệ (mutation xanh), không chặn hết hàng, và lưu lại đơn thuốc sẽ trừ kho lần nữa.

**Nên làm ngay:** R-01 (clone sạch phải chạy) → R-02 (đóng đường đặt lịch khách) → R-03/R-04.

---

## 2. Mốc so sánh

- **Trước sửa:** `d6c17ff` (2026-10-02, audit cũ khai 100 %) → `3f23b33` (hardening IDOR/kho/52 test) → `ede94ad`/`1135837` (W-01 env + verify cũ).
- **Sau sửa:** `bec294b` (HEAD). Phạm vi diff `1135837..HEAD`: 18 file, +2 687 / −187 (`src/server.ts` +760, `src/db.ts` +382, `test_full_suite.js` +359, `views/receptionist/beds.ejs` +447, 2 file `.md` mới).
- **Giới hạn lần verify:** không có môi trường production/HTTPS; không đo hiệu năng/a11y; test runner dừng ở lần fail đầu tiên nên mỗi mutation chỉ cho biết *assertion đầu tiên đỏ*; lần chạy `npm test` đầu tiên trong phiên (trước khi bắt đầu verify) đã ghi thêm dữ liệu thử vào `database/medibook.sqlite` local (file bị `.gitignore`, không ảnh hưởng git).

---

## 3. Bảng phán quyết từng lời khai

| C-xx | Mục gốc | Agent khai | Thực tế | Nhãn | Bằng chứng | Ghi chú |
|---|---|---|---|---|---|---|
| C-01 | B-01 (audit cũ) · `ede94ad` | Session secret đọc từ `.env`, production fail-fast | Đúng | ✅ CONFIRMED | `server.ts:27-38`; chạy `NODE_ENV=production` không `SESSION_SECRET` ⇒ exit 1 + thông báo FATAL; `.env` không tracked (`git ls-files` = 0) | Không có test bảo vệ: mutation M10 vẫn xanh → R-05 |
| C-02 | `db6b658` | Sửa khung giờ cho cả tuần | Đúng | ✅ CONFIRMED | `/api/slots` trả slot cho đủ 7 ngày T2→CN với 3 bác sĩ (kể cả Chủ nhật); `doctor_schedules` có đủ 7 ngày | Số slot T2 và CN của vài bác sĩ thấp hơn (8/7 vs 18) — nghi do dữ liệu đặt thử của test, chưa chứng minh |
| C-03 | `db6b658` | Trung tâm tin y tế + nút quay lại | Đúng | ✅ CONFIRMED | `/articles` 200, có nút/link quay lại, trang chủ link tới `/articles` | 0 test; `views/articles/detail.ejs:68` in raw `article.content` (chấp nhận nếu chỉ admin/seed nhập) |
| C-04 | `db6b658` | Tách cổng admin / lễ tân | Mới tách layout + chuyển hướng đăng nhập | 🟠 PARTIAL | `layouts/receptionist.ejs` mới; `server.ts:311-319` chặn redirect chéo sau login; route lễ tân vẫn `requireRole('receptionist','admin')` | Admin vẫn vào được toàn bộ cổng lễ tân; không có test cho tách cổng |
| C-05 | `f4a369c` | Chống double-booking | Đúng, nhưng chỉ DB index thật sự chặn | ✅ CONFIRMED | `db.ts:457` unique partial index; M1a (bỏ check ở app) vẫn xanh = index đủ; M1b (bỏ cả index) ⇒ đỏ | Runner dừng ở assertion "index tồn tại" nên chưa thấy test hành vi đỏ riêng |
| C-06 | `f4a369c` | Emergency bumping | Đúng | ✅ CONFIRMED | `server.ts:1699-1730`; M7 ⇒ đỏ `Emergency Bumping…is_bumped = 1` | — |
| C-07 | `f4a369c` | Tái khám ≤14 ngày giảm 50 % | Đúng | ✅ CONFIRMED | `server.ts:1421-1447`; M5 ⇒ đỏ `Tái khám > 14 ngày…` | Phí gốc **hard-code 200 000** (`:1432`), không lấy từ `services.price` |
| C-08 | `f4a369c` | Ma trận giường nội trú | Đúng | ✅ CONFIRMED | `/receptionist/beds` 200; test nhóm 9.3 (11 assert chuyển trạng thái/xuất viện) PASS | Chưa mutation riêng |
| C-09 | `bec294b` | Bác sĩ đồng thời là bệnh nhân (đa role) | Đúng | ✅ CONFIRMED | Test nhóm 7 PASS; `/switch-role/*` smoke OK | — |
| C-10 | `bec294b` | Chặn bác sĩ tự đặt lịch cho mình | Chỉ chặn nhánh đã đăng nhập | 🟠 PARTIAL | `server.ts:697-701` có guard (M4 ⇒ đỏ) **nhưng** nhánh khách `:710-742` không có: probe POST `/appointments/book` (khách, email `doctor@medibook.local`, chính slot của bác sĩ 9) ⇒ 302 `/appointments/success/MB990302-2500`, DB có bản ghi `patient_user = 14 = doctor user` | Đóng cùng R-02 |
| C-11 | `3f23b33` | Chống IDOR + cô lập dữ liệu bác sĩ | Đúng | ✅ CONFIRMED | `server.ts:925-933,1318-1325`; M2 ⇒ đỏ, M3 ⇒ đỏ; M6 (bỏ RBAC) ⇒ đỏ | `res.status(403).redirect(...)` thực tế trả 302 (`:1246,1271,1296`, `middleware.ts:35`) — chỉ cosmetic |
| C-12 | `3f23b33` | Trừ kho thuốc nguyên tử | Có trừ, nhưng yếu | 🟠 PARTIAL | `server.ts:1554` `MAX(0, stock - ?)`; M8 (bỏ trừ kho) ⇒ **xanh** 87/87; test chỉ `assert(typeof stock === 'number')` (`test_full_suite.js:845`) | Không chặn kê quá tồn; nhánh cập nhật đơn (`:1525-1528`) xoá item rồi trừ lại **không hoàn kho** ⇒ trừ đôi (đọc code, chưa chạy); giá thuốc lấy từ form (`prices[i]`, `:1544`) |
| C-13 | audit cũ | 100 % prepared statement, không SQLi | Đúng | ✅ CONFIRMED | Quét: 0 chuỗi SQL dùng `${}` trong `server.ts` (`residue.js`) | — |
| C-14 | audit cũ | Không còn dependency thừa | Đúng | ✅ CONFIRMED | `npm ls --depth=0`: 6 runtime dep, đều được import/dùng (express, express-session, connect-flash, bcryptjs, better-sqlite3, ejs); `npm ci` ⇒ 0 vulnerabilities | — |
| C-15 | audit cũ | "Bảo mật XUẤT SẮC, 100 % VERIFIED" | Sai | ❌ FALSE-CLAIM | Probe: ATO admin/doctor/lễ tân (`server.ts:718-741`), mật khẩu mặc định `password` (`:720,1824`), 15 lần login sai không bị chặn, XSS tên (`main.ejs:243`), `redirect('back')` ×14 hỏng; `git log -S` ⇒ có từ `6590313` | Chi tiết ở `PROJECT_AUDIT.md` §5–6 |
| C-16 | commit `3f23b33`…`bec294b` | "52/52 → 87/87 PASS, 100 % thành công" | Chỉ đúng trên DB local cũ | 🟠 PARTIAL | 3 lần chạy trên bản sao DB local: 87/87 PASS, không flaky. Clone sạch: FAIL ngay (`no such column: status`) | Xem R-01 |

---

## 4. Chênh lệch diff

- **Scope creep (đổi ngoài mục khai):** `db6b658` gộp 3 việc không liên quan (slot cả tuần + hub tin tức + tách cổng) trong 1 commit; `f4a369c` gộp 4 tính năng. Không có commit nào sửa mục B-02 (webhook VietQR) — đúng vì đã hoãn P3.
- **File đổi không khai:** `database/schema.sql` +21 dòng ở các commit này **nhưng vẫn là dialect MySQL** → sửa cho tài liệu, không cải thiện khả năng chạy.
- **Số liệu khai vs thật:** audit cũ khai `server.ts` 2 220 dòng / 45 view / 52 test / 90 endpoint; hiện tại 2 788 dòng / 48 view dry-run PASS (`test_render_views.js`) / 87 test (`assert(` call = 87, khớp 87 PASS) — số liệu cũ đã lỗi thời, không phải gian lận.
- **Test bị sửa cho dễ pass?** Không thấy dấu hiệu (không `skip/only/todo`: 0).

---

## 5. Quét tồn dư (Phase 2)

| Mẫu | Kết quả |
|---|---|
| `console.log/debug` | 4 (banner khởi động `server.ts:2780-2783`) — chấp nhận |
| `debugger`, `@ts-ignore`, `eval(`, `TODO|FIXME|HACK` | 0 |
| `as any` | 47 (`strict:false`) |
| `redirect('back')` | **14** (`server.ts:700,715,751,762,844,848,…`) — hỏng trên Express 5 |
| `hashSync('password'` | **2** (`server.ts:720` khách, `:1824` lễ tân đặt hộ) |
| `res.status(403).redirect` | 4 (thực tế 302) |
| SQL nối chuỗi | 0 |
| `.env`/`.sqlite`/khoá bị track | 0 |
| File 0-byte | 0 |
| `<%-` in raw trong views | 26 (badge helpers, layout body, `main.ejs:243`, `articles/detail.ejs:68`) |

---

## 6. Kết quả chạy lại (Phase 3)

| Bước | Kết quả |
|---|---|
| `git clone` + `npm ci` | ✅ 130 package, 0 vulnerabilities, lockfile không đổi |
| `npm run build` (tsc) | ✅ 0 lỗi |
| `npm test` trên **clone sạch** (DB mới) | ❌ FAIL tại "Trang chủ hiển thị bình thường": `SqliteError: no such column: status`; DB mới `users=0`, `specialties` thiếu `image,status` |
| `npm test` ×3 trên **bản sao DB local** (mỗi lần DB mới) | ✅ 87/87, 87/87, 87/87 — không flaky |
| `node test_render_views.js` | ✅ 48 PASS / 0 FAIL (nhưng mock thủ công, hard-code `D:/MediBook`) |
| Smoke route (51 path / 4 vai trò) | ✅ 0 NOK; RBAC âm: patient→admin/doctor/receptionist/backup = 302 `/`; anon→`/login` |
| Production không `SESSION_SECRET` | ✅ exit 1 |
| Migration trên DB trống | ❌ xem trên (schema code ≠ schema code truy vấn); `seed.sql` lỗi `no column named image` |
| Lint / coverage | Không có |

---

## 7. Chất lượng test (Phase 4)

**Số liệu:** 1 file test chính, 87 `assert(` (khớp 87 PASS), 0 `skip/only/todo`, 1 assertion chỉ kiểm kiểu (`typeof`). Test dùng HTTP thật + SQLite thật (không mock xác thực) — tốt. Điểm yếu: dùng DB thật mặc định; runner **dừng ở assertion đầu tiên đỏ**; phụ thuộc DB local cũ; 0 test cho admin CRUD POST, hồ sơ, xin nghỉ phép, live board, tin tức.

| Mục | Phá cái gì (trên bản clone) | Test có đỏ? | Kết luận |
|---|---|---|---|
| C-05 | M1a: bỏ check trùng slot ở app | Xanh | App-check thừa; DB index đủ chặn (tốt, phòng thủ chiều sâu) |
| C-05 | M1b: M1a + bỏ UNIQUE index | **Đỏ** (`Partial Unique Index … tồn tại`) | Bảo vệ, nhưng bằng assertion "index tồn tại" |
| C-11 | M2: bỏ chặn IDOR lịch khám | **Đỏ** | Test mạnh |
| C-11 | M3: bỏ cô lập bác sĩ | **Đỏ** | Test mạnh |
| C-10 | M4: bỏ chặn bác sĩ tự đặt lịch | **Đỏ** | Test mạnh — nhưng chỉ phủ nhánh đã đăng nhập |
| C-07 | M5: giảm giá cho mọi khoảng ngày | **Đỏ** | Test mạnh |
| C-11 | M6: `requireRole` luôn cho qua | **Đỏ** (pass=13) | Test mạnh |
| C-06 | M7: bumping không tìm ra ca | **Đỏ** | Test mạnh |
| C-12 | M8: bỏ trừ kho thuốc | **Xanh** 87/87 | ⚠ **Test vô giá trị** cho kho |
| C-02/Core | M9: bỏ chặn nghỉ phép | **Đỏ** | Test mạnh |
| C-01 | M10: bỏ fail-fast `SESSION_SECRET` | **Xanh** | ⚠ Không test cho cấu hình production |

---

## 8. Smoke test luồng sống còn (Phase 5)

| Luồng | Đường đúng | Đường sai | Kết quả |
|---|---|---|---|
| Đăng nhập/RBAC | `patient@medibook.local`/`password` → `/my-appointments` | sai mật khẩu ×15; patient→`/admin/*` | ✅ đúng / ⚠ **không giới hạn thử sai**; RBAC chặn đúng |
| Đặt lịch (đã đăng nhập) | Test nhóm 4 | trùng slot, nghỉ phép, quá khứ | ✅ (test) |
| Vòng đời khám (đặt→check-in→khám→thu tiền→đánh giá) | Test nhóm 5 | IDOR, bác sĩ khác (nhóm 10) | ✅ (test) |
| Đặt lịch **khách** | Tạo tài khoản mới + auto-login | email đã tồn tại (admin/doctor/lễ tân) | ❌ **đăng nhập vào tài khoản nạn nhân**; bác sĩ tự đặt lịch được |
| Bảng gọi số công khai | `/api/queue/live` | — | ⚠ 200 không cần đăng nhập (PII) |
| Clone sạch | `npm ci && build && test` | — | ❌ trang chủ lỗi |

---

## 9. Regression & tác dụng phụ (Phase 6)

- Chức năng đã ✅ ở audit cũ **không thụt lùi**: 87/87 (nhiều hơn 52) + 51/51 route trên DB local; không thấy lỗi mới do 3 commit gần nhất.
- Lỗi **tồn tại từ trước, không phải regression**: ATO + mật khẩu mặc định (từ `6590313`), `redirect('back')` (từ commit đầu), schema thiếu cột (xác nhận ở 4 commit mốc).
- **Tác dụng phụ bảo mật mới do thêm tính năng:** nhánh khách tạo thêm 1 đường lách guard "bác sĩ tự đặt lịch" (C-10); tính năng giường nội trú/live board thêm bề mặt PII công khai.
- Điểm Chất lượng & rủi ro: audit cũ chấm Bảo mật/Toàn vẹn/Hiệu năng/UX/Bảo trì đều 🟢; audit mới: Bảo mật 🔴 (xác thực/CSRF/XSS), Dữ liệu 🟡, Vận hành 🟡, Bảo trì 🟠.

---

## 10. Điểm số

| Nhãn | Số lời khai | Điểm | Tổng |
|---|---|---|---|
| ✅ | 11 (C-01,02,03,05,06,07,08,09,11,13,14) | 1.0 | 11.0 |
| 🟡 | 0 | 0.7 | 0 |
| 🟠 | 4 (C-04,10,12,16) | 0.4 | 1.6 |
| ❌ | 1 (C-15) | 0 | 0 |
| 🔴 | 0 | −0.5 | 0 |

- **Tỷ lệ lời khai đúng** = (✅ 11 + 🟡 0) / 16 = **68.8 %**. Điểm theo trọng số nhãn = 12.6 / 16 = 78.8 %.
- **Điểm tin cậy** = 68.8 − 10 (1 FALSE-CLAIM) − 9 (3 điểm yếu test: kho, fail-fast, runner dừng sớm) − 10 (clone sạch không chạy) ≈ **40 / 100**.
- **Tiến độ dự án sau sửa** (cùng công thức/trọng số audit): **73.3 %** ước tính (26.4/36), **52.8 %** VERIFIED; so với "100 %" ở audit cũ: **−26.7 điểm %** (điều chỉnh về sự thật).
- **Kết luận: TIN MỘT PHẦN.**

---

## 11. Việc còn phải làm (R-xx)

**R-01 (P0, M) — Clone sạch phải chạy & test được**
- Hiện trạng: 🟠 C-16; `src/db.ts` (`CREATE TABLE specialties` không có `image,status`), `database/schema.sql`+`seed.sql` là MySQL, `server.ts:132` truy vấn `status`.
- Việc: thêm cột thiếu vào `initDb()` (mọi bảng/cột code dùng), seed SQLite hợp lệ (script/`users=0`), bỏ SQL MySQL; cho test dùng `DATABASE_PATH` tạm.
- Hoàn thành: clone sạch → `npm ci && npm run build && npm test` = 87/87 PASS; không đụng `database/medibook.sqlite`.
- Phụ thuộc: B-02 (audit). Không sửa: logic nghiệp vụ, unique index slot.

**R-02 (P0, M) — Đóng đường đặt lịch khách (ATO, mật khẩu mặc định, lách guard bác sĩ)**
- Hiện trạng: ❌/🟠 C-15, C-10; `server.ts:710-742`, `:1824`.
- Việc: không auto-login user đã tồn tại; bỏ `hashSync('password')` (cả `:1824`); áp guard "bác sĩ không tự đặt" cho mọi nhánh.
- Hoàn thành: test mới — khách dùng email admin/doctor ⇒ không có session; đăng nhập `password` với tài khoản vừa tạo thất bại; bác sĩ (khách) đặt slot của mình ⇒ bị từ chối.
- Phụ thuộc: B-01 (audit).

**R-03 (P0, S) — Sửa `res.redirect('back')` ×14 và XSS `main.ejs:243`** (audit B-03/B-04). Hoàn thành: không còn `redirect('back')`; payload `</script><img onerror>` được escape.

**R-04 (P1, M) — Kho thuốc đúng nghĩa**
- Hiện trạng: 🟠 C-12; `server.ts:1523-1556`.
- Việc: bọc trong transaction, chặn kê quá tồn, hoàn kho khi sửa đơn, lấy giá từ `medicines.unit_price` thay vì form.
- Hoàn thành: test kiểm tồn trước/sau (giảm đúng `q`), sửa đơn không trừ đôi, kê quá tồn bị từ chối; mutation M8 phải **đỏ**.

**R-05 (P1, S) — Test cho cấu hình production & runner không dừng sớm**: test spawn `NODE_ENV=production` thiếu `SESSION_SECRET` ⇒ exit 1 (M10 đỏ); đổi `assert` thành thu thập lỗi, báo tổng kết cuối.

**R-06 (P1, S) — Tách cổng admin/lễ tân rõ ràng (C-04)**: quyết định admin có được vào `/receptionist/*` không; nếu không → bỏ `'admin'` khỏi `requireRole` ở route lễ tân và thêm test.

**R-07 (P2, S) — Phí khám lấy từ `services.price`** (`server.ts:1432`), không hard-code 200 000.

**R-08 (P2, S) — Trả đúng 403** thay vì `status(403).redirect` (`middleware.ts:35`, `server.ts:1246,1271,1296`).

---

## 12. Điều chưa chắc chắn (❓) & cách tự thử

- **Trừ kho lần 2 khi lưu lại đơn thuốc** (C-12) mới ở mức đọc code. Tự thử: khám xong 1 ca → mở lại `/doctor/examine/:id` → lưu lại cùng đơn → xem `medicines.stock_quantity` có giảm tiếp không.
- **Lệch số slot T2/CN** của vài bác sĩ (C-02): chưa phân biệt do lịch đặt thử hay do `doctor_schedules`; tự thử trên DB sạch sau R-01.
- **Production thật** (HTTPS, reverse proxy, cookie `secure`) chưa kiểm.
- Cách tự tái hiện nhanh lỗi clone sạch: `git clone <repo> x && cd x && npm ci && npm run build && npm test`.

---

## 13. HANDOFF CHO AI KHÁC

- **Tình trạng thật:** logic lâm sàng (đặt lịch, hàng đợi, khám, thu tiền, giường, IDOR) chạy đúng và có test mạnh **trên DB local cũ**; **clone sạch không chạy** (schema thiếu cột); bảo mật xác thực/phiên yếu.
- **Chắc chắn (✅):** C-01,02,03,05,06,07,08,09,11,13,14. **Chưa chắc:** C-04, C-10, C-12, C-16 (🟠); C-15 sai.
- **Thứ tự làm:** R-01 → R-02 → R-03 → R-04 → R-05 → R-06.
- **Giữ nguyên:** unique index `uq_appointment_doctor_slot` (`db.ts:457`), thuật toán hàng đợi ưu tiên/bumping, 87 test hiện có phải vẫn PASS (và chạy được trên clone sạch).
- **Cấm động tới:** `package-lock.json`, `.env*`, `database/medibook.sqlite*` (dữ liệu local), `docs/`.
- **Bản sao tạm của verifier:** `%TEMP%\mb-verify-A` (có thể xoá); script probe nằm ở thư mục scratch ngoài dự án.

> Câu dán kèm: *"Đọc PROJECT_VERIFY.md. Với mỗi mục R-xx (từ P0), viết cho tôi một prompt hoàn chỉnh để AI Agent sửa nốt, gồm bối cảnh, file liên quan, yêu cầu, tiêu chí hoàn thành kiểm tra được, và những gì KHÔNG được sửa."*
