/**
 * GingerPay — app.js (Vercel edition)
 * Uses simple polling against /api/result?phone=07XX
 * No SSE needed — works perfectly on serverless.
 */

// ── Theme ───────────────────────────────────────────────────
const html        = document.documentElement;
const toggleBtn   = document.getElementById('themeToggle');
const sunIcon     = document.getElementById('sunIcon');
const moonIcon    = document.getElementById('moonIcon');
const toggleLabel = document.getElementById('toggleLabel');

function applyTheme(mode) {
  const light = mode === 'light';
  html.classList.toggle('light', light);
  html.classList.toggle('dark', !light);
  sunIcon.style.display  = light ? 'none' : '';
  moonIcon.style.display = light ? '' : 'none';
  toggleLabel.textContent = light ? 'Dark' : 'Light';
}
applyTheme(localStorage.getItem('gp-theme') || 'dark');
toggleBtn.addEventListener('click', () => {
  const next = html.classList.contains('light') ? 'dark' : 'light';
  applyTheme(next); localStorage.setItem('gp-theme', next);
});

// ── Phone helpers ───────────────────────────────────────────
function normalizePhone(input) {
  let p = String(input).replace(/[\s\-\+\(\)]/g, '');
  if (p.startsWith('254')) p = '0' + p.slice(3);
  return p;
}
function isValidPhone(v)  { return /^(07|01)\d{8}$/.test(normalizePhone(v)); }
function isValidAmount(v) { const n = parseFloat(v); return !isNaN(n) && n >= 1; }

// ── DOM refs ────────────────────────────────────────────────
const amountInput = document.getElementById('amountInput');
const phoneInput  = document.getElementById('phoneInput');
const amountRow   = amountInput.closest('.input-row');
const phoneRow    = phoneInput.closest('.input-row');
const amountOk    = document.getElementById('amountOk');
const amountBad   = document.getElementById('amountBad');
const phoneOk     = document.getElementById('phoneOk');
const phoneBad    = document.getElementById('phoneBad');
const amountErr   = document.getElementById('amountErr');
const phoneErr    = document.getElementById('phoneErr');
const payBtn      = document.getElementById('payBtn');
const btnText     = document.getElementById('btnText');
const btnSpinner  = document.getElementById('btnSpinner');
const btnIcon     = document.getElementById('btnIcon');
const formBody    = document.getElementById('formBody');
const statusPanel = document.getElementById('statusPanel');

const defaultBtnIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><polyline points="9 7 12 5 15 7"/><circle cx="12" cy="15" r="2"/></svg>`;

// ── Input validation ────────────────────────────────────────
function setField(row, okEl, badEl, errEl, state, msg) {
  row.classList.remove('valid','error');
  okEl.classList.add('hidden'); badEl.classList.add('hidden');
  errEl.classList.add('hidden'); errEl.textContent = '';
  if (state === true)  { row.classList.add('valid'); okEl.classList.remove('hidden'); }
  if (state === false) { row.classList.add('error'); badEl.classList.remove('hidden'); errEl.textContent = msg; errEl.classList.remove('hidden'); }
}

amountInput.addEventListener('input', () => {
  const v = amountInput.value;
  if (!v) return setField(amountRow, amountOk, amountBad, amountErr, null);
  setField(amountRow, amountOk, amountBad, amountErr, isValidAmount(v), 'Enter at least KES 1');
});
phoneInput.addEventListener('input', () => {
  const v = phoneInput.value;
  if (!v) return setField(phoneRow, phoneOk, phoneBad, phoneErr, null);
  setField(phoneRow, phoneOk, phoneBad, phoneErr, isValidPhone(v), 'Valid: 07XXXXXXXX or 01XXXXXXXX');
});
phoneInput.addEventListener('blur', () => {
  const v = phoneInput.value.trim();
  if (v && isValidPhone(v)) phoneInput.value = normalizePhone(v);
});

// ── Button states ───────────────────────────────────────────
function setBtnState(state) {
  payBtn.classList.remove('loading','sent','failed');
  payBtn.disabled = false;
  btnSpinner.classList.add('hidden');
  btnIcon.classList.remove('hidden');
  if (state === 'loading') {
    payBtn.classList.add('loading'); payBtn.disabled = true;
    btnSpinner.classList.remove('hidden'); btnIcon.classList.add('hidden');
    btnText.textContent = 'Sending STK Push…';
  } else if (state === 'sent') {
    payBtn.classList.add('sent'); payBtn.disabled = true;
    btnIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    btnText.textContent = 'Sent — Enter PIN on your phone';
  } else if (state === 'failed') {
    payBtn.classList.add('failed');
    btnIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    btnText.textContent = 'Try Again';
  } else {
    btnIcon.innerHTML = defaultBtnIcon;
    btnText.textContent = 'Pay with M-Pesa';
  }
}

// ── Confetti ────────────────────────────────────────────────
function spawnConfetti(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const colors = ['#F59E0B','#FCD34D','#3B82F6','#EF4444','#22C55E','#A78BFA'];
  for (let i = 0; i < 24; i++) {
    const d = document.createElement('div');
    d.className = 'confetti-dot';
    const size = 5 + Math.random() * 7;
    d.style.cssText = `left:${10+Math.random()*80}%;bottom:0;width:${size}px;height:${size}px;background:${colors[i%colors.length]};animation-delay:${Math.random()*0.5}s;animation-duration:${0.7+Math.random()*0.6}s;border-radius:${Math.random()>.5?'50%':'2px'};`;
    wrap.appendChild(d);
  }
}

// ── Status panel ────────────────────────────────────────────
function showPanel(html_content) {
  formBody.classList.add('hidden');
  statusPanel.innerHTML = html_content;
  statusPanel.classList.remove('hidden');
  statusPanel.scrollIntoView({ behavior:'smooth', block:'nearest' });
}
function hidePanel() {
  statusPanel.classList.add('hidden');
  statusPanel.innerHTML = '';
  formBody.classList.remove('hidden');
}

function renderWaiting(phone) {
  showPanel(`
    <div class="sp-icon gold">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <polyline points="9 7 12 5 15 7"/>
        <circle cx="12" cy="15" r="2"/>
      </svg>
    </div>
    <div class="sp-title" style="color:var(--gold)">Check Your Phone</div>
    <div class="sp-sub">M-Pesa prompt sent to <strong>${phone}</strong>.<br>Enter your PIN to complete payment.</div>
    <div class="sp-progress"><div class="sp-progress-bar" id="spBar"></div></div>
    <div class="sp-timer" id="spTimer">Waiting for confirmation…</div>
  `);
}

function renderConfirmed(data) {
  const rows = [
    data.mpesaReceipt ? `<div class="sp-receipt-row"><span class="sp-receipt-label">Receipt</span><span class="sp-receipt-value">${data.mpesaReceipt}</span></div>` : '',
    data.amount       ? `<div class="sp-receipt-row"><span class="sp-receipt-label">Amount</span><span class="sp-receipt-value">KES ${data.amount}</span></div>` : '',
    data.phone        ? `<div class="sp-receipt-row"><span class="sp-receipt-label">Phone</span><span class="sp-receipt-value">${data.phone}</span></div>` : '',
  ].filter(Boolean).join('');
  showPanel(`
    <div class="confetti-wrap" id="confettiWrap" aria-hidden="true"></div>
    <div class="sp-icon green">
      <svg width="30" height="30" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" class="check-circle"/>
        <path d="M8 12l3 3 5-5" class="check-path"/>
      </svg>
    </div>
    <div class="sp-title" style="color:var(--green)">Payment Confirmed!</div>
    <div class="sp-sub">Transaction successful. Thank you for using GingerPay!</div>
    ${rows ? `<div class="sp-receipt" style="margin-top:14px">${rows}</div>` : ''}
    <div class="sp-btn-row">
      <button class="sp-btn primary" id="spAgain">Make Another Payment</button>
    </div>
  `);
  spawnConfetti('confettiWrap');
  setBtnState('reset');
  document.getElementById('spAgain').addEventListener('click', resetForm);
}

function renderFailed(data) {
  showPanel(`
    <div class="sp-icon red">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <div class="sp-title" style="color:var(--red)">Payment Not Completed</div>
    <div class="sp-sub">${data.resultDesc || 'The payment was cancelled or failed.'}</div>
    <div class="sp-btn-row"><button class="sp-btn" id="spRetry">Try Again</button></div>
  `);
  setBtnState('failed');
  document.getElementById('spRetry').addEventListener('click', resetForm);
}

function renderTimeout() {
  showPanel(`
    <div class="sp-icon muted">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    </div>
    <div class="sp-title" style="color:var(--text-muted)">Prompt Expired</div>
    <div class="sp-sub">The STK push timed out. Check your M-Pesa messages to confirm if payment went through.</div>
    <div class="sp-btn-row"><button class="sp-btn" id="spRetry">Try Again</button></div>
  `);
  setBtnState('reset');
  document.getElementById('spRetry').addEventListener('click', resetForm);
}

// ── Progress bar ────────────────────────────────────────────
let progressInterval = null;
function startProgress(durationMs) {
  let elapsed = 0;
  progressInterval = setInterval(() => {
    elapsed += 250;
    const bar   = document.getElementById('spBar');
    const timer = document.getElementById('spTimer');
    const rem   = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
    if (bar)   bar.style.width = Math.min((elapsed / durationMs) * 100, 100) + '%';
    if (timer && rem > 0) timer.textContent = rem > 55 ? `Waiting for PIN… (${rem}s)` : `Checking… (${rem}s)`;
    if (elapsed >= durationMs) { clearInterval(progressInterval); progressInterval = null; }
  }, 250);
}
function stopProgress() {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  const bar = document.getElementById('spBar');
  if (bar) bar.style.width = '100%';
}

// ── Polling ─────────────────────────────────────────────────
let pollInterval  = null;
let pollCount     = 0;
const MAX_POLLS   = 20; // 20 × 3s = 60s

function cleanup() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  stopProgress();
  pollCount = 0;
}

async function pollResult(phone) {
  if (pollCount >= MAX_POLLS) {
    cleanup(); renderTimeout(); return;
  }
  pollCount++;
  try {
    const r = await fetch(`/api/result?phone=${encodeURIComponent(phone)}`);
    const d = await r.json();
    if (d.status === 'SUCCESS') { cleanup(); renderConfirmed(d); }
    else if (d.status === 'FAILED') { cleanup(); renderFailed(d); }
    // PENDING → keep polling
  } catch { /* network hiccup — keep polling */ }
}

function startPolling(phone, localPhone) {
  renderWaiting(localPhone);
  startProgress(62_000);
  // Start polling after 5s (give user time to enter PIN), then every 3s
  setTimeout(() => {
    pollInterval = setInterval(() => pollResult(phone), 3000);
  }, 5000);
}

// ── Reset ───────────────────────────────────────────────────
function resetForm() {
  cleanup();
  hidePanel();
  amountInput.value = '';
  phoneInput.value  = '';
  setField(amountRow, amountOk, amountBad, amountErr, null);
  setField(phoneRow,  phoneOk,  phoneBad,  phoneErr,  null);
  setBtnState('reset');
  amountInput.focus();
}

// ── Pay handler ─────────────────────────────────────────────
payBtn.addEventListener('click', async () => {
  if (payBtn.classList.contains('failed')) { resetForm(); return; }

  const rawAmount = amountInput.value.trim();
  const rawPhone  = phoneInput.value.trim();

  let hasError = false;
  if (!isValidAmount(rawAmount)) { setField(amountRow, amountOk, amountBad, amountErr, false, 'Enter at least KES 1'); hasError = true; }
  if (!isValidPhone(rawPhone))   { setField(phoneRow, phoneOk, phoneBad, phoneErr, false, 'Valid: 07XXXXXXXX or 01XXXXXXXX'); hasError = true; }
  if (hasError) return;

  cleanup(); hidePanel(); setBtnState('loading');

  try {
    const resp = await fetch('/api/pay', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: rawPhone, amount: rawAmount }),
    });
    const data = await resp.json();

    if (data.success) {
      setBtnState('sent');
      const localPhone = data.phone || normalizePhone(rawPhone);
      startPolling(localPhone, localPhone);
    } else {
      setBtnState('failed');
      showPanel(`
        <div class="sp-icon red">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="sp-title" style="color:var(--red)">Payment Failed</div>
        <div class="sp-sub">${data.message || 'Something went wrong. Please try again.'}</div>
        <div class="sp-btn-row"><button class="sp-btn" id="spRetry">Try Again</button></div>
      `);
      document.getElementById('spRetry').addEventListener('click', resetForm);
    }
  } catch (err) {
    setBtnState('failed');
    showPanel(`
      <div class="sp-icon red">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <div class="sp-title" style="color:var(--red)">Connection Error</div>
      <div class="sp-sub">${err.message || 'Check your connection and try again.'}</div>
      <div class="sp-btn-row"><button class="sp-btn" id="spRetry">Try Again</button></div>
    `);
    document.getElementById('spRetry').addEventListener('click', resetForm);
  }
});

[amountInput, phoneInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') payBtn.click(); });
});
