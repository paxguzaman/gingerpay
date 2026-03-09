// api/result.js — Frontend polls this every 3s after STK push
// GET /api/result?phone=07XXXXXXXXX
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { phone } = req.query;
  if (!phone) return res.status(400).json({ success: false, message: 'phone required' });

  try {
    const raw = await kv.get(`gp:result:${phone}`);
    if (!raw) {
      // Not arrived yet
      return res.json({ success: true, status: 'PENDING' });
    }

    const result = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Delete after reading so it can't be re-used
    await kv.del(`gp:result:${phone}`);

    return res.json({ success: true, ...result });

  } catch (err) {
    console.error('[Result] KV error:', err.message);
    // If KV fails, return PENDING so frontend keeps trying
    return res.json({ success: true, status: 'PENDING' });
  }
};
