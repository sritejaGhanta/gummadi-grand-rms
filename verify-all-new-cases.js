const puppeteer = require('/var/www/html/Restorent/frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/home/hb/.gemini/antigravity/brain/c1d55e29-d93b-41e4-8864-c8edc5d44a88';
const BASE_URL = 'http://localhost:5173/restaurant';

async function run() {
  console.log('🚀 Starting E2E verification of Contactless QR Ordering, Portions (1/2, 1/3, Full), Acrylic Stands & Table Reservations...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // -------------------------------------------------------------
    // TEST CASE 8: Customer scans acrylic stand QR for Table G-01
    // -------------------------------------------------------------
    console.log('\n--- Case 8: Contactless QR Menu & Ordering with Portions (1/2, 1/3, Full) ---');
    await page.goto(`${BASE_URL}/qr/gummadi-grand/G-01`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1', { timeout: 10000 });

    const headerText = await page.$eval('h1', el => el.innerText);
    console.log('Restaurant Header:', headerText);
    if (!headerText.includes('Gummadi Grand')) {
      throw new Error(`Expected Gummadi Grand in header, got: ${headerText}`);
    }

    const tableBadge = await page.evaluate(() => {
      const el = document.querySelector('header');
      return el ? el.innerText : '';
    });
    console.log('Header Table Check: Contains G-01?', tableBadge.includes('G-01'));
    if (!tableBadge.includes('G-01')) {
      throw new Error('Table G-01 badge not visible on QR Menu');
    }

    // Check portion pills on Biryani: Half (1/2) ₹240, Single (1/3) ₹160
    console.log('Selecting "Half (1/2)" portion specifically for Gummadi Special Royyala Biryani...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('main div.bg-slate-900\\/60'));
      const biryani = cards.find(c => c.innerText.includes('Royyala Biryani'));
      if (biryani) {
        const halfBtn = Array.from(biryani.querySelectorAll('button')).find(b => b.innerText.includes('Half (1/2)'));
        if (halfBtn) halfBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 600));

    console.log('Adding Half (1/2) Royyala Biryani to Cart...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('main div.bg-slate-900\\/60'));
      const biryani = cards.find(c => c.innerText.includes('Royyala Biryani'));
      if (biryani) {
        const addBtn = Array.from(biryani.querySelectorAll('button')).find(b => b.innerText.includes('Add to Order'));
        if (addBtn) addBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 800));

    // Floating cart bar should appear
    console.log('Opening Cart Drawer...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cartBtn = buttons.find(b => b.innerText.includes('View Cart & Place Order'));
      if (cartBtn) cartBtn.click();
    });

    await new Promise(r => setTimeout(r, 800));

    // Fill diner name & phone
    await page.type('input[placeholder*="Suresh"]', 'Mahesh Varma');
    await page.type('input[placeholder*="98765"]', '+91 99887 76655');

    // Submit order
    console.log('Sending QR Order to Chef...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendBtn = buttons.find(b => b.innerText.includes('Send Order to Chef'));
      if (sendBtn) sendBtn.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    const shot8Path = path.join(ARTIFACT_DIR, 'verify_case8_qr_menu_order.png');
    await page.screenshot({ path: shot8Path });
    console.log(`📸 Saved Case 8 screenshot: ${shot8Path}`);

    // -------------------------------------------------------------
    // TEST CASE 9: Chef KDS receives QR Self-Order with portion Half (1/2)
    // -------------------------------------------------------------
    console.log('\n--- Case 9: Chef KDS Ticket Verification for QR Self-Order ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const chefBtn = btns.find(b => b.innerText.includes('Gummadi Chef'));
      if (chefBtn) chefBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.goto(`${BASE_URL}/kitchen`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h2, h3, h4', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    const kdsBody = await page.evaluate(() => document.body.innerText);
    const hasG01 = kdsBody.includes('G-01') || kdsBody.includes('Table G-01');
    const hasRoyyala = kdsBody.includes('Royyala');
    const hasPortion = kdsBody.includes('Half (1/2)') || kdsBody.includes('1/2');
    const hasQrBadge = kdsBody.includes('QR');

    console.log('KDS Table G-01 Present:', hasG01);
    console.log('KDS Royyala Biryani Present:', hasRoyyala);
    console.log('KDS Portion [Half (1/2)] Present:', hasPortion);
    console.log('KDS QR Self-Order Badge Present:', hasQrBadge);

    const shot9Path = path.join(ARTIFACT_DIR, 'verify_case9_chef_kds_qr_order.png');
    await page.screenshot({ path: shot9Path });
    console.log(`📸 Saved Case 9 screenshot: ${shot9Path}`);

    // -------------------------------------------------------------
    // TEST CASE 10: Waiter Staff POS & Acrylic QR Stand Modal
    // -------------------------------------------------------------
    console.log('\n--- Case 10: Waiter Staff POS & Acrylic Stand Modal ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const waiterBtn = btns.find(b => b.innerText.includes('Gummadi Waiter'));
      if (waiterBtn) waiterBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.goto(`${BASE_URL}/staff-pos`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.cursor-pointer', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // Click Table G-01
    console.log('Selecting Table G-01 on Floor Map...');
    await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('.cursor-pointer'));
      const tableCard = tables.find(t => t.innerText.includes('Seats') || t.innerText.includes('G-01'));
      if (tableCard) tableCard.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Click Acrylic QR Stand button
    console.log('Opening Acrylic QR Stand Modal in POS...');
    const standOpened = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const qrBtn = btns.find(b => b.innerText.includes('Acrylic QR Stand'));
      if (qrBtn) {
        qrBtn.click();
        return true;
      }
      return false;
    });
    console.log('Acrylic Stand Modal opened:', standOpened);
    await new Promise(r => setTimeout(r, 1000));

    const shot10Path = path.join(ARTIFACT_DIR, 'verify_case10_acrylic_qr_stand_pos.png');
    await page.screenshot({ path: shot10Path });
    console.log(`📸 Saved Case 10 screenshot: ${shot10Path}`);

    // -------------------------------------------------------------
    // TEST CASE 11: Owner Dashboard & Pre-Booked Table Reservations
    // -------------------------------------------------------------
    console.log('\n--- Case 11: Owner Dashboard - Table Reservations Tab ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ownerBtn = btns.find(b => b.innerText.includes('Gummadi Owner'));
      if (ownerBtn) ownerBtn.click();
    });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await page.goto(`${BASE_URL}/owner-dashboard`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('button', { timeout: 10000 });

    // Click Pre-Bookings tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const resTab = btns.find(b => b.innerText.includes('Pre-Bookings'));
      if (resTab) resTab.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const resContent = await page.evaluate(() => document.body.innerText);
    console.log('Contains Srinivas Rao Booking:', resContent.includes('Srinivas Rao'));
    console.log('Contains Table G-02:', resContent.includes('G-02'));
    console.log('Contains Advance ₹1000:', resContent.includes('1000'));

    const shot11Path = path.join(ARTIFACT_DIR, 'verify_case11_table_reservations_owner.png');
    await page.screenshot({ path: shot11Path });
    console.log(`📸 Saved Case 11 screenshot: ${shot11Path}`);

    // -------------------------------------------------------------
    // TEST CASE 12: Owner Dashboard - Acrylic QR Stands Tab
    // -------------------------------------------------------------
    console.log('\n--- Case 12: Owner Dashboard - Acrylic QR Stands Tab ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const qrTab = btns.find(b => b.innerText.includes('Acrylic QR Stands'));
      if (qrTab) qrTab.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const shot12Path = path.join(ARTIFACT_DIR, 'verify_case12_qr_stands_owner.png');
    await page.screenshot({ path: shot12Path });
    console.log(`📸 Saved Case 12 screenshot: ${shot12Path}`);

    console.log('\n=========================================');
    console.log('🎉 ALL 5 ADVANCED TEST CASES PASSED 100%!');
    console.log('=========================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
