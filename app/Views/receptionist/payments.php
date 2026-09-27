<?php
use App\Core\Helper;
use App\Core\Csrf;
?>
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-icon stat-icon-amber">💰</div>
    <div class="stat-details">
      <h4><?= Helper::formatCurrency((float)$stats['today_revenue']) ?></h4>
      <p>Doanh thu viện phí hôm nay</p>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon stat-icon-teal">📈</div>
    <div class="stat-details">
      <h4><?= Helper::formatCurrency((float)$stats['month_revenue']) ?></h4>
      <p>Doanh thu viện phí tháng này</p>
    </div>
  </div>
</div>

<div class="card-box" style="padding: 20px; margin-bottom: 24px;">
  <form action="/receptionist/payments" method="GET" style="display: flex; gap: 14px; align-items: flex-end;">
    <div class="form-group" style="flex: 2;">
      <label>Tìm kiếm hóa đơn</label>
      <input type="text" name="keyword" class="form-control" placeholder="Mã hóa đơn (HD...), mã đặt lịch, tên hoặc SĐT bệnh nhân..." value="<?= htmlspecialchars($keyword ?? '') ?>">
    </div>

    <div class="form-group" style="flex: 1;">
      <label>Trạng thái thanh toán</label>
      <select name="status" class="form-control">
        <option value="">-- Tất cả trạng thái --</option>
        <option value="unpaid" <?= ($status ?? '') === 'unpaid' ? 'selected' : '' ?>>Chưa thanh toán</option>
        <option value="paid" <?= ($status ?? '') === 'paid' ? 'selected' : '' ?>>Đã thanh toán</option>
      </select>
    </div>

    <button type="submit" class="btn btn-primary" style="height: 48px; padding: 0 24px;">
      🔍 Lọc hóa đơn
    </button>
  </form>
</div>

<div class="card-box">
  <div class="card-header-bar">
    <h3>Danh sách Hóa đơn & Viện phí (<?= count($payments) ?> hóa đơn)</h3>
  </div>

  <div class="table-responsive">
    <table class="data-table">
      <thead>
        <tr>
          <th>Mã hóa đơn</th>
          <th>Mã lịch</th>
          <th>Bệnh nhân & SĐT</th>
          <th>Bác sĩ</th>
          <th>Tiền khám</th>
          <th>Tiền thuốc</th>
          <th>Tổng thanh toán</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($payments)): ?>
          <tr>
            <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
              Không tìm thấy hóa đơn thanh toán nào.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($payments as $p): ?>
            <tr>
              <td><strong style="color:#0f172a;"><?= htmlspecialchars($p['invoice_code']) ?></strong></td>
              <td><code><?= htmlspecialchars($p['booking_code']) ?></code></td>
              <td>
                <strong><?= htmlspecialchars($p['patient_name']) ?></strong><br>
                <small class="text-muted"><?= htmlspecialchars($p['patient_phone']) ?></small>
              </td>
              <td><?= htmlspecialchars($p['doctor_name']) ?></td>
              <td><?= Helper::formatCurrency((float)$p['service_fee']) ?></td>
              <td><?= Helper::formatCurrency((float)$p['medicine_fee']) ?></td>
              <td>
                <strong style="font-size: 15px; color: var(--primary);">
                  <?= Helper::formatCurrency((float)$p['final_amount']) ?>
                </strong>
              </td>
              <td><?= Helper::getPaymentStatusBadge($p['payment_status']) ?></td>
              <td>
                <div style="display:flex; gap: 6px;">
                  <?php if ($p['payment_status'] === 'unpaid'): ?>
                    <form action="/receptionist/payments/pay/<?= $p['id'] ?>" method="POST" style="display:inline;">
                      <?= Csrf::field() ?>
                      <select name="payment_method" style="padding:4px; border-radius:4px; border:1px solid #cbd5e1; font-size:12px;">
                        <option value="cash">Tiền mặt</option>
                        <option value="bank_transfer">Chuyển khoản</option>
                        <option value="momo">MoMo</option>
                        <option value="vnpay">VNPay</option>
                      </select>
                      <button type="submit" class="btn btn-primary btn-sm" onclick="return confirm('Xác nhận đã nhận đủ tiền viện phí?');">
                        Thu tiền
                      </button>
                    </form>
                  <?php else: ?>
                    <a href="/receptionist/payments/receipt/<?= $p['id'] ?>" target="_blank" class="btn btn-secondary btn-sm" title="In biên lai">
                      🖨️ In biên lai
                    </a>
                  <?php endif; ?>
                </div>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
