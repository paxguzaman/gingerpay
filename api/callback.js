// api/callback.js — Acknowledge Lipia callbacks (status is polled directly)
module.exports = async function handler(req, res) {
  console.log('[Callback] Received:', JSON.stringify(req.body));
  return res.status(200).type('text/plain').send('ok');
};
