/**
 * GingerPay — app.js
 * Calls /api/pay (server proxy — API key never here).
 * SSE for real-time callback + polling fallback every 5s.
 */

// ── Theme ────────────────────────────────────────────────
const html       = document.documentElement;
const themeBtn   = document.getElementById('themeToggle');
const sunIcon    = document.getElementById('sunIcon');
const moonIcon   = document.getElementById('moonIcon');
const themeLabel = document.getElementById('themeLabel');
const themeMeta  = document.getElementById('themeColorMeta');

function applyTheme(mode) {
  const isLight = mode === 'light';
  html.classList.toggle('light', isLight);
  html.classList.toggle('dark', !isLight);
  sunIcon.style.display  = isLight ? 'none' : '';
  moonIcon.style.display = isLight ? '' : 'none';
  themeLabel.textContent = isLight ? 'Dark' : 'Light';
  if (themeMeta) themeMeta.content = isLight ? '#F8FAFC' : '#000000';
}

applyTheme(localStorage.getItem('gp-theme') || 'dark');
themeBtn.addEventListener('click', () => {
  const next = html.classList.contains('light') ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('gp-theme', next);
});

// ── Phone helpers ────────────────────────────────────────
function toLocal(input) {
  let p = String(input).replace(/[\s\-\+\(\)]/g, '');
  if (p.startsWith('254')) p = '0' + p.slice(3);
  return p;
}
function isValidPhone(v) { return /^(07|01)\d{8}$/.test(toLocal(v)); }
function isValidAmount(v) { const n = parseFloat(v); return !isNaN(n) && n >= 1; }

// ── DOM refs ─────────────────────────────────────────────
const amountInput = document.getElementById('amountInput');
const phoneInput  = document.getElementById('phoneInput');
const amountIcon  = document.getElementById('amountIcon');
const phoneIcon   = document.getElementById('phoneIcon');
const amountError = document.getElementById('amountError');
const phoneError  = document.getElementById('phoneError');
const payBtn      = document.getElementById('payBtn');
const btnIconWrap = document.getElementById('btnIconWrap');
const btnSpinner  = document.getElementById('btnSpinner');
const btnText     = document.getElementById('btnText');
const statusSection = document.getElementById('statusSection');
const statusCard    = document.getElementById('statusCard');

// SVG helpers
const svgCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const svgX     = `<svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const svgPhoneDefault = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8.5 7 Q12 5.5 15.5 7" stroke-width="1.5"/><circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>`;

// ── Field state ──────────────────────────────────────────
function setField(input, iconEl, errEl, state, msg) {
  input.classList.remove('valid', 'error');
  iconEl.innerHTML = '';
  errEl.classList.add('hidden');
  errEl.textContent = '';

  if (state === true)  { input.classList.add('valid'); iconEl.innerHTML = svgCheck; }
  if (state === false) {
    input.classList.add('error'); iconEl.innerHTML = svgX;
    errEl.textContent = msg; errEl.classList.remove('hidden');
    // Re-trigger shake
    input.style.animation = 'none';
    requestAnimationFrame(() => { input.style.animation = ''; });
  }
}

// Amount: only allow digits
amountInput.addEventListener('input', () => {
  // Strip non-numeric characters
  amountInput.value = amountInput.value.replace(/[^0-9]/g, '');
  const v = amountInput.value;
  if (!v) { setField(amountInput, amountIcon, amountError, null); return; }
  setField(amountInput, amountIcon, amountError, isValidAmount(v), 'Minimum amount is KES 1');
});

phoneInput.addEventListener('input', () => {
  const v = phoneInput.value;
  if (!v) { setField(phoneInput, phoneIcon, phoneError, null); return; }
  setField(phoneInput, phoneIcon, phoneError, isValidPhone(v), 'Enter a valid number: 07XX, 01XX, 2547XX or 2541XX');
});

phoneInput.addEventListener('blur', () => {
  const v = phoneInput.value.trim();
  if (v && isValidPhone(v)) phoneInput.value = toLocal(v);
});

// ── Button state ─────────────────────────────────────────
function setBtnState(state) {
  payBtn.classList.remove('state-loading', 'state-success', 'state-error');
  payBtn.disabled = false;
  btnSpinner.classList.add('hidden');
  btnIconWrap.classList.remove('hidden');

  switch (state) {
    case 'loading':
      payBtn.classList.add('state-loading');
      payBtn.disabled = true;
      btnSpinner.classList.remove('hidden');
      btnIconWrap.classList.add('hidden');
      btnText.textContent = 'Sending STK Push…';
      break;
    case 'success':
      payBtn.classList.add('state-success');
      payBtn.disabled = true;
      btnIconWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      btnText.textContent = 'Check Your Phone';
      break;
    case 'error':
      payBtn.classList.add('state-error');
      btnIconWrap.innerHTML = svgX;
      btnText.textContent = 'Payment Failed';
      break;
    default:
      btnIconWrap.innerHTML = svgPhoneDefault;
      btnText.textContent = 'Pay with M-Pesa';
  }
}

// ── Status rendering ─────────────────────────────────────
function showStatus(type, data) {
  statusSection.classList.remove('hidden');

  if (type === 'waiting') {
    statusCard.innerHTML = `
      <div class="status-icon s-pending" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round">
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <path d="M8.5 7 Q12 5.5 15.5 7" stroke-width="1.5"/>
          <circle cx="12" cy="15" r="1.5" fill="#F59E0B" stroke="none"/>
        </svg>
      </div>
      <p class="status-title" style="color:var(--gold)">Check Your Phone</p>
      <p class="status-sub">STK Push sent to <strong>${data.phone}</strong>.<br>Enter your M-Pesa PIN to complete payment.</p>
      <div class="status-progress"><div class="progress-bar" id="progressBar"></div></div>
      <p class="countdown-text" id="countdownText">Waiting for confirmation…</p>
    `;
  } else if (type === 'confirmed') {
    statusCard.innerHTML = `
      <div class="confetti-stage" id="confettiStage" aria-hidden="true"></div>
      <div class="status-icon s-success" aria-hidden="true">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle class="check-circle" cx="12" cy="12" r="10" stroke="#22C55E" stroke-width="2"/>
          <path class="check-path" d="M8 12l3 3 5-5"/>
        </svg>
      </div>
      <p class="status-title" style="color:var(--green)">Payment Confirmed!</p>
      <p class="status-sub">Transaction successful.<br>Thank you for using GingerPay!</p>
      ${data.mpesaReceipt ? `<div class="txn-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>${data.mpesaReceipt}</div>` : ''}
      ${data.amount ? `<div class="txn-pill" style="margin-top:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>KES ${data.amount}</div>` : ''}
      <button class="btn-retry" id="retryBtn">Make Another Payment</button>
    `;
    spawnConfetti();
    setBtnState('reset');
    document.getElementById('retryBtn').addEventListener('click', resetForm);
  } else if (type === 'failed') {
    statusCard.innerHTML = `
      <div class="status-icon s-error" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <p class="status-title" style="color:var(--red)">Payment Not Completed</p>
      <p class="status-sub">${data.resultDesc || 'The payment was cancelled or not completed.'}<br>Please try again.</p>
      <button class="btn-retry" id="retryBtn">Try Again</button>
    `;
    setBtnState('reset');
    document.getElementById('retryBtn').addEventListener('click', resetForm);
  } else if (type === 'timeout') {
    statusCard.innerHTML = `
      <div class="status-icon s-timeout" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <p class="status-title" style="color:var(--text-2)">Window Expired</p>
      <p class="status-sub">The payment window expired. Check your M-Pesa messages to confirm if payment went through.</p>
      <button class="btn-retry" id="retryBtn">Try Again</button>
    `;
    setBtnState('reset');
    document.getElementById('retryBtn').addEventListener('click', resetForm);
  } else if (type === 'apierror') {
    statusCard.innerHTML = `
      <div class="status-icon s-error" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <p class="status-title" style="color:var(--red)">Payment Failed</p>
      <p class="status-sub">${data.message || 'Something went wrong. Please try again.'}</p>
      <button class="btn-retry" id="retryBtn">Try Again</button>
    `;
    setBtnState('error');
    document.getElementById('retryBtn').addEventListener('click', resetForm);
  }

  statusSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Confetti ─────────────────────────────────────────────
function spawnConfetti() {
  const stage = document.getElementById('confettiStage');
  if (!stage) return;
  const colors = ['#F59E0B','#FCD34D','#3B82F6','#22C55E','#EF4444','#8B5CF6','#EC4899'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = 5 + Math.random() * 7;
    p.style.cssText = `
      left:${10 + Math.random() * 80}%;bottom:4px;
      width:${size}px;height:${size}px;
      background:${colors[i % colors.length]};
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      animation-delay:${Math.random() * .5}s;
      animation-duration:${.7 + Math.random() * .6}s;
      transform:rotate(${Math.random()*360}deg);
    `;
    stage.appendChild(p);
  }
}

// ── Progress bar ─────────────────────────────────────────
let progressInterval = null;

function startProgress(ms) {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  let elapsed = 0;
  const tick = 250;
  progressInterval = setInterval(() => {
    elapsed += tick;
    bar.style.width = Math.min((elapsed / ms) * 100, 98) + '%';
    const remaining = Math.max(0, Math.ceil((ms - elapsed) / 1000));
    const ct = document.getElementById('countdownText');
    if (ct) ct.textContent = remaining > 0 ? `Waiting… (${remaining}s)` : 'Verifying…';
    if (elapsed >= ms) clearInterval(progressInterval);
  }, tick);
}

function stopProgress() {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = '100%';
}

// ── Active connections ────────────────────────────────────
let pollTimer    = null;
let pollCount    = 0;
const MAX_POLLS  = 20; // 20 × 3s = 60s

function cleanup() {
  if (pollTimer)  { clearInterval(pollTimer); pollTimer = null; }
  stopProgress();
  pollCount = 0;
}

async function pollResult(phone) {
  if (pollCount >= MAX_POLLS) { cleanup(); showStatus('timeout', {}); return; }
  pollCount++;
  try {
    const r = await fetch(`/api/result?phone=${encodeURIComponent(phone)}`);
    const d = await r.json();
    if (d.status === 'SUCCESS') { cleanup(); showStatus('confirmed', d); }
    else if (d.status === 'FAILED') { cleanup(); showStatus('failed', { resultDesc: d.resultDesc }); }
    // PENDING keep polling
  } catch { /* network hiccup keep polling */ }
}

function startListening(reference, phone) {
  showStatus('waiting', { phone });
  startProgress(62_000);

  // Poll every 3s starting after 5s (give user time to enter PIN)
  setTimeout(() => {
    pollTimer = setInterval(() => pollResult(phone), 3000);
  }, 5000);
}

// ── Reset ─────────────────────────────────────────────────
function resetForm() {
  cleanup();
  amountInput.value = '';
  phoneInput.value  = '';
  setField(amountInput, amountIcon, amountError, null);
  setField(phoneInput,  phoneIcon,  phoneError,  null);
  setBtnState('reset');
  statusSection.classList.add('hidden');
  statusCard.innerHTML = '';
  amountInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Pay ───────────────────────────────────────────────────
payBtn.addEventListener('click', async () => {
  const rawAmount = amountInput.value.trim();
  const rawPhone  = phoneInput.value.trim();

  let err = false;
  if (!isValidAmount(rawAmount)) { setField(amountInput, amountIcon, amountError, false, 'Please enter at least KES 1'); err = true; }
  if (!isValidPhone(rawPhone))   { setField(phoneInput,  phoneIcon,  phoneError,  false, 'Enter a valid number: 07XX, 01XX, 2547XX'); err = true; }
  if (err) return;

  cleanup();
  statusSection.classList.add('hidden');
  setBtnState('loading');

  try {
    const res  = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rawPhone, amount: rawAmount }),
    });
    const data = await res.json();

    if (data.success) {
      setBtnState('success');
      startListening(data.checkoutRequestId, toLocal(rawPhone));
    } else {
      showStatus('apierror', { message: data.message });
    }
  } catch (err) {
    showStatus('apierror', { message: err.message || 'Network error — check your connection.' });
  }
});

// Enter key submits
[amountInput, phoneInput].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') payBtn.click(); })
);

// Restore icon on init
setBtnState('reset');
