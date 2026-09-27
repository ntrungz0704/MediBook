<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div class="card-box" style="padding: 20px; margin-bottom: 24px;">
  <form action="/admin/appointments" method="GET" style="display: grid; grid-template-columns: 2fr 1.2fr 1fr 1fr auto; gap: 14px; align-items: flex-end;">
    <div class="form-group">
      <label>Tìm kiếm</label>
      <input type="text" name="keyword" class="form-control" placeholder="Mã lịch, tên, SĐT..." value="<?= htmlspecialchars($keyword ?? '') ?>">
    </div>

    <div class="form-group">
      <label>Bác sĩ</label>
      <select name="doctor_id" class="form-control">
        <option value="">-- Tất cả bác sĩ --</option>
        <?php foreach ($doctors as $d): ?>
          <option value="<?= $d['id'] ?>" <?= ($doctorId ?? 0) == $d['id'] ? 'selected' : '' ?>><?= htmlspecialchars($d['title'] . ' ' . $d['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </div>

    <div class="form-group">
      <label>Ngày khám</label>
      <input type="date" name="date" class="form-control" value="<?= htmlspecialchars($date ?? '') ?>">
    </div>

    <div class="form-group">
      <label>Trạng thái</label>
      <select name="status" class="form-control">
        <option value="">-- Tất cả --</option>
        <option value="pending" <?= ($status ?? '') === 'pending' ? 'selected' : '' ?>>Chờ xác nhận</option>
        <option value="confirmed" <?= ($status ?? '') === 'confirmed' ? 'selected' : '' ?>>Đã xác nhận</option>
        <option value="checked_in" <?= ($status ?? '') === 'checked_in' ? 'selected' : '' ?>>Đã tiếp đón</option>
        <option value="completed" <?= ($status ?? '') === 'completed' ? 'selected' : '' ?>>Đã hoàn thành</option>
        <option value="cancelled" <?= ($status ?? '') === 'cancelled' ? 'selected' : '' ?>>Đã hủy</option>
      </select>
    </div>

    <button type="submit" class="btn btn-primary" style="height: 48px; padding: 0 20px;">
      🔍 Lọc
    </button>
  </form>
</div>

<div class="card-box">
  <div class="card-header-bar">
    <h3>Tất cả lịch hẹn khám (<?= count($appointments) ?> cuộc hẹn)</h3>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Mã lịch</th>
          <th>Bệnh nhân</th>
          <th>Bác sĩ</th>
          <th>Chuyên khoa</th>
          <th>Ngày & Giờ</th>
          <th>Trạng thái</th>
          <th>Thanh toán</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($appointments)): ?>
          <tr><td colspan="8" style="text-align:center;padding:30px;">Không có cuộc hẹn nào.</td></tr>
        <?php else: ?>
          <?php foreach ($appointments as $a): ?>
            <tr>
              <td><code><?= htmlspecialchars($a['booking_code']) ?></code></td>
              <td>
                <strong><?= htmlspecialchars($a['patient_name']) ?></strong><br>
                <small class="text-muted"><?= htmlspecialchars($a['patient_phone']) ?></small>
              </td>
              <td><?= htmlspecialchars($a['doctor_title'] . ' ' . $a['doctor_name']) ?></td>
              <td><?= htmlspecialchars($a['specialty_name']) ?></td>
              <td><?= Helper::formatDate($a['appointment_date']) ?> (<?= substr($a['start_time'], 0, 5) ?>)</td>
              <td><?= Helper::getAppointmentStatusBadge($a['status']) ?></td>
              <td>
                <?php if (!empty($a['payment_status'])): ?>
                  <?= Helper::getPaymentStatusBadge($a['payment_status']) ?>
                <?php else: ?>
                  <span class="text-muted">-</span>
                <?php endif; ?>
              </td>
              <td>
                <a href="/admin/appointments/view/<?= $a['id'] ?>" class="btn btn-secondary btn-sm">Xem chi tiết</a>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
