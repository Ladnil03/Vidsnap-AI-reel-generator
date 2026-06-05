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
  const isAdminUser = localStorage.getItem('vidsnap_is_admin') === 'true';

  // Elements that exist in the navbar template
  const loginLink    = document.getElementById('navLogin');
  const signupLink   = document.getElementById('navSignup');
  const userSection  = document.getElementById('navUser');
  const userNameEl   = document.getElementById('navUserName');
  const tokenBadge   = document.getElementById('navTokenBadge');
  const feedbackLink = document.getElementById('navFeedback');
  const adminLink    = document.getElementById('navAdminDashboard');
  const createLink   = document.getElementById('navCreate');
  const galleryLink  = document.getElementById('navGallery');

  // Mobile drawer elements
  const drawerAdminLink    = document.getElementById('navDrawerAdminDashboard');
  const drawerCreateLink   = document.getElementById('navDrawerCreate');
  const drawerGalleryLink  = document.getElementById('navDrawerGallery');
  const drawerFeedbackLink = document.getElementById('navDrawerFeedback');

  if (token && name) {
    // Logged in state
    if (loginLink)    loginLink.style.display  = 'none';
    if (signupLink)   signupLink.style.display  = 'none';
    if (userSection)  userSection.style.display = 'flex';
    if (userNameEl)   userNameEl.textContent    = name;

    if (isAdminUser) {
      // Admin view
      if (tokenBadge)         tokenBadge.style.display = 'none';
      if (adminLink)          adminLink.style.display = 'block';
      if (drawerAdminLink)    drawerAdminLink.style.display = 'block';
      
      if (createLink)         createLink.style.display = 'none';
      if (galleryLink)        galleryLink.style.display = 'none';
      if (feedbackLink)       feedbackLink.style.display = 'none';
      if (drawerCreateLink)   drawerCreateLink.style.display = 'none';
      if (drawerGalleryLink)  drawerGalleryLink.style.display = 'none';
      if (drawerFeedbackLink) drawerFeedbackLink.style.display = 'none';
    } else {
      // Regular User view
      if (tokenBadge) {
        tokenBadge.style.display = 'inline-block';
        tokenBadge.textContent   = `${tokens} tokens`;
      }
      if (adminLink)          adminLink.style.display = 'none';
      if (drawerAdminLink)    drawerAdminLink.style.display = 'none';
      
      if (createLink)         createLink.style.display = 'block';
      if (galleryLink)        galleryLink.style.display = 'block';
      if (feedbackLink)       feedbackLink.style.display = 'block';
      if (drawerCreateLink)   drawerCreateLink.style.display = 'block';
      if (drawerGalleryLink)  drawerGalleryLink.style.display = 'block';
      if (drawerFeedbackLink) drawerFeedbackLink.style.display = 'block';
    }
  } else {
    // Logged out state
    if (loginLink)    loginLink.style.display  = '';
    if (signupLink)   signupLink.style.display  = '';
    if (userSection)  userSection.style.display = 'none';
    
    // Hide all protected links
    if (adminLink)          adminLink.style.display = 'none';
    if (createLink)         createLink.style.display = 'none';
    if (galleryLink)        galleryLink.style.display = 'none';
    if (feedbackLink)       feedbackLink.style.display = 'none';
    if (drawerAdminLink)    drawerAdminLink.style.display = 'none';
    if (drawerCreateLink)   drawerCreateLink.style.display = 'none';
    if (drawerGalleryLink)  drawerGalleryLink.style.display = 'none';
    if (drawerFeedbackLink) drawerFeedbackLink.style.display = 'none';
  }
}

// Wire up logout button
document.getElementById('navLogout')?.addEventListener('click', () => {
  // Clear localStorage using api helper if available
  if (typeof clearAuthData === 'function') {
    clearAuthData();
  } else {
    ['vidsnap_token','vidsnap_name','vidsnap_email','vidsnap_tokens','vidsnap_is_admin']
      .forEach(key => localStorage.removeItem(key));
  }
  window.location.href = '/login';
});

// Run on every page load
updateNavbarAuthState();

/* ── PROTECTED PAGE GUARD ── */

const protectedPaths = ['/create', '/gallery', '/feedback', '/profile', '/admin', '/admin/users', '/admin/reels', '/admin/feedback'];
const currentPath    = window.location.pathname;

const token = localStorage.getItem('vidsnap_token');
const isAdminUser = localStorage.getItem('vidsnap_is_admin') === 'true';

if (currentPath.startsWith('/admin')) {
  if (!token) {
    window.location.href = '/login';
  } else if (!isAdminUser) {
    window.location.href = '/';
  }
} else if (protectedPaths.includes(currentPath)) {
  if (!token) {
    window.location.href = '/login';
  } else if (isAdminUser && (currentPath === '/create' || currentPath === '/gallery' || currentPath === '/feedback')) {
    window.location.href = '/admin';
  }
}

// ── NAVBAR SCROLL EFFECT ──
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
});

// Run immediately in case the page loaded scrolled
const navbar = document.querySelector('.navbar');
if (navbar && window.scrollY > 20) {
  navbar.classList.add('scrolled');
}

// ── BUTTON HOVER RIPPLE EFFECT ──
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-primary, .btn-generate');
  if (btn) {
    // Create ripple span
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-span');
    
    // Position the ripple span
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    // Ensure relative positioning and overflow hidden
    if (window.getComputedStyle(btn).position === 'static') {
      btn.style.position = 'relative';
    }
    if (window.getComputedStyle(btn).overflow !== 'hidden') {
      btn.style.overflow = 'hidden';
    }
    
    btn.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
});

// ── SMOOTH PAGE TRANSITIONS ──
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link) {
    const href = link.getAttribute('href');
    const target = link.getAttribute('target');
    const download = link.hasAttribute('download');
    
    // Only intercept internal, non-download, non-blank links
    if (href && href.startsWith('/') && !href.startsWith('//') && !download && target !== '_blank') {
      // Don't intercept anchor links on same page
      if (href.includes('#') && href.split('#')[0] === window.location.pathname) {
        return;
      }
      
      e.preventDefault();
      document.body.classList.add('fade-out');
      
      setTimeout(() => {
        window.location.href = href;
      }, 200);
    }
  }
});