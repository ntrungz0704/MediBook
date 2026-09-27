<?php
use App\Core\Auth;
?>
<footer class="site-footer" id="footer-contact">
  <div class="container">
    <div class="footer-grid">
      <!-- Col 1 -->
      <div class="footer-brand">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div class="brand-icon" style="width:34px;height:34px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14" stroke="#ffffff" stroke-width="3"/>
            </svg>
          </div>
          <h4 style="margin:0;font-size:22px;color:#fff;">Medi<span style="color:#14b8a6;">Book</span></h4>
        </div>
        <p>Hệ thống đặt lịch khám bệnh thông minh kết nối đội ngũ bác sĩ uy tín tại các phòng khám hàng đầu Việt Nam.</p>
        <div style="font-size:13.5px;color:#cbd5e1;line-height:1.7;">
          <div>📍 <?= htmlspecialchars(CLINIC_ADDRESS) ?></div>
          <div>📞 Tổng đài: <strong><?= htmlspecialchars(CLINIC_PHONE) ?></strong> - Hotline: <strong><?= htmlspecialchars(CLINIC_HOTLINE) ?></strong></div>
          <div>✉️ Email: <?= htmlspecialchars(CLINIC_EMAIL) ?></div>
        </div>
      </div>

      <!-- Col 2 -->
      <div class="footer-col">
        <h5>Chuyên khoa</h5>
        <ul class="footer-links">
          <li><a href="/specialties/noi-tong-quat">Nội tổng quát</a></li>
          <li><a href="/specialties/nhi-khoa">Nhi khoa</a></li>
          <li><a href="/specialties/san-phu-khoa">Sản phụ khoa</a></li>
          <li><a href="/specialties/tim-mach">Tim mạch</a></li>
          <li><a href="/specialties/da-lieu">Da liễu</a></li>
          <li><a href="/specialties">Xem tất cả chuyên khoa &rarr;</a></li>
        </ul>
      </div>

      <!-- Col 3 -->
      <div class="footer-col">
        <h5>Liên kết nhanh</h5>
        <ul class="footer-links">
          <li><a href="/">Trang chủ</a></li>
          <li><a href="/doctors">Đội ngũ bác sĩ</a></li>
          <li><a href="/appointments/book">Đặt lịch khám</a></li>
          <li><a href="/receptionist/live-board" target="_blank">Màn hình gọi số sảnh chờ</a></li>
          <li><a href="/login">Đăng nhập tài khoản</a></li>
        </ul>
      </div>

      <!-- Col 4: Giờ làm việc -->
      <div class="footer-col">
        <h5>Thời gian phục vụ</h5>
        <div style="background:#1e293b;padding:16px;border-radius:12px;font-size:13px;color:#cbd5e1;line-height:1.6;">
          <div style="font-weight:700;color:#fff;margin-bottom:6px;">⏰ Giờ mở cửa:</div>
          <div><?= htmlspecialchars(CLINIC_OPENING_HOURS) ?></div>
          <div style="margin-top:10px;color:#2dd4bf;font-weight:600;">Ưu tiên tiếp đón bệnh nhân đã đặt lịch trước qua website.</div>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; <?= date('Y') ?> MediBook Healthcare Platform. Bảo lưu mọi quyền.</p>
    </div>
  </div>
</footer>

<!-- MOBILE BOTTOM NAVIGATION (MATCHING MOBILE MOCKUP 9:16) -->
<nav class="mobile-bottom-nav">
  <div class="mobile-bottom-nav-inner">
    <a href="/" class="nav-bottom-item <?= ($_SERVER['REQUEST_URI'] ?? '/') === '/' ? 'active' : '' ?>">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <span>Trang chủ</span>
    </a>

    <a href="/doctors" class="nav-bottom-item <?= str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/doctors') ? 'active' : '' ?>">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <span>Bác sĩ</span>
    </a>

    <a href="/appointments/book" class="nav-bottom-item" style="overflow:visible;">
      <div class="nav-bottom-fab">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <span style="margin-top:-6px;">Đặt lịch</span>
    </a>

    <a href="/my-appointments" class="nav-bottom-item <?= str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/my-appointments') ? 'active' : '' ?>">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span>Lịch của tôi</span>
    </a>

    <a href="<?= Auth::check() ? '/profile' : '/login' ?>" class="nav-bottom-item <?= str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/profile') || str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/login') ? 'active' : '' ?>">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      <span>Tài khoản</span>
    </a>
  </div>
</nav>
