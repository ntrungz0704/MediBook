<?php
use App\Core\Helper;
?>
<div class="container" style="max-width: 900px; padding: 40px 20px 80px;">
  <a href="/doctors" style="color: var(--primary); font-weight: 600; font-size: 14px;">&larr; Tất cả bác sĩ</a>

  <!-- Doctor Profile Header Card -->
  <div class="card-box" style="padding: 30px; margin: 20px 0 30px; display: flex; gap: 30px; align-items: center; flex-wrap: wrap;">
    <div style="width: 140px; height: 140px; border-radius: var(--radius-md); overflow: hidden; background: #f1f5f9; flex-shrink: 0;">
      <img src="/assets/images/avatar-doctor1.svg" alt="<?= htmlspecialchars($doctor['name']) ?>" style="width:100%;height:100%;object-fit:cover;">
    </div>

    <div style="flex-grow: 1;">
      <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 6px;">
        <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0;">
          <?= htmlspecialchars($doctor['title'] . ' ' . $doctor['name']) ?>
        </h1>
        <span class="badge badge-primary"><?= (int)$doctor['experience_years'] ?>+ năm KN</span>
      </div>

      <div style="font-size: 15px; color: var(--text-muted); margin-bottom: 12px;">
        Chuyên khoa: <strong><?= htmlspecialchars($doctor['specialty_names'] ?: 'Nội tổng quát') ?></strong> &bull; Phòng khám: <strong><?= htmlspecialchars($doctor['room_number']) ?></strong>
      </div>

      <div style="display: flex; align-items: center; gap: 20px; font-size: 14px;">
        <div>⭐ <strong><?= number_format((float)$doctor['rating'], 1) ?>/5</strong> (<?= (int)$doctor['rating_count'] ?> đánh giá)</div>
        <div>Phí khám: <strong style="color:var(--primary);"><?= Helper::formatCurrency((float)$doctor['consultation_fee']) ?></strong></div>
      </div>
    </div>

    <div>
      <a href="/appointments/book?doctor_id=<?= $doctor['id'] ?>" class="btn btn-primary btn-lg">
        Đặt lịch với bác sĩ &rarr;
      </a>
    </div>
  </div>

  <!-- Bio & Working Schedule -->
  <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; margin-bottom: 30px;">
    <div class="card-box" style="padding: 24px;">
      <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">Tiểu sử & Chuyên môn</h3>
      <p style="color: #475569; line-height: 1.7;"><?= nl2br(htmlspecialchars($doctor['bio'] ?: 'Bác sĩ chuyên khoa giàu kinh nghiệm và tận tâm với bệnh nhân.')) ?></p>
    </div>

    <div class="card-box" style="padding: 24px;">
      <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 14px;">Lịch trực hàng tuần</h3>
      <?php if (empty($schedules)): ?>
        <p class="text-muted">Chưa cập nhật lịch trực.</p>
      <?php else: ?>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <?php foreach ($schedules as $sc): ?>
            <li style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-light); padding-bottom:6px;">
              <strong><?= Helper::getDayOfWeekName((int)$sc['day_of_week']) ?></strong>
              <span><?= Helper::formatTimeSlot($sc['start_time'], $sc['end_time']) ?></span>
            </li>
          <?php endforeach; ?>
        </ul>
      <?php endif; ?>
    </div>
  </div>

  <!-- Patient Reviews -->
  <div class="card-box" style="padding: 28px;">
    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px;">
      Đánh giá từ bệnh nhân (<?= count($reviews) ?>)
    </h3>

    <?php if (empty($reviews)): ?>
      <p class="text-muted">Chưa có đánh giá nào cho bác sĩ.</p>
    <?php else: ?>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <?php foreach ($reviews as $rev): ?>
          <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <strong><?= htmlspecialchars($rev['reviewer_name']) ?></strong>
              <span style="color:#d97706;"><?= str_repeat('⭐', (int)$rev['rating']) ?></span>
            </div>
            <p style="color: #475569; font-size: 14px;"><?= htmlspecialchars($rev['comment']) ?></p>
            <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
              <?= Helper::formatDate($rev['created_at']) ?>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</div>
