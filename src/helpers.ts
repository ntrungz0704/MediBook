export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function maskName(name: string | null | undefined): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0) + '***';
  return parts.slice(0, -1).map((p, i) => (i === 0 ? p : p.charAt(0) + '.')).join(' ') + ' ' + parts[parts.length - 1].charAt(0) + '***';
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(Number(amount)) + ' ₫';
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: '<span class="badge badge-warning">Chờ xác nhận</span>',
    confirmed: '<span class="badge badge-info">Đã xác nhận</span>',
    checked_in: '<span class="badge badge-primary">Đã tiếp đón</span>',
    in_consultation: '<span class="badge badge-purple">Đang khám</span>',
    completed: '<span class="badge badge-success">Đã hoàn thành</span>',
    cancelled: '<span class="badge badge-danger">Đã hủy</span>',
    waiting: '<span class="badge badge-warning">Đang chờ</span>',
    calling: '<span class="badge badge-primary">Đang gọi loa</span>',
    in_room: '<span class="badge badge-info">Trong phòng khám</span>',
    active: '<span class="badge badge-success">Hoạt động</span>',
    inactive: '<span class="badge badge-danger">Khóa / Tạm dừng</span>',
    paid: '<span class="badge badge-success">Đã thanh toán</span>',
    unpaid: '<span class="badge badge-warning">Chưa thanh toán</span>'
  };
  return map[status] || `<span class="badge badge-secondary">${escapeHtml(status)}</span>`;
}

export function getRoleName(role: string): string {
  const map: Record<string, string> = {
    admin: 'Quản trị viên',
    doctor: 'Bác sĩ',
    receptionist: 'Lễ tân / Thu ngân',
    patient: 'Bệnh nhân'
  };
  return map[role] || role;
}

export function getRoleBadge(role: string): string {
  const map: Record<string, string> = {
    admin: '<span class="badge badge-danger" style="font-weight:700;">Quản trị viên</span>',
    doctor: '<span class="badge badge-info" style="font-weight:700;">Bác sĩ</span>',
    receptionist: '<span class="badge badge-warning" style="font-weight:700;">Lễ tân / Thu ngân</span>',
    patient: '<span class="badge badge-secondary" style="font-weight:700;">Bệnh nhân</span>'
  };
  return map[role] || `<span class="badge badge-secondary">${escapeHtml(role)}</span>`;
}

export function getPriorityBadge(priorityLevel: string, reason?: string): string {
  switch (priorityLevel) {
    case 'emergency':
      return `<span class="badge" style="background:#dc2626; color:#ffffff; font-weight:800; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px; box-shadow:0 0 8px rgba(220,38,38,0.4);"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fff;"></span> 🚨 CẤP CỨU / KHẨN CẤP</span>`;
    case 'priority':
      const reasonText = reason ? `: ${escapeHtml(reason)}` : ' (Người già / Trẻ em / Thai phụ)';
      return `<span class="badge" style="background:#d97706; color:#ffffff; font-weight:700; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fef3c7;"></span> ⭐ ƯU TIÊN${reasonText}</span>`;
    case 'online':
      return `<span class="badge" style="background:#0284c7; color:#ffffff; font-weight:600; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;">🌐 HẸN ONLINE</span>`;
    case 'walkin':
    default:
      return `<span class="badge" style="background:#64748b; color:#ffffff; font-weight:600; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;">🚶 TẠI QUẦY (OFFLINE)</span>`;
  }
}

export function getVisitTypeBadge(visitType: string): string {
  switch (visitType) {
    case 'follow_up':
      return `<span class="badge badge-warning" style="font-weight:700; background:#fef3c7; color:#b45309; border:1px solid #fcd34d;">🔄 Tái khám</span>`;
    case 'initial':
    default:
      return `<span class="badge badge-info" style="font-weight:700; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;">🆕 Lần đầu khám</span>`;
  }
}

export function getTreatmentTypeBadge(treatmentType: string, room?: string, bed?: string): string {
  switch (treatmentType) {
    case 'inpatient':
      const location = (room || bed) ? ` (Phòng: ${room || 'Chưa gán'}${bed ? ` - Giường: ${bed}` : ''})` : '';
      return `<span class="badge" style="background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe; font-weight:700;">🏥 Điều trị nội trú${location}</span>`;
    case 'outpatient':
    default:
      return `<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; font-weight:700;">🏢 Điều trị ngoại trú</span>`;
  }
}
