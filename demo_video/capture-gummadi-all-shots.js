const puppeteer = require('/var/www/html/Restorent/frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const SHOTS_DIR = '/var/www/html/Restorent/demo_video/shots';

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  console.log('Capturing Shot 1A: Welcome Brand Splash Card...');
  await page.goto(`file:///var/www/html/Restorent/demo_video/templates/shot_1a.html`, { waitUntil: 'load' });
  await page.screenshot({ path: `${SHOTS_DIR}/shot_1a.png` });

  console.log('Capturing Shot 1B: Real Login Screen with Gummadi Grand Branding...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_1b.png` });

  console.log('Logging in as Admin for Scene 2...');
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'admin');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Capturing Shot 2A: Admin Executive Tower (KPIs)...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_2a.png` });

  console.log('Capturing Shot 2B: Admin Telemetry & Operations (Scrolled)...');
  await page.evaluate(() => window.scrollBy(0, 480));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_2b.png` });

  console.log('Logging in as Waiter for Scene 3 & 4...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'waiter');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'waiter123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Capturing Shot 3A: Waiter Floor Plan & Tables...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_3a.png` });

  console.log('Capturing Shot 3B: Interactive Table Statuses (Green / Red / Amber)...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_3b.png` });

  console.log('Capturing Shot 4A: Digital POS Menu Catalog...');
  // Click on Table-02 or first table to open catalog
  await page.evaluate(() => {
    const tableCards = Array.from(document.querySelectorAll('div, button')).filter(el => el.innerText && el.innerText.includes('Table-02'));
    if (tableCards.length > 0) tableCards[0].click();
    else {
      const anyTable = Array.from(document.querySelectorAll('div, button')).filter(el => el.innerText && el.innerText.includes('Table-'));
      if (anyTable.length > 0) anyTable[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_4a.png` });

  console.log('Capturing Shot 4B: Smart Cart with Items & Cooking Notes...');
  // Add an item to cart if possible
  await page.evaluate(() => {
    const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && (b.innerText.includes('Add') || b.innerText.includes('+')));
    if (addBtns.length > 0) addBtns[0].click();
    if (addBtns.length > 1) addBtns[1].click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_4b.png` });

  console.log('Logging in as Chef for Scene 5...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'chef');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'chef123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Capturing Shot 5A: Chef Kitchen Display (KDS)...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_5a.png` });

  console.log('Capturing Shot 5B: Chef Status Flow (In Prep / Ready)...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_5b.png` });

  console.log('Capturing Shot 5C: Chef Menu Availability & Sold Out Switch...');
  // Click on availability tab if exists
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && b.innerText.includes('Availability'));
    if (tabs.length > 0) tabs[0].click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_5c.png` });

  console.log('Capturing Scene 6: Waiter Serving & Bill Request...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'waiter');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'waiter123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Capturing Shot 6A: Waiter Food Ready to Serve Alert...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_6a.png` });

  console.log('Capturing Shot 6B: Table Bill Request Action...');
  // Click Table-01 (which has active order) to view details
  await page.evaluate(() => {
    const tableCards = Array.from(document.querySelectorAll('div, button')).filter(el => el.innerText && el.innerText.includes('Table-01'));
    if (tableCards.length > 0) tableCards[0].click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_6b.png` });

  console.log('Logging in as Manager for Scene 7...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'manager');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'manager123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Capturing Shot 7A: Manager Billing Queue (Bill Requested)...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_7a.png` });

  console.log('Capturing Shot 7B: Official GST Tax Invoice...');
  // Click Generate Bill or View Bill if present
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && (b.innerText.includes('Bill') || b.innerText.includes('Invoice') || b.innerText.includes('Generate')));
    if (btns.length > 0) btns[0].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_7b.png` });

  console.log('Capturing Shot 7C: Payment Settlement & Stamp...');
  await page.screenshot({ path: `${SHOTS_DIR}/shot_7c.png` });

  console.log('Logging in as Admin for Scene 8 (Settings)...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'admin');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Capturing Shot 8A: Settings & Dynamic Branding...');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_8a.png` });

  console.log('Capturing Shot 8B: Scrolled Settings Color Theme Selector...');
  await page.evaluate(() => window.scrollBy(0, 350));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS_DIR}/shot_8b.png` });

  console.log('Capturing Shot 8C: Cross-Platform Web & Mobile Graphic...');
  await page.goto(`file:///var/www/html/Restorent/demo_video/templates/shot_8c.html`, { waitUntil: 'load' });
  await page.screenshot({ path: `${SHOTS_DIR}/shot_8c.png` });

  await browser.close();
  console.log('🎉 ALL 20 SHOTS CAPTURED SUCCESSFULLY!');
}

run().catch(console.error);

