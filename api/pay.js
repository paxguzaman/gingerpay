// api/pay.js — Initiate STK Push
const fetch = require('node-fetch');

function toLocal(input) {
  let p = String(input).replace(/[\s\-\+\(\)]/g, '');
  if (p.startsWith('254')) p = '0' + p.slice(3);
  return p;
}
function isValidPhone(p)  { return /^(07|01)\d{8}$/.test(toLocal(p)); }
function isValidAmount(a) { const n = parseFloat(a); return !isNaN(n) && n >= 1; }

module.exports = async function handler(req, res) {
  // CORS
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

  // Callback URL — hardcoded to production domain for reliability
  const host        = process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers['x-forwarded-host'] || req.headers.host;
  const proto       = 'https';
  const callbackUrl = `${proto}://${host}/api/callback`;

  const stkBody = {
    phone:              localPhone,
    amount:             String(numericAmount),
    callback_url:       callbackUrl,
    external_reference: `GP-${localPhone}-${Date.now()}`,
  };

  console.log('[Pay] STK body:', JSON.stringify(stkBody));
  console.log('[Pay] Callback URL:', callbackUrl);

  try {
    const lipiaRes = await fetch('https://lipia-api.kreativelabske.com/api/request/stk', {
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

    const rawLower  = raw.trim().toLowerCase().replace(/^"|"$/g, '');
    const bodyIsOk  = ['authorized', 'ok', 'success'].includes(rawLower);
    const checkoutRequestId =
      data.checkoutRequestId || data.CheckoutRequestID ||
      data.checkout_request_id || data.reference || null;
    const isSuccess = lipiaRes.ok || data.success === true || !!checkoutRequestId || bodyIsOk;

    if (isSuccess) {
      console.log(`[Pay] ✅ STK sent for ${localPhone}`);
      return res.json({ success: true, message: 'STK Push sent — check your phone', phone: localPhone });
    }

    return res.status(400).json({ success: false, message: data.message || raw || `HTTP ${lipiaRes.status}` });

  } catch (err) {
    console.error('[Pay] Error:', err.message);
    return res.status(502).json({ success: false, message: 'Could not reach payment provider.' });
  }
};
