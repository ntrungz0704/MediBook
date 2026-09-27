<?php
use App\Core\Auth;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($pageTitle ?? 'Quản trị hệ thống - MediBook') ?></title>
  <link rel="stylesheet" href="/assets/css/app.css">
  <link rel="stylesheet" href="/assets/css/dashboard.css">
</head>
<body>
  <div class="dashboard-container">
    <!-- Sidebar -->
    <aside class="dashboard-sidebar">
      <div class="sidebar-header">
        <span>MediBook</span>
        <span class="sidebar-role-badge role-admin">Admin</span>
      </div>

      <ul class="sidebar-nav">
        <li><a href="/admin/dashboard" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/dashboard') ? 'active' : '' ?>">📊 Bảng điều khiển</a></li>
        <li><a href="/admin/users" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/users') ? 'active' : '' ?>">👥 Quản lý người dùng</a></li>
        <li><a href="/admin/doctors" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/doctors') ? 'active' : '' ?>">🩺 Quản lý bác sĩ</a></li>
        <li><a href="/admin/specialties" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/specialties') ? 'active' : '' ?>">🏥 Quản lý chuyên khoa</a></li>
        <li><a href="/admin/services" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/services') ? 'active' : '' ?>">📋 Quản lý dịch vụ</a></li>
        <li><a href="/admin/medicines" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/medicines') ? 'active' : '' ?>">💊 Kho thuốc phòng khám</a></li>
        <li><a href="/admin/schedules" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/schedules') ? 'active' : '' ?>">📅 Ca trực & Nghỉ phép</a></li>
        <li><a href="/admin/appointments" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/appointments') ? 'active' : '' ?>">🗓️ Lịch hẹn khám</a></li>
        <li><a href="/admin/reports" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/reports') ? 'active' : '' ?>">📈 Báo cáo doanh thu</a></li>
        <li><a href="/admin/logs" class="<?= str_contains($_SERVER['REQUEST_URI'] ?? '', '/admin/logs') ? 'active' : '' ?>">🔒 Nhật ký hoạt động</a></li>
        <li style="margin-top:20px;"><a href="/" target="_blank">🌐 Xem trang chủ</a></li>
      </ul>

      <div class="sidebar-footer">
        <span style="font-size:13px;"><?= htmlspecialchars(Auth::user()['name'] ?? 'Admin') ?></span>
        <a href="/logout" style="color:#ef4444;font-size:13px;font-weight:700;">Đăng xuất</a>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="dashboard-main">
      <header class="dashboard-topbar">
        <div class="topbar-title">
          <h2><?= htmlspecialchars($pageTitle ?? 'Quản trị hệ thống') ?></h2>
        </div>
        <div class="topbar-user">
          <div class="user-avatar-circle">AD</div>
          <span style="font-weight:600;"><?= htmlspecialchars(Auth::user()['name'] ?? 'Quản trị viên') ?></span>
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
</body>
</html>
