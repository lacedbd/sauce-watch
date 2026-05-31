export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path, ...params } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const TMDB_API_KEY = process.env.TMDB_API_KEY || '607bf14c16a8ab16f9ed61e6ba5920a7';
  const searchParams = new URLSearchParams();
  
  // Forward all query parameters except 'path'
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }
  searchParams.set('api_key', TMDB_API_KEY);

  const tmdbUrl = `https://api.themoviedb.org/3/${path}?${searchParams.toString()}`;

  try {
    const apiRes = await fetch(tmdbUrl);
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `TMDB responded with status ${apiRes.status}` });
    }
    const data = await apiRes.json();

    // Cache the response at the edge for 1 hour, stale-while-revalidate for 10 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
