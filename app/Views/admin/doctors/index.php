<?php
use App\Core\Helper;
?>
<div class="card-box">
  <div class="card-header-bar">
    <h3>Danh sách bác sĩ hệ thống (<?= count($doctors) ?> bác sĩ)</h3>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Bác sĩ</th>
          <th>Phòng khám</th>
          <th>Chuyên khoa</th>
          <th>Kinh nghiệm</th>
          <th>Đánh giá</th>
          <th>Phí khám</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($doctors as $d): ?>
          <tr>
            <td>
              <strong><?= htmlspecialchars($d['title'] . ' ' . $d['name']) ?></strong><br>
              <small class="text-muted"><?= htmlspecialchars($d['email']) ?></small>
            </td>
            <td><span class="badge badge-info"><?= htmlspecialchars($d['room_number']) ?></span></td>
            <td><?= htmlspecialchars($d['specialty_names'] ?: 'Chưa phân chuyên khoa') ?></td>
            <td><?= (int)$d['experience_years'] ?> năm</td>
            <td>⭐ <?= number_format((float)$d['rating'], 1) ?> (<?= (int)$d['rating_count'] ?>)</td>
            <td><strong style="color:var(--primary);"><?= Helper::formatCurrency((float)$d['consultation_fee']) ?></strong></td>
            <td>
              <a href="/admin/doctors/edit/<?= $d['id'] ?>" class="btn btn-secondary btn-sm">Thiết lập & Chuyên khoa</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
