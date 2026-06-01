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