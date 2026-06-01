export const config = {
  maxDuration: 15, // Max duration for hobby tier
};

import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Initialize puppeteer-extra with the stealth plugin
const puppeteer = addExtra(puppeteerCore);
puppeteer.use(StealthPlugin());

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
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  let browser;
  try {
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process'],
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      defaultViewport: chromium.defaultViewport,
    });
    
    // Instantly close any new tabs (pop-up ads)
    browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
            const newPage = await target.page();
            if (newPage) {
                // If it's a completely new tab/window (not the main one), close it
                if (newPage !== page) {
                    await newPage.close();
                }
            }
        }
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    
    // Wrap the network listener in a Promise so we can return early
    const streamUrl = await new Promise(async (resolve) => {
      // 12 second timeout fallback (since Vercel Hobby limits execution to 15s)
      const timeout = setTimeout(() => {
        resolve(null); 
      }, 12000);

      page.on('request', request => {
        const reqUrl = request.url();
        const resourceType = request.resourceType();

        // Catch raw video streams
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
        
        // Wait a tiny bit for the invisible ad div to mount
        await new Promise(r => setTimeout(r, 1000));
        
        // Find the center of the viewport
        const viewport = page.viewport();
        const x = viewport.width / 2;
        const y = viewport.height / 2;

        // Click #1: This hits the invisible ad layer. 
        // The ad tries to open a new tab, but our 'targetcreated' listener instantly kills it.
        await page.mouse.click(x, y);
        
        // Wait for the ad layer to register the click and delete itself from the DOM
        await new Promise(r => setTimeout(r, 500));
        
        // Click #2: This hits the actual play button beneath the now-deleted ad layer,
        // forcing the video to load, which triggers the .m3u8 network request.
        await page.mouse.click(x, y);

      } catch (err) {
        // Ignore navigation errors
      }
    });

    if (streamUrl) {
      res.status(200).json({ success: true, stream_url: streamUrl });
    } else {
      res.status(404).json({ success: false, error: 'Stream URL not found within timeout limit.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
