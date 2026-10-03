import bcrypt from 'bcryptjs';
import seedData from './seed-data.json';

/**
 * Seed dữ liệu DEMO cho cơ sở dữ liệu SQLite trống (chỉ chạy khi KHÔNG phải production).
 * Dữ liệu tham chiếu (chuyên khoa, bác sĩ, dịch vụ, thuốc, tài khoản demo...) nằm trong seed-data.json.
 * Tất cả tài khoản demo dùng chung mật khẩu "password" — CHỈ dành cho môi trường phát triển.
 */
const SEED_ORDER = [
  'specialties',
  'users',
  'user_roles',
  'patients',
  'doctors',
  'doctor_specialties',
  'receptionists',
  'services',
  'medicines',
  'doctor_leaves'
] as const;

export const DEMO_PASSWORD = 'password';

export function seedDemoData(db: any): void {
  const data = seedData as Record<string, Record<string, unknown>[]>;
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const run = db.transaction(() => {
    for (const table of SEED_ORDER) {
      const rows = data[table] || [];
      for (const row of rows) {
        const record: Record<string, unknown> = { ...row };
        if (table === 'users') record.password_hash = passwordHash;
        const cols = Object.keys(record);
        const sql = `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
        db.prepare(sql).run(...cols.map(c => record[c]));
      }
    }
  });
  run();
}

/**
 * Production: không bao giờ seed tài khoản mật khẩu yếu.
 * Nếu DB trống và có ADMIN_INITIAL_PASSWORD (>= 8 ký tự) thì tạo đúng 1 tài khoản quản trị ban đầu.
 * Trả về true nếu đã tạo tài khoản.
 */
export function createInitialAdmin(db: any, email: string, password: string): boolean {
  if (!password || password.length < 8) return false;
  const hash = bcrypt.hashSync(password, 10);
  const create = db.transaction(() => {
    const res = db
      .prepare(`INSERT INTO users (role, name, email, password_hash, status) VALUES ('admin', 'Quản trị viên', ?, ?, 'active')`)
      .run(email, hash);
    db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'admin')`).run(res.lastInsertRowid);
  });
  create();
  return true;
}
