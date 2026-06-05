/**
 * index.js — Authentication checks, scroll reveal, counter animation
 */

/* ── AUTHENTICATION CHECK ── */
document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const userInfo = getUserInfo();

  // Update CTA buttons based on auth status
  const loginCtaBtn = document.getElementById('loginCtaBtn');
  const createCtaBtn = document.getElementById('createCtaBtn');

  if (token) {
    // User is logged in
    if (loginCtaBtn) {
      loginCtaBtn.style.display = 'none';
    }
    if (createCtaBtn) {
      createCtaBtn.style.display = 'inline-block';
      createCtaBtn.href = '/create';
      createCtaBtn.textContent = 'Start Creating';
    }

    // Display user greeting
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && userInfo.name) {
      userGreeting.textContent = `Welcome back, ${userInfo.name}!`;
      userGreeting.style.display = 'block';
    }
  } else {
    // User is not logged in
    if (loginCtaBtn) {
      loginCtaBtn.style.display = 'inline-block';
      loginCtaBtn.href = '/login';
      loginCtaBtn.textContent = 'Get Started';
    }
    if (createCtaBtn) {
      createCtaBtn.style.display = 'none';
    }
  }
});

/* ── STAT COUNTER ANIMATION ── */
function animateCounter(el, target, suffix = '') {
  let start = 0;
  const duration = 1500;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    if (typeof target === 'number') {
      el.textContent = Math.floor(eased * target) + suffix;
    }
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── HERO TILT ON MOUSE MOVE ── */
const phoneFrame = document.querySelector('.phone-frame');
const heroVisual = document.querySelector('.hero-visual');

if (heroVisual && phoneFrame) {
  heroVisual.addEventListener('mousemove', (e) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    phoneFrame.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  });
  heroVisual.addEventListener('mouseleave', () => {
    phoneFrame.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
    phoneFrame.style.transition = 'transform 0.5s ease';
  });
  heroVisual.addEventListener('mouseenter', () => {
    phoneFrame.style.transition = 'transform 0.1s ease';
  });
}

/* ── STATS COUNTER SCROLL TRIGGER ── */
document.addEventListener('DOMContentLoaded', () => {
  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const statNums = entry.target.querySelectorAll('.stat-num');
          statNums.forEach(el => {
            const text = el.textContent.trim();
            if (text === '1080p') {
              animateCounter(el, 1080, 'p');
            } else if (text === '<60s') {
              // Custom count-up animation for "<60s" to preserve formatting
              let start = 0;
              const duration = 1500;
              const step = (timestamp) => {
                if (!start) start = timestamp;
                const progress = Math.min((timestamp - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = '<' + Math.floor(eased * 60) + 's';
                if (progress < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(statsSection);
  }
});