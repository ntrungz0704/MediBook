<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div class="card-box" style="padding: 20px; margin-bottom: 24px;">
  <form action="/admin/users" method="GET" style="display: flex; gap: 14px; align-items: flex-end;">
    <div class="form-group" style="flex: 2;">
      <label>Tìm kiếm tài khoản</label>
      <input type="text" name="keyword" class="form-control" placeholder="Họ tên, email hoặc số điện thoại..." value="<?= htmlspecialchars($keyword ?? '') ?>">
    </div>

    <div class="form-group" style="flex: 1;">
      <label>Vai trò</label>
      <select name="role" class="form-control">
        <option value="">-- Tất cả vai trò --</option>
        <option value="admin" <?= ($role ?? '') === 'admin' ? 'selected' : '' ?>>Admin</option>
        <option value="doctor" <?= ($role ?? '') === 'doctor' ? 'selected' : '' ?>>Bác sĩ</option>
        <option value="receptionist" <?= ($role ?? '') === 'receptionist' ? 'selected' : '' ?>>Lễ tân</option>
        <option value="patient" <?= ($role ?? '') === 'patient' ? 'selected' : '' ?>>Bệnh nhân</option>
      </select>
    </div>

    <button type="submit" class="btn btn-primary" style="height: 48px; padding: 0 24px;">
      🔍 Lọc
    </button>
  </form>
</div>

<div class="card-box">
  <div class="card-header-bar">
    <h3>Danh sách người dùng (<?= count($users) ?> tài khoản)</h3>
    <a href="/admin/users/create" class="btn btn-primary btn-sm">➕ Thêm tài khoản mới</a>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Họ tên & Email</th>
          <th>Số điện thoại</th>
          <th>Vai trò</th>
          <th>Thông tin thêm</th>
          <th>Trạng thái</th>
          <th>Ngày tạo</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($users as $u): ?>
          <tr>
            <td><?= $u['id'] ?></td>
            <td>
              <strong><?= htmlspecialchars($u['name']) ?></strong><br>
              <small class="text-muted"><?= htmlspecialchars($u['email']) ?></small>
            </td>
            <td><?= htmlspecialchars($u['phone'] ?: '-') ?></td>
            <td>
              <?php if ($u['role'] === 'admin'): ?>
                <span class="sidebar-role-badge role-admin">Admin</span>
              <?php elseif ($u['role'] === 'doctor'): ?>
                <span class="sidebar-role-badge role-doctor">Bác sĩ</span>
              <?php elseif ($u['role'] === 'receptionist'): ?>
                <span class="sidebar-role-badge role-receptionist">Lễ tân</span>
              <?php else: ?>
                <span class="badge badge-secondary">Bệnh nhân</span>
              <?php endif; ?>
            </td>
            <td>
              <?php if ($u['role'] === 'doctor'): ?>
                <?= htmlspecialchars($u['doctor_title'] . ' - ' . $u['room_number']) ?>
              <?php elseif ($u['role'] === 'receptionist'): ?>
                Mã: <?= htmlspecialchars($u['staff_code']) ?>
              <?php else: ?>
                <?= htmlspecialchars($u['gender'] ?? '-') ?>
              <?php endif; ?>
            </td>
            <td>
              <?php if ($u['status'] === 'active'): ?>
                <span class="badge badge-success">Hoạt động</span>
              <?php else: ?>
                <span class="badge badge-danger">Đã khóa</span>
              <?php endif; ?>
            </td>
            <td><?= Helper::formatDate($u['created_at']) ?></td>
            <td>
              <div style="display:flex; gap: 6px;">
                <a href="/admin/users/edit/<?= $u['id'] ?>" class="btn btn-secondary btn-sm">Sửa</a>
                <form action="/admin/users/toggle/<?= $u['id'] ?>" method="POST" style="display:inline;" onsubmit="return confirm('Thay đổi trạng thái tài khoản này?');">
                  <?= Csrf::field() ?>
                  <button type="submit" class="btn btn-outline btn-sm" style="color:#ef4444; border-color:#fca5a5;">
                    <?= $u['status'] === 'active' ? 'Khóa' : 'Mở' ?>
                  </button>
                </form>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
