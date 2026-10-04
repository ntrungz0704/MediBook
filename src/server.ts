const fs = require('fs');
const path = require('path');

// Automatically load .env file if available in working directory (Node 20.12+)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn('⚠️ Cảnh báo: Không thể nạp file .env:', err);
  }
}

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./db');
const helpers = require('./helpers');
const { requireAuth, requireRole } = require('./middleware');
const { validateBooking, BookingRuleError, businessNow } = require('./booking-rules');

function nextQueueNumber(room: string, prefix: string): { date: string; number: string } {
  const date = businessNow().date;
  const row = db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(queue_number, INSTR(queue_number, '-') + 1) AS INTEGER)), 0) AS last_number
    FROM examination_queues WHERE room = ? AND queue_date = ?
  `).get(room, date) as any;
  return { date, number: `${prefix}-${String(Number(row.last_number) + 1).padStart(2, '0')}` };
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Production validation: SESSION_SECRET is required when NODE_ENV=production
const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && (!sessionSecret || sessionSecret.trim() === '')) {
  console.error('❌ LỖI KHỞI ĐỘNG (FATAL): Biến môi trường SESSION_SECRET là bắt buộc khi chạy ở chế độ production (NODE_ENV=production)!');
  console.error('👉 Vui lòng cấu hình SESSION_SECRET trong file .env hoặc trên hệ thống máy chủ.');
  process.exit(1);
}

// In development or test mode, provide safe developer placeholder if not configured
const activeSessionSecret = (sessionSecret && sessionSecret.trim() !== '')
  ? sessionSecret.trim()
  : 'dev_insecure_session_secret_for_local_development_only';

// View engine (point to views in root directory)
const ROOT_DIR = path.resolve(__dirname, '..');
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT_DIR, 'views'));

// Static files
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---- Security hardening (không cần thêm dependency) ----
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
}
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Chống CSRF: request thay đổi dữ liệu từ trình duyệt phải cùng origin (Origin/Referer khớp Host)
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const source = req.get('Origin') || req.get('Referer');
  let sameOrigin = false;
  try { sameOrigin = !!source && new URL(source).host === req.get('host'); } catch (_) { sameOrigin = false; }
  if (!sameOrigin) {
    return res.status(403).type('text/plain').send('403 - Yêu cầu bị từ chối (nguồn gốc không hợp lệ).');
  }
  next();
});

// Giới hạn tần suất (in-memory, theo IP). Cấu hình qua biến môi trường.
const LOGIN_MAX_FAILS = Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_MAX = Number(process.env.RATE_LIMIT_SIGNUP_MAX) || 20;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const rateStore = new Map<string, { count: number; resetAt: number }>();
function rateBlocked(key: string, max: number): boolean {
  const e = rateStore.get(key);
  if (!e) return false;
  if (e.resetAt <= Date.now()) { rateStore.delete(key); return false; }
  return e.count >= max;
}
function rateHit(key: string, windowMs: number): void {
  const now = Date.now();
  if (rateStore.size > 5000) {
    for (const [k, v] of rateStore) if (v.resetAt <= now) rateStore.delete(k);
  }
  const e = rateStore.get(key);
  if (!e || e.resetAt <= now) rateStore.set(key, { count: 1, resetAt: now + windowMs });
  else e.count++;
}
function rateClear(key: string): void { rateStore.delete(key); }

const MIN_PASSWORD_LENGTH = 8;
function passwordError(pw: any): string | null {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  }
  return null;
}

function appointmentBaseFee(appt: { service_id?: number | null; doctor_id: number }): number {
  const row = appt.service_id
    ? db.prepare('SELECT price AS fee FROM services WHERE id = ?').get(appt.service_id) as any
    : db.prepare('SELECT consultation_fee AS fee FROM doctors WHERE id = ?').get(appt.doctor_id) as any;
  return Math.max(0, Number(row?.fee) || 0);
}

// Session & Flash
app.use(session({
  secret: activeSessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: 'lax', secure: isProduction ? 'auto' : false } // 1 day
}));
app.use(flash());

// Re-read authorization on each request so admin changes take effect for
// existing sessions immediately, including inactive accounts and revoked roles.
app.use((req, res, next) => {
  const sessionUser = req.session.user;
  if (!sessionUser) return next();
  const user = db.prepare('SELECT id, name, email, phone, role, status FROM users WHERE id = ?').get(sessionUser.id) as any;
  const roles = user
    ? (db.prepare('SELECT role FROM user_roles WHERE user_id = ?').all(user.id) as any[]).map(row => row.role)
    : [];
  if (!user || user.status !== 'active' || roles.length === 0) {
    delete req.session.user;
    return next();
  }
  const activeRole = roles.includes(sessionUser.active_role)
    ? sessionUser.active_role
    : roles.includes(user.role) ? user.role : roles[0];
  req.session.user = {
    ...sessionUser,
    name: user.name, email: user.email, phone: user.phone,
    role: activeRole, active_role: activeRole, roles
  };
  next();
});

// Helper layout renderer for Express
function renderWithLayout(res, view, data = {}, layout = 'layouts/main') {
  res.render(view, data, (err, body) => {
    if (err) {
      console.error('Render error:', err);
      return res.status(500).send('Đã xảy ra lỗi khi hiển thị trang. Vui lòng thử lại sau.');
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
  res.locals.getRoleName = helpers.getRoleName;
  res.locals.getRoleBadge = helpers.getRoleBadge;
  res.locals.getPriorityBadge = helpers.getPriorityBadge;
  res.locals.getVisitTypeBadge = helpers.getVisitTypeBadge;
  res.locals.getTreatmentTypeBadge = helpers.getTreatmentTypeBadge;
  res.locals.today = businessNow().date;
  res.locals.siteSettings = {
    clinicName: process.env.SITE_CLINIC_NAME || 'MediBook',
    address: process.env.SITE_ADDRESS || '',
    hotline: process.env.SITE_HOTLINE || '',
    email: process.env.SITE_EMAIL || '',
    supportHours: process.env.SITE_SUPPORT_HOURS || '',
    bankCode: /^[A-Z0-9]{2,20}$/.test(process.env.SITE_BANK_CODE || '') ? process.env.SITE_BANK_CODE : '',
    bankAccount: /^\d{6,20}$/.test(process.env.SITE_BANK_ACCOUNT || '') ? process.env.SITE_BANK_ACCOUNT : '',
    bankAccountName: process.env.SITE_BANK_ACCOUNT_NAME || ''
  };

  // Notifications for current user
  if (req.session.user) {
    try {
      const notifs = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY id DESC LIMIT 5
      `).all(req.session.user.id);
      const unreadCount = db.prepare(`
        SELECT count(*) as c FROM notifications 
        WHERE user_id = ? AND is_read = 0
      `).get(req.session.user.id).c;
      res.locals.recentNotifications = notifs;
      res.locals.unreadNotificationCount = unreadCount;
    } catch (e) {
      res.locals.recentNotifications = [];
      res.locals.unreadNotificationCount = 0;
    }
  } else {
    res.locals.recentNotifications = [];
    res.locals.unreadNotificationCount = 0;
  }

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
  const specialties = db.prepare(`
    SELECT s.*, count(DISTINCT CASE WHEN u.status = 'active' AND dr.user_id IS NOT NULL THEN d.id END) AS doctor_count
    FROM specialties s
    LEFT JOIN doctor_specialties ds ON ds.specialty_id = s.id
    LEFT JOIN doctors d ON d.id = ds.doctor_id
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
    WHERE s.status = 'active' GROUP BY s.id
  `).all();
  const doctors = db.prepare(`
    SELECT d.*, u.name, u.email, u.avatar,
           GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id AND u.status = 'active'
    JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
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
        WHERE a.patient_id = ? AND a.appointment_date >= ?
          AND a.status NOT IN ('cancelled', 'completed')
        ORDER BY a.appointment_date ASC, a.start_time ASC
        LIMIT 1
      `).get(patient.id, businessNow().date);
    }
  }

  const articles = db.prepare(`SELECT * FROM articles WHERE status = 'active' ORDER BY id ASC`).all();
  const articleCategories = db.prepare(`SELECT category, category_name FROM articles WHERE status = 'active' GROUP BY category ORDER BY min(id)`).all();
  const completedCount = (db.prepare("SELECT count(*) AS n FROM appointments WHERE status = 'completed'").get() as any).n;
  const ratingSummary = db.prepare('SELECT count(*) AS count, round(avg(rating), 1) AS average FROM reviews').get();
  const reviews = (db.prepare(`
    SELECT r.rating, r.comment, r.is_anonymous, u.name AS patient_name
    FROM reviews r JOIN patients p ON p.id = r.patient_id JOIN users u ON u.id = p.user_id
    WHERE trim(coalesce(r.comment, '')) <> '' ORDER BY r.id DESC LIMIT 3
  `).all() as any[]).map(r => ({ ...r, patient_name: r.is_anonymous ? 'Bệnh nhân ẩn danh' : helpers.maskName(r.patient_name) }));

  renderWithLayout(res, 'home/index', {
    pageTitle: 'MediBook - Đặt lịch khám và Quản lý phòng khám thông minh',
    specialties,
    doctors,
    upcomingAppointment,
    articles, articleCategories, completedCount, ratingSummary, reviews
  });
});

// ==========================================
// 1.1 MEDICAL ARTICLES (TIN Y TẾ & CẨM NANG)
// ==========================================
app.get(['/articles', '/tin-y-te'], (req, res) => {
  const category = ((req.query.category as string) || '').trim();
  const q = ((req.query.q as string) || '').trim();

  let sql = `SELECT * FROM articles WHERE status = 'active'`;
  const params: any[] = [];

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  if (q) {
    sql += ` AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  sql += ` ORDER BY id ASC`;
  const articles = db.prepare(sql).all(...params);

  renderWithLayout(res, 'articles/index', {
    pageTitle: 'Cẩm nang Y tế & Dược học - MediBook',
    articles,
    selectedCategory: category,
    searchQuery: q
  });
});

app.get(['/articles/:slug', '/tin-y-te/:slug'], (req, res) => {
  const slug = req.params.slug;
  const article = db.prepare(`SELECT * FROM articles WHERE slug = ? AND status = 'active'`).get(slug) as any;

  if (!article) {
    req.flash('error', 'Bài viết y khoa không tồn tại hoặc đã được cập nhật.');
    return res.redirect('/articles');
  }

  // Increment view count
  try {
    db.prepare(`UPDATE articles SET views_count = views_count + 1 WHERE id = ?`).run(article.id);
  } catch (e) {}

  // Fetch related articles in same category
  const relatedArticles = db.prepare(`
    SELECT * FROM articles 
    WHERE category = ? AND id != ? AND status = 'active'
    ORDER BY id ASC LIMIT 3
  `).all(article.category, article.id);

  renderWithLayout(res, 'articles/detail', {
    pageTitle: `${article.title} - MediBook Y tế`,
    article,
    relatedArticles
  });
});

app.get('/api/articles', (req, res) => {
  const category = ((req.query.category as string) || '').trim();
  const q = ((req.query.q as string) || '').trim();

  let sql = `SELECT id, category, category_name, pill_label, icon, slug, title, summary, author_name, author_role, views_count FROM articles WHERE status = 'active'`;
  const params: any[] = [];

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  if (q) {
    sql += ` AND (title LIKE ? OR summary LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern);
  }

  sql += ` ORDER BY id ASC`;
  const articles = db.prepare(sql).all(...params);
  res.json({ success: true, articles });
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

  const loginKey = `login|${req.ip}|${String(email).trim().toLowerCase()}`;
  if (rateBlocked(loginKey, LOGIN_MAX_FAILS)) {
    return res.status(429).render('errors/error', { message: 'Bạn đã thử đăng nhập sai quá nhiều lần (429). Vui lòng thử lại sau 15 phút.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    rateHit(loginKey, LOGIN_WINDOW_MS);
    req.flash('error', 'Email hoặc mật khẩu không chính xác.');
    return res.redirect('/login');
  }

  if (user.status !== 'active') {
    req.flash('error', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    return res.redirect('/login');
  }

  rateClear(loginKey);
  const rawIntended = req.session.intendedUrl;
  const intended = (typeof rawIntended === 'string' && rawIntended.startsWith('/') && !rawIntended.startsWith('//')) ? rawIntended : undefined;

  // Chống session fixation: cấp session ID mới sau khi đăng nhập thành công
  req.session.regenerate((regenErr: any) => {
  if (regenErr) {
    console.error('Session regenerate error:', regenErr);
    return res.status(500).render('errors/error', { message: 'Không thể khởi tạo phiên đăng nhập.' });
  }

  // Query all roles assigned to this user (1 user can have multiple roles)
  const userRolesRows = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').all(user.id);
  const userRoles = userRolesRows.map(r => r.role);
  if (!userRoles.length) {
    req.flash('error', 'Tài khoản chưa được phân quyền. Vui lòng liên hệ quản trị viên.');
    return res.redirect('/login');
  }
  const loginRole = userRoles.includes(user.role) ? user.role : userRoles[0];

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: loginRole,
    roles: userRoles,
    active_role: loginRole
  };

  logActivity(user.id, 'USER_LOGIN', 'User', user.id, 'Đăng nhập thành công', req);
  req.flash('success', `Chào mừng trở lại, ${user.name}!`);

  if (intended) {
    // CRITICAL RBAC GUARD:
    // If an Admin logs in, do NOT redirect them into receptionist or doctor portal!
    // Admin always goes to /admin/dashboard unless intended is an admin URL.
    if (loginRole === 'admin' && (intended.startsWith('/receptionist') || intended.startsWith('/doctor'))) {
      return res.redirect('/admin/dashboard');
    }
    if (loginRole === 'doctor' && (intended.startsWith('/receptionist') || intended.startsWith('/admin'))) {
      return res.redirect('/doctor/dashboard');
    }
    if (loginRole === 'receptionist' && (intended.startsWith('/doctor') || intended.startsWith('/admin'))) {
      return res.redirect('/receptionist/dashboard');
    }
    return res.redirect(intended);
  }

  redirectByRole(res, loginRole);
  });
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
  const pwErr = passwordError(password);
  if (pwErr) {
    req.flash('error', pwErr);
    return res.redirect('/register');
  }
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedName || normalizedName.length > 120 ||
      !/^(?:0|\+84)[35789]\d{8}$/.test(normalizedPhone) ||
      normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    req.flash('error', 'Họ tên, số điện thoại hoặc email không hợp lệ.');
    return res.redirect('/register');
  }
  const signupKey = `signup|${req.ip}`;
  if (rateBlocked(signupKey, SIGNUP_MAX)) {
    return res.status(429).render('errors/error', { message: 'Bạn thao tác quá nhiều lần (429). Vui lòng thử lại sau.' });
  }
  rateHit(signupKey, SIGNUP_WINDOW_MS);

  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normalizedEmail);
  if (existing) {
    req.flash('error', 'Email này đã tồn tại trên hệ thống.');
    return res.redirect('/register');
  }

  let newUserId: number | bigint;
  try {
    newUserId = db.transaction(() => {
      const hash = bcrypt.hashSync(password, 10);
      const result = db.prepare(`
        INSERT INTO users (role, name, email, password_hash, phone, status)
        VALUES ('patient', ?, ?, ?, ?, 'active')
      `).run(normalizedName, normalizedEmail, hash, normalizedPhone);
      db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(result.lastInsertRowid);
      db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'patient')").run(result.lastInsertRowid);
      return result.lastInsertRowid;
    })();
  } catch (error) {
    req.flash('error', 'Không thể tạo tài khoản. Vui lòng kiểm tra thông tin và thử lại.');
    return res.redirect('/register');
  }

  logActivity(newUserId, 'PATIENT_REGISTER', 'User', newUserId, 'Đăng ký tài khoản bệnh nhân', req);

  req.session.regenerate((regenErr: any) => {
  if (regenErr) return res.status(500).render('errors/error', { message: 'Tài khoản đã tạo nhưng chưa thể đăng nhập. Vui lòng đăng nhập lại.' });
  req.session.user = {
    id: newUserId,
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    role: 'patient',
    roles: ['patient'],
    active_role: 'patient'
  };

  req.flash('success', 'Đăng ký tài khoản bệnh nhân thành công!');
  res.redirect('/my-appointments');
  });
});

// Chuyển đổi vai trò làm việc linh hoạt (Switch Active Role)
app.get('/switch-role/:role', requireAuth, (req, res) => {
  const targetRole = req.params.role;
  const user = req.session.user;

  // Refresh user roles from user_roles table
  const dbRoles = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').all(user.id).map((r: any) => r.role);
  const userRoles = dbRoles.length > 0 ? dbRoles : (Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role]);
  user.roles = userRoles;

  if (userRoles.includes(targetRole)) {
    user.role = targetRole;
    user.active_role = targetRole;
    req.flash('info', `Đã chuyển sang giao diện vai trò: ${helpers.getRoleName(targetRole)}`);
    return redirectByRole(res, targetRole);
  }

  req.flash('error', 'Bạn không có quyền truy cập vai trò này.');
  redirectBack(req, res);
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

app.get('/for-doctors', (req, res) => {
  renderWithLayout(res, 'for-doctors/index', { pageTitle: 'Dành cho Bác sĩ - MediBook' });
});

app.post('/contact', (req, res) => {
  const { name, phone, email, subject, message } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.length > 120 ||
      typeof phone !== 'string' || !/^(?:0|\+84)[35789]\d{8}$/.test(phone.trim()) ||
      typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof message !== 'string' || !message.trim() || message.length > 5000 ||
      typeof subject !== 'string' || subject.length > 200) {
    req.flash('error', 'Vui lòng kiểm tra tên, số điện thoại, email và nội dung liên hệ.');
    return res.redirect('/contact');
  }

  const result = db.prepare(`
    INSERT INTO contact_requests (user_id, name, phone, email, subject, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.session.user?.id || null, name.trim(), phone.trim(), email.trim().toLowerCase(), subject.trim(), message.trim());
  logActivity(req.session.user ? req.session.user.id : null, 'CONTACT_SUBMIT', 'Contact', result.lastInsertRowid, `Yêu cầu liên hệ #${result.lastInsertRowid}`, req);
  req.flash('success', 'Yêu cầu liên hệ đã được ghi nhận.');
  res.redirect('/contact');
});

app.get('/admin/contact-requests', requireRole('admin'), (req, res) => {
  const requests = db.prepare('SELECT * FROM contact_requests ORDER BY id DESC LIMIT 200').all();
  renderWithLayout(res, 'admin/contact_requests', { pageTitle: 'Yêu cầu liên hệ', requests }, 'layouts/admin');
});

app.get('/specialties', (req, res) => {
  const specialties = db.prepare(`
    SELECT s.*, count(DISTINCT CASE WHEN u.status = 'active' AND dr.user_id IS NOT NULL THEN d.id END) as doctor_count
    FROM specialties s
    LEFT JOIN doctor_specialties ds ON s.id = ds.specialty_id
    LEFT JOIN doctors d ON d.id = ds.doctor_id
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
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
    JOIN users u ON d.user_id = u.id AND u.status = 'active'
    JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
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
    JOIN users u ON d.user_id = u.id AND u.status = 'active'
    JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
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
    JOIN users u ON d.user_id = u.id AND u.status = 'active'
    JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
    WHERE d.id = ?
    GROUP BY d.id
  `).get(req.params.id);

  if (!doctor) return res.status(404).render('errors/error', { message: 'Bác sĩ không tồn tại' });

  const schedules = db.prepare(`SELECT * FROM doctor_schedules WHERE doctor_id = ? AND status = 'active' ORDER BY day_of_week ASC`).all(doctor.id);
  const reviews = (db.prepare(`
    SELECT r.*, u.name as reviewer_name
    FROM reviews r
    JOIN patients p ON r.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE r.doctor_id = ?
    ORDER BY r.created_at DESC
  `).all(doctor.id) as any[]).map(r => ({ ...r, reviewer_name: r.is_anonymous ? 'Bệnh nhân ẩn danh' : helpers.maskName(r.reviewer_name) }));

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
    JOIN users u ON d.user_id = u.id AND u.status = 'active'
    JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
  `).all();

  const selectedSpecialtyId = req.query.specialty_id || '';
  const selectedDoctorId = req.query.doctor_id || '';
  const selectedDate = req.query.date || businessNow().date;

  let patient = null;
  if (req.session.user) {
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
    JOIN users u ON d.user_id = u.id AND u.status = 'active'
    JOIN user_roles dr ON dr.user_id = u.id AND dr.role = 'doctor'
    JOIN doctor_specialties ds ON d.id = ds.doctor_id
    JOIN specialties s ON s.id = ds.specialty_id AND s.status = 'active'
    WHERE ds.specialty_id = ?
  `).all(req.params.specialtyId);
  res.json({ success: true, doctors });
});

app.get('/api/services/by-specialty/:specialtyId', (req, res) => {
  const services = db.prepare(`SELECT * FROM services WHERE specialty_id = ? AND status = 'active'`).all(req.params.specialtyId);
  res.json({ success: true, services });
});

app.get('/api/slots', (req, res) => {
  const doctorId = Number(req.query.doctor_id);
  const date = String(req.query.date || '');
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const parsedDate = dateParts && new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3])));
  if (!Number.isSafeInteger(doctorId) || doctorId <= 0 || !parsedDate || parsedDate.toISOString().slice(0, 10) !== date) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin bác sĩ hoặc ngày' });
  }
  const dayOfWeek = parsedDate.getUTCDay();
  const todayStr = businessNow().date;
  if (date < todayStr) {
    return res.json({
      success: false,
      error: 'Không thể đặt lịch vào ngày trong quá khứ.',
      slots: []
    });
  }

  // 2. Kiểm tra ngày nghỉ phép của bác sĩ (doctor_leaves)
  const leave = db.prepare(`
    SELECT * FROM doctor_leaves 
    WHERE doctor_id = ? AND status = 'approved' AND ? BETWEEN start_date AND end_date
  `).get(doctorId, date) as { reason?: string } | undefined;

  if (leave) {
    return res.json({
      success: false,
      error: `Bác sĩ có lịch nghỉ phép vào ngày ${date}${leave.reason ? ` (${leave.reason})` : ''}. Vui lòng chọn ngày khác.`,
      slots: []
    });
  }

  const schedules = db.prepare(`
    SELECT * FROM doctor_schedules 
    WHERE doctor_id = ? AND day_of_week = ? AND status = 'active'
  `).all(doctorId, dayOfWeek) as any[];

  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  if (!schedules.length) {
    const allDocSchedules = db.prepare(`
      SELECT day_of_week, start_time, end_time FROM doctor_schedules
      WHERE doctor_id = ? AND status = 'active'
      ORDER BY day_of_week ASC
    `).all(doctorId) as { day_of_week: number; start_time: string; end_time: string }[];
    const workingDays = allDocSchedules.map(s => dayNames[s.day_of_week]);

    return res.json({ 
      success: false, 
      error: `Bác sĩ không có ca trực vào ${dayNames[dayOfWeek]}.${workingDays.length > 0 ? ' Bác sĩ có lịch vào: ' + workingDays.join(', ') + '.' : ''}`,
      working_days: workingDays,
      slots: [] 
    });
  }

  const slots: any[] = [];
  for (const schedule of schedules) {
    const [startH, startM] = schedule.start_time.split(':').map(Number);
    const [endH, endM] = schedule.end_time.split(':').map(Number);
    let curMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const dur = Number(schedule.slot_duration);
    if (!Number.isSafeInteger(dur) || dur <= 0) continue;

    while (curMinutes + dur <= endMinutes) {
    const sH = String(Math.floor(curMinutes / 60)).padStart(2, '0');
    const sM = String(curMinutes % 60).padStart(2, '0');
    const eH = String(Math.floor((curMinutes + dur) / 60)).padStart(2, '0');
    const eM = String((curMinutes + dur) % 60).padStart(2, '0');

    const slotStart = `${sH}:${sM}:00`;
    const slotEnd = `${eH}:${eM}:00`;
    const display = `${sH}:${sM} - ${eH}:${eM}`;

    const isPast = date === todayStr && slotStart <= businessNow().time;
    let available = false;
    if (!isPast) {
      try { validateBooking(db, { doctorId, date, startTime: slotStart }); available = true; }
      catch (error) { if (!(error instanceof BookingRuleError)) throw error; }
    }

    slots.push({
      start_time: slotStart,
      end_time: slotEnd,
      display: display,
      available,
      is_past: isPast
    });

    curMinutes += dur;
    }
  }
  slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
  res.json({ success: true, slots });
});

// Quay lại trang trước một cách an toàn (chỉ chấp nhận Referer cùng origin, tránh open redirect / "Location: back")
function redirectBack(req: any, res: any, fallback: string = '/') {
  const ref = req.get('Referer');
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.host === req.get('host')) {
        return res.redirect(u.pathname + u.search);
      }
    } catch (_) { /* Referer không hợp lệ -> dùng fallback */ }
  }
  return res.redirect(fallback);
}

// Book Appointment POST
app.post('/appointments/book', (req, res) => {
  const { specialty_id, doctor_id, service_id, appointment_date, start_time, symptoms } = req.body;

  let patientId: number | bigint | null = null;
  let guestData: { name: string; phone: string; email: string } | null = null;
  let newGuestUser: { id: number | bigint; name: string; phone: string; email: string; password: string } | null = null;

  if (req.session.user) {
    // Chặn bác sĩ tự đặt lịch khám cho chính mình
    const currentDoc = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.session.user.id) as any;
    if (currentDoc && currentDoc.id === Number(doctor_id)) {
      req.flash('error', 'Bác sĩ không thể tự đặt lịch khám cho chính mình. Vui lòng chọn đồng nghiệp hoặc bác sĩ chuyên khoa khác!');
      return redirectBack(req, res);
    }

    const pat = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.session.user.id) as any;
    if (pat) patientId = pat.id;
  } else {
    // Check the guest identity before validating the slot, but defer all writes
    // until the reservation transaction succeeds.
    const { patient_name, patient_phone, patient_email } = req.body;
    const name = typeof patient_name === 'string' ? patient_name.trim() : '';
    const phone = typeof patient_phone === 'string' ? patient_phone.trim() : '';
    const email = typeof patient_email === 'string' ? patient_email.trim().toLowerCase() : '';
    if (!name || name.length > 120 || !/^(?:0|\+84)[35789]\d{8}$/.test(phone) ||
        email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      req.flash('error', 'Vui lòng nhập họ tên, số điện thoại Việt Nam và email hợp lệ.');
      return redirectBack(req, res);
    }

    const guestKey = `signup|${req.ip}`;
    if (rateBlocked(guestKey, SIGNUP_MAX)) {
      return res.status(429).render('errors/error', { message: 'Bạn thao tác quá nhiều lần (429). Vui lòng thử lại sau.' });
    }
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
    if (existingUser) {
      req.session.intendedUrl = '/appointments/book';
      req.flash('error', 'Email này đã có tài khoản. Vui lòng đăng nhập để đặt lịch khám.');
      return res.redirect('/login');
    }

    guestData = { name, phone, email };
  }

  let booking: any;
  try {
    booking = validateBooking(db, {
      doctorId: doctor_id, specialtyId: specialty_id, serviceId: service_id,
      date: appointment_date, startTime: start_time
    });
  } catch (err: any) {
    req.flash('error', err instanceof BookingRuleError ? err.message : 'Thông tin đặt lịch không hợp lệ.');
    return redirectBack(req, res);
  }

  // Generate unique booking code
  const codeDate = booking.date.replace(/-/g, '').slice(2);
  const randNum = crypto.randomBytes(6).toString('hex');
  const bookingCode = `MB${codeDate}-${randNum}`;

  // Triage: Phân loại thứ tự ưu tiên (Khẩn cấp -> Người già, trẻ em, thai phụ -> Online -> Offline)
  const patInfo = patientId ? db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any : null;
  let priorityLevel = 'online';
  let priorityReason = 'Đặt lịch trực tuyến';

  if (patInfo && patInfo.dob) {
    const birthYear = new Date(patInfo.dob).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age >= 60) {
      priorityLevel = 'priority';
      priorityReason = `Người cao tuổi (${age} tuổi)`;
    } else if (age <= 6) {
      priorityLevel = 'priority';
      priorityReason = `Trẻ em (${age} tuổi)`;
    }
  }

  if (req.body.is_pregnant || req.body.priority_target === 'pregnant') {
    priorityLevel = 'priority';
    priorityReason = 'Phụ nữ mang thai';
  } else if (req.body.priority_target === 'elderly') {
    priorityLevel = 'priority';
    priorityReason = 'Người cao tuổi';
  } else if (req.body.priority_target === 'child') {
    priorityLevel = 'priority';
    priorityReason = 'Trẻ em';
  }

  // One transaction owns identity creation and the reserved slot. A failed
  // reservation cannot leave an unusable guest account behind.
  let appointmentId: number | bigint;
  try {
    const bookTx = db.transaction(() => {
      booking = validateBooking(db, {
        doctorId: doctor_id, specialtyId: specialty_id, serviceId: service_id,
        date: appointment_date, startTime: start_time
      });
      if (guestData) {
        const duplicate = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(guestData.email);
        if (duplicate) throw new BookingRuleError('Email này đã có tài khoản. Vui lòng đăng nhập để đặt lịch.');
        const password = crypto.randomBytes(12).toString('base64url');
        const hash = bcrypt.hashSync(password, 10);
        const userId = db.prepare(`
          INSERT INTO users (role, name, email, password_hash, phone, status)
          VALUES ('patient', ?, ?, ?, ?, 'active')
        `).run(guestData.name, guestData.email, hash, guestData.phone).lastInsertRowid;
        patientId = db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(userId).lastInsertRowid;
        db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'patient')").run(userId);
        newGuestUser = { id: userId, ...guestData, password };
      } else if (!patientId) {
        patientId = db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(req.session.user.id).lastInsertRowid;
      }

      const insertApp = db.prepare(`
        INSERT INTO appointments (booking_code, patient_id, doctor_id, specialty_id, service_id, appointment_date, start_time, end_time, status, symptoms, source, priority_level, priority_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'online', ?, ?)
      `);
      const appResult = insertApp.run(
        bookingCode, patientId, booking.doctorId, booking.specialtyId, booking.serviceId,
        booking.date, booking.startTime, booking.endTime, symptoms || '', priorityLevel, priorityReason
      );

      // Status history
      db.prepare(`
        INSERT INTO appointment_status_history (appointment_id, old_status, new_status, note)
        VALUES (?, 'pending', 'confirmed', 'Bệnh nhân hoàn tất đặt lịch trực tuyến')
      `).run(appResult.lastInsertRowid);

      return appResult.lastInsertRowid;
    });

    appointmentId = bookTx();
  } catch (err: any) {
    if (err instanceof BookingRuleError) {
      req.flash('error', err.message);
      return redirectBack(req, res);
    }
    if (err.code === 'SQLITE_CONSTRAINT' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
      req.flash('error', 'Khung giờ này vừa có người khác đặt trước. Vui lòng chọn khung giờ khác.');
      return redirectBack(req, res);
    }
    console.error('Booking transaction error:', err);
    req.flash('error', 'Không thể hoàn tất đặt lịch. Vui lòng thử lại.');
    return redirectBack(req, res);
  }

  const finishBooking = () => {
  if (newGuestUser) {
    rateHit(`signup|${req.ip}`, SIGNUP_WINDOW_MS);
    req.session.user = {
      id: newGuestUser.id, name: newGuestUser.name, email: newGuestUser.email,
      phone: newGuestUser.phone, role: 'patient', roles: ['patient'], active_role: 'patient'
    };
    req.session.newAccount = { email: newGuestUser.email, password: newGuestUser.password };
  }
  try {
    // 1. Notification cho bệnh nhân
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Đặt lịch khám thành công', ?, 'appointment', ?)
    `).run(req.session.user.id, `Mã lịch hẹn: ${bookingCode}`, `/appointments/${bookingCode}`);

    // 2. Notification cho bác sĩ phụ trách
    const docUser = db.prepare('SELECT user_id FROM doctors WHERE id = ?').get(doctor_id) as any;
    if (docUser && docUser.user_id) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'Lịch hẹn mới cần khám', ?, 'appointment', ?)
      `).run(docUser.user_id, `Có bệnh nhân mới đặt lịch #${bookingCode} ngày ${appointment_date} (${start_time})`, '/doctor/queue');
    }

    // 3. Notification cho Admin / Lễ tân
    const adminUsers = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'receptionist')").all() as any[];
    const notifStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Có lịch đặt khám mới', ?, 'appointment', ?)
    `);
    for (const aUser of adminUsers) {
      notifStmt.run(aUser.id, `Lịch mới #${bookingCode} - Bác sĩ ID ${doctor_id} ngày ${appointment_date}`, `/admin/appointments`);
    }

    logActivity(req.session.user.id, 'BOOK_APPOINTMENT', 'Appointment', Number(appointmentId), `Đặt lịch thành công: ${bookingCode}`, req);

    res.redirect(`/appointments/success/${bookingCode}`);
  } catch (err) {
    console.error('Booking post-processing error:', err);
    res.redirect(`/appointments/success/${bookingCode}`);
  }
  };
  if (newGuestUser) {
    req.session.regenerate((regenErr: any) => {
      if (regenErr) return res.status(500).render('errors/error', { message: 'Đã đặt lịch nhưng chưa thể đăng nhập. Vui lòng đăng nhập bằng tài khoản vừa tạo.' });
      finishBooking();
    });
  } else finishBooking();
});

app.get('/appointments/success/:code', requireAuth, (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, s.name as specialty_name, u.name as patient_name,
           p.user_id as patient_user_id, d.user_id as doctor_user_id,
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
  const viewer = req.session.user;
  const staffRoles = Array.isArray(viewer.roles) ? viewer.roles : [viewer.role];
  if (viewer.id !== appt.patient_user_id && viewer.id !== appt.doctor_user_id &&
      !staffRoles.some((role: string) => role === 'admin' || role === 'receptionist')) {
    return res.status(403).render('errors/error', { message: 'Bạn không có quyền xem lịch hẹn này.' });
  }
  let newAccount = null;
  if (req.session.newAccount && req.session.user && req.session.user.email === req.session.newAccount.email) {
    newAccount = req.session.newAccount;
  }
  delete req.session.newAccount;
  renderWithLayout(res, 'appointments/success', { pageTitle: 'Đặt lịch thành công - MediBook', app: appt, newAccount });
});

app.get('/appointments/:code', requireAuth, (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, s.name as specialty_name, u.name as patient_name, u.phone as patient_phone,
           p.user_id as patient_user_id, d.user_id as doctor_user_id,
           ud.name as doctor_name, d.title as doctor_title, d.room_number,
           eq.queue_number, mr.id as medical_record_id, mr.clinical_diagnosis, mr.icd10_code, mr.doctor_notes,
           mr.visit_type, mr.treatment_type, mr.inpatient_room, mr.inpatient_bed, mr.admission_date, mr.discharge_date,
           mr.vital_signs
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

  // IDOR Authorization Protection:
  const user = req.session.user;
  const isOwner = user.id === appt.patient_user_id;
  const isDoctor = user.id === appt.doctor_user_id;
  const isStaff = ['admin', 'receptionist'].includes(user.role) || (Array.isArray(user.roles) && user.roles.some((r: string) => ['admin', 'receptionist'].includes(r)));

  if (!isOwner && !isDoctor && !isStaff) {
    req.flash('error', 'Bạn không có quyền xem thông tin lịch khám này.');
    return res.status(403).render('errors/error', { message: 'Truy cập bị từ chối (403): Bạn không có quyền truy cập hồ sơ lịch khám này.' });
  }

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
  const appt = db.prepare(`
    SELECT a.id, a.status, a.patient_id, p.user_id as patient_user_id
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.booking_code = ?
  `).get(req.params.code);

  if (!appt) {
    req.flash('error', 'Lịch khám không tồn tại.');
    return redirectBack(req, res);
  }

  // Check authorization: Owner or staff/admin
  const isOwner = req.session.user.role === 'patient' && req.session.user.id === appt.patient_user_id;
  const isStaff = ['admin', 'receptionist'].includes(req.session.user.role);

  if (!isOwner && !isStaff) {
    req.flash('error', 'Bạn không có quyền hủy lịch khám của người khác.');
    return res.redirect(`/appointments/${req.params.code}`);
  }

  if (['pending', 'confirmed'].includes(appt.status)) {
    db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(appt.id);
    db.prepare(`
      INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by_user_id, note)
      VALUES (?, ?, 'cancelled', ?, ?)
    `).run(appt.id, appt.status, req.session.user.id, isOwner ? 'Bệnh nhân chủ động hủy lịch' : 'Nhân viên hủy lịch');
    req.flash('success', 'Đã hủy lịch khám thành công.');
  } else {
    req.flash('error', 'Không thể hủy lịch khám ở trạng thái hiện tại.');
  }
  res.redirect(`/appointments/${req.params.code}`);
});

app.post('/appointments/:code/review', requireAuth, (req, res) => {
  const appt = db.prepare(`
    SELECT a.id, a.doctor_id, a.patient_id, a.status, p.user_id as patient_user_id 
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.booking_code = ?
  `).get(req.params.code);

  if (!appt) {
    req.flash('error', 'Lịch khám không tồn tại.');
    return redirectBack(req, res);
  }

  // Only the patient who booked this appointment can review, and only when completed
  if (req.session.user.id !== appt.patient_user_id) {
    req.flash('error', 'Bạn chỉ có thể đánh giá cho lịch khám của chính mình.');
    return res.redirect(`/appointments/${req.params.code}`);
  }

  if (appt.status !== 'completed') {
    req.flash('error', 'Bạn chỉ có thể gửi đánh giá sau khi cuộc khám đã hoàn thành.');
    return res.redirect(`/appointments/${req.params.code}`);
  }

  const { rating, comment } = req.body;
  const rateVal = Number(rating);
  if (!Number.isInteger(rateVal) || rateVal < 1 || rateVal > 5 || typeof comment !== 'string' || comment.length > 2000) {
    req.flash('error', 'Đánh giá phải từ 1 đến 5 sao và bình luận không quá 2000 ký tự.');
    return res.redirect(`/appointments/${req.params.code}`);
  }
  db.transaction(() => {
    db.prepare(`
      INSERT INTO reviews (appointment_id, patient_id, doctor_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(appointment_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment
    `).run(appt.id, appt.patient_id, appt.doctor_id, rateVal, comment);

  // Recalculate doctor rating and rating_count
  const stats = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
    FROM reviews WHERE doctor_id = ?
  `).get(appt.doctor_id);

  if (stats && stats.total_reviews > 0) {
    db.prepare(`
      UPDATE doctors SET rating = ?, rating_count = ? WHERE id = ?
    `).run(Number(stats.avg_rating.toFixed(1)), stats.total_reviews, appt.doctor_id);
  }
  })();

  req.flash('success', 'Cảm ơn bạn đã gửi đánh giá cho bác sĩ!');
  res.redirect(`/appointments/${req.params.code}`);
});

app.get('/my-appointments', requireRole('patient'), (req, res) => {
  let patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.session.user.id) as any;
  if (!patient) {
    const pRes = db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(req.session.user.id);
    patient = { id: pRes.lastInsertRowid };
  }
  const appointments = db.prepare(`
    SELECT a.*, s.name as specialty_name, srv.name as service_name,
           u.name as doctor_name, d.title as doctor_title, d.room_number
    FROM appointments a
    LEFT JOIN specialties s ON a.specialty_id = s.id
    LEFT JOIN services srv ON a.service_id = srv.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC, a.start_time DESC
  `).all(patient.id);

  renderWithLayout(res, 'appointments/index', { pageTitle: 'Lịch khám của tôi - MediBook', appointments });
});

// Profile
app.get('/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.session.user.id);

  let favoriteDoctors = [];
  if (patient) {
    favoriteDoctors = db.prepare(`
      SELECT d.*, u.name, u.avatar,
             GROUP_CONCAT(s.name, ', ') as specialty_names
      FROM favorite_doctors fd
      JOIN doctors d ON fd.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
      LEFT JOIN specialties s ON ds.specialty_id = s.id
      WHERE fd.patient_id = ?
      GROUP BY d.id
      ORDER BY fd.created_at DESC
    `).all(patient.id);
  }

  renderWithLayout(res, 'profile/index', { pageTitle: 'Hồ sơ cá nhân - MediBook', user, patient, favoriteDoctors });
});

// API Toggle Favorite Doctor
app.post('/api/favorite-doctor', requireAuth, (req, res) => {
  if (req.session.user.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Chỉ bệnh nhân mới có thể lưu bác sĩ yêu thích.' });
  }

  const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.session.user.id);
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Hồ sơ bệnh nhân không tồn tại.' });
  }

  const doctorId = parseInt(req.body.doctor_id);
  if (!doctorId) {
    return res.status(400).json({ success: false, message: 'Thiếu ID bác sĩ.' });
  }

  const existing = db.prepare('SELECT id FROM favorite_doctors WHERE patient_id = ? AND doctor_id = ?').get(patient.id, doctorId);

  if (existing) {
    db.prepare('DELETE FROM favorite_doctors WHERE id = ?').run(existing.id);
    return res.json({ success: true, is_favorite: false, message: 'Đã bỏ lưu bác sĩ.' });
  } else {
    db.prepare('INSERT INTO favorite_doctors (patient_id, doctor_id) VALUES (?, ?)').run(patient.id, doctorId);
    return res.json({ success: true, is_favorite: true, message: 'Đã thêm bác sĩ vào danh sách yêu thích!' });
  }
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

  const profilePwErr = passwordError(new_password);
  if (profilePwErr) {
    req.flash('error', profilePwErr);
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
function getOrCreateDoctorProfile(userId: number) {
  let doc = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(userId) as any;
  if (!doc) {
    db.prepare(`
      INSERT INTO doctors (user_id, consultation_fee, rating, room_number) VALUES (?, 0, 0, '')
    `).run(userId);
    doc = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(userId);
  }
  return doc;
}

app.get('/doctor/dashboard', requireRole('doctor'), (req, res) => {
  const doctor = getOrCreateDoctorProfile(req.session.user.id);
  const today = businessNow().date;

  const totalToday = db.prepare(`SELECT count(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ?`).get(doctor.id, today).c;
  const waitingCount = db.prepare(`
    SELECT count(*) as c FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    WHERE a.doctor_id = ? AND eq.status IN ('waiting', 'calling') AND a.appointment_date = ?
  `).get(doctor.id, today).c;
  const completedToday = db.prepare(`SELECT count(*) as c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'completed'`).get(doctor.id, today).c;

  const todayQueue = db.prepare(`
    SELECT eq.*, a.booking_code, a.start_time, a.symptoms, a.priority_reason, u.name as patient_name
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.doctor_id = ? AND a.appointment_date = ?
    ORDER BY 
      CASE WHEN eq.status = 'calling' THEN 0 WHEN eq.status = 'in_room' THEN 1 WHEN eq.status = 'waiting' THEN 2 ELSE 3 END,
      eq.priority_order ASC,
      eq.id ASC
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
  getOrCreateDoctorProfile(req.session.user.id);
  const doctor = db.prepare(`
    SELECT d.*, u.name, u.email, GROUP_CONCAT(s.name, ', ') as specialty_names
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_specialties ds ON d.id = ds.doctor_id
    LEFT JOIN specialties s ON ds.specialty_id = s.id
    WHERE d.user_id = ?
    GROUP BY d.id
  `).get(req.session.user.id);

  const today = businessNow().date;
  const queueList = db.prepare(`
    SELECT eq.*, a.booking_code, a.start_time, a.symptoms, a.priority_reason,
           u.name as patient_name, u.phone as patient_phone,
           p.gender as patient_gender, p.dob as patient_dob
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.doctor_id = ? AND a.appointment_date = ?
    ORDER BY 
      CASE WHEN eq.status = 'calling' THEN 0 WHEN eq.status = 'in_room' THEN 1 WHEN eq.status = 'waiting' THEN 2 ELSE 3 END,
      eq.priority_order ASC,
      eq.id ASC
  `).all(doctor.id, today);

  renderWithLayout(res, 'doctor/queue', { pageTitle: 'Hàng đợi phòng khám - Bác sĩ', doctor, queueList }, 'layouts/doctor');
});

app.post('/doctor/queue/call/:id', requireRole('doctor'), (req, res) => {
  const qItem = db.prepare(`
    SELECT eq.*, a.doctor_id, d.user_id as doctor_user_id
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE eq.id = ?
  `).get(req.params.id);

  if (!qItem) {
    req.flash('error', 'Lượt chờ không tồn tại.');
    return res.redirect('/doctor/queue');
  }

  const isAdmin = req.session.user.role === 'admin' || (Array.isArray(req.session.user.roles) && req.session.user.roles.includes('admin'));
  if (!isAdmin && qItem.doctor_user_id !== req.session.user.id) {
    req.flash('error', 'Bạn không thể thao tác trên hàng đợi của bác sĩ khác.');
    return res.redirect(403, '/doctor/queue');
  }

  const changed = db.prepare(`UPDATE examination_queues SET status = 'calling', called_time = datetime('now') WHERE id = ? AND status = 'waiting'`).run(req.params.id);
  if (!changed.changes) return res.redirect(409, '/doctor/queue');
  req.flash('info', 'Đã phát loa gọi bệnh nhân vào phòng khám.');
  res.redirect('/doctor/queue');
});

app.post('/doctor/queue/start/:id', requireRole('doctor'), (req, res) => {
  const qItem = db.prepare(`
    SELECT eq.*, a.doctor_id, d.user_id as doctor_user_id
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE eq.id = ?
  `).get(req.params.id);

  if (!qItem) {
    req.flash('error', 'Lượt chờ không tồn tại.');
    return res.redirect('/doctor/queue');
  }

  const isAdmin = req.session.user.role === 'admin' || (Array.isArray(req.session.user.roles) && req.session.user.roles.includes('admin'));
  if (!isAdmin && qItem.doctor_user_id !== req.session.user.id) {
    req.flash('error', 'Bạn không thể thao tác trên hàng đợi của bác sĩ khác.');
    return res.redirect(403, '/doctor/queue');
  }

  const started = db.transaction(() => {
    const changed = db.prepare(`UPDATE examination_queues SET status = 'in_room' WHERE id = ? AND status = 'calling'`).run(req.params.id);
    if (!changed.changes) return false;
    const apptChanged = db.prepare(`UPDATE appointments SET status = 'in_consultation' WHERE id = ? AND status = 'checked_in'`).run(qItem.appointment_id);
    if (!apptChanged.changes) throw new Error('Lịch hẹn không ở trạng thái đã tiếp đón.');
    return true;
  })();
  if (!started) return res.redirect(409, '/doctor/queue');
  res.redirect(`/doctor/examine/${qItem.appointment_id}`);
});

app.post('/doctor/queue/skip/:id', requireRole('doctor'), (req, res) => {
  const qItem = db.prepare(`
    SELECT eq.*, a.doctor_id, d.user_id as doctor_user_id
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE eq.id = ?
  `).get(req.params.id);

  if (!qItem) {
    req.flash('error', 'Lượt chờ không tồn tại.');
    return res.redirect('/doctor/queue');
  }

  const isAdmin = req.session.user.role === 'admin' || (Array.isArray(req.session.user.roles) && req.session.user.roles.includes('admin'));
  if (!isAdmin && qItem.doctor_user_id !== req.session.user.id) {
    req.flash('error', 'Bạn không thể thao tác trên hàng đợi của bác sĩ khác.');
    return res.redirect(403, '/doctor/queue');
  }

  const changed = db.prepare(`UPDATE examination_queues SET status = 'waiting' WHERE id = ? AND status = 'calling'`).run(req.params.id);
  if (!changed.changes) return res.redirect(409, '/doctor/queue');
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

  // Doctor Data Isolation Check:
  const doctorRecord = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.session.user.id);
  const isAdmin = req.session.user.role === 'admin' || (Array.isArray(req.session.user.roles) && req.session.user.roles.includes('admin'));
  if (!isAdmin && (!doctorRecord || appt.doctor_id !== doctorRecord.id)) {
    req.flash('error', 'Bạn không được phân công khám cho ca hẹn này.');
    return res.status(403).render('errors/error', { message: 'Truy cập bị từ chối (403): Ca khám này thuộc về bác sĩ khác.' });
  }

  const pastRecords = db.prepare(`
    SELECT mr.*, a.appointment_date, a.booking_code, a.status as appt_status, ud.name as doctor_name
    FROM medical_records mr
    JOIN appointments a ON mr.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    WHERE mr.patient_id = ? AND mr.appointment_id != ?
    ORDER BY a.appointment_date DESC, mr.id DESC
  `).all(appt.patient_id, appt.id) as any[];

  // Attach prescriptions and prescription items to each past record
  for (const pr of pastRecords) {
    const p = db.prepare('SELECT id, total_amount, usage_instructions FROM prescriptions WHERE medical_record_id = ?').get(pr.id) as any;
    if (p) {
      p.items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(p.id);
      pr.prescription = p;
    }
  }

  // Calculate 14-day discount eligibility
  const prevCompletedVisit = pastRecords.find(pr => pr.appt_status === 'completed' || !pr.appt_status);
  let isWithin14Days = false;
  let daysDiff = -1;
  if (prevCompletedVisit && prevCompletedVisit.appointment_date && appt.appointment_date) {
    const prevTime = new Date(prevCompletedVisit.appointment_date).getTime();
    const currTime = new Date(appt.appointment_date).getTime();
    daysDiff = Math.floor((currTime - prevTime) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 0 && daysDiff <= 14) {
      isWithin14Days = true;
    }
  }

  const medicines = db.prepare(`SELECT * FROM medicines WHERE status = 'active'`).all();
  const currentRecord = db.prepare(`SELECT * FROM medical_records WHERE appointment_id = ?`).get(appt.id);

  let currentPrescription = null;
  if (currentRecord) {
    currentPrescription = db.prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?').get(currentRecord.id);
    if (currentPrescription) {
      currentPrescription.items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(currentPrescription.id);
    }
  }

  const allRooms = db.prepare('SELECT * FROM rooms ORDER BY room_number ASC').all();
  const availableBeds = db.prepare(`
    SELECT b.*, r.room_number, r.room_name 
    FROM beds b 
    JOIN rooms r ON b.room_id = r.id 
    WHERE b.status = 'available' 
    ORDER BY r.room_number, b.bed_number
  `).all();

  renderWithLayout(res, 'doctor/examine', {
    pageTitle: `Khám bệnh: ${appt.patient_name}`,
    app: appt,
    pastRecords,
    prevCompletedVisit,
    isWithin14Days,
    daysDiff,
    baseServiceFee: appointmentBaseFee(appt),
    medicines,
    currentRecord,
    currentPrescription,
    allRooms,
    availableBeds
  }, 'layouts/doctor');
});

app.post('/doctor/examine/:appointmentId', requireRole('doctor'), (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.appointmentId) as any;
  if (!appt) return res.status(404).render('errors/error', { message: 'Không tìm thấy hồ sơ' });

  // Doctor Data Isolation Check:
  const doctorRecord = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.session.user.id) as any;
  const isAdmin = req.session.user.role === 'admin' || (Array.isArray(req.session.user.roles) && req.session.user.roles.includes('admin'));
  if (!isAdmin && (!doctorRecord || appt.doctor_id !== doctorRecord.id)) {
    req.flash('error', 'Bạn không được phân công khám cho ca hẹn này.');
    return res.status(403).render('errors/error', { message: 'Truy cập bị từ chối (403): Ca khám này thuộc về bác sĩ khác.' });
  }

  const existingPayment = db.prepare('SELECT payment_status FROM payments WHERE appointment_id = ?').get(appt.id) as any;
  if (existingPayment?.payment_status === 'paid') {
    return res.status(409).render('errors/error', { message: 'Ca khám đã thanh toán. Không thể sửa bệnh án và hóa đơn qua luồng này.' });
  }

  const { 
    blood_pressure, heart_rate, temperature, weight, height, bmi, 
    anamnesis, clinical_diagnosis, icd10_code, doctor_notes, re_examination_date,
    visit_type, treatment_type, inpatient_room, inpatient_bed, admission_date, discharge_date
  } = req.body;

  const vitalsJson = JSON.stringify({ blood_pressure, heart_rate, temperature, weight, height, bmi });

  const vType = visit_type || 'initial';
  const tType = treatment_type || 'outpatient';
  const inRoom = tType === 'inpatient' ? (inpatient_room ? inpatient_room.trim() : '') : null;
  const inBed = tType === 'inpatient' ? (inpatient_bed ? inpatient_bed.trim() : '') : null;
  const admDate = tType === 'inpatient' ? (admission_date || null) : null;
  const disDate = tType === 'inpatient' ? (discharge_date || null) : null;

  // Chuẩn hóa danh sách thuốc & kiểm tra tồn kho TRƯỚC khi ghi bất kỳ dữ liệu nào.
  // Giá lấy từ danh mục thuốc (không tin giá do client gửi lên).
  const toArr = (v: any) => (Array.isArray(v) ? v : (v === undefined ? [] : [v]));
  const rxNames = toArr(req.body.med_name);
  const rxItems: any[] = [];
  for (let i = 0; i < rxNames.length; i++) {
    const mId = parseInt(toArr(req.body.med_id)[i]) || null;
    const med = mId ? db.prepare('SELECT id, name, unit, unit_price FROM medicines WHERE id = ?').get(mId) as any : null;
    if (mId && !med) {
      req.flash('error', 'Thuốc được chọn không tồn tại trong danh mục.');
      return redirectBack(req, res);
    }
    const name = String(rxNames[i] || '').trim() || (med ? med.name : '');
    if (!name) continue;
    rxItems.push({
      mId, name,
      dosage: toArr(req.body.med_dosage)[i] || '',
      unit: toArr(req.body.med_unit)[i] || (med ? med.unit : 'Viên'),
      q: Math.max(1, parseFloat(toArr(req.body.med_quantity)[i]) || 1),
      p: med ? Number(med.unit_price) || 0 : Math.max(0, parseFloat(toArr(req.body.med_price)[i]) || 0),
      morning: toArr(req.body.med_morning)[i] || '0',
      noon: toArr(req.body.med_noon)[i] || '0',
      afternoon: toArr(req.body.med_afternoon)[i] || '0',
      night: toArr(req.body.med_night)[i] || '0',
      instructions: toArr(req.body.med_instructions)[i] || ''
    });
  }
  if (rxItems.length > 0) {
    const need = new Map<number, number>();
    for (const it of rxItems) if (it.mId) need.set(it.mId, (need.get(it.mId) || 0) + it.q);
    const oldItems = db.prepare(`
      SELECT pi.medicine_id, pi.quantity FROM prescription_items pi
      JOIN prescriptions p ON p.id = pi.prescription_id
      WHERE p.medical_record_id = (SELECT id FROM medical_records WHERE appointment_id = ?)
    `).all(appt.id) as any[];
    for (const [mid, qty] of need) {
      const med = db.prepare('SELECT name, stock_quantity FROM medicines WHERE id = ?').get(mid) as any;
      const restorable = oldItems.filter(o => o.medicine_id === mid).reduce((s, o) => s + Number(o.quantity), 0);
      if (qty > Number(med.stock_quantity) + restorable) {
        req.flash('error', `Không đủ tồn kho cho thuốc "${med.name}" (còn ${Number(med.stock_quantity) + restorable}, yêu cầu ${qty}).`);
        return redirectBack(req, res);
      }
    }
  }

  // Check previous completed visit for parent_visit_id & 14-day 50% discount
  const prevCompletedVisit = db.prepare(`
    SELECT mr.id as medical_record_id, a.id as appointment_id, a.appointment_date
    FROM medical_records mr
    JOIN appointments a ON mr.appointment_id = a.id
    WHERE a.patient_id = ? AND a.status = 'completed' AND a.id != ?
    ORDER BY a.appointment_date DESC, mr.id DESC
    LIMIT 1
  `).get(appt.patient_id, appt.id) as { medical_record_id: number; appointment_id: number; appointment_date: string } | undefined;

  let parentVisitId: number | null = null;
  const baseServiceFee = appointmentBaseFee(appt);
  let serviceFee = baseServiceFee;
  let discount = 0;

  if (vType === 'follow_up' && prevCompletedVisit) {
    parentVisitId = prevCompletedVisit.medical_record_id;
    if (prevCompletedVisit.appointment_date && appt.appointment_date) {
      const prevD = new Date(prevCompletedVisit.appointment_date).getTime();
      const currD = new Date(appt.appointment_date).getTime();
      const diffDays = Math.floor((currD - prevD) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 14) {
        serviceFee = baseServiceFee / 2;
        discount = baseServiceFee - serviceFee;
      }
    }
  }

  // Hồ sơ, giường, kho thuốc, trạng thái và hóa đơn cùng thành công hoặc cùng rollback.
  try {
  db.transaction(() => {
  // 1. Save or update medical record
  let medRecord = db.prepare('SELECT id FROM medical_records WHERE appointment_id = ?').get(appt.id) as any;
  let recordId;
  if (medRecord) {
    db.prepare(`
      UPDATE medical_records 
      SET anamnesis = ?, vital_signs = ?, clinical_diagnosis = ?, icd10_code = ?, doctor_notes = ?, re_examination_date = ?,
          visit_type = ?, treatment_type = ?, inpatient_room = ?, inpatient_bed = ?, admission_date = ?, discharge_date = ?,
          parent_visit_id = COALESCE(?, parent_visit_id)
      WHERE id = ?
    `).run(anamnesis, vitalsJson, clinical_diagnosis, icd10_code || null, doctor_notes || null, re_examination_date || null,
           vType, tType, inRoom, inBed, admDate, disDate, parentVisitId, medRecord.id);
    recordId = medRecord.id;
  } else {
    const rRes = db.prepare(`
      INSERT INTO medical_records (appointment_id, patient_id, doctor_id, parent_visit_id, anamnesis, vital_signs, clinical_diagnosis, icd10_code, doctor_notes, re_examination_date, visit_type, treatment_type, inpatient_room, inpatient_bed, admission_date, discharge_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appt.id, appt.patient_id, appt.doctor_id, parentVisitId, anamnesis, vitalsJson, clinical_diagnosis, icd10_code || null, doctor_notes || null, re_examination_date || null,
           vType, tType, inRoom, inBed, admDate, disDate);
    recordId = rRes.lastInsertRowid;
  }

  // Auto-assign bed if inpatient (Pha 4)
  if (tType === 'inpatient' && inRoom && inBed) {
    try {
      const targetBed = db.prepare(`
        SELECT b.id, b.room_id 
        FROM beds b
        JOIN rooms r ON b.room_id = r.id
        WHERE (? LIKE '%' || r.room_number || '%' OR r.room_name LIKE '%' || ? || '%')
          AND (? LIKE '%' || b.bed_number || '%' OR b.bed_number LIKE '%' || ? || '%')
      `).get(inRoom, inRoom, inBed, inBed) as any;

      if (targetBed) {
        db.prepare(`
          UPDATE beds 
          SET status = 'occupied',
              current_patient_id = ?,
              current_medical_record_id = ?,
              current_doctor_id = ?,
              admission_date = COALESCE(?, datetime('now')),
              notes = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(appt.patient_id, recordId, appt.doctor_id, admDate, clinical_diagnosis || 'Điều trị nội trú', targetBed.id);

        db.prepare('UPDATE medical_records SET bed_id = ? WHERE id = ?').run(targetBed.id, recordId);
      }
    } catch (e) {}
  }

  // 2. Save prescriptions and items (transaction: hoàn kho đơn cũ -> ghi đơn mới -> trừ kho)
  const { prescription_notes } = req.body;

  let totalMedFee = 0;
  if (rxItems.length > 0) {
    totalMedFee = rxItems.reduce((sum, it) => sum + it.q * it.p, 0);

    const savePrescription = db.transaction(() => {
      let pres = db.prepare('SELECT id FROM prescriptions WHERE medical_record_id = ?').get(recordId) as any;
      let presId;
      if (pres) {
        const oldRows = db.prepare('SELECT medicine_id, quantity FROM prescription_items WHERE prescription_id = ?').all(pres.id) as any[];
        for (const o of oldRows) {
          if (o.medicine_id) db.prepare('UPDATE medicines SET stock_quantity = stock_quantity + ? WHERE id = ?').run(o.quantity, o.medicine_id);
        }
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
      for (const it of rxItems) {
        insertItem.run(
          presId, it.mId, it.name, it.dosage, it.unit, it.q,
          it.morning, it.noon, it.afternoon, it.night,
          it.instructions, it.p, it.q * it.p
        );
        if (it.mId) {
          db.prepare('UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE id = ?').run(it.q, it.mId);
        }
      }
    });
    savePrescription();
  }

  // 3. Mark appointment and queue as completed
  db.prepare(`UPDATE appointments SET status = 'completed' WHERE id = ?`).run(appt.id);
  db.prepare(`UPDATE examination_queues SET status = 'completed', finish_time = datetime('now') WHERE appointment_id = ?`).run(appt.id);

  // 4. Create or update payment invoice (strictly backend-calculated)
  let invoice = db.prepare('SELECT id FROM payments WHERE appointment_id = ?').get(appt.id) as any;
  const totalAmount = baseServiceFee + totalMedFee;
  const finalAmount = serviceFee + totalMedFee;

  if (!invoice) {
    const invCode = 'HD' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(Math.floor(1000 + Math.random() * 9000));
    db.prepare(`
      INSERT INTO payments (appointment_id, invoice_code, service_fee, medicine_fee, total_amount, discount, final_amount, payment_method, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'unpaid')
    `).run(appt.id, invCode, serviceFee, totalMedFee, totalAmount, discount, finalAmount);
  } else {
    db.prepare(`
      UPDATE payments 
      SET service_fee = ?, medicine_fee = ?, total_amount = ?, discount = ?, final_amount = ?
      WHERE id = ?
    `).run(serviceFee, totalMedFee, totalAmount, discount, finalAmount, invoice.id);
  }
  })();
  } catch (error) {
    console.error('Failed to save examination:', error);
    req.flash('error', 'Không thể lưu ca khám. Dữ liệu chưa được thay đổi.');
    return redirectBack(req, res, `/doctor/examine/${appt.id}`);
  }

  logActivity(req.session.user.id, 'COMPLETE_EXAM', 'Appointment', appt.id, 'Bác sĩ hoàn thành khám và kê đơn', req);
  req.flash('success', 'Đã hoàn tất quá trình khám bệnh và lưu hồ sơ y tế!');
  res.redirect('/doctor/queue');
});

app.get('/doctor/schedule', requireRole('doctor'), (req, res) => {
  const doctor = getOrCreateDoctorProfile(req.session.user.id);
  const schedules = db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week ASC').all(doctor.id);
  const leaves = db.prepare('SELECT * FROM doctor_leaves WHERE doctor_id = ? ORDER BY start_date DESC').all(doctor.id);

  renderWithLayout(res, 'doctor/schedule', { pageTitle: 'Ca trực & Nghỉ phép - Bác sĩ', schedules, leaves }, 'layouts/doctor');
});

app.post('/doctor/leave/request', requireRole('doctor'), (req, res) => {
  const doctor = getOrCreateDoctorProfile(req.session.user.id);
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
  const today = businessNow().date;
  const totalToday = db.prepare(`SELECT count(*) as c FROM appointments WHERE appointment_date = ?`).get(today).c;
  const checkedInCount = db.prepare(`SELECT count(*) as c FROM appointments WHERE appointment_date = ? AND status IN ('checked_in', 'in_consultation')`).get(today).c;
  const completedCount = db.prepare(`SELECT count(*) as c FROM appointments WHERE appointment_date = ? AND status = 'completed'`).get(today).c;
  const todayRevenue = db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND date(paid_at, '+7 hours') = ?`).get(today).s;

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
  const searchDate = date || businessNow().date;

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
  const changed = db.prepare(`UPDATE appointments SET status = 'confirmed' WHERE id = ? AND status = 'pending'`).run(req.params.id);
  req.flash(changed.changes ? 'success' : 'error', changed.changes ? 'Đã xác nhận cuộc hẹn.' : 'Lịch hẹn không còn ở trạng thái chờ xác nhận.');
  redirectBack(req, res);
});

app.post('/receptionist/checkin/:id', requireRole('receptionist', 'admin'), (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, d.room_number 
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ?
  `).get(req.params.id) as any;

  if (appt) {
    if (appt.status !== 'confirmed') {
      req.flash('error', 'Chỉ có thể check-in lịch đã xác nhận và chưa tiếp đón.');
      return redirectBack(req, res);
    }
    try {
    const { queueNum, priorityLevel } = db.transaction(() => {
    const priorityLevel = req.body.priority_level || appt.priority_level || (appt.source === 'online' ? 'online' : 'walkin');
    if (!['emergency', 'priority', 'online', 'walkin'].includes(priorityLevel)) throw new Error('Mức ưu tiên không hợp lệ.');
    let priorityOrder = 3;
    let pPrefix = (appt.room_number || 'P101').replace('P.', 'P');
    if (priorityLevel === 'emergency') {
      priorityOrder = 1;
      pPrefix = 'CC';

      // Emergency Bumping: Tìm ca đang chờ (status = 'waiting') ở phòng này có priority_order >= 3
      const waitingCandidate = db.prepare(`
        SELECT eq.id as queue_id, eq.appointment_id, a.start_time, a.patient_id, p.user_id as patient_user_id
        FROM examination_queues eq
        JOIN appointments a ON eq.appointment_id = a.id
        JOIN patients p ON a.patient_id = p.id
        WHERE eq.room = ? AND eq.status = 'waiting' AND eq.priority_order >= 3
        ORDER BY eq.priority_order ASC, eq.id ASC
        LIMIT 1
      `).get(appt.room_number) as any;

      if (waitingCandidate) {
        db.prepare(`
          UPDATE examination_queues 
          SET priority_order = 2, is_bumped = 1, bumped_reason = 'Nhường lượt cho ca cấp cứu khẩn cấp'
          WHERE id = ?
        `).run(waitingCandidate.queue_id);

        db.prepare(`
          UPDATE appointments 
          SET is_bumped = 1, bumped_from_slot = start_time
          WHERE id = ?
        `).run(waitingCandidate.appointment_id);

        if (waitingCandidate.patient_user_id) {
          db.prepare(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (?, 'Lịch khám điều chỉnh do ca cấp cứu', ?, 'appointment', ?)
          `).run(
            waitingCandidate.patient_user_id,
            `Lịch khám của bạn tại ${appt.room_number} tạm thời được lùi lại khoảng 30 phút do phòng khám tiếp nhận ca cấp cứu khẩn cấp. Bạn sẽ được ưu tiên khám ngay sau ca cấp cứu. Xin chân thành cảm ơn sự cảm thông của quý khách!`,
            `/appointments`
          );
        }
      }
    } else if (priorityLevel === 'priority') {
      priorityOrder = 2;
      pPrefix = 'UT';
    } else if (priorityLevel === 'online') {
      priorityOrder = 3;
    } else {
      priorityOrder = 4;
    }

    const { date: queueDate, number: queueNum } = nextQueueNumber(appt.room_number, pPrefix);

    const changed = db.prepare(`UPDATE appointments SET status = 'checked_in', priority_level = ? WHERE id = ? AND status = 'confirmed'`).run(priorityLevel, appt.id);
    if (!changed.changes) throw new Error('Lịch hẹn đã được tiếp đón.');
    db.prepare(`
      INSERT INTO examination_queues (appointment_id, queue_number, queue_date, room, status, priority_level, priority_order, checkin_time)
      VALUES (?, ?, ?, ?, 'waiting', ?, ?, datetime('now'))
    `).run(appt.id, queueNum, queueDate, appt.room_number, priorityLevel, priorityOrder);
    return { queueNum, priorityLevel };
    })();
    logActivity(req.session.user.id, 'CHECKIN_PATIENT', 'Appointment', appt.id, `Cấp số thứ tự ${queueNum} (${priorityLevel})`, req);
    req.flash('success', `Đã tiếp đón bệnh nhân và cấp số thứ tự: ${queueNum}`);
    } catch (error) {
      req.flash('error', error instanceof Error ? error.message : 'Không thể tiếp đón lịch hẹn.');
      return res.redirect(409, '/receptionist/appointments');
    }
  }
  redirectBack(req, res);
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

  const today = businessNow().date;
  const queueItems = db.prepare(`
    SELECT eq.*, u.name as patient_name, a.priority_reason
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.appointment_date = ?
    ORDER BY 
      CASE WHEN eq.status = 'calling' THEN 0 WHEN eq.status = 'in_room' THEN 1 WHEN eq.status = 'waiting' THEN 2 ELSE 3 END,
      eq.priority_order ASC,
      eq.id ASC
  `).all(today);

  const maskedItems = (queueItems as any[]).map(i => ({ ...i, patient_name: helpers.maskName(i.patient_name) }));
  res.render('receptionist/live_board', { doctors, queueItems: maskedItems });
});

app.get('/api/queue/live', (req, res) => {
  const today = businessNow().date;
  const queueItems = db.prepare(`
    SELECT eq.*, u.name as patient_name, a.priority_reason
    FROM examination_queues eq
    JOIN appointments a ON eq.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.appointment_date = ?
    ORDER BY 
      CASE WHEN eq.status = 'calling' THEN 0 WHEN eq.status = 'in_room' THEN 1 WHEN eq.status = 'waiting' THEN 2 ELSE 3 END,
      eq.priority_order ASC,
      eq.id ASC
  `).all(today);
  const maskedItems = (queueItems as any[]).map(i => ({ ...i, patient_name: helpers.maskName(i.patient_name) }));
  res.json({ success: true, items: maskedItems });
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
  const { patient_name, patient_phone, patient_email, specialty_id, doctor_id, appointment_date, start_time, symptoms, auto_checkin, priority_level, priority_reason } = req.body;

  const name = typeof patient_name === 'string' ? patient_name.trim() : '';
  const phone = typeof patient_phone === 'string' ? patient_phone.trim() : '';
  const suppliedEmail = typeof patient_email === 'string' ? patient_email.trim().toLowerCase() : '';
  if (!name || name.length > 120 || !/^(?:0|\+84)[35789]\d{8}$/.test(phone) ||
      suppliedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail)) {
    req.flash('error', 'Vui lòng nhập họ tên, số điện thoại Việt Nam và email hợp lệ.');
    return redirectBack(req, res);
  }
  let booking: any;
  try {
    booking = validateBooking(db, {
      doctorId: doctor_id, specialtyId: specialty_id,
      date: appointment_date, startTime: start_time
    });
  } catch (err: any) {
    req.flash('error', err instanceof BookingRuleError ? err.message : 'Thông tin đặt lịch không hợp lệ.');
    return redirectBack(req, res);
  }
  const email = suppliedEmail || `walkin.${crypto.randomBytes(12).toString('hex')}@medibook.local`;
  let user = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
  let pat = user ? db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id) as any : null;

  const pLevel = priority_level || 'walkin';
  let pOrder = 4;
  let pPrefix = '';
  let pReason = priority_reason || '';

  if (pLevel === 'emergency') {
    pOrder = 1;
    pPrefix = 'CC';
    if (!pReason) pReason = 'Cấp cứu / Khẩn cấp';
  } else if (pLevel === 'priority') {
    pOrder = 2;
    pPrefix = 'UT';
    if (!pReason) pReason = 'Đối tượng ưu tiên (Người già / Trẻ em / Thai phụ)';
  } else if (pLevel === 'online') {
    pOrder = 3;
    if (!pReason) pReason = 'Đặt lịch trực tuyến';
  } else {
    pOrder = 4;
    if (!pReason) pReason = 'Khám vãng lai tại quầy';
  }

  const codeDate = booking.date.replace(/-/g, '').slice(2);
  const bookingCode = `MB${codeDate}-${crypto.randomBytes(6).toString('hex')}`;

  let queueNum: string | null = null;

  try {
    const receptionistBookTx = db.transaction(() => {
      booking = validateBooking(db, {
        doctorId: doctor_id, specialtyId: specialty_id,
        date: appointment_date, startTime: start_time
      });
      if (!user) {
        const hash = bcrypt.hashSync(crypto.randomBytes(18).toString('base64url'), 10);
        const userId = db.prepare(`
          INSERT INTO users (role, name, email, password_hash, phone, status)
          VALUES ('patient', ?, ?, ?, ?, 'active')
        `).run(name, email, hash, phone).lastInsertRowid;
        user = { id: userId };
        db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'patient')").run(userId);
      }
      if (!pat) {
        pat = { id: db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(user.id).lastInsertRowid };
      }

      const aRes = db.prepare(`
        INSERT INTO appointments (booking_code, patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, status, symptoms, source, priority_level, priority_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'walkin', ?, ?)
      `).run(bookingCode, pat.id, booking.doctorId, booking.specialtyId, booking.date, booking.startTime, booking.endTime, symptoms || 'Đăng ký tại quầy', pLevel, pReason);
      const apptId = aRes.lastInsertRowid;

      if (auto_checkin) {
        const doctor = db.prepare('SELECT room_number FROM doctors WHERE id = ?').get(doctor_id) as any;
        const roomPrefix = (doctor.room_number || 'P101').replace('P.', 'P');
        const finalPrefix = pPrefix ? pPrefix : roomPrefix;
        const { date: queueDate, number: generatedQueueNum } = nextQueueNumber(doctor.room_number, finalPrefix);

        db.prepare(`UPDATE appointments SET status = 'checked_in' WHERE id = ?`).run(apptId);
        db.prepare(`
          INSERT INTO examination_queues (appointment_id, queue_number, queue_date, room, status, priority_level, priority_order, checkin_time)
          VALUES (?, ?, ?, ?, 'waiting', ?, ?, datetime('now'))
        `).run(apptId, generatedQueueNum, queueDate, doctor.room_number, pLevel, pOrder);

        if (pLevel === 'emergency') {
          const waitingCandidate = db.prepare(`
            SELECT eq.id as queue_id, eq.appointment_id, a.start_time, a.patient_id, p.user_id as patient_user_id
            FROM examination_queues eq
            JOIN appointments a ON eq.appointment_id = a.id
            JOIN patients p ON a.patient_id = p.id
            WHERE eq.room = ? AND eq.status = 'waiting' AND eq.priority_order >= 3
            ORDER BY eq.priority_order ASC, eq.id ASC
            LIMIT 1
          `).get(doctor.room_number) as any;

          if (waitingCandidate) {
            db.prepare(`
              UPDATE examination_queues 
              SET priority_order = 2, is_bumped = 1, bumped_reason = 'Nhường lượt cho ca cấp cứu khẩn cấp'
              WHERE id = ?
            `).run(waitingCandidate.queue_id);

            db.prepare(`
              UPDATE appointments 
              SET is_bumped = 1, bumped_from_slot = start_time
              WHERE id = ?
            `).run(waitingCandidate.appointment_id);

            if (waitingCandidate.patient_user_id) {
              db.prepare(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES (?, 'Lịch khám điều chỉnh do ca cấp cứu', ?, 'appointment', ?)
              `).run(
                waitingCandidate.patient_user_id,
                `Lịch khám của bạn tại ${doctor.room_number} tạm thời được lùi lại khoảng 30 phút do phòng khám tiếp nhận ca cấp cứu khẩn cấp. Bạn sẽ được ưu tiên khám ngay sau ca cấp cứu. Xin chân thành cảm ơn sự cảm thông của quý khách!`,
                `/appointments`
              );
            }
          }
        }

        queueNum = generatedQueueNum;
      }

      return apptId;
    });

    receptionistBookTx();
  } catch (err: any) {
    if (err instanceof BookingRuleError) {
      req.flash('error', err.message);
      return redirectBack(req, res);
    }
    if (err.code === 'SQLITE_CONSTRAINT' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
      req.flash('error', 'Khung giờ này của bác sĩ đã có cuộc hẹn khác trùng. Vui lòng chọn khung giờ khác.');
      return redirectBack(req, res);
    }
    console.error('Receptionist booking transaction error:', err);
    req.flash('error', 'Không thể hoàn tất đăng ký khám tại quầy. Vui lòng thử lại.');
    return redirectBack(req, res);
  }

  if (auto_checkin && queueNum) {
    req.flash('success', `Đã tạo lịch khám trực tiếp và cấp số thứ tự: ${queueNum}`);
  } else {
    req.flash('success', `Đã tạo lịch khám thành công với mã: ${bookingCode}`);
  }

  res.redirect('/receptionist/checkin');
});

app.get('/receptionist/payments', requireRole('receptionist', 'admin'), (req, res) => {
  const { keyword, status } = req.query;
  const stats = {
    today_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND date(paid_at, '+7 hours') = ?`).get(businessNow().date).s,
    month_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND strftime('%Y-%m', paid_at, '+7 hours') = ?`).get(businessNow().date.slice(0, 7)).s
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
  if (!['cash', 'bank_transfer'].includes(method)) {
    return res.status(400).render('errors/error', { message: 'Phương thức thanh toán không hợp lệ.' });
  }
  const payment = db.prepare(`
    SELECT p.payment_status, a.status AS appointment_status
    FROM payments p JOIN appointments a ON a.id = p.appointment_id WHERE p.id = ?
  `).get(req.params.id) as any;
  if (!payment) return res.status(404).render('errors/error', { message: 'Hóa đơn không tồn tại.' });
  if (payment.appointment_status !== 'completed' || !['unpaid', 'pending'].includes(payment.payment_status)) {
    return res.status(409).render('errors/error', { message: 'Hóa đơn chưa thể thu hoặc đã thanh toán.' });
  }
  const changed = db.prepare(`
    UPDATE payments 
    SET payment_status = 'paid', payment_method = ?, paid_at = datetime('now'), cashier_user_id = ?
    WHERE id = ? AND payment_status IN ('unpaid', 'pending')
  `).run(method, req.session.user.id, req.params.id);
  if (!changed.changes) return res.status(409).render('errors/error', { message: 'Hóa đơn đã được xử lý.' });

  logActivity(req.session.user.id, 'PAY_INVOICE', 'Payment', Number(req.params.id), `Thu tiền bằng ${method}`, req);
  req.flash('success', 'Đã ghi nhận thanh toán viện phí.');
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
           s.name as specialty_name, mr.clinical_diagnosis, mr.id as medical_record_id,
           mr.visit_type, mr.treatment_type, mr.inpatient_room, mr.inpatient_bed
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
// 6.5. BEDS MANAGEMENT & MATRIX (Pha 4)
// ==========================================
app.get('/receptionist/beds', requireRole('receptionist', 'admin'), (req, res) => {
  const { status, room_id } = req.query;

  // Calculate statistics across all beds
  const totalBeds = (db.prepare('SELECT count(*) as c FROM beds').get() as any).c;
  const availableCount = (db.prepare(`SELECT count(*) as c FROM beds WHERE status = 'available'`).get() as any).c;
  const occupiedCount = (db.prepare(`SELECT count(*) as c FROM beds WHERE status = 'occupied'`).get() as any).c;
  const cleaningCount = (db.prepare(`SELECT count(*) as c FROM beds WHERE status = 'cleaning'`).get() as any).c;
  const maintenanceCount = (db.prepare(`SELECT count(*) as c FROM beds WHERE status = 'maintenance'`).get() as any).c;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedCount / totalBeds) * 100) : 0;

  // Query all rooms
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY room_number ASC').all() as any[];

  // Query beds with joined details
  let bedsQuery = `
    SELECT b.*, r.room_number, r.room_name, r.department_name, r.room_type,
           u.name as patient_name, u.phone as patient_phone, pt.gender as patient_gender, pt.dob as patient_dob,
           ud.name as doctor_name, d.title as doctor_title,
           mr.clinical_diagnosis, mr.admission_date as mr_admission_date
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    LEFT JOIN patients pt ON b.current_patient_id = pt.id
    LEFT JOIN users u ON pt.user_id = u.id
    LEFT JOIN doctors d ON b.current_doctor_id = d.id
    LEFT JOIN users ud ON d.user_id = ud.id
    LEFT JOIN medical_records mr ON b.current_medical_record_id = mr.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && ['available', 'occupied', 'cleaning', 'maintenance'].includes(String(status))) {
    bedsQuery += ' AND b.status = ?';
    params.push(status);
  }
  if (room_id && room_id !== 'all') {
    bedsQuery += ' AND b.room_id = ?';
    params.push(room_id);
  }

  bedsQuery += ' ORDER BY r.room_number ASC, b.bed_number ASC';
  const beds = db.prepare(bedsQuery).all(...params) as any[];

  // Group beds by room
  const roomsWithBeds = rooms
    .filter(r => !room_id || room_id === 'all' || r.id === Number(room_id))
    .map(room => {
      const roomBeds = beds.filter(b => b.room_id === room.id);
      const roomOccupied = roomBeds.filter(b => b.status === 'occupied').length;
      return {
        ...room,
        beds: roomBeds,
        occupied_beds: roomOccupied
      };
    });

  renderWithLayout(res, 'receptionist/beds', {
    pageTitle: 'Sơ đồ giường bệnh nội trú',
    totalBeds,
    availableCount,
    occupiedCount,
    cleaningCount,
    maintenanceCount,
    occupancyRate,
    rooms,
    roomsWithBeds,
    selectedStatus: status || 'all',
    selectedRoomId: room_id || 'all'
  }, 'layouts/receptionist');
});

app.post('/receptionist/beds/:id/status', requireRole('receptionist', 'admin'), (req, res) => {
  const { new_status, notes } = req.body;
  const bedId = req.params.id;

  const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance'];
  if (!validStatuses.includes(new_status)) {
    req.flash('error', 'Trạng thái giường không hợp lệ.');
    return res.redirect('/receptionist/beds');
  }

  const currentBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId) as any;
  if (!currentBed) {
    req.flash('error', 'Giường bệnh không tồn tại.');
    return res.redirect('/receptionist/beds');
  }

  if (new_status === 'cleaning' || new_status === 'available' || new_status === 'maintenance') {
    if (currentBed.status === 'occupied') {
      db.prepare(`
        UPDATE beds 
        SET status = ?, notes = ?, current_patient_id = NULL, current_medical_record_id = NULL, current_doctor_id = NULL, admission_date = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(new_status, notes || (new_status === 'cleaning' ? 'Bệnh nhân đã xuất viện. Đang khử trùng dọn dẹp' : null), bedId);
    } else {
      db.prepare(`
        UPDATE beds 
        SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now')
        WHERE id = ?
      `).run(new_status, notes || null, bedId);
    }
  } else if (new_status === 'occupied') {
    db.prepare(`
      UPDATE beds 
      SET status = 'occupied', notes = COALESCE(?, notes), updated_at = datetime('now')
      WHERE id = ?
    `).run(notes || null, bedId);
  }

  logActivity(req.session.user.id, 'UPDATE_BED_STATUS', 'Bed', Number(bedId), `Chuyển trạng thái giường #${bedId} sang: ${new_status}`, req);
  req.flash('success', `Đã cập nhật trạng thái giường thành công sang: ${new_status === 'available' ? 'Giường trống' : new_status === 'occupied' ? 'Đang có bệnh nhân' : new_status === 'cleaning' ? 'Đang dọn vệ sinh' : 'Bảo trì / Sửa chữa'}.`);
  res.redirect('/receptionist/beds');
});

app.post('/receptionist/beds/:id/discharge', requireRole('receptionist', 'admin'), (req, res) => {
  const bedId = req.params.id;
  const currentBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId) as any;
  if (!currentBed) {
    req.flash('error', 'Giường bệnh không tồn tại.');
    return res.redirect('/receptionist/beds');
  }

  db.prepare(`
    UPDATE beds 
    SET status = 'cleaning', notes = 'Bệnh nhân đã xuất viện. Đang dọn vệ sinh & khử trùng', current_patient_id = NULL, current_medical_record_id = NULL, current_doctor_id = NULL, admission_date = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(bedId);

  logActivity(req.session.user.id, 'DISCHARGE_BED', 'Bed', Number(bedId), `Làm thủ tục xuất viện cho giường #${bedId}, chuyển sang vệ sinh`, req);
  req.flash('success', 'Bệnh nhân đã xuất viện thành công! Giường chuyển sang trạng thái: Đang dọn vệ sinh.');
  res.redirect('/receptionist/beds');
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
const allowedAccountRoles = new Set(['admin', 'doctor', 'receptionist', 'patient']);
function accountForm(body: any): { name: string; email: string; phone: string; status: string; roles: string[] } | null {
  const rawRoles = body['roles[]'] || body.roles || body.role;
  if (!rawRoles) return null;
  const roles = [...new Set(Array.isArray(rawRoles) ? rawRoles : [rawRoles])];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const status = body.status || 'active';
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (phone && !/^(?:0|\+84)[35789]\d{8}$/.test(phone)) ||
      !['active', 'inactive'].includes(status) || !roles.length ||
      roles.some(role => typeof role !== 'string' || !allowedAccountRoles.has(role))) return null;
  return { name, email, phone, status, roles };
}

function syncAccountRoles(userId: number | bigint, roles: string[]): void {
  db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
  const insertRole = db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)');
  for (const role of roles) {
    insertRole.run(userId, role);
    if (role === 'doctor') {
      db.prepare("INSERT OR IGNORE INTO doctors (user_id, consultation_fee, rating, room_number) VALUES (?, 0, 0, '')").run(userId);
    } else if (role === 'patient') {
      db.prepare('INSERT OR IGNORE INTO patients (user_id) VALUES (?)').run(userId);
    } else if (role === 'receptionist') {
      db.prepare('INSERT OR IGNORE INTO receptionists (user_id, staff_code) VALUES (?, ?)').run(userId, `LT-${userId}`);
    }
  }
}

app.get('/admin/users', requireRole('admin'), (req, res) => {
  const { keyword, role } = req.query;
  let query = `
    SELECT u.*, d.title as doctor_title, d.room_number, r.staff_code, p.gender,
           GROUP_CONCAT(ur.role, ', ') as all_roles
    FROM users u
    LEFT JOIN doctors d ON u.id = d.user_id
    LEFT JOIN receptionists r ON u.id = r.user_id
    LEFT JOIN patients p ON u.id = p.user_id
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE 1=1
  `;
  const params = [];
  if (keyword) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    query += ` AND u.id IN (SELECT user_id FROM user_roles WHERE role = ?)`;
    params.push(role);
  }
  query += ` GROUP BY u.id ORDER BY u.id DESC`;

  const users = db.prepare(query).all(...params);
  renderWithLayout(res, 'admin/users/index', { pageTitle: 'Quản lý tài khoản - Admin', users, keyword, role }, 'layouts/admin');
});

app.get('/admin/users/create', requireRole('admin'), (req, res) => {
  renderWithLayout(res, 'admin/users/form', { pageTitle: 'Thêm tài khoản mới - Admin', user: null, userRoles: ['patient'] }, 'layouts/admin');
});

app.post('/admin/users/store', requireRole('admin'), (req, res) => {
  const account = accountForm(req.body);
  if (!account) {
    req.flash('error', 'Thông tin tài khoản hoặc vai trò không hợp lệ.');
    return res.redirect('/admin/users/create');
  }
  let adminPassword = typeof req.body.password === 'string' ? req.body.password.trim() : '';
  let generatedPassword: string | null = null;
  if (adminPassword) {
    const adminPwErr = passwordError(adminPassword);
    if (adminPwErr) {
      req.flash('error', adminPwErr);
      return res.redirect('/admin/users/create');
    }
  } else {
    generatedPassword = crypto.randomBytes(9).toString('base64url');
    adminPassword = generatedPassword;
  }
  const hash = bcrypt.hashSync(adminPassword, 10);
  let userId: number | bigint;
  try {
    userId = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO users (role, name, email, password_hash, phone, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(account.roles[0], account.name, account.email, hash, account.phone, account.status);
      syncAccountRoles(result.lastInsertRowid, account.roles);
      return result.lastInsertRowid;
    })();
  } catch (error) {
    req.flash('error', 'Không thể tạo tài khoản. Email có thể đã được sử dụng.');
    return res.redirect('/admin/users/create');
  }

  logActivity(req.session.user.id, 'CREATE_USER', 'User', userId, `Tạo người dùng roles [${account.roles.join(', ')}]: ${account.email}`, req);
  req.flash('success', generatedPassword ? `Đã tạo tài khoản thành công! Mật khẩu tạm thời (chỉ hiển thị một lần): ${generatedPassword}` : 'Đã tạo tài khoản thành công!');
  res.redirect('/admin/users');
});

app.get('/admin/users/edit/:id', requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).render('errors/error', { message: 'Tài khoản không tồn tại' });

  const userRolesRows = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').all(user.id);
  const userRoles = userRolesRows.map(r => r.role);

  renderWithLayout(res, 'admin/users/form', { pageTitle: `Sửa tài khoản: ${user.name}`, user, userRoles }, 'layouts/admin');
});

app.post('/admin/users/update/:id', requireRole('admin'), (req, res) => {
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id) as any;
  if (!existingUser) return res.status(404).render('errors/error', { message: 'Tài khoản không tồn tại.' });
  const account = accountForm(req.body);
  if (!account) {
    req.flash('error', 'Thông tin tài khoản hoặc vai trò không hợp lệ.');
    return res.redirect('/admin/users/edit/' + req.params.id);
  }
  const password = req.body.password;
  if (password && (typeof password !== 'string' || passwordError(password.trim()))) {
    req.flash('error', passwordError(password) || 'Mật khẩu không hợp lệ.');
    return res.redirect('/admin/users/edit/' + req.params.id);
  }
  const wasAdmin = !!db.prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'").get(req.params.id);
  const activeAdmins = (db.prepare(`
    SELECT count(*) AS n FROM user_roles ur JOIN users u ON u.id = ur.user_id
    WHERE ur.role = 'admin' AND u.status = 'active'
  `).get() as any).n;
  if (wasAdmin && activeAdmins <= 1 && (account.status !== 'active' || !account.roles.includes('admin'))) {
    req.flash('error', 'Hệ thống phải giữ ít nhất một quản trị viên đang hoạt động.');
    return res.redirect('/admin/users/edit/' + req.params.id);
  }

  try {
    db.transaction(() => {
      if (password && password.trim()) {
        db.prepare(`UPDATE users SET name = ?, email = ?, phone = ?, role = ?, status = ?, password_hash = ? WHERE id = ?`)
          .run(account.name, account.email, account.phone, account.roles[0], account.status, bcrypt.hashSync(password.trim(), 10), req.params.id);
      } else {
        db.prepare(`UPDATE users SET name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?`)
          .run(account.name, account.email, account.phone, account.roles[0], account.status, req.params.id);
      }
      syncAccountRoles(existingUser.id, account.roles);
    })();
  } catch (error) {
    req.flash('error', 'Không thể cập nhật tài khoản. Email có thể đã được sử dụng.');
    return res.redirect('/admin/users/edit/' + req.params.id);
  }

  logActivity(req.session.user.id, 'UPDATE_USER', 'User', existingUser.id, `Vai trò: ${account.roles.join(', ')}, trạng thái: ${account.status}`, req);
  req.flash('success', 'Cập nhật tài khoản và phân quyền vai trò thành công!');
  res.redirect('/admin/users');
});

app.post('/admin/users/toggle/:id', requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT id, status FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) return res.status(404).render('errors/error', { message: 'Tài khoản không tồn tại.' });
  const adminRole = !!db.prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'").get(user.id);
  if (adminRole && user.status === 'active') {
    const activeAdmins = (db.prepare(`
      SELECT count(*) AS n FROM user_roles ur JOIN users u ON u.id = ur.user_id
      WHERE ur.role = 'admin' AND u.status = 'active'
    `).get() as any).n;
    if (activeAdmins <= 1) {
      req.flash('error', 'Không thể khóa quản trị viên đang hoạt động cuối cùng.');
      return res.redirect('/admin/users');
    }
  }
  const nextStatus = user.status === 'active' ? 'inactive' : 'active';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(nextStatus, req.params.id);
  logActivity(req.session.user.id, 'TOGGLE_USER', 'User', user.id, `Trạng thái: ${nextStatus}`, req);
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
  if (!doctor) return res.status(404).render('errors/error', { message: 'Bác sĩ không tồn tại.' });

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
  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(req.params.id);
  if (!doctor) return res.status(404).render('errors/error', { message: 'Bác sĩ không tồn tại.' });
  const years = Number(experience_years);
  const fee = Number(consultation_fee);
  const ids = [...new Set((Array.isArray(specialty_ids) ? specialty_ids : specialty_ids ? [specialty_ids] : []).map(String))];
  const validIds = ids.length === 0 || (ids.every(id => /^\d+$/.test(id)) &&
    (db.prepare(`SELECT count(*) AS n FROM specialties WHERE status = 'active' AND id IN (${ids.map(() => '?').join(',')})`).get(...ids) as any).n === ids.length);
  if (typeof title !== 'string' || !title.trim() || typeof room_number !== 'string' || !room_number.trim() ||
      !Number.isInteger(years) || years < 0 || !Number.isFinite(fee) || fee < 0 ||
      typeof bio !== 'string' || !validIds) {
    req.flash('error', 'Thông tin bác sĩ hoặc chuyên khoa không hợp lệ.');
    return res.redirect(`/admin/doctors/edit/${req.params.id}`);
  }
  db.transaction(() => {
    db.prepare(`UPDATE doctors SET title = ?, room_number = ?, experience_years = ?, consultation_fee = ?, bio = ? WHERE id = ?`)
      .run(title.trim(), room_number.trim(), years, fee, bio.trim(), req.params.id);
    db.prepare('DELETE FROM doctor_specialties WHERE doctor_id = ?').run(req.params.id);
    const insertDs = db.prepare('INSERT INTO doctor_specialties (doctor_id, specialty_id, is_primary) VALUES (?, ?, ?)');
    ids.forEach((id, index) => insertDs.run(req.params.id, id, index === 0 ? 1 : 0));
  })();

  req.flash('success', 'Đã lưu thiết lập bác sĩ thành công!');
  res.redirect('/admin/doctors');
});

// Specialty Management
function validSpecialtyInput(name: any, slug: any, description: any, status: any): boolean {
  return typeof name === 'string' && !!name.trim() && name.length <= 120 &&
    typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    typeof description === 'string' && description.length <= 5000 &&
    ['active', 'inactive'].includes(status);
}
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
  if (!validSpecialtyInput(name, slug, description, status)) {
    req.flash('error', 'Thông tin chuyên khoa không hợp lệ.');
    return res.redirect('/admin/specialties/create');
  }
  try {
    db.prepare(`INSERT INTO specialties (name, slug, description, status) VALUES (?, ?, ?, ?)`)
      .run(name.trim(), slug.trim(), description.trim(), status);
  } catch (error) {
    req.flash('error', 'Tên hoặc đường dẫn chuyên khoa đã tồn tại.');
    return res.redirect('/admin/specialties/create');
  }
  req.flash('success', 'Đã tạo chuyên khoa mới thành công!');
  res.redirect('/admin/specialties');
});

app.get('/admin/specialties/edit/:id', requireRole('admin'), (req, res) => {
  const specialty = db.prepare('SELECT * FROM specialties WHERE id = ?').get(req.params.id);
  if (!specialty) return res.status(404).render('errors/error', { message: 'Chuyên khoa không tồn tại.' });
  renderWithLayout(res, 'admin/specialties/form', { pageTitle: `Sửa chuyên khoa: ${specialty.name}`, specialty }, 'layouts/admin');
});

app.post('/admin/specialties/update/:id', requireRole('admin'), (req, res) => {
  const { name, slug, description, status } = req.body;
  if (!db.prepare('SELECT id FROM specialties WHERE id = ?').get(req.params.id))
    return res.status(404).render('errors/error', { message: 'Chuyên khoa không tồn tại.' });
  if (!validSpecialtyInput(name, slug, description, status)) {
    req.flash('error', 'Thông tin chuyên khoa không hợp lệ.');
    return res.redirect(`/admin/specialties/edit/${req.params.id}`);
  }
  try {
    db.prepare(`UPDATE specialties SET name = ?, slug = ?, description = ?, status = ? WHERE id = ?`)
      .run(name.trim(), slug.trim(), description.trim(), status, req.params.id);
  } catch (error) {
    req.flash('error', 'Tên hoặc đường dẫn chuyên khoa đã tồn tại.');
    return res.redirect(`/admin/specialties/edit/${req.params.id}`);
  }
  req.flash('success', 'Cập nhật chuyên khoa thành công!');
  res.redirect('/admin/specialties');
});

// Service Management
function serviceInput(body: any): { specialtyId: number; name: string; price: number; duration: number; description: string; status: string } | null {
  const specialtyId = Number(body.specialty_id);
  const price = Number(body.price);
  const duration = Number(body.duration_minutes);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!Number.isInteger(specialtyId) || specialtyId <= 0 || !db.prepare('SELECT 1 FROM specialties WHERE id = ?').get(specialtyId) ||
      !name || name.length > 160 || !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(duration) || duration <= 0 || duration > 1440 ||
      typeof body.description !== 'string' || body.description.length > 5000 ||
      !['active', 'inactive'].includes(body.status)) return null;
  return { specialtyId, name, price, duration, description: body.description.trim(), status: body.status };
}
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
  const input = serviceInput(req.body);
  if (!input) {
    req.flash('error', 'Thông tin dịch vụ không hợp lệ.');
    return res.redirect('/admin/services/create');
  }
  db.prepare(`
    INSERT INTO services (specialty_id, name, price, duration_minutes, description, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.specialtyId, input.name, input.price, input.duration, input.description, input.status);
  req.flash('success', 'Đã tạo dịch vụ mới thành công!');
  res.redirect('/admin/services');
});

app.get('/admin/services/edit/:id', requireRole('admin'), (req, res) => {
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!service) return res.status(404).render('errors/error', { message: 'Dịch vụ không tồn tại.' });
  const specialties = db.prepare(`SELECT * FROM specialties WHERE status = 'active'`).all();
  renderWithLayout(res, 'admin/services/form', { pageTitle: `Sửa dịch vụ: ${service.name}`, service, specialties }, 'layouts/admin');
});

app.post('/admin/services/update/:id', requireRole('admin'), (req, res) => {
  if (!db.prepare('SELECT id FROM services WHERE id = ?').get(req.params.id))
    return res.status(404).render('errors/error', { message: 'Dịch vụ không tồn tại.' });
  const input = serviceInput(req.body);
  if (!input) {
    req.flash('error', 'Thông tin dịch vụ không hợp lệ.');
    return res.redirect(`/admin/services/edit/${req.params.id}`);
  }
  db.prepare(`
    UPDATE services 
    SET specialty_id = ?, name = ?, price = ?, duration_minutes = ?, description = ?, status = ?
    WHERE id = ?
  `).run(input.specialtyId, input.name, input.price, input.duration, input.description, input.status, req.params.id);
  req.flash('success', 'Cập nhật dịch vụ thành công!');
  res.redirect('/admin/services');
});

// Medicine Management
function medicineInput(body: any): { code: string; name: string; category: string; unit: string; price: number; stock: number; usage: string; status: string } | null {
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  const price = Number(body.unit_price);
  const stock = Number(body.stock_quantity);
  if (!code || code.length > 60 || !name || name.length > 160 || !unit || unit.length > 40 ||
      !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(stock) || stock < 0 ||
      typeof body.category !== 'string' || body.category.length > 120 ||
      typeof body.usage_instruction !== 'string' || body.usage_instruction.length > 1000 ||
      !['active', 'inactive'].includes(body.status)) return null;
  return { code, name, category: body.category.trim(), unit, price, stock,
    usage: body.usage_instruction.trim(), status: body.status };
}
app.get('/admin/medicines', requireRole('admin'), (req, res) => {
  const medicines = db.prepare('SELECT * FROM medicines ORDER BY id ASC').all();
  renderWithLayout(res, 'admin/medicines/index', { pageTitle: 'Kho dược phẩm - Admin', medicines }, 'layouts/admin');
});

app.get('/admin/medicines/create', requireRole('admin'), (req, res) => {
  renderWithLayout(res, 'admin/medicines/form', { pageTitle: 'Thêm thuốc vào kho - Admin', medicine: null }, 'layouts/admin');
});

app.post('/admin/medicines/store', requireRole('admin'), (req, res) => {
  const input = medicineInput(req.body);
  if (!input) {
    req.flash('error', 'Thông tin thuốc hoặc tồn kho không hợp lệ.');
    return res.redirect('/admin/medicines/create');
  }
  try {
    db.prepare(`INSERT INTO medicines (code, name, category, unit, unit_price, stock_quantity, usage_instruction, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(input.code, input.name, input.category, input.unit, input.price, input.stock, input.usage, input.status);
  } catch (error) {
    req.flash('error', 'Mã thuốc đã tồn tại.');
    return res.redirect('/admin/medicines/create');
  }
  req.flash('success', 'Đã thêm thuốc vào kho thành công!');
  res.redirect('/admin/medicines');
});

app.get('/admin/medicines/edit/:id', requireRole('admin'), (req, res) => {
  const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!medicine) return res.status(404).render('errors/error', { message: 'Thuốc không tồn tại.' });
  renderWithLayout(res, 'admin/medicines/form', { pageTitle: `Sửa thông tin thuốc: ${medicine.name}`, medicine }, 'layouts/admin');
});

app.post('/admin/medicines/update/:id', requireRole('admin'), (req, res) => {
  if (!db.prepare('SELECT id FROM medicines WHERE id = ?').get(req.params.id))
    return res.status(404).render('errors/error', { message: 'Thuốc không tồn tại.' });
  const input = medicineInput(req.body);
  if (!input) {
    req.flash('error', 'Thông tin thuốc hoặc tồn kho không hợp lệ.');
    return res.redirect(`/admin/medicines/edit/${req.params.id}`);
  }
  try {
    db.prepare(`UPDATE medicines SET code = ?, name = ?, category = ?, unit = ?, unit_price = ?, stock_quantity = ?, usage_instruction = ?, status = ? WHERE id = ?`)
      .run(input.code, input.name, input.category, input.unit, input.price, input.stock, input.usage, input.status, req.params.id);
  } catch (error) {
    req.flash('error', 'Mã thuốc đã tồn tại.');
    return res.redirect(`/admin/medicines/edit/${req.params.id}`);
  }
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
  const doctorId = Number(doctor_id);
  const day = Number(day_of_week);
  const duration = Number(slot_duration);
  const capacity = Number(max_patients);
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const activeDoctor = Number.isSafeInteger(doctorId) && db.prepare(`
    SELECT 1 FROM doctors d JOIN users u ON u.id = d.user_id
    JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'doctor'
    WHERE d.id = ? AND u.status = 'active'
  `).get(doctorId);
  if (!activeDoctor || !Number.isInteger(day) || day < 0 || day > 6 ||
      typeof start_time !== 'string' || !timePattern.test(start_time) ||
      typeof end_time !== 'string' || !timePattern.test(end_time) || start_time >= end_time ||
      !Number.isInteger(duration) || duration < 5 || duration > 480 ||
      !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    req.flash('error', 'Thông tin ca trực không hợp lệ.');
    return res.redirect('/admin/schedules');
  }
  db.prepare(`
    INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration, max_patients, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(doctorId, day, `${start_time}:00`, `${end_time}:00`, duration, capacity);
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
  if (!['pending', 'approved', 'rejected'].includes(status) ||
      !db.prepare('SELECT id FROM doctor_leaves WHERE id = ?').get(req.params.id)) {
    req.flash('error', 'Đơn nghỉ phép hoặc trạng thái không hợp lệ.');
    return res.redirect('/admin/schedules');
  }
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

  const medicalRecord = db.prepare('SELECT * FROM medical_records WHERE appointment_id = ?').get(appt.id);
  let prescription = null;
  let prescriptionItems: any[] = [];
  if (medicalRecord) {
    prescription = db.prepare('SELECT * FROM prescriptions WHERE medical_record_id = ?').get(medicalRecord.id);
    if (prescription) {
      prescriptionItems = db.prepare(`
        SELECT pi.*, m.name as medicine_name, m.unit as medicine_unit
        FROM prescription_items pi
        JOIN medicines m ON pi.medicine_id = m.id
        WHERE pi.prescription_id = ?
      `).all(prescription.id);
    }
  }

  renderWithLayout(res, 'admin/appointments/view', {
    pageTitle: `Chi tiết lịch hẹn #${appt.booking_code}`,
    app: appt,
    history,
    medicalRecord,
    prescription,
    prescriptionItems
  }, 'layouts/admin');
});

app.post('/admin/appointments/status/:id', requireRole('admin'), (req, res) => {
  const { status, note } = req.body;
  const allowedStatuses = ['pending', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).render('errors/error', { message: 'Trạng thái lịch hẹn không hợp lệ' });
  }
  const appt = db.prepare('SELECT status FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt) {
    return res.status(404).render('errors/error', { message: 'Lịch hẹn không tồn tại' });
  }

  // Administrative correction is intentionally narrow. Clinical transitions
  // must go through check-in and examination so their side effects are written.
  const allowedAdminTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['cancelled', 'no_show']
  };
  if (!(allowedAdminTransitions[appt.status] || []).includes(status)) {
    return res.status(409).render('errors/error', {
      message: 'Không thể chuyển trạng thái theo cách này. Hãy dùng đúng quy trình tiếp đón và khám bệnh.'
    });
  }

  db.transaction(() => {
    db.prepare('UPDATE appointments SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND status = ?')
      .run(status, req.params.id, appt.status);
    db.prepare(`
      INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by_user_id, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, appt.status, status, req.session.user.id, note || 'Admin cập nhật thủ công');
  })();

  logActivity(req.session.user.id, 'OVERRIDE_STATUS', 'Appointment', req.params.id, `Đổi trạng thái sang: ${status}`, req);
  req.flash('success', 'Đã cập nhật trạng thái lịch hẹn.');
  res.redirect(`/admin/appointments/view/${req.params.id}`);
});

// Reports & Logs
app.get('/admin/reports', requireRole('admin'), (req, res) => {
  const stats = {
    today_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND date(paid_at, '+7 hours') = ?`).get(businessNow().date).s,
    month_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid' AND strftime('%Y-%m', paid_at, '+7 hours') = ?`).get(businessNow().date.slice(0, 7)).s,
    total_revenue: db.prepare(`SELECT COALESCE(sum(final_amount), 0) as s FROM payments WHERE payment_status = 'paid'`).get().s
  };

  const monthlyRevenue = db.prepare(`
    SELECT strftime('%m/%Y', paid_at, '+7 hours') as month, count(*) as invoice_count, sum(final_amount) as total_amount
    FROM payments
    WHERE payment_status = 'paid' AND paid_at IS NOT NULL
    GROUP BY strftime('%m/%Y', paid_at, '+7 hours')
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

// Admin Backup Database Endpoint (B-03)
app.get('/admin/backup-db', requireRole('admin'), (req, res) => {
  // Dùng đúng file CSDL đang chạy (tôn trọng DATABASE_PATH) và flush WAL trước khi tải
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) { /* không ở chế độ WAL */ }
  const dbFile = db.name;
  const nowStr = new Date().toISOString().split('T')[0];
  const downloadName = `medibook_backup_${nowStr}.sqlite`;
  logActivity(req.session.user.id, 'BACKUP_DATABASE', 'System', null, 'Xuất file sao lưu CSDL medibook.sqlite', req);
  res.download(dbFile, downloadName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).render('errors/error', { message: 'Không thể tải file sao lưu database' });
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/error', { message: 'Trang bạn yêu cầu không tồn tại (404)' });
});

// Global error handler: không rò rỉ chi tiết lỗi cho client
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  const status = err && err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).render('errors/error', {
    message: status === 500 ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' : 'Yêu cầu không hợp lệ.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MediBook Node.js Server đang chạy thành công!`);
  console.log(`👉 Truy cập website: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

export = app;

