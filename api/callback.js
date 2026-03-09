const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function toLocal(input) {
  let p = String(input).replace(/[\s\-\+\(\)]/g, '');
  if (p.startsWith('254')) p = '0' + p.slice(3);
  return p;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok');

  console.log('[Callback] Received:', JSON.stringify(req.body));

  const body    = req.body || {};
  const payment = body.response || body;
  const statusRaw = (payment.Status || '').toLowerCase();
  const isSuccess = body.status === true || statusRaw === 'success';
  const phone     = payment.Phone ? toLocal(String(payment.Phone)) : null;

  const result = {
    status:       isSuccess ? 'SUCCESS' : 'FAILED',
    mpesaReceipt: payment.MpesaReceiptNumber || '',
    amount:       payment.Amount || null,
    phone:        phone || '',
    resultDesc:   payment.ResultDesc || (isSuccess ? 'Payment completed' : 'Payment failed'),
    ts:           Date.now(),
  };

  console.log(`[Callback] ${result.status} — phone: ${phone}`);

  if (phone) {
    await redis.set(`gp:result:${phone}`, JSON.stringify(result), { ex: 600 });
    console.log(`[Callback] ✅ Stored result for ${phone}`);
  }

  return res.status(200).type('text/plain').send('ok');
};
