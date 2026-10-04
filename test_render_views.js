const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

// Mock helper functions
const mockHelpers = {
  formatDate: (d) => '28/09/2026',
  formatCurrency: (n) => (n || 0).toLocaleString('vi-VN') + ' ₫',
  getStatusBadge: (s) => `<span class="badge">${s}</span>`,
  getPriorityBadge: (s) => `<span class="badge">${s}</span>`,
  getRoleBadge: (s) => `<span class="badge">${s}</span>`,
  getVisitTypeBadge: (s) => `<span class="badge">${s}</span>`,
  getTreatmentTypeBadge: (s) => `<span class="badge">${s}</span>`,
  formatDateTime: (d) => '28/09/2026 08:00',
  currentUser: { id: 1, name: 'Bác sĩ Minh', email: 'doctor@medibook.local', role: 'doctor', phone: '0901234567' },
  currentPath: '/',
  flashSuccess: null,
  flashError: null,
  flashInfo: null,
  pageTitle: 'Test Page',
  body: '<div>Content Mock</div>',
  today: '2026-09-28',
  siteSettings: { clinicName: 'MediBook', address: '', hotline: '', email: '', supportHours: '', bankCode: '', bankAccount: '', bankAccountName: '' }
};

const mockData = {
  // Common
  specialties: [{ id: 1, name: 'Nội tổng quát', slug: 'noi-tong-quat', description: 'Khám nội', doctor_count: 2 }],
  specialty: { id: 1, name: 'Nội tổng quát', slug: 'noi-tong-quat', description: 'Khám nội' },
  doctors: [{ id: 1, name: 'BS Nguyễn Văn Đức', room_number: 'P.101', specialty_names: 'Nội tổng quát', rating: 4.8, rating_count: 12, consultation_fee: 200000, experience_years: 10, bio: 'Kinh nghiệm', title: 'BS.CKI' }],
  doctor: { id: 1, name: 'BS Nguyễn Văn Đức', room_number: 'P.101', specialty_names: 'Nội tổng quát', rating: 4.8, rating_count: 12, consultation_fee: 200000, experience_years: 10, bio: 'Kinh nghiệm', title: 'BS.CKI' },
  selectedSpecialtyId: 1,
  selectedDoctorId: 1,
  selectedDate: '2026-09-28',
  patient: { phone: '0901234567', dob: '1990-01-01', gender: 'male', blood_group: 'O', health_insurance_no: 'DN123', address: 'TP.HCM', emergency_contact: 'Mẹ - 090', medical_history: 'Không' },
  user: { id: 1, name: 'Bác sĩ Minh', email: 'doctor@medibook.local', role: 'doctor', phone: '0901234567' },
  users: [{ id: 1, name: 'User 1', email: 'u1@test.com', phone: '090', role: 'admin', is_active: 1, created_at: '2026-09-01' }],
  services: [{ id: 1, name: 'Khám tổng quát', duration_minutes: 30, price: 200000, status: 'active', specialty_id: 1, description: 'Mô tả' }],
  service: { id: 1, name: 'Khám tổng quát', duration_minutes: 30, price: 200000, status: 'active', specialty_id: 1, description: 'Mô tả' },
  medicines: [{ id: 1, name: 'Paracetamol', unit: 'Viên', stock_quantity: 100, price: 2000, dosage: '500mg' }],
  medicine: { id: 1, name: 'Paracetamol', unit: 'Viên', stock_quantity: 100, price: 2000, dosage: '500mg' },
  app: { id: 1, booking_code: 'MB260928001', patient_name: 'Trần Văn A', patient_phone: '0901234567', doctor_name: 'BS Đức', doctor_title: 'BS.CKI', specialty_name: 'Nội tổng quát', appointment_date: '2026-09-28', start_time: '08:00', end_time: '08:30', room_number: 'P.101', status: 'confirmed', service_name: 'Khám nội', queue_number: 'A01', patient_gender: 'male', patient_dob: '1990-01-01', health_insurance_no: 'DN123', patient_address: 'TP.HCM', medical_history: 'None', symptoms: 'Sốt nhẹ', clinical_diagnosis: 'Cảm cúm' },
  appointment: { id: 1, booking_code: 'MB260928001', patient_name: 'Trần Văn A', patient_phone: '0901234567', doctor_name: 'BS Đức', doctor_title: 'BS.CKI', specialty_name: 'Nội tổng quát', appointment_date: '2026-09-28', start_time: '08:00', end_time: '08:30', room_number: 'P.101', status: 'confirmed', service_name: 'Khám nội', queue_number: 'A01', clinical_diagnosis: 'Cảm cúm' },
  appointments: [{ id: 1, booking_code: 'MB260928001', patient_name: 'Trần Văn A', patient_phone: '0901234567', doctor_name: 'BS Đức', specialty_name: 'Nội tổng quát', appointment_date: '2026-09-28', start_time: '08:00', end_time: '08:30', room_number: 'P.101', status: 'confirmed', queue_number: 'A01', service_name: 'Khám nội' }],
  todayAppointments: [{ id: 1, booking_code: 'MB260928001', patient_name: 'Trần Văn A', patient_phone: '0901234567', doctor_name: 'BS Đức', room_number: 'P.101', start_time: '08:00:00', status: 'confirmed' }],
  recentBookings: [{ booking_code: 'MB001', patient_name: 'A', doctor_name: 'B', appointment_date: '2026-09-28', start_time: '08:00', status: 'confirmed' }],
  todayQueue: [{ id: 1, appointment_id: 1, queue_number: 'A01', booking_code: 'MB001', patient_name: 'A', start_time: '08:00', symptoms: 'Sốt', status: 'waiting' }],
  queueList: [{ id: 1, appointment_id: 1, queue_number: 'A01', booking_code: 'MB001', patient_name: 'A', patient_phone: '090', patient_gender: 'male', patient_dob: '1990-01-01', start_time: '08:00', symptoms: 'Sốt', status: 'waiting' }],
  queueItems: [{ room: 'P.101', status: 'waiting', queue_number: 'A01', patient_name: 'A' }],
  rooms: ['P.101'],
  payment: { id: 1, invoice_code: 'HD001', payment_method: 'cash', service_fee: 200000, medicine_fee: 50000, total_amount: 250000, discount: 0, final_amount: 250000, payment_status: 'paid', cashier_name: 'Lễ tân' },
  payments: [{ id: 1, invoice_code: 'HD001', booking_code: 'MB001', patient_name: 'A', patient_phone: '090', doctor_name: 'BS Đức', service_fee: 200000, medicine_fee: 50000, final_amount: 250000, payment_status: 'paid' }],
  schedules: [{ day_of_week: 1, start_time: '08:00', end_time: '17:00', slot_duration: 30, max_patients: 16 }],
  leaves: [{ start_date: '2026-10-01', reason: 'Nghỉ phép', status: 'approved' }],
  reviews: [{ reviewer_name: 'Nguyễn Văn B', rating: 5, comment: 'Bác sĩ rất nhiệt tình', created_at: '2026-09-20' }],
  review: null,
  prescription: { id: 1, total_amount: 50000, usage_instructions: 'Uống sau ăn', items: [{ medicine_name: 'Panadol', dosage: '500mg', quantity: 10, unit: 'Viên', morning: 1, noon: 0, afternoon: 1, night: 0, instructions: 'Uống sau ăn', unit_price: 2000, amount: 20000 }] },
  currentRecord: { vital_signs: JSON.stringify({ weight: 65, height: 170, bmi: 22.5, bp: '120/80', temp: 36.5, heart_rate: 75 }), clinical_diagnosis: 'Viêm họng cấp', treatment_plan: 'Uống thuốc 5 ngày' },
  currentPrescription: { total_amount: 50000, usage_instructions: 'Uống sau ăn', items: [{ medicine_name: 'Panadol', dosage: '500mg', quantity: 10, unit: 'Viên', morning: 1, noon: 0, afternoon: 1, night: 0, instructions: 'Uống sau ăn', unit_price: 2000, amount: 20000 }] },
  pastAppointments: [],
  logs: [{ id: 1, action: 'LOGIN', user_name: 'Admin', ip_address: '127.0.0.1', created_at: '2026-09-28' }],
  stats: { today_revenue: 1000000, month_revenue: 25000000 },
  revenueStats: { total_revenue: 50000000 },
  totalAppointments: 150,
  totalPatients: 120,
  totalDoctors: 8,
  totalToday: 10,
  totalBeds: 0,
  occupiedBeds: 0,
  availableBeds: 0,
  cleaningBeds: 0,
  allSpecialties: [{ id: 1, name: 'Nội tổng quát' }],
  requests: [],
  selectedSpecialtyIds: [1],
  monthlyRevenue: [],
  upcomingAppointment: null,
  article: { category: 'benh', category_name: 'Bệnh', slug: 'benh', title: 'Bài viết', summary: 'Tóm tắt', content: 'Nội dung', author_name: 'Bác sĩ', author_role: 'Bác sĩ', created_at: '2026-09-28' },
  selectedCategory: '',
  message: 'Lỗi thử nghiệm',
  history: [],
  bySpecialty: [],
  relatedArticles: [],
  searchQuery: '',
  prevCompletedVisit: null,
  availableCount: 0,
  occupiedCount: 0,
  occupancyRate: 0,
  cleaningCount: 0,
  maintenanceCount: 0,
  selectedRoomId: '',
  selectedStatus: '',
  roomsWithBeds: [],
  articles: [],
  pastRecords: [],
  waitingCount: 3,
  completedToday: 5,
  completedCount: 5,
  articleCategories: [{ category: 'benh', category_name: 'Bệnh' }],
  ratingSummary: { count: 0, average: null },
  checkedInCount: 2,
  todayRevenue: 2000000,
  statusCounts: { pending: 2, confirmed: 5, checked_in: 3, in_consultation: 1, completed: 10, cancelled: 1 },
  // Filters / variables
  keyword: '',
  role: '',
  doctorId: '',
  status: '',
  date: ''
};

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ejs')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const allEjs = getAllFiles(viewsDir);
console.log(`Found ${allEjs.length} EJS files. Starting dry-run rendering...`);

let failed = 0;
(async () => {
for (const file of allEjs) {
  try {
    const combinedData = { ...mockHelpers, ...mockData };
    await ejs.renderFile(file, combinedData, { root: viewsDir });
    console.log(`[PASS] ${path.relative(viewsDir, file)}`);
  } catch (err) {
    console.error(`[FAIL] ${path.relative(viewsDir, file)}: ${err.message}`);
    failed++;
  }
}

console.log(`\nRender dry-run completed: ${allEjs.length - failed} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
})();
