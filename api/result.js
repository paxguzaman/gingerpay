// api/result.js — Poll Lipia directly for transaction status
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { reference } = req.query;
  if (!reference) return res.status(400).json({ success: false, message: 'reference required' });

  try {
    const lipiaRes = await fetch(
      `https://lipia-api.kreativelabske.com/api/v2/payments/status?reference=${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.LIPIA_API_KEY}` },
      }
    );

    const raw = await lipiaRes.text();
    console.log(`[Result] Lipia HTTP ${lipiaRes.status}:`, raw);

    let data = {};
    try { data = JSON.parse(raw); } catch {}

    if (!data.success) {
      // Transaction not found yet — still pending
      return res.json({ success: true, status: 'PENDING' });
    }

    const payment = data.data && data.data.response ? data.data.response : {};
    const statusRaw = (payment.Status || '').toLowerCase();

    if (statusRaw === 'success') {
      return res.json({
        success: true,
        status: 'SUCCESS',
        mpesaReceipt: payment.MpesaReceiptNumber || '',
        amount:       payment.Amount || '',
        phone:        payment.Phone  || '',
        resultDesc:   payment.ResultDesc || 'Payment completed successfully',
      });
    } else if (statusRaw === 'failed') {
      return res.json({
        success: true,
        status: 'FAILED',
        resultDesc: payment.ResultDesc || 'Payment failed',
      });
    } else {
      return res.json({ success: true, status: 'PENDING' });
    }

  } catch (err) {
    console.error('[Result] Error:', err.message);
    return res.json({ success: true, status: 'PENDING' });
  }
};
