const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { phone } = req.query;
  if (!phone) return res.status(400).json({ success: false, message: 'phone required' });

  try {
    const raw = await redis.get(`gp:result:${phone}`);
    if (!raw) return res.json({ success: true, status: 'PENDING' });

    const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
    await redis.del(`gp:result:${phone}`);
    return res.json({ success: true, ...result });

  } catch (err) {
    console.error('[Result] Redis error:', err.message);
    return res.json({ success: true, status: 'PENDING' });
  }
};
