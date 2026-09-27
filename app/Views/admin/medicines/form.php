<?php
use App\Core\Csrf;
$isEdit = !empty($medicine);
?>
<div class="card-box" style="max-width: 600px; padding: 30px; margin: 0 auto;">
  <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
    <?= $isEdit ? 'Chỉnh sửa thông tin thuốc' : 'Thêm loại thuốc mới' ?>
  </h2>

  <form action="<?= $isEdit ? '/admin/medicines/update/' . $medicine['id'] : '/admin/medicines/store' ?>" method="POST">
    <?= Csrf::field() ?>

    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label>Mã thuốc <span style="color:red;">*</span></label>
        <input type="text" name="code" class="form-control" value="<?= htmlspecialchars($medicine['code'] ?? '') ?>" placeholder="VD: MED-009" required>
      </div>

      <div class="form-group">
        <label>Tên thuốc & hàm lượng <span style="color:red;">*</span></label>
        <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($medicine['name'] ?? '') ?>" placeholder="VD: Augmentin 1g" required>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label>Phân loại nhóm thuốc</label>
        <input type="text" name="category" class="form-control" value="<?= htmlspecialchars($medicine['category'] ?? '') ?>" placeholder="VD: Kháng sinh">
      </div>

      <div class="form-group">
        <label>Đơn vị tính <span style="color:red;">*</span></label>
        <input type="text" name="unit" class="form-control" value="<?= htmlspecialchars($medicine['unit'] ?? 'Viên') ?>" placeholder="Viên, Gói, Lọ, Tuýp..." required>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label>Đơn giá bán (VNĐ) <span style="color:red;">*</span></label>
        <input type="number" name="unit_price" class="form-control" value="<?= (float)($medicine['unit_price'] ?? 5000) ?>" required step="500">
      </div>

      <div class="form-group">
        <label>Số lượng tồn kho <span style="color:red;">*</span></label>
        <input type="number" name="stock_quantity" class="form-control" value="<?= (int)($medicine['stock_quantity'] ?? 100) ?>" required>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Hướng dẫn sử dụng mặc định</label>
      <input type="text" name="usage_instruction" class="form-control" value="<?= htmlspecialchars($medicine['usage_instruction'] ?? '') ?>" placeholder="VD: Uống sau ăn...">
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
      <label>Trạng thái</label>
      <select name="status" class="form-control">
        <option value="active" <?= ($medicine['status'] ?? '') === 'active' ? 'selected' : '' ?>>Đang kinh doanh</option>
        <option value="inactive" <?= ($medicine['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Tạm ngừng kinh doanh</option>
      </select>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 12px;">
      <a href="/admin/medicines" class="btn btn-secondary">Hủy</a>
      <button type="submit" class="btn btn-primary">
        <?= $isEdit ? 'Cập nhật kho thuốc' : 'Lưu vào kho thuốc' ?>
      </button>
    </div>
  </form>
</div>
