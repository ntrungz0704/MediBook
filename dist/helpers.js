"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.getStatusBadge = getStatusBadge;
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
        active: '<span class="badge badge-success">Hoạt động</span>',
        inactive: '<span class="badge badge-danger">Khóa / Tạm dừng</span>',
        paid: '<span class="badge badge-success">Đã thanh toán</span>',
        unpaid: '<span class="badge badge-warning">Chưa thanh toán</span>'
    };
    return map[status] || `<span class="badge badge-secondary">${status}</span>`;
}
