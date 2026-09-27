<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-icon stat-icon-teal">👥</div>
    <div class="stat-details">
      <h4><?= (int)$totalToday ?></h4>
      <p>Tổng bệnh nhân hôm nay</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-amber">⏳</div>
    <div class="stat-details">
      <h4><?= (int)$waitingCount ?></h4>
      <p>Bệnh nhân đang chờ</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-green">✅</div>
    <div class="stat-details">
      <h4><?= (int)$completedToday ?></h4>
      <p>Đã khám xong hôm nay</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-blue">🚪</div>
    <div class="stat-details">
      <h4><?= htmlspecialchars($doctor['room_number']) ?></h4>
      <p>Phòng khám phụ trách</p>
    </div>
  </div>
</div>

<div class="card-box">
  <div class="card-header-bar">
    <h3>Danh sách bệnh nhân tiếp đón hôm nay (<?= date('d/m/Y') ?>)</h3>
    <a href="/doctor/queue" class="btn btn-primary btn-sm">Xem hàng đợi chi tiết &rarr;</a>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>STT</th>
          <th>Mã lịch</th>
          <th>Họ tên bệnh nhân</th>
          <th>Giờ hẹn</th>
          <th>Triệu chứng ban đầu</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($todayQueue)): ?>
          <tr>
            <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
              Hiện chưa có bệnh nhân nào trong hàng đợi phòng khám hôm nay.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($todayQueue as $item): ?>
            <tr>
              <td><strong style="color:var(--primary);"><?= htmlspecialchars($item['queue_number']) ?></strong></td>
              <td><code><?= htmlspecialchars($item['booking_code']) ?></code></td>
              <td><strong><?= htmlspecialchars($item['patient_name']) ?></strong></td>
              <td><?= substr($item['start_time'], 0, 5) ?></td>
              <td><?= htmlspecialchars($item['symptoms'] ?: 'Khám định kỳ') ?></td>
              <td>
                <?php if ($item['status'] === 'waiting'): ?>
                  <span class="badge badge-warning">Đang chờ</span>
                <?php elseif ($item['status'] === 'calling'): ?>
                  <span class="badge badge-primary">Đang gọi</span>
                <?php elseif ($item['status'] === 'in_room'): ?>
                  <span class="badge badge-info">Đang trong phòng</span>
                <?php elseif ($item['status'] === 'completed'): ?>
                  <span class="badge badge-success">Đã hoàn thành</span>
                <?php else: ?>
                  <span class="badge badge-secondary"><?= htmlspecialchars($item['status']) ?></span>
                <?php endif; ?>
              </td>
              <td>
                <?php if ($item['status'] === 'waiting'): ?>
                  <form action="/doctor/queue/call/<?= $item['id'] ?>" method="POST" style="display:inline;">
                    <?= Csrf::field() ?>
                    <button type="submit" class="btn btn-primary btn-sm">Gọi vào khám</button>
                  </form>
                <?php elseif ($item['status'] === 'calling'): ?>
                  <form action="/doctor/queue/start/<?= $item['id'] ?>" method="POST" style="display:inline;">
                    <?= Csrf::field() ?>
                    <button type="submit" class="btn btn-primary btn-sm">Bắt đầu khám</button>
                  </form>
                <?php elseif ($item['status'] === 'in_room'): ?>
                  <a href="/doctor/examine/<?= $item['appointment_id'] ?>" class="btn btn-primary btn-sm">Tiếp tục khám</a>
                <?php else: ?>
                  <a href="/appointments/<?= $item['booking_code'] ?>" class="btn btn-secondary btn-sm" target="_blank">Xem bệnh án</a>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
