/** Render a bilingual ERD and a complete field/relationship guide from the live SQLite DDL. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const tempDb = path.join(os.tmpdir(), `medibook-render-${process.pid}-${crypto.randomBytes(5).toString('hex')}.sqlite`);
process.env.DATABASE_PATH = tempDb;
process.env.NODE_ENV = 'production';

const domains = [
  { name: 'Tài khoản & liên hệ', color: '#1d4ed8', pale: '#eff6ff', tables: ['users', 'roles', 'user_roles', 'patients', 'doctors', 'receptionists', 'notifications', 'activity_logs', 'contact_requests'] },
  { name: 'Danh mục & lịch làm việc', color: '#0f766e', pale: '#ecfdf5', tables: ['specialties', 'doctor_specialties', 'services', 'doctor_schedules', 'doctor_leaves', 'favorite_doctors', 'medicines', 'articles'] },
  { name: 'Đặt lịch & khám bệnh', color: '#b45309', pale: '#fffbeb', tables: ['appointments', 'appointment_status_history', 'examination_queues', 'medical_records', 'reviews'] },
  { name: 'Đơn thuốc, tiền & nội trú', color: '#7c3aed', pale: '#f5f3ff', tables: ['prescriptions', 'prescription_items', 'payments', 'rooms', 'beds'] }
];

const purposes = {
  activity_logs: 'Nhật ký thao tác để truy vết người dùng và đối tượng bị thay đổi.',
  appointment_status_history: 'Lịch sử mỗi lần lịch hẹn đổi trạng thái.',
  appointments: 'Một lần đặt khám của một bệnh nhân với một bác sĩ.',
  articles: 'Bài viết/cẩm nang y tế hiển thị công khai khi được bật.',
  beds: 'Giường thuộc phòng nội trú và tình trạng sử dụng hiện tại.',
  contact_requests: 'Yêu cầu liên hệ do khách hoặc tài khoản gửi.',
  doctor_leaves: 'Khoảng thời gian bác sĩ xin nghỉ hoặc được duyệt nghỉ.',
  doctor_schedules: 'Ca làm việc lặp theo thứ trong tuần của bác sĩ.',
  doctor_specialties: 'Bảng nối bác sĩ với chuyên khoa mà bác sĩ phụ trách.',
  doctors: 'Thông tin nghề nghiệp và biểu phí của một tài khoản bác sĩ.',
  examination_queues: 'Một số thứ tự tiếp đón ứng với một lịch hẹn.',
  favorite_doctors: 'Danh sách bác sĩ được bệnh nhân lưu yêu thích.',
  medical_records: 'Bệnh án tạo từ một lịch hẹn đã khám.',
  medicines: 'Danh mục thuốc và số lượng tồn kho.',
  notifications: 'Thông báo trong ứng dụng cho tài khoản.',
  patients: 'Thông tin y tế của tài khoản có vai trò bệnh nhân.',
  payments: 'Hóa đơn và trạng thái thanh toán của lịch hẹn.',
  prescription_items: 'Từng dòng thuốc, liều và giá đã chốt trong đơn.',
  prescriptions: 'Đầu đơn thuốc thuộc một bệnh án.',
  receptionists: 'Hồ sơ nhân viên lễ tân của một tài khoản.',
  reviews: 'Đánh giá sau khám do bệnh nhân gửi cho bác sĩ.',
  roles: 'Danh mục mã vai trò dùng để giải thích quyền trong hệ thống.',
  rooms: 'Phòng nội trú chứa các giường.',
  services: 'Dịch vụ khám và giá gắn với chuyên khoa.',
  specialties: 'Danh mục chuyên khoa khám.',
  user_roles: 'Những vai trò được cấp cho tài khoản; một tài khoản có nhiều dòng.',
  users: 'Tài khoản đăng nhập và thông tin định danh chung.'
};

const common = {
  name: 'Tên hiển thị của bản ghi', email: 'Địa chỉ email', phone: 'Số điện thoại',
  status: 'Trạng thái hoạt động hoặc xử lý', description: 'Nội dung mô tả',
  created_at: 'Thời điểm tạo bản ghi', updated_at: 'Thời điểm cập nhật gần nhất',
  user_id: 'Mã tài khoản users.id', patient_id: 'Mã hồ sơ bệnh nhân patients.id',
  doctor_id: 'Mã hồ sơ bác sĩ doctors.id', appointment_id: 'Mã lịch hẹn appointments.id',
  specialty_id: 'Mã chuyên khoa specialties.id', service_id: 'Mã dịch vụ services.id',
  medical_record_id: 'Mã bệnh án medical_records.id', medicine_id: 'Mã thuốc medicines.id',
  room_id: 'Mã phòng nội trú rooms.id', prescription_id: 'Mã đơn thuốc prescriptions.id',
  start_date: 'Ngày bắt đầu', end_date: 'Ngày kết thúc',
  start_time: 'Giờ bắt đầu', end_time: 'Giờ kết thúc',
  code: 'Mã nghiệp vụ', category: 'Nhóm hoặc loại', title: 'Tiêu đề hoặc chức danh',
  notes: 'Ghi chú', note: 'Ghi chú', rating: 'Điểm đánh giá', comment: 'Nội dung nhận xét',
  unit: 'Đơn vị tính', unit_price: 'Giá một đơn vị', quantity: 'Số lượng',
  amount: 'Thành tiền của dòng', price: 'Giá dịch vụ', total_amount: 'Tổng tiền trước giảm giá',
  is_active: 'Cờ hoạt động kiểu cũ (0/1)', is_read: 'Đã đọc thông báo hay chưa (0/1)',
  ip_address: 'Địa chỉ IP gửi yêu cầu', user_agent: 'Thông tin trình duyệt/thiết bị',
  details: 'Chi tiết thao tác', reason: 'Lý do', icon: 'Tên biểu tượng hiển thị',
  image: 'Đường dẫn ảnh hiển thị'
};

const meanings = {
  activity_logs: { action: 'Mã hành động được ghi lại', entity_type: 'Loại đối tượng bị tác động', entity_id: 'Mã đối tượng bị tác động; không có FK chung' },
  appointment_status_history: { old_status: 'Trạng thái lịch hẹn trước thay đổi', new_status: 'Trạng thái sau thay đổi', changed_by_user_id: 'Tài khoản thực hiện đổi trạng thái' },
  appointments: {
    booking_code: 'Mã đặt khám duy nhất gửi bệnh nhân', appointment_date: 'Ngày đến khám',
    status: 'Trạng thái lịch: chờ xác nhận, đã xác nhận, đã đến, đang khám, hoàn tất, hủy hoặc vắng mặt',
    symptoms: 'Triệu chứng bệnh nhân mô tả', cancellation_reason: 'Lý do hủy lịch',
    source: 'Nguồn đặt: trực tuyến hoặc tại quầy', priority_level: 'Mức ưu tiên hàng đợi',
    priority_reason: 'Lý do được ưu tiên', is_bumped: 'Có bị nhường khung giờ hay không (0/1)',
    bumped_from_slot: 'Khung giờ cũ trước khi nhường', estimated_start_time: 'Giờ khám dự kiến sau điều phối'
  },
  articles: {
    category: 'Mã nhóm bài viết', category_name: 'Tên nhóm bài viết', pill_label: 'Nhãn ngắn trên thẻ bài',
    slug: 'Đoạn URL duy nhất của bài', title: 'Tiêu đề bài viết', summary: 'Tóm tắt bài',
    content: 'Nội dung HTML của bài', author_name: 'Tên tác giả ghi trong bài; không liên kết users',
    author_role: 'Vai trò/chức danh tác giả ghi trong bài', views_count: 'Số lần xem được đếm',
    status: 'Bật hoặc ẩn bài viết; chỉ active hiển thị công khai'
  },
  beds: {
    bed_number: 'Số giường trong phòng', current_patient_id: 'Bệnh nhân đang nằm giường, nếu có',
    current_medical_record_id: 'Bệnh án gắn lần nằm giường hiện tại', current_doctor_id: 'Bác sĩ phụ trách giường hiện tại',
    admission_date: 'Ngày giờ nhận giường',
    status: 'available=trống, occupied=đang nằm, cleaning=đang dọn, maintenance=bảo trì'
  },
  contact_requests: { name: 'Tên người gửi liên hệ', subject: 'Chủ đề cần hỗ trợ', message: 'Nội dung lời nhắn' },
  doctor_schedules: {
    day_of_week: 'Thứ trong tuần: 0 Chủ nhật, 1 Thứ hai…6 Thứ bảy',
    slot_duration: 'Số phút một khung khám', max_patients: 'Số bệnh nhân tối đa của ca',
    is_active: 'Cờ hoạt động cũ; ứng dụng hiện đọc status',
    status: 'Ca đang hoạt động (active) hoặc ngừng (inactive)'
  },
  doctor_leaves: { status: 'pending=chờ duyệt, approved=đã duyệt, rejected=từ chối' },
  doctor_specialties: { is_primary: 'Chuyên khoa chính của bác sĩ (0/1)' },
  doctors: {
    title: 'Học vị/chức danh bác sĩ', bio: 'Tiểu sử và kinh nghiệm mô tả',
    experience_years: 'Số năm kinh nghiệm', consultation_fee: 'Phí khám mặc định của bác sĩ',
    rating: 'Điểm đánh giá trung bình', rating_count: 'Số lượt đánh giá', room_number: 'Mã phòng khám đang phụ trách'
  },
  examination_queues: {
    queue_number: 'Số thứ tự hiển thị khi gọi', queue_date: 'Ngày của hàng đợi', room: 'Phòng xếp hàng',
    priority_level: 'Loại ưu tiên', priority_order: 'Thứ tự ưu tiên để sắp hàng',
    is_bumped: 'Lượt có bị đẩy/nhường không (0/1)', bumped_reason: 'Lý do thay đổi thứ tự',
    checkin_time: 'Lúc đến quầy tiếp đón', called_time: 'Lúc bác sĩ gọi số', finish_time: 'Lúc kết thúc lượt',
    status: 'waiting=chờ, calling=đang gọi, in_room=đã vào phòng, completed=hoàn tất'
  },
  medical_records: {
    anamnesis: 'Bệnh sử do bác sĩ ghi', vital_signs: 'Chỉ số sinh tồn lưu dạng JSON/text',
    clinical_diagnosis: 'Chẩn đoán lâm sàng', icd10_code: 'Mã bệnh theo ICD-10 nếu có',
    doctor_notes: 'Ghi chú của bác sĩ', re_examination_date: 'Ngày hẹn tái khám',
    visit_type: 'Loại lượt: khám đầu hoặc tái khám', treatment_type: 'Ngoại trú hay nội trú',
    inpatient_room: 'Mã phòng nội trú ghi tại thời điểm khám', inpatient_bed: 'Mã giường nội trú ghi tại thời điểm khám',
    admission_date: 'Ngày nhập viện', discharge_date: 'Ngày xuất viện',
    parent_visit_id: 'Bệnh án trước mà lần tái khám nối tiếp', bed_id: 'Giường nội trú được cấp',
    treatment_plan: 'Kế hoạch điều trị'
  },
  medicines: { category: 'Nhóm thuốc', stock_quantity: 'Số lượng hiện còn trong kho', usage_instruction: 'Hướng dẫn dùng thuốc mặc định', status: 'active=được kê, inactive=ngừng dùng' },
  notifications: { title: 'Tiêu đề thông báo', message: 'Nội dung thông báo', type: 'Loại thông báo', link: 'Đường dẫn trang liên quan' },
  patients: {
    dob: 'Ngày sinh (date of birth)', gender: 'Giới tính: male=nam, female=nữ, other=khác',
    blood_group: 'Nhóm máu', address: 'Địa chỉ liên hệ', emergency_contact: 'Người liên hệ khẩn cấp',
    health_insurance_no: 'Số thẻ bảo hiểm y tế', medical_history: 'Tiền sử bệnh',
    priority_category: 'Nhóm ưu tiên tiếp đón'
  },
  payments: {
    invoice_code: 'Mã hóa đơn duy nhất', service_fee: 'Tiền công khám/dịch vụ',
    medicine_fee: 'Tiền thuốc trong đơn', discount: 'Số tiền được giảm',
    final_amount: 'Số tiền cuối cùng phải thu', payment_method: 'Cách trả: tiền mặt/chuyển khoản…',
    payment_status: 'Trạng thái chưa trả/đã trả', paid_at: 'Ngày giờ đã thanh toán',
    cashier_user_id: 'Tài khoản thu ngân ghi nhận thanh toán',
    note: 'Ghi chú tương thích dữ liệu cũ', notes: 'Ghi chú hóa đơn hiện dùng'
  },
  prescription_items: {
    medicine_name: 'Tên thuốc chốt lúc kê; giữ khi danh mục đổi', dosage: 'Hàm lượng/liều thuốc',
    morning: 'Liều buổi sáng', noon: 'Liều buổi trưa', afternoon: 'Liều buổi chiều',
    night: 'Liều buổi tối', instructions: 'Dặn dò riêng cho dòng thuốc'
  },
  prescriptions: { usage_instructions: 'Hướng dẫn dùng chung toàn đơn thuốc' },
  receptionists: { staff_code: 'Mã nhân viên lễ tân duy nhất', department: 'Bộ phận làm việc', shift_default: 'Ca làm việc mặc định mô tả bằng chữ' },
  reviews: { is_anonymous: 'Ẩn tên người đánh giá hay không (0/1)', rating: 'Điểm đánh giá từ 1 đến 5 (DB có CHECK)' },
  roles: { code: 'Mã role: admin, doctor, receptionist, patient', name: 'Tên vai trò tiếng Việt', description: 'Mô tả quyền của vai trò' },
  rooms: {
    room_number: 'Mã phòng nội trú duy nhất', room_name: 'Tên phòng nội trú',
    department_name: 'Tên khoa phụ trách', room_type: 'Loại phòng, ví dụ inpatient hoặc ICU',
    total_beds: 'Số giường thiết kế của phòng', status: 'Trạng thái hoạt động của phòng; mặc định active'
  },
  services: { duration_minutes: 'Thời lượng dịch vụ tính bằng phút', status: 'active=đang cung cấp, inactive=ngừng cung cấp' },
  specialties: { slug: 'Đoạn URL duy nhất của chuyên khoa', status: 'active=hiển thị, inactive=ẩn khỏi đặt lịch' },
  user_roles: { role: 'Vai trò thực sự được cấp cho user; một dòng/một role' },
  users: {
    role: 'Vai trò chính/giá trị tương thích cũ; quyền thực đọc user_roles',
    password_hash: 'Mật khẩu đã băm; không lưu mật khẩu gốc', avatar: 'Đường dẫn ảnh đại diện',
    status: 'active=được đăng nhập, inactive=tài khoản bị khóa'
  }
};

const why = {
  'activity_logs.user_id': 'Biết ai đã thao tác; xóa tài khoản vẫn giữ nhật ký.',
  'appointment_status_history.appointment_id': 'Mọi lần đổi trạng thái phải thuộc một lịch hẹn.',
  'appointment_status_history.changed_by_user_id': 'Ghi ai đã đổi trạng thái, có thể là tác vụ hệ thống.',
  'appointments.patient_id': 'Lịch khám phải có bệnh nhân.',
  'appointments.doctor_id': 'Lịch khám phải có bác sĩ phụ trách.',
  'appointments.specialty_id': 'Lưu chuyên khoa đã chọn, có thể bỏ liên kết khi xóa danh mục.',
  'appointments.service_id': 'Lưu dịch vụ được chọn nếu có.',
  'beds.room_id': 'Mỗi giường phải nằm trong một phòng nội trú.',
  'beds.current_patient_id': 'Chỉ ra bệnh nhân đang dùng giường; trống khi giường chưa được cấp.',
  'beds.current_medical_record_id': 'Chỉ ra bệnh án của đợt nằm giường hiện tại.',
  'beds.current_doctor_id': 'Chỉ ra bác sĩ phụ trách giường hiện tại.',
  'contact_requests.user_id': 'Gắn lời nhắn với tài khoản khi người gửi đã đăng nhập; khách thì để trống.',
  'doctor_leaves.doctor_id': 'Đơn nghỉ phép thuộc bác sĩ nào.',
  'doctor_schedules.doctor_id': 'Ca trực thuộc bác sĩ nào.',
  'doctor_specialties.doctor_id': 'Một đầu của quan hệ nhiều bác sĩ–nhiều chuyên khoa.',
  'doctor_specialties.specialty_id': 'Đầu còn lại của quan hệ nhiều bác sĩ–nhiều chuyên khoa.',
  'doctors.user_id': 'Hồ sơ nghề nghiệp chỉ thuộc một tài khoản và user_id là duy nhất.',
  'examination_queues.appointment_id': 'Một lịch hẹn có tối đa một số thứ tự tiếp đón.',
  'favorite_doctors.patient_id': 'Bệnh nhân nào đã lưu mục yêu thích.',
  'favorite_doctors.doctor_id': 'Bác sĩ nào được bệnh nhân lưu.',
  'medical_records.appointment_id': 'Một lịch khám có tối đa một bệnh án.',
  'medical_records.patient_id': 'Bệnh án thuộc bệnh nhân nào để tìm lịch sử khám.',
  'medical_records.doctor_id': 'Bác sĩ nào lập/chịu trách nhiệm bệnh án.',
  'medical_records.parent_visit_id': 'Tái khám có thể nối đến bệnh án trước của chính bệnh nhân.',
  'medical_records.bed_id': 'Khi nhập viện, bệnh án có thể được gán một giường.',
  'notifications.user_id': 'Thông báo được gửi cho đúng tài khoản nhận.',
  'patients.user_id': 'Hồ sơ y tế chỉ thuộc một tài khoản và user_id là duy nhất.',
  'payments.appointment_id': 'Một lịch hẹn có tối đa một hóa đơn.',
  'payments.cashier_user_id': 'Ghi tài khoản thu ngân khi hóa đơn được thu.',
  'prescription_items.prescription_id': 'Mỗi dòng thuốc phải nằm trong một đơn thuốc.',
  'prescription_items.medicine_id': 'Tùy chọn tham chiếu thuốc danh mục; dòng vẫn giữ tên/giá khi danh mục đổi.',
  'prescriptions.medical_record_id': 'Một bệnh án có tối đa một đầu đơn thuốc.',
  'prescriptions.appointment_id': 'Liên kết trực tiếp đơn với lịch hẹn để tra cứu/báo cáo.',
  'prescriptions.doctor_id': 'Bác sĩ kê đơn là ai.',
  'prescriptions.patient_id': 'Bệnh nhân nhận đơn là ai.',
  'receptionists.user_id': 'Hồ sơ nhân viên chỉ thuộc một tài khoản và user_id là duy nhất.',
  'reviews.appointment_id': 'Đánh giá gắn với lượt khám; mỗi lịch tối đa một đánh giá.',
  'reviews.patient_id': 'Bệnh nhân nào gửi đánh giá.',
  'reviews.doctor_id': 'Bác sĩ nào được đánh giá.',
  'services.specialty_id': 'Dịch vụ thuộc chuyên khoa nào nếu đã phân loại.',
  'user_roles.user_id': 'Mỗi role được cấp cho một tài khoản; nhiều dòng tạo nhiều vai trò.'
};

const escapeXml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const escapeMd = value => String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const fmtCount = count => String(count).padStart(2, '0');

let db;
try {
  db = require(path.join(root, 'dist', 'db'));
  const rawTables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const tables = rawTables.map(row => {
    const columns = db.pragma(`table_info(${row.name})`);
    const fks = db.pragma(`foreign_key_list(${row.name})`);
    const uniques = db.pragma(`index_list(${row.name})`).filter(index => index.unique && !index.partial)
      .map(index => db.pragma(`index_info(${index.name})`).map(item => item.name));
    return { name: row.name, columns, fks, uniques };
  });
  const byName = Object.fromEntries(tables.map(table => [table.name, table]));
  const domainNames = domains.flatMap(domain => domain.tables);
  if (tables.length !== domainNames.length || tables.some(table => !domainNames.includes(table.name)) ||
      new Set(domainNames).size !== domainNames.length) throw new Error('Domain layout does not cover every table once');
  const tableDomain = Object.fromEntries(domains.flatMap((domain, index) => domain.tables.map(name => [name, index])));
  let fieldCount = 0;
  for (const table of tables) {
    if (!purposes[table.name]) throw new Error(`Missing table purpose: ${table.name}`);
    for (const column of table.columns) {
      fieldCount++;
      if (column.name !== 'id' && !(meanings[table.name] || {})[column.name] && !common[column.name])
        throw new Error(`Missing Vietnamese field meaning: ${table.name}.${column.name}`);
    }
  }
  const relations = tables.flatMap(child => child.fks.map(fk => {
    const column = child.columns.find(item => item.name === fk.from);
    const unique = child.uniques.some(cols => cols.length === 1 && cols[0] === fk.from) || !!column.pk;
    return { child: child.name, parent: fk.table, from: fk.from, to: fk.to,
      parentMinimum: column.notnull || column.pk ? 1 : 0, childMaximum: unique ? 1 : 'N',
      onDelete: fk.on_delete };
  })).sort((a, b) => `${a.child}.${a.from}`.localeCompare(`${b.child}.${b.from}`));
  relations.forEach((rel, index) => {
    rel.id = `R${fmtCount(index + 1)}`;
    if (!why[`${rel.child}.${rel.from}`]) throw new Error(`Missing relation explanation: ${rel.child}.${rel.from}`);
    if (!byName[rel.parent]) throw new Error(`Missing parent table: ${rel.parent}`);
  });
  if (relations.length !== 41 || fieldCount !== 273 || db.pragma('integrity_check', { simple: true }) !== 'ok' ||
      db.pragma('foreign_key_check').length) throw new Error('Schema/count/integrity changed; review and update render-erd.js');

  const fieldMeaning = (table, column) => column === 'id'
    ? `Mã duy nhất của ${table}` : (meanings[table] || {})[column] || common[column];
  const fieldRel = Object.fromEntries(relations.map(rel => [`${rel.child}.${rel.from}`, rel]));
  const tableIndex = Object.fromEntries(tables.map(table => [table.name, table]));
  const relationshipNotation = rel => {
    const left = rel.parentMinimum === 1 ? '||' : 'o|';
    const right = rel.childMaximum === 1 ? 'o|' : 'o{';
    return `${rel.parent} ${left}--${right} ${rel.child}`;
  };

  const guide = [
    '# MediBook — hướng dẫn đọc ERD 27 bảng',
    '',
    `Sinh từ schema SQLite hiện tại: **${tables.length} bảng, ${fieldCount} trường, ${relations.length} khóa ngoại thật**. Sơ đồ đầy đủ: [SVG phóng to](MediBook_ERD_Complete.svg), [PNG](MediBook_ERD_Complete.png); sơ đồ tổng quan: [SVG](MediBook_ERD_Overview.svg), [PNG](MediBook_ERD_Overview.png); bản có thể chỉnh: [draw.io](MediBook_ERD.drawio).`,
    '',
    '## Đối chiếu với ảnh cũ',
    '',
    '- Ảnh cũ có 18 ô; cần thêm `roles`, `user_roles`, `receptionists`, `appointment_status_history`, `notifications`, `articles`, `rooms`, `beds`, `contact_requests`.',
    '- Đổi tên `doctors_specialties` → `doctor_specialties`, `doctors_leaves` → `doctor_leaves`, `prescriptions_items` → `prescription_items`.',
    '- `patients.full_name`, `users.password`, `doctors.rating_counts`, các cột sinh hiệu rời như `systolic`/`pulse` trong ảnh không phải cột hiện tại. Tên người ở `users.name`, mật khẩu băm ở `users.password_hash`, số đánh giá ở `doctors.rating_count`, sinh hiệu ở `medical_records.vital_signs` (text/JSON).',
    '- `gender` là trường giới tính trong `patients`: `male` = nam, `female` = nữ, `other` = khác. Schema mặc định `other`; không nên tự diễn giải `other` thành giới tính thực khi người dùng chưa tự khai. Ứng dụng hiện chặn giá trị ngoài ba mã này ở form hồ sơ.',
    '',
    '## Cách bổ sung vào ảnh ERD cũ',
    '',
    '1. Vẽ `roles` và `user_roles` cạnh `users`. Nối `users.id` → `user_roles.user_id` bằng dây FK 1 → 0..N. Vẽ **nét đứt** từ `roles.code` sang `user_roles.role` và `users.role`, vì hai dây này hiện chỉ là quy ước nghiệp vụ.',
    '2. Vẽ `receptionists` cạnh `patients` và `doctors`; nối `users.id` → `receptionists.user_id` theo 1 → 0..1. Hai hồ sơ còn lại cũng là 1 → 0..1, không phải 1 → N.',
    '3. Vẽ `appointment_status_history` cạnh `appointments`: lịch hẹn 1 → 0..N lịch sử; `changed_by_user_id` nối tùy chọn về `users.id`. Vẽ `notifications` cạnh `users`: tài khoản 1 → 0..N thông báo.',
    '4. Vẽ `rooms` và `beds` cạnh phần nội trú: phòng 1 → 0..N giường. Từ `beds`, nối thêm các FK tùy chọn sang `patients`, `doctors`, `medical_records`. Từ `medical_records.bed_id` nối ngược tới `beds.id`; xem cảnh báo đồng bộ hai chiều ở cuối tài liệu.',
    '5. Vẽ `contact_requests` gần `users` (người gửi có thể là khách nên `user_id` để trống); `articles` đứng độc lập vì tác giả hiện lưu bằng chữ. Giữ các dây thuốc, tiền, chuyên khoa có sẵn và sửa đúng tên/cột trong mục đối chiếu.',
    '6. Với từng dây còn lại, đối chiếu mã R01–R41 trên SVG với bảng 41 dây bên dưới. Đầu nối ký hiệu `||` là đúng một, `o|` là không hoặc một, `o{` là không hoặc nhiều.',
    '',
    '## Cách đọc khóa và dây nối',
    '',
    '- **PK** = khóa chính, mã duy nhất mỗi hàng. **FK** = khóa ngoại, giá trị trỏ đến PK/UNIQUE ở bảng khác. **UNIQUE** = giá trị hoặc cặp giá trị không trùng.',
    '- `A ||--o{ B`: mỗi B phải trỏ đúng 1 A; một A có 0 đến nhiều B. `A ||--o| B`: mỗi B phải trỏ đúng 1 A; một A có 0 hoặc 1 B. `A o|--o{ B`: một B có thể không trỏ A vì FK cho phép NULL.',
    '- `users` → `patients`/`doctors`/`receptionists` đều 1 → 0..1 do `user_id` vừa FK vừa UNIQUE ở từng bảng con. Cùng một `users.id` có thể có nhiều **loại** hồ sơ, nên một người vừa là bác sĩ vừa là bệnh nhân không mâu thuẫn.',
    '- `users` → `user_roles` là 1 → 0..N; cặp `(user_id, role)` UNIQUE nên một role chỉ cấp một lần cho một người. `roles.code` và `user_roles.role` có liên hệ **nghiệp vụ** (nét đứt trên hình) nhưng **chưa có FK vật lý** trong SQLite. `users.role` là vai trò chính/di sản; kiểm quyền hiện đọc `user_roles`.',
    '- `doctor_specialties` nối nhiều bác sĩ với nhiều chuyên khoa; `favorite_doctors` nối nhiều bệnh nhân với nhiều bác sĩ. Mỗi bảng nối có hai FK và khóa UNIQUE cho cặp.',
    '- `ON DELETE CASCADE`: xóa hàng cha sẽ xóa hàng con; `SET NULL`: giữ hàng con nhưng bỏ liên kết; `NO ACTION`: SQLite ngăn xóa cha khi còn con tham chiếu. Đây là quy tắc dữ liệu, không có nghĩa giao diện cho phép xóa tùy ý.',
    '',
    '## 27 bảng và 273 trường: Anh → Việt',
    ''
  ];
  for (const domain of domains) {
    guide.push(`### ${domain.name}`, '');
    for (const tableName of domain.tables) {
      const table = tableIndex[tableName];
      guide.push(`#### ${table.name}`, '', purposes[table.name], '', '| Trường | Nghĩa tiếng Việt | Kiểu / ràng buộc |', '|---|---|---|');
      for (const column of table.columns) {
        const rel = fieldRel[`${table.name}.${column.name}`];
        const flags = [column.pk ? 'PK; tự tăng/duy nhất' : (column.notnull ? 'Bắt buộc' : 'Có thể NULL'),
          table.uniques.some(cols => cols.length === 1 && cols[0] === column.name) ? 'UNIQUE' : '',
          rel ? `FK ${rel.id} → ${rel.parent}.${rel.to}` : '',
          column.dflt_value !== null ? `Mặc định ${column.dflt_value}` : ''].filter(Boolean);
        guide.push(`| \`${column.name}\` | ${escapeMd(fieldMeaning(table.name, column.name))} | ${column.type || 'ANY'}; ${flags.join('; ')} |`);
      }
      guide.push('');
    }
  }
  guide.push('## 41 dây nối khóa ngoại thật', '',
    'Số đầu **bảng cha** cho biết một bản ghi con cần bao nhiêu cha; số đầu **bảng con** cho biết một cha có thể có bao nhiêu con. Số tối thiểu ở đầu bảng con là 0 vì FK/UNIQUE không bắt buộc phải có bản ghi con.', '',
    '| Dây | Bảng cha → bảng con | Mỗi con có cha | Mỗi cha có con | Vì sao nối | Khi xóa cha |',
    '|---|---|---|---|---|---|');
  for (const rel of relations) {
    guide.push(`| ${rel.id} | \`${rel.parent}.${rel.to}\` → \`${rel.child}.${rel.from}\` | ${rel.parentMinimum === 1 ? 'Đúng 1' : '0 hoặc 1'} | ${rel.childMaximum === 1 ? '0 hoặc 1' : '0 đến nhiều'} | ${escapeMd(why[`${rel.child}.${rel.from}`])} | ${rel.onDelete} |`);
  }
  guide.push('', '## Dây nghiệp vụ nét đứt (không phải FK)', '',
    '- `roles.code` ⇢ `user_roles.role`: danh mục bốn mã role và role được cấp. SQLite hiện không tạo ràng buộc FK ở đây; ứng dụng dùng danh sách mã hợp lệ trong code.',
    '- `roles.code` ⇢ `users.role`: vai trò chính/di sản để điều hướng và tương thích. Quyền thực của phiên được đối chiếu `user_roles` mỗi request.',
    '- `activity_logs.entity_type` + `entity_id`: tham chiếu đa hình đến nhiều loại đối tượng; SQLite không thể vẽ một FK cố định.',
    '- `articles.author_name`/`author_role` là văn bản tên tác giả, không trỏ `users`.',
    '', '## Các chỗ dễ hiểu nhầm / còn cần cải thiện', '',
    '- `patients.gender` mặc định `other`, nên dữ liệu cũ có thể dùng `other` cho người chưa khai báo; không thể suy ra giới tính thật từ giá trị đó.',
    '- `user_roles.role` không có FK tới `roles.code` và nhiều cột trạng thái chưa có CHECK ở DB. Điều này được ghi đúng trên sơ đồ thay vì vẽ dây FK không tồn tại.',
    '- `payments.note` và `payments.notes` cùng tồn tại để tương thích lịch sử; `doctor_schedules.is_active` là cờ cũ bên cạnh `status`. Không xóa cột cũ khi chưa migration dữ liệu.',
    '- `medical_records.bed_id` trỏ giường được cấp cho bệnh án; `beds.current_medical_record_id` trỏ bệnh án đang chiếm giường. Đây là hai chiều lưu trạng thái khác nhau, tạo vòng tham chiếu; phải cập nhật nhất quán trong nghiệp vụ.',
    '- Các bảng không đồng nghĩa với chức năng đã hoàn chỉnh: chưa có bảng cơ sở y tế/chi nhánh nên hiện không có FK phòng khám/bệnh viện như ảnh thiết kế tương lai.',
    ''
  );

  const draw = detailed => {
    const cardWidth = 790;
    const gapX = 135;
    const left = 70;
    const top = 220;
    const gapY = detailed ? 34 : 28;
    const rowHeight = 31;
    const width = left * 2 + 4 * cardWidth + 3 * gapX;
    const boxes = {};
    let bottom = 0;
    domains.forEach((domain, lane) => {
      let y = top;
      domain.tables.forEach(name => {
        const table = byName[name];
        const height = detailed ? 91 + table.columns.length * rowHeight : 112;
        boxes[name] = { x: left + lane * (cardWidth + gapX), y, width: cardWidth, height,
          rows: Object.fromEntries(table.columns.map((column, index) => [column.name, y + 91 + index * rowHeight + 19])) };
        y += height + gapY;
      });
      bottom = Math.max(bottom, y);
    });
    const height = bottom + 155;
    const title = detailed ? 'MediBook · ERD đầy đủ' : 'MediBook · Tổng quan quan hệ dữ liệu';
    const pieces = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="erd-title erd-desc">`,
      `<title id="erd-title">${title}</title>`,
      `<desc id="erd-desc">${tables.length} bảng, ${fieldCount} trường, ${relations.length} khóa ngoại; bảng vai trò có hai quan hệ nghiệp vụ nét đứt.</desc>`,
      '<rect width="100%" height="100%" fill="#f8fafc"/>',
      `<text x="70" y="76" font-family="Segoe UI, Arial, sans-serif" font-size="39" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>`,
      `<text x="70" y="117" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#334155">27 bảng · 273 trường · 41 khóa ngoại thật · 2 dây nghiệp vụ nét đứt</text>`,
      `<text x="70" y="148" font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#64748b">Dữ liệu và dây nối sinh từ SQLite đang chạy; xem ERD_GIAI_THICH.md để đọc R01–R41, bội số và ý nghĩa đầy đủ.</text>`];
    domains.forEach((domain, lane) => {
      const x = left + lane * (cardWidth + gapX);
      pieces.push(`<rect x="${x}" y="170" width="${cardWidth}" height="40" rx="12" fill="${domain.color}"/>`,
        `<text x="${x + 18}" y="197" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#fff">${escapeXml(domain.name)}</text>`);
    });

    const connector = (parentName, parentField, childName, childField, color, dashed, caption) => {
      const parent = boxes[parentName];
      const child = boxes[childName];
      const x1 = parent.x < child.x ? parent.x + cardWidth : parent.x > child.x ? parent.x : parent.x + cardWidth;
      const x2 = parent.x < child.x ? child.x : parent.x > child.x ? child.x + cardWidth : child.x + cardWidth;
      const y1 = detailed ? parent.rows[parentField] : parent.y + parent.height / 2;
      const y2 = detailed ? child.rows[childField] : child.y + child.height / 2;
      const mid = parent.x === child.x ? parent.x + cardWidth + 58 : (x1 + x2) / 2;
      const d = parent.x === child.x
        ? `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
        : `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
      pieces.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${dashed ? 2.8 : 2.4}" stroke-opacity="${dashed ? 0.75 : 0.38}" ${dashed ? 'stroke-dasharray="9 6"' : ''}><title>${escapeXml(caption)}</title></path>`);
    };
    // Draw connectors under cards. FK labels in each row make dense lines traceable.
    for (const rel of relations) {
      connector(rel.parent, rel.to, rel.child, rel.from,
        domains[tableDomain[rel.child]].color, false,
        `${rel.id} ${relationshipNotation(rel)} · ${rel.child}.${rel.from}`);
    }
    connector('roles', 'code', 'user_roles', 'role', '#dc2626', true,
      'Nghiệp vụ: roles.code ⇢ user_roles.role; chưa có FK vật lý');
    connector('roles', 'code', 'users', 'role', '#dc2626', true,
      'Nghiệp vụ: roles.code ⇢ users.role; vai trò chính/di sản, chưa có FK vật lý');

    const shorten = (value, max) => value.length <= max ? value : `${value.slice(0, max - 1)}…`;
    for (const domain of domains) {
      for (const name of domain.tables) {
        const table = byName[name];
        const box = boxes[name];
        pieces.push(`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="13" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/>`,
          `<path d="M ${box.x + 13} ${box.y} H ${box.x + box.width - 13} Q ${box.x + box.width} ${box.y} ${box.x + box.width} ${box.y + 13} V ${box.y + 81} H ${box.x} V ${box.y + 13} Q ${box.x} ${box.y} ${box.x + 13} ${box.y}" fill="${domain.pale}"/>`,
          `<rect x="${box.x}" y="${box.y}" width="10" height="${box.height}" rx="5" fill="${domain.color}"/>`,
          `<text x="${box.x + 24}" y="${box.y + 34}" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">${escapeXml(name)}</text>`,
          `<text x="${box.x + box.width - 20}" y="${box.y + 34}" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="${domain.color}">${table.columns.length} trường</text>`,
          `<text x="${box.x + 24}" y="${box.y + 65}" font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#475569">${escapeXml(shorten(purposes[name], 82))}<title>${escapeXml(purposes[name])}</title></text>`);
        if (!detailed) continue;
        table.columns.forEach((column, index) => {
          const y = box.y + 91 + index * rowHeight;
          const rel = fieldRel[`${name}.${column.name}`];
          const unique = table.uniques.some(cols => cols.length === 1 && cols[0] === column.name);
          const label = column.pk ? 'PK' : rel ? 'FK' : unique ? 'UQ' : '';
          if (index % 2 === 1) pieces.push(`<rect x="${box.x + 11}" y="${y}" width="${cardWidth - 12}" height="${rowHeight}" fill="#f8fafc"/>`);
          if (label) pieces.push(`<rect x="${box.x + 20}" y="${y + 5}" width="31" height="21" rx="4" fill="${column.pk ? '#dbeafe' : rel ? '#dcfce7' : '#fef3c7'}"/>`,
            `<text x="${box.x + 35}" y="${y + 20}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" fill="#334155">${label}</text>`);
          pieces.push(`<text x="${box.x + 60}" y="${y + 21}" font-family="Consolas, monospace" font-size="16" fill="#0f172a">${escapeXml(shorten(column.name, 26))}</text>`,
            `<text x="${box.x + 312}" y="${y + 21}" font-family="Segoe UI, Arial, sans-serif" font-size="15" fill="#334155">${escapeXml(shorten(fieldMeaning(name, column.name), 43))}<title>${escapeXml(fieldMeaning(name, column.name))}</title></text>`);
          if (rel) pieces.push(`<text x="${box.x + cardWidth - 15}" y="${y + 21}" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="${domain.color}">${rel.id}</text>`);
        });
      }
    }
    pieces.push(`<rect x="70" y="${height - 122}" width="${width - 140}" height="84" rx="12" fill="#e2e8f0"/>`,
      `<text x="93" y="${height - 87}" font-family="Segoe UI, Arial, sans-serif" font-size="19" fill="#0f172a">PK = khóa chính · FK = khóa ngoại thật · UQ = duy nhất · R01–R41 = số dây trong bảng giải thích</text>`,
      `<text x="93" y="${height - 57}" font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#475569">Nét đứt đỏ = quan hệ nghiệp vụ vai trò, chưa có FK SQLite. Mở SVG ở kích thước gốc để phóng to từng bảng.</text>`,
      '</svg>');
    return pieces.join('\n') + '\n';
  };

  const outputs = [
    ['docs/ERD_GIAI_THICH.md', guide.join('\n')],
    ['docs/MediBook_ERD_Complete.svg', draw(true)],
    ['docs/MediBook_ERD_Overview.svg', draw(false)]
  ];
  const check = process.argv.includes('--check');
  const changed = outputs.filter(([name, value]) => !fs.existsSync(path.join(root, name)) ||
    fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n') !== value);
  if (check && changed.length) {
    console.error('Bilingual ERD out of date:', changed.map(([name]) => name).join(', '));
    process.exitCode = 1;
  } else if (!check) {
    for (const [name, value] of outputs) fs.writeFileSync(path.join(root, name), value, 'utf8');
  }
  console.log(`${tables.length} tables, ${fieldCount} fields, ${relations.length} FKs; ${check ? 'checked' : 'rendered'} bilingual ERD`);
} finally {
  if (db) db.close();
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { fs.unlinkSync(tempDb + suffix); } catch (_) { /* temporary SQLite file may not exist */ }
  }
}
