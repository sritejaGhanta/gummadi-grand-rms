const puppeteer = require('/var/www/html/Restorent/frontend/node_modules/puppeteer-core');

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = '/var/www/html/Restorent/demo_video/slides';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  console.log('Capturing Slide 1: Login Screen...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: `${OUTPUT_DIR}/slide1_login.png` });

  console.log('Capturing Slide 2: Admin Executive Tower...');
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'admin');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUTPUT_DIR}/slide2_admin_dashboard.png` });

  console.log('Capturing Slide 3: Settings & Dynamic Branding...');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUTPUT_DIR}/slide8_branding_settings.png` });

  console.log('Capturing Slide 4: Waiter Table POS...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'waiter');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'waiter123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUTPUT_DIR}/slide3_waiter_pos.png` });

  // Click on a table to show ordering and cart
  console.log('Capturing Slide 5: Waiter Ordering & Cart...');
  await page.evaluate(() => {
    const tableCards = Array.from(document.querySelectorAll('div, button')).filter(el => el.innerText && el.innerText.includes('Table-01'));
    if (tableCards.length > 0) tableCards[0].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUTPUT_DIR}/slide4_waiter_ordering.png` });

  console.log('Capturing Slide 6: Chef Kitchen Display System...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'chef');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'chef123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUTPUT_DIR}/slide5_chef_kitchen.png` });

  console.log('Capturing Slide 7: Manager Billing & Settlement...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', el => el.value = 'manager');
  await page.$eval('input[placeholder="Enter password"]', el => el.value = 'manager123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2, header', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUTPUT_DIR}/slide6_manager_billing.png` });

  // Check if there is a printable bill or view bill
  const viewBillClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('View Bill') || b.innerText.includes('Generate Bill') || b.innerText.includes('Settlement') || b.title?.includes('Bill'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (viewBillClicked) {
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: `${OUTPUT_DIR}/slide7_printable_bill.png` });
  } else {
    // Duplicate manager billing
    await page.screenshot({ path: `${OUTPUT_DIR}/slide7_printable_bill.png` });
  }

  await browser.close();
  console.log('All slides captured successfully!');
}

capture().catch(console.error);
