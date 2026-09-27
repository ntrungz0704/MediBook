<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div style="display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 24px; align-items: start;">
  
  <!-- Left Side: Doctor Shifts Table -->
  <div class="card-box">
    <div class="card-header-bar">
      <h3>Phân công ca làm việc bác sĩ</h3>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Bác sĩ</th>
            <th>Phòng</th>
            <th>Thứ</th>
            <th>Khung giờ</th>
            <th>Tối đa</th>
            <th>Xóa</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($schedules)): ?>
            <tr><td colspan="6" style="text-align:center;padding:20px;">Chưa có ca làm việc nào.</td></tr>
          <?php else: ?>
            <?php foreach ($schedules as $s): ?>
              <tr>
                <td><strong><?= htmlspecialchars($s['doctor_title'] . ' ' . $s['doctor_name']) ?></strong></td>
                <td><span class="badge badge-info"><?= htmlspecialchars($s['room_number']) ?></span></td>
                <td><?= Helper::getDayOfWeekName((int)$s['day_of_week']) ?></td>
                <td><?= Helper::formatTimeSlot($s['start_time'], $s['end_time']) ?></td>
                <td><?= (int)$s['max_patients'] ?> người</td>
                <td>
                  <form action="/admin/schedules/delete/<?= $s['id'] ?>" method="POST" onsubmit="return confirm('Xóa ca trực này?');">
                    <?= Csrf::field() ?>
                    <button type="submit" class="btn btn-outline btn-sm" style="color:#ef4444; border-color:#fca5a5; padding: 2px 8px;">
                      &times;
                    </button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Right Side: Add Shift Form & Leave Approval -->
  <div style="display: flex; flex-direction: column; gap: 24px;">
    
    <!-- Add Shift Form -->
    <div class="card-box" style="padding: 24px;">
      <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 16px;">
        ➕ Thêm ca làm việc mới
      </h3>

      <form action="/admin/schedules/store" method="POST">
        <?= Csrf::field() ?>

        <div class="form-group" style="margin-bottom: 14px;">
          <label>Bác sĩ <span style="color:red;">*</span></label>
          <select name="doctor_id" class="form-control" required>
            <?php foreach ($doctors as $d): ?>
              <option value="<?= $d['id'] ?>"><?= htmlspecialchars($d['title'] . ' ' . $d['name'] . ' (' . $d['room_number'] . ')') ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label>Thứ trong tuần <span style="color:red;">*</span></label>
          <select name="day_of_week" class="form-control" required>
            <option value="1">Thứ hai</option>
            <option value="2">Thứ ba</option>
            <option value="3">Thứ tư</option>
            <option value="4">Thứ năm</option>
            <option value="5">Thứ sáu</option>
            <option value="6">Thứ bảy</option>
            <option value="0">Chủ nhật</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label>Giờ bắt đầu</label>
            <input type="time" name="start_time" class="form-control" value="08:00" required>
          </div>
          <div class="form-group">
            <label>Giờ kết thúc</label>
            <input type="time" name="end_time" class="form-control" value="17:00" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
          <div class="form-group">
            <label>Phút / lượt khám</label>
            <input type="number" name="slot_duration" class="form-control" value="30" required>
          </div>
          <div class="form-group">
            <label>Số người tối đa</label>
            <input type="number" name="max_patients" class="form-control" value="20" required>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block">
          Lưu ca trực
        </button>
      </form>
    </div>

    <!-- Doctor Leaves Approval List -->
    <div class="card-box" style="padding: 20px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 14px;">
        🏖️ Đơn xin nghỉ phép của bác sĩ
      </h3>

      <?php if (empty($leaves)): ?>
        <p class="text-muted" style="font-size:13px;">Không có đơn xin nghỉ phép nào.</p>
      <?php else: ?>
        <div style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
          <?php foreach ($leaves as $l): ?>
            <div style="border-bottom:1px solid var(--border-light); padding-bottom:10px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <strong><?= htmlspecialchars($l['doctor_title'] . ' ' . $l['doctor_name']) ?></strong>
                <span class="badge <?= $l['status'] === 'approved' ? 'badge-success' : ($l['status'] === 'pending' ? 'badge-warning' : 'badge-danger') ?>">
                  <?= $l['status'] === 'approved' ? 'Đã duyệt' : ($l['status'] === 'pending' ? 'Chờ duyệt' : 'Từ chối') ?>
                </span>
              </div>
              <div style="color:var(--text-muted);">
                Ngày nghỉ: <strong><?= Helper::formatDate($l['leave_date']) ?></strong> &bull; Lý do: <?= htmlspecialchars($l['reason']) ?>
              </div>
              <?php if ($l['status'] === 'pending'): ?>
                <div style="display:flex; gap:6px; margin-top:6px;">
                  <form action="/admin/leaves/update/<?= $l['id'] ?>" method="POST">
                    <?= Csrf::field() ?>
                    <input type="hidden" name="status" value="approved">
                    <button type="submit" class="btn btn-primary btn-sm" style="font-size:11px;padding:2px 8px;">Duyệt nghỉ</button>
                  </form>
                  <form action="/admin/leaves/update/<?= $l['id'] ?>" method="POST">
                    <?= Csrf::field() ?>
                    <input type="hidden" name="status" value="rejected">
                    <button type="submit" class="btn btn-outline btn-sm" style="font-size:11px;padding:2px 8px;color:#ef4444;border-color:#fca5a5;">Từ chối</button>
                  </form>
                </div>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>

  </div>

</div>
