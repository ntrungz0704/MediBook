/**
 * MediBook - Live Queue & Doctor Examination Form Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. BMI Calculator in Doctor Exam Form
  const weightInput = document.getElementById('vital_weight');
  const heightInput = document.getElementById('vital_height');
  const bmiInput = document.getElementById('vital_bmi');

  function calculateBMI() {
    if (!weightInput || !heightInput || !bmiInput) return;
    const w = parseFloat(weightInput.value);
    const h = parseFloat(heightInput.value) / 100; // convert cm to meters
    if (w > 0 && h > 0) {
      const bmi = (w / (h * h)).toFixed(1);
      bmiInput.value = bmi;
    }
  }

  if (weightInput) weightInput.addEventListener('input', calculateBMI);
  if (heightInput) heightInput.addEventListener('input', calculateBMI);

  // 2. Dynamic Prescription Item Management
  const addMedicineBtn = document.getElementById('btn_add_medicine');
  const medTableBody = document.getElementById('prescription_table_body');
  const totalMedicineFeeDisplay = document.getElementById('total_med_fee');

  function calculatePrescriptionTotal() {
    if (!totalMedicineFeeDisplay) return;
    let sum = 0;
    document.querySelectorAll('.prescription-row').forEach(row => {
      const qty = parseFloat(row.querySelector('.med-qty')?.value || 1);
      const price = parseFloat(row.querySelector('.med-price')?.value || 0);
      const rowTotal = qty * price;
      const subtotalEl = row.querySelector('.med-subtotal');
      if (subtotalEl) {
        subtotalEl.textContent = new Intl.NumberFormat('vi-VN').format(rowTotal) + ' ₫';
      }
      sum += rowTotal;
    });
    totalMedicineFeeDisplay.textContent = new Intl.NumberFormat('vi-VN').format(sum) + ' ₫';
  }

  if (addMedicineBtn && medTableBody) {
    addMedicineBtn.addEventListener('click', () => {
      const row = document.createElement('tr');
      row.className = 'prescription-row';
      row.innerHTML = `
        <td>
          <input type="text" name="med_name[]" class="form-control form-control-sm" placeholder="Tên thuốc..." required>
          <input type="hidden" name="med_id[]" value="">
        </td>
        <td><input type="text" name="med_dosage[]" class="form-control form-control-sm" placeholder="VD: 500mg"></td>
        <td><input type="text" name="med_unit[]" class="form-control form-control-sm" value="Viên"></td>
        <td><input type="number" name="med_quantity[]" class="form-control form-control-sm med-qty" value="10" min="1"></td>
        <td>
          <div style="display:flex;gap:4px;">
            <input type="text" name="med_morning[]" title="Sáng" placeholder="S" class="form-control form-control-sm" value="1" style="width:36px;text-align:center;">
            <input type="text" name="med_noon[]" title="Trưa" placeholder="T" class="form-control form-control-sm" value="0" style="width:36px;text-align:center;">
            <input type="text" name="med_afternoon[]" title="Chiều" placeholder="C" class="form-control form-control-sm" value="1" style="width:36px;text-align:center;">
            <input type="text" name="med_night[]" title="Tối" placeholder="Tối" class="form-control form-control-sm" value="0" style="width:36px;text-align:center;">
          </div>
        </td>
        <td><input type="text" name="med_instructions[]" class="form-control form-control-sm" placeholder="Uống sau ăn..."></td>
        <td><input type="number" name="med_price[]" class="form-control form-control-sm med-price" value="5000"></td>
        <td class="med-subtotal" style="font-weight:700;color:#0d9488;">50.000 ₫</td>
        <td><button type="button" class="btn btn-sm btn-outline btn-remove-row" style="color:#ef4444;border-color:#fca5a5;">&times;</button></td>
      `;

      medTableBody.appendChild(row);
      calculatePrescriptionTotal();

      row.querySelector('.med-qty').addEventListener('input', calculatePrescriptionTotal);
      row.querySelector('.med-price').addEventListener('input', calculatePrescriptionTotal);
      row.querySelector('.btn-remove-row').addEventListener('click', () => {
        row.remove();
        calculatePrescriptionTotal();
      });
    });
  }

  // 3. Live Queue Board TV Auto Polling
  const liveBoardContainer = document.getElementById('live_board_content');
  if (liveBoardContainer) {
    function escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    setInterval(() => {
      fetch('/api/queue/live')
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data && res.doctors) {
            const clockEl = document.getElementById('live_clock');
            if (clockEl && res.timestamp) clockEl.textContent = res.timestamp;

            const queueItems = res.data;
            const doctors = res.doctors;

            let html = '';
            doctors.forEach(doc => {
              const room = doc.room_number || 'P.101';
              let callingItem = null;
              const waitingItems = [];

              queueItems.forEach(qi => {
                if (qi.room === room) {
                  if (qi.status === 'calling' || (qi.status === 'in_room' && !callingItem)) {
                    callingItem = qi;
                  } else if (qi.status === 'waiting') {
                    waitingItems.push(qi);
                  }
                }
              });

              html += `
                <div class="room-card">
                  <div class="room-header">
                    <div>
                      <div class="room-name">${escapeHtml(room)}</div>
                      <div class="room-doctor">${escapeHtml(doc.specialty_names || 'Nội khoa')}</div>
                    </div>
                    <div style="font-size:13px;color:#38bdf8;font-weight:700;">
                      ${escapeHtml(doc.title + ' ' + doc.name)}
                    </div>
                  </div>
              `;

              if (callingItem) {
                html += `
                  <div class="calling-box">
                    <div class="calling-label">MỜI VÀO PHÒNG KHÁM</div>
                    <div class="calling-number">${escapeHtml(callingItem.queue_number)}</div>
                    <div class="calling-patient">${escapeHtml(callingItem.patient_name)}</div>
                  </div>
                `;
              } else {
                html += `
                  <div class="calling-box" style="background:#334155;box-shadow:none;animation:none;">
                    <div class="calling-label" style="color:#94a3b8;">TRẠNG THÁI</div>
                    <div class="calling-number" style="font-size:32px;color:#cbd5e1;">SẴN SÀNG</div>
                    <div class="calling-patient" style="font-size:14px;color:#94a3b8;">Đang chờ gọi bệnh nhân kế tiếp</div>
                  </div>
                `;
              }

              html += `
                  <div class="waiting-list-section">
                    <div class="waiting-title">SỐ TIẾP THEO ĐANG CHỜ (${waitingItems.length}):</div>
                    <div class="waiting-items">
              `;

              if (waitingItems.length === 0) {
                html += `<span style="font-size:13px;color:#64748b;">Hết lượt chờ</span>`;
              } else {
                waitingItems.slice(0, 6).forEach(wi => {
                  html += `<span class="waiting-pill">${escapeHtml(wi.queue_number)}</span>`;
                });
              }

              html += `
                    </div>
                  </div>
                </div>
              `;
            });

            liveBoardContainer.innerHTML = html;
          }
        })
        .catch(() => {});
    }, 4000);
  }
});
