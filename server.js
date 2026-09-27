const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./src/db');
const helpers = require('./src/helpers');
const { requireAuth, requireRole } = require('./src/middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session & Flash
app.use(session({
  secret: 'medibook-secret-key-node',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));
app.use(flash());

// Helper layout renderer for Express
function renderWithLayout(res, view, data = {}, layout = 'layouts/main') {
  res.render(view, data, (err, body) => {
    if (err) {
      console.error('Render error:', err);
      return res.status(500).send(err.message);
    }
    res.render(layout, { ...data, body });
  });
}

// Global locals middleware
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.flashSuccess = req.flash('success')[0] || null;
  res.locals.flashError = req.flash('error')[0] || null;
  res.locals.flashInfo = req.flash('info')[0] || null;
  res.locals.formatCurrency = helpers.formatCurrency;
  res.locals.formatDate = helpers.formatDate;
  res.locals.formatDateTime = helpers.formatDateTime;
  res.locals.getStatusBadge = helpers.getStatusBadge;
  res.locals.today = new Date().toISOString().slice(0, 10);
  next();
});

// Helper activity logging
function logActivity(userId, action, entityType, entityId, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
    const ua = req ? (req.headers['user-agent'] || '') : 'Node.js';
    db.prepare(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, action, entityType, entityId, ip, ua, details);
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

// ==========================================
// 1. PUBLIC ROUTES & HOME
// ==========================================
app.get('/', (req, res) => {
  const specialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active'`).all();
  const doctors = db.prepare(`
    SELECT d.*, u.name, u.email, u.avatar,
           GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
    GROUP BY d.id
  `).all();

  let upcomingAppointment = null;
  if (req.session.user && req.session.user.role === 'patient') {
    const patient = db.prepare(`SELECT id FROM patients WHERE user_id = ?`).get(req.session.user.id);
    if (patient) {
      upcomingAppointment = db.prepare(`
        SELECT a.*, s.name as specialty_name, srv.name as service_name,
               u.name as doctor_name, d.title as doctor_title, d.room_number
        FROM appointments a
        LEFT JOIN specialties s ON a.specialty_id = s.id
        LEFT JOIN services srv ON a.service_id = srv.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE a.patient_id = ? AND a.appointment_date >= date('now')
          AND a.status NOT IN ('cancelled', 'completed')
        ORDER BY a.appointment_date ASC, a.start_time ASC
        LIMIT 1
      `).get(patient.id);
    }
  }

  renderWithLayout(res, 'home/index', {
    pageTitle: 'MediBook - Đặt lịch khám và Quản lý phòng khám thông minh',
    specialties,
    doctors,
    upcomingAppointment
  });
});

// ==========================================
// 2. AUTHENTICATION (Login, Register, Logout)
// ==========================================
app.get('/login', (req, res) => {
  if (req.session.user) {
    return redirectByRole(res, req.session.user.role);
  }
  renderWithLayout(res, 'auth/login', { pageTitle: 'Đăng nhập - MediBook' });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Vui lòng nhập đầy đủ email và mật khẩu.');
    return res.redirect('/login');
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    req.flash('error', 'Email hoặc mật khẩu không chính xác.');
    return res.redirect('/login');
  }

  if (user.status !== 'active') {
    req.flash('error', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    return res.redirect('/login');
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
  };

  logActivity(user.id, 'USER_LOGIN', 'User', user.id, 'Đăng nhập thành công', req);
  req.flash('success', `Chào mừng trở lại, ${user.name}!`);

  const intended = req.session.intendedUrl;
  if (intended) {
    delete req.session.intendedUrl;
    return res.redirect(intended);
  }

  redirectByRole(res, user.role);
});

app.get('/register', (req, res) => {
  if (req.session.user) return redirectByRole(res, req.session.user.role);
  renderWithLayout(res, 'auth/register', { pageTitle: 'Đăng ký Bệnh nhân mới - MediBook' });
});

app.post('/register', (req, res) => {
  const { name, phone, email, password, password_confirmation } = req.body;
  if (!name || !phone || !email || !password) {
    req.flash('error', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
    return res.redirect('/register');
  }
  if (password !== password_confirmation) {
    req.flash('error', 'Mật khẩu xác nhận không khớp.');
    return res.redirect('/register');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
  if (existing) {
    req.flash('error', 'Email này đã tồn tại trên hệ thống.');
    return res.redirect('/register');
  }

  const hash = bcrypt.hashSync(password, 10);
  const insertUser = db.prepare(`
    INSERT INTO users (role, name, email, password_hash, phone, status)
    VALUES ('patient', ?, ?, ?, ?, 'active')
  `);
  const result = insertUser.run(name.trim(), email.trim(), hash, phone.trim());
  const newUserId = result.lastInsertRowid;

  // Create Patient record
  db.prepare(`INSERT INTO patients (user_id) VALUES (?)`).run(newUserId);

  logActivity(newUserId, 'PATIENT_REGISTER', 'User', newUserId, 'Đăng ký tài khoản bệnh nhân', req);

  req.session.user = {
    id: newUserId,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    role: 'patient'
  };

  req.flash('success', 'Đăng ký tài khoản bệnh nhân thành công!');
  res.redirect('/my-appointments');
});

app.get('/logout', (req, res) => {
  if (req.session.user) {
    logActivity(req.session.user.id, 'USER_LOGOUT', 'User', req.session.user.id, 'Đăng xuất', req);
  }
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

function redirectByRole(res, role) {
  switch (role) {
    case 'admin': return res.redirect('/admin/dashboard');
    case 'doctor': return res.redirect('/doctor/dashboard');
    case 'receptionist': return res.redirect('/receptionist/dashboard');
    default: return res.redirect('/my-appointments');
  }
}

// ==========================================
// 3. SPECIALTIES & DOCTORS PUBLIC & CONTACT
// ==========================================
app.get('/contact', (req, res) => {
  renderWithLayout(res, 'contact/index', { pageTitle: 'Liên hệ & Hỗ trợ - MediBook' });
});

app.post('/contact', (req, res) => {
  const { name, phone, email, subject, message } = req.body;
  if (!name || !phone || !email || !message) {
    req.flash('error', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
    return res.redirect('/contact');
  }

  logActivity(req.session.user ? req.session.user.id : null, 'CONTACT_SUBMIT', 'Contact', null, `Từ ${name} (${phone}) - Chủ đề: ${subject}`, req);
  req.flash('success', 'Cảm ơn bạn đã gửi liên hệ! Chuyên viên MediBook sẽ phản hồi trong ít phút.');
  res.redirect('/contact');
});

app.get('/specialties', (req, res) => {
  const specialties = db.prepare(`
    SELECT s.*, count(ds.doctor_id) as doctor_count
    FROM specialties s
    LEFT JOIN doctor_specialties ds ON s.id = ds.specialty_id
    WHERE s.status = 'active'
    GROUP BY s.id
  `).all();
  renderWithLayout(res, 'specialties/index', { pageTitle: 'Danh sách chuyên khoa - MediBook', specialties });
});

app.get('/specialties/:slug', (req, res) => {
  const specialty = db.prepare('SELECT * FROM specialties WHERE slug = ?').get(req.params.slug);
  if (!specialty) return res.status(404).render('errors/error', { message: 'Chuyên khoa không tồn tại' });

  const services = db.prepare(`SELECT * FROM services WHERE specialty_id = ? AND status = 'active'`).all(specialty.id);
  const doctors = db.prepare(`
    SELECT d.*, u.name, u.email, u.avatar
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN doctor_specialties ds ON d.id = ds.doctor_id
    WHERE ds.specialty_id = ?
  `).all(specialty.id);

  renderWithLayout(res, 'specialties/detail', {
    pageTitle: `${specialty.name} - Chuyên khoa MediBook`,
    specialty,
    services,
    doctors
  });
});

app.get('/doctors', (req, res) => {
  const { specialty_id } = req.query;
  const specialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active' ORDER BY name ASC`).all();

  let query = `
    SELECT d.*, u.name, u.email, u.avatar,
           GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
  `;

  let params = [];
  if (specialty_id) {
    query += ` WHERE d.id IN (SELECT doctor_id FROM doctor_specialties WHERE specialty_id = ?)`;
    params.push(specialty_id);
  }

  query += ` GROUP BY d.id ORDER BY d.id ASC`;

  const doctors = db.prepare(query).all(...params);
  renderWithLayout(res, 'doctors/index', {
    pageTitle: 'Đội ngũ bác sĩ chuyên khoa - MediBook',
    doctors,
    specialties,
    selectedSpecialtyId: specialty_id || ''
  });
});

app.get('/doctors/:id', (req, res) => {
  const doctor = db.prepare(`
    SELECT d.*, u.name, u.email, u.avatar,
           GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
    WHERE d.id = ?
    GROUP BY d.id
  `).get(req.params.id);

  if (!doctor) return res.status(404).render('errors/error', { message: 'Bác sĩ không tồn tại' });

  const schedules = db.prepare(`SELECT * FROM doctor_schedules WHERE doctor_id = ? AND status = 'active' ORDER BY day_of_week ASC`).all(doctor.id);
  const reviews = db.prepare(`
    SELECT r.*, u.name as reviewer_name
    FROM reviews r
    JOIN patients p ON r.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE r.doctor_id = ?
    ORDER BY r.created_at DESC
  `).all(doctor.id);

  renderWithLayout(res, 'doctors/detail', {
    pageTitle: `${doctor.title} ${doctor.name} - MediBook`,
    doctor,
    schedules,
    reviews
  });
});

// ==========================================
// 4. BOOKING WIZARD & AJAX API
// ==========================================
app.get(['/book', '/booking', '/appointments/book'], (req, res) => {
  const specialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active'`).all();
  const doctors = db.prepare(`
    SELECT d.*, u.name, u.email, u.avatar
    FROM doctors d
    JOIN users u ON d.user_id = u.id
  `).all();

  const selectedSpecialtyId = req.query.specialty_id || '';
  const selectedDoctorId = req.query.doctor_id || '';
  const selectedDate = req.query.date || new Date().toISOString().slice(0, 10);

  let patient = null;
  if (req.session.user && req.session.user.role === 'patient') {
    patient = db.prepare(`SELECT * FROM patients WHERE user_id = ?`).get(req.session.user.id);
  }

  renderWithLayout(res, 'appointments/book', {
    pageTitle: 'Đặt lịch khám trực tuyến - MediBook',
    specialties,
    doctors,
    selectedSpecialtyId,
    selectedDoctorId,
    selectedDate,
    patient
  });
});

// APIs for AJAX
app.get('/api/doctors/by-specialty/:specialtyId', (req, res) => {
  const doctors = db.prepare(`
    SELECT d.*, u.name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN doctor_specialties ds ON d.id = ds.doctor_id
    WHERE ds.specialty_id = ?
  `).all(req.params.specialtyId);
  res.json({ success: true, doctors });
});

app.get('/api/services/by-specialty/:specialtyId', (req, res) => {
  const services = db.prepare(`SELECT * FROM services WHERE specialty_id = ? AND status = 'active'`).all(req.params.specialtyId);
  res.json({ success: true, services });
});

app.get('/api/slots', (req, res) => {
  const doctorId = parseInt(req.query.doctor_id);
  const date = req.query.date;

  if (!doctorId || !date) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin bác sĩ hoặc ngày' });
  }

  const dObj = new Date(date);
  const dayOfWeek = dObj.getDay(); // 0 = Sunday .. 6 = Saturday

  const schedule = db.prepare(`
    SELECT * FROM doctor_schedules 
    WHERE doctor_id = ? AND day_of_week = ? AND status = 'active'
  `).get(doctorId, dayOfWeek);

  if (!schedule) {
    return res.json({ success: false, error: 'Bác sĩ không có lịch trực vào ngày này.', slots: [] });
  }

  const booked = db.prepare(`
    SELECT start_time, end_time FROM appointments
    WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled')
  `).all(doctorId, date);

  // Generate slots
  const slots = [];
  const [startH, startM] = schedule.start_time.split(':').map(Number);
  const [endH, endM] = schedule.end_time.split(':').map(Number);

  let curMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const dur = schedule.slot_duration || 30;

  while (curMinutes + dur <= endMinutes) {
    const sH = String(Math.floor(curMinutes / 60)).padStart(2, '0');
    const sM = String(curMinutes % 60).padStart(2, '0');
    const eH = String(Math.floor((curMinutes + dur) / 60)).padStart(2, '0');
    const eM = String((curMinutes + dur) % 60).padStart(2, '0');

    const slotStart = `${sH}:${sM}:00`;
    const slotEnd = `${eH}:${eM}:00`;
    const display = `${sH}:${sM} - ${eH}:${eM}`;

    // check collision
    const isBooked = booked.some(b => {
      return (slotStart < b.end_time && slotEnd > b.start_time);
    });

    slots.push({
      start_time: slotStart,
      end_time: slotEnd,
      display: display,
      available: !isBooked
    });

    curMinutes += dur;
  }

  res.json({ success: true, slots });
});

// Book Appointment POST
app.post('/appointments/book', (req, res) => {
  const { specialty_id, doctor_id, service_id, appointment_date, start_time, symptoms } = req.body;

  let patientId = null;

  if (req.session.user && req.session.user.role === 'patient') {
    let pat = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.session.user.id);
    if (!pat) {
      const pRes = db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(req.session.user.id);
      patientId = pRes.lastInsertRowid;
    } else {
      patientId = pat.id;
    }
  } else {
    // Guest auto registration
    const { patient_name, patient_phone, patient_email } = req.body;
    if (!patient_name || !patient_phone || !patient_email) {
      req.flash('error', 'Vui lòng cung cấp đầy đủ thông tin người khám bệnh.');
      return res.redirect('back');
    }

    let user = db.prepare('SELECT id FROM users WHERE email = ?').get(patient_email.trim());
    if (!user) {
      const hash = bcrypt.hashSync('password', 10);
      const uRes = db.prepare(`
        INSERT INTO users (role, name, email, password_hash, phone, status)
        VALUES ('patient', ?, ?, ?, ?, 'active')
      `).run(patient_name.trim(), patient_email.trim(), hash, patient_phone.trim());
      user = { id: uRes.lastInsertRowid };
      db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(user.id);
    }
    const pat = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
    patientId = pat.id;

    // Log the user in
    req.session.user = {
      id: user.id,
      name: patient_name.trim(),
      email: patient_email.trim(),
      phone: patient_phone.trim(),
      role: 'patient'
    };
  }

  // Calculate end_time (30 mins after start_time)
  const [sH, sM] = start_time.split(':').map(Number);
  const endMinutes = sH * 60 + sM + 30;
  const eH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const eM = String(endMinutes % 60).padStart(2, '0');
  const end_time = `${eH}:${eM}:00`;

  // Generate unique booking code
  const codeDate = appointment_date.replace(/-/g, '').slice(2);
  const randNum = String(Math.floor(1000 + Math.random() * 9000));
  const bookingCode = `MB${codeDate}-${randNum}`;

  try {
    const insertApp = db.prepare(`
      INSERT INTO appointments (booking_code, patient_id, doctor_id, specialty_id, service_id, appointment_date, start_time, end_time, status, symptoms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
    `);
    const appResult = insertApp.run(
      bookingCode, patientId, doctor_id, specialty_id || null, service_id || null,
      appointment_date, start_time, end_time, symptoms || ''
    );
    const appointmentId = appResult.lastInsertRowid;

    // Status history
    db.prepare(`
      INSERT INTO appointment_status_history (appointment_id, old_status, new_status, note)
      VALUES (?, 'pending', 'confirmed', 'Bệnh nhân hoàn tất đặt lịch trực tuyến')
    `).run(appointmentId);

    // Notification
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Đặt lịch khám thành công', ?, 'appointment', ?)
    `).run(req.session.user.id, `Mã lịch hẹn: ${bookingCode}`, `/appointments/${bookingCode}`);

    logActivity(req.session.user.id, 'BOOK_APPOINTMENT', 'Appointment', appointmentId, `Đặt lịch thành công: ${bookingCode}`, req);

    res.redirect(`/appointments/success/${bookingCode}`);
  } catch (err) {
    console.error('Booking error:', err);
    req.flash('error', 'Không thể hoàn tất đặt lịch. Vui lòng chọn khung giờ khác.');
    res.redirect('back');
  }
});

app.get('/appointments/success/:code', (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, s.name as specialty_name, u.name as patient_name,
           ud.name as doctor_name, d.title as doctor_title, d.room_number
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    LEFT JOIN specialties s ON a.specialty_id = s.id
    WHERE a.booking_code = ?
  `).get(req.params.code);

  if (!appt) return res.status(404).render('errors/error', { message: 'Lịch hẹn không tồn tại' });
  renderWithLayout(res, 'appointments/success', { pageTitle: 'Đặt lịch thành công - MediBook', app: appt });
});

app.get('/appointments/:code', (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, s.name as specialty_name, u.name as patient_name, u.phone as patient_phone,
           ud.name as doctor_name, d.title as doctor_title, d.room_number,
           eq.queue_number, mr.id as medical_record_id, mr.clinical_diagnosis, mr.icd10_code, mr.doctor_notes
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    LEFT JOIN specialties s ON a.specialty_id = s.id
    LEFT JOIN examination_queues eq ON a.id = eq.appointment_id
    LEFT JOIN medical_records mr ON a.id = mr.appointment_id
    WHERE a.booking_code = ?
  `).get(req.params.code);

  if (!appt) return res.status(404).render('errors/error', { message: 'Không tìm thấy thông tin lịch khám' });

  let prescription = null;
  if (appt.medical_record_id) {
    prescription = db.prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?').get(appt.medical_record_id);
    if (prescription) {
      prescription.items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(prescription.id);
    }
  }

  const review = db.prepare('SELECT * FROM reviews WHERE appointment_id = ?').get(appt.id);

  renderWithLayout(res, 'appointments/detail', {
    pageTitle: `Chi tiết lịch khám #${appt.booking_code}`,
    app: appt,
    prescription,
    review
  });
});

app.post('/appointments/:code/cancel', requireAuth, (req, res) => {
  const appt = db.prepare('SELECT id, status FROM appointments WHERE booking_code = ?').get(req.params.code);
  if (appt && ['pending', 'confirmed'].includes(appt.status)) {
    db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(appt.id);
    db.prepare(`
      INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by_user_id, note)
      VALUES (?, ?, 'cancelled', ?, 'Bệnh nhân chủ động hủy lịch')
    `).run(appt.id, appt.status, req.session.user.id);
    req.flash('success', 'Đã hủy lịch khám thành công.');
  }
  res.redirect(`/appointments/${req.params.code}`);
});

app.post('/appointments/:code/review', requireAuth, (req, res) => {
  const appt = db.prepare(`
    SELECT a.id, a.doctor_id, a.patient_id 
    FROM appointments a
    WHERE a.booking_code = ?
  `).get(req.params.code);

  if (appt) {
    const { rating, comment } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO reviews (appointment_id, patient_id, doctor_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(appt.id, appt.patient_id, appt.doctor_id, parseInt(rating) || 5, comment || '');
    req.flash('success', 'Cảm ơn bạn đã gửi đánh giá cho bác sĩ!');
  }
  res.redirect(`/appointments/${req.params.code}`);
});

app.get('/my-appointments', requireRole('patient'), (req, res) => {
  const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.session.user.id);
  const appointments = patient ? db.prepare(`
    SELECT a.*, s.name as specialty_name, srv.name as service_name,
           u.name as doctor_name, d.title as doctor_title, d.room_number
    FROM appointments a
    LEFT JOIN specialties s ON a.specialty_id = s.id
    LEFT JOIN services srv ON a.service_id = srv.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC, a.start_time DESC
  `).all(patient.id) : [];

  renderWithLayout(res, 'appointments/index', { pageTitle: 'Lịch khám của tôi - MediBook', appointments });
});

// Profile
app.get('/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.session.user.id);

  renderWithLayout(res, 'profile/index', { pageTitle: 'Hồ sơ cá nhân - MediBook', user, patient });
});

app.post('/profile', requireAuth, (req, res) => {
  const { name, phone, dob, gender, blood_group, health_insurance_no, address, emergency_contact, medical_history } = req.body;
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name.trim(), phone.trim(), req.session.user.id);

  if (req.session.user.role === 'patient') {
    db.prepare(`
      UPDATE patients 
      SET dob = ?, gender = ?, blood_group = ?, health_insurance_no = ?, address = ?, emergency_contact = ?, medical_history = ?
      WHERE user_id = ?
    `).run(dob || null, gender || 'other', blood_group || null, health_insurance_no || null, address || null, emergency_contact || null, medical_history || null, req.session.user.id);
  }

  req.session.user.name = name.trim();
  req.session.user.phone = phone.trim();
  req.flash('success', 'Cập nhật thông tin hồ sơ thành công!');
  res.redirect('/profile');
});

app.post('/profile/password', requireAuth, (req, res) => {
  const { current_password, new_password, new_password_confirmation } = req.body;
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.user.id);

  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    req.flash('error', 'Mật khẩu hiện tại không chính xác.');
    return res.redirect('/profile');
  }
  if (new_password !== new_password_confirmation) {
    req.flash('error', 'Mật khẩu mới không khớp.');
    return res.redirect('/profile');
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.session.user.id);
  req.flash('success', 'Đổi mật khẩu thành công!');
  res.redirect('/profile');
});

// ==========================================
// 5. DOCTOR MODULE
// ==========================================
app.get('/doctor/dashboard', requireRole('doctor'), (req, res) => {
  const doctor = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(req.session.user.id);
  const today = new Date().toISOString().slice(0, 10);

  const totalToday = db.prepare(`SELECT count(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ?`).get(doctor.id, today).c;
  const waitingCount = db.prepare(`
    SELECT count(*) as c FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    WHERE a.doctor_id = ? AND eq.status IN ('waiting', 'calling') AND a.appointment_date = ?
  `).get(doctor.id, today).c;
  const completedToday = db.prepare(`SELECT count(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'completed'`).get(doctor.id, today).c;

  const todayQueue = db.prepare(`
    SELECT eq.*, a.booking_code, a.start_time, a.symptoms, u.name as patient_name
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.doctor_id = ? AND a.appointment_date = ?
    ORDER BY eq.id ASC
  `).all(doctor.id, today);

  renderWithLayout(res, 'doctor/dashboard', {
    pageTitle: 'Tổng quan ca trực - Bác sĩ',
    doctor,
    totalToday,
    waitingCount,
    completedToday,
    todayQueue
  }, 'layouts/doctor');
});

app.get('/doctor/queue', requireRole('doctor'), (req, res) => {
  const doctor = db.prepare(`
    SELECT d.*, u.name, u.email, GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
    WHERE d.user_id = ?
    GROUP BY d.id
  `).get(req.session.user.id);

  const today = new Date().toISOString().slice(0, 10);
  const queueList = db.prepare(`
    SELECT eq.*, a.booking_code, a.start_time, a.symptoms,
           u.name as patient_name, u.phone as patient_phone,
           p.gender as patient_gender, p.dob as patient_dob
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.doctor_id = ? AND a.appointment_date = ?
    ORDER BY eq.id ASC
  `).all(doctor.id, today);

  renderWithLayout(res, 'doctor/queue', { pageTitle: 'Hàng đợi phòng khám - Bác sĩ', doctor, queueList }, 'layouts/doctor');
});

app.post('/doctor/queue/call/:id', requireRole('doctor'), (req, res) => {
  db.prepare(`UPDATE examination_queues SET status = 'calling', called_time = datetime('now') WHERE id = ?`).run(req.params.id);
  req.flash('info', 'Đã phát loa gọi bệnh nhân vào phòng khám.');
  res.redirect('/doctor/queue');
});

app.post('/doctor/queue/start/:id', requireRole('doctor'), (req, res) => {
  const q = db.prepare('SELECT appointment_id FROM examination_queues WHERE id = ?').get(req.params.id);
  db.prepare(`UPDATE examination_queues SET status = 'in_room' WHERE id = ?`).run(req.params.id);
  db.prepare(`UPDATE appointments SET status = 'in_consultation' WHERE id = ?`).run(q.appointment_id);
  res.redirect(`/doctor/examine/${q.appointment_id}`);
});

app.post('/doctor/queue/skip/:id', requireRole('doctor'), (req, res) => {
  db.prepare(`UPDATE examination_queues SET status = 'waiting' WHERE id = ?`).run(req.params.id);
  req.flash('info', 'Đã chuyển bệnh nhân xuống chờ lại.');
  res.redirect('/doctor/queue');
});

app.get('/doctor/examine/:appointmentId', requireRole('doctor'), (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, u.name as patient_name, u.phone as patient_phone,
           p.gender as patient_gender, p.dob as patient_dob, p.address as patient_address,
           p.health_insurance_no, p.medical_history,
           s.name as specialty_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN specialties s ON a.specialty_id = s.id
    WHERE a.id = ?
  `).get(req.params.appointmentId);

  if (!appt) return res.status(404).render('errors/error', { message: 'Không tìm thấy hồ sơ' });

  const pastRecords = db.prepare(`
    SELECT * FROM medical_records WHERE patient_id = ? AND appointment_id != ? ORDER BY created_at DESC
  `).all(appt.patient_id, appt.id);

  const medicines = db.prepare(`SELECT * FROM medicines WHERE status = 'active'`).all();
  const currentRecord = db.prepare(`SELECT * FROM medical_records WHERE appointment_id = ?`).get(appt.id);

  let currentPrescription = null;
  if (currentRecord) {
    currentPrescription = db.prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?').get(currentRecord.id);
    if (currentPrescription) {
      currentPrescription.items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(currentPrescription.id);
    }
  }

  renderWithLayout(res, 'doctor/examine', {
    pageTitle: `Khám bệnh: ${appt.patient_name}`,
    app: appt,
    pastRecords,
    medicines,
    currentRecord,
    currentPrescription
  }, 'layouts/doctor');
});

app.post('/doctor/examine/:appointmentId', requireRole('doctor'), (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.appointmentId);
  const { blood_pressure, heart_rate, temperature, weight, height, bmi, anamnesis, clinical_diagnosis, icd10_code, doctor_notes, re_examination_date } = req.body;

  const vitalsJson = JSON.stringify({ blood_pressure, heart_rate, temperature, weight, height, bmi });

  // 1. Save or update medical record
  let medRecord = db.prepare('SELECT id FROM medical_records WHERE appointment_id = ?').get(appt.id);
  let recordId;
  if (medRecord) {
    db.prepare(`
      UPDATE medical_records 
      SET anamnesis = ?, vital_signs = ?, clinical_diagnosis = ?, icd10_code = ?, doctor_notes = ?, re_examination_date = ?
      WHERE id = ?
    `).run(anamnesis, vitalsJson, clinical_diagnosis, icd10_code || null, doctor_notes || null, re_examination_date || null, medRecord.id);
    recordId = medRecord.id;
  } else {
    const rRes = db.prepare(`
      INSERT INTO medical_records (appointment_id, patient_id, doctor_id, anamnesis, vital_signs, clinical_diagnosis, icd10_code, doctor_notes, re_examination_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appt.id, appt.patient_id, appt.doctor_id, anamnesis, vitalsJson, clinical_diagnosis, icd10_code || null, doctor_notes || null, re_examination_date || null);
    recordId = rRes.lastInsertRowid;
  }

  // 2. Save prescriptions and items
  const { med_name, med_id, med_dosage, med_unit, med_quantity, med_morning, med_noon, med_afternoon, med_night, med_instructions, med_price, prescription_notes } = req.body;

  let totalMedFee = 0;
  if (med_name) {
    const names = Array.isArray(med_name) ? med_name : [med_name];
    const ids = Array.isArray(med_id) ? med_id : [med_id];
    const dosages = Array.isArray(med_dosage) ? med_dosage : [med_dosage];
    const units = Array.isArray(med_unit) ? med_unit : [med_unit];
    const quantities = Array.isArray(med_quantity) ? med_quantity : [med_quantity];
    const mornings = Array.isArray(med_morning) ? med_morning : [med_morning];
    const noons = Array.isArray(med_noon) ? med_noon : [med_noon];
    const afternoons = Array.isArray(med_afternoon) ? med_afternoon : [med_afternoon];
    const nights = Array.isArray(med_night) ? med_night : [med_night];
    const instructions = Array.isArray(med_instructions) ? med_instructions : [med_instructions];
    const prices = Array.isArray(med_price) ? med_price : [med_price];

    names.forEach((name, i) => {
      const q = parseFloat(quantities[i] || 1);
      const p = parseFloat(prices[i] || 0);
      totalMedFee += (q * p);
    });

    let pres = db.prepare('SELECT id FROM prescriptions WHERE medical_record_id = ?').get(recordId);
    let presId;
    if (pres) {
      db.prepare(`UPDATE prescriptions SET total_amount = ?, usage_instructions = ? WHERE id = ?`).run(totalMedFee, prescription_notes || '', pres.id);
      db.prepare('DELETE FROM prescription_items WHERE prescription_id = ?').run(pres.id);
      presId = pres.id;
    } else {
      const presRes = db.prepare(`
        INSERT INTO prescriptions (medical_record_id, appointment_id, doctor_id, patient_id, total_amount, usage_instructions)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(recordId, appt.id, appt.doctor_id, appt.patient_id, totalMedFee, prescription_notes || '');
      presId = presRes.lastInsertRowid;
    }

    const insertItem = db.prepare(`
      INSERT INTO prescription_items (prescription_id, medicine_id, medicine_name, dosage, unit, quantity, morning, noon, afternoon, night, instructions, unit_price, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    names.forEach((name, i) => {
      const q = parseFloat(quantities[i] || 1);
      const p = parseFloat(prices[i] || 0);
      const mId = parseInt(ids[i]) || null;
      insertItem.run(
        presId, mId, name, dosages[i] || '', units[i] || 'Viên', q,
        mornings[i] || '0', noons[i] || '0', afternoons[i] || '0', nights[i] || '0',
        instructions[i] || '', p, q * p
      );
    });
  }

  // 3. Mark appointment and queue as completed
  db.prepare(`UPDATE appointments SET status = 'completed' WHERE id = ?`).run(appt.id);
  db.prepare(`UPDATE examination_queues SET status = 'completed', finish_time = datetime('now') WHERE appointment_id = ?`).run(appt.id);

  // 4. Create or update payment invoice
  let invoice = db.prepare('SELECT id FROM payments WHERE appointment_id = ?').get(appt.id);
  const serviceFee = 200000;
  const finalAmount = serviceFee + totalMedFee;

  if (!invoice) {
    const invCode = 'HD' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(Math.floor(1000 + Math.random() * 9000));
    db.prepare(`
      INSERT INTO payments (appointment_id, invoice_code, service_fee, medicine_fee, total_amount, discount, final_amount, payment_method, payment_status)
      VALUES (?, ?, ?, ?, ?, 0, ?, 'cash', 'unpaid')
    `).run(appt.id, invCode, serviceFee, totalMedFee, finalAmount, finalAmount);
  }

  logActivity(req.session.user.id, 'COMPLETE_EXAM', 'Appointment', appt.id, 'Bác sĩ hoàn thành khám và kê đơn', req);
  req.flash('success', 'Đã hoàn tất quá trình khám bệnh và lưu hồ sơ y tế!');
  res.redirect('/doctor/queue');
});

app.get('/doctor/schedule', requireRole('doctor'), (req, res) => {
  const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.session.user.id);
  const schedules = db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week ASC').all(doctor.id);
  const leaves = db.prepare('SELECT * FROM doctor_leaves WHERE doctor_id = ? ORDER BY start_date DESC').all(doctor.id);

  renderWithLayout(res, 'doctor/schedule', { pageTitle: 'Ca trực & Nghỉ phép - Bác sĩ', schedules, leaves }, 'layouts/doctor');
});

app.post('/doctor/leave/request', requireRole('doctor'), (req, res) => {
  const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.session.user.id);
  const { leave_date, reason } = req.body;
  db.prepare(`
    INSERT INTO doctor_leaves (doctor_id, start_date, end_date, reason, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(doctor.id, leave_date, leave_date, reason);
  req.flash('success', 'Đã gửi yêu cầu xin nghỉ phép đến Admin.');
  res.redirect('/doctor/schedule');
});

// ==========================================
// 6. RECEPTIONIST MODULE
// ==========================================
app.get('/receptionist/dashboard', requireRole('receptionist', 'admin'), (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const totalToday = db.prepare(`SELECT count(*) as c FROM appointments WHERE appointment_date = ?`).get(today).c;
  const checkedInCount = db.prepare(`SELECT count(*) as c FROM appointments WHERE appointment_date = ? AND status IN ('checked_in', 'in_consultation')`).get(today).c;
  const completedCount = db.prepare(`SELECT count(*) as c FROM appointments WHERE appointment_date = ? AND status = 'completed'`).get(today).c;
  const todayRevenue = db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND date(paid_at) = ?`).get(today).s;

  const todayAppointments = db.prepare(`
    SELECT a.*, u.name as patient_name, u.phone as patient_phone,
           ud.name as doctor_name, d.title as doctor_title, d.room_number
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    WHERE a.appointment_date = ?
    ORDER BY a.start_time ASC
  `).all(today);

  renderWithLayout(res, 'receptionist/dashboard', {
    pageTitle: 'Bàn làm việc Lễ tân - MediBook',
    totalToday,
    checkedInCount,
    completedCount,
    todayRevenue,
    todayAppointments
  }, 'layouts/receptionist');
});

app.get('/receptionist/checkin', requireRole('receptionist', 'admin'), (req, res) => {
  const { keyword, date, status } = req.query;
  const searchDate = date || new Date().toISOString().slice(0, 10);

  let query = `
    SELECT a.*, u.name as patient_name, u.phone as patient_phone,
           ud.name as doctor_name, d.title as doctor_title, d.room_number,
           eq.queue_number
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    LEFT JOIN examination_queues eq ON a.id = eq.appointment_id
    WHERE a.appointment_date = ?
  `;
  const params = [searchDate];

  if (keyword) {
    query += ` AND (a.booking_code LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY a.start_time ASC`;

  const appointments = db.prepare(query).all(...params);
  renderWithLayout(res, 'receptionist/checkin', {
    pageTitle: 'Tiếp đón & Điểm danh - Lễ tân',
    appointments,
    keyword,
    date: searchDate,
    status
  }, 'layouts/receptionist');
});

app.post('/receptionist/confirm/:id', requireRole('receptionist', 'admin'), (req, res) => {
  db.prepare(`UPDATE appointments SET status = 'confirmed' WHERE id = ?`).run(req.params.id);
  req.flash('success', 'Đã xác nhận cuộc hẹn.');
  res.redirect('back');
});

app.post('/receptionist/checkin/:id', requireRole('receptionist', 'admin'), (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, d.room_number 
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (appt) {
    // Determine next queue number for room
    const prefix = appt.room_number.replace('P.', 'P');
    const countToday = db.prepare(`
      SELECT count(*) as c FROM examination_queues WHERE room = ? AND date(checkin_time) = date('now')
    `).get(appt.room_number).c;
    const queueNum = `${prefix}-${String(countToday + 1).padStart(2, '0')}`;

    db.prepare(`UPDATE appointments SET status = 'checked_in' WHERE id = ?`).run(appt.id);
    db.prepare(`
      INSERT OR REPLACE INTO examination_queues (appointment_id, queue_number, room, status, checkin_time)
      VALUES (?, ?, ?, 'waiting', datetime('now'))
    `).run(appt.id, queueNum, appt.room_number);

    logActivity(req.session.user.id, 'CHECKIN_PATIENT', 'Appointment', appt.id, `Cấp số thứ tự ${queueNum}`, req);
    req.flash('success', `Đã tiếp đón bệnh nhân và cấp số thứ tự: ${queueNum}`);
  }
  res.redirect('back');
});

app.get('/receptionist/live-board', (req, res) => {
  const doctors = db.prepare(`
    SELECT d.*, u.name, GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
    GROUP BY d.id
  `).all();

  const today = new Date().toISOString().slice(0, 10);
  const queueItems = db.prepare(`
    SELECT eq.*, u.name as patient_name
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.appointment_date = ?
    ORDER BY eq.id ASC
  `).all(today);

  res.render('receptionist/live_board', { doctors, queueItems });
});

app.get('/api/queue/live', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const queueItems = db.prepare(`
    SELECT eq.*, u.name as patient_name
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.appointment_date = ?
    ORDER BY eq.id ASC
  `).all(today);
  res.json({ success: true, items: queueItems });
});

app.get('/receptionist/booking', requireRole('receptionist', 'admin'), (req, res) => {
  const specialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active'`).all();
  const doctors = db.prepare(`
    SELECT d.*, u.name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
  `).all();
  renderWithLayout(res, 'receptionist/walkin_booking', {
    pageTitle: 'Tiếp nhận đặt khám tại quầy - Lễ tân',
    specialties,
    doctors
  }, 'layouts/receptionist');
});

app.post('/receptionist/booking', requireRole('receptionist', 'admin'), (req, res) => {
  const { patient_name, patient_phone, patient_email, specialty_id, doctor_id, appointment_date, start_time, symptoms, auto_checkin } = req.body;

  let email = (patient_email && patient_email.trim()) || `walkin.${Date.now()}@medibook.local`;
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) {
    const hash = bcrypt.hashSync('password', 10);
    const uRes = db.prepare(`
      INSERT INTO users (role, name, email, password_hash, phone, status)
      VALUES ('patient', ?, ?, ?, ?, 'active')
    `).run(patient_name.trim(), email, hash, patient_phone.trim());
    user = { id: uRes.lastInsertRowid };
    db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(user.id);
  }
  const pat = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);

  const [sH, sM] = start_time.split(':').map(Number);
  const endMinutes = sH * 60 + sM + 30;
  const eH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const eM = String(endMinutes % 60).padStart(2, '0');
  const end_time = `${eH}:${eM}:00`;

  const codeDate = appointment_date.replace(/-/g, '').slice(2);
  const bookingCode = `MB${codeDate}-${Math.floor(1000 + Math.random() * 9000)}`;

  const aRes = db.prepare(`
    INSERT INTO appointments (booking_code, patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, status, symptoms)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
  `).run(bookingCode, pat.id, doctor_id, specialty_id, appointment_date, start_time, end_time, symptoms || 'Đăng ký tại quầy');
  const appointmentId = aRes.lastInsertRowid;

  if (auto_checkin) {
    const doctor = db.prepare('SELECT room_number FROM doctors WHERE id = ?').get(doctor_id);
    const prefix = doctor.room_number.replace('P.', 'P');
    const countToday = db.prepare(`
      SELECT count(*) as c FROM examination_queues WHERE room = ? AND date(checkin_time) = date('now')
    `).get(doctor.room_number).c;
    const queueNum = `${prefix}-${String(countToday + 1).padStart(2, '0')}`;

    db.prepare(`UPDATE appointments SET status = 'checked_in' WHERE id = ?`).run(appointmentId);
    db.prepare(`
      INSERT INTO examination_queues (appointment_id, queue_number, room, status, checkin_time)
      VALUES (?, ?, ?, 'waiting', datetime('now'))
    `).run(appointmentId, queueNum, doctor.room_number);

    req.flash('success', `Đã tạo lịch khám trực tiếp và cấp số thứ tự: ${queueNum}`);
  } else {
    req.flash('success', `Đã tạo lịch khám thành công với mã: ${bookingCode}`);
  }

  res.redirect('/receptionist/checkin');
});

app.get('/receptionist/payments', requireRole('receptionist', 'admin'), (req, res) => {
  const { keyword, status } = req.query;
  const stats = {
    today_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND date(paid_at) = date('now')`).get().s,
    month_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')`).get().s
  };

  let query = `
    SELECT p.*, a.booking_code, u.name as patient_name, u.phone as patient_phone,
           ud.name as doctor_name
    FROM payments p
    JOIN appointments a ON p.appointment_id = a.id
    JOIN patients pt ON a.patient_id = pt.id
    JOIN users u ON pt.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    WHERE 1=1
  `;
  const params = [];
  if (keyword) {
    query += ` AND (p.invoice_code LIKE ? OR a.booking_code LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    query += ` AND p.payment_status = ?`;
    params.push(status);
  }
  query += ` ORDER BY p.id DESC`;

  const payments = db.prepare(query).all(...params);
  renderWithLayout(res, 'receptionist/payments', { pageTitle: 'Thu ngân & Viện phí - Lễ tân', stats, payments, keyword, status }, 'layouts/receptionist');
});

app.post('/receptionist/payments/pay/:id', requireRole('receptionist', 'admin'), (req, res) => {
  const method = req.body.payment_method || 'cash';
  db.prepare(`
    UPDATE payments 
    SET payment_status = 'paid', payment_method = ?, paid_at = datetime('now'), cashier_user_id = ?
    WHERE id = ?
  `).run(method, req.session.user.id, req.params.id);

  req.flash('success', 'Thu tiền viện phí thành công và đã xuất hóa đơn điện tử.');
  res.redirect('/receptionist/payments');
});

app.get('/receptionist/payments/receipt/:id', requireRole('receptionist', 'admin'), (req, res) => {
  const payment = db.prepare(`
    SELECT p.*, u.name as cashier_name
    FROM payments p
    LEFT JOIN users u ON p.cashier_user_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!payment) return res.status(404).render('errors/error', { message: 'Hóa đơn không tồn tại' });

  const appointment = db.prepare(`
    SELECT a.*, u.name as patient_name, u.phone as patient_phone,
           ud.name as doctor_name, d.title as doctor_title, d.room_number,
           s.name as specialty_name, mr.clinical_diagnosis, mr.id as medical_record_id
    FROM appointments a
    JOIN patients pt ON a.patient_id = pt.id
    JOIN users u ON pt.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    LEFT JOIN specialties s ON a.specialty_id = s.id
    LEFT JOIN medical_records mr ON a.id = mr.appointment_id
    WHERE a.id = ?
  `).get(payment.appointment_id);

  let prescription = null;
  if (appointment.medical_record_id) {
    prescription = db.prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?').get(appointment.medical_record_id);
    if (prescription) {
      prescription.items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(prescription.id);
    }
  }

  res.render('receptionist/receipt_print', { payment, appointment, prescription });
});

// ==========================================
// 7. ADMIN MODULE
// ==========================================
app.get('/admin/dashboard', requireRole('admin'), (req, res) => {
  const totalAppointments = db.prepare(`SELECT count(*) as c FROM appointments`).get().c;
  const totalPatients = db.prepare(`SELECT count(*) as c FROM patients`).get().c;
  const totalDoctors = db.prepare(`SELECT count(*) as c FROM doctors`).get().c;
  const revenueStats = {
    total_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid'`).get().s
  };

  const recentBookings = db.prepare(`
    SELECT a.*, u.name as patient_name, ud.name as doctor_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    ORDER BY a.id DESC LIMIT 8
  `).all();

  const statusRows = db.prepare(`SELECT status, count(*) as count FROM appointments GROUP BY status`).all();
  const statusCounts = {};
  statusRows.forEach(r => { statusCounts[r.status] = r.count; });

  renderWithLayout(res, 'admin/dashboard', {
    pageTitle: 'Quản trị hệ thống MediBook',
    totalAppointments,
    totalPatients,
    totalDoctors,
    revenueStats,
    recentBookings,
    statusCounts
  }, 'layouts/admin');
});

// User Management
app.get('/admin/users', requireRole('admin'), (req, res) => {
  const { keyword, role } = req.query;
  let query = `
    SELECT u.*, d.title as doctor_title, d.room_number, r.staff_code, p.gender
    FROM users u
    LEFT JOIN doctors d ON u.id = d.user_id
    LEFT JOIN receptionists r ON u.id = r.user_id
    LEFT JOIN patients p ON u.id = p.user_id
    WHERE 1=1
  `;
  const params = [];
  if (keyword) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    query += ` AND u.role = ?`;
    params.push(role);
  }
  query += ` ORDER BY u.id DESC`;

  const users = db.prepare(query).all(...params);
  renderWithLayout(res, 'admin/users/index', { pageTitle: 'Quản lý tài khoản - Admin', users, keyword, role }, 'layouts/admin');
});

app.get('/admin/users/create', requireRole('admin'), (req, res) => {
  renderWithLayout(res, 'admin/users/form', { pageTitle: 'Thêm tài khoản mới - Admin', user: null }, 'layouts/admin');
});

app.post('/admin/users/store', requireRole('admin'), (req, res) => {
  const { name, email, phone, role, status, password } = req.body;
  const hash = bcrypt.hashSync(password || 'password', 10);

  const uRes = db.prepare(`
    INSERT INTO users (role, name, email, password_hash, phone, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(role, name.trim(), email.trim(), hash, phone.trim(), status || 'active');
  const userId = uRes.lastInsertRowid;

  if (role === 'doctor') {
    db.prepare('INSERT INTO doctors (user_id) VALUES (?)').run(userId);
  } else if (role === 'patient') {
    db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(userId);
  } else if (role === 'receptionist') {
    db.prepare('INSERT INTO receptionists (user_id, staff_code) VALUES (?, ?)').run(userId, 'LT-' + userId);
  }

  logActivity(req.session.user.id, 'CREATE_USER', 'User', userId, `Tạo người dùng role ${role}: ${email}`, req);
  req.flash('success', 'Đã tạo tài khoản thành công!');
  res.redirect('/admin/users');
});

app.get('/admin/users/edit/:id', requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).render('errors/error', { message: 'Tài khoản không tồn tại' });
  renderWithLayout(res, 'admin/users/form', { pageTitle: `Sửa tài khoản: ${user.name}`, user }, 'layouts/admin');
});

app.post('/admin/users/update/:id', requireRole('admin'), (req, res) => {
  const { name, email, phone, role, status, password } = req.body;
  if (password && password.trim().length >= 6) {
    const hash = bcrypt.hashSync(password.trim(), 10);
    db.prepare(`UPDATE users SET name = ?, email = ?, phone = ?, role = ?, status = ?, password_hash = ? WHERE id = ?`)
      .run(name.trim(), email.trim(), phone.trim(), role, status, hash, req.params.id);
  } else {
    db.prepare(`UPDATE users SET name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?`)
      .run(name.trim(), email.trim(), phone.trim(), role, status, req.params.id);
  }
  req.flash('success', 'Cập nhật tài khoản thành công!');
  res.redirect('/admin/users');
});

app.post('/admin/users/toggle/:id', requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT status FROM users WHERE id = ?').get(req.params.id);
  const nextStatus = user.status === 'active' ? 'inactive' : 'active';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(nextStatus, req.params.id);
  req.flash('success', `Đã chuyển trạng thái người dùng thành: ${nextStatus}`);
  res.redirect('/admin/users');
});

// Doctor Management
app.get('/admin/doctors', requireRole('admin'), (req, res) => {
  const doctors = db.prepare(`
    SELECT d.*, u.name, u.email, GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
    GROUP BY d.id
  `).all();
  renderWithLayout(res, 'admin/doctors/index', { pageTitle: 'Quản lý bác sĩ - Admin', doctors }, 'layouts/admin');
});

app.get('/admin/doctors/edit/:id', requireRole('admin'), (req, res) => {
  const doctor = db.prepare(`
    SELECT d.*, u.name, u.email
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = ?
  `).get(req.params.id);

  const allSpecialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active'`).all();
  const docSpecs = db.prepare('SELECT specialty_id FROM doctor_specialties WHERE doctor_id = ?').all(doctor.id);
  const selectedSpecialtyIds = docSpecs.map(s => s.specialty_id);

  renderWithLayout(res, 'admin/doctors/form', {
    pageTitle: `Cấu hình bác sĩ: ${doctor.name}`,
    doctor,
    allSpecialties,
    selectedSpecialtyIds
  }, 'layouts/admin');
});

app.post('/admin/doctors/update/:id', requireRole('admin'), (req, res) => {
  const { title, room_number, experience_years, consultation_fee, bio, specialty_ids } = req.body;
  db.prepare(`
    UPDATE doctors 
    SET title = ?, room_number = ?, experience_years = ?, consultation_fee = ?, bio = ?
    WHERE id = ?
  `).run(title.trim(), room_number.trim(), parseInt(experience_years) || 1, parseFloat(consultation_fee) || 200000, bio || '', req.params.id);

  db.prepare('DELETE FROM doctor_specialties WHERE doctor_id = ?').run(req.params.id);
  if (specialty_ids) {
    const sIds = Array.isArray(specialty_ids) ? specialty_ids : [specialty_ids];
    const insertDs = db.prepare('INSERT INTO doctor_specialties (doctor_id, specialty_id, is_primary) VALUES (?, ?, 0)');
    sIds.forEach(sid => insertDs.run(req.params.id, sid));
  }

  req.flash('success', 'Đã lưu thiết lập bác sĩ thành công!');
  res.redirect('/admin/doctors');
});

// Specialty Management
app.get('/admin/specialties', requireRole('admin'), (req, res) => {
  const specialties = db.prepare(`
    SELECT s.*, count(ds.doctor_id) as doctor_count
    FROM specialties s
    LEFT JOIN doctor_specialties ds ON s.id = ds.specialty_id
    GROUP BY s.id
  `).all();
  renderWithLayout(res, 'admin/specialties/index', { pageTitle: 'Quản lý chuyên khoa - Admin', specialties }, 'layouts/admin');
});

app.get('/admin/specialties/create', requireRole('admin'), (req, res) => {
  renderWithLayout(res, 'admin/specialties/form', { pageTitle: 'Thêm chuyên khoa - Admin', specialty: null }, 'layouts/admin');
});

app.post('/admin/specialties/store', requireRole('admin'), (req, res) => {
  const { name, slug, description, status } = req.body;
  db.prepare(`
    INSERT INTO specialties (name, slug, description, status)
    VALUES (?, ?, ?, ?)
  `).run(name.trim(), slug.trim(), description || '', status || 'active');
  req.flash('success', 'Đã tạo chuyên khoa mới thành công!');
  res.redirect('/admin/specialties');
});

app.get('/admin/specialties/edit/:id', requireRole('admin'), (req, res) => {
  const specialty = db.prepare('SELECT * FROM specialties WHERE id = ?').get(req.params.id);
  renderWithLayout(res, 'admin/specialties/form', { pageTitle: `Sửa chuyên khoa: ${specialty.name}`, specialty }, 'layouts/admin');
});

app.post('/admin/specialties/update/:id', requireRole('admin'), (req, res) => {
  const { name, slug, description, status } = req.body;
  db.prepare(`
    UPDATE specialties SET name = ?, slug = ?, description = ?, status = ? WHERE id = ?
  `).run(name.trim(), slug.trim(), description || '', status || 'active', req.params.id);
  req.flash('success', 'Cập nhật chuyên khoa thành công!');
  res.redirect('/admin/specialties');
});

// Service Management
app.get('/admin/services', requireRole('admin'), (req, res) => {
  const services = db.prepare(`
    SELECT s.*, sp.name as specialty_name
    FROM services s
    JOIN specialties sp ON s.specialty_id = sp.id
    ORDER BY s.id ASC
  `).all();
  renderWithLayout(res, 'admin/services/index', { pageTitle: 'Quản lý dịch vụ khám - Admin', services }, 'layouts/admin');
});

app.get('/admin/services/create', requireRole('admin'), (req, res) => {
  const specialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active'`).all();
  renderWithLayout(res, 'admin/services/form', { pageTitle: 'Thêm dịch vụ khám - Admin', service: null, specialties }, 'layouts/admin');
});

app.post('/admin/services/store', requireRole('admin'), (req, res) => {
  const { specialty_id, name, price, duration_minutes, description, status } = req.body;
  db.prepare(`
    INSERT INTO services (specialty_id, name, price, duration_minutes, description, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(specialty_id, name.trim(), parseFloat(price) || 0, parseInt(duration_minutes) || 30, description || '', status || 'active');
  req.flash('success', 'Đã tạo dịch vụ mới thành công!');
  res.redirect('/admin/services');
});

app.get('/admin/services/edit/:id', requireRole('admin'), (req, res) => {
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  const specialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active'`).all();
  renderWithLayout(res, 'admin/services/form', { pageTitle: `Sửa dịch vụ: ${service.name}`, service, specialties }, 'layouts/admin');
});

app.post('/admin/services/update/:id', requireRole('admin'), (req, res) => {
  const { specialty_id, name, price, duration_minutes, description, status } = req.body;
  db.prepare(`
    UPDATE services 
    SET specialty_id = ?, name = ?, price = ?, duration_minutes = ?, description = ?, status = ?
    WHERE id = ?
  `).run(specialty_id, name.trim(), parseFloat(price) || 0, parseInt(duration_minutes) || 30, description || '', status || 'active', req.params.id);
  req.flash('success', 'Cập nhật dịch vụ thành công!');
  res.redirect('/admin/services');
});

// Medicine Management
app.get('/admin/medicines', requireRole('admin'), (req, res) => {
  const medicines = db.prepare('SELECT * FROM medicines ORDER BY id ASC').all();
  renderWithLayout(res, 'admin/medicines/index', { pageTitle: 'Kho dược phẩm - Admin', medicines }, 'layouts/admin');
});

app.get('/admin/medicines/create', requireRole('admin'), (req, res) => {
  renderWithLayout(res, 'admin/medicines/form', { pageTitle: 'Thêm thuốc vào kho - Admin', medicine: null }, 'layouts/admin');
});

app.post('/admin/medicines/store', requireRole('admin'), (req, res) => {
  const { code, name, category, unit, unit_price, stock_quantity, usage_instruction, status } = req.body;
  db.prepare(`
    INSERT INTO medicines (code, name, category, unit, unit_price, stock_quantity, usage_instruction, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code.trim(), name.trim(), category || '', unit.trim(), parseFloat(unit_price) || 0, parseInt(stock_quantity) || 0, usage_instruction || '', status || 'active');
  req.flash('success', 'Đã thêm thuốc vào kho thành công!');
  res.redirect('/admin/medicines');
});

app.get('/admin/medicines/edit/:id', requireRole('admin'), (req, res) => {
  const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  renderWithLayout(res, 'admin/medicines/form', { pageTitle: `Sửa thông tin thuốc: ${medicine.name}`, medicine }, 'layouts/admin');
});

app.post('/admin/medicines/update/:id', requireRole('admin'), (req, res) => {
  const { code, name, category, unit, unit_price, stock_quantity, usage_instruction, status } = req.body;
  db.prepare(`
    UPDATE medicines 
    SET code = ?, name = ?, category = ?, unit = ?, unit_price = ?, stock_quantity = ?, usage_instruction = ?, status = ?
    WHERE id = ?
  `).run(code.trim(), name.trim(), category || '', unit.trim(), parseFloat(unit_price) || 0, parseInt(stock_quantity) || 0, usage_instruction || '', status || 'active', req.params.id);
  req.flash('success', 'Cập nhật thuốc thành công!');
  res.redirect('/admin/medicines');
});

// Shift & Leave Management
app.get('/admin/schedules', requireRole('admin'), (req, res) => {
  const schedules = db.prepare(`
    SELECT sc.*, d.title as doctor_title, d.room_number, u.name as doctor_name
    FROM doctor_schedules sc
    JOIN doctors d ON sc.doctor_id = d.id
    JOIN users u ON d.user_id = u.id
    ORDER BY sc.day_of_week ASC, sc.start_time ASC
  `).all();

  const doctors = db.prepare(`SELECT d.*, u.name FROM doctors d JOIN users u ON d.user_id = u.id`).all();
  const leaves = db.prepare(`
    SELECT dl.*, d.title as doctor_title, u.name as doctor_name
    FROM doctor_leaves dl
    JOIN doctors d ON dl.doctor_id = d.id
    JOIN users u ON d.user_id = u.id
    ORDER BY dl.id DESC
  `).all();

  renderWithLayout(res, 'admin/schedules/index', {
    pageTitle: 'Ca trực & Nghỉ phép - Admin',
    schedules,
    doctors,
    leaves
  }, 'layouts/admin');
});

app.post('/admin/schedules/store', requireRole('admin'), (req, res) => {
  const { doctor_id, day_of_week, start_time, end_time, slot_duration, max_patients } = req.body;
  db.prepare(`
    INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration, max_patients, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(doctor_id, day_of_week, start_time, end_time, parseInt(slot_duration) || 30, parseInt(max_patients) || 16);
  req.flash('success', 'Đã thêm ca trực thành công!');
  res.redirect('/admin/schedules');
});

app.post('/admin/schedules/delete/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM doctor_schedules WHERE id = ?').run(req.params.id);
  req.flash('success', 'Đã xóa ca trực.');
  res.redirect('/admin/schedules');
});

app.post('/admin/leaves/update/:id', requireRole('admin'), (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE doctor_leaves SET status = ? WHERE id = ?').run(status, req.params.id);
  req.flash('success', `Đã cập nhật trạng thái đơn nghỉ phép: ${status}`);
  res.redirect('/admin/schedules');
});

// Admin Appointments Management
app.get('/admin/appointments', requireRole('admin'), (req, res) => {
  const { keyword, doctor_id, date, status } = req.query;
  const doctors = db.prepare(`SELECT d.*, u.name FROM doctors d JOIN users u ON d.user_id = u.id`).all();

  let query = `
    SELECT a.*, u.name as patient_name, u.phone as patient_phone,
           ud.name as doctor_name, d.title as doctor_title, s.name as specialty_name,
           p.payment_status
    FROM appointments a
    JOIN patients pt ON a.patient_id = pt.id
    JOIN users u ON pt.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    LEFT JOIN specialties s ON a.specialty_id = s.id
    LEFT JOIN payments p ON a.id = p.appointment_id
    WHERE 1=1
  `;
  const params = [];
  if (keyword) {
    query += ` AND (a.booking_code LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (doctor_id) {
    query += ` AND a.doctor_id = ?`;
    params.push(doctor_id);
  }
  if (date) {
    query += ` AND a.appointment_date = ?`;
    params.push(date);
  }
  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY a.id DESC`;

  const appointments = db.prepare(query).all(...params);
  renderWithLayout(res, 'admin/appointments/index', {
    pageTitle: 'Quản trị lịch hẹn khám - Admin',
    appointments,
    doctors,
    keyword,
    doctorId: doctor_id,
    date,
    status
  }, 'layouts/admin');
});

app.get('/admin/appointments/view/:id', requireRole('admin'), (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, u.name as patient_name, u.phone as patient_phone,
           ud.name as doctor_name, d.title as doctor_title, d.room_number,
           s.name as specialty_name, srv.name as service_name
    FROM appointments a
    JOIN patients pt ON a.patient_id = pt.id
    JOIN users u ON pt.user_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    LEFT JOIN specialties s ON a.specialty_id = s.id
    LEFT JOIN services srv ON a.service_id = srv.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!appt) return res.status(404).render('errors/error', { message: 'Lịch hẹn không tồn tại' });

  const history = db.prepare(`
    SELECT ash.*, u.name as changed_by_name, u.role as changed_by_role
    FROM appointment_status_history ash
    LEFT JOIN users u ON ash.changed_by_user_id = u.id
    WHERE ash.appointment_id = ?
    ORDER BY ash.id DESC
  `).all(appt.id);

  renderWithLayout(res, 'admin/appointments/view', {
    pageTitle: `Chi tiết lịch hẹn #${appt.booking_code}`,
    app: appt,
    history
  }, 'layouts/admin');
});

app.post('/admin/appointments/status/:id', requireRole('admin'), (req, res) => {
  const { status, note } = req.body;
  const appt = db.prepare('SELECT status FROM appointments WHERE id = ?').get(req.params.id);

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
  db.prepare(`
    INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by_user_id, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, appt.status, status, req.session.user.id, note || 'Admin cập nhật thủ công');

  logActivity(req.session.user.id, 'OVERRIDE_STATUS', 'Appointment', req.params.id, `Đổi trạng thái sang: ${status}`, req);
  req.flash('success', 'Đã cập nhật trạng thái lịch hẹn.');
  res.redirect(`/admin/appointments/view/${req.params.id}`);
});

// Reports & Logs
app.get('/admin/reports', requireRole('admin'), (req, res) => {
  const stats = {
    today_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND date(paid_at) = date('now')`).get().s,
    month_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')`).get().s,
    total_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid'`).get().s
  };

  const monthlyRevenue = db.prepare(`
    SELECT strftime('%m/%Y', paid_at) as month, count(*) as invoice_count, sum(final_amount) as total_amount
    FROM payments
    WHERE payment_status = 'paid' AND paid_at IS NOT NULL
    GROUP BY strftime('%m/%Y', paid_at)
    ORDER BY paid_at DESC
  `).all();

  const bySpecialty = db.prepare(`
    SELECT s.name as specialty_name, count(a.id) as total_appointments
    FROM specialties s
    LEFT JOIN appointments a ON s.id = a.specialty_id
    GROUP BY s.id
  `).all();

  renderWithLayout(res, 'admin/reports/index', { pageTitle: 'Báo cáo doanh thu & Thống kê - Admin', stats, monthlyRevenue, bySpecialty }, 'layouts/admin');
});

app.get('/admin/logs', requireRole('admin'), (req, res) => {
  const logs = db.prepare(`
    SELECT al.*, u.name as user_name, u.role as user_role
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.id DESC LIMIT 100
  `).all();
  renderWithLayout(res, 'admin/logs/index', { pageTitle: 'Nhật ký bảo mật & Hoạt động - Admin', logs }, 'layouts/admin');
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/error', { message: 'Trang bạn yêu cầu không tồn tại (404)' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MediBook Node.js Server đang chạy thành công!`);
  console.log(`👉 Truy cập website: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
