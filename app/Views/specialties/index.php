<div class="container" style="padding: 40px 20px 80px;">
  <div style="margin-bottom: 30px;">
    <h1 class="section-title">Danh sách Chuyên khoa phòng khám</h1>
    <p style="color: var(--text-muted);">Đội ngũ y bác sĩ đầu ngành sẵn sàng chăm sóc sức khỏe cho bạn và gia đình</p>
  </div>

  <div class="specialties-grid">
    <?php foreach ($specialties as $sp): ?>
      <a href="/specialties/<?= $sp['slug'] ?>" class="specialty-card" style="padding: 24px;">
        <div class="specialty-icon-circle" style="width: 58px; height: 58px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
            <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
          </svg>
        </div>
        <div class="specialty-info">
          <h4 style="font-size: 17px;"><?= htmlspecialchars($sp['name']) ?></h4>
          <p><?= htmlspecialchars($sp['description']) ?></p>
          <span style="font-size: 12px; font-weight: 700; color: var(--primary); margin-top: 6px; display: inline-block;">
            <?= (int)($sp['doctor_count'] ?? 1) ?> Bác sĩ chuyên khoa &rarr;
          </span>
        </div>
      </a>
    <?php endforeach; ?>
  </div>
</div>
