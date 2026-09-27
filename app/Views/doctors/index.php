<div class="container" style="padding: 40px 20px 80px;">
  <div style="margin-bottom: 30px;">
    <h1 class="section-title">Đội ngũ Bác sĩ chuyên khoa MediBook</h1>
    <p style="color: var(--text-muted);">Các bác sĩ giàu kinh nghiệm, tận tâm, từng công tác tại các bệnh viện hàng đầu</p>
  </div>

  <div class="doctors-grid">
    <?php foreach ($doctors as $index => $doc): ?>
      <div class="doctor-card">
        <div class="doctor-card-top">
          <img src="/assets/images/avatar-doctor<?= (($index % 4) + 1) ?>.svg" alt="<?= htmlspecialchars($doc['name']) ?>" class="doctor-img">
          <button type="button" class="btn-favorite" title="Lưu bác sĩ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
        </div>
        <div class="doctor-card-body">
          <h3 class="doctor-name">
            <a href="/doctors/<?= $doc['id'] ?>"><?= htmlspecialchars($doc['title'] . ' ' . $doc['name']) ?></a>
          </h3>
          <div class="doctor-specialty"><?= htmlspecialchars($doc['specialty_names'] ?: 'Nội tổng quát') ?> &bull; <?= htmlspecialchars($doc['room_number']) ?></div>

          <div class="doctor-meta">
            <div class="doctor-rating">
              ⭐ <?= number_format((float)$doc['rating'], 1) ?>
              <span class="doctor-reviews-count">(<?= (int)$doc['rating_count'] ?>)</span>
            </div>
            <span class="doctor-badge-exp"><?= (int)$doc['experience_years'] ?>+ năm KN</span>
          </div>

          <div style="display:flex;gap:8px;margin-top:16px;">
            <a href="/doctors/<?= $doc['id'] ?>" class="btn btn-secondary btn-sm" style="flex:1;">Hồ sơ</a>
            <a href="/appointments/book?doctor_id=<?= $doc['id'] ?>" class="btn btn-primary btn-sm" style="flex:1;">Đặt lịch</a>
          </div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div>
