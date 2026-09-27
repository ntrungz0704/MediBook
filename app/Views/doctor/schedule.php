<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
  
  <!-- Weekly Shifts -->
  <div class="card-box">
    <div class="card-header-bar">
      <h3>Ca trực cố định hàng tuần</h3>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Thứ trong tuần</th>
            <th>Khung giờ làm việc</th>
            <th>Thời lượng / ca</th>
            <th>Số bệnh nhân tối đa</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($schedules)): ?>
            <tr>
              <td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">
                Chưa có ca làm việc nào được phân công. Vui lòng liên hệ Admin.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($schedules as $s): ?>
              <tr>
                <td><strong><?= Helper::getDayOfWeekName((int)$s['day_of_week']) ?></strong></td>
                <td><?= Helper::formatTimeSlot($s['start_time'], $s['end_time']) ?></td>
                <td><?= (int)$s['slot_duration'] ?> phút</td>
                <td><?= (int)$s['max_patients'] ?> người</td>
                <td><span class="badge badge-success">Đang hoạt động</span></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Leave Registration & History -->
  <div style="display: flex; flex-direction: column; gap: 20px;">
    
    <!-- Register Leave Form -->
    <div class="card-box" style="padding: 24px;">
      <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 16px;">
        Đăng ký ngày nghỉ phép
      </h3>

      <form action="/doctor/leave/request" method="POST">
        <?= Csrf::field() ?>

        <div class="form-group" style="margin-bottom: 14px;">
          <label>Ngày xin nghỉ <span style="color:red;">*</span></label>
          <input type="date" name="leave_date" class="form-control" min="<?= date('Y-m-d') ?>" required>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>Lý do nghỉ phép <span style="color:red;">*</span></label>
          <input type="text" name="reason" class="form-control" placeholder="Việc cá nhân, tập huấn, ốm..." required>
        </div>

        <button type="submit" class="btn btn-primary btn-sm">
          Gửi yêu cầu nghỉ phép
        </button>
      </form>
    </div>

    <!-- Leave History -->
    <div class="card-box" style="padding: 20px;">
      <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">Lịch sử ngày nghỉ</h4>
      <?php if (empty($leaves)): ?>
        <p class="text-muted" style="font-size: 13px;">Chưa có ngày nghỉ nào được đăng ký.</p>
      <?php else: ?>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
          <?php foreach ($leaves as $l): ?>
            <li style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding-bottom:6px;">
              <div>
                <strong><?= Helper::formatDate($l['leave_date']) ?></strong>
                <div style="color:var(--text-muted);"><?= htmlspecialchars($l['reason']) ?></div>
              </div>
              <div>
                <?php if ($l['status'] === 'approved'): ?>
                  <span class="badge badge-success">Đã duyệt</span>
                <?php elseif ($l['status'] === 'pending'): ?>
                  <span class="badge badge-warning">Chờ duyệt</span>
                <?php else: ?>
                  <span class="badge badge-danger">Từ chối</span>
                <?php endif; ?>
              </div>
            </li>
          <?php endforeach; ?>
        </ul>
      <?php endif; ?>
    </div>

  </div>

</div>
