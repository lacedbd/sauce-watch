export const config = {
  // Using Edge runtime for faster boot isn't usually compatible with puppeteer due to Node.js bindings
  // Vercel serverless function (Node.js runtime) is required.
  maxDuration: 15, // Max duration for hobby tier, to give it some buffer
};

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let browser;
  try {
    // Optional: configuring chromium for Vercel
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      defaultViewport: chromium.defaultViewport,
    });
    
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    
    // Wrap the network listener in a Promise so we can return early
    const streamUrl = await new Promise(async (resolve) => {
      // 10 second timeout fallback (since Vercel Hobby limits execution)
      const timeout = setTimeout(() => {
        resolve(null); 
      }, 9500);

      page.on('request', request => {
        const reqUrl = request.url();
        const resourceType = request.resourceType();

        // Check if the request is for a raw video stream
        if (reqUrl.includes('.m3u8') || reqUrl.includes('.mp4')) {
          clearTimeout(timeout);
          resolve(reqUrl);
          request.abort(); // Stop the request from actually downloading
        } 
        // Block heavy static assets to speed up page load and save memory
        else if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } 
        else {
          request.continue();
        }
      });

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
      } catch (err) {
        // Ignore navigation errors (page might close before fully loading)
      }
    });

    if (streamUrl) {
      res.status(200).json({ stream_url: streamUrl });
    } else {
      res.status(404).json({ error: 'Stream URL not found within timeout limit.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
