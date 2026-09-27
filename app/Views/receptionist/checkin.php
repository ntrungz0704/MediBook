<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div class="card-box" style="padding: 20px; margin-bottom: 24px;">
  <form action="/receptionist/checkin" method="GET" style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 14px; align-items: flex-end;">
    <div class="form-group">
      <label>Tìm kiếm theo mã đặt lịch hoặc số điện thoại</label>
      <input type="text" name="keyword" class="form-control" placeholder="Nhập mã lịch (MB...), tên bệnh nhân hoặc SĐT..." value="<?= htmlspecialchars($keyword ?? '') ?>">
    </div>

    <div class="form-group">
      <label>Ngày khám</label>
      <input type="date" name="date" class="form-control" value="<?= htmlspecialchars($date ?? date('Y-m-d')) ?>">
    </div>

    <div class="form-group">
      <label>Trạng thái</label>
      <select name="status" class="form-control">
        <option value="">-- Tất cả trạng thái --</option>
        <option value="pending" <?= ($status ?? '') === 'pending' ? 'selected' : '' ?>>Chờ xác nhận</option>
        <option value="confirmed" <?= ($status ?? '') === 'confirmed' ? 'selected' : '' ?>>Đã xác nhận (Chờ tiếp đón)</option>
        <option value="checked_in" <?= ($status ?? '') === 'checked_in' ? 'selected' : '' ?>>Đã tiếp đón</option>
        <option value="completed" <?= ($status ?? '') === 'completed' ? 'selected' : '' ?>>Đã hoàn thành</option>
        <option value="cancelled" <?= ($status ?? '') === 'cancelled' ? 'selected' : '' ?>>Đã hủy</option>
      </select>
    </div>

    <div>
      <button type="submit" class="btn btn-primary" style="height: 48px; padding: 0 24px;">
        🔍 Tìm kiếm
      </button>
    </div>
  </form>
</div>

<div class="card-box">
  <div class="card-header-bar">
    <h3>Danh sách lịch hẹn tiếp đón (<?= count($appointments) ?> kết quả)</h3>
    <a href="/receptionist/booking" class="btn btn-primary btn-sm">➕ Đặt lịch trực tiếp tại quầy</a>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Mã đặt lịch</th>
          <th>Số thứ tự</th>
          <th>Bệnh nhân</th>
          <th>Số điện thoại</th>
          <th>Bác sĩ phụ trách</th>
          <th>Phòng khám</th>
          <th>Giờ hẹn</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($appointments)): ?>
          <tr>
            <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
              Không tìm thấy lịch hẹn nào theo điều kiện tìm kiếm.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($appointments as $a): ?>
            <tr>
              <td><code><?= htmlspecialchars($a['booking_code']) ?></code></td>
              <td>
                <?php if (!empty($a['queue_number'])): ?>
                  <strong style="color:var(--primary); font-size:15px;"><?= htmlspecialchars($a['queue_number']) ?></strong>
                <?php else: ?>
                  <span class="text-muted">-</span>
                <?php endif; ?>
              </td>
              <td><strong><?= htmlspecialchars($a['patient_name']) ?></strong></td>
              <td><?= htmlspecialchars($a['patient_phone']) ?></td>
              <td><?= htmlspecialchars($a['doctor_title'] . ' ' . $a['doctor_name']) ?></td>
              <td><span class="badge badge-info"><?= htmlspecialchars($a['room_number']) ?></span></td>
              <td><?= substr($a['start_time'], 0, 5) ?></td>
              <td><?= Helper::getAppointmentStatusBadge($a['status']) ?></td>
              <td>
                <div style="display:flex; gap:6px;">
                  <?php if ($a['status'] === 'pending'): ?>
                    <form action="/receptionist/confirm/<?= $a['id'] ?>" method="POST">
                      <?= Csrf::field() ?>
                      <button type="submit" class="btn btn-secondary btn-sm">Xác nhận</button>
                    </form>
                  <?php endif; ?>

                  <?php if (in_array($a['status'], ['pending', 'confirmed'])): ?>
                    <form action="/receptionist/checkin/<?= $a['id'] ?>" method="POST">
                      <?= Csrf::field() ?>
                      <button type="submit" class="btn btn-primary btn-sm">Tiếp đón (Check-in)</button>
                    </form>
                  <?php elseif ($a['status'] === 'checked_in'): ?>
                    <span class="badge badge-success" style="font-size:12px;">Đã cấp STT</span>
                  <?php elseif ($a['status'] === 'completed'): ?>
                    <a href="/receptionist/payments" class="btn btn-secondary btn-sm">Viện phí</a>
                  <?php endif; ?>
                  
                  <a href="/appointments/<?= $a['booking_code'] ?>" class="btn btn-outline btn-sm" target="_blank" title="Xem chi tiết">
                    👁️
                  </a>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
