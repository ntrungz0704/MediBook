<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div class="card-box">
  <div class="card-header-bar">
    <div>
      <h3 style="margin-bottom:2px;">Hàng đợi bệnh nhân phòng <?= htmlspecialchars($doctor['room_number']) ?></h3>
      <p style="color:var(--text-muted);font-size:13px;margin:0;">Bác sĩ phụ trách: <?= htmlspecialchars($doctor['title'] . ' ' . $doctor['name']) ?></p>
    </div>

    <div style="display:flex;gap:10px;">
      <a href="/doctor/queue" class="btn btn-secondary btn-sm">🔄 Làm mới hàng đợi</a>
      <a href="/receptionist/live-board" target="_blank" class="btn btn-outline btn-sm">📺 Mở màn hình gọi số</a>
    </div>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>STT</th>
          <th>Mã đặt lịch</th>
          <th>Họ tên & SĐT</th>
          <th>Giới tính / Tuổi</th>
          <th>Giờ hẹn</th>
          <th>Lý do khám / Bệnh sử</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($queueList)): ?>
          <tr>
            <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
              Chưa có bệnh nhân nào check-in vào phòng khám hôm nay.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($queueList as $q): ?>
            <tr style="<?= $q['status'] === 'calling' ? 'background:#ecfdf5;' : ($q['status'] === 'in_room' ? 'background:#eff6ff;' : '') ?>">
              <td>
                <span style="font-size: 16px; font-weight: 800; color: var(--primary);">
                  <?= htmlspecialchars($q['queue_number']) ?>
                </span>
              </td>
              <td><code><?= htmlspecialchars($q['booking_code']) ?></code></td>
              <td>
                <strong><?= htmlspecialchars($q['patient_name']) ?></strong><br>
                <small class="text-muted"><?= htmlspecialchars($q['patient_phone']) ?></small>
              </td>
              <td>
                <?= $q['patient_gender'] === 'male' ? 'Nam' : ($q['patient_gender'] === 'female' ? 'Nữ' : 'Khác') ?>
                <?php if (!empty($q['patient_dob'])): ?>
                  (<?= date('Y') - (int)date('Y', strtotime($q['patient_dob'])) ?>t)
                <?php endif; ?>
              </td>
              <td><?= substr($q['start_time'], 0, 5) ?></td>
              <td>
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <?= htmlspecialchars($q['symptoms'] ?: 'Khám định kỳ') ?>
                </div>
              </td>
              <td>
                <?php if ($q['status'] === 'waiting'): ?>
                  <span class="badge badge-warning">Đang chờ</span>
                <?php elseif ($q['status'] === 'calling'): ?>
                  <span class="badge badge-primary">Đang gọi loa</span>
                <?php elseif ($q['status'] === 'in_room'): ?>
                  <span class="badge badge-info">Đang khám</span>
                <?php elseif ($q['status'] === 'completed'): ?>
                  <span class="badge badge-success">Đã khám xong</span>
                <?php else: ?>
                  <span class="badge badge-secondary"><?= htmlspecialchars($q['status']) ?></span>
                <?php endif; ?>
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <?php if ($q['status'] === 'waiting'): ?>
                    <form action="/doctor/queue/call/<?= $q['id'] ?>" method="POST">
                      <?= Csrf::field() ?>
                      <button type="submit" class="btn btn-primary btn-sm">Gọi bệnh nhân</button>
                    </form>
                    <form action="/doctor/queue/skip/<?= $q['id'] ?>" method="POST">
                      <?= Csrf::field() ?>
                      <button type="submit" class="btn btn-secondary btn-sm" title="Tạm qua lượt">Qua lượt</button>
                    </form>
                  <?php elseif ($q['status'] === 'calling'): ?>
                    <form action="/doctor/queue/start/<?= $q['id'] ?>" method="POST">
                      <?= Csrf::field() ?>
                      <button type="submit" class="btn btn-primary btn-sm" style="background:#0284c7;">Vào phòng khám</button>
                    </form>
                  <?php elseif ($q['status'] === 'in_room'): ?>
                    <a href="/doctor/examine/<?= $q['appointment_id'] ?>" class="btn btn-primary btn-sm">
                      Mở hồ sơ khám &rarr;
                    </a>
                  <?php else: ?>
                    <a href="/doctor/examine/<?= $q['appointment_id'] ?>" class="btn btn-secondary btn-sm">
                      Xem lại kết quả
                    </a>
                  <?php endif; ?>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
