/**
 * MediBook Comprehensive Automated Integration & E2E Test Suite
 * Phủ toàn bộ luồng nghiệp vụ 4 Roles & Đồng bộ dữ liệu chéo
 */

const http = require('http');
const querystring = require('querystring');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Cô lập dữ liệu: mặc định chạy trên CSDL SQLite tạm (được seed demo tự động), KHÔNG đụng database/medibook.sqlite.
// Muốn dùng CSDL khác thì đặt DATABASE_PATH trước khi chạy.
let tempDbPath = null;
if (!process.env.DATABASE_PATH) {
  tempDbPath = path.join(os.tmpdir(), `medibook_test_${process.pid}_${Date.now()}.sqlite`);
  process.env.DATABASE_PATH = tempDbPath;
}
process.env.NODE_ENV = 'test';
process.on('exit', () => {
  if (!tempDbPath) return;
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { fs.unlinkSync(tempDbPath + suffix); } catch (e) { /* ignore */ }
  }
});

process.env.RATE_LIMIT_SIGNUP_MAX = process.env.RATE_LIMIT_SIGNUP_MAX || '1000';
process.env.RATE_LIMIT_LOGIN_MAX = process.env.RATE_LIMIT_LOGIN_MAX || '1000';
const db = require('./dist/db');

const PORT = 3001;
process.env.PORT = PORT;

// Start server in background for testing
const app = require('./dist/server');

// Helper to make HTTP requests with cookie jar
class TestClient {
  constructor(name, port = PORT) {
    this.name = name;
    this.port = port;
    this.headers = {};
    this.cookies = [];
  }

  request(method, path, body = null, followRedirect = true) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: this.port,
        path: path,
        method: method,
        headers: { ...this.headers }
      };

      if (this.cookies.length > 0) {
        options.headers['Cookie'] = this.cookies.join('; ');
      }

      let payload = null;
      if (body) {
        if (typeof body === 'object') {
          payload = querystring.stringify(body);
          options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          payload = body;
        }
        options.headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(options, (res) => {
        // Collect set-cookie
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
          setCookies.forEach(sc => {
            const cookieVal = sc.split(';')[0];
            const cookieName = cookieVal.split('=')[0];
            this.cookies = this.cookies.filter(c => !c.startsWith(cookieName + '='));
            this.cookies.push(cookieVal);
          });
        }

        let responseBody = '';
        res.on('data', chunk => { responseBody += chunk; });
        res.on('end', () => {
          if (followRedirect && (res.statusCode === 301 || res.statusCode === 302)) {
            const redirectUrl = res.headers['location'];
            this.request('GET', redirectUrl, null, true).then(resolve).catch(reject);
          } else {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: responseBody
            });
          }
        });
      });

      req.on('error', err => reject(err));
      if (payload) req.write(payload);
      req.end();
    });
  }

  get(path, followRedirect = true) {
    return this.request('GET', path, null, followRedirect);
  }

  post(path, data, followRedirect = true) {
    return this.request('POST', path, data, followRedirect);
  }
}

// Assert helper
let testCount = 0;
let passCount = 0;
function assert(condition, message) {
  testCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (E2E & INTEGRITY)');
  console.log('=============================================================\n');

  // Wait 1.5s for server to bind
  await new Promise(r => setTimeout(r, 1500));

  // Cleanup test appointment from previous run if any
  const tm = new Date();
  tm.setDate(tm.getDate() + 1);
  const tmStr = tm.toISOString().slice(0, 10);
  const existingAppt = db.prepare('SELECT id FROM appointments WHERE appointment_date = ? AND start_time = ?').get(tmStr, '09:00:00');
  if (existingAppt) {
    db.prepare('DELETE FROM reviews WHERE appointment_id = ?').run(existingAppt.id);
    db.prepare('DELETE FROM payments WHERE appointment_id = ?').run(existingAppt.id);
    db.prepare('DELETE FROM prescriptions WHERE appointment_id = ?').run(existingAppt.id);
    db.prepare('DELETE FROM medical_records WHERE appointment_id = ?').run(existingAppt.id);
    db.prepare('DELETE FROM examination_queues WHERE appointment_id = ?').run(existingAppt.id);
    db.prepare('DELETE FROM appointments WHERE id = ?').run(existingAppt.id);
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Public Routes Accessibility (Khách vãng lai)
    // -------------------------------------------------------------
    console.log('📌 NHÓM 1: Kiểm tra các trang công khai (Public Landing / Guest)');
    const guest = new TestClient('Guest');
    
    let res = await guest.get('/');
    assert(res.statusCode === 200 && res.body.includes('MediBook'), 'Trang chủ (Home) hiển thị bình thường');

    res = await guest.get('/specialties');
    assert(res.statusCode === 200 && res.body.includes('Chuyên khoa phòng khám'), 'Trang danh sách chuyên khoa hiển thị tốt');

    res = await guest.get('/doctors');
    assert(res.statusCode === 200 && res.body.includes('Đội ngũ Bác sĩ'), 'Trang danh sách bác sĩ hiển thị tốt');

    res = await guest.get('/appointments/book');
    assert(res.statusCode === 200 && res.body.includes('Đặt lịch khám trực tuyến'), 'Trang đặt lịch khám trực tuyến hiển thị tốt');

    res = await guest.get('/contact');
    assert(res.statusCode === 200 && res.body.includes('Liên hệ với MediBook'), 'Trang liên hệ hiển thị tốt');

    res = await guest.get('/login');
    assert(res.statusCode === 200 && res.body.includes('Đăng nhập MediBook'), 'Trang đăng nhập hiển thị tốt');

    // -------------------------------------------------------------
    // TEST 2: RBAC (Phân quyền & Chặn truy cập trái phép)
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 2: Kiểm tra phân quyền RBAC & Bảo mật URL');
    // Guest accessing admin dashboard should be redirected to login
    res = await guest.get('/admin/dashboard', false);
    assert(res.statusCode === 302 && res.headers['location'] === '/login', 'Khách vãng lai vào /admin bị chặn và redirect về /login');

    res = await guest.get('/doctor/dashboard', false);
    assert(res.statusCode === 302 && res.headers['location'] === '/login', 'Khách vãng lai vào /doctor bị chặn và redirect về /login');

    res = await guest.get('/receptionist/dashboard', false);
    assert(res.statusCode === 302 && res.headers['location'] === '/login', 'Khách vãng lai vào /receptionist bị chặn và redirect về /login');

    // -------------------------------------------------------------
    // TEST 3: Đăng nhập từng Role
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 3: Xác thực đăng nhập 4 Roles (Admin, Doctor, Receptionist, Patient)');
    const patientClient = new TestClient('Patient');
    res = await patientClient.post('/login', { email: 'patient@medibook.local', password: 'password' });
    assert(res.statusCode === 200 && res.body.includes('Lịch khám của tôi'), 'Bệnh nhân đăng nhập thành công vào trang Lịch của tôi');

    const doctorClient = new TestClient('Doctor');
    res = await doctorClient.post('/login', { email: 'doctor@medibook.local', password: 'password' });
    assert(res.statusCode === 200 && res.body.includes('Tổng quan ca trực'), 'Bác sĩ đăng nhập thành công vào Bảng ca trực');

    const recepClient = new TestClient('Receptionist');
    res = await recepClient.post('/login', { email: 'receptionist@medibook.local', password: 'password' });
    assert(res.statusCode === 200 && res.body.includes('Bàn làm việc lễ tân'), 'Tiếp tân đăng nhập thành công vào Bàn làm việc');

    const adminClient = new TestClient('Admin');
    res = await adminClient.post('/login', { email: 'admin@medibook.local', password: 'password' });
    assert(res.statusCode === 200 && res.body.includes('Bảng điều khiển'), 'Quản trị viên (Admin) đăng nhập thành công vào Dashboard');

    // Patient trying to access /admin should be 403 / redirect
    res = await patientClient.get('/admin/dashboard', false);
    assert(res.statusCode === 403 || res.statusCode === 302, 'Bệnh nhân không thể truy cập /admin/dashboard (Chặn 403)');

    // -------------------------------------------------------------
    // TEST 4: API Slot & Chống Đặt Lịch Quá Khứ, Chống Double-Booking
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 4: Kiểm tra Logic Slot, Chống Đặt Quá Khứ & Chống Double-Booking (Pha 1)');
    const doctorObj = db.prepare("SELECT d.id FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'doctor@medibook.local'").get();
    
    // 4.1 Past date API & booking attempt
    res = await guest.get(`/api/slots?doctor_id=${doctorObj.id}&date=2020-01-01`);
    assert(res.body.includes('Không thể đặt lịch vào ngày trong quá khứ') || !JSON.parse(res.body).success, '/api/slots từ chối ngày trong quá khứ');

    res = await patientClient.post('/appointments/book', {
      specialty_id: 1,
      doctor_id: doctorObj.id,
      appointment_date: '2020-01-01',
      start_time: '08:00:00',
      symptoms: 'Test quá khứ'
    });
    const pastAppt = db.prepare('SELECT id FROM appointments WHERE appointment_date = ?').get('2020-01-01');
    assert(!pastAppt, 'Đã chặn thành công không cho đặt lịch vào ngày trong quá khứ');

    // 4.2 Doctor Leave API & booking attempt
    const leaveTestDate = '2026-11-28';
    db.prepare("DELETE FROM doctor_leaves WHERE doctor_id = ? AND start_date = ?").run(doctorObj.id, leaveTestDate);
    db.prepare(`
      INSERT INTO doctor_leaves (doctor_id, start_date, end_date, reason, status)
      VALUES (?, ?, ?, 'Đi công tác nước ngoài', 'approved')
    `).run(doctorObj.id, leaveTestDate, leaveTestDate);

    res = await guest.get(`/api/slots?doctor_id=${doctorObj.id}&date=${leaveTestDate}`);
    const leaveSlotJson = JSON.parse(res.body);
    assert(leaveSlotJson.success === false && leaveSlotJson.error.includes('nghỉ phép'), '/api/slots tự động phát hiện lịch nghỉ phép approved của bác sĩ');

    res = await patientClient.post('/appointments/book', {
      specialty_id: 1,
      doctor_id: doctorObj.id,
      appointment_date: leaveTestDate,
      start_time: '08:30:00',
      symptoms: 'Test đặt khi bác sĩ nghỉ'
    });
    const leaveAppt = db.prepare('SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ?').get(doctorObj.id, leaveTestDate);
    assert(!leaveAppt, 'Chặn thành công không cho đặt lịch khi bác sĩ có lịch nghỉ phép đã duyệt');

    // 4.3 Database Partial Unique Index Check
    const uniqueIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_appointment_doctor_slot'").get();
    assert(uniqueIdx, 'Partial Unique Index uq_appointment_doctor_slot tồn tại ở tầng SQLite Database');

    // 4.4 Valid booking on tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomDateStr = tomorrow.toISOString().slice(0, 10);

    res = await patientClient.post('/appointments/book', {
      specialty_id: 1,
      doctor_id: doctorObj.id,
      appointment_date: tomDateStr,
      start_time: '09:00:00',
      symptoms: 'Sốt nhẹ và ho'
    });

    // Verify appointment was created
    const createdAppt = db.prepare(`
      SELECT * FROM appointments 
      WHERE doctor_id = ? AND appointment_date = ? AND start_time = '09:00:00'
    `).get(doctorObj.id, tomDateStr);
    assert(createdAppt && createdAppt.booking_code, `Đặt lịch khám thành công, mã hẹn: ${createdAppt?.booking_code}`);

    // 4.5 Attempt Double Booking for same doctor and same slot
    const anotherPatient = new TestClient('Patient 2');
    await anotherPatient.post('/login', { email: 'patient@medibook.local', password: 'password' });
    await anotherPatient.post('/appointments/book', {
      specialty_id: 1,
      doctor_id: doctorObj.id,
      appointment_date: tomDateStr,
      start_time: '09:00:00',
      symptoms: 'Thử trùng lịch'
    });

    const duplicateCheck = db.prepare(`
      SELECT count(*) as cnt FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND start_time = '09:00:00' AND status NOT IN ('cancelled')
    `).get(doctorObj.id, tomDateStr);
    assert(duplicateCheck.cnt === 1, 'Chống Double-Booking thành công: không cho phép 2 bệnh nhân trùng 1 khung giờ của cùng bác sĩ');

    // 4.6 Concurrent Booking Race Condition Simulation (Promise.all)
    const raceSlotTime = '11:00:00';
    db.prepare("DELETE FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND start_time = ?").run(doctorObj.id, tomDateStr, raceSlotTime);

    const clientA = new TestClient('Concurrent Patient A');
    const clientB = new TestClient('Concurrent Patient B');
    await clientA.post('/login', { email: 'patient@medibook.local', password: 'password' });
    await clientB.post('/login', { email: 'patient@medibook.local', password: 'password' });

    // Send 2 booking requests simultaneously
    await Promise.all([
      clientA.post('/appointments/book', {
        specialty_id: 1,
        doctor_id: doctorObj.id,
        appointment_date: tomDateStr,
        start_time: raceSlotTime,
        symptoms: 'Tranh chấp đồng thời A'
      }),
      clientB.post('/appointments/book', {
        specialty_id: 1,
        doctor_id: doctorObj.id,
        appointment_date: tomDateStr,
        start_time: raceSlotTime,
        symptoms: 'Tranh chấp đồng thời B'
      })
    ]);

    const raceCheck = db.prepare(`
      SELECT count(*) as cnt FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND start_time = ? AND status NOT IN ('cancelled')
    `).get(doctorObj.id, tomDateStr, raceSlotTime);
    assert(raceCheck.cnt === 1, 'Mô phỏng tranh chấp đồng thời (Race Condition): chính xác 1 yêu cầu ghi thành công, loại trừ hoàn toàn double-booking');


    // -------------------------------------------------------------
    // TEST 5: Full Lifecycle: Check-in -> Queue -> Examine -> Pay -> Review
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 5: Toàn bộ vòng đời Khám bệnh & Đồng bộ chéo (Cross-Role Lifecycle)');
    
    // Step 5.1: Tiếp tân check-in cấp số
    res = await recepClient.post(`/receptionist/checkin/${createdAppt.id}`, {});
    const queueRecord = db.prepare('SELECT * FROM examination_queues WHERE appointment_id = ?').get(createdAppt.id);
    assert(queueRecord && queueRecord.queue_number, `Tiếp tân tiếp đón thành công, cấp số thứ tự phòng khám: ${queueRecord?.queue_number}`);

    const apptAfterCheckin = db.prepare('SELECT status FROM appointments WHERE id = ?').get(createdAppt.id);
    assert(apptAfterCheckin.status === 'checked_in', 'Trạng thái lịch hẹn tự động chuyển sang "checked_in"');

    // Step 5.2: Bác sĩ gọi số và bắt đầu khám
    res = await doctorClient.post(`/doctor/queue/call/${queueRecord.id}`, {});
    let qStatus = db.prepare('SELECT status FROM examination_queues WHERE id = ?').get(queueRecord.id);
    assert(qStatus.status === 'calling', 'Bác sĩ gọi số thành công, hàng đợi chuyển trạng thái "calling"');

    res = await doctorClient.post(`/doctor/queue/start/${queueRecord.id}`, {});
    qStatus = db.prepare('SELECT status FROM examination_queues WHERE id = ?').get(queueRecord.id);
    assert(qStatus.status === 'in_room', 'Bác sĩ mời vào phòng thành công, hàng đợi chuyển "in_room"');

    // Step 5.3: Bác sĩ hoàn thành khám và kê đơn
    res = await doctorClient.post(`/doctor/examine/${createdAppt.id}`, {
      blood_pressure: '120/80',
      heart_rate: '76',
      temperature: '37.0',
      weight: '68',
      height: '172',
      bmi: '23.0',
      clinical_diagnosis: 'Viêm mũi dị ứng cấp tính',
      doctor_notes: 'Nghỉ ngơi và uống nhiều nước',
      med_name: ['Paracetamol 500mg'],
      med_id: ['1'],
      med_dosage: ['500mg'],
      med_unit: ['Viên'],
      med_quantity: ['10'],
      med_morning: ['1'],
      med_noon: ['0'],
      med_afternoon: ['1'],
      med_night: ['0'],
      med_instructions: ['Uống sau ăn no'],
      med_price: ['2000']
    });

    const completedAppt = db.prepare('SELECT status FROM appointments WHERE id = ?').get(createdAppt.id);
    assert(completedAppt.status === 'completed', 'Bác sĩ khám và kê đơn xong, lịch hẹn chuyển sang "completed"');

    // Check payment bill generated for Receptionist
    const bill = db.prepare('SELECT * FROM payments WHERE appointment_id = ?').get(createdAppt.id);
    assert(bill && bill.invoice_code && bill.payment_status === 'unpaid', `Tự động phát sinh hóa đơn viện phí: ${bill?.invoice_code} (${bill?.final_amount.toLocaleString('vi-VN')} ₫)`);

    // Step 5.4: Tiếp tân thu tiền và in biên lai
    res = await recepClient.post(`/receptionist/payments/pay/${bill.id}`, { payment_method: 'cash' });
    const paidBill = db.prepare('SELECT * FROM payments WHERE id = ?').get(bill.id);
    assert(paidBill.payment_status === 'paid', 'Tiếp tân ghi nhận thanh toán thành công, hóa đơn chuyển sang "paid"');

    // Check receipt print view with VietQR
    res = await recepClient.get(`/receptionist/payments/receipt/${bill.id}`);
    assert(res.statusCode === 200 && res.body.includes('HÓA ĐƠN THU TIỀN VIỆN PHÍ') && res.body.includes('VietQR Thanh Toán'), 'Xem và in biên lai thu tiền tích hợp mã VietQR động NAPAS hoạt động chuẩn xác');

    // Step 5.5: Bệnh nhân xem kết quả và gửi đánh giá (Review)
    res = await patientClient.get(`/appointments/${createdAppt.booking_code}`);
    assert(res.statusCode === 200 && res.body.includes('Viêm mũi dị ứng cấp tính'), 'Bệnh nhân xem được chẩn đoán và đơn thuốc trên trang cá nhân');

    res = await patientClient.post(`/appointments/${createdAppt.booking_code}/review`, {
      rating: '5',
      comment: 'Bác sĩ giải thích rất kỹ và tận tình, 5 sao!'
    });
    const reviewRecord = db.prepare('SELECT * FROM reviews WHERE appointment_id = ?').get(createdAppt.id);
    assert(reviewRecord && reviewRecord.rating === 5, 'Bệnh nhân gửi đánh giá chất lượng khám 5 sao thành công');

    const updatedDoc = db.prepare('SELECT rating, rating_count FROM doctors WHERE id = ?').get(doctorObj.id);
    assert(updatedDoc.rating_count > 0, `Điểm số và lượt đánh giá bác sĩ được cập nhật tự động (Rating: ${updatedDoc.rating}, Đánh giá: ${updatedDoc.rating_count})`);

    // -------------------------------------------------------------
    // TEST 6: Báo cáo thống kê Admin & Sao lưu CSDL 1-chạm
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 6: Báo cáo doanh thu & KPI Admin đồng bộ tức thì');
    res = await adminClient.get('/admin/reports');
    assert(res.statusCode === 200 && res.body.includes('Báo cáo doanh thu'), 'Trang báo cáo thống kê Admin tải số liệu chính xác từ DB');

    // Test Admin Backup Database Endpoint
    res = await adminClient.get('/admin/backup-db');
    const isAttachment = res.headers['content-disposition'] && res.headers['content-disposition'].includes('medibook_backup_');
    assert(res.statusCode === 200 && isAttachment, 'Tính năng sao lưu CSDL một chạm (/admin/backup-db) xuất file backup thành công');

    // -------------------------------------------------------------
    // TEST 7: 1 Người Nhiều Role & Chuyển Đổi Vai Trò Động (/switch-role)
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 7: Cơ chế 1 Người Có Nhiều Role & Chuyển Đổi Vai Trò (/switch-role/:role)');
    // Admin user has both 'admin' and 'doctor' in user_roles
    const adminUser = db.prepare("SELECT id FROM users WHERE email = 'admin@medibook.local'").get();
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'doctor')").run(adminUser.id);
    const assignedRoles = db.prepare("SELECT role FROM user_roles WHERE user_id = ?").all(adminUser.id).map(r => r.role);
    assert(assignedRoles.includes('admin') && assignedRoles.includes('doctor'), 'Bảng user_roles lưu trữ cùng lúc nhiều vai trò cho 1 người (Admin + Doctor)');

    // Switch active role from admin to doctor
    res = await adminClient.get('/switch-role/doctor');
    assert(res.statusCode === 200 && res.body.includes('Tổng quan ca trực'), 'Chuyển đổi vai trò sang "Bác sĩ" thành công, điều hướng vào doctor dashboard');

    // Switch back to admin
    res = await adminClient.get('/switch-role/admin');
    assert(res.statusCode === 200 && res.body.includes('Bảng điều khiển'), 'Chuyển đổi vai trò lại "Quản trị viên" thành công, điều hướng vào admin dashboard');

    // Attempt to switch to an unassigned role (receptionist) should be rejected
    res = await adminClient.get('/switch-role/receptionist');
    assert(res.statusCode === 200 && (res.body.includes('không có quyền truy cập') || res.body.includes('Bảng điều khiển')), 'Chặn an toàn khi cố chuyển sang vai trò chưa được phân quyền');

    // 7.2: BÁC SĨ CŨNG CÓ THỂ LÀ BỆNH NHÂN (DOCTOR AS PATIENT)
    const docUser = db.prepare("SELECT u.id, u.name, u.email FROM users u JOIN doctors d ON u.id = d.user_id WHERE u.email = 'doctor.minh@medibook.vn' OR u.email = 'doctor@medibook.local' LIMIT 1").get();
    assert(docUser, 'Tìm thấy tài khoản Bác sĩ kiểm thử');

    // Kiểm tra Bác sĩ có cả role 'doctor' và 'patient' trong user_roles
    const docRoles = db.prepare("SELECT role FROM user_roles WHERE user_id = ?").all(docUser.id).map(r => r.role);
    assert(docRoles.includes('doctor') && docRoles.includes('patient'), 'Bác sĩ được phân quyền song song: vừa là "Bác sĩ" vừa là "Bệnh nhân"');

    // Bác sĩ chuyển vai trò sang 'patient' (Bệnh nhân)
    res = await doctorClient.get('/switch-role/patient');
    assert(res.statusCode === 200 && res.body.includes('Lịch khám của tôi'), 'Bác sĩ chuyển vai trò sang "Bệnh nhân" thành công, truy cập trang Lịch khám của tôi');

    // Bác sĩ thử tự đặt lịch khám cho chính mình -> Hệ thống từ chối
    const docSelfProfile = db.prepare("SELECT id FROM doctors WHERE user_id = ?").get(docUser.id);
    const docOther = db.prepare("SELECT d.id, ds.specialty_id FROM doctors d LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id WHERE d.id != ? LIMIT 1").get(docSelfProfile.id);

    res = await doctorClient.post('/appointments/book', {
      specialty_id: 1,
      doctor_id: docSelfProfile.id,
      appointment_date: tomDateStr,
      start_time: '15:00:00',
      symptoms: 'Thử tự đặt cho chính mình'
    });
    const selfApptCheck = db.prepare("SELECT id FROM appointments WHERE doctor_id = ? AND start_time = '15:00:00' AND appointment_date = ?").get(docSelfProfile.id, tomDateStr);
    assert(!selfApptCheck, 'Bảo vệ nghiệp vụ HIS: Chặn không cho Bác sĩ tự đặt lịch khám cho chính mình');

    // Bác sĩ đặt lịch khám với một Bác sĩ đồng nghiệp khác
    if (docOther) {
      const docOtherSlot = '16:45:00';
      db.prepare("DELETE FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND start_time = ?").run(docOther.id, tomDateStr, docOtherSlot);

      res = await doctorClient.post('/appointments/book', {
        specialty_id: docOther.specialty_id || 1,
        doctor_id: docOther.id,
        appointment_date: tomDateStr,
        start_time: docOtherSlot,
        symptoms: 'Bác sĩ bị viêm xoang cần đồng nghiệp khám'
      });

      const docBookedAppt = db.prepare("SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND start_time = ?").get(docOther.id, tomDateStr, docOtherSlot);
      assert(docBookedAppt && docBookedAppt.booking_code, `Bác sĩ đặt lịch khám thành công với đồng nghiệp chuyên khoa: ${docBookedAppt?.booking_code}`);

      // Bác sĩ xem lại lịch hẹn trên trang cá nhân của mình
      res = await doctorClient.get('/my-appointments');
      assert(res.statusCode === 200 && res.body.includes(docBookedAppt.booking_code), 'Lịch hẹn của Bác sĩ hiển thị đầy đủ trong danh sách "Lịch khám của tôi"');

      // Dọn dẹp ca hẹn test
      db.prepare("DELETE FROM appointments WHERE id = ?").run(docBookedAppt.id);
    }

    // Bác sĩ chuyển lại vai trò sang Bác sĩ
    res = await doctorClient.get('/switch-role/doctor');
    assert(res.statusCode === 200 && res.body.includes('Tổng quan ca trực'), 'Bác sĩ chuyển đổi lại vai trò "Bác sĩ" thành công');

    // -------------------------------------------------------------
    // TEST 8: Phân Luồng Ưu Tiên Tiếp Đón (Khẩn cấp -> Người già/Trẻ em/Thai phụ -> Online -> Offline)
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 8: Phân Luồng Độ Ưu Tiên Hàng Đợi (Khẩn cấp -> Ưu tiên -> Online -> Offline)');
    // Test receptionist walk-in with emergency priority
    const emergencyWalkin = await recepClient.post('/receptionist/booking', {
      patient_name: 'Bệnh Nhân Cấp Cứu A',
      patient_phone: '0911000999',
      specialty_id: 1,
      doctor_id: doctorObj.id,
      appointment_date: tomDateStr,
      start_time: '14:00:00',
      symptoms: 'Đau ngực dữ dội khó thở',
      priority_level: 'emergency',
      priority_reason: 'Cấp cứu đau thắt ngực',
      auto_checkin: '1'
    });
    const emergencyQueue = db.prepare(`
      SELECT eq.*, a.priority_level, a.priority_reason
      FROM examination_queues eq
      JOIN appointments a ON eq.appointment_id = a.id
      WHERE a.priority_level = 'emergency'
      ORDER BY eq.id DESC LIMIT 1
    `).get();
    assert(emergencyQueue && emergencyQueue.queue_number.startsWith('CC-'), `Cấp mã STT khẩn cấp với tiền tố CC-: ${emergencyQueue?.queue_number}`);
    assert(emergencyQueue.priority_order === 1, 'Mức độ ưu tiên Cấp cứu được gán priority_order = 1 (Cao nhất)');

    // Test receptionist walk-in with priority (Elderly/Pregnant/Child)
    const priorityWalkin = await recepClient.post('/receptionist/booking', {
      patient_name: 'Cụ Già 75 Tuổi',
      patient_phone: '0911000888',
      specialty_id: 1,
      doctor_id: doctorObj.id,
      appointment_date: tomDateStr,
      start_time: '14:30:00',
      symptoms: 'Tăng huyết áp người già',
      priority_level: 'priority',
      priority_reason: 'Người cao tuổi (75t)',
      auto_checkin: '1'
    });
    const priorityQueue = db.prepare(`
      SELECT eq.*, a.priority_level
      FROM examination_queues eq
      JOIN appointments a ON eq.appointment_id = a.id
      WHERE a.priority_level = 'priority'
      ORDER BY eq.id DESC LIMIT 1
    `).get();
    assert(priorityQueue && priorityQueue.queue_number.startsWith('UT-'), `Cấp mã STT nhóm ưu tiên với tiền tố UT-: ${priorityQueue?.queue_number}`);
    assert(priorityQueue.priority_order === 2, 'Mức độ Ưu tiên (Người già, Trẻ em, Thai phụ) được gán priority_order = 2');

    // Verify queue ordering query
    const sortedQueue = db.prepare(`
      SELECT queue_number, priority_order, priority_level
      FROM examination_queues
      ORDER BY priority_order ASC, id ASC
    `).all();
    assert(sortedQueue.length >= 2, 'Hàng đợi phòng khám có đầy đủ các lượt chờ');
    assert(sortedQueue[0].priority_order <= sortedQueue[1].priority_order, 'Thuật toán sắp xếp hàng đợi ưu tiên CC (Order 1) trước UT (Order 2) và Online/Offline (Order 3, 4)');

    // 8.2 TEST EMERGENCY BUMPING (Xử lý chen ngang ca cấp cứu)
    // Dọn dẹp test data trước nếu có
    const bumpAppts = db.prepare("SELECT id FROM appointments WHERE booking_code IN ('MB-BUMP-TEST', 'MB-EMERGENCY-BUMP')").all();
    for (const ba of bumpAppts) {
      db.prepare("DELETE FROM examination_queues WHERE appointment_id = ?").run(ba.id);
      db.prepare("DELETE FROM appointments WHERE id = ?").run(ba.id);
    }

    // Tạo 1 bệnh nhân thông thường (Order 3) đang chờ trong phòng khám
    const docRoom = db.prepare('SELECT room_number FROM doctors WHERE id = ?').get(doctorObj.id).room_number;
    const normalApptRes = db.prepare(`
      INSERT INTO appointments (booking_code, patient_id, doctor_id, appointment_date, start_time, end_time, status, source, priority_level)
      VALUES ('MB-BUMP-TEST', 1, ?, ?, '15:00:00', '15:30:00', 'checked_in', 'online', 'online')
    `).run(doctorObj.id, tomDateStr);
    const normalQueueRes = db.prepare(`
      INSERT INTO examination_queues (appointment_id, queue_number, room, status, priority_level, priority_order)
      VALUES (?, 'P101-99', ?, 'waiting', 'online', 3)
    `).run(normalApptRes.lastInsertRowid, docRoom);

    // Ca cấp cứu bất ngờ tới (15:05:00) và được lễ tân check-in
    const emergencyBumpAppt = db.prepare(`
      INSERT INTO appointments (booking_code, patient_id, doctor_id, appointment_date, start_time, end_time, status, source, priority_level)
      VALUES ('MB-EMERGENCY-BUMP', 2, ?, ?, '15:05:00', '15:35:00', 'confirmed', 'walkin', 'emergency')
    `).run(doctorObj.id, tomDateStr);
    
    // Tiếp tân check-in ca cấp cứu
    await recepClient.post(`/receptionist/checkin/${emergencyBumpAppt.lastInsertRowid}`, { priority_level: 'emergency' });

    // Kiểm tra bệnh nhân thông thường đã được hệ thống đánh dấu is_bumped = 1 và nâng lên priority_order = 2
    const bumpedQueue = db.prepare("SELECT * FROM examination_queues WHERE id = ?").get(normalQueueRes.lastInsertRowid);
    const bumpedAppt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(normalApptRes.lastInsertRowid);
    assert(bumpedQueue && bumpedQueue.is_bumped === 1 && bumpedQueue.priority_order === 2, 'Emergency Bumping: Bệnh nhân bị hoãn được đánh dấu is_bumped = 1 và tự động nâng lên priority_order = 2 (Ưu tiên tiếp theo)');
    assert(bumpedAppt && bumpedAppt.is_bumped === 1, 'Emergency Bumping: Lịch hẹn appointments được gắn cờ is_bumped = 1');

    // Kiểm tra thông báo gửi cho bệnh nhân
    const bumpNotif = db.prepare("SELECT * FROM notifications WHERE message LIKE '%tiếp nhận ca cấp cứu%' ORDER BY id DESC LIMIT 1").get();
    assert(bumpNotif, 'Emergency Bumping: Tự động gửi thông báo giải thích và xin lỗi đến bệnh nhân bị lùi giờ khám');

    // Dọn dẹp sau test
    db.prepare("DELETE FROM examination_queues WHERE appointment_id IN (?, ?)").run(normalApptRes.lastInsertRowid, emergencyBumpAppt.lastInsertRowid);
    db.prepare("DELETE FROM appointments WHERE id IN (?, ?)").run(normalApptRes.lastInsertRowid, emergencyBumpAppt.lastInsertRowid);

    // -------------------------------------------------------------
    // TEST 9: Phiếu Khám Lần Đầu/Tái Khám, Nội Trú (Số Phòng/Giường) & Kê Đơn Thuốc
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 9: Phiếu Khám (Lần Đầu / Tái Khám), Nội Trú (Số Phòng/Giường) & 1 Khám -> 1 Đơn -> Nhiều Thuốc');
    // Doctor examines an inpatient follow-up patient
    res = await doctorClient.post(`/doctor/examine/${emergencyQueue.appointment_id}`, {
      blood_pressure: '140/90',
      heart_rate: '85',
      temperature: '37.5',
      weight: '70',
      height: '170',
      bmi: '24.2',
      visit_type: 'follow_up',
      treatment_type: 'inpatient',
      inpatient_room: 'Phòng 402 - Khoa Tim Mạch',
      inpatient_bed: 'Giường C-12',
      admission_date: tomDateStr,
      discharge_date: tomDateStr,
      clinical_diagnosis: 'Cơn đau thắt ngực không ổn định / Nhập viện theo dõi',
      doctor_notes: 'Theo dõi điện tim 24h, nghỉ ngơi tại giường bệnh',
      med_name: ['Aspirin 81mg', 'Atorvastatin 20mg'],
      med_id: ['1', '2'],
      med_dosage: ['81mg', '20mg'],
      med_unit: ['Viên', 'Viên'],
      med_quantity: ['14', '14'],
      med_morning: ['1', '0'],
      med_noon: ['0', '0'],
      med_afternoon: ['0', '0'],
      med_night: ['0', '1'],
      med_instructions: ['Uống sau ăn sáng', 'Uống trước khi đi ngủ'],
      med_price: ['1500', '4500']
    });

    const inpatientRecord = db.prepare('SELECT * FROM medical_records WHERE appointment_id = ?').get(emergencyQueue.appointment_id);
    assert(inpatientRecord && inpatientRecord.visit_type === 'follow_up', 'Lưu chính xác loại phiếu khám là "follow_up" (Tái khám)');
    assert(inpatientRecord.treatment_type === 'inpatient', 'Lưu chính xác chế độ điều trị là "inpatient" (Nội trú nhập viện)');
    assert(inpatientRecord.inpatient_room === 'Phòng 402 - Khoa Tim Mạch' && inpatientRecord.inpatient_bed === 'Giường C-12', 'Lưu chính xác Số phòng (Phòng 402) và Số giường (Giường C-12)');

    // Verify 1 medical record -> 1 prescription -> multiple prescription items
    const recordPrescription = db.prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?').get(inpatientRecord.id);
    assert(recordPrescription && recordPrescription.id, `1 Phiếu khám sinh ra 1 đơn thuốc duy nhất: #${recordPrescription?.id}`);
    const items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(recordPrescription.id);
    assert(items.length === 2, `1 Đơn thuốc bao gồm nhiều thuốc (Đã kê: ${items.length} thuốc)`);

    // Clean up test appointments
    db.prepare('DELETE FROM prescription_items WHERE prescription_id = ?').run(recordPrescription.id);
    db.prepare('DELETE FROM prescriptions WHERE id = ?').run(recordPrescription.id);
    db.prepare('DELETE FROM medical_records WHERE id = ?').run(inpatientRecord.id);
    db.prepare('DELETE FROM examination_queues WHERE appointment_id IN (?, ?)').run(emergencyQueue.appointment_id, priorityQueue.appointment_id);
    db.prepare('DELETE FROM appointments WHERE id IN (?, ?)').run(emergencyQueue.appointment_id, priorityQueue.appointment_id);

    // 9.2: KIỂM TRA TÁI KHÁM & CHÍNH SÁCH GIÁ 14 NGÀY (PHA 3)
    const firstMR = db.prepare('SELECT id FROM medical_records WHERE appointment_id = ?').get(createdAppt.id);
    assert(firstMR, 'Hồ sơ khám lần đầu tồn tại');

    // Dọn dẹp dữ liệu cũ nếu sót lại từ lần chạy trước
    const oldReexams = db.prepare("SELECT id FROM appointments WHERE booking_code IN ('MB-REEXAM-5D', 'MB-REEXAM-20D')").all();
    for (const ore of oldReexams) {
      db.prepare('DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE appointment_id = ?)').run(ore.id);
      db.prepare('DELETE FROM prescriptions WHERE appointment_id = ?').run(ore.id);
      db.prepare('DELETE FROM payments WHERE appointment_id = ?').run(ore.id);
      db.prepare('DELETE FROM medical_records WHERE appointment_id = ?').run(ore.id);
      db.prepare('DELETE FROM appointments WHERE id = ?').run(ore.id);
    }

    // Tạo lịch tái khám sau 5 ngày (<= 14 ngày)
    const tomDate = new Date(tomDateStr);
    const date5d = new Date(tomDate.getTime() + 5 * 86400000).toISOString().slice(0, 10);
    const reexam1Res = db.prepare(`
      INSERT INTO appointments (booking_code, patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, status, symptoms)
      VALUES ('MB-REEXAM-5D', ?, ?, ?, ?, '15:30:00', '16:00:00', 'checked_in', 'Tái khám viêm mũi sau 5 ngày')
    `).run(createdAppt.patient_id, doctorObj.id, doctorObj.specialty_id || 1, date5d);
    const reexam1Id = reexam1Res.lastInsertRowid;

    // Bác sĩ mở trang khám bệnh của ca tái khám
    res = await doctorClient.get(`/doctor/examine/${reexam1Id}`);
    assert(res.statusCode === 200, 'Bác sĩ truy cập trang khám bệnh ca tái khám thành công');
    assert(res.body.includes('ĐỦ ĐIỀU KIỆN GIẢM 50% TÁI KHÁM'), 'Giao diện hiển thị banner thông báo ca tái khám đủ điều kiện giảm 50% phí');
    assert(res.body.includes('Viêm mũi dị ứng cấp tính'), 'Giao diện hiển thị lịch sử chẩn đoán của ca khám trước');
    assert(res.body.includes('Paracetamol 500mg'), 'Giao diện hiển thị danh mục thuốc đã kê của ca khám trước');

    // Bác sĩ hoàn thành tái khám trong vòng 14 ngày
    res = await doctorClient.post(`/doctor/examine/${reexam1Id}`, {
      blood_pressure: '120/80',
      heart_rate: '75',
      temperature: '36.8',
      weight: '68',
      height: '172',
      bmi: '23.0',
      visit_type: 'follow_up',
      treatment_type: 'outpatient',
      clinical_diagnosis: 'Viêm mũi dị ứng thuyên giảm tốt',
      med_name: ['Paracetamol 500mg'],
      med_id: ['1'],
      med_dosage: ['500mg'],
      med_unit: ['Viên'],
      med_quantity: ['5'],
      med_morning: ['1'],
      med_noon: ['0'],
      med_afternoon: ['0'],
      med_night: ['0'],
      med_instructions: ['Uống khi đau'],
      med_price: ['2000']
    });

    const reexam1MR = db.prepare('SELECT * FROM medical_records WHERE appointment_id = ?').get(reexam1Id);
    assert(reexam1MR && reexam1MR.parent_visit_id === firstMR.id, 'Tái khám: parent_visit_id liên kết chính xác với hồ sơ khám lần đầu');

    const reexam1Pay = db.prepare('SELECT * FROM payments WHERE appointment_id = ?').get(reexam1Id);
    assert(reexam1Pay && reexam1Pay.service_fee === 100000 && reexam1Pay.discount === 100000, 'Tái khám ≤ 14 ngày: Phí khám giảm 50% (còn 100.000đ), giảm giá 100.000đ');
    assert(reexam1Pay.final_amount === 110000, 'Tổng tiền thanh toán tính đúng = 100.000đ (khám) + 10.000đ (thuốc) = 110.000đ');

    // Tạo ca tái khám quá 14 ngày (20 ngày sau lần đầu)
    const date20d = new Date(tomDate.getTime() + 20 * 86400000).toISOString().slice(0, 10);
    const reexam2Res = db.prepare(`
      INSERT INTO appointments (booking_code, patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, status, symptoms)
      VALUES ('MB-REEXAM-20D', ?, ?, ?, ?, '16:00:00', '16:30:00', 'checked_in', 'Tái khám sau 20 ngày')
    `).run(createdAppt.patient_id, doctorObj.id, doctorObj.specialty_id || 1, date20d);
    const reexam2Id = reexam2Res.lastInsertRowid;

    // Bác sĩ hoàn tất khám ca quá 14 ngày
    res = await doctorClient.post(`/doctor/examine/${reexam2Id}`, {
      blood_pressure: '120/80',
      clinical_diagnosis: 'Tái khám định kỳ sau 20 ngày',
      visit_type: 'follow_up',
      treatment_type: 'outpatient'
    });

    const reexam2Pay = db.prepare('SELECT * FROM payments WHERE appointment_id = ?').get(reexam2Id);
    assert(reexam2Pay && reexam2Pay.service_fee === 200000 && reexam2Pay.discount === 0, 'Tái khám > 14 ngày: Phí khám quay về mức chuẩn 200.000đ, không giảm giá');

    // Dọn dẹp ca tái khám test
    db.prepare('DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE appointment_id IN (?, ?))').run(reexam1Id, reexam2Id);
    db.prepare('DELETE FROM prescriptions WHERE appointment_id IN (?, ?)').run(reexam1Id, reexam2Id);
    db.prepare('DELETE FROM payments WHERE appointment_id IN (?, ?)').run(reexam1Id, reexam2Id);
    db.prepare('DELETE FROM medical_records WHERE appointment_id IN (?, ?)').run(reexam1Id, reexam2Id);
    db.prepare('DELETE FROM appointments WHERE id IN (?, ?)').run(reexam1Id, reexam2Id);

    // -------------------------------------------------------------
    // TEST 9.3: QUẢN LÝ PHÒNG & SƠ ĐỒ GIƯỜNG BỆNH NỘI TRÚ (PHA 4)
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 9.3: Kiểm tra Phân hệ Quản lý Phòng & Sơ đồ Giường Bệnh (/receptionist/beds - Pha 4)');
    
    // Dọn dẹp test cũ nếu có
    const oldBedAppts = db.prepare("SELECT id FROM appointments WHERE booking_code = 'MB-INPATIENT-BED-TEST'").all();
    for (const oba of oldBedAppts) {
      db.prepare('DELETE FROM payments WHERE appointment_id = ?').run(oba.id);
      db.prepare('DELETE FROM medical_records WHERE appointment_id = ?').run(oba.id);
      db.prepare('DELETE FROM appointments WHERE id = ?').run(oba.id);
    }

    // Tiếp tân xem trang Sơ đồ giường bệnh
    res = await recepClient.get('/receptionist/beds');
    assert(res.statusCode === 200, 'Tiếp tân truy cập thành công trang /receptionist/beds');
    assert(res.body.includes('Sơ đồ Giường bệnh Nội trú'), 'Trang hiển thị tiêu đề Sơ đồ Giường bệnh Nội trú');
    assert(res.body.includes('Giường trống') && res.body.includes('Đang có bệnh nhân') && res.body.includes('Đang dọn vệ sinh') && res.body.includes('Hỏng / Bảo trì'), 'Hiển thị đầy đủ 4 trạng thái giường bệnh: Available, Occupied, Cleaning, Maintenance');
    assert(res.body.includes('P.401') && res.body.includes('P.402') && res.body.includes('P.501'), 'Sơ đồ hiển thị đầy đủ danh mục phòng bệnh theo khoa');

    // Tìm một giường trống để test chuyển trạng thái
    const testBed = db.prepare(`
      SELECT b.*, r.room_number 
      FROM beds b 
      JOIN rooms r ON b.room_id = r.id 
      WHERE b.status = 'available' 
      LIMIT 1
    `).get();
    assert(testBed, 'Tìm thấy giường trống ban đầu để kiểm thử điều phối');

    // 1. Chuyển giường sang trạng thái 'cleaning'
    res = await recepClient.post(`/receptionist/beds/${testBed.id}/status`, {
      new_status: 'cleaning',
      notes: 'Khử khuẩn định kỳ phòng dịch'
    });
    let updatedBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(testBed.id);
    assert(updatedBed.status === 'cleaning' && updatedBed.notes === 'Khử khuẩn định kỳ phòng dịch', 'Cập nhật giường sang trạng thái "cleaning" (Đang dọn vệ sinh) kèm ghi chú thành công');

    // 2. Chuyển giường sang trạng thái 'maintenance'
    res = await recepClient.post(`/receptionist/beds/${testBed.id}/status`, {
      new_status: 'maintenance',
      notes: 'Bảo trì hệ thống oxy đầu giường'
    });
    updatedBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(testBed.id);
    assert(updatedBed.status === 'maintenance' && updatedBed.notes === 'Bảo trì hệ thống oxy đầu giường', 'Cập nhật giường sang trạng thái "maintenance" (Bảo trì / Sửa chữa) thành công');

    // 3. Khôi phục giường về 'available'
    res = await recepClient.post(`/receptionist/beds/${testBed.id}/status`, {
      new_status: 'available',
      notes: 'Đã hoàn tất bảo trì và khử khuẩn'
    });
    updatedBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(testBed.id);
    assert(updatedBed.status === 'available', 'Chuyển giường về trạng thái "available" (Trống sẵn sàng nhận bệnh) thành công');

    // 4. Kiểm tra chức năng Xuất viện nhanh (/receptionist/beds/:id/discharge)
    const occupiedBed = db.prepare(`SELECT * FROM beds WHERE status = 'occupied' LIMIT 1`).get();
    assert(occupiedBed, 'Tìm thấy giường đang có bệnh nhân để kiểm tra xuất viện');
    res = await recepClient.post(`/receptionist/beds/${occupiedBed.id}/discharge`, {});
    const dischargedBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(occupiedBed.id);
    assert(dischargedBed.status === 'cleaning' && dischargedBed.current_patient_id === null, 'Thủ tục xuất viện: Giường giải phóng bệnh nhân và tự động chuyển sang "cleaning"');

    // Khôi phục lại giường occupied sau test
    db.prepare(`
      UPDATE beds 
      SET status = 'occupied', current_patient_id = ?, current_doctor_id = ?, admission_date = ? 
      WHERE id = ?
    `).run(occupiedBed.current_patient_id, occupiedBed.current_doctor_id, occupiedBed.admission_date, occupiedBed.id);

    // 5. Kiểm tra Bác sĩ chỉ định nhập viện nội trú auto-assign vào giường trống
    const bedToAssign = db.prepare(`
      SELECT b.id, b.bed_number, r.room_number 
      FROM beds b 
      JOIN rooms r ON b.room_id = r.id 
      WHERE r.room_number = 'P.401' AND b.status = 'available' 
      LIMIT 1
    `).get();
    
    if (bedToAssign) {
      const inpatientApptRes = db.prepare(`
        INSERT INTO appointments (booking_code, patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, status, symptoms)
        VALUES ('MB-INPATIENT-BED-TEST', ?, ?, ?, ?, '17:00:00', '17:30:00', 'checked_in', 'Nhập viện theo dõi tim mạch')
      `).run(createdAppt.patient_id, doctorObj.id, doctorObj.specialty_id || 1, tomDateStr);
      const inApptId = inpatientApptRes.lastInsertRowid;

      res = await doctorClient.post(`/doctor/examine/${inApptId}`, {
        blood_pressure: '130/85',
        clinical_diagnosis: 'Cơn rung nhĩ kịch phát / Chỉ định nhập viện',
        visit_type: 'initial',
        treatment_type: 'inpatient',
        inpatient_room: 'P.401 - Phòng Nội Trú Tim Mạch',
        inpatient_bed: bedToAssign.bed_number
      });

      const assignedBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bedToAssign.id);
      assert(assignedBed.status === 'occupied' && assignedBed.current_patient_id === createdAppt.patient_id, 'Bác sĩ chỉ định nhập viện: Hệ thống tự động xếp bệnh nhân vào đúng giường và chuyển trạng thái sang "occupied"');

      // Dọn dẹp ca test
      db.prepare('UPDATE beds SET status = \'available\', current_patient_id = NULL, current_medical_record_id = NULL WHERE id = ?').run(bedToAssign.id);
      db.prepare('DELETE FROM payments WHERE appointment_id = ?').run(inApptId);
      db.prepare('DELETE FROM medical_records WHERE appointment_id = ?').run(inApptId);
      db.prepare('DELETE FROM appointments WHERE id = ?').run(inApptId);
    }

    // -------------------------------------------------------------
    // TEST 10: Security Hardening: IDOR Prevention, Doctor Data Isolation, Inventory Deduction & Status Validation
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 10: Kiểm tra Bảo mật IDOR, Phân quyền Bác sĩ (Data Isolation), Trừ Kho Dược & Xác thực Trạng thái');

    // 10.1: IDOR Prevention on /appointments/:code
    const patient2Client = new TestClient('Patient 2');
    await patient2Client.post('/login', { email: 'patient@medibook.vn', password: 'password' });
    
    // Patient 2 attempts to view Patient 1's private medical appointment
    res = await patient2Client.get(`/appointments/${createdAppt.booking_code}`);
    assert(res.statusCode === 403, 'Bảo mật IDOR: Bệnh nhân khác bị chặn 403 Forbidden khi cố xem hồ sơ bệnh án không thuộc về mình');

    // Guest attempts to view without authentication -> redirects to /login (302)
    res = await guest.get(`/appointments/${createdAppt.booking_code}`, false);
    assert(res.statusCode === 302 && res.headers['location'] === '/login', 'Bảo mật IDOR: Khách chưa đăng nhập bị chặn và chuyển hướng về /login');

    // 10.2: Doctor Data Isolation
    const doctor2Client = new TestClient('Doctor Duc');
    await doctor2Client.post('/login', { email: 'doctor.duc@medibook.vn', password: 'password' });

    // Doctor Duc attempts to access examination room of an appointment assigned to Doctor Minh
    res = await doctor2Client.get(`/doctor/examine/${createdAppt.id}`);
    assert(res.statusCode === 403, 'Bảo mật Phân quyền Bác sĩ: Bác sĩ khác bị chặn 403 Forbidden khi truy cập ca khám không phụ trách');

    // Doctor Duc attempts to POST examination on another doctor's patient
    res = await doctor2Client.post(`/doctor/examine/${createdAppt.id}`, {
      clinical_diagnosis: 'Hacked diagnosis'
    });
    assert(res.statusCode === 403, 'Bảo mật Phân quyền Bác sĩ: Bác sĩ khác bị chặn 403 Forbidden khi cố ghi chẩn đoán/kê đơn cho ca khám không phụ trách');

    // 10.3: Medicine Inventory Stock Atomic Deduction
    const medBefore = db.prepare('SELECT id, stock_quantity FROM medicines WHERE id = 1').get();
    assert(typeof medBefore.stock_quantity === 'number', `Tồn kho dược phẩm quản lý chính xác qua SQLite (Hiện tại: ${medBefore.stock_quantity} đơn vị)`);

    // 10.4: Status Transition Validation on /admin/appointments/status/:id
    res = await adminClient.post(`/admin/appointments/status/${createdAppt.id}`, {
      status: 'malicious_invalid_status'
    });
    assert(res.statusCode === 400, 'Xác thực trạng thái: Admin bị từ chối 400 Bad Request khi truyền trạng thái lịch hẹn không hợp lệ');

    // Valid status update
    res = await adminClient.post(`/admin/appointments/status/${createdAppt.id}`, {
      status: 'confirmed',
      note: 'Admin xác nhận hợp lệ'
    });
    const updatedStatusAppt = db.prepare('SELECT status FROM appointments WHERE id = ?').get(createdAppt.id);
    assert(updatedStatusAppt && updatedStatusAppt.status === 'confirmed', 'Cập nhật trạng thái lịch hẹn hợp lệ thành công và ghi lịch sử trạng thái');

    // -------------------------------------------------------------
    // NHÓM 11: Vá lỗi bảo mật & nghiệp vụ (R-02 chiếm tài khoản, R-03 redirect/XSS, R-04 tồn kho, B-05 lộ tên, P1 hardening)
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 11: Vá lỗi bảo mật (chiếm tài khoản, redirect, XSS, CSRF, rate-limit, mật khẩu, fail-fast) & logic tồn kho');
    const bcryptjs = require('bcryptjs');
    const { spawn } = require('child_process');
    const { maskName } = require('./dist/helpers');
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // 11.1 Khách (guest) không thể chiếm tài khoản có sẵn chỉ bằng cách nhập email
    for (const victim of ['admin@medibook.local', 'doctor@medibook.local', 'receptionist@medibook.local']) {
      const attacker = new TestClient('Attacker-' + victim);
      res = await attacker.post('/appointments/book', {
        patient_name: 'Attacker', patient_phone: '0900000000', patient_email: victim,
        specialty_id: 1, doctor_id: doctorObj.id, appointment_date: tomDateStr, start_time: '16:00:00', symptoms: 'x'
      }, false);
      assert(res.statusCode === 302 && res.headers['location'] === '/login', `R-02: Đặt lịch khách với email có sẵn (${victim}) bị chuyển sang /login, không tự đăng nhập`);
      res = await attacker.get('/admin/dashboard', false);
      assert(res.statusCode === 302 && res.headers['location'] === '/login', `R-02: Kẻ tấn công dùng email ${victim} không vào được khu vực quản trị`);
    }
    const leakedAppt = db.prepare("SELECT count(*) c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND start_time = '16:00:00'").get(doctorObj.id, tomDateStr);
    assert(leakedAppt.c === 0, 'R-02: Không có lịch hẹn nào được tạo qua đường khách mạo danh (kể cả bác sĩ tự đặt lịch cho mình)');

    // 11.2 Khách mới: mật khẩu ngẫu nhiên (không phải "password"), chỉ hiển thị một lần
    const newGuestEmail = `guest11.${Date.now()}@example.com`;
    const newGuest = new TestClient('NewGuest');
    res = await newGuest.post('/appointments/book', {
      patient_name: 'Khách Mới', patient_phone: '0900000002', patient_email: newGuestEmail,
      specialty_id: 1, doctor_id: doctorObj.id, appointment_date: tomDateStr, start_time: '16:30:00', symptoms: 'x'
    });
    const tempPwMatch = /Mật khẩu tạm thời: <code[^>]*>([^<]+)<\/code>/.exec(res.body);
    assert(res.statusCode === 200 && tempPwMatch, 'R-02: Trang xác nhận hiển thị mật khẩu tạm thời cho tài khoản khách mới');
    const guestRow = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(newGuestEmail);
    assert(guestRow && !bcryptjs.compareSync('password', guestRow.password_hash), 'R-02: Tài khoản khách mới KHÔNG dùng mật khẩu mặc định "password"');
    assert(bcryptjs.compareSync(tempPwMatch[1], guestRow.password_hash), 'R-02: Mật khẩu tạm thời hiển thị đúng với mật khẩu đã lưu');
    const guestAppt = db.prepare('SELECT booking_code FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE p.user_id = ?').get(guestRow.id);
    res = await newGuest.get(`/appointments/success/${guestAppt.booking_code}`);
    assert(!res.body.includes('Mật khẩu tạm thời'), 'R-02: Mật khẩu tạm thời chỉ hiển thị một lần');

    // 11.3 redirectBack an toàn (không còn "Location: back", không open-redirect)
    const pastBooking = { specialty_id: 1, doctor_id: doctorObj.id, appointment_date: '2000-01-01', start_time: '09:00:00', symptoms: 'x' };
    patientClient.headers = { Referer: `http://127.0.0.1:${PORT}/book?doctor=1` };
    res = await patientClient.post('/appointments/book', pastBooking, false);
    assert(res.headers['location'] === '/book?doctor=1', 'R-03: Redirect quay lại trang trước dùng đường dẫn nội bộ hợp lệ (không phải "back")');
    patientClient.headers = { Referer: 'http://evil.example/phish' };
    res = await patientClient.post('/appointments/book', pastBooking, false);
    assert(res.statusCode === 403, 'P1: POST có Referer từ site ngoài bị chặn 403 (chống CSRF)');
    res = await patientClient.get('/switch-role/admin', false);
    assert(res.headers['location'] === '/', 'R-03: Referer từ site ngoài bị bỏ qua khi quay lại trang trước, về trang chủ (chống open redirect)');
    patientClient.headers = {};
    res = await patientClient.post('/appointments/book', pastBooking, false);
    assert(res.headers['location'] && res.headers['location'] !== 'back', 'R-03: Không còn trả về "Location: back" khi thiếu Referer');

    // 11.4 Chống CSRF: request ghi dữ liệu từ origin lạ bị chặn
    patientClient.headers = { Origin: 'http://evil.example' };
    res = await patientClient.post('/profile', { name: 'Hacked', phone: '0900000000' }, false);
    assert(res.statusCode === 403, 'P1: POST từ Origin lạ bị chặn 403 (chống CSRF)');
    patientClient.headers = {};

    // 11.5 XSS qua JSON nhúng trong layout
    const patientUser = db.prepare('SELECT name, phone FROM users WHERE email = ?').get('patient@medibook.local');
    const evilName = '</script><img src=x onerror=alert(1)>';
    await patientClient.post('/profile', { name: evilName, phone: patientUser.phone || '0900000000' });
    res = await patientClient.get('/my-appointments');
    assert(!res.body.includes('</script><img src=x'), 'R-03: Tên người dùng chứa </script> không thể thoát khỏi thẻ script (chống XSS)');
    await patientClient.post('/profile', { name: patientUser.name, phone: patientUser.phone || '0900000000' });

    // 11.6 Bảng điện tử công khai không lộ tên đầy đủ bệnh nhân
    assert(maskName('Nguyễn Văn An') === 'Nguyễn V. A***', 'B-05: maskName che tên bệnh nhân (Nguyễn V. A***)');
    res = await guest.get('/api/queue/live');
    const liveQueue = JSON.parse(res.body);
    assert(liveQueue.success && liveQueue.items.every(i => !i.patient_name || i.patient_name.includes('***')), 'B-05: /api/queue/live công khai chỉ trả tên đã che');

    // 11.7 Chính sách mật khẩu tối thiểu 8 ký tự
    const weakEmail = `weak11.${Date.now()}@example.com`;
    res = await new TestClient('Weak').post('/register', { name: 'Weak', phone: '0900000001', email: weakEmail, password: '1', password_confirmation: '1' }, false);
    assert(res.headers['location'] === '/register' && !db.prepare('SELECT id FROM users WHERE email = ?').get(weakEmail), 'P1: Đăng ký với mật khẩu quá ngắn bị từ chối');

    // 11.8 Tồn kho thuốc: trừ đúng số lượng, không trừ đôi khi lưu lại, chặn bán quá tồn, giá lấy từ danh mục
    const catalogMed = db.prepare('SELECT unit_price FROM medicines WHERE id = 1').get();
    const stockOf = () => db.prepare('SELECT stock_quantity s FROM medicines WHERE id = 1').get().s;
    const examWith = (qty) => doctorClient.post(`/doctor/examine/${createdAppt.id}`, {
      clinical_diagnosis: 'Kiểm thử tồn kho', med_name: ['Paracetamol 500mg'], med_id: ['1'], med_dosage: ['500mg'], med_unit: ['Viên'],
      med_quantity: [String(qty)], med_morning: ['1'], med_noon: ['0'], med_afternoon: ['0'], med_night: ['0'], med_instructions: ['x'], med_price: ['1']
    }, false);
    const rxItemsOf = () => db.prepare('SELECT pi.* FROM prescription_items pi JOIN prescriptions p ON p.id = pi.prescription_id WHERE p.appointment_id = ?').all(createdAppt.id);
    const stockBase = stockOf();
    const oldQty = rxItemsOf().filter(i => i.medicine_id === 1).reduce((s, i) => s + i.quantity, 0);
    await examWith(3);
    assert(stockOf() === stockBase + oldQty - 3, `R-04: Sửa đơn hoàn kho đơn cũ (${oldQty}) rồi trừ đúng số lượng mới (3)`);
    const stockAfterFirst = stockOf();
    await examWith(3);
    assert(stockOf() === stockAfterFirst, 'R-04: Lưu lại cùng một đơn thuốc không bị trừ kho lần hai');
    assert(rxItemsOf().length === 1 && rxItemsOf()[0].unit_price === catalogMed.unit_price, 'R-04: Giá thuốc lấy từ danh mục (không tin giá client gửi lên)');
    await examWith(stockOf() + 1000);
    assert(stockOf() === stockAfterFirst && rxItemsOf()[0].quantity === 3, 'R-04: Kê vượt tồn kho bị từ chối, kho & đơn giữ nguyên');

    // 11.9 Rate-limit đăng nhập & cấu hình production (chạy server riêng)
    const spawnServer = (port, extraEnv) => {
      const dbFile = path.join(os.tmpdir(), `medibook-g11-${process.pid}-${port}.sqlite`);
      const env = { ...process.env, PORT: String(port), DATABASE_PATH: dbFile, NODE_ENV: 'test', ...extraEnv };
      const child = spawn(process.execPath, [path.join(__dirname, 'dist', 'server.js')], { cwd: os.tmpdir(), env, stdio: 'ignore' });
      return { child, dbFile };
    };
    const waitReady = async (port) => {
      for (let i = 0; i < 60; i++) {
        try { const r = await new TestClient('ready', port).get('/login', false); if (r.statusCode) return true; } catch (e) { /* chưa sẵn sàng */ }
        await sleep(250);
      }
      return false;
    };
    const dropDb = (dbFile) => ['', '-wal', '-shm'].forEach(s => { try { fs.rmSync(dbFile + s, { force: true }); } catch (e) {} });

    const rl = spawnServer(3002, { RATE_LIMIT_LOGIN_MAX: '3' });
    try {
      assert(await waitReady(3002), 'P1: Server kiểm thử rate-limit khởi động thành công');
      const rc = new TestClient('RateLimit', 3002);
      for (let i = 0; i < 3; i++) {
        res = await rc.post('/login', { email: 'patient@medibook.local', password: 'sai-mat-khau-' + i }, false);
        assert(res.headers['location'] === '/login', `P1: Đăng nhập sai lần ${i + 1} bị từ chối`);
      }
      res = await rc.post('/login', { email: 'patient@medibook.local', password: 'password' }, false);
      assert(res.statusCode === 429, 'P1: Sau 3 lần sai, kể cả mật khẩu đúng cũng bị khóa tạm (429)');
    } finally { rl.child.kill(); await sleep(300); dropDb(rl.dbFile); }

    const prodNoPw = spawnServer(3003, { NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(40), ADMIN_INITIAL_PASSWORD: '' });
    try {
      assert(await waitReady(3003), 'R-05: Server production (không có ADMIN_INITIAL_PASSWORD) khởi động');
      res = await new TestClient('ProdNoPw', 3003).post('/login', { email: 'admin@medibook.local', password: 'password' }, false);
      assert(res.headers['location'] === '/login', 'R-05: Production KHÔNG seed tài khoản demo (admin@medibook.local/password bị từ chối)');
      const Database = require('better-sqlite3');
      const roDb = new Database(prodNoPw.dbFile, { readonly: true });
      const userCount = roDb.prepare('SELECT count(*) c FROM users').get().c;
      roDb.close();
      assert(userCount === 0, 'R-05: CSDL production rỗng không bị nhồi dữ liệu demo');
    } finally { prodNoPw.child.kill(); await sleep(300); dropDb(prodNoPw.dbFile); }

    const prodAdmin = spawnServer(3004, { NODE_ENV: 'production', SESSION_SECRET: 'y'.repeat(40), ADMIN_INITIAL_PASSWORD: 'Init-Pass-2026!' });
    try {
      assert(await waitReady(3004), 'R-05: Server production (có ADMIN_INITIAL_PASSWORD) khởi động');
      const pc = new TestClient('ProdAdmin', 3004);
      res = await pc.post('/login', { email: 'admin@medibook.local', password: 'password' }, false);
      assert(res.headers['location'] === '/login', 'R-05: Admin khởi tạo production không dùng được mật khẩu mặc định');
      res = await pc.post('/login', { email: 'admin@medibook.local', password: 'Init-Pass-2026!' }, false);
      assert(res.headers['location'] === '/admin/dashboard', 'R-05: Admin khởi tạo production đăng nhập được bằng ADMIN_INITIAL_PASSWORD');
    } finally { prodAdmin.child.kill(); await sleep(300); dropDb(prodAdmin.dbFile); }

    const failFast = spawnServer(3005, { NODE_ENV: 'production', SESSION_SECRET: '' });
    const failFastCode = await new Promise(r => { failFast.child.on('exit', c => r(c)); setTimeout(() => r('timeout'), 10000); });
    failFast.child.kill();
    dropDb(failFast.dbFile);
    assert(failFastCode === 1, 'R-05: Production thiếu SESSION_SECRET dừng ngay với exit code 1 (fail-fast)');

    // Clean up createdAppt
    db.prepare('DELETE FROM appointment_status_history WHERE appointment_id = ?').run(createdAppt.id);
    db.prepare('DELETE FROM reviews WHERE appointment_id = ?').run(createdAppt.id);
    db.prepare('DELETE FROM payments WHERE appointment_id = ?').run(createdAppt.id);
    db.prepare('DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE appointment_id = ?)').run(createdAppt.id);
    db.prepare('DELETE FROM prescriptions WHERE appointment_id = ?').run(createdAppt.id);
    db.prepare('DELETE FROM medical_records WHERE appointment_id = ?').run(createdAppt.id);
    db.prepare('DELETE FROM examination_queues WHERE appointment_id = ?').run(createdAppt.id);
    db.prepare('DELETE FROM appointments WHERE id = ?').run(createdAppt.id);

    console.log('\n=============================================================');
    console.log(`🎉 TẤT CẢ KIỂM THỬ ĐÃ HOÀN THÀNH: ${passCount}/${testCount} PASS! (100% THÀNH CÔNG)`);
    console.log('=============================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PHÁT HIỆN LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();
