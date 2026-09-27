<?php
use App\Core\Csrf;
$isEdit = !empty($specialty);
?>
<div class="card-box" style="max-width: 600px; padding: 30px; margin: 0 auto;">
  <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
    <?= $isEdit ? 'Chỉnh sửa chuyên khoa' : 'Thêm chuyên khoa mới' ?>
  </h2>

  <form action="<?= $isEdit ? '/admin/specialties/update/' . $specialty['id'] : '/admin/specialties/store' ?>" method="POST">
    <?= Csrf::field() ?>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Tên chuyên khoa <span style="color:red;">*</span></label>
      <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($specialty['name'] ?? '') ?>" required>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Đường dẫn tĩnh (Slug) <span style="color:red;">*</span></label>
      <input type="text" name="slug" class="form-control" value="<?= htmlspecialchars($specialty['slug'] ?? '') ?>" placeholder="VD: noi-tong-quat" required>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Mô tả ngắn</label>
      <textarea name="description" rows="3" class="form-control"><?= htmlspecialchars($specialty['description'] ?? '') ?></textarea>
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
      <label>Trạng thái</label>
      <select name="status" class="form-control">
        <option value="active" <?= ($specialty['status'] ?? '') === 'active' ? 'selected' : '' ?>>Hoạt động</option>
        <option value="inactive" <?= ($specialty['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Tạm ẩn</option>
      </select>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 12px;">
      <a href="/admin/specialties" class="btn btn-secondary">Hủy</a>
      <button type="submit" class="btn btn-primary">
        <?= $isEdit ? 'Lưu thay đổi' : 'Tạo chuyên khoa' ?>
      </button>
    </div>
  </form>
</div>
