const https = require('https');

function get(url, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    
    req.on('error', reject);
  });
}

const DEFAULT_APIS = [
  'https://api.piped.private.coffee',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.colt.rest',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.us.to',
  'https://pipedapi.ox.ci',
  'https://pipedapi.syntopia.uno'
];

let cachedApis = [];
let lastFetch = 0;
const CACHE_TTL = 3600000; // 1 hour

async function getActivePipedApis() {
  const now = Date.now();
  if (cachedApis.length > 0 && (now - lastFetch < CACHE_TTL)) {
    return cachedApis;
  }
  
  try {
    const res = await get('https://raw.githubusercontent.com/TeamPiped/documentation/main/content/docs/public-instances/index.md', 1500);
    if (res.statusCode === 200) {
      const lines = res.body.split('\n');
      const apiUrls = [];
      for (const line of lines) {
        const matches = line.match(/https?:\/\/[^\s)|]+/g);
        if (matches) {
          for (const u of matches) {
            if (u.includes('api') && !apiUrls.includes(u) && !u.includes('badge')) {
              apiUrls.push(u);
            }
          }
        }
      }
      if (apiUrls.length > 0) {
        cachedApis = Array.from(new Set([...DEFAULT_APIS, ...apiUrls]));
        lastFetch = now;
        return cachedApis;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch Piped wiki, using default fallback list:", err.message);
  }
  
  return DEFAULT_APIS;
}

async function fetchFromInstance(apiUrl, videoId) {
  const res = await get(`${apiUrl}/streams/${videoId}`, 1500);
  if (res.statusCode === 200) {
    const data = JSON.parse(res.body);
    const videoStreams = data.videoStreams || [];
    if (videoStreams.length > 0) {
      const mp4Stream = videoStreams.find(s => s.mimeType && s.mimeType.includes('video/mp4') && s.videoOnly === false) || videoStreams[0];
      if (mp4Stream && mp4Stream.url) {
        return mp4Stream.url;
      }
    }
  }
  throw new Error(`Failed on ${apiUrl}`);
}

async function getTrailerUrl(videoId) {
  const apis = await getActivePipedApis();
  
  // Race the top 8 APIs in parallel
  const targets = apis.slice(0, 8);
  
  try {
    const fastestUrl = await Promise.any(targets.map(apiUrl => fetchFromInstance(apiUrl, videoId)));
    return fastestUrl;
  } catch (err) {
    throw new Error("Could not extract stream URL from any Piped instances in parallel");
  }
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'YouTube ID is required' });
  }

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
