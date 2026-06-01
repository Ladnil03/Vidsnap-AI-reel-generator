/**
 * index.js — Scroll reveal, counter animation
 */

/* ── SCROLL REVEAL ── */
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(el => revealObserver.observe(el));

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