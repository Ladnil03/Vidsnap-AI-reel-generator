/**
 * auth.js — Password toggle, form validation
 */

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