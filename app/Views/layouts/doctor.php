<?php
use App\Core\Auth;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($pageTitle ?? 'Bác sĩ - MediBook') ?></title>
  <link rel="stylesheet" href="/assets/css/app.css">
  <link rel="stylesheet" href="/assets/css/dashboard.css">
</head>
<body>
  <div class="dashboard-container">
    <aside class="dashboard-sidebar">
      <div class="sidebar-header">
        <span>MediBook</span>
        <span class="sidebar-role-badge role-doctor">Bác sĩ</span>
      </div>

      <ul class="sidebar-nav">
        <li><a href="/doctor/dashboard" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/doctor/dashboard') ? 'active' : '' ?>">📊 Tổng quan ca trực</a></li>
        <li><a href="/doctor/queue" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/doctor/queue') ? 'active' : '' ?>">🩺 Hàng đợi khám bệnh</a></li>
        <li><a href="/doctor/schedule" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/doctor/schedule') ? 'active' : '' ?>">📅 Ca trực & Xin nghỉ</a></li>
        <li style="margin-top:20px;"><a href="/" target="_blank">🌐 Xem trang chủ</a></li>
      </ul>

      <div class="sidebar-footer">
        <span style="font-size:13px;"><?= htmlspecialchars(Auth::user()['name'] ?? 'Bác sĩ') ?></span>
        <a href="/logout" style="color:#ef4444;font-size:13px;font-weight:700;">Đăng xuất</a>
      </div>
    </aside>

    <div class="dashboard-main">
      <header class="dashboard-topbar">
        <div class="topbar-title">
          <h2><?= htmlspecialchars($pageTitle ?? 'Khu vực làm việc Bác sĩ') ?></h2>
        </div>
        <div class="topbar-user">
          <div class="user-avatar-circle" style="background:#ccfbf1;color:#0f766e;">BS</div>
          <span style="font-weight:600;"><?= htmlspecialchars(Auth::user()['name'] ?? 'Bác sĩ') ?></span>
        </div>
      </header>

      <?php if (!empty($flashSuccess) || !empty($flashError) || !empty($flashInfo)): ?>
        <div style="padding: 20px 30px 0;">
          <?php if (!empty($flashSuccess)): ?>
            <div class="alert alert-success"><?= htmlspecialchars($flashSuccess) ?></div>
          <?php endif; ?>
          <?php if (!empty($flashError)): ?>
            <div class="alert alert-error"><?= htmlspecialchars($flashError) ?></div>
          <?php endif; ?>
          <?php if (!empty($flashInfo)): ?>
            <div class="alert alert-info"><?= htmlspecialchars($flashInfo) ?></div>
          <?php endif; ?>
        </div>
      <?php endif; ?>

      <main class="dashboard-content">
        <?= $content ?>
      </main>
    </div>
  </div>

  <script src="/assets/js/app.js"></script>
  <script src="/assets/js/queue.js"></script>
</body>
</html>
