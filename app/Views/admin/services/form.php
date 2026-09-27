<?php
use App\Core\Csrf;
$isEdit = !empty($service);
?>
<div class="card-box" style="max-width: 600px; padding: 30px; margin: 0 auto;">
  <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
    <?= $isEdit ? 'Chỉnh sửa dịch vụ khám' : 'Thêm dịch vụ khám mới' ?>
  </h2>

  <form action="<?= $isEdit ? '/admin/services/update/' . $service['id'] : '/admin/services/store' ?>" method="POST">
    <?= Csrf::field() ?>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Chuyên khoa liên quan <span style="color:red;">*</span></label>
      <select name="specialty_id" class="form-control" required>
        <?php foreach ($specialties as $sp): ?>
          <option value="<?= $sp['id'] ?>" <?= ($service['specialty_id'] ?? 0) == $sp['id'] ? 'selected' : '' ?>>
            <?= htmlspecialchars($sp['name']) ?>
          </option>
        <?php endforeach; ?>
      </select>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Tên dịch vụ khám <span style="color:red;">*</span></label>
      <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($service['name'] ?? '') ?>" required>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label>Giá dịch vụ (VNĐ) <span style="color:red;">*</span></label>
        <input type="number" name="price" class="form-control" value="<?= (float)($service['price'] ?? 200000) ?>" required step="10000">
      </div>

      <div class="form-group">
        <label>Thời lượng khám (phút)</label>
        <input type="number" name="duration_minutes" class="form-control" value="<?= (int)($service['duration_minutes'] ?? 30) ?>" required>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Mô tả dịch vụ</label>
      <textarea name="description" rows="3" class="form-control"><?= htmlspecialchars($service['description'] ?? '') ?></textarea>
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
      <label>Trạng thái</label>
      <select name="status" class="form-control">
        <option value="active" <?= ($service['status'] ?? '') === 'active' ? 'selected' : '' ?>>Hoạt động</option>
        <option value="inactive" <?= ($service['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Tạm ngừng</option>
      </select>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 12px;">
      <a href="/admin/services" class="btn btn-secondary">Hủy</a>
      <button type="submit" class="btn btn-primary">
        <?= $isEdit ? 'Lưu thay đổi' : 'Tạo dịch vụ' ?>
      </button>
    </div>
  </form>
</div>
