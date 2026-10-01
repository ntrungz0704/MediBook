"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.getStatusBadge = getStatusBadge;
exports.getRoleName = getRoleName;
exports.getRoleBadge = getRoleBadge;
exports.getPriorityBadge = getPriorityBadge;
exports.getVisitTypeBadge = getVisitTypeBadge;
exports.getTreatmentTypeBadge = getTreatmentTypeBadge;
function formatCurrency(amount) {
    if (amount === null || amount === undefined)
        return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(Number(amount)) + ' ₫';
}
function formatDate(dateStr) {
    if (!dateStr)
        return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(dateStr) {
    if (!dateStr)
        return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}
function getStatusBadge(status) {
    const map = {
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
    return map[status] || `<span class="badge badge-secondary">${status}</span>`;
}
function getRoleName(role) {
    const map = {
        admin: 'Quản trị viên',
        doctor: 'Bác sĩ',
        receptionist: 'Lễ tân / Thu ngân',
        patient: 'Bệnh nhân'
    };
    return map[role] || role;
}
function getRoleBadge(role) {
    const map = {
        admin: '<span class="badge badge-danger" style="font-weight:700;">Quản trị viên</span>',
        doctor: '<span class="badge badge-info" style="font-weight:700;">Bác sĩ</span>',
        receptionist: '<span class="badge badge-warning" style="font-weight:700;">Lễ tân / Thu ngân</span>',
        patient: '<span class="badge badge-secondary" style="font-weight:700;">Bệnh nhân</span>'
    };
    return map[role] || `<span class="badge badge-secondary">${role}</span>`;
}
function getPriorityBadge(priorityLevel, reason) {
    switch (priorityLevel) {
        case 'emergency':
            return `<span class="badge" style="background:#dc2626; color:#ffffff; font-weight:800; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px; box-shadow:0 0 8px rgba(220,38,38,0.4);"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fff;"></span> 🚨 CẤP CỨU / KHẨN CẤP</span>`;
        case 'priority':
            const reasonText = reason ? `: ${reason}` : ' (Người già / Trẻ em / Thai phụ)';
            return `<span class="badge" style="background:#d97706; color:#ffffff; font-weight:700; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fef3c7;"></span> ⭐ ƯU TIÊN${reasonText}</span>`;
        case 'online':
            return `<span class="badge" style="background:#0284c7; color:#ffffff; font-weight:600; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;">🌐 HẸN ONLINE</span>`;
        case 'walkin':
        default:
            return `<span class="badge" style="background:#64748b; color:#ffffff; font-weight:600; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;">🚶 TẠI QUẦY (OFFLINE)</span>`;
    }
}
function getVisitTypeBadge(visitType) {
    switch (visitType) {
        case 'follow_up':
            return `<span class="badge badge-warning" style="font-weight:700; background:#fef3c7; color:#b45309; border:1px solid #fcd34d;">🔄 Tái khám</span>`;
        case 'initial':
        default:
            return `<span class="badge badge-info" style="font-weight:700; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;">🆕 Lần đầu khám</span>`;
    }
}
function getTreatmentTypeBadge(treatmentType, room, bed) {
    switch (treatmentType) {
        case 'inpatient':
            const location = (room || bed) ? ` (Phòng: ${room || 'Chưa gán'}${bed ? ` - Giường: ${bed}` : ''})` : '';
            return `<span class="badge" style="background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe; font-weight:700;">🏥 Điều trị nội trú${location}</span>`;
        case 'outpatient':
        default:
            return `<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; font-weight:700;">🏢 Điều trị ngoại trú</span>`;
    }
}
