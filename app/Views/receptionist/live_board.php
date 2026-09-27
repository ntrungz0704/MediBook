<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MÀN HÌNH GỌI SỐ PHÒNG KHÁM - MEDIBOOK LIVE BOARD</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', -apple-system, sans-serif;
      background: #0f172a;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 24px;
      overflow-x: hidden;
    }
    .board-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 16px 28px;
      border-radius: 16px;
      margin-bottom: 24px;
      border: 1px solid #334155;
    }
    .board-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-title {
      font-size: 28px;
      font-weight: 900;
      color: #38bdf8;
      letter-spacing: -0.5px;
    }
    .clock-display {
      font-size: 32px;
      font-weight: 800;
      font-family: monospace;
      color: #34d399;
      background: #0f172a;
      padding: 6px 18px;
      border-radius: 10px;
      border: 1px solid #334155;
    }
    .grid-rooms {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      flex-grow: 1;
    }
    .room-card {
      background: #1e293b;
      border-radius: 18px;
      padding: 24px;
      border: 2px solid #334155;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #334155;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .room-name {
      font-size: 24px;
      font-weight: 800;
      color: #f8fafc;
    }
    .room-doctor {
      font-size: 14px;
      color: #94a3b8;
    }
    .calling-box {
      background: linear-gradient(135deg, #059669, #10b981);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-bottom: 20px;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
      animation: pulseGlow 2s infinite;
    }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
      70% { box-shadow: 0 0 0 16px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .calling-label {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #d1fae5;
      margin-bottom: 6px;
    }
    .calling-number {
      font-size: 58px;
      font-weight: 900;
      font-family: monospace;
      color: #ffffff;
      line-height: 1;
    }
    .calling-patient {
      font-size: 20px;
      font-weight: 700;
      margin-top: 8px;
      color: #ecfdf5;
    }
    .waiting-list-section {
      background: #0f172a;
      border-radius: 12px;
      padding: 14px;
      flex-grow: 1;
    }
    .waiting-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .waiting-items {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .waiting-pill {
      background: #334155;
      color: #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      font-family: monospace;
    }
    .board-footer {
      text-align: center;
      margin-top: 20px;
      font-size: 15px;
      color: #94a3b8;
      background: #1e293b;
      padding: 12px;
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="board-header">
    <div class="board-brand">
      <div style="width:42px;height:42px;background:#0d9488;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;">
        🏥
      </div>
      <div>
        <div class="brand-title">MEDIBOOK - BẢNG ĐIỀU PHỐI KHÁM BỆNH</div>
        <div style="font-size:13px;color:#94a3b8;">Phòng khám Đa khoa Quốc tế MediBook - Quý khách vui lòng chú ý loa gọi số</div>
      </div>
    </div>

    <div class="clock-display" id="live_clock">
      <?= date('H:i:s') ?>
    </div>
  </div>

  <div class="grid-rooms" id="live_board_content">
    <?php foreach ($doctors as $doc): ?>
      <?php
        $room = $doc['room_number'];
        $callingItem = null;
        $waitingItems = [];

        foreach ($queueItems as $qi) {
            if ($qi['room'] === $room) {
                if ($qi['status'] === 'calling' || ($qi['status'] === 'in_room' && !$callingItem)) {
                    $callingItem = $qi;
                } elseif ($qi['status'] === 'waiting') {
                    $waitingItems[] = $qi;
                }
            }
        }
      ?>
      <div class="room-card">
        <div class="room-header">
          <div>
            <div class="room-name"><?= htmlspecialchars($room) ?></div>
            <div class="room-doctor"><?= htmlspecialchars($doc['specialty_names'] ?: 'Nội khoa') ?></div>
          </div>
          <div style="font-size:13px;color:#38bdf8;font-weight:700;">
            <?= htmlspecialchars($doc['title'] . ' ' . $doc['name']) ?>
          </div>
        </div>

        <?php if ($callingItem): ?>
          <div class="calling-box">
            <div class="calling-label">MỜI VÀO PHÒNG KHÁM</div>
            <div class="calling-number"><?= htmlspecialchars($callingItem['queue_number']) ?></div>
            <div class="calling-patient"><?= htmlspecialchars($callingItem['patient_name']) ?></div>
          </div>
        <?php else: ?>
          <div class="calling-box" style="background:#334155;box-shadow:none;animation:none;">
            <div class="calling-label" style="color:#94a3b8;">TRẠNG THÁI</div>
            <div class="calling-number" style="font-size:32px;color:#cbd5e1;">SẴN SÀNG</div>
            <div class="calling-patient" style="font-size:14px;color:#94a3b8;">Đang chờ gọi bệnh nhân kế tiếp</div>
          </div>
        <?php endif; ?>

        <div class="waiting-list-section">
          <div class="waiting-title">SỐ TIẾP THEO ĐANG CHỜ (<?= count($waitingItems) ?>):</div>
          <div class="waiting-items">
            <?php if (empty($waitingItems)): ?>
              <span style="font-size:13px;color:#64748b;">Hết lượt chờ</span>
            <?php else: ?>
              <?php foreach (array_slice($waitingItems, 0, 6) as $wi): ?>
                <span class="waiting-pill"><?= htmlspecialchars($wi['queue_number']) ?></span>
              <?php endforeach; ?>
            <?php endif; ?>
          </div>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <div class="board-footer">
    📢 Quý bệnh nhân vui lòng chuẩn bị sẵn giấy tờ tùy thân và sổ khám bệnh khi số thứ tự của mình hiển thị trên bảng.
  </div>

  <script src="/assets/js/queue.js"></script>
  <script>
    // Live digital clock tick
    setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      document.getElementById('live_clock').textContent = `${h}:${m}:${s}`;
    }, 1000);
  </script>
</body>
</html>
