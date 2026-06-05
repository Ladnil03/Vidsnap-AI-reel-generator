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
      const data = await login(emailInput.value.trim(), passwordInput.value);
      const roleInput = document.querySelector('input[name="loginRole"]:checked');
      const selectedRole = roleInput ? roleInput.value : 'user';

      if (selectedRole === 'admin' && !data.is_admin) {
        // Clear saved auth data because they failed the role verification
        if (typeof clearAuthData === 'function') {
          clearAuthData();
        } else {
          ['vidsnap_token','vidsnap_name','vidsnap_email','vidsnap_tokens','vidsnap_is_admin']
            .forEach(key => localStorage.removeItem(key));
        }
        throw new Error("Access denied: You do not have administrator privileges.");
      }

      // If user logs in as "user", override admin role storage locally to false
      // so they can see the normal site interface without admin links
      if (selectedRole === 'user') {
        localStorage.setItem('vidsnap_is_admin', 'false');
      }

      if (data.is_admin && selectedRole === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }
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

/* ── FORGOT PASSWORD MODAL ── */

/**
 * Show or hide the forgot-password modal overlay.
 * @param {boolean} visible - True to show, false to hide.
 */
function setForgotModalVisible(visible) {
  const modal = document.getElementById('forgotModal');
  if (!modal) return;
  modal.style.display = visible ? 'flex' : 'none';

  if (visible) {
    // Reset back to Step 1 whenever the modal is opened
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    const forgotAlert = document.getElementById('forgotAlert');
    if (forgotAlert) { forgotAlert.style.display = 'none'; }
    const forgotEmailInput = document.getElementById('forgotEmail');
    if (forgotEmailInput) { forgotEmailInput.value = ''; }
  }
}

// Open modal when "Forgot password?" link is clicked
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (event) => {
    event.preventDefault();
    setForgotModalVisible(true);
  });
}

// Close modal on X button click
const forgotModalClose = document.getElementById('forgotModalClose');
if (forgotModalClose) {
  forgotModalClose.addEventListener('click', () => setForgotModalVisible(false));
}

// Close modal when clicking the dark backdrop (outside the card)
const forgotModal = document.getElementById('forgotModal');
if (forgotModal) {
  forgotModal.addEventListener('click', (event) => {
    if (event.target === forgotModal) setForgotModalVisible(false);
  });
}

/**
 * Handle Step 1 — request OTP email.
 * Calls forgotPassword() from api.js which posts to /api/auth/forgot-password.
 */
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
  // Track which email was entered so Step 2 can use it
  let pendingResetEmail = '';

  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput  = document.getElementById('forgotEmail');
    const submitBtn   = document.getElementById('forgotSubmitBtn');
    const alertBox    = document.getElementById('forgotAlert');

    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="auth-btn-spinner"></span> Sending OTP...';

    try {
      await forgotPassword(emailInput.value.trim());
      pendingResetEmail = emailInput.value.trim();

      // Advance to Step 2
      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = 'block';
    } catch (error) {
      if (alertBox) {
        alertBox.className    = 'auth-alert error';
        alertBox.innerHTML    = `✕ ${error.message}`;
        alertBox.style.display = 'flex';
      }
      submitBtn.disabled  = false;
      submitBtn.innerHTML = 'Send OTP';
    }

    /**
     * Handle Step 2 — verify OTP and set new password.
     * Only registers this listener once, after the email is confirmed in Step 1.
     */
    const resetForm = document.getElementById('resetForm');
    if (resetForm && !resetForm.dataset.listenerAttached) {
      resetForm.dataset.listenerAttached = 'true';

      resetForm.addEventListener('submit', async (resetEvent) => {
        resetEvent.preventDefault();

        const otpInput      = document.getElementById('resetOtp');
        const passwordInput = document.getElementById('resetPassword');
        const resetSubmitBtn = document.getElementById('resetSubmitBtn');
        const resetAlertBox = document.getElementById('resetAlert');

        if (passwordInput.value.length < 8) {
          if (resetAlertBox) {
            resetAlertBox.className    = 'auth-alert error';
            resetAlertBox.innerHTML    = '✕ Password must be at least 8 characters.';
            resetAlertBox.style.display = 'flex';
          }
          return;
        }

        resetSubmitBtn.disabled  = true;
        resetSubmitBtn.innerHTML = '<span class="auth-btn-spinner"></span> Resetting...';

        try {
          await resetPassword(pendingResetEmail, otpInput.value.trim(), passwordInput.value);

          // Success — close modal and show login alert
          setForgotModalVisible(false);
          const loginAlertBox = document.getElementById('authAlert');
          if (loginAlertBox) {
            loginAlertBox.className    = 'auth-alert success';
            loginAlertBox.innerHTML    = '✓ Password reset! Please log in with your new password.';
            loginAlertBox.style.display = 'flex';
          }
        } catch (resetError) {
          if (resetAlertBox) {
            resetAlertBox.className    = 'auth-alert error';
            resetAlertBox.innerHTML    = `✕ ${resetError.message}`;
            resetAlertBox.style.display = 'flex';
          }
          resetSubmitBtn.disabled  = false;
          resetSubmitBtn.innerHTML = 'Reset Password';
        }
      });
    }
  });
}