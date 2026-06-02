/**
 * auth.js — Authentication Wrapper & UI Utilities
 * 
 * All API calls delegated to api.js
 * This file provides backward-compatible wrappers for templates.
 */

/* ── TOKEN MANAGEMENT (delegated to api.js) ── */

function clearToken() {
  clearAuthData();
}

function getUserInfo() {
  const currentUser = getCurrentUser();
  return currentUser || {
    name: '',
    email: '',
    tokensRemaining: 0
  };
}

/* ── AUTH API WRAPPERS ── */

async function apiSignup(name, email, password) {
  return signup(name, email, password);
}

async function apiLogin(email, password) {
  return login(email, password);
}

async function apiLogout() {
  logout();
}

async function apiForgotPassword(email) {
  return forgotPassword(email);
}

async function apiResetPassword(email, otp, newPassword) {
  return resetPassword(email, otp, newPassword);
}

async function apiGetUserProfile() {
  return getProfile();
}

/* ── PASSWORD TOGGLE ── */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

/* ── PASSWORD STRENGTH ── */
const regPassword = document.getElementById('regPassword');
if (regPassword) {
  regPassword.addEventListener('input', () => {
    const val      = regPassword.value;
    const strength = getStrength(val);
    updateStrengthBar(strength);
  });
}

function getStrength(val) {
  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  return score;
}

function updateStrengthBar(score) {
  const bar   = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (!bar || !label) return;

  const levels = [
    { label: '',          color: 'transparent', width: '0%'   },
    { label: 'Very Weak', color: '#ff5c5c',     width: '20%'  },
    { label: 'Weak',      color: '#ff8c42',     width: '40%'  },
    { label: 'Fair',      color: '#ffd166',     width: '60%'  },
    { label: 'Strong',    color: '#06d6a0',     width: '80%'  },
    { label: 'Very Strong', color: '#4895ef',   width: '100%' },
  ];

  const level      = levels[Math.min(score, 5)];
  bar.style.width  = level.width;
  bar.style.background = level.color;
  label.textContent    = level.label;
  label.style.color    = level.color;
}

/* ── CONFIRM PASSWORD MATCH ── */
const regConfirm = document.getElementById('regConfirm');
if (regConfirm) {
  regConfirm.addEventListener('input', () => {
    const match = regConfirm.value === regPassword?.value;
    regConfirm.style.borderColor = regConfirm.value
      ? match ? 'var(--teal)' : 'var(--accent)'
      : '';
  });
}

/* ── FORM SUBMIT LOADING STATE ── */
document.querySelectorAll('.auth-form').forEach(form => {
  form.addEventListener('submit', () => {
    const btn = form.querySelector('.auth-submit');
    if (btn) {
      btn.disabled     = true;
      btn.innerHTML    = '<span class="auth-btn-spinner"></span> Please wait…';
    }
  });
});

/* ── API INTEGRATION ── */

/**
 * Handle login form submission.
 * Calls FastAPI POST /api/auth/login via api.js login() function.
 * On success: redirects to home page.
 * On error: shows error message in .auth-alert element.
 */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput    = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn     = loginForm.querySelector('.auth-submit');
    const alertBox      = document.getElementById('authAlert');

    // Show loading state
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="auth-btn-spinner"></span> Signing in...';

    try {
      await login(emailInput.value.trim(), passwordInput.value);
      // Redirect on success
      window.location.href = '/';
    } catch (error) {
      // Show error message
      if (alertBox) {
        alertBox.className   = 'auth-alert error';
        alertBox.innerHTML   = `✕ ${error.message}`;
        alertBox.style.display = 'flex';
      }
      // Reset button
      submitBtn.disabled  = false;
      submitBtn.innerHTML = 'Sign In';
    }
  });
}

/**
 * Handle signup/register form submission.
 * Calls FastAPI POST /api/auth/signup via api.js signup() function.
 * On success: redirects to home page (user is auto logged in).
 * On error: shows error message.
 */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nameInput     = document.getElementById('regName');
    const emailInput    = document.getElementById('regEmail');
    const passwordInput = document.getElementById('regPassword');
    const confirmInput  = document.getElementById('regConfirm');
    const submitBtn     = registerForm.querySelector('.auth-submit');
    const alertBox      = document.getElementById('authAlert');

    // Client-side validation
    if (passwordInput.value !== confirmInput.value) {
      if (alertBox) {
        alertBox.className    = 'auth-alert error';
        alertBox.innerHTML    = '✕ Passwords do not match.';
        alertBox.style.display = 'flex';
      }
      return;
    }

    if (passwordInput.value.length < 8) {
      if (alertBox) {
        alertBox.className    = 'auth-alert error';
        alertBox.innerHTML    = '✕ Password must be at least 8 characters.';
        alertBox.style.display = 'flex';
      }
      return;
    }

    // Show loading state
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="auth-btn-spinner"></span> Creating account...';

    try {
      await signup(
        nameInput.value.trim(),
        emailInput.value.trim(),
        passwordInput.value
      );
      window.location.href = '/';
    } catch (error) {
      if (alertBox) {
        alertBox.className    = 'auth-alert error';
        alertBox.innerHTML    = `✕ ${error.message}`;
        alertBox.style.display = 'flex';
      }
      submitBtn.disabled  = false;
      submitBtn.innerHTML = 'Create Account';
    }
  });
}