<?php
use App\Core\Helper;
?>
<div class="card-box">
  <div class="card-header-bar">
    <h3>Danh mục chuyên khoa (<?= count($specialties) ?> chuyên khoa)</h3>
    <a href="/admin/specialties/create" class="btn btn-primary btn-sm">➕ Thêm chuyên khoa mới</a>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Tên chuyên khoa</th>
          <th>Đường dẫn (Slug)</th>
          <th>Mô tả tóm tắt</th>
          <th>Số bác sĩ</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($specialties as $s): ?>
          <tr>
            <td><?= $s['id'] ?></td>
            <td><strong><?= htmlspecialchars($s['name']) ?></strong></td>
            <td><code><?= htmlspecialchars($s['slug']) ?></code></td>
            <td><?= htmlspecialchars($s['description']) ?></td>
            <td><?= (int)($s['doctor_count'] ?? 0) ?> bác sĩ</td>
            <td>
              <span class="badge badge-success"><?= htmlspecialchars($s['status']) ?></span>
            </td>
            <td>
              <a href="/admin/specialties/edit/<?= $s['id'] ?>" class="btn btn-secondary btn-sm">Sửa</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
