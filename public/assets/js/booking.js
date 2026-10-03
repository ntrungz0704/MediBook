/**
 * MediBook - Interactive Booking Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  const specialtySelect = document.getElementById('booking_specialty');
  const doctorSelect = document.getElementById('booking_doctor');
  const serviceSelect = document.getElementById('booking_service');
  const dateInput = document.getElementById('booking_date');
  const slotsContainer = document.getElementById('slots_container');
  const selectedTimeInput = document.getElementById('selected_time_slot');
  const slotLoading = document.getElementById('slots_loading');
  const slotError = document.getElementById('slots_error');

  // Handle specialty change
  if (specialtySelect) {
    specialtySelect.addEventListener('change', () => {
      const specialtyId = specialtySelect.value;
      if (!specialtyId) return;

      // Fetch doctors by specialty
      fetch(`/api/doctors/by-specialty/${specialtyId}`)
        .then(res => res.json())
        .then(data => {
          if (doctorSelect && data.success) {
            doctorSelect.innerHTML = '<option value="">-- Chọn bác sĩ --</option>';
            data.doctors.forEach(doc => {
              const opt = document.createElement('option');
              opt.value = doc.id;
              const docDisplayName = (doc.name && doc.name.startsWith(doc.title)) ? doc.name : `${doc.title} ${doc.name}`;
              opt.textContent = `${docDisplayName} (${doc.room_number})`;
              doctorSelect.appendChild(opt);
            });
          }
        });

      // Fetch services by specialty
      if (serviceSelect) {
        fetch(`/api/services/by-specialty/${specialtyId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              serviceSelect.innerHTML = '<option value="">-- Chọn dịch vụ khám --</option>';
              data.services.forEach(srv => {
                const opt = document.createElement('option');
                opt.value = srv.id;
                const formattedPrice = new Intl.NumberFormat('vi-VN').format(srv.price) + ' ₫';
                opt.textContent = `${srv.name} (${formattedPrice})`;
                serviceSelect.appendChild(opt);
              });
            }
          });
      }
    });
  }

  // Load available slots
  function loadSlots() {
    if (!doctorSelect || !dateInput || !slotsContainer) return;

    const doctorId = doctorSelect.value;
    const date = dateInput.value;

    if (!doctorId || !date) {
      slotsContainer.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 20px;">Vui lòng chọn bác sĩ và ngày khám để xem khung giờ.</p>';
      return;
    }

    if (slotLoading) slotLoading.style.display = 'block';
    if (slotError) slotError.style.display = 'none';
    slotsContainer.innerHTML = '';

    fetch(`/api/slots?doctor_id=${doctorId}&date=${date}`)
      .then(res => res.json())
      .then(res => {
        if (slotLoading) slotLoading.style.display = 'none';

        if (!res.success) {
          if (slotError) {
            slotError.innerHTML = `<strong>⚠️ Lưu ý:</strong> ${res.error || 'Bác sĩ không có ca trực vào ngày này.'}`;
            slotError.style.display = 'block';
          }
          slotsContainer.innerHTML = `
            <div style="grid-column: 1/-1; background: #fffbeb; border: 1.5px dashed #f59e0b; border-radius: 8px; padding: 20px; text-align: center; color: #92400e;">
              <div style="font-size: 26px; margin-bottom: 6px;">📅</div>
              <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px;">Bác sĩ chưa có ca trực vào ngày đã chọn</div>
              <p style="font-size: 13.5px; margin: 0; line-height: 1.5; color: #b45309;">${res.error || 'Vui lòng chọn ngày khám khác hoặc chọn một Bác sĩ khác đang trực.'}</p>
            </div>
          `;
          return;
        }

        if (!res.slots || res.slots.length === 0) {
          slotsContainer.innerHTML = `
            <div style="grid-column: 1/-1; background: #fef2f2; border: 1.5px dashed #ef4444; border-radius: 8px; padding: 20px; text-align: center; color: #991b1b;">
              <div style="font-size: 26px; margin-bottom: 6px;">⏳</div>
              <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">Tất cả khung giờ trong ngày đã kín lịch</div>
              <p style="font-size: 13.5px; margin: 0; color: #b91c1c;">Vui lòng chọn một ngày khám kế tiếp để đặt hẹn.</p>
            </div>
          `;
          return;
        }

        res.slots.forEach(slot => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `slot-btn ${slot.available ? 'available' : 'disabled'}`;
          btn.textContent = slot.display;
          btn.dataset.time = slot.start_time;

          if (slot.available) {
            btn.addEventListener('click', () => {
              document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              if (selectedTimeInput) selectedTimeInput.value = slot.start_time;
            });
          } else {
            btn.disabled = true;
            btn.title = 'Khung giờ này đã có bệnh nhân đặt trước';
          }

          slotsContainer.appendChild(btn);
        });
      })
      .catch(() => {
        if (slotLoading) slotLoading.style.display = 'none';
        if (slotError) {
          slotError.innerHTML = '<strong>❌ Lỗi:</strong> Không thể kết nối tới máy chủ để tải khung giờ. Vui lòng thử lại.';
          slotError.style.display = 'block';
        }
      });
  }

  if (doctorSelect) doctorSelect.addEventListener('change', loadSlots);
  if (dateInput) dateInput.addEventListener('change', loadSlots);

  // Auto trigger slot loading if pre-selected
  if (doctorSelect && doctorSelect.value && dateInput && dateInput.value) {
    loadSlots();
  }
});
