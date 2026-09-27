const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/medibook.sqlite');
const db = new Database(dbPath);

// Enable Foreign Keys & WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
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
      department TEXT NOT NULL DEFAULT 'Bộ phận Tiếp đón & Thu ngân',
      shift_default TEXT DEFAULT 'Sáng - Chiều',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT DEFAULT 'stethoscope',
      image TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      specialty_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0.00,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_specialties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      specialty_id INTEGER NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
      FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_duration INTEGER NOT NULL DEFAULT 30,
      max_patients INTEGER NOT NULL DEFAULT 16,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
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
      checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      called_time DATETIME,
      finish_time DATETIME,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      anamnesis TEXT,
      vital_signs TEXT,
      clinical_diagnosis TEXT,
      icd10_code TEXT,
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
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0.00,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      usage_instruction TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medical_record_id INTEGER NOT NULL,
      appointment_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0.00,
      usage_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medical_record_id) REFERENCES medical_records (id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prescription_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_id INTEGER NOT NULL,
      medicine_id INTEGER,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      unit TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      morning TEXT DEFAULT '0',
      noon TEXT DEFAULT '0',
      afternoon TEXT DEFAULT '0',
      night TEXT DEFAULT '0',
      instructions TEXT,
      unit_price REAL NOT NULL DEFAULT 0.00,
      amount REAL NOT NULL DEFAULT 0.00,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE,
      FOREIGN KEY (medicine_id) REFERENCES medicines (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      invoice_code TEXT NOT NULL UNIQUE,
      service_fee REAL NOT NULL DEFAULT 0.00,
      medicine_fee REAL NOT NULL DEFAULT 0.00,
      total_amount REAL NOT NULL DEFAULT 0.00,
      discount REAL NOT NULL DEFAULT 0.00,
      final_amount REAL NOT NULL DEFAULT 0.00,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      paid_at DATETIME,
      cashier_user_id INTEGER,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
      FOREIGN KEY (cashier_user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );
  `);

  // Check if users already seeded
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedDb();
  }
}

function seedDb() {
  const bcrypt = require('bcryptjs');
  const passwordHash = bcrypt.hashSync('password', 10);

  // 1. Specialties
  const insertSpecialty = db.prepare(`
    INSERT INTO specialties (id, name, slug, description, icon, image, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const specialties = [
    [1, 'Nội tổng quát', 'noi-tong-quat', 'Chăm sóc sức khỏe toàn diện và chẩn đoán ban đầu', 'stethoscope', 'noi-tong-quat.svg', 'active'],
    [2, 'Nhi khoa', 'nhi-khoa', 'Vì sự phát triển khỏe mạnh và an toàn của trẻ em', 'baby', 'nhi-khoa.svg', 'active'],
    [3, 'Sản phụ khoa', 'san-phu-khoa', 'Đồng hành cùng sức khỏe và sự tự tin phụ nữ Việt', 'female', 'san-phu-khoa.svg', 'active'],
    [4, 'Da liễu', 'da-lieu', 'Làn da khỏe mạnh, điều trị mụn và thẩm mỹ an toàn', 'sparkles', 'da-lieu.svg', 'active'],
    [5, 'Tai mũi họng', 'tai-mui-hong', 'Hô hấp dễ dàng, chẩn đoán nội soi kỹ thuật số', 'head-side', 'tai-mui-hong.svg', 'active'],
    [6, 'Cơ xương khớp', 'co-xuong-khop', 'Vận động linh hoạt, trị liệu phục hồi chức năng', 'bone', 'co-xuong-khop.svg', 'active'],
    [7, 'Tim mạch', 'tim-mach', 'Trái tim khỏe mạnh, theo dõi huyết áp & tim đồ', 'heart-pulse', 'tim-mach.svg', 'active'],
    [8, 'Tiêu hóa', 'tieu-hoa', 'Hệ tiêu hóa khỏe, điều trị dạ dày đại tràng', 'stomach', 'tieu-hoa.svg', 'active']
  ];
  for (const s of specialties) insertSpecialty.run(...s);

  // 2. Services
  const insertService = db.prepare(`
    INSERT INTO services (id, specialty_id, name, description, price, duration_minutes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const services = [
    [1, 1, 'Khám Nội tổng quát định kỳ', 'Kiểm tra tổng quát các cơ quan, huyết áp, nhịp tim và tư vấn lối sống', 200000, 30, 'active'],
    [2, 1, 'Gói khám tầm soát sức khỏe tổng quát VIP', 'Khám lâm sàng toàn diện kèm định hướng xét nghiệm chuyên sâu', 500000, 45, 'active'],
    [3, 2, 'Khám Nhi tổng quát & Dinh dưỡng', 'Đánh giá tăng trưởng chiều cao, cân nặng và bệnh lý hô hấp tiêu hóa', 250000, 30, 'active'],
    [4, 3, 'Khám Sản phụ khoa & Tư vấn thai kỳ', 'Khám phụ khoa định kỳ, tư vấn tiền sản và chăm sóc mẹ bầu', 300000, 30, 'active'],
    [5, 4, 'Khám Da liễu & Soi da công nghệ cao', 'Chẩn đoán viêm da, dị ứng, mụn trứng cá và điều trị sắc tố', 250000, 30, 'active'],
    [6, 5, 'Khám Tai Mũi Họng nội soi kỹ thuật số', 'Nội soi tầm soát viêm xoang, viêm họng, amidan, polyp', 280000, 30, 'active'],
    [7, 6, 'Khám Cơ Xương Khớp & Tư vấn thoái hóa', 'Kiểm tra thoái hóa khớp, cột sống, đau thần kinh tọa', 300000, 30, 'active'],
    [8, 7, 'Khám Tim mạch chuyên sâu & Đo điện tim', 'Tầm soát xơ vữa, tăng huyết áp, rối loạn nhịp tim', 350000, 30, 'active'],
    [9, 8, 'Khám Tiêu hóa & Tư vấn nội soi', 'Chẩn đoán trào ngược dạ dày, viêm loét HP, đại tràng co thắt', 250000, 30, 'active']
  ];
  for (const s of services) insertService.run(...s);

  // 3. Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, role, name, email, password_hash, phone, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const users = [
    [1, 'admin', 'Quản trị viên Hệ thống', 'admin@medibook.local', passwordHash, '0901000001', 'avatar-admin.svg', 'active'],
    [2, 'receptionist', 'Lễ tân Hoàng Thị Mai', 'receptionist@medibook.local', passwordHash, '0902000002', 'avatar-receptionist.svg', 'active'],
    [3, 'doctor', 'BS. CKII. Nguyễn Minh Đức', 'doctor@medibook.local', passwordHash, '0903000003', 'avatar-doctor1.svg', 'active'],
    [4, 'patient', 'Bệnh nhân Trần Văn Nam', 'patient@medibook.local', passwordHash, '0904000004', 'avatar-patient1.svg', 'active'],
    [5, 'doctor', 'ThS. BS. Trần Thị Mai', 'bs.mai@medibook.local', passwordHash, '0903000005', 'avatar-doctor2.svg', 'active'],
    [6, 'doctor', 'BS. CKI. Lê Quang Huy', 'bs.huy@medibook.local', passwordHash, '0903000006', 'avatar-doctor3.svg', 'active'],
    [7, 'doctor', 'BS. Phạm Thúy An', 'bs.an@medibook.local', passwordHash, '0903000007', 'avatar-doctor4.svg', 'active'],
    [8, 'patient', 'Lê Bùi Hồng Phúc', 'hongphuc@gmail.com', passwordHash, '0905000008', 'avatar-patient2.svg', 'active']
  ];
  for (const u of users) insertUser.run(...u);

  // 4. Patients
  const insertPatient = db.prepare(`
    INSERT INTO patients (id, user_id, dob, gender, blood_group, address, emergency_contact, health_insurance_no, medical_history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const patients = [
    [1, 4, '1995-05-15', 'male', 'O+', 'Quận 1, TP. Hồ Chí Minh', 'Nguyễn Thị Hoa (Vợ) - 0912333444', 'DN4791234567890', 'Tiền sử dị ứng nhẹ với Penicillin, không có bệnh nền tim mạch.'],
    [2, 8, '2000-08-20', 'female', 'A+', 'Quận 3, TP. Hồ Chí Minh', 'Lê Văn An (Bố) - 0988777666', 'DN4799876543210', 'Không có tiền sử bệnh lý mạn tính.']
  ];
  for (const p of patients) insertPatient.run(...p);

  // 5. Doctors
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (id, user_id, title, bio, experience_years, consultation_fee, rating, rating_count, room_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const doctors = [
    [1, 3, 'BS. CKII', 'Chuyên gia đầu ngành Nội khoa với hơn 10 năm kinh nghiệm công tác tại các bệnh viện lớn.', 10, 200000, 4.90, 320, 'P.101'],
    [2, 5, 'ThS. BS', 'Tận tâm chu đáo, chuyên gia sản phụ khoa và chăm sóc sức khỏe toàn diện cho trẻ em.', 8, 250000, 4.80, 276, 'P.102'],
    [3, 6, 'BS. CKI', 'Bác sĩ Tim mạch giàu kinh nghiệm, điều trị thành công hàng ngàn ca tăng huyết áp & mạch vành.', 12, 300000, 4.85, 189, 'P.103'],
    [4, 7, 'BS', 'Bác sĩ Nhi khoa thân thiện, khéo léo giúp các bé thoải mái trong suốt quá trình thăm khám.', 6, 200000, 4.80, 365, 'P.104']
  ];
  for (const d of doctors) insertDoctor.run(...d);

  // 6. Receptionists
  const insertReceptionist = db.prepare(`
    INSERT INTO receptionists (id, user_id, staff_code, department, shift_default)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertReceptionist.run(1, 2, 'LT-001', 'Bộ phận Tiếp đón & Thu ngân', 'Ca Sáng (07:30 - 16:30)');

  // 7. Doctor Specialties
  const insertDocSpec = db.prepare(`
    INSERT INTO doctor_specialties (id, doctor_id, specialty_id, is_primary)
    VALUES (?, ?, ?, ?)
  `);
  insertDocSpec.run(1, 1, 1, 1);
  insertDocSpec.run(2, 2, 2, 0);
  insertDocSpec.run(3, 2, 3, 1);
  insertDocSpec.run(4, 3, 7, 1);
  insertDocSpec.run(5, 4, 2, 1);

  // 8. Schedules
  const insertSched = db.prepare(`
    INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration, max_patients, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const schedules = [
    [1, 1, 1, '08:00:00', '17:00:00', 30, 16, 'active'],
    [2, 1, 2, '08:00:00', '17:00:00', 30, 16, 'active'],
    [3, 1, 3, '08:00:00', '17:00:00', 30, 16, 'active'],
    [4, 1, 4, '08:00:00', '17:00:00', 30, 16, 'active'],
    [5, 1, 5, '08:00:00', '17:00:00', 30, 16, 'active'],
    [6, 2, 1, '08:00:00', '16:30:00', 30, 15, 'active'],
    [7, 2, 2, '08:00:00', '16:30:00', 30, 15, 'active'],
    [8, 2, 3, '08:00:00', '16:30:00', 30, 15, 'active'],
    [9, 2, 5, '08:00:00', '16:30:00', 30, 15, 'active'],
    [10, 3, 1, '08:30:00', '17:30:00', 30, 14, 'active'],
    [11, 3, 3, '08:30:00', '17:30:00', 30, 14, 'active'],
    [12, 3, 5, '08:30:00', '17:30:00', 30, 14, 'active'],
    [13, 3, 6, '08:30:00', '12:00:00', 30, 7, 'active'],
    [14, 4, 2, '08:00:00', '17:00:00', 30, 16, 'active'],
    [15, 4, 3, '08:00:00', '17:00:00', 30, 16, 'active'],
    [16, 4, 4, '08:00:00', '17:00:00', 30, 16, 'active'],
    [17, 4, 5, '08:00:00', '17:00:00', 30, 16, 'active'],
    [18, 4, 6, '08:00:00', '17:00:00', 30, 16, 'active']
  ];
  for (const sc of schedules) insertSched.run(...sc);

  // 9. Medicines
  const insertMed = db.prepare(`
    INSERT INTO medicines (id, code, name, category, unit, unit_price, stock_quantity, usage_instruction, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const meds = [
    [1, 'MED-001', 'Paracetamol 500mg', 'Giảm đau, hạ sốt', 'Viên', 2000, 1500, 'Uống sau bữa ăn, cách 4-6 giờ nếu sốt', 'active'],
    [2, 'MED-002', 'Amoxicillin 500mg', 'Kháng sinh đường hô hấp', 'Viên', 3500, 800, 'Uống sáng 1 viên, chiều 1 viên sau ăn', 'active'],
    [3, 'MED-003', 'Cetirizine 10mg', 'Kháng histamin chống dị ứng', 'Viên', 4000, 600, 'Uống 1 viên vào buổi tối trước khi đi ngủ', 'active'],
    [4, 'MED-004', 'Omeprazole 20mg', 'Ức chế tiết acid dạ dày', 'Viên', 5000, 900, 'Uống 1 viên trước bữa ăn sáng 30 phút', 'active'],
    [5, 'MED-005', 'Amlodipine 5mg', 'Hạ huyết áp', 'Viên', 4500, 700, 'Uống 1 viên vào buổi sáng mỗi ngày', 'active'],
    [6, 'MED-006', 'Vitamin C 500mg', 'Tăng cường sức đề kháng', 'Viên sủi', 3000, 1200, 'Hòa tan vào 200ml nước, uống sau bữa ăn sáng', 'active'],
    [7, 'MED-007', 'Men vi sinh Enterogermina', 'Hỗ trợ tiêu hóa', 'Ống', 12000, 500, 'Uống 1-2 ống/ngày sau ăn', 'active'],
    [8, 'MED-008', 'Siro ho Prospan 100ml', 'Thuốc ho thảo dược', 'Chai', 85000, 200, 'Uống 5ml/lần, 3 lần/ngày', 'active']
  ];
  for (const m of meds) insertMed.run(...m);

  // 10. Appointments
  const insertAppt = db.prepare(`
    INSERT INTO appointments (id, booking_code, patient_id, doctor_id, specialty_id, service_id, appointment_date, start_time, end_time, status, symptoms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const appts = [
    [1, 'MB250425-0012', 1, 1, 1, 1, '2026-09-25', '09:00:00', '09:30:00', 'confirmed', 'Khám sức khỏe tổng quát định kỳ, kiểm tra huyết áp.'],
    [2, 'MB250424-0005', 1, 1, 1, 1, '2026-09-20', '08:30:00', '09:00:00', 'completed', 'Người mệt mỏi, đau đầu nhẹ và nghẹt mũi 2 ngày nay.'],
    [3, 'MB250425-0015', 2, 3, 7, 8, '2026-09-25', '10:00:00', '10:30:00', 'confirmed', 'Đo điện tim và kiểm tra hồi hộp tim đập nhanh.']
  ];
  for (const a of appts) insertAppt.run(...a);

  // 11. Queues
  const insertQueue = db.prepare(`
    INSERT INTO examination_queues (id, appointment_id, queue_number, room, status, checkin_time, finish_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertQueue.run(1, 2, 'A-01', 'P.101', 'completed', '2026-09-20 08:15:00', '2026-09-20 08:55:00');

  // 12. Medical Record
  const insertRec = db.prepare(`
    INSERT INTO medical_records (id, appointment_id, patient_id, doctor_id, anamnesis, vital_signs, clinical_diagnosis, icd10_code, doctor_notes, re_examination_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRec.run(
    1, 2, 1, 1,
    'Bệnh nhân mệt mỏi, ho húng hắng, hắt hơi và sốt nhẹ (37.8°C). Không khó thở.',
    JSON.stringify({ blood_pressure: '120/80', heart_rate: 78, temperature: 37.8, weight: 65, height: 170, bmi: 22.49 }),
    'Viêm đường hô hấp trên cấp tính do siêu vi (Cảm cúm thông thường)',
    'J06.9',
    'Nghỉ ngơi, uống nhiều nước ấm, tránh gió lạnh, dùng thuốc đúng theo đơn.',
    '2026-09-27'
  );

  // 13. Prescriptions
  const insertPres = db.prepare(`
    INSERT INTO prescriptions (id, medical_record_id, appointment_id, doctor_id, patient_id, total_amount, usage_instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertPres.run(1, 1, 2, 1, 1, 86000, 'Dùng thuốc đều đặn sau bữa ăn trong vòng 5 ngày. Nếu sốt cao trở lại cần quay lại tái khám.');

  // 14. Prescription items
  const insertItem = db.prepare(`
    INSERT INTO prescription_items (id, prescription_id, medicine_id, medicine_name, dosage, unit, quantity, morning, noon, afternoon, night, instructions, unit_price, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const items = [
    [1, 1, 1, 'Paracetamol 500mg', '500mg', 'Viên', 10, '1', '0', '1', '0', 'Uống sau ăn khi đau đầu hoặc sốt', 2000, 20000],
    [2, 1, 3, 'Cetirizine 10mg', '10mg', 'Viên', 5, '0', '0', '0', '1', 'Uống 1 viên trước khi ngủ', 4000, 20000],
    [3, 1, 6, 'Vitamin C 500mg', '500mg', 'Viên sủi', 10, '1', '0', '0', '0', 'Hòa tan nước uống buổi sáng', 3000, 30000],
    [4, 1, 4, 'Omeprazole 20mg', '20mg', 'Viên', 5, '1', '0', '0', '0', 'Uống trước bữa ăn sáng', 3200, 16000]
  ];
  for (const it of items) insertItem.run(...it);

  // 15. Payments
  const insertPay = db.prepare(`
    INSERT INTO payments (id, appointment_id, invoice_code, service_fee, medicine_fee, total_amount, discount, final_amount, payment_method, payment_status, paid_at, cashier_user_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPay.run(1, 2, 'HD250424-0001', 200000, 86000, 286000, 0, 286000, 'cash', 'paid', '2026-09-20 09:10:00', 2, 'Thanh toán tiền mặt đầy đủ tại quầy thu ngân.');

  // 16. Reviews
  const insertRev = db.prepare(`
    INSERT INTO reviews (id, appointment_id, patient_id, doctor_id, rating, comment, is_anonymous)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertRev.run(1, 2, 1, 1, 5, 'Bác sĩ Đức tư vấn rất nhẹ nhàng, tận tình, giải thích cặn kẽ đơn thuốc và tình trạng sức khỏe. Phòng khám rất sạch sẽ và hiện đại!', 0);

  // 17. Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertNotif.run(1, 4, 'Lịch hẹn đã được xác nhận', 'Lịch hẹn mã MB250425-0012 khám Nội tổng quát với BS. Nguyễn Minh Đức vào lúc 09:00 ngày 25/09/2026 đã được xác nhận.', 'appointment', 1, '/appointments/MB250425-0012');
  insertNotif.run(2, 3, 'Có lịch hẹn mới', 'Bệnh nhân Trần Văn Nam đã đặt lịch khám vào lúc 09:00 ngày 25/09/2026.', 'doctor_appointment', 0, '/doctor/queue');

  // 18. Activity logs
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertLog.run(1, 1, 'SYSTEM_INIT', 'System', 1, '127.0.0.1', 'Node.js', 'Khởi tạo dữ liệu SQLite thành công cho Node.js');
}

initDb();

module.exports = db;
