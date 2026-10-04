type BookingInput = {
  doctorId: unknown;
  specialtyId?: unknown;
  serviceId?: unknown;
  date: unknown;
  startTime: unknown;
};

export type ValidatedBooking = {
  doctorId: number;
  specialtyId: number | null;
  serviceId: number | null;
  date: string;
  startTime: string;
  endTime: string;
  scheduleId: number;
};

export class BookingRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingRuleError';
  }
}

export function businessNow(now = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '00';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}:${value('second')}`
  };
}

function positiveId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function minutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function clock(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}:00`;
}

/** The same server-side rules are used by online and walk-in reservations. */
export function validateBooking(db: any, input: BookingInput): ValidatedBooking {
  const doctorId = positiveId(input.doctorId);
  const specialtyId = positiveId(input.specialtyId);
  const serviceId = positiveId(input.serviceId);
  const date = String(input.date || '');
  const rawTime = String(input.startTime || '');
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(rawTime);
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!doctorId || !dateMatch || !timeMatch || timeMatch[3] && timeMatch[3] !== '00') {
    throw new BookingRuleError('Vui lòng chọn bác sĩ, ngày và giờ khám hợp lệ.');
  }
  if (input.specialtyId && !specialtyId || input.serviceId && !serviceId) {
    throw new BookingRuleError('Chuyên khoa hoặc dịch vụ không hợp lệ.');
  }
  const day = new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])));
  if (day.toISOString().slice(0, 10) !== date) {
    throw new BookingRuleError('Ngày khám không hợp lệ.');
  }
  const startTime = `${timeMatch[1]}:${timeMatch[2]}:00`;
  const now = businessNow();
  if (date < now.date || date === now.date && startTime <= now.time) {
    throw new BookingRuleError('Không thể đặt lịch khám vào thời gian trong quá khứ.');
  }

  const doctor = db.prepare(`
    SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id
    JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'doctor'
    WHERE d.id = ? AND u.status = 'active'
  `).get(doctorId);
  if (!doctor) throw new BookingRuleError('Bác sĩ không còn nhận lịch khám.');

  if (specialtyId) {
    const specialty = db.prepare(`
      SELECT s.id FROM specialties s
      JOIN doctor_specialties ds ON ds.specialty_id = s.id
      WHERE s.id = ? AND ds.doctor_id = ? AND s.status = 'active'
    `).get(specialtyId, doctorId);
    if (!specialty) throw new BookingRuleError('Bác sĩ không thuộc chuyên khoa đã chọn.');
  }
  if (serviceId) {
    const service = db.prepare(`
      SELECT s.id FROM services s WHERE s.id = ? AND s.status = 'active'
        AND (? IS NULL OR s.specialty_id = ?)
        AND (s.specialty_id IS NULL OR EXISTS (
          SELECT 1 FROM doctor_specialties ds WHERE ds.doctor_id = ? AND ds.specialty_id = s.specialty_id
        ))
    `).get(serviceId, specialtyId, specialtyId, doctorId);
    if (!service) throw new BookingRuleError('Dịch vụ không còn phù hợp để đặt khám.');
  }

  const leave = db.prepare(`
    SELECT id FROM doctor_leaves WHERE doctor_id = ? AND status = 'approved'
      AND ? BETWEEN start_date AND end_date
  `).get(doctorId, date);
  if (leave) throw new BookingRuleError('Bác sĩ nghỉ phép vào ngày này. Vui lòng chọn ngày khác.');

  const schedules = db.prepare(`
    SELECT id, start_time, end_time, slot_duration, max_patients
    FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ? AND status = 'active'
  `).all(doctorId, day.getUTCDay()) as any[];
  const startMinute = minutes(startTime);
  const schedule = schedules.find(row => {
    const duration = Number(row.slot_duration);
    const shiftStart = minutes(row.start_time);
    const shiftEnd = minutes(row.end_time);
    return Number.isSafeInteger(duration) && duration > 0
      && startMinute >= shiftStart && startMinute + duration <= shiftEnd
      && (startMinute - shiftStart) % duration === 0;
  });
  if (!schedule) throw new BookingRuleError('Khung giờ không thuộc ca trực của bác sĩ.');
  const endTime = clock(startMinute + Number(schedule.slot_duration));
  const activeCount = db.prepare(`
    SELECT count(*) AS n FROM appointments WHERE doctor_id = ? AND appointment_date = ?
      AND start_time >= ? AND start_time < ? AND status NOT IN ('cancelled', 'no_show')
  `).get(doctorId, date, schedule.start_time, schedule.end_time).n as number;
  if (activeCount >= Number(schedule.max_patients)) {
    throw new BookingRuleError('Ca trực đã đủ số bệnh nhân. Vui lòng chọn ca khác.');
  }
  const overlap = db.prepare(`
    SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ?
      AND status NOT IN ('cancelled', 'no_show') AND start_time < ? AND end_time > ?
    LIMIT 1
  `).get(doctorId, date, endTime, startTime);
  if (overlap) throw new BookingRuleError('Khung giờ này vừa có người khác đặt trước. Vui lòng chọn khung giờ khác.');

  return { doctorId, specialtyId, serviceId, date, startTime, endTime, scheduleId: schedule.id };
}
