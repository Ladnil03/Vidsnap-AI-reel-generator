/**
 * admin.js — VidSnap AI Administration Script
 * 
 * Enforces admin guard redirection, fetches data from the FastAPI admin endpoints,
 * and handles tables search, sorting, pagination, and token updates.
 */

'use strict';

// ── ADMIN GUARD ──
// Run immediately on script evaluation to prevent flashes of admin content
(function enforceGuard() {
  const token = localStorage.getItem('vidsnap_token');
  const isAdmin = localStorage.getItem('vidsnap_is_admin') === 'true';
  if (!token || !isAdmin) {
    window.location.href = '/login';
  }
})();

// Global state variables for lists
let adminUsers = [];
let adminReels = [];
let adminFeedback = [];

// Pagination and Sorting states
const paginationState = {
  users: { page: 1, perPage: 10, data: [] },
  reels: { page: 1, perPage: 12, data: [] }
};

const sortState = {
  users: { column: 'created_at', direction: 'desc' }
};

// ── DOM CONTENT LOADED ENTRY ──
document.addEventListener('DOMContentLoaded', async () => {
  // Setup global lightbox event listeners (close on Escape)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAdminLightbox();
    }
  });

  // Sidebar logout connection
  const sidebarLogout = document.getElementById('adminSidebarLogout');
  if (sidebarLogout) {
    sidebarLogout.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('navLogout')?.click();
    });
  }

  const path = window.location.pathname;

  if (path === '/admin') {
    await initDashboard();
  } else if (path === '/admin/users') {
    await initUsersPage();
  } else if (path === '/admin/reels') {
    await initReelsPage();
  } else if (path === '/admin/feedback') {
    await initFeedbackPage();
  }
});

// ── INIT DASHBOARD ──
async function initDashboard() {
  await loadDashboardStats();
  await loadRecentUsers();
  await loadRecentReels();
}

// ── INIT USERS PAGE ──
async function initUsersPage() {
  const searchInput = document.getElementById('userSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterUsers(e.target.value);
    });
  }

  // Setup sortable headers
  const headers = document.querySelectorAll('.admin-table th.sortable');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.column;
      handleUsersSort(column);
    });
  });

  await loadAllUsers();
}

// ── INIT REELS PAGE ──
async function initReelsPage() {
  const searchInput = document.getElementById('reelSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterReels(e.target.value);
    });
  }

  await loadAllReels();
}

// ── INIT FEEDBACK PAGE ──
async function initFeedbackPage() {
  await loadAllFeedback();
}

// ── API DATA LOADERS ──

// Load stats
async function loadDashboardStats() {
  try {
    const stats = await getAdminStats();
    
    const elements = {
      totalUsers: document.getElementById('statTotalUsers'),
      totalReels: document.getElementById('statTotalReels'),
      reelsToday: document.getElementById('statReelsToday'),
      totalFeedback: document.getElementById('statTotalFeedback')
    };

    if (elements.totalUsers) animateAdminCounter(elements.totalUsers, stats.total_users);
    if (elements.totalReels) animateAdminCounter(elements.totalReels, stats.total_reels);
    if (elements.reelsToday) animateAdminCounter(elements.reelsToday, stats.reels_today);
    if (elements.totalFeedback) animateAdminCounter(elements.totalFeedback, stats.total_feedback);

  } catch (error) {
    console.error('Error loading stats:', error);
    showAdminToast('error', 'Failed to load stats: ' + error.message);
  }
}

// Load recent users (limit = 5)
async function loadRecentUsers() {
  try {
    const users = await getAdminUsers();
    const tableBody = document.getElementById('recentUsersTableBody');
    if (!tableBody) return;

    const recent = users.slice(0, 5);
    if (recent.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text3);">No users registered yet</td></tr>`;
      return;
    }

    tableBody.innerHTML = recent.map(user => {
      const formattedDate = formatDate(user.created_at);
      return `
        <tr>
          <td style="font-weight:600;">${user.name}</td>
          <td>${user.email}</td>
          <td>${user.tokens_remaining}</td>
          <td>${user.total_reels}</td>
          <td style="color:var(--text3); font-size:0.8rem;">${formattedDate}</td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recent users:', error);
    showAdminToast('error', 'Failed to load recent users');
  }
}

// Load recent reels (limit = 5)
async function loadRecentReels() {
  try {
    const reels = await getAdminReels();
    const tableBody = document.getElementById('recentReelsTableBody');
    if (!tableBody) return;

    const recent = reels.slice(0, 5);
    if (recent.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text3);">No reels generated yet</td></tr>`;
      return;
    }

    tableBody.innerHTML = recent.map(reel => {
      const formattedDate = formatDate(reel.created_at);
      return `
        <tr>
          <td>${reel.user_email}</td>
          <td style="color:var(--text3); font-size:0.8rem;">${formattedDate}</td>
          <td>
            <button class="btn-view" onclick="openAdminLightbox('${reel.reel_url}', 'Reel Preview')">
              ▶ Play Reel
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recent reels:', error);
    showAdminToast('error', 'Failed to load recent reels');
  }
}

// Load all users (Users Page)
async function loadAllUsers() {
  try {
    adminUsers = await getAdminUsers();
    filterUsers('');
  } catch (error) {
    console.error('Error loading all users:', error);
    showAdminToast('error', 'Failed to load users: ' + error.message);
  }
}

// Load all reels (Reels Page)
async function loadAllReels() {
  try {
    adminReels = await getAdminReels();
    
    // Set total count
    const statsBar = document.getElementById('adminReelsCount');
    if (statsBar) {
      statsBar.textContent = `Total Reels Generated: ${adminReels.length}`;
    }
    
    filterReels('');
  } catch (error) {
    console.error('Error loading all reels:', error);
    showAdminToast('error', 'Failed to load reels: ' + error.message);
  }
}

// Load all feedback (Feedback Page)
async function loadAllFeedback() {
  try {
    adminFeedback = await getAdminFeedback();
    
    // Set total count
    const countBadge = document.getElementById('feedbackCount');
    if (countBadge) {
      countBadge.textContent = `Total Submissions: ${adminFeedback.length}`;
    }

    renderFeedbackCards(adminFeedback);
  } catch (error) {
    console.error('Error loading feedback:', error);
    showAdminToast('error', 'Failed to load feedback: ' + error.message);
  }
}

// ── USERS TABLE OPERATIONS ──

function filterUsers(query) {
  const lowercase = query.trim().toLowerCase();
  let filtered = adminUsers;
  
  if (lowercase) {
    filtered = adminUsers.filter(u => 
      u.name.toLowerCase().includes(lowercase) || 
      u.email.toLowerCase().includes(lowercase)
    );
  }

  // Apply sorting
  sortData(filtered, sortState.users.column, sortState.users.direction);

  paginationState.users.data = filtered;
  paginationState.users.page = 1;
  
  renderUsersTable();
}

function handleUsersSort(column) {
  const currentDir = sortState.users.column === column ? sortState.users.direction : 'desc';
  const newDir = currentDir === 'desc' ? 'asc' : 'desc';
  
  sortState.users.column = column;
  sortState.users.direction = newDir;

  // Update classes on th
  const headers = document.querySelectorAll('.admin-table th.sortable');
  headers.forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.column === column) {
      th.classList.add(newDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });

  // Re-run filter which will sort & render
  const searchInput = document.getElementById('userSearch');
  filterUsers(searchInput ? searchInput.value : '');
}

function renderUsersTable() {
  const tableBody = document.getElementById('usersTableBody');
  if (!tableBody) return;

  const paginated = paginate(paginationState.users.data, paginationState.users.page, paginationState.users.perPage);
  
  if (paginated.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text3);">No matching users found</td></tr>`;
    updatePaginationControls('users');
    return;
  }

  tableBody.innerHTML = paginated.map(user => {
    const formattedDate = formatDate(user.created_at);
    return `
      <tr id="user-row-${user.user_id}">
        <td style="font-weight:600;">${user.name}</td>
        <td>${user.email}</td>
        <td>
          <form class="token-form" onsubmit="handleTokenUpdate(event, '${user.user_id}')">
            <input type="number" class="token-input" id="token-input-${user.user_id}" value="${user.tokens_remaining}" min="0">
            <button class="btn-update" type="submit">Update</button>
          </form>
        </td>
        <td>${user.total_reels}</td>
        <td style="color:var(--text3); font-size:0.8rem;">${formattedDate}</td>
        <td>
          <button class="btn-update" style="background:var(--gradient2); box-shadow:none; padding: 6px 12px;" onclick="adjustTokensQuickly('${user.user_id}', 5)">
            +5 Tokens
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updatePaginationControls('users');
}

// ── REELS GRID OPERATIONS ──

function filterReels(query) {
  const lowercase = query.trim().toLowerCase();
  let filtered = adminReels;

  if (lowercase) {
    filtered = adminReels.filter(r => r.user_email.toLowerCase().includes(lowercase));
  }

  paginationState.reels.data = filtered;
  paginationState.reels.page = 1;

  renderReelsGrid();
}

function renderReelsGrid() {
  const grid = document.getElementById('adminReelsGrid');
  if (!grid) return;

  const paginated = paginate(paginationState.reels.data, paginationState.reels.page, paginationState.reels.perPage);

  if (paginated.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 5rem 0; color:var(--text3);">No reels found matching your search.</div>`;
    updatePaginationControls('reels');
    return;
  }

  grid.innerHTML = paginated.map(reel => {
    const formattedDate = formatDate(reel.created_at);
    return `
      <div class="reel-card admin-reel-card" onclick="openAdminLightbox('${reel.reel_url}', '${reel.user_email}')">
        <div class="reel-video-wrap">
          <video class="reel-thumb" preload="none" muted>
            <source src="${reel.reel_url}" type="video/mp4">
          </video>
          <div class="reel-overlay">
            <div class="reel-play-btn">▶</div>
          </div>
        </div>
        <div class="reel-card-body">
          <div class="reel-title" style="font-size:0.8rem; color:var(--text3);">Created ${formattedDate}</div>
          <div class="admin-reel-user" title="${reel.user_email}">👤 ${reel.user_email}</div>
        </div>
      </div>
    `;
  }).join('');

  updatePaginationControls('reels');
}

// ── FEEDBACK CARDS RENDER ──

function renderFeedbackCards(feedbackItems) {
  const container = document.getElementById('feedbackCardsContainer');
  if (!container) return;

  if (feedbackItems.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 5rem 0; color:var(--text3);">No feedback submissions received yet.</div>`;
    return;
  }

  container.innerHTML = feedbackItems.map(item => {
    const formattedDate = formatDate(item.created_at);
    
    // Extract a possible rating (stars) from comments if stars are not supported natively
    let starsHtml = '⭐⭐⭐⭐⭐';
    if (item.rating) {
      starsHtml = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
    } else {
      // Look for a number inside the feedback message, or default to nice stars
      starsHtml = '';
    }

    return `
      <div class="feedback-card">
        <div class="feedback-card-top">
          <div>
            <div class="feedback-user-name">${item.user_name}</div>
            <div class="feedback-user-email">${item.user_email}</div>
          </div>
          ${starsHtml ? `<div class="feedback-rating">${starsHtml}</div>` : ''}
        </div>
        <div class="feedback-message">${item.message}</div>
        <span class="feedback-date">${formattedDate}</span>
      </div>
    `;
  }).join('');
}

// ── TOKEN UPDATER ENDPOINT WRAPPERS ──

async function handleTokenUpdate(event, userId) {
  event.preventDefault();
  const input = document.getElementById(`token-input-${userId}`);
  if (!input) return;

  const newTokens = parseInt(input.value, 10);
  if (isNaN(newTokens) || newTokens < 0) {
    showAdminToast('error', 'Tokens must be a positive number');
    return;
  }

  try {
    await updateUserTokens(userId, newTokens);
    
    // Update local data state
    const userIndex = adminUsers.findIndex(u => u.user_id === userId);
    if (userIndex !== -1) {
      adminUsers[userIndex].tokens_remaining = newTokens;
    }

    // Success feedback
    showAdminToast('success', 'User tokens updated!');
    const row = document.getElementById(`user-row-${userId}`);
    if (row) {
      row.classList.add('flash-success');
      setTimeout(() => row.classList.remove('flash-success'), 1000);
    }
  } catch (error) {
    console.error('Error updating tokens:', error);
    showAdminToast('error', 'Failed to update tokens: ' + error.message);
  }
}

async function adjustTokensQuickly(userId, amount) {
  const input = document.getElementById(`token-input-${userId}`);
  if (!input) return;
  
  const currentTokens = parseInt(input.value, 10) || 0;
  const newTokens = currentTokens + amount;
  input.value = newTokens;

  // Trigger form submit programmatically
  const event = { preventDefault: () => {} };
  await handleTokenUpdate(event, userId);
}

// ── PAGINATION & SORTING HELPERS ──

function paginate(data, page, perPage) {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return data.slice(start, end);
}

function updatePaginationControls(type) {
  const prevBtn = document.getElementById(`${type}PrevBtn`);
  const nextBtn = document.getElementById(`${type}NextBtn`);
  const infoEl  = document.getElementById(`${type}PageInfo`);
  
  if (!prevBtn || !nextBtn || !infoEl) return;

  const state = paginationState[type];
  const totalItems = state.data.length;
  const totalPages = Math.max(Math.ceil(totalItems / state.perPage), 1);

  infoEl.textContent = `Page ${state.page} of ${totalPages}`;
  prevBtn.disabled = state.page === 1;
  nextBtn.disabled = state.page === totalPages || totalItems === 0;

  // Wire up handlers once
  prevBtn.onclick = () => {
    if (state.page > 1) {
      state.page--;
      if (type === 'users') renderUsersTable();
      else if (type === 'reels') renderReelsGrid();
    }
  };

  nextBtn.onclick = () => {
    if (state.page < totalPages) {
      state.page++;
      if (type === 'users') renderUsersTable();
      else if (type === 'reels') renderReelsGrid();
    }
  };
}

function sortData(array, column, direction) {
  array.sort((a, b) => {
    let valA = a[column];
    let valB = b[column];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── UTILITIES ──

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function animateAdminCounter(el, target) {
  let start = 0;
  const duration = 1200;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Lightbox
function openAdminLightbox(videoUrl, title) {
  if (!videoUrl) return;

  const lightboxEl       = document.getElementById('lightbox');
  const videoEl          = document.getElementById('lightboxVideo');
  const titleEl          = document.getElementById('lightboxTitle');
  const downloadButton   = document.getElementById('lightboxDownload');

  if (!lightboxEl || !videoEl) return;

  videoEl.src             = videoUrl;
  if (titleEl) titleEl.textContent = title;

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

function closeAdminLightbox() {
  const lightboxEl = document.getElementById('lightbox');
  const videoEl    = document.getElementById('lightboxVideo');

  if (!lightboxEl || !videoEl) return;

  videoEl.pause();
  videoEl.src = '';
  lightboxEl.classList.remove('open');
}

// Toast matching the existing layout style
function showAdminToast(type, message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span> ${message}`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
