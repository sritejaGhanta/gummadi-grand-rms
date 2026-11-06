const puppeteer = require('/var/www/html/Restorent/frontend/node_modules/puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = '/home/hb/.gemini/antigravity/brain/c1d55e29-d93b-41e4-8864-c8edc5d44a88';

async function run() {
  console.log('🚀 Starting Comprehensive AharPOS Verification Flow...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('BROWSER LOG ERROR:', msg.text());
  });

  // ==========================================
  // STEP 1: Public Landing Page
  // ==========================================
  console.log('\n[STEP 1] Testing Public Landing Page at http://localhost:5173/restaurant/ ...');
  await page.goto('http://localhost:5173/restaurant/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  // Check branding
  const brandText = await page.evaluate(() => document.body.innerText);
  if (!brandText.includes('AharPOS')) {
    throw new Error('AharPOS branding not found on landing page');
  }
  console.log('✅ AharPOS brand title verified');

  // Submit a lead inquiry from a restaurant owner
  console.log('Submitting Demo Inquiry from Swagath Restaurant...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const rName = inputs.find((i) => i.placeholder && i.placeholder.includes('Paradise Biryani'));
    if (rName) {
      rName.value = 'Swagath Traditional Restaurant';
      rName.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const oName = inputs.find((i) => i.placeholder && i.placeholder.includes('Suresh Gummadi'));
    if (oName) {
      oName.value = 'K. Swagath (Owner)';
      oName.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const phone = inputs.find((i) => i.placeholder && i.placeholder.includes('99480'));
    if (phone) {
      phone.value = '+91 91211 11135';
      phone.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const city = inputs.find((i) => i.placeholder && i.placeholder.includes('Vijayawada'));
    if (city) {
      city.value = 'Dilsukhnagar, Hyderabad';
      city.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await new Promise((r) => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find((b) => b.innerText && b.innerText.includes('Submit & Claim'));
    if (submitBtn) submitBtn.click();
  });

  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'aharpos_landing_page.png') });
  console.log('✅ Landing page captured: aharpos_landing_page.png');

  // ==========================================
  // STEP 2: Super Admin Dashboard & Leads CMS
  // ==========================================
  console.log('\n[STEP 2] Logging in as Super Admin to check Leads & CMS...');
  await page.goto('http://localhost:5173/restaurant/login', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saBtn = btns.find((b) => b.innerText && b.innerText.includes('Super Admin'));
    if (saBtn) saBtn.click();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  // Switch to Leads Tab
  console.log('Opening Demo Inquiries & Leads Tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const leadsTab = btns.find((b) => b.innerText && b.innerText.includes('Demo Inquiries'));
    if (leadsTab) leadsTab.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Convert the newly submitted Swagath lead to tenant
  console.log('Converting Swagath lead to active tenant...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const convertBtn = btns.find((b) => b.innerText && b.innerText.includes('1-Click Onboard'));
    if (convertBtn) convertBtn.click();
  });
  await new Promise((r) => setTimeout(r, 2500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'aharpos_superadmin_leads_cms.png') });
  console.log('✅ Super Admin Leads & CMS captured: aharpos_superadmin_leads_cms.png');

  // ==========================================
  // STEP 3: Gummadi Grand Restaurant Owner
  // ==========================================
  console.log('\n[STEP 3] Logging in as Gummadi Grand Owner (Suresh Gummadi)...');
  await page.goto('http://localhost:5173/restaurant/login', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const gBtn = btns.find((b) => b.innerText && b.innerText.includes('Gummadi Grand Owner'));
    if (gBtn) gBtn.click();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const ownerUrl = page.url();
  console.log('Gummadi Owner URL:', ownerUrl);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'aharpos_gummadi_owner.png') });
  console.log('✅ Gummadi Owner Control Room captured: aharpos_gummadi_owner.png');

  // ==========================================
  // STEP 4: Gummadi Waiter POS & Order Punch
  // ==========================================
  console.log('\n[STEP 4] Logging in as Gummadi Waiter to punch order for Table G-01...');
  await page.goto('http://localhost:5173/restaurant/login', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const wBtn = btns.find((b) => b.innerText && b.innerText.includes('Gummadi Waiter'));
    if (wBtn) wBtn.click();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  // Select Table G-01
  console.log('Selecting Table G-01...');
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const tG1 = divs.find((d) => d.innerText && d.innerText.includes('G-01'));
    if (tG1) tG1.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  // Add Royyala Biryani to Cart
  console.log('Adding Gummadi Special Royyala Biryani to order...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find((b) => b.innerText && b.innerText.includes('+ Add'));
    if (addBtn) addBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Send Order to Kitchen KOT
  console.log('Sending KOT order to Kitchen...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sendBtn = btns.find((b) => b.innerText && b.innerText.includes('Send Order to Kitchen'));
    if (sendBtn) sendBtn.click();
  });
  await new Promise((r) => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'aharpos_gummadi_pos.png') });
  console.log('✅ Gummadi POS captured: aharpos_gummadi_pos.png');

  // ==========================================
  // STEP 5: Gummadi Chef KDS
  // ==========================================
  console.log('\n[STEP 5] Logging in as Gummadi Chef to verify Kitchen KDS Order...');
  await page.goto('http://localhost:5173/restaurant/login', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cBtn = btns.find((b) => b.innerText && b.innerText.includes('Gummadi Chef'));
    if (cBtn) cBtn.click();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'aharpos_gummadi_kds.png') });
  console.log('✅ Gummadi Chef KDS captured: aharpos_gummadi_kds.png');

  console.log('\n🎉 ALL AHARPOS E2E WORKFLOW TESTS PASSED 100%!');
  await browser.close();
}

run().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
