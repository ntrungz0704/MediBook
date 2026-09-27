<?php
use App\Core\Helper;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>HÓA ĐƠN VIỆN PHÍ - <?= htmlspecialchars($payment['invoice_code']) ?></title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #1e293b; padding: 30px; margin: 0; background: #fff; }
    .receipt-box { max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 30px; border-radius: 8px; }
    .header-table { width: 100%; border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
    .title { text-align: center; margin: 20px 0; font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .info-grid { width: 100%; margin-bottom: 20px; }
    .info-grid td { padding: 5px 0; font-size: 13.5px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th, .items-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    .items-table th { background: #f8fafc; font-weight: 700; }
    .total-section { text-align: right; margin-top: 15px; font-size: 15px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
    @media print {
      body { padding: 0; }
      .receipt-box { border: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div style="text-align: right; max-width: 680px; margin: 0 auto 10px;" class="no-print">
    <button onclick="window.print()" style="padding: 8px 16px; background: #0d9488; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
      🖨️ In hóa đơn
    </button>
  </div>

  <div class="receipt-box">
    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          <strong style="font-size: 16px; color: #0d9488;"><?= htmlspecialchars(CLINIC_NAME) ?></strong><br>
          <span style="font-size: 12px; color: #64748b;">
            Địa chỉ: <?= htmlspecialchars(CLINIC_ADDRESS) ?><br>
            Hotline: <?= htmlspecialchars(CLINIC_HOTLINE) ?> - Email: <?= htmlspecialchars(CLINIC_EMAIL) ?>
          </span>
        </td>
        <td style="text-align: right; font-size: 12px;">
          Số HĐ: <strong><?= htmlspecialchars($payment['invoice_code']) ?></strong><br>
          Mã đặt khám: <strong><?= htmlspecialchars($appointment['booking_code']) ?></strong><br>
          Ngày in: <?= date('d/m/Y H:i') ?>
        </td>
      </tr>
    </table>

    <div class="title">HÓA ĐƠN THU TIỀN VIỆN PHÍ</div>

    <table class="info-grid">
      <tr>
        <td style="width: 50%;">Họ tên bệnh nhân: <strong><?= htmlspecialchars($appointment['patient_name']) ?></strong></td>
        <td>Số điện thoại: <strong><?= htmlspecialchars($appointment['patient_phone']) ?></strong></td>
      </tr>
      <tr>
        <td>Bác sĩ điều trị: <strong><?= htmlspecialchars($appointment['doctor_title'] . ' ' . $appointment['doctor_name']) ?></strong></td>
        <td>Phòng khám: <strong><?= htmlspecialchars($appointment['room_number'] . ' (' . $appointment['specialty_name'] . ')') ?></strong></td>
      </tr>
      <tr>
        <td>Chẩn đoán: <strong><?= htmlspecialchars($appointment['clinical_diagnosis'] ?: 'Khám lâm sàng định kỳ') ?></strong></td>
        <td>Hình thức thanh toán: <strong><?= strtoupper(htmlspecialchars($payment['payment_method'])) ?></strong></td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th>STT</th>
          <th>Nội dung thanh toán</th>
          <th>ĐVT</th>
          <th>SL</th>
          <th>Đơn giá</th>
          <th>Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td><strong>Phí khám & Chẩn đoán chuyên khoa</strong> (<?= htmlspecialchars($appointment['specialty_name']) ?>)</td>
          <td>Lượt</td>
          <td>1</td>
          <td><?= Helper::formatCurrency((float)$payment['service_fee']) ?></td>
          <td><?= Helper::formatCurrency((float)$payment['service_fee']) ?></td>
        </tr>

        <?php if (!empty($prescription['items'])): ?>
          <?php foreach ($prescription['items'] as $idx => $med): ?>
            <tr>
              <td><?= $idx + 2 ?></td>
              <td><?= htmlspecialchars($med['medicine_name']) ?> (<?= htmlspecialchars($med['dosage']) ?>)</td>
              <td><?= htmlspecialchars($med['unit']) ?></td>
              <td><?= (int)$med['quantity'] ?></td>
              <td><?= Helper::formatCurrency((float)$med['unit_price']) ?></td>
              <td><?= Helper::formatCurrency((float)$med['amount']) ?></td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>

    <div class="total-section">
      <div style="margin-bottom: 6px;">Tổng chi phí dịch vụ: <strong><?= Helper::formatCurrency((float)$payment['total_amount']) ?></strong></div>
      <div style="margin-bottom: 6px;">Miễn giảm / BHYT: <strong><?= Helper::formatCurrency((float)$payment['discount']) ?></strong></div>
      <div style="font-size: 18px; font-weight: 800; color: #0d9488;">
        SỐ TIỀN THỰC THU: <?= Helper::formatCurrency((float)$payment['final_amount']) ?>
      </div>
      <div style="font-size: 12px; color: #64748b; font-style: italic; margin-top: 4px;">
        (Đã bao gồm thuế GTGT và tiền thuốc theo đơn)
      </div>
    </div>

    <div class="signatures">
      <div>
        <strong>Người nộp tiền</strong><br>
        <span style="font-size: 12px; color: #64748b;">(Ký và ghi rõ họ tên)</span>
      </div>
      <div>
        <strong>Thu ngân lập hóa đơn</strong><br>
        <span style="font-size: 12px; color: #64748b;">(Đã ký điện tử & thu đủ tiền)</span><br><br>
        <strong><?= htmlspecialchars($payment['cashier_name'] ?? 'Lễ tân') ?></strong>
      </div>
    </div>
  </div>
</body>
</html>
