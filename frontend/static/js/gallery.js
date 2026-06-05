/**
 * gallery.js — VidSnap AI Gallery
 *
 * Responsibilities:
 *   - Fetch reels from FastAPI and render to the DOM
 *   - Filter and sort the reel list client-side (no extra API calls)
 *   - Handle reel deletion with optimistic UI removal
 *   - Open / close the video lightbox modal
 *   - Show toast notifications for user feedback
 *
 * All API calls delegate to api.js (loaded first by base.html).
 * Field names match FastAPI response: job_id, reel_url, created_at.
 */

'use strict';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** @type {Array<Object>} Master list — all reels fetched from the API. */
let allReels = [];

// ---------------------------------------------------------------------------
// Bootstrap — single DOMContentLoaded listener
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  /**
   * Entry point. Redirect unauthenticated users and load the gallery.
   * A single listener avoids the double-fetch bug that existed before.
   */
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return;
  }

  // Close lightbox on Escape key press
  document.addEventListener('keydown', (keyboardEvent) => {
    if (keyboardEvent.key === 'Escape') {
      closeLightbox();
    }
  });

  await loadGallery();
});

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

/**
 * Fetch all reels for the current user from FastAPI, store in allReels,
 * then render them. Shows a toast on network/auth failure.
 *
 * @returns {Promise<void>}
 */
async function loadGallery() {
  try {
    allReels = await getAllReels();
    renderReels(allReels);
  } catch (fetchError) {
    // Redirect to login on 401 — token expired or missing
    if (fetchError.message && fetchError.message.includes('401')) {
      window.location.href = '/login';
      return;
    }
    showToast('error', 'Failed to load gallery: ' + fetchError.message);
    console.error('[gallery] loadGallery error:', fetchError);
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render an array of reel objects into the #reelGrid element.
 * Shows the #galleryEmpty empty state when the array is empty.
 * Uses API field names: job_id, reel_url, created_at.
 *
 * @param {Array<Object>} reels - Reel documents from FastAPI.
 * @returns {void}
 */
function renderReels(reels) {
  const reelGrid   = document.getElementById('reelGrid');
  const emptyState = document.getElementById('galleryEmpty');

  if (!reelGrid) return;

  // Show empty state when there are no reels to display
  if (reels.length === 0) {
    reelGrid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  reelGrid.innerHTML = reels.map((reel, index) => {
    const formattedDate = new Date(reel.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `
      <div class="reel-card" data-job-id="${reel.job_id}"
           style="animation: cardFadeIn 0.4s ease-out forwards; animation-delay: ${index * 0.05}s; opacity: 0;"
           onclick="openLightbox('${reel.reel_url}', 'Reel')">

        <div class="reel-status-badge ready">✓ Ready</div>

        <div class="reel-video-wrap">
          <video class="reel-thumb" preload="none" muted>
            <source src="${reel.reel_url}" type="video/mp4">
          </video>
          <div class="reel-overlay">
            <div class="reel-play-btn">▶</div>
          </div>
        </div>

        <div class="reel-card-body">
          <div class="reel-title">Reel</div>
          <div class="reel-meta-row">
            <span class="reel-date">${formattedDate}</span>
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
}

// ---------------------------------------------------------------------------
// Filtering and sorting (client-side — no API calls needed)
// ---------------------------------------------------------------------------

/**
 * Filter allReels by a case-insensitive search query and re-render.
 * Filters on the reel date string since reels have no title field.
 *
 * @param {string} query - Text typed into the search input.
 * @returns {void}
 */
function filterGallery(query) {
  const lowercaseQuery = query.toLowerCase();
  const filteredReels  = allReels.filter((reel) => {
    const dateString = new Date(reel.created_at)
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      .toLowerCase();
    return dateString.includes(lowercaseQuery);
  });
  renderReels(filteredReels);
}

/**
 * Sort allReels by the given criteria and re-render.
 *
 * @param {'newest'|'oldest'} sortValue - Sort order selected by the user.
 * @returns {void}
 */
function sortGallery(sortValue) {
  const sortedReels = [...allReels];

  if (sortValue === 'oldest') {
    sortedReels.sort(
      (reelA, reelB) => new Date(reelA.created_at) - new Date(reelB.created_at)
    );
  } else {
    // Default: newest first
    sortedReels.sort(
      (reelA, reelB) => new Date(reelB.created_at) - new Date(reelA.created_at)
    );
  }

  renderReels(sortedReels);
}

// ---------------------------------------------------------------------------
// View toggle
// ---------------------------------------------------------------------------

/**
 * Switch between grid and list view by toggling CSS classes.
 *
 * @param {'grid'|'list'} viewMode - The view layout to activate.
 * @returns {void}
 */
function setView(viewMode) {
  const gridButton = document.getElementById('grid-btn');
  const listButton = document.getElementById('list-btn');
  const reelGrid   = document.getElementById('reelGrid');

  if (gridButton) gridButton.classList.toggle('active', viewMode === 'grid');
  if (listButton) listButton.classList.toggle('active', viewMode === 'list');
  if (reelGrid)   reelGrid.className = 'reel-grid' + (viewMode === 'list' ? ' list-view' : '');
}

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

/**
 * Delete a reel by job_id. Removes the card from the DOM and the allReels
 * array on success. Restores card visibility on failure.
 *
 * @param {string} jobId - The UUID of the reel to delete.
 * @param {HTMLElement} triggerButton - The button that was clicked (used to find the card).
 * @returns {Promise<void>}
 */
async function handleDelete(jobId, triggerButton) {
  if (!confirm('Delete this reel? This cannot be undone.')) return;

  const reelCard = triggerButton.closest('.reel-card');

  // Animate the card out optimistically — reverts on error
  reelCard.style.transform  = 'scale(0) rotate(10deg)';
  reelCard.style.opacity    = '0';
  reelCard.style.transition = 'all 0.3s';

  try {
    await deleteReel(jobId);

    // Remove from master list so filter/sort stay in sync
    allReels = allReels.filter((reel) => reel.job_id !== jobId);

    setTimeout(() => {
      reelCard.remove();
      showToast('success', 'Reel deleted');

      // Show empty state if there are no cards left
      const remainingCards = document.querySelectorAll('.reel-card').length;
      if (remainingCards === 0) {
        const emptyState = document.getElementById('galleryEmpty');
        if (emptyState) emptyState.style.display = 'block';
      }
    }, 300);

  } catch (deleteError) {
    // Revert the optimistic animation so the user can try again
    reelCard.style.transform  = '';
    reelCard.style.opacity    = '';
    showToast('error', 'Could not delete reel: ' + deleteError.message);
    console.error('[gallery] handleDelete error:', deleteError);
  }
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

/**
 * Open the video lightbox and start playback.
 *
 * @param {string} videoUrl - Cloudinary HTTPS URL of the reel video.
 * @param {string} title    - Display title shown inside the lightbox.
 * @returns {void}
 */
function openLightbox(videoUrl, title) {
  if (!videoUrl) return;

  const lightboxEl       = document.getElementById('lightbox');
  const videoEl          = document.getElementById('lightboxVideo');
  const titleEl          = document.getElementById('lightboxTitle');
  const downloadButton   = document.getElementById('lightboxDownload');

  if (!lightboxEl || !videoEl) return;

  videoEl.src             = videoUrl;
  if (titleEl) titleEl.textContent = title;

  // Wire up the download button each time so it targets the current video
  if (downloadButton) {
    downloadButton.onclick = () => {
      const anchorEl    = document.createElement('a');
      anchorEl.href     = videoUrl;
      anchorEl.download = title + '.mp4';
      anchorEl.click();
    };
  }

  lightboxEl.classList.add('open');
  videoEl.play();
}

/**
 * Close the video lightbox and stop playback.
 *
 * @returns {void}
 */
function closeLightbox() {
  const lightboxEl = document.getElementById('lightbox');
  const videoEl    = document.getElementById('lightboxVideo');

  if (!lightboxEl || !videoEl) return;

  videoEl.pause();
  videoEl.src = '';
  lightboxEl.classList.remove('open');
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

/**
 * Display a transient toast notification at the bottom of the screen.
 * Auto-removes after 4 seconds.
 *
 * @param {'success'|'error'|'info'} type    - Visual style of the toast.
 * @param {string}                   message - Human-readable message to show.
 * @returns {void}
 */
function showToast(type, message) {
  let toastContainer = document.querySelector('.toast-container');

  if (!toastContainer) {
    toastContainer           = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toastIcons = { success: '✓', error: '✕', info: 'ℹ' };
  const toastEl    = document.createElement('div');
  toastEl.className = `toast ${type}`;
  toastEl.innerHTML = `<span class="toast-icon">${toastIcons[type] || 'ℹ'}</span> ${message}`;

  toastContainer.appendChild(toastEl);

  // Auto-remove after 4 seconds — long enough to read, short enough not to annoy
  setTimeout(() => toastEl.remove(), 4000);
}