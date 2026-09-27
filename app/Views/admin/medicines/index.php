<?php
use App\Core\Helper;
?>
<div class="card-box">
  <div class="card-header-bar">
    <h3>Quản lý kho dược & Danh mục thuốc (<?= count($medicines) ?> loại thuốc)</h3>
    <a href="/admin/medicines/create" class="btn btn-primary btn-sm">➕ Thêm thuốc vào kho</a>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Mã thuốc</th>
          <th>Tên biệt dược & hàm lượng</th>
          <th>Phân loại</th>
          <th>Đơn vị</th>
          <th>Đơn giá</th>
          <th>Tồn kho</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($medicines as $m): ?>
          <tr>
            <td><code><?= htmlspecialchars($m['code']) ?></code></td>
            <td><strong><?= htmlspecialchars($m['name']) ?></strong></td>
            <td><?= htmlspecialchars($m['category'] ?? '-') ?></td>
            <td><?= htmlspecialchars($m['unit']) ?></td>
            <td><strong style="color:var(--primary);"><?= Helper::formatCurrency((float)$m['unit_price']) ?></strong></td>
            <td>
              <?php if ((int)$m['stock_quantity'] < 50): ?>
                <span style="color:#ef4444;font-weight:700;"><?= (int)$m['stock_quantity'] ?> (Sắp hết)</span>
              <?php else: ?>
                <?= (int)$m['stock_quantity'] ?>
              <?php endif; ?>
            </td>
            <td><span class="badge badge-success"><?= htmlspecialchars($m['status']) ?></span></td>
            <td>
              <a href="/admin/medicines/edit/<?= $m['id'] ?>" class="btn btn-secondary btn-sm">Sửa</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
