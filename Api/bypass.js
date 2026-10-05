export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }

  try {
    const url = (req.body && req.body.url || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ success: false, error: 'Link không hợp lệ' });
      return;
    }
    const result = await tryBypassServices(url);
    if (result) {
      res.status(200).json({ success: true, result: result });
    } else {
      res.status(200).json({ success: false, error: 'Không bypass được link này. Thử lại sau.' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function tryBypassServices(url) {
  const services = [
    'https://bypass.city/bypass?url=' + encodeURIComponent(url),
    'https://bypass.vip/api/v1/bypass?url=' + encodeURIComponent(url),
    'https://link1s.com/api/bypass?url=' + encodeURIComponent(url),
  ];
  for (const svc of services) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);
      const res = await fetch(svc, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/json,*/*'
        }
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();
      const extracted = extractUrl(text);
      if (extracted) return extracted;
    } catch (e) { continue; }
  }
  return null;
}

function extractUrl(text) {
  let m = text.match(/"result"\s*:\s*"([^"]+)"/);
  if (m && m[1] && m[1] !== 'null') return m[1];
  m = text.match(/"url"\s*:\s*"([^"]+)"/);
  if (m && m[1] && m[1] !== 'null') return m[1];
  m = text.match(/"destination"\s*:\s*"([^"]+)"/);
  if (m && m[1] && m[1] !== 'null') return m[1];
  m = text.match(/href="(https?:\/\/[^"]+)"/);
  if (m && m[1] && !m[1].includes('bypass') && !m[1].includes('link4m')) return m[1];
  const all = text.match(/https?:\/\/[^\s"'<>]+/g);
  if (all) {
    for (const u of all) {
      if (u.includes('bypass') || u.includes('link4m') || u.includes('bypass.city') || u.includes('bypass.vip') || u.includes('link1s')) continue;
      if (u.includes('.css') || u.includes('.js') || u.includes('.png') || u.includes('.jpg') || u.includes('.svg')) continue;
      if (u.length > 15) return u;
    }
  }
  return null;
}
