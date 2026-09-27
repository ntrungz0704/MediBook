<?php
use App\Core\Csrf;
use App\Core\Auth;
?>
<div class="container" style="max-width: 800px; padding: 40px 20px 80px;">
  <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 24px;">Hồ sơ cá nhân</h1>

  <div class="card-box" style="padding: 30px; margin-bottom: 30px;">
    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px;">
      Thông tin tài khoản & Y tế
    </h3>

    <form action="/profile" method="POST">
      <?= Csrf::field() ?>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div class="form-group">
          <label>Họ và tên <span style="color:red;">*</span></label>
          <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($user['name']) ?>" required>
        </div>
        <div class="form-group">
          <label>Số điện thoại <span style="color:red;">*</span></label>
          <input type="tel" name="phone" class="form-control" value="<?= htmlspecialchars($user['phone'] ?? '') ?>" required>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label>Địa chỉ Email (Không đổi)</label>
        <input type="email" class="form-control" value="<?= htmlspecialchars($user['email']) ?>" disabled style="background:#f1f5f9;">
      </div>

      <?php if (Auth::role() === 'patient'): ?>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label>Ngày sinh</label>
            <input type="date" name="dob" class="form-control" value="<?= htmlspecialchars($patient['dob'] ?? '') ?>">
          </div>
          <div class="form-group">
            <label>Giới tính</label>
            <select name="gender" class="form-control">
              <option value="male" <?= ($patient['gender'] ?? '') === 'male' ? 'selected' : '' ?>>Nam</option>
              <option value="female" <?= ($patient['gender'] ?? '') === 'female' ? 'selected' : '' ?>>Nữ</option>
              <option value="other" <?= ($patient['gender'] ?? '') === 'other' ? 'selected' : '' ?>>Khác</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nhóm máu</label>
            <input type="text" name="blood_group" class="form-control" placeholder="A, B, AB, O..." value="<?= htmlspecialchars($patient['blood_group'] ?? '') ?>">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>Mã thẻ BHYT (Nếu có)</label>
          <input type="text" name="health_insurance_no" class="form-control" placeholder="VD: DN479..." value="<?= htmlspecialchars($patient['health_insurance_no'] ?? '') ?>">
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>Địa chỉ thường trú</label>
          <input type="text" name="address" class="form-control" placeholder="Số nhà, tên đường, quận/huyện, tỉnh/thành" value="<?= htmlspecialchars($patient['address'] ?? '') ?>">
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>Người liên hệ khẩn cấp</label>
          <input type="text" name="emergency_contact" class="form-control" placeholder="Họ tên người thân - SĐT" value="<?= htmlspecialchars($patient['emergency_contact'] ?? '') ?>">
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label>Tiền sử dị ứng & bệnh mạn tính</label>
          <textarea name="medical_history" rows="2" class="form-control" placeholder="Dị ứng thuốc, thức ăn, hen suyễn, tiểu đường..."><?= htmlspecialchars($patient['medical_history'] ?? '') ?></textarea>
        </div>
      <?php endif; ?>

      <button type="submit" class="btn btn-primary">
        Lưu thông tin hồ sơ
      </button>
    </form>
  </div>

  <!-- Change Password Box -->
  <div class="card-box" style="padding: 30px;">
    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px;">
      Đổi mật khẩu bảo vệ
    </h3>

    <form action="/profile/password" method="POST">
      <?= Csrf::field() ?>

      <div class="form-group" style="margin-bottom: 16px;">
        <label>Mật khẩu hiện tại</label>
        <input type="password" name="current_password" class="form-control" placeholder="••••••••" required>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div class="form-group">
          <label>Mật khẩu mới</label>
          <input type="password" name="new_password" class="form-control" placeholder="Ít nhất 6 ký tự" required minlength="6">
        </div>
        <div class="form-group">
          <label>Nhập lại mật khẩu mới</label>
          <input type="password" name="new_password_confirmation" class="form-control" placeholder="••••••••" required minlength="6">
        </div>
      </div>

      <button type="submit" class="btn btn-secondary">
        Cập nhật mật khẩu
      </button>
    </form>
  </div>
</div>
