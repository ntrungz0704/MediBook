<?php
use App\Core\Helper;
?>
<div class="card-box">
  <div class="card-header-bar">
    <h3>Danh mục dịch vụ khám & Bảng giá (<?= count($services) ?> dịch vụ)</h3>
    <a href="/admin/services/create" class="btn btn-primary btn-sm">➕ Thêm dịch vụ mới</a>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Tên dịch vụ</th>
          <th>Chuyên khoa</th>
          <th>Thời lượng</th>
          <th>Bảng giá niêm yết</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($services as $s): ?>
          <tr>
            <td><?= $s['id'] ?></td>
            <td><strong><?= htmlspecialchars($s['name']) ?></strong></td>
            <td><span class="badge badge-info"><?= htmlspecialchars($s['specialty_name']) ?></span></td>
            <td><?= (int)$s['duration_minutes'] ?> phút</td>
            <td><strong style="color:var(--primary); font-size:15px;"><?= Helper::formatCurrency((float)$s['price']) ?></strong></td>
            <td><span class="badge badge-success"><?= htmlspecialchars($s['status']) ?></span></td>
            <td>
              <a href="/admin/services/edit/<?= $s['id'] ?>" class="btn btn-secondary btn-sm">Sửa</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
