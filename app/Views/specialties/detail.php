<?php
use App\Core\Helper;
?>
<div class="container" style="padding: 40px 20px 80px;">
  <div style="margin-bottom: 30px;">
    <a href="/specialties" style="color: var(--primary); font-weight: 600; font-size: 14px;">&larr; Tất cả chuyên khoa</a>
    <h1 class="section-title" style="margin-top: 10px;"><?= htmlspecialchars($specialty['name']) ?></h1>
    <p style="color: var(--text-muted); font-size: 16px;"><?= htmlspecialchars($specialty['description']) ?></p>
  </div>

  <!-- Services offered in this specialty -->
  <?php if (!empty($services)): ?>
    <div class="card-box" style="padding: 24px; margin-bottom: 36px;">
      <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">Dịch vụ thăm khám & Bảng giá</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
        <?php foreach ($services as $srv): ?>
          <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;"><?= htmlspecialchars($srv['name']) ?></div>
              <div style="font-size: 12.5px; color: var(--text-muted);">Thời lượng: <?= (int)$srv['duration_minutes'] ?> phút</div>
            </div>
            <div style="font-size: 16px; font-weight: 800; color: var(--primary);">
              <?= Helper::formatCurrency((float)$srv['price']) ?>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  <?php endif; ?>

  <!-- Doctors in this specialty -->
  <h2 class="section-title" style="font-size: 22px; margin-bottom: 20px;">Bác sĩ phụ trách chuyên khoa</h2>
  <div class="doctors-grid">
    <?php foreach ($doctors as $index => $doc): ?>
      <div class="doctor-card">
        <div class="doctor-card-top">
          <img src="/assets/images/avatar-doctor<?= (($index % 4) + 1) ?>.svg" alt="<?= htmlspecialchars($doc['name']) ?>" class="doctor-img">
        </div>
        <div class="doctor-card-body">
          <h3 class="doctor-name"><?= htmlspecialchars($doc['title'] . ' ' . $doc['name']) ?></h3>
          <div class="doctor-specialty"><?= htmlspecialchars($specialty['name']) ?> &bull; <?= htmlspecialchars($doc['room_number']) ?></div>
          <div class="doctor-meta">
            <div class="doctor-rating">
              ⭐ <?= number_format((float)$doc['rating'], 1) ?>
            </div>
            <span class="doctor-badge-exp"><?= (int)$doc['experience_years'] ?>+ năm kinh nghiệm</span>
          </div>
          <div style="margin-top: 14px;">
            <a href="/appointments/book?specialty_id=<?= $specialty['id'] ?>&doctor_id=<?= $doc['id'] ?>" class="btn btn-primary btn-block btn-sm">
              Đặt lịch khám
            </a>
          </div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div>
