<?php
use App\Core\Helper;
?>
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-icon stat-icon-amber">💰</div>
    <div class="stat-details">
      <h4><?= Helper::formatCurrency((float)$stats['today_revenue']) ?></h4>
      <p>Doanh thu hôm nay</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-teal">📈</div>
    <div class="stat-details">
      <h4><?= Helper::formatCurrency((float)$stats['month_revenue']) ?></h4>
      <p>Doanh thu tháng này</p>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-icon stat-icon-green">🏆</div>
    <div class="stat-details">
      <h4><?= Helper::formatCurrency((float)$stats['total_revenue']) ?></h4>
      <p>Tổng doanh thu lũy kế</p>
    </div>
  </div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
  
  <!-- Monthly Revenue Summary -->
  <div class="card-box">
    <div class="card-header-bar">
      <h3>Doanh thu theo tháng</h3>
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tháng / Năm</th>
            <th>Số lượng hóa đơn</th>
            <th>Tổng tiền thực thu</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($monthlyRevenue)): ?>
            <tr><td colspan="3" style="text-align:center;padding:20px;">Chưa có dữ liệu doanh thu.</td></tr>
          <?php else: ?>
            <?php foreach ($monthlyRevenue as $mr): ?>
              <tr>
                <td><strong>Tháng <?= htmlspecialchars($mr['month']) ?></strong></td>
                <td><?= (int)$mr['invoice_count'] ?> hóa đơn</td>
                <td><strong style="color:var(--primary);"><?= Helper::formatCurrency((float)$mr['total_amount']) ?></strong></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Appointments by Specialty -->
  <div class="card-box">
    <div class="card-header-bar">
      <h3>Lượt khám theo chuyên khoa</h3>
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Chuyên khoa</th>
            <th>Tổng lượt đặt khám</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($bySpecialty as $bs): ?>
            <tr>
              <td><strong><?= htmlspecialchars($bs['specialty_name']) ?></strong></td>
              <td><?= (int)$bs['total_appointments'] ?> lượt</td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

</div>
