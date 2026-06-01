/* ── STAR RATING ── */
const stars      = document.querySelectorAll('.star');
const ratingInput = document.getElementById('ratingInput');

stars.forEach(star => {
  star.addEventListener('click', () => {
    const val = parseInt(star.dataset.val);
    ratingInput.value = val;
    stars.forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
  });
  star.addEventListener('mouseenter', () => {
    const val = parseInt(star.dataset.val);
    stars.forEach(s => {
      s.style.color = parseInt(s.dataset.val) <= val ? 'var(--accent3)' : '';
    });
  });
});

document.getElementById('starRating')?.addEventListener('mouseleave', () => {
  const selected = parseInt(ratingInput.value) || 0;
  stars.forEach(s => {
    s.style.color = '';
    s.classList.toggle('active', parseInt(s.dataset.val) <= selected);
  });
});

/* ── CHAR COUNT ── */
const fbMsg   = document.getElementById('feedbackMsg');
const fbCount = document.getElementById('fbCharCount');
fbMsg?.addEventListener('input', () => {
  const len = fbMsg.value.length;
  fbCount.textContent = len + ' / 1000';
  fbCount.classList.toggle('warn', len > 800);
  fbCount.classList.toggle('max',  len > 950);
});

/* ── FORM SUBMISSION ── */
const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isLoggedIn()) {
      showToast('error', 'Please log in first');
      window.location.href = '/login';
      return;
    }

    const message = document.getElementById('feedbackMsg').value.trim();
    const rating = parseInt(document.getElementById('ratingInput').value) || 0;

    if (!message) {
      showToast('error', 'Please write your feedback');
      return;
    }

    if (rating === 0) {
      showToast('error', 'Please select a rating');
      return;
    }

    const submitBtn = feedbackForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting…';

    try {
      await submitFeedback(message, rating);

      showToast('success', '✓ Thank you for your feedback!');
      feedbackForm.reset();
      ratingInput.value = 0;
      stars.forEach(s => s.classList.remove('active'));
      submitBtn.innerHTML = 'Submit Feedback';
      submitBtn.disabled = false;

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (err) {
      showToast('error', err.message);
      submitBtn.innerHTML = 'Submit Feedback';
      submitBtn.disabled = false;
    }
  });
}

/* ── TOAST ── */
function showToast(type, message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}