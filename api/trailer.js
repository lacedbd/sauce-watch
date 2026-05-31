const ytdl = require('@distube/ytdl-core');

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
    const url = `https://www.youtube.com/watch?v=${id}`;
    
    // Get video info
    const info = await ytdl.getInfo(url);
    
    // Choose format: prefer 720p with audio (itag 22), fallback to any with audio/video
    let format = ytdl.chooseFormat(info.formats, { quality: '22', filter: 'audioandvideo' });
    
    if (!format) {
      // Fallback
      format = ytdl.chooseFormat(info.formats, { filter: 'audioandvideo' });
    }

    if (!format || !format.url) {
      return res.status(404).json({ error: 'No suitable mp4 format found' });
    }

    // Cache the response at the edge for 1 hour to prevent IP bans from YouTube
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    
    return res.status(200).json({ url: format.url });
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return res.status(500).json({ error: 'Failed to extract trailer' });
  }
}
