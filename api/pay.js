// api/pay.js — Initiate STK Push via Lipia v2 API
const fetch = require('node-fetch');

function toLocal(input) {
  let p = String(input).replace(/[\s\-\+\(\)]/g, '');
  if (p.startsWith('254')) p = '0' + p.slice(3);
  return p;
}
function isValidPhone(p)  { return /^(07|01)\d{8}$/.test(toLocal(p)); }
function isValidAmount(a) { const n = parseFloat(a); return !isNaN(n) && n >= 1; }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { phone, amount } = req.body || {};

  if (!phone || !isValidPhone(phone))
    return res.status(400).json({ success: false, message: 'Invalid phone number.' });
  if (!amount || !isValidAmount(amount))
    return res.status(400).json({ success: false, message: 'Invalid amount. Minimum KES 1.' });

  const localPhone    = toLocal(phone);
  const numericAmount = Math.floor(parseFloat(amount));

  const host        = process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers['x-forwarded-host'] || req.headers.host;
  const callbackUrl = `https://${host}/api/callback`;

  const stkBody = {
    phone_number:       localPhone,
    amount:             numericAmount,
    external_reference: `GP-${localPhone}-${Date.now()}`,
    callback_url:       callbackUrl,
  };

  console.log('[Pay] STK body:', JSON.stringify(stkBody));
  console.log('[Pay] Callback URL:', callbackUrl);

  try {
    const lipiaRes = await fetch('https://lipia-api.kreativelabske.com/api/v2/payments/stk-push', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.LIPIA_API_KEY}`,
      },
      body: JSON.stringify(stkBody),
    });

    const raw = await lipiaRes.text();
    console.log(`[Pay] Lipia HTTP ${lipiaRes.status}:`, raw);

    let data = {};
    try { data = JSON.parse(raw); } catch {}

    if (data.success && data.data && data.data.TransactionReference) {
      const ref = data.data.TransactionReference;
      console.log(`[Pay] ✅ STK sent. Reference: ${ref}`);
      return res.json({ success: true, message: 'STK Push sent — check your phone', phone: localPhone, reference: ref });
    }

    const errMsg = data.customerMessage || data.message || `HTTP ${lipiaRes.status}`;
    return res.status(400).json({ success: false, message: errMsg });

  } catch (err) {
    console.error('[Pay] Error:', err.message);
    return res.status(502).json({ success: false, message: 'Could not reach payment provider.' });
  }
};
