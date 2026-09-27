<?php
use App\Core\Csrf;
?>
<div class="card-box" style="max-width: 800px; padding: 30px; margin: 0 auto;">
  <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">
    Tiếp nhận đăng ký khám trực tiếp tại quầy (Walk-in)
  </h2>

  <form action="/receptionist/booking" method="POST">
    <?= Csrf::field() ?>

    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label>Họ tên bệnh nhân <span style="color:red;">*</span></label>
        <input type="text" name="patient_name" class="form-control" placeholder="Nguyễn Văn A" required>
      </div>

      <div class="form-group">
        <label>Số điện thoại <span style="color:red;">*</span></label>
        <input type="tel" name="patient_phone" class="form-control" placeholder="0901234567" required>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label>Email bệnh nhân (Tùy chọn)</label>
      <input type="email" name="patient_email" class="form-control" placeholder="Để trống hệ thống sẽ tự sinh email nội bộ">
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label>Chuyên khoa khám <span style="color:red;">*</span></label>
        <select name="specialty_id" id="booking_specialty" class="form-control" required>
          <option value="">-- Chọn chuyên khoa --</option>
          <?php foreach ($specialties as $sp): ?>
            <option value="<?= $sp['id'] ?>"><?= htmlspecialchars($sp['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="form-group">
        <label>Bác sĩ tiếp nhận <span style="color:red;">*</span></label>
        <select name="doctor_id" id="booking_doctor" class="form-control" required>
          <option value="">-- Chọn bác sĩ --</option>
          <?php foreach ($doctors as $doc): ?>
            <option value="<?= $doc['id'] ?>">
              <?= htmlspecialchars($doc['title'] . ' ' . $doc['name'] . ' (' . $doc['room_number'] . ')') ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label>Ngày khám <span style="color:red;">*</span></label>
        <input type="date" name="appointment_date" id="booking_date" class="form-control" value="<?= date('Y-m-d') ?>" required>
      </div>

      <div class="form-group">
        <label>Khung giờ khám <span style="color:red;">*</span></label>
        <select name="start_time" class="form-control" required>
          <option value="08:00:00">08:00 - 08:30</option>
          <option value="08:30:00">08:30 - 09:00</option>
          <option value="09:00:00">09:00 - 09:30</option>
          <option value="09:30:00">09:30 - 10:00</option>
          <option value="10:00:00">10:00 - 10:30</option>
          <option value="10:30:00">10:30 - 11:00</option>
          <option value="13:30:00">13:30 - 14:00</option>
          <option value="14:00:00">14:00 - 14:30</option>
          <option value="14:30:00">14:30 - 15:00</option>
          <option value="15:00:00">15:00 - 15:30</option>
          <option value="15:30:00">15:30 - 16:00</option>
        </select>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 18px;">
      <label>Ghi chú triệu chứng ban đầu</label>
      <input type="text" name="symptoms" class="form-control" placeholder="Triệu chứng, lý do đến khám tại quầy...">
    </div>

    <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:12px 16px; margin-bottom:20px;">
      <label style="display:flex; align-items:center; gap:8px; font-weight:700; color:#065f46; cursor:pointer;">
        <input type="checkbox" name="auto_checkin" value="1" checked style="width:18px; height:18px;">
        Tự động tiếp đón và cấp số thứ tự vào phòng khám ngay lập tức
      </label>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:12px;">
      <a href="/receptionist/checkin" class="btn btn-secondary">Quay lại</a>
      <button type="submit" class="btn btn-primary btn-lg">
        Tạo lịch & Cấp số thứ tự &rarr;
      </button>
    </div>
  </form>
</div>
