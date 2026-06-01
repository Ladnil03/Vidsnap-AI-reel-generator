// ── APP INITIALIZATION & AUTHENTICATION CHECK ──

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
  const isProtectedPage = ['/create', '/gallery', '/feedback', '/profile'].some(p => 
    window.location.pathname === p
  );

  // Redirect to login if accessing protected page without token
  if (isProtectedPage && !token) {
    window.location.href = '/login';
    return;
  }

  // Redirect to home if already logged in and on auth pages
  if (isAuthPage && token) {
    window.location.href = '/';
    return;
  }

  // Update navigation based on auth status
  updateNavigation();
});

function updateNavigation() {
  const token = getToken();
  const userInfo = getUserInfo();
  
  // Hide/show nav items based on auth status
  const authItems = document.querySelectorAll('[data-auth-required="true"]');
  const guestItems = document.querySelectorAll('[data-guest-required="true"]');
  
  authItems.forEach(item => {
    item.style.display = token ? 'block' : 'none';
  });
  
  guestItems.forEach(item => {
    item.style.display = token ? 'none' : 'block';
  });

  // Display user info if logged in
  if (token && userInfo.name) {
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
      userDisplay.textContent = userInfo.name;
    }
    
    const tokensDisplay = document.getElementById('tokensDisplay');
    if (tokensDisplay) {
      tokensDisplay.textContent = `Tokens: ${userInfo.tokensRemaining}`;
    }
  }
}

// ── LOGOUT HANDLER ──
function handleLogout() {
  apiLogout();
  window.location.href = '/';
}

// ── THEME TOGGLE ──
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle?.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// ── HAMBURGER MENU ──
const hamburger = document.getElementById('hamburger');
const navDrawer = document.getElementById('navDrawer');

hamburger?.addEventListener('click', () => {
    navDrawer?.classList.toggle('open');
});

// Close drawer on outside click
document.addEventListener('click', (e) => {
    if (hamburger && navDrawer && !hamburger.contains(e.target) && !navDrawer.contains(e.target)) {
        navDrawer.classList.remove('open');
    }
});

// ── SCROLL REVEAL ──
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

reveals.forEach(el => observer.observe(el));

/* ── AUTH STATE IN NAVBAR ── */

/**
 * Update navbar links based on login state.
 * If logged in: show username, logout button, hide login/signup.
 * If logged out: show login/signup, hide user-specific links.
 * Reads user info from localStorage set by api.js after login.
 */
function updateNavbarAuthState() {
  const token  = localStorage.getItem('vidsnap_token');
  const name   = localStorage.getItem('vidsnap_name');
  const tokens = localStorage.getItem('vidsnap_tokens');

  // Elements that exist in the navbar template
  const loginLink    = document.getElementById('navLogin');
  const signupLink   = document.getElementById('navSignup');
  const userSection  = document.getElementById('navUser');
  const userNameEl   = document.getElementById('navUserName');
  const tokenBadge   = document.getElementById('navTokenBadge');
  const logoutBtn    = document.getElementById('navLogout');
  const feedbackLink = document.getElementById('navFeedback');

  if (token && name) {
    // Logged in state
    if (loginLink)    loginLink.style.display  = 'none';
    if (signupLink)   signupLink.style.display  = 'none';
    if (userSection)  userSection.style.display = 'flex';
    if (userNameEl)   userNameEl.textContent    = name;
    if (tokenBadge)   tokenBadge.textContent    = `${tokens} tokens`;
    if (feedbackLink) feedbackLink.style.display = '';
  } else {
    // Logged out state
    if (loginLink)    loginLink.style.display  = '';
    if (signupLink)   signupLink.style.display  = '';
    if (userSection)  userSection.style.display = 'none';
    if (feedbackLink) feedbackLink.style.display = 'none';
  }
}

// Wire up logout button
document.getElementById('navLogout')?.addEventListener('click', () => {
  // Clear localStorage
  ['vidsnap_token','vidsnap_name','vidsnap_email','vidsnap_tokens']
    .forEach(key => localStorage.removeItem(key));
  window.location.href = '/login';
});

// Run on every page load
updateNavbarAuthState();

/* ── PROTECTED PAGE GUARD ── */

/**
 * Pages that require login.
 * If user is not logged in and visits these paths, redirect to login.
 */
const protectedPaths = ['/create', '/gallery', '/feedback', '/profile'];
const currentPath    = window.location.pathname;

if (protectedPaths.includes(currentPath)) {
  const token = localStorage.getItem('vidsnap_token');
  if (!token) {
    window.location.href = '/login';
  }
}