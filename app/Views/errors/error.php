<div class="container" style="max-width: 600px; padding: 80px 20px; text-align: center;">
  <div style="font-size: 72px; font-weight: 900; color: #cbd5e1; line-height: 1; margin-bottom: 12px;">
    <?= (int)($code ?? 404) ?>
  </div>
  <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
    <?= htmlspecialchars($title ?? 'Đã xảy ra lỗi') ?>
  </h1>
  <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 24px;">
    <?= htmlspecialchars($message ?? 'Trang bạn tìm kiếm không tồn tại hoặc đã bị thay đổi.') ?>
  </p>
  <a href="/" class="btn btn-primary">
    Quay lại trang chủ MediBook &rarr;
  </a>
</div>
