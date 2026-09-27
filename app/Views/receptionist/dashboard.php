<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-icon stat-icon-teal">🗓️</div>
    <div class="stat-details">
      <h4><?= (int)$totalToday ?></h4>
      <p>Tổng lịch hẹn hôm nay</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-blue">🏥</div>
    <div class="stat-details">
      <h4><?= (int)$checkedInCount ?></h4>
      <p>Đã tiếp đón & Đang khám</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-green">✅</div>
    <div class="stat-details">
      <h4><?= (int)$completedCount ?></h4>
      <p>Đã hoàn thành khám</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-amber">💰</div>
    <div class="stat-details">
      <h4><?= Helper::formatCurrency((float)$todayRevenue) ?></h4>
      <p>Doanh thu viện phí hôm nay</p>
    </div>
  </div>
</div>

<div class="card-box">
  <div class="card-header-bar">
    <h3>Lịch hẹn cần xử lý hôm nay (<?= date('d/m/Y') ?>)</h3>
    <div style="display:flex;gap:10px;">
      <a href="/receptionist/checkin" class="btn btn-primary btn-sm">Quầy tiếp đón &rarr;</a>
      <a href="/receptionist/booking" class="btn btn-secondary btn-sm">➕ Đặt lịch tại quầy</a>
      <a href="/receptionist/live-board" target="_blank" class="btn btn-outline btn-sm">📺 Màn hình gọi số</a>
    </div>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Mã đặt lịch</th>
          <th>Bệnh nhân</th>
          <th>Số điện thoại</th>
          <th>Bác sĩ & Phòng</th>
          <th>Giờ hẹn</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($todayAppointments)): ?>
          <tr>
            <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
              Không có lịch hẹn nào hôm nay.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($todayAppointments as $app): ?>
            <tr>
              <td><code><?= htmlspecialchars($app['booking_code']) ?></code></td>
              <td><strong><?= htmlspecialchars($app['patient_name']) ?></strong></td>
              <td><?= htmlspecialchars($app['patient_phone']) ?></td>
              <td><?= htmlspecialchars($app['doctor_title'] . ' ' . $app['doctor_name'] . ' (' . $app['room_number'] . ')') ?></td>
              <td><?= substr($app['start_time'], 0, 5) ?></td>
              <td><?= Helper::getAppointmentStatusBadge($app['status']) ?></td>
              <td>
                <?php if ($app['status'] === 'pending'): ?>
                  <form action="/receptionist/confirm/<?= $app['id'] ?>" method="POST" style="display:inline;">
                    <?= Csrf::field() ?>
                    <button type="submit" class="btn btn-secondary btn-sm">Xác nhận hẹn</button>
                  </form>
                <?php elseif ($app['status'] === 'confirmed'): ?>
                  <form action="/receptionist/checkin/<?= $app['id'] ?>" method="POST" style="display:inline;">
                    <?= Csrf::field() ?>
                    <button type="submit" class="btn btn-primary btn-sm">Tiếp đón / Cấp STT</button>
                  </form>
                <?php elseif ($app['status'] === 'completed'): ?>
                  <a href="/receptionist/payments" class="btn btn-secondary btn-sm">Thu ngân</a>
                <?php else: ?>
                  <span class="text-muted" style="font-size:12px;">Đã tiếp đón</span>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
