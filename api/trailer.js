const https = require('https');

function get(url, timeoutMs = 2500) {
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

const FALLBACK_DOMAINS = [
  'https://api.piped.private.coffee',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.kavin.rocks'
];

async function getTrailerUrl(videoId) {
  let apiUrls = [];
  try {
    const res = await get('https://raw.githubusercontent.com/TeamPiped/documentation/main/content/docs/public-instances/index.md', 3000);
    if (res.statusCode === 200) {
      const lines = res.body.split('\n');
      for (const line of lines) {
        const matches = line.match(/https?:\/\/[^\s)|]+/g);
        if (matches) {
          for (const u of matches) {
            // Pick only API links and filter out badge links
            if (u.includes('api') && !apiUrls.includes(u) && !u.includes('badge')) {
              apiUrls.push(u);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch Piped markdown instances:", err.message);
  }

  // Deduplicate and combine with hardcoded high-probability working domains at the front
  const allApis = Array.from(new Set([...FALLBACK_DOMAINS, ...apiUrls]));

  for (const apiUrl of allApis) {
    try {
      // Use a shorter 2-second timeout per check to fail fast and avoid lambda timeout
      const res = await get(`${apiUrl}/streams/${videoId}`, 2000);
      if (res.statusCode === 200) {
        const data = JSON.parse(res.body);
        const videoStreams = data.videoStreams || [];
        if (videoStreams.length > 0) {
          // Find stream that has audio+video and is mp4, fallback to first stream
          const mp4Stream = videoStreams.find(s => s.mimeType && s.mimeType.includes('video/mp4') && s.videoOnly === false) || videoStreams[0];
          if (mp4Stream && mp4Stream.url) {
            return mp4Stream.url;
          }
        }
      }
    } catch (err) {
      console.warn(`Failed on Piped instance ${apiUrl}:`, err.message);
    }
  }
  throw new Error("Could not extract stream URL from any Piped instances");
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
