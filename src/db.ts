import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Automatically load .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Ignore if already loaded or not available
  }
}

const ROOT_DIR = path.resolve(__dirname, '..');
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(ROOT_DIR, 'database/medibook.sqlite');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable Foreign Keys & WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    -- 1. Bảng Vai trò (Roles) trong hệ thống
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    );

    -- 2. Bảng Người dùng (Users)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL DEFAULT 'patient',
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Bảng Người dùng - Nhiều vai trò (User Roles: 1 người có nhiều role)
    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      dob TEXT,
      gender TEXT DEFAULT 'other',
      blood_group TEXT,
      address TEXT,
      emergency_contact TEXT,
      health_insurance_no TEXT,
      medical_history TEXT,
      priority_category TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT 'Bác sĩ',
      bio TEXT,
      experience_years INTEGER DEFAULT 1,
      consultation_fee REAL NOT NULL DEFAULT 200000.00,
      rating REAL NOT NULL DEFAULT 5.00,
      rating_count INTEGER NOT NULL DEFAULT 0,
      room_number TEXT NOT NULL DEFAULT 'P.101',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS receptionists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      staff_code TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doctor_specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      specialty_id INTEGER NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(doctor_id, specialty_id),
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      specialty_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_patients INTEGER DEFAULT 20,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code TEXT NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      specialty_id INTEGER,
      service_id INTEGER,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      symptoms TEXT,
      notes TEXT,
      cancellation_reason TEXT,
      source TEXT NOT NULL DEFAULT 'online',
      priority_level TEXT NOT NULL DEFAULT 'online',
      priority_reason TEXT,
      is_bumped INTEGER DEFAULT 0,
      bumped_from_slot TEXT,
      estimated_start_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE SET NULL,
      FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS appointment_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by_user_id INTEGER,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS examination_queues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      queue_number TEXT NOT NULL,
      room TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      priority_level TEXT NOT NULL DEFAULT 'online',
      priority_order INTEGER NOT NULL DEFAULT 3,
      is_bumped INTEGER DEFAULT 0,
      bumped_reason TEXT,
      checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      called_time DATETIME,
      finish_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      parent_visit_id INTEGER,
      visit_type TEXT NOT NULL DEFAULT 'initial',
      treatment_type TEXT NOT NULL DEFAULT 'outpatient',
      inpatient_room TEXT,
      inpatient_bed TEXT,
      admission_date TEXT,
      discharge_date TEXT,
      vital_signs TEXT,
      anamnesis TEXT,
      clinical_diagnosis TEXT NOT NULL,
      icd10_code TEXT,
      treatment_plan TEXT,
      doctor_notes TEXT,
      re_examination_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'Viên',
      usage_instruction TEXT,
      unit_price REAL NOT NULL DEFAULT 0.00,
      stock_quantity INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medical_record_id INTEGER NOT NULL UNIQUE,
      appointment_id INTEGER,
      doctor_id INTEGER,
      patient_id INTEGER,
      total_amount REAL NOT NULL DEFAULT 0.00,
      usage_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medical_record_id) REFERENCES medical_records (id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prescription_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_id INTEGER NOT NULL,
      medicine_id INTEGER,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      unit TEXT DEFAULT 'Viên',
      quantity REAL NOT NULL DEFAULT 1,
      morning TEXT DEFAULT '0',
      noon TEXT DEFAULT '0',
      afternoon TEXT DEFAULT '0',
      night TEXT DEFAULT '0',
      instructions TEXT,
      unit_price REAL NOT NULL DEFAULT 0.00,
      amount REAL NOT NULL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE,
      FOREIGN KEY (medicine_id) REFERENCES medicines (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      invoice_code TEXT NOT NULL UNIQUE,
      service_fee REAL NOT NULL DEFAULT 0.00,
      medicine_fee REAL NOT NULL DEFAULT 0.00,
      discount REAL NOT NULL DEFAULT 0.00,
      total_amount REAL NOT NULL DEFAULT 0.00,
      final_amount REAL NOT NULL DEFAULT 0.00,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      paid_at DATETIME,
      cashier_user_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
      FOREIGN KEY (cashier_user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_id INTEGER UNIQUE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS favorite_doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(patient_id, doctor_id),
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
    );

    -- 12. Bảng Tin tức & Cẩm nang Y tế (Articles: Thuốc, Dược liệu, Bệnh, Cơ thể)
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, /* 'thuoc', 'duoc-lieu', 'benh', 'co-the' */
      category_name TEXT NOT NULL,
      pill_label TEXT NOT NULL,
      icon TEXT DEFAULT '💊',
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      views_count INTEGER DEFAULT 120,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Phân hệ Quản lý Phòng & Giường Bệnh Nội Trú (Pha 4)
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      room_name TEXT NOT NULL,
      department_name TEXT DEFAULT 'Khoa Nội',
      room_type TEXT DEFAULT 'inpatient',
      total_beds INTEGER DEFAULT 4,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS beds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      bed_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      current_patient_id INTEGER,
      current_medical_record_id INTEGER,
      current_doctor_id INTEGER,
      admission_date DATETIME,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, bed_number),
      FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
      FOREIGN KEY (current_patient_id) REFERENCES patients (id) ON DELETE SET NULL,
      FOREIGN KEY (current_medical_record_id) REFERENCES medical_records (id) ON DELETE SET NULL,
      FOREIGN KEY (current_doctor_id) REFERENCES doctors (id) ON DELETE SET NULL
    );
  `);

  // Migrate existing tables gracefully (safe idempotent migrations)
  const migrations = [
    "ALTER TABLE medical_records ADD COLUMN parent_visit_id INTEGER REFERENCES medical_records (id)",
    "ALTER TABLE medical_records ADD COLUMN visit_type TEXT NOT NULL DEFAULT 'initial'",
    "ALTER TABLE medical_records ADD COLUMN treatment_type TEXT NOT NULL DEFAULT 'outpatient'",
    "ALTER TABLE medical_records ADD COLUMN inpatient_room TEXT",
    "ALTER TABLE medical_records ADD COLUMN inpatient_bed TEXT",
    "ALTER TABLE medical_records ADD COLUMN admission_date TEXT",
    "ALTER TABLE medical_records ADD COLUMN discharge_date TEXT",
    "ALTER TABLE appointments ADD COLUMN source TEXT NOT NULL DEFAULT 'online'",
    "ALTER TABLE appointments ADD COLUMN priority_level TEXT NOT NULL DEFAULT 'online'",
    "ALTER TABLE appointments ADD COLUMN priority_reason TEXT",
    "ALTER TABLE appointments ADD COLUMN is_bumped INTEGER DEFAULT 0",
    "ALTER TABLE appointments ADD COLUMN bumped_from_slot TEXT",
    "ALTER TABLE appointments ADD COLUMN estimated_start_time TEXT",
    "ALTER TABLE examination_queues ADD COLUMN priority_level TEXT NOT NULL DEFAULT 'online'",
    "ALTER TABLE examination_queues ADD COLUMN priority_order INTEGER NOT NULL DEFAULT 3",
    "ALTER TABLE examination_queues ADD COLUMN is_bumped INTEGER DEFAULT 0",
    "ALTER TABLE examination_queues ADD COLUMN bumped_reason TEXT",
    "ALTER TABLE patients ADD COLUMN priority_category TEXT DEFAULT 'normal'",
    "ALTER TABLE payments ADD COLUMN cashier_user_id INTEGER",
    "ALTER TABLE medical_records ADD COLUMN bed_id INTEGER REFERENCES beds (id)"
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (e) {
      // Column already exists or table not ready, safely ignore
    }
  }

  // Create High-Performance B-Tree Indexes
  const performanceIndexes = [
    "CREATE INDEX IF NOT EXISTS idx_appointments_doc_date ON appointments (doctor_id, appointment_date)",
    "CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id)",
    "CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status)",
    "CREATE INDEX IF NOT EXISTS idx_queue_room_status ON examination_queues (room, status)",
    "CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions (medical_record_id)",
    "CREATE INDEX IF NOT EXISTS idx_prescription_items_pres ON prescription_items (prescription_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (payment_status)",
    "CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_beds_room_status ON beds (room_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_beds_patient ON beds (current_patient_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_doctor_slot ON appointments(doctor_id, appointment_date, start_time) WHERE status NOT IN ('cancelled')"
  ];

  for (const idxSql of performanceIndexes) {
    try {
      db.exec(idxSql);
    } catch (e) {
      // Safely ignore if index already exists
    }
  }

  // Populate roles table if empty
  try {
    const roleCount = (db.prepare('SELECT count(*) as c FROM roles').get() as any).c;
    if (roleCount === 0) {
      db.exec(`
        INSERT INTO roles (code, name, description) VALUES
        ('admin', 'Quản trị viên', 'Quản trị toàn diện hệ thống MediBook'),
        ('doctor', 'Bác sĩ', 'Bác sĩ chuyên khoa thăm khám, chẩn đoán và kê đơn'),
        ('receptionist', 'Lễ tân / Thu ngân', 'Tiếp đón, phân luồng ưu tiên, cấp STT và thu viện phí'),
        ('patient', 'Bệnh nhân', 'Đặt lịch trực tuyến, theo dõi bệnh án và đơn thuốc');
      `);
    }
  } catch (e) {}

  // Sync users to user_roles
  try {
    db.exec(`
      INSERT OR IGNORE INTO user_roles (user_id, role)
      SELECT id, role FROM users WHERE role IS NOT NULL;
    `);

    // Give admin user id=1 also doctor role for multi-role demonstration
    db.exec(`
      INSERT OR IGNORE INTO user_roles (user_id, role)
      SELECT id, 'doctor' FROM users WHERE email = 'admin@medibook.local';
    `);
  } catch (e) {}

  // 13. Ensure all doctors have schedules for all days of week (0=Sunday to 6=Saturday)
  try {
    const doctors = db.prepare('SELECT id FROM doctors').all() as { id: number }[];
    const checkSchedule = db.prepare('SELECT id FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?');
    const insertSchedule = db.prepare(`
      INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration, max_patients, status)
      VALUES (?, ?, ?, ?, 30, 16, 'active')
    `);

    for (const doc of doctors) {
      for (let day = 0; day <= 6; day++) {
        const existing = checkSchedule.get(doc.id, day);
        if (!existing) {
          // Weekend morning shift for Sundays (0), full shift for others
          const startTime = '08:00:00';
          const endTime = day === 0 ? '12:00:00' : '17:00:00';
          insertSchedule.run(doc.id, day, startTime, endTime);
        }
      }
    }
  } catch (e) {}

  // 14. Seed Medical Articles (Thuốc, Dược liệu, Bệnh, Cơ thể)
  try {
    const articleCount = (db.prepare('SELECT count(*) as c FROM articles').get() as any).c;
    if (articleCount === 0) {
      const insertArticle = db.prepare(`
        INSERT INTO articles (category, category_name, pill_label, icon, slug, title, summary, content, author_name, author_role, views_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const seedArticles = [
        // THUỐC
        [
          'thuoc', 'Thuốc', 'Thuốc điều trị', '💊',
          'thuoc-ozempic-thanh-phan-cong-dung',
          'Thuốc Ozempic: Thành phần, công dụng và lưu ý an toàn khi sử dụng',
          'Ozempic (Semaglutide) là thuốc tiêm dưới da được chỉ định điều trị đái tháo đường type 2 và kiểm soát cân nặng hiệu quả dưới sự giám sát y tế.',
          `<p><strong>Ozempic (hoạt chất Semaglutide)</strong> là một chất chủ vận thụ thể GLP-1 (glucagon-like peptide-1). Thuốc hoạt động bằng cách kích thích tiết insulin khi lượng đường huyết trong máu tăng cao, đồng thời làm chậm quá trình làm rỗng dạ dày, giúp giảm cảm giác thèm ăn và duy trì đường huyết ổn định.</p>
          <h3>1. Chỉ định điều trị chính</h3>
          <ul>
            <li>Kiểm soát chỉ số HbA1c ở bệnh nhân trưởng thành mắc đái tháo đường type 2.</li>
            <li>Giảm nguy cơ biến cố tim mạch lớn (đột quỵ, nhồi máu cơ tim) ở người bệnh tim mạch kết hợp đái tháo đường.</li>
            <li>Hỗ trợ giảm cân có giám sát y tế chuyên khoa nội tiết.</li>
          </ul>
          <h3>2. Liều dùng & Cách sử dụng</h3>
          <p>Thuốc được bào chế dưới dạng bút tiêm tiện lợi. Liều khởi đầu thông thường là 0.25mg/tuần trong 4 tuần đầu, sau đó tăng lên 0.5mg/tuần tùy theo đáp ứng lâm sàng. Luôn tiêm dưới da vùng bụng, đùi hoặc bắp tay.</p>
          <h3>3. Cảnh báo an toàn & Chống chỉ định</h3>
          <p>Không dùng cho bệnh nhân có tiền sử cá nhân hoặc gia đình mắc ung thư biểu mô tuyến giáp thể tủy (MTC) hoặc hội chứng đa u nội tiết nhóm 2 (MEN 2). Tuyệt đối không tự ý mua và dùng thuốc khi chưa có chỉ định từ Bác sĩ Nội tiết.</p>`,
          'Dược sĩ Nguyễn Lê Thu Trúc', 'Cố vấn Dược lâm sàng MediBook', 1450
        ],
        [
          'thuoc', 'Thuốc', 'Kháng sinh & Kháng viêm', '🧴',
          'vien-ngam-khang-viem-difflam-cong-dung',
          'Viên ngậm kháng viêm Difflam: Công dụng, cách dùng và liều lượng',
          'Difflam chứa Benzydamine Hydrochloride giúp giảm sưng đau họng, viêm amidan và các tổn thương niêm mạc khoang miệng nhanh chóng.',
          `<p><strong>Viên ngậm Difflam</strong> là sản phẩm kháng viêm giảm đau tại chỗ phổ biến. Khác với các loại viên ngậm thơm miệng thông thường, Difflam chứa hoạt chất kháng viêm không steroid tác động trực tiếp lên ổ viêm niêm mạc hầu họng.</p>
          <h3>1. Tác dụng dược lý</h3>
          <ul>
            <li>Giảm sưng tấy và đau rát cổ họng do viêm họng cấp hoặc thay đổi thời tiết.</li>
            <li>Làm dịu vết loét nhiệt miệng (aphthe), viêm nướu, viêm họng hạt.</li>
            <li>Tác dụng gây tê nhẹ bề mặt giúp nuốt thức ăn dễ dàng hơn.</li>
          </ul>
          <h3>2. Hướng dẫn sử dụng chuẩn</h3>
          <p>Ngậm 1 viên để tan từ từ trong miệng mỗi 2 đến 3 giờ khi cần. Không nhai hoặc nuốt chửng cả viên. Tối đa không quá 12 viên ngậm trong 24 giờ. Trẻ em dưới 6 tuổi cần tham khảo ý kiến Bác sĩ chuyên khoa Nhi.</p>`,
          'Dược sĩ Phan Hữu Xuân Hạo', 'Dược sĩ Bệnh viện Đa khoa', 980
        ],
        [
          'thuoc', 'Thuốc', 'Bệnh học lâm sàng', '🩺',
          'thuoc-metronidazol-la-gi-tac-dung-phu',
          'Thuốc Metronidazol là gì? Tác dụng phụ và những điều lưu ý đặc biệt',
          'Metronidazol là kháng sinh thuộc nhóm nitroimidazol đặc trị nhiễm khuẩn kỵ khí và các bệnh do ký sinh trùng amip, trichomonas.',
          `<p><strong>Metronidazol</strong> là loại kháng sinh có phổ tác dụng rộng trên các vi khuẩn kỵ khí và động vật nguyên sinh đơn bào. Thuốc thâm nhập tốt vào các mô và dịch cơ thể, đạt nồng độ cao trong nước bọt, mật, xương và dịch não tủy.</p>
          <h3>1. Công dụng điều trị</h3>
          <ul>
            <li>Nhiễm khuẩn đường tiêu hóa: viêm đại tràng giả mạc, áp xe gan do amip.</li>
            <li>Nhiễm trùng phụ khoa: viêm âm đạo do Trichomonas vaginalis hoặc vi khuẩn kỵ khí.</li>
            <li>Viêm nhiễm nha khoa: viêm nha chu cấp, áp xe quanh cuống răng.</li>
          </ul>
          <h3>2. Tương tác nguy hiểm với Rượu bia</h3>
          <p><strong>CẢNH BÁO ĐẶC BIỆT:</strong> Tuyệt đối không uống rượu, bia hoặc các thức uống chứa cồn trong thời gian dùng Metronidazol và ít nhất 48 giờ sau khi ngưng thuốc. Tương tác gây phản ứng giống Disulfiram (hội chứng cai rượu) với các triệu chứng tim đập nhanh, đỏ bừng mặt, buồn nôn dữ dội và tụt huyết áp.</p>`,
          'Bác sĩ CKII Lê Thị Minh Hồng', 'Chuyên gia Bệnh học Truyền nhiễm', 1230
        ],
        [
          'thuoc', 'Thuốc', 'Thuốc hạ sốt & Giảm đau', '💊',
          'paracetamol-500mg-ha-sot-dung-cach',
          'Paracetamol 500mg: Hướng dẫn sử dụng hạ sốt giảm đau an toàn chuẩn y khoa',
          'Paracetamol (Acetaminophen) là thuốc giảm đau hạ sốt đầu tay an toàn nhất khi dùng đúng liều lượng theo cân nặng.',
          `<p><strong>Paracetamol 500mg</strong> là thuốc không kê đơn phổ biến hàng đầu thế giới. Thuốc tác động lên trung tâm điều nhiệt ở vùng dưới đồi gây hạ sốt và ức chế tổng hợp prostaglandin ở hệ thần kinh trung ương giúp giảm đau.</p>
          <h3>1. Liều dùng chuẩn xác theo cân nặng</h3>
          <ul>
            <li>Người lớn: 1 đến 2 viên 500mg mỗi lần, cách nhau từ 4 - 6 giờ nếu còn đau hoặc sốt.</li>
            <li>Trẻ em: Liều khuyến cáo là 10 - 15mg/kg cân nặng mỗi lần dùng.</li>
            <li>Tổng liều tối đa không được vượt quá 4.000mg (4g)/ngày đối với người lớn có chức năng gan bình thường.</li>
          </ul>
          <h3>2. Nguy cơ ngộ độc gan khi quá liều</h3>
          <p>Dùng quá liều Paracetamol sẽ tích tụ chất chuyển hóa độc hại NAPQI làm hủy hoại tế bào gan cấp tính. Cần kiểm tra kỹ các loại thuốc cảm ho phối hợp vì rất nhiều thuốc đã chứa sẵn Paracetamol.</p>`,
          'Dược sĩ Nguyễn Lê Thu Trúc', 'Cố vấn Dược lâm sàng MediBook', 2100
        ],

        // DƯỢC LIỆU
        [
          'duoc-lieu', 'Dược liệu', 'Dược liệu quý', '🌿',
          'dong-trung-ha-thao-duoc-tinh-va-cach-dung',
          'Đông trùng hạ thảo: Tác dụng bồi bổ, dược tính và cách dùng chuẩn khoa học',
          'Khám phá kho tàng hoạt chất sinh học Cordycepin, Adenosine trong Đông trùng hạ thảo giúp tăng cường đề kháng và bảo vệ thận phổi.',
          `<p><strong>Đông trùng hạ thảo (Cordyceps sinensis / Cordyceps militaris)</strong> là vị thuốc quý hiếm kết hợp giữa ấu trùng sâu non và nấm ký sinh. Dược liệu này được y học cổ truyền và hiện đại đánh giá cao về khả năng đại bổ khí huyết.</p>
          <h3>1. Các hoạt chất sinh học quý giá</h3>
          <ul>
            <li><strong>Cordycepin:</strong> Hoạt chất ức chế sự nhân lên của các tế bào lạ, hỗ trợ chống viêm và kháng khuẩn tự nhiên.</li>
            <li><strong>Adenosine:</strong> Tăng cường tuần hoàn máu động mạch vành, điều hòa nhịp tim và cải thiện chất lượng giấc ngủ.</li>
            <li><strong>Polysaccharide:</strong> Kích hoạt hệ thống đại thực bào, củng cố hàng rào miễn dịch tự nhiên của cơ thể.</li>
          </ul>
          <h3>2. Cách dùng mang lại hiệu quả cao nhất</h3>
          <p>Hãm trà với nước ấm khoảng 70 - 80°C trong 10 phút rồi uống nước và ăn cả sợi nấm; hoặc chưng cùng tổ yến, hầm gà ác bồi bổ cho người mới ốm dậy.</p>`,
          'ThS. Dược học Trần Văn Nam', 'Viện Dược liệu Trung ương', 1890
        ],
        [
          'duoc-lieu', 'Dược liệu', 'Quốc bảo dược liệu', '🌱',
          'sam-ngoc-linh-quoc-bao-suc-khoe-viet-nam',
          'Sâm Ngọc Linh: Dược liệu quý của Việt Nam, công dụng tăng cường miễn dịch',
          'Sâm Ngọc Linh chứa hơn 52 hợp chất Saponin quý vượt trội hơn hẳn sâm Triều Tiên, sâm Mỹ, được mệnh danh là Quốc bảo Việt Nam.',
          `<p><strong>Sâm Ngọc Linh (Panax vietnamensis)</strong> là loài sâm đặc hữu chỉ sinh trưởng trên đỉnh núi Ngọc Linh thuộc dãy Trường Sơn ở độ cao trên 1.500m. Đây là một trong những loài sâm có hàm lượng Saponin phong phú và giá trị dược liệu cao nhất thế giới.</p>
          <h3>1. Điểm nổi bật về hoạt chất Majonoside-R2</h3>
          <p>Sâm Ngọc Linh chứa hàm lượng lớn hợp chất Majonoside-R2 (MR2). Hoạt chất này có tác dụng chống stress tâm lý, giải tỏa căng thẳng thần kinh, chống trầm cảm và phục hồi thể lực suy kiệt nhanh chóng.</p>
          <h3>2. Công dụng lâm sàng</h3>
          <ul>
            <li>Tăng cường sinh lực, chống suy nhược cơ thể kéo dài.</li>
            <li>Bảo vệ tế bào gan trước độc tố bia rượu và hóa chất.</li>
            <li>Kích thích hệ miễn dịch sản sinh kháng thể tự nhiên chống lại các bệnh cảm cúm.</li>
          </ul>`,
          'BS. CKII. Nguyễn Minh Đức', 'Trưởng khoa Khám bệnh MediBook', 1670
        ],
        [
          'duoc-lieu', 'Dược liệu', 'Thảo dược mát gan', '🍵',
          'cay-actiso-thao-duoc-mat-gan-ha-men-gan',
          'Cây Actiso: Thảo dược mát gan, hạ men gan và thanh lọc cơ thể',
          'Actiso (Artichoke) nổi tiếng với hợp chất Cynarin giúp tăng tiết mật, giải độc gan, hạ mỡ máu và cải thiện tiêu hóa.',
          `<p><strong>Actiso (Cynara scolymus)</strong> là cây thuốc được trồng phổ biến tại các vùng cao nguyên khí hậu ôn đới như Đà Lạt, Sa Pa. Mọi bộ phận của cây từ hoa, lá, thân và rễ đều được ứng dụng trong điều trị các bệnh lý gan mật.</p>
          <h3>1. Tác dụng của hoạt chất Cynarin</h3>
          <p>Cynarin cùng các hợp chất flavonoid trong lá Actiso kích thích gan sản xuất và bài tiết mật, giúp tiêu hóa chất béo nhanh hơn, đồng thời bảo vệ màng tế bào gan khỏi sự tổn thương do quá trình oxy hóa.</p>
          <h3>2. Những ai nên dùng trà Actiso?</h3>
          <ul>
            <li>Người bị men gan cao, gan nhiễm mỡ, vàng da, khó tiêu sau ăn nhiều dầu mỡ.</li>
            <li>Người hay bị nổi mề đay, mụn nhọt, ngứa ngáy do nóng gan.</li>
            <li>Người có chỉ số cholesterol xấu (LDL) cao cần thanh lọc mạch máu.</li>
          </ul>`,
          'Dược sĩ Phan Hữu Xuân Hạo', 'Dược sĩ Bệnh viện Đa khoa', 1120
        ],

        // BỆNH HỌC
        [
          'benh', 'Bệnh học', 'Tiêu hóa & Dạ dày', '🩺',
          'trao-nguoc-da-day-thuc-quan-gerd-trieu-chung',
          'Trào ngược dạ dày thực quản (GERD): Triệu chứng, nguyên nhân và phác đồ điều trị',
          'Ợ chua, nóng rát sau xương ức, vướng nghẹn cổ họng là dấu hiệu điển hình của trào ngược dạ dày thực quản cần được can thiệp sớm.',
          `<p><strong>Bệnh trào ngược dạ dày thực quản (GERD)</strong> xảy ra khi dịch vị acid từ dạ dày trào ngược lên thực quản nhiều lần, gây tổn thương niêm mạc thực quản và ảnh hưởng nghiêm trọng đến sinh hoạt hàng ngày.</p>
          <h3>1. Các triệu chứng thường gặp</h3>
          <ul>
            <li><strong>Ợ nóng và ợ chua:</strong> Cảm giác nóng rát lan từ thượng vị lên cổ họng, thường xuất hiện sau ăn no hoặc khi nằm ngửa.</li>
            <li><strong>Đắng miệng, vướng họng:</strong> Dịch mật trào ngược lên khoang miệng gây cảm giác đắng nghét vào buổi sáng.</li>
            <li><strong>Ho khan kéo dài, khàn tiếng:</strong> Acid dạ dày kích thích thanh quản gây hiểu nhầm là bệnh tai mũi họng mãn tính.</li>
          </ul>
          <h3>2. Biện pháp điều trị không dùng thuốc</h3>
          <p>Kê cao đầu giường 15 - 20cm khi ngủ, không ăn trong vòng 3 tiếng trước khi đi ngủ, kiêng hoàn toàn cà phê, socola, đồ chua cay và thức uống có ga.</p>`,
          'BS. CKII. Nguyễn Minh Đức', 'Trưởng khoa Nội tổng quát', 2450
        ],
        [
          'benh', 'Bệnh học', 'Tim mạch lâm sàng', '❤️',
          'tang-huyet-ap-ke-giet-nguoi-tham-lang',
          'Tăng huyết áp: Kẻ giết người thầm lặng và cách kiểm soát huyết áp ổn định',
          'Tăng huyết áp đa số không có triệu chứng báo trước nhưng là nguyên nhân hàng đầu gây đột quỵ não và nhồi máu cơ tim cấp.',
          `<p><strong>Tăng huyết áp</strong> được chẩn đoán khi chỉ số huyết áp tâm thu ≥ 140 mmHg và/hoặc huyết áp tâm trương ≥ 90 mmHg qua nhiều lần đo đúng chuẩn y khoa. Căn bệnh này được mệnh danh là "kẻ giết người thầm lặng" vì diễn tiến âm thầm phá hủy mạch máu.</p>
          <h3>1. Các biến chứng nguy hiểm nếu không kiểm soát</h3>
          <ul>
            <li><strong>Đột quỵ não:</strong> Vỡ mạch máu não (xuất huyết não) hoặc tắc mạch máu não (nhồi máu não).</li>
            <li><strong>Suy tim và nhồi máu cơ tim:</strong> Tim phải co bóp chống lại áp lực cao trong lòng mạch, dẫn đến dày thất trái và suy giảm chức năng bơm máu.</li>
            <li><strong>Suy thận mạn tính:</strong> Xơ cứng các tiểu động mạch cầu thận làm giảm khả năng lọc chất cặn bã.</li>
          </ul>
          <h3>2. Lời khuyên vàng từ Bác sĩ Tim mạch</h3>
          <p>Giảm lượng muối ăn dưới 5g/ngày (khoảng 1 muỗng cà phê muối), tập thể dục thể thao đều đặn 30 phút mỗi ngày và tuyệt đối tuân thủ uống thuốc huyết áp đều đặn mỗi sáng theo đơn của bác sĩ.</p>`,
          'BS. CKI. Lê Quang Huy', 'Chuyên gia Tim mạch MediBook', 1980
        ],
        [
          'benh', 'Bệnh học', 'Truyền nhiễm & Dịch tễ', '🌡️',
          'sot-xuat-huyet-dengue-dau-hieu-nguy-hiem',
          'Sốt xuất huyết Dengue: Dấu hiệu nhận biết sớm và cách theo dõi tại nhà',
          'Phân biệt sốt xuất huyết với sốt siêu vi thông thường, nắm rõ các dấu hiệu cảnh báo cần nhập viện cấp cứu ngay từ ngày thứ 3 đến ngày thứ 7.',
          `<p><strong>Sốt xuất huyết Dengue</strong> là bệnh truyền nhiễm cấp tính do virus Dengue gây ra, lây truyền từ người sang người qua vết đốt của muỗi vằn Aedes aegypti. Bệnh có thể bùng phát thành dịch lớn vào mùa mưa.</p>
          <h3>1. Ba giai đoạn lâm sàng của bệnh</h3>
          <ul>
            <li><strong>Giai đoạn sốt (Ngày 1 - 3):</strong> Sốt cao đột ngột 39 - 40°C, đau nhức hai hốc mắt, đau đầu dữ dội, đau cơ khớp.</li>
            <li><strong>Giai đoạn nguy hiểm (Ngày 3 - 7):</strong> Nhiệt độ giảm dần nhưng nguy cơ sốc do thoát huyết tương, tụt huyết áp và chảy máu nội tạng tăng cao.</li>
            <li><strong>Giai đoạn hồi phục (Ngày 7 - 10):</strong> Huyết động ổn định, bệnh nhân thèm ăn trở lại và đi tiểu nhiều.</li>
          </ul>
          <h3>2. Dấu hiệu cảnh báo phải nhập viện ngay lập tức</h3>
          <p>Đau bụng dữ dội vùng hạ sườn phải, nôn ói liên tục, chảy máu chân răng hoặc chảy máu mũi, li bì vật vã, chân tay lạnh ẩm. Tuyệt đối không dùng Aspirin hoặc Ibuprofen để hạ sốt vì nguy cơ gây xuất huyết dạ dày tử vong.</p>`,
          'BS. Phạm Thúy An', 'Bác sĩ Chuyên khoa Nhi MediBook', 1560
        ],

        // CƠ THỂ
        [
          'co-the', 'Cơ thể', 'Giải phẫu & Sinh lý', '🧬',
          'he-tieu-hoa-bo-nao-thu-hai-cua-co-the',
          'Hệ tiêu hóa - Bộ não thứ hai của cơ thể: Cách chăm sóc vi sinh đường ruột',
          'Hơn 70% tế bào miễn dịch và 90% hormone hạnh phúc Serotonin được sản xuất tại hệ thống tiêu hóa đường ruột của bạn.',
          `<p><strong>Hệ trục Não - Ruột (Gut-Brain Axis)</strong> là mạng lưới liên lạc hai chiều phức tạp giữa hệ thần kinh trung ương và hệ vi sinh đường ruột. Đường ruột sở hữu hơn 100 triệu tế bào thần kinh, tương đương tủy sống, vì thế được các nhà khoa học gọi là "Bộ não thứ hai".</p>
          <h3>1. Vai trò sống còn của vi sinh vật đường ruột (Microbiome)</h3>
          <ul>
            <li>Tổng hợp các vitamin thiết yếu nhóm B (B1, B6, B12) và vitamin K.</li>
            <li>Lên men chất xơ tạo ra các axit béo chuỗi ngắn (SCFA) nuôi dưỡng tế bào biểu mô đại tràng.</li>
            <li>Ngăn chặn vi khuẩn gây bệnh bám dính và tiết độc tố qua thành ruột.</li>
          </ul>
          <h3>2. 4 nguyên tắc nuôi dưỡng đường ruột khỏe mạnh</h3>
          <p>Tăng cường bổ sung chất xơ hòa tan (chuối, yến mạch, măng tây), ăn các thực phẩm lên men tự nhiên giàu lợi khuẩn (sữa chua, kim chi), hạn chế tối đa thực phẩm siêu chế biến và tránh lạm dụng kháng sinh bừa bãi.</p>`,
          'BS. CKII. Nguyễn Minh Đức', 'Trưởng khoa Khám bệnh MediBook', 2340
        ],
        [
          'co-the', 'Cơ thể', 'Hệ tim mạch', '🫀',
          'trai-tim-va-he-tuan-hoan-mau-chi-so-sinh-ton',
          'Trái tim và hệ tuần hoàn máu: Các chỉ số sinh tồn bạn cần biết',
          'Trái tim đập trung bình 100.000 nhịp mỗi ngày để bơm máu nuôi dưỡng hàng nghìn tỷ tế bào. Hiểu rõ các chỉ số tim mạch giúp phòng tránh đột quỵ.',
          `<p><strong>Hệ tuần hoàn</strong> bao gồm tim và mạng lưới mạch máu dài hơn 96.000 km. Trái tim đóng vai trò như một máy bơm thủy lực bền bỉ, luân chuyển oxy và dưỡng chất đến từng mô cơ quan và vận chuyển CO2 đến phổi để đào thải.</p>
          <h3>1. Ba chỉ số vàng đánh giá sức khỏe tim mạch</h3>
          <ul>
            <li><strong>Nhịp tim lúc nghỉ ngơi (Resting Heart Rate):</strong> Chuẩn bình thường từ 60 đến 90 nhịp/phút. Nhịp tim thường xuyên > 100 nhịp/phút khi nghỉ cần được khám chuyên khoa.</li>
            <li><strong>Huyết áp tối ưu:</strong> Huyết áp tâm thu < 120 mmHg và huyết áp tâm trương < 80 mmHg.</li>
            <li><strong>Chỉ số Lipid máu:</strong> Cholesterol toàn phần < 5.2 mmol/L và Triglyceride < 1.7 mmol/L.</li>
          </ul>
          <h3>2. Dấu hiệu cầu cứu của trái tim</h3>
          <p>Cơn đau thắt ngực kiểu đè nặng, bóp nghẹt sau xương ức lan lên vai trái hoặc quai hàm, kèm khó thở, vã mồ hôi lạnh là dấu hiệu khẩn cấp của nhồi máu cơ tim cần gọi cấp cứu 115 ngay.</p>`,
          'BS. CKI. Lê Quang Huy', 'Chuyên gia Tim mạch MediBook', 1780
        ],
        [
          'co-the', 'Cơ thể', 'Cơ quan nội tạng', '🧪',
          'gan-va-than-nha-may-loc-doc-tu-nhien',
          'Gan và Thận: Nhà máy lọc độc tự nhiên và những thói quen gây suy giảm',
          'Gan thực hiện hơn 500 chức năng sống còn trong khi thận lọc khoảng 180 lít dịch máu mỗi ngày để bảo vệ cơ thể khỏi nhiễm độc.',
          `<p><strong>Gan và Thận</strong> là hai cơ quan bài tiết và chuyển hóa chủ lực trong cơ thể người. Gan như một nhà máy hóa chất khổng lồ chuyển hóa thức ăn, trung hòa độc tố, trong khi hai quả thận hoạt động như bộ lọc tinh vi cân bằng nước, điện giải và bài tiết chất thải qua nước tiểu.</p>
          <h3>1. Những thói quen âm thầm tàn phá Gan & Thận</h3>
          <ul>
            <li><strong>Ăn quá nhiều muối và thực phẩm chế biến sẵn:</strong> Làm tăng áp lực cầu thận, dẫn đến xơ hóa mạch máu thận.</li>
            <li><strong>Thói quen nhịn uống nước:</strong> Nước tiểu cô đặc dễ hình thành sỏi thận và viêm nhiễm đường tiết niệu.</li>
            <li><strong>Tự ý uống thuốc giảm đau và kháng sinh:</strong> Paracetamol quá liều gây hủy hoại gan; thuốc chống viêm NSAID gây suy thận cấp.</li>
            <li><strong>Lạm dụng rượu bia và thức khuya:</strong> Khiến gan không có thời gian tái tạo glycogen và đào thải mỡ thừa.</li>
          </ul>
          <h3>2. Tầm soát định kỳ chức năng Gan Thận</h3>
          <p>Thực hiện xét nghiệm máu đo men gan (AST, ALT, GGT) và chức năng thận (Ure, Creatinine máu, eGFR) ít nhất mỗi 6 tháng một lần để phát hiện sớm các tổn thương trước khi có triệu chứng rõ ràng.</p>`,
          'BS. CKII. Nguyễn Văn Bình', 'Chuyên khoa Nội tổng hợp MediBook', 1420
        ]
      ];

      for (const a of seedArticles) {
        insertArticle.run(...a);
      }
    }
  } catch (e) {}

  // Populate rooms & beds if empty (Pha 4)
  try {
    const roomCount = (db.prepare('SELECT count(*) as c FROM rooms').get() as any).c;
    if (roomCount === 0) {
      const insertRoom = db.prepare(`
        INSERT INTO rooms (room_number, room_name, department_name, room_type, total_beds)
        VALUES (?, ?, ?, ?, ?)
      `);
      const insertBed = db.prepare(`
        INSERT INTO beds (room_id, bed_number, status, current_patient_id, current_doctor_id, admission_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Lấy id bệnh nhân và bác sĩ mẫu nếu có
      const defaultPatient = db.prepare('SELECT id FROM patients LIMIT 1').get() as any;
      const defaultDoctor = db.prepare('SELECT id FROM doctors LIMIT 1').get() as any;
      const pId = defaultPatient ? defaultPatient.id : null;
      const dId = defaultDoctor ? defaultDoctor.id : null;

      // Phòng 1: P.401 - Tim Mạch
      const r1 = insertRoom.run('P.401', 'Phòng Nội Trú Tim Mạch', 'Khoa Tim Mạch', 'inpatient', 4);
      insertBed.run(r1.lastInsertRowid, 'G-01', 'occupied', pId, dId, new Date(Date.now() - 2 * 86400000).toISOString(), 'Theo dõi sau can thiệp mạch vành');
      insertBed.run(r1.lastInsertRowid, 'G-02', 'available', null, null, null, null);
      insertBed.run(r1.lastInsertRowid, 'G-03', 'cleaning', null, null, null, 'Khử khuẩn và thay drap giường');
      insertBed.run(r1.lastInsertRowid, 'G-04', 'available', null, null, null, null);

      // Phòng 2: P.402 - Hô Hấp
      const r2 = insertRoom.run('P.402', 'Phòng Nội Trú Hô Hấp', 'Khoa Hô Hấp', 'inpatient', 4);
      insertBed.run(r2.lastInsertRowid, 'G-01', 'available', null, null, null, null);
      insertBed.run(r2.lastInsertRowid, 'G-02', 'occupied', pId, dId, new Date(Date.now() - 1 * 86400000).toISOString(), 'Viêm phổi thùy đang điều trị kháng sinh');
      insertBed.run(r2.lastInsertRowid, 'G-03', 'maintenance', null, null, null, 'Hệ thống van oxy áp lực cần kiểm định');
      insertBed.run(r2.lastInsertRowid, 'G-04', 'available', null, null, null, null);

      // Phòng 3: P.501 - Hồi Sức Tích Cực (ICU)
      const r3 = insertRoom.run('P.501', 'Phòng Hồi Sức Cấp Cứu (ICU)', 'Hồi Sức Cấp Cứu', 'icu', 2);
      insertBed.run(r3.lastInsertRowid, 'G-01', 'occupied', pId, dId, new Date(Date.now() - 3 * 86400000).toISOString(), 'Bệnh nhân thở máy hỗ trợ Monitor 24/7');
      insertBed.run(r3.lastInsertRowid, 'G-02', 'available', null, null, null, null);
    }
  } catch (e) {}
}

// Auto init tables
initDb();

export = db;
