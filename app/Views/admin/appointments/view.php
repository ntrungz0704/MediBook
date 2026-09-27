<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div style="max-width: 900px; margin: 0 auto;">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
    <div>
      <a href="/admin/appointments" style="color:var(--primary); font-weight:600; font-size:14px;">&larr; Danh sách lịch hẹn</a>
      <h2 style="font-size:24px; font-weight:800; margin-top:4px;">Chi tiết lịch khám #<?= htmlspecialchars($app['booking_code']) ?></h2>
    </div>

    <div>
      <?= Helper::getAppointmentStatusBadge($app['status']) ?>
    </div>
  </div>

  <div class="card-box" style="padding: 24px; margin-bottom: 24px;">
    <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
      Thông tin đặt khám & Bệnh nhân
    </h3>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
      <div>Bệnh nhân: <strong><?= htmlspecialchars($app['patient_name']) ?></strong></div>
      <div>Số điện thoại: <strong><?= htmlspecialchars($app['patient_phone']) ?></strong></div>
      <div>Bác sĩ: <strong><?= htmlspecialchars($app['doctor_title'] . ' ' . $app['doctor_name']) ?></strong></div>
      <div>Phòng khám: <strong><?= htmlspecialchars($app['room_number'] . ' (' . $app['specialty_name'] . ')') ?></strong></div>
      <div>Ngày khám: <strong><?= Helper::formatDate($app['appointment_date']) ?></strong> &bull; <?= Helper::formatTimeSlot($app['start_time'], $app['end_time']) ?></div>
      <div>Dịch vụ: <?= htmlspecialchars($app['service_name'] ?: 'Khám tiêu chuẩn') ?></div>
      <div style="grid-column: 1/-1;">Triệu chứng: <?= htmlspecialchars($app['symptoms'] ?: 'Không ghi nhận') ?></div>
    </div>
  </div>

  <!-- Status History Timeline -->
  <div class="card-box" style="padding: 24px; margin-bottom: 24px;">
    <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
      Nhật ký thay đổi trạng thái
    </h3>

    <div style="display:flex; flex-direction:column; gap:12px; font-size:13.5px;">
      <?php foreach ($history as $h): ?>
        <div style="border-left: 3px solid var(--primary); padding-left: 12px;">
          <div style="font-weight:700; color:#0f172a;">
            Chuyển thành: <?= Helper::getAppointmentStatusBadge($h['new_status']) ?>
            <span style="font-weight:normal; font-size:12px; color:var(--text-muted); margin-left:8px;"><?= Helper::formatDate($h['created_at'], 'H:i:s d/m/Y') ?></span>
          </div>
          <div style="color:#475569; margin-top:2px;">
            <?= htmlspecialchars($h['note'] ?: 'Cập nhật hệ thống') ?>
            <?php if (!empty($h['changed_by_name'])): ?>
              &bull; <em>Thực hiện bởi: <?= htmlspecialchars($h['changed_by_name'] . ' (' . $h['changed_by_role'] . ')') ?></em>
            <?php endif; ?>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- Manual Status Override by Admin -->
  <div class="card-box" style="padding: 20px;">
    <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">Điều chỉnh trạng thái thủ công (Admin Override)</h4>
    <form action="/admin/appointments/status/<?= $app['id'] ?>" method="POST" style="display:flex; gap:12px; align-items:center;">
      <?= Csrf::field() ?>
      <select name="status" class="form-control" style="max-width:200px;">
        <option value="pending" <?= $app['status'] === 'pending' ? 'selected' : '' ?>>Chờ xác nhận</option>
        <option value="confirmed" <?= $app['status'] === 'confirmed' ? 'selected' : '' ?>>Đã xác nhận</option>
        <option value="checked_in" <?= $app['status'] === 'checked_in' ? 'selected' : '' ?>>Đã tiếp đón</option>
        <option value="in_consultation" <?= $app['status'] === 'in_consultation' ? 'selected' : '' ?>>Đang khám</option>
        <option value="completed" <?= $app['status'] === 'completed' ? 'selected' : '' ?>>Đã hoàn thành</option>
        <option value="cancelled" <?= $app['status'] === 'cancelled' ? 'selected' : '' ?>>Đã hủy</option>
      </select>
      <input type="text" name="note" class="form-control" placeholder="Lý do điều chỉnh...">
      <button type="submit" class="btn btn-primary btn-sm" style="white-space:nowrap;">Lưu trạng thái</button>
    </form>
  </div>
</div>
