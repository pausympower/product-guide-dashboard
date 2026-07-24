// GET /api/catalog  ->  JSON array of catalogue rows (same shape the front-end expects)
// Reads the PRIVATE Google Sheet via a service account. Sheet stays private; key stays server-side.
// Env vars (Vercel > Project > Settings > Environment Variables):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL   the service account's email
//   GOOGLE_PRIVATE_KEY             its private key (paste with real newlines, or \n-escaped)
//   SHEET_ID                       1R2K1IzKiQFDJchs0hG-XA2N-zXKUHfeAZX7yFpvCWAM
//   SHEET_TAB                      PRODUCT CATALOG (2026)
// One-time: share the sheet with GOOGLE_SERVICE_ACCOUNT_EMAIL as Viewer.
// Dependency: npm i google-auth-library

const { GoogleAuth } = require('google-auth-library');

const COLS = ['tier','pid','geo','assetType','asset','size','control','programs','trading',
  'dataFlows','market','toCapacity','infraRisk','tradeRisk','effort','perMW','strategic',
  'goLive','risks','confidence','notes'];

module.exports = async (req, res) => {
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;
    const range = encodeURIComponent(`${process.env.SHEET_TAB}!A2:U40`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/${range}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    const rows = (data.values || [])
      .map(row => {
        const o = {};
        COLS.forEach((k, i) => { o[k] = (row[i] || '').toString().trim(); });
        return o;
      })
      .filter(o => o.pid || o.tier || o.geo);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // 5-min edge cache
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
