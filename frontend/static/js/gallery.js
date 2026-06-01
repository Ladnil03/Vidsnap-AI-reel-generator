/**
 * gallery.js — Fetch reels from FastAPI, search, sort, delete
 */

/**
 * Load reels from FastAPI and render them in the gallery grid.
 * Called on page load and after deletion.
 */
async function loadGallery() {
  const reelGrid = document.getElementById('reelGrid');
  const emptyState = document.getElementById('galleryEmpty');
  if (!reelGrid) return;

  try {
    const reels = await getAllReels();
    // reels = [{ job_id, reel_url, created_at }]

    if (reels.length === 0) {
      reelGrid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    reelGrid.innerHTML = reels.map(reel => {
      const date = new Date(reel.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      return `
        <div class="reel-card" data-title="reel" data-job-id="${reel.job_id}"
             onclick="openLightbox('${reel.reel_url}', 'Reel')">

          <div class="reel-status-badge ready">✓ Ready</div>

          <div class="reel-video-wrap">
            <video class="reel-thumb" preload="metadata" muted>
              <source src="${reel.reel_url}" type="video/mp4">
            </video>
            <div class="reel-overlay">
              <div class="reel-play-btn">▶</div>
            </div>
          </div>

          <div class="reel-card-body">
            <div class="reel-title">Reel</div>
            <div class="reel-meta-row">
              <span class="reel-date">${date}</span>
              <div class="reel-actions">
                <a href="${reel.reel_url}"
                   class="reel-action-btn"
                   title="Download"
                   download
                   onclick="event.stopPropagation()">⬇</a>
                <button
                  class="reel-action-btn"
                  title="Delete"
                  onclick="event.stopPropagation(); handleDelete('${reel.job_id}', this)">
                  🗑
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Failed to load gallery:', error);
    if (error.message.includes('401')) {
      window.location.href = '/login';
    }
  }
}

/**
 * Delete a reel by job_id using FastAPI DELETE /api/reels/{job_id}.
 * Removes the card from DOM on success.
 */
async function handleDelete(jobId, btn) {
  if (!confirm('Delete this reel? This cannot be undone.')) return;

  const card = btn.closest('.reel-card');
  card.style.transform  = 'scale(0)';
  card.style.opacity    = '0';
  card.style.transition = 'all 0.3s';

  try {
    await deleteReel(jobId);
    setTimeout(() => {
      card.remove();
      showToast('success', 'Reel deleted');
      // Show empty state if no more reels
      const remaining = document.querySelectorAll('.reel-card').length;
      if (remaining === 0) {
        const emptyState = document.getElementById('galleryEmpty');
        if (emptyState) emptyState.style.display = 'block';
      }
    }, 300);
  } catch (error) {
    card.style.transform = '';
    card.style.opacity   = '';
    showToast('error', 'Could not delete reel');
  }
}

// Load gallery when page opens
document.addEventListener('DOMContentLoaded', loadGallery);

let allReels = [];

/* ── INITIALIZE GALLERY ── */
document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return;
  }

  try {
    allReels = await getAllReels();
    renderReels(allReels);
  } catch (err) {
    showToast('error', err.message);
    console.error(err);
  }
});

/* ── RENDER REELS ── */
function renderReels(reels) {
  const grid = document.getElementById('reelGrid');
  if (!grid) return;

  grid.innerHTML = '';

  if (reels.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No reels yet. <a href="/create">Create your first reel!</a></p>';
    return;
  }

  reels.forEach(reel => {
    const card = document.createElement('div');
    card.className = 'reel-card';
    card.dataset.title = reel.title || '';
    card.innerHTML = `
      <div class="reel-thumbnail">
        <img src="${reel.thumbnail || 'https://via.placeholder.com/300x200?text=No+Thumbnail'}" alt="${reel.title || 'Reel'}">
        <div class="reel-overlay">
          <button class="btn-play" onclick="openLightbox('${reel.video_url}', '${reel.title || 'Reel'}')">▶ Play</button>
        </div>
      </div>
      <div class="reel-info">
        <h4>${reel.title || 'Untitled Reel'}</h4>
        <p class="reel-meta">${reel.duration || '0s'} • ${new Date(reel.created_at).toLocaleDateString()}</p>
        <div class="reel-actions">
          <button class="btn-small btn-danger" onclick="confirmDelete('${reel.job_id}', this)">🗑 Delete</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ── SEARCH ── */
function filterGallery(q) {
  const filtered = allReels.filter(reel =>
    (reel.title || '').toLowerCase().includes(q.toLowerCase())
  );
  renderReels(filtered);
}

/* ── SORT ── */
function sortGallery(val) {
  const sorted = [...allReels];
  if (val === 'name') {
    sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (val === 'oldest') {
    sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (val === 'newest') {
    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  renderReels(sorted);
}

/* ── VIEW TOGGLE ── */
function setView(v) {
  const gridBtn = document.getElementById('grid-btn');
  const listBtn = document.getElementById('list-btn');
  if (gridBtn) gridBtn.classList.toggle('active', v === 'grid');
  if (listBtn) listBtn.classList.toggle('active', v === 'list');
  const reelGrid = document.getElementById('reelGrid');
  if (reelGrid) {
    reelGrid.className = 'reel-grid' + (v === 'list' ? ' list-view' : '');
  }
}

/* ── LIGHTBOX ── */
function openLightbox(videoUrl, title) {
  if (!videoUrl) return;
  const lightbox = document.getElementById('lightbox');
  const video    = document.getElementById('lightboxVideo');
  const titleEl  = document.getElementById('lightboxTitle');
  const dlBtn    = document.getElementById('lightboxDownload');
  
  if (!lightbox || !video) return;

  video.src      = videoUrl;
  titleEl.textContent = title;
  dlBtn.onclick  = () => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = title + '.mp4';
    a.click();
  };
  lightbox.classList.add('open');
  video.play();
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const video    = document.getElementById('lightboxVideo');
  if (!lightbox || !video) return;
  
  video.pause();
  video.src = '';
  lightbox.classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

/* ── DELETE ── */
async function confirmDelete(jobId, btn) {
  if (!confirm('Delete this reel? This cannot be undone.')) return;

  const card = btn.closest('.reel-card');

  try {
    await deleteReel(jobId);
    
    // Remove from allReels array
    allReels = allReels.filter(r => r.job_id !== jobId);
    
    card.style.transform  = 'scale(0)';
    card.style.opacity    = '0';
    card.style.transition = 'all 0.3s';
    setTimeout(() => {
      card.remove();
    }, 300);
        allReels = allReels.filter(r => r.job_id !== jobId);
      }, 300);
      showToast('success', 'Reel deleted');
    } else {
      throw new Error('Failed to delete reel');
    }
  } catch (err) {
    showToast('error', err.message);
  }
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