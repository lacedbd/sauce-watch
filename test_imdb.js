const https = require('https');

https.get('https://www.imdb.com/title/tt0816692/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/playbackURLs":\[(.*?)]/);
    if (match) {
      console.log('Found playback URLs!');
      console.log(match[0].substring(0, 500));
    } else {
      console.log('No playback URLs found.');
      // Maybe check for data-video id?
      const videoIdMatch = data.match(/vi\d+/g);
      if (videoIdMatch) {
         console.log('Found video IDs:', [...new Set(videoIdMatch)]);
      }
    }
  });
}).on('error', err => console.log(err));
