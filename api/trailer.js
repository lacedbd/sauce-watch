const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

const FALLBACK_DOMAINS = [
  'inv.thepixora.com',
  'invidious.io.lol',
  'invidious.projectsegfau.lt',
  'yewtu.be'
];

async function getTrailerUrl(videoId) {
  let domains = [];
  try {
    const res = await get('https://api.invidious.io/instances.json');
    const instances = JSON.parse(res.body);
    domains = instances
      .filter(inst => inst[1] && inst[1].type === 'https' && inst[1].monitor && inst[1].monitor.last_status === 200 && !inst[1].monitor.down)
      .map(inst => inst[0]);
  } catch (err) {
    console.warn("Failed to fetch dynamic Invidious instances:", err.message);
  }

  // Combine with fallback domains and deduplicate
  const allDomains = Array.from(new Set([...domains, ...FALLBACK_DOMAINS]));

  for (const domain of allDomains) {
    try {
      const res = await get(`https://${domain}/api/v1/videos/${videoId}?local=true`);
      if (res.statusCode === 200) {
        const json = JSON.parse(res.body);
        const streams = json.formatStreams || [];
        if (streams.length > 0) {
          let streamUrl = streams[0].url;
          if (streamUrl.startsWith('/')) {
            streamUrl = `https://${domain}${streamUrl}`;
          } else if (streamUrl.startsWith('http://')) {
            streamUrl = streamUrl.replace('http://', 'https://');
          }
          return streamUrl;
        }
      }
    } catch (err) {
      console.warn(`Error on domain ${domain}:`, err.message);
    }
  }
  throw new Error("Could not extract stream URL from any Invidious instances");
}

export default async function handler(req, res) {
  // Extract YouTube ID from query
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'YouTube ID is required' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const streamUrl = await getTrailerUrl(id);
    
    // Cache the response at the edge for 1 hour
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    
    return res.status(200).json({ url: streamUrl });
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return res.status(500).json({ error: 'Failed to extract trailer: ' + error.message });
  }
}
