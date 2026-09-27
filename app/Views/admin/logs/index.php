<?php
use App\Core\Helper;
?>
<div class="card-box">
  <div class="card-header-bar">
    <h3>Nhật ký hoạt động bảo mật & kiểm toán (Audit Trail)</h3>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Tài khoản</th>
          <th>Hành động</th>
          <th>Đối tượng</th>
          <th>Chi tiết</th>
          <th>IP & Trình duyệt</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($logs as $l): ?>
          <tr>
            <td style="white-space:nowrap; font-size:12.5px;"><?= Helper::formatDate($l['created_at'], 'H:i:s d/m/Y') ?></td>
            <td>
              <?php if (!empty($l['user_name'])): ?>
                <strong><?= htmlspecialchars($l['user_name']) ?></strong><br>
                <small class="text-muted"><?= htmlspecialchars($l['user_role']) ?></small>
              <?php else: ?>
                <span class="text-muted">Khách vãng lai / Hệ thống</span>
              <?php endif; ?>
            </td>
            <td><code><?= htmlspecialchars($l['action']) ?></code></td>
            <td><?= htmlspecialchars(($l['entity_type'] ?? '') . ' #' . ($l['entity_id'] ?? '')) ?></td>
            <td><?= htmlspecialchars($l['details'] ?? '-') ?></td>
            <td style="font-size:12px; color:var(--text-muted);">
              <?= htmlspecialchars($l['ip_address'] ?? '') ?>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
