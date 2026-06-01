/**
 * gallery.js — Search, sort, view toggle, delete, lightbox
 */

/* ── SEARCH ── */
function filterGallery(q) {
  document.querySelectorAll('.reel-card').forEach(card => {
    card.style.display = card.dataset.title.includes(q.toLowerCase()) ? '' : 'none';
  });
}

/* ── SORT ── */
function sortGallery(val) {
  const grid  = document.getElementById('reelGrid');
  const cards = Array.from(grid.querySelectorAll('.reel-card'));
  if (val === 'name') {
    cards.sort((a, b) => a.dataset.title.localeCompare(b.dataset.title));
  }
  if (val === 'oldest') cards.reverse();
  cards.forEach(c => grid.appendChild(c));
}

/* ── VIEW TOGGLE ── */
function setView(v) {
  document.getElementById('grid-btn').classList.toggle('active', v === 'grid');
  document.getElementById('list-btn').classList.toggle('active', v === 'list');
  document.getElementById('reelGrid').className = 'reel-grid' + (v === 'list' ? ' list-view' : '');
}

/* ── LIGHTBOX ── */
function openLightbox(videoUrl, title) {
  if (!videoUrl) return;
  const lightbox = document.getElementById('lightbox');
  const video    = document.getElementById('lightboxVideo');
  const titleEl  = document.getElementById('lightboxTitle');
  const dlBtn    = document.getElementById('lightboxDownload');
  video.src      = videoUrl;
  titleEl.textContent = title;
  dlBtn.onclick  = () => { const a = document.createElement('a'); a.href = videoUrl; a.download = title + '.mp4'; a.click(); };
  lightbox.classList.add('open');
  video.play();
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const video    = document.getElementById('lightboxVideo');
  video.pause();
  video.src = '';
  lightbox.classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

/* ── DELETE ── */
function confirmDelete(deleteUrl, btn) {
  if (!confirm('Delete this reel? This cannot be undone.')) return;
  const card = btn.closest('.reel-card');
  card.style.transform  = 'scale(0)';
  card.style.opacity    = '0';
  card.style.transition = 'all 0.3s';

  fetch(deleteUrl, { method: 'POST', headers: { 'X-CSRFToken': getCsrfToken() } })
    .then(res => {
      if (res.ok) {
        setTimeout(() => card.remove(), 300);
        showToast('success', 'Reel deleted');
      } else {
        card.style.transform = ''; card.style.opacity = '';
        showToast('error', 'Could not delete reel');
      }
    })
    .catch(() => {
      card.style.transform = ''; card.style.opacity = '';
      showToast('error', 'Network error');
    });
}

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
}

/* ── TOAST FALLBACK ── */
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