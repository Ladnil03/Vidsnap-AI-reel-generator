/**
 * create.js — Drag & drop, preview, stepper, generate
 */

let uploadedFiles = [];
const MAX_FILES = 20;

/* ── ELEMENTS ── */
const dropZone       = document.getElementById('dropZone');
const fileInput      = document.getElementById('fileInput');
const browseBtn      = document.getElementById('browseBtn');
const previewGrid    = document.getElementById('previewGrid');
const previewBadge   = document.getElementById('previewBadge');
const narrationText  = document.getElementById('narrationText');
const charCount      = document.getElementById('charCount');
const durationSlider = document.getElementById('durationSlider');
const sliderVal      = document.getElementById('sliderVal');
const generateBtn    = document.getElementById('generateBtn');
const btnText        = document.getElementById('btnText');
const btnSpinner     = document.getElementById('btnSpinner');
const processingPanel= document.getElementById('processingPanel');
const procBar        = document.getElementById('procBar');
const procTitle      = document.getElementById('procTitle');

/* ── DRAG & DROP ── */
if (dropZone) {
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
}

browseBtn?.addEventListener('click', e => {
  e.stopPropagation();
  fileInput.click();
});

fileInput?.addEventListener('change', () => handleFiles(fileInput.files));

/* ── HANDLE FILES ── */
function handleFiles(files) {
  const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
  const remaining = MAX_FILES - uploadedFiles.length;
  if (arr.length > remaining) {
    showToast('info', `Only ${remaining} more image(s) allowed (max ${MAX_FILES})`);
  }
  arr.slice(0, remaining).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      uploadedFiles.push({ name: file.name, src: ev.target.result, file });
      renderPreviews();
      updateProgress();
    };
    reader.readAsDataURL(file);
  });
}

/* ── RENDER PREVIEWS ── */
function renderPreviews() {
  if (!previewGrid) return;
  previewGrid.innerHTML = '';
  uploadedFiles.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <img src="${f.src}" alt="${f.name}">
      <span class="preview-item-num">${i + 1}</span>
      <button class="preview-item-del" onclick="removeFile(${i})" title="Remove">✕</button>`;
    previewGrid.appendChild(item);
  });
  if (previewBadge) {
    previewBadge.innerHTML = uploadedFiles.length > 0
      ? `✓ ${uploadedFiles.length} image${uploadedFiles.length > 1 ? 's' : ''} selected`
      : '';
  }
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderPreviews();
  updateProgress();
  showToast('info', 'Image removed');
}

/* ── CHAR COUNT ── */
narrationText?.addEventListener('input', () => {
  const len = narrationText.value.length;
  if (charCount) {
    charCount.textContent = len + ' / 900';
    charCount.classList.toggle('warn', len > 600);
    charCount.classList.toggle('max',  len > 850);
  }
  updateProgress();
});

/* ── SLIDER ── */
durationSlider?.addEventListener('input', () => {
  if (sliderVal) sliderVal.textContent = durationSlider.value + 's';
});

/* ── PROGRESS STEPPER ── */
function updateProgress() {
  const hasImages = uploadedFiles.length > 0;
  const hasText   = narrationText?.value.trim().length > 0;
  setProgStep(1, hasImages ? 'done' : 'active');
  setProgStep(2, hasImages && hasText ? 'done' : hasImages ? 'active' : '');
  setProgStep(3, hasImages && hasText ? 'active' : '');
}

function setProgStep(n, state) {
  const el = document.getElementById('prog-' + n);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state) el.classList.add(state);
  el.querySelector('.prog-dot').innerHTML = state === 'done' ? '✓' : String(n);
}

/* ── GENERATE ── */
generateBtn?.addEventListener('click', startGenerate);

async function startGenerate() {
  if (uploadedFiles.length === 0) {
    showToast('error', 'Please upload at least one image');
    return;
  }
  if (!narrationText?.value.trim()) {
    showToast('error', 'Please write your voiceover text');
    return;
  }

  // Lock UI
  generateBtn.disabled = true;
  if (btnText)     btnText.innerHTML = 'Uploading…';
  if (btnSpinner)  btnSpinner.style.display = 'block';
  if (processingPanel) processingPanel.classList.add('show');

  // Start stage animations
  startStageAnimations();

  // Build FormData
  const formData = new FormData();
  uploadedFiles.forEach(f => formData.append('images', f.file));
  formData.append('voiceover_text', narrationText.value);
  formData.append('voice', document.querySelector('input[name="voice"]:checked')?.value || 'natural');
  formData.append('duration', durationSlider?.value || '3');

  try {
    const res  = await fetch('/create', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      // Complete all stages
      completeAllStages();
      showToast('success', '🎉 Your reel is ready! Redirecting to gallery…');
      setTimeout(() => { window.location.href = '/gallery'; }, 2000);
    } else {
      throw new Error(data.error || 'Generation failed');
    }

  } catch (err) {
    // Reset UI on error
    generateBtn.disabled = false;
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (btnText)    btnText.innerHTML = '✨ Generate My Reel';
    if (processingPanel) processingPanel.classList.remove('show');
    resetStages();
    showToast('error', err.message || 'Something went wrong. Please try again.');
  }
}

/* ── STAGE ANIMATIONS ── */
let stageTimers = [];

function startStageAnimations() {
  // Clear any previous timers
  stageTimers.forEach(t => clearTimeout(t));
  stageTimers = [];

  const stages   = ['stage-1', 'stage-2', 'stage-3'];
  const delays   = [500, 2500, 5000];
  const progPcts = [25, 60, 85];

  stages.forEach((id, i) => {
    const t = setTimeout(() => {
      // Mark previous stage done
      if (i > 0) {
        document.getElementById(stages[i - 1])?.classList.replace('active', 'done');
      }
      document.getElementById(id)?.classList.add('active');
      if (procBar) procBar.style.width = progPcts[i] + '%';
      if (btnText) btnText.innerHTML = i === 0
        ? 'Uploading…'
        : i === 1
        ? 'Generating voiceover…'
        : 'Stitching video…';
    }, delays[i]);
    stageTimers.push(t);
  });
}

function completeAllStages() {
  stageTimers.forEach(t => clearTimeout(t));
  stageTimers = [];

  ['stage-1', 'stage-2', 'stage-3'].forEach(id => {
    const el = document.getElementById(id);
    el?.classList.remove('active');
    el?.classList.add('done');
  });

  if (procBar)   procBar.style.width = '100%';
  if (procTitle) procTitle.innerHTML = '<span style="color:var(--teal)">✓ Reel generated successfully!</span>';
  if (btnSpinner) btnSpinner.style.display = 'none';
  if (btnText)   btnText.innerHTML = '✨ Redirecting to gallery…';
  setProgStep(3, 'done');
}

function resetStages() {
  stageTimers.forEach(t => clearTimeout(t));
  stageTimers = [];
  ['stage-1', 'stage-2', 'stage-3'].forEach(id => {
    const el = document.getElementById(id);
    el?.classList.remove('active', 'done');
  });
  if (procBar) procBar.style.width = '0%';
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