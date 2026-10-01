/**
 * MediBook - Core App JS
 * Handles Animations, Auth Checks, Toast Notifications, and Dynamic Interactions
 */

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : 'ℹ️')}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger show
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Modal open/close helpers
function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Auto-dismiss server flash alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });

  // 2. Scroll-driven Reveal Animations using IntersectionObserver
  const animatedElements = document.querySelectorAll('[data-animate]');
  if (animatedElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          // Once animated, unobserve for performance
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    animatedElements.forEach(el => observer.observe(el));
  } else {
    // Fallback if browser doesn't support IntersectionObserver
    animatedElements.forEach(el => el.classList.add('animate-in'));
  }

  // 3. Favorite toggle buttons on doctor cards (WITH AUTH CHECK)
  const favBtns = document.querySelectorAll('.btn-favorite');
  favBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const user = window.MEDIBOOK_USER;
      const doctorName = btn.getAttribute('data-doctor-name') || 'bác sĩ';

      // Check if user is logged in
      if (!user) {
        openLoginModal();
        return;
      }

      // If logged in, send request to API
      const doctorId = btn.getAttribute('data-doctor-id');
      fetch('/api/favorite-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.is_favorite) {
            btn.classList.add('active');
            showToast(`Đã thêm ${doctorName} vào danh sách quan tâm!`, 'success');
          } else {
            btn.classList.remove('active');
            showToast(`Đã bỏ lưu ${doctorName}.`, 'warning');
          }
        } else {
          showToast(data.message || 'Không thể cập nhật yêu thích.', 'warning');
        }
      })
      .catch(() => {
        showToast('Có lỗi xảy ra khi kết nối máy chủ.', 'warning');
      });
    });
  });

  // Close modal when clicking outside of card
  const loginModal = document.getElementById('login-modal');
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        closeLoginModal();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && loginModal.classList.contains('active')) {
        closeLoginModal();
      }
    });
  }
});
