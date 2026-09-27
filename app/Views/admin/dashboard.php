<?php
use App\Core\Helper;
?>
<!-- KPI Cards -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-icon stat-icon-amber">💰</div>
    <div class="stat-details">
      <h4><?= Helper::formatCurrency((float)$revenueStats['total_revenue']) ?></h4>
      <p>Tổng doanh thu phòng khám</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-teal">🗓️</div>
    <div class="stat-details">
      <h4><?= (int)$totalAppointments ?></h4>
      <p>Tổng lượt đặt khám</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-blue">👥</div>
    <div class="stat-details">
      <h4><?= (int)$totalPatients ?></h4>
      <p>Hồ sơ bệnh nhân</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-green">🩺</div>
    <div class="stat-details">
      <h4><?= (int)$totalDoctors ?></h4>
      <p>Bác sĩ đang công tác</p>
    </div>
  </div>
</div>

<!-- Status Distribution Row -->
<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 30px;">
  
  <!-- Recent Bookings Table -->
  <div class="card-box">
    <div class="card-header-bar">
      <h3>Lịch đặt khám gần đây</h3>
      <a href="/admin/appointments" class="btn btn-secondary btn-sm">Xem tất cả &rarr;</a>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Mã đặt</th>
            <th>Bệnh nhân</th>
            <th>Bác sĩ</th>
            <th>Ngày & Giờ</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($recentBookings)): ?>
            <tr><td colspan="5" style="text-align:center;padding:20px;">Chưa có lịch hẹn nào.</td></tr>
          <?php else: ?>
            <?php foreach ($recentBookings as $b): ?>
              <tr>
                <td><code><?= htmlspecialchars($b['booking_code']) ?></code></td>
                <td><strong><?= htmlspecialchars($b['patient_name']) ?></strong></td>
                <td><?= htmlspecialchars($b['doctor_name']) ?></td>
                <td><?= Helper::formatDate($b['appointment_date']) ?> (<?= substr($b['start_time'], 0, 5) ?>)</td>
                <td><?= Helper::getAppointmentStatusBadge($b['status']) ?></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Appointment Status Breakdown Card -->
  <div class="card-box" style="padding: 24px;">
    <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px;">
      Tỷ lệ trạng thái lịch khám
    </h3>

    <div style="display: flex; flex-direction: column; gap: 14px; font-size: 14px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-warning">Chờ xác nhận</span>
        <strong><?= (int)($statusCounts['pending'] ?? 0) ?></strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-success">Đã xác nhận</span>
        <strong><?= (int)($statusCounts['confirmed'] ?? 0) ?></strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-info">Đã tiếp đón (Check-in)</span>
        <strong><?= (int)($statusCounts['checked_in'] ?? 0) ?></strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-primary">Đang khám</span>
        <strong><?= (int)($statusCounts['in_consultation'] ?? 0) ?></strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-completed">Đã hoàn thành</span>
        <strong><?= (int)($statusCounts['completed'] ?? 0) ?></strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-danger">Đã hủy</span>
        <strong><?= (int)($statusCounts['cancelled'] ?? 0) ?></strong>
      </div>
    </div>

    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px dashed var(--border); text-align: center;">
      <a href="/admin/reports" class="btn btn-outline btn-block btn-sm">Xem phân tích doanh thu</a>
    </div>
  </div>

</div>
