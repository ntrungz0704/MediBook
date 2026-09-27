<?php
use App\Core\Auth;
use App\Core\Helper;
?>
<header class="site-header">
  <div class="container navbar">
    <!-- Brand Logo -->
    <a href="/" class="brand-logo">
      <div class="brand-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor"/>
          <path d="M12 5v14M5 12h14" stroke="#ffffff" stroke-width="3"/>
        </svg>
      </div>
      <div style="display:flex; align-items:baseline;">
        <span class="brand-text">Medi<span>Book</span></span>
        <span class="brand-tagline">Khỏe hơn mỗi ngày</span>
      </div>
    </a>

    <!-- Nav Links -->
    <ul class="nav-links">
      <li><a href="/" class="<?= ($_SERVER['REQUEST_URI'] ?? '/') === '/' ? 'active' : '' ?>">Trang chủ</a></li>
      <li><a href="/specialties" class="<?= str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/specialties') ? 'active' : '' ?>">Chuyên khoa</a></li>
      <li><a href="/doctors" class="<?= str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/doctors') ? 'active' : '' ?>">Bác sĩ</a></li>
      <li><a href="/appointments/book" class="<?= str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/appointments/book') ? 'active' : '' ?>">Dịch vụ</a></li>
      <li><a href="#footer-contact">Liên hệ</a></li>
    </ul>

    <!-- Header Actions -->
    <div class="nav-actions">
      <a href="/doctors" class="btn-icon-search" title="Tìm bác sĩ, chuyên khoa">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </a>

      <?php if (Auth::check()): ?>
        <?php if (Auth::role() === 'admin'): ?>
          <a href="/admin/dashboard" class="btn btn-secondary btn-sm">Quản trị</a>
        <?php elseif (Auth::role() === 'doctor'): ?>
          <a href="/doctor/dashboard" class="btn btn-secondary btn-sm">Bác sĩ</a>
        <?php elseif (Auth::role() === 'receptionist'): ?>
          <a href="/receptionist/dashboard" class="btn btn-secondary btn-sm">Lễ tân</a>
        <?php else: ?>
          <a href="/my-appointments" class="btn btn-secondary btn-sm">Lịch của tôi</a>
        <?php endif; ?>
        
        <a href="/profile" class="btn btn-outline btn-sm">Tài khoản</a>
        <a href="/logout" class="btn btn-secondary btn-sm" title="Đăng xuất">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </a>
      <?php else: ?>
        <a href="/login" class="btn btn-outline">Đăng nhập</a>
      <?php endif; ?>

      <a href="/appointments/book" class="btn btn-primary">Đặt lịch</a>
    </div>
  </div>
</header>
