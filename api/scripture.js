module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.status(400).json({ error: 'missing-query' });
    return;
  }

  const upstream = `https://bible.fhl.net/json/qsb.php?qstr=${encodeURIComponent(q)}&version=unv&gb=0`;

  try {
    const response = await fetch(upstream, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 1on1bible/1.0)',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'upstream-failed' });
      return;
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'proxy-failed' });
  }
};
