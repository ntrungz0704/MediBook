import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = path.resolve(__dirname, '..');
const dbPath = path.join(ROOT_DIR, 'database/medibook.sqlite');
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
  `);

  // Migrate existing tables gracefully (safe idempotent migrations)
  const migrations = [
    "ALTER TABLE medical_records ADD COLUMN visit_type TEXT NOT NULL DEFAULT 'initial'",
    "ALTER TABLE medical_records ADD COLUMN treatment_type TEXT NOT NULL DEFAULT 'outpatient'",
    "ALTER TABLE medical_records ADD COLUMN inpatient_room TEXT",
    "ALTER TABLE medical_records ADD COLUMN inpatient_bed TEXT",
    "ALTER TABLE medical_records ADD COLUMN admission_date TEXT",
    "ALTER TABLE medical_records ADD COLUMN discharge_date TEXT",
    "ALTER TABLE appointments ADD COLUMN source TEXT NOT NULL DEFAULT 'online'",
    "ALTER TABLE appointments ADD COLUMN priority_level TEXT NOT NULL DEFAULT 'online'",
    "ALTER TABLE appointments ADD COLUMN priority_reason TEXT",
    "ALTER TABLE examination_queues ADD COLUMN priority_level TEXT NOT NULL DEFAULT 'online'",
    "ALTER TABLE examination_queues ADD COLUMN priority_order INTEGER NOT NULL DEFAULT 3",
    "ALTER TABLE patients ADD COLUMN priority_category TEXT DEFAULT 'normal'",
    "ALTER TABLE payments ADD COLUMN cashier_user_id INTEGER"
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
    "CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id)"
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
}

// Auto init tables
initDb();

export = db;
