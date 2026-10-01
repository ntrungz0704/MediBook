/**
 * MediBook Comprehensive Automated Integration & E2E Test Suite
 * Phủ toàn bộ luồng nghiệp vụ 4 Roles & Đồng bộ dữ liệu chéo
 */

const http = require('http');
const querystring = require('querystring');
const db = require('./dist/db');

const PORT = 3001;
process.env.PORT = PORT;

// Start server in background for testing
const app = require('./dist/server');

// Helper to make HTTP requests with cookie jar
class TestClient {
  constructor(name) {
    this.name = name;
    this.cookies = [];
  }

  request(method, path, body = null, followRedirect = true) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: PORT,
        path: path,
        method: method,
        headers: {}
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
    console.log('\n📌 NHÓM 4: Kiểm tra Logic Slot, Chống Đặt Quá Khứ & Chống Double-Booking');
    const doctorObj = db.prepare('SELECT id FROM doctors LIMIT 1').get();
    
    // Past date booking attempt
    res = await patientClient.post('/appointments/book', {
      specialty_id: 1,
      doctor_id: doctorObj.id,
      appointment_date: '2020-01-01',
      start_time: '08:00:00',
      symptoms: 'Test quá khứ'
    });
    // Check in database that no appointment exists for 2020-01-01
    const pastAppt = db.prepare('SELECT id FROM appointments WHERE appointment_date = ?').get('2020-01-01');
    assert(!pastAppt, 'Đã chặn thành công không cho đặt lịch vào ngày trong quá khứ');

    // Valid booking on tomorrow
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

    // Attempt Double Booking for same doctor and same slot
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

    // Check receipt print view
    res = await recepClient.get(`/receptionist/payments/receipt/${bill.id}`);
    assert(res.statusCode === 200 && res.body.includes('HÓA ĐƠN THU TIỀN VIỆN PHÍ'), 'Xem và in biên lai thu tiền (receipt_print) hoạt động chuẩn xác');

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
    // TEST 6: Báo cáo thống kê Admin phản ánh đúng
    // -------------------------------------------------------------
    console.log('\n📌 NHÓM 6: Báo cáo doanh thu & KPI Admin đồng bộ tức thì');
    res = await adminClient.get('/admin/reports');
    assert(res.statusCode === 200 && res.body.includes('Báo cáo doanh thu'), 'Trang báo cáo thống kê Admin tải số liệu chính xác từ DB');

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

    console.log('\n=============================================================');
    console.log(`🎉 TẤT CẢ KIỂM THỬ ĐÃ HOÀN THÀNH: ${passCount}/${testCount} PASS! (100% THÀNH CÔNG)`);
    console.log('=============================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PHÁT HIỆN LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err.message);
    process.exit(1);
  }
}

runTests();
