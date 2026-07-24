// POST /api/qualify  { system, message }  ->  passes through Anthropic's response
// Keeps your Anthropic API key server-side. Needed for the free-text "Describe it" mode in production.
// Env var: ANTHROPIC_API_KEY

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { system, message } = body || {};
    if (!system || !message) { res.status(400).json({ error: 'system and message required' }); return; }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages: [{ role: 'user', content: message }],
      }),
    });
    const data = await r.json();
    res.status(200).json(data); // front-end reads data.content[].text
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
