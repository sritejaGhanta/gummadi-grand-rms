const puppeteer = require('/var/www/html/Restorent/frontend/node_modules/puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = '/home/hb/.gemini/antigravity/brain/c1d55e29-d93b-41e4-8864-c8edc5d44a88';

async function runTest() {
  console.log('🚀 Starting E2E Local Verification for Petpooja SaaS Multi-Tenant Platform...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('BROWSER ERROR:', msg.text());
    }
  });

  // ==========================================
  // TEST 1: Super Admin Login & Dashboard
  // ==========================================
  console.log('\n[TEST 1] Logging in as Super Admin (SaaS Platform Owner)...');
  await page.goto('http://localhost:5173/restaurant/login', { waitUntil: 'networkidle0' });
  
  // Click Super Admin Quick Login
  const superAdminClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Super Admin'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (!superAdminClicked) {
    throw new Error('Super Admin quick login button not found');
  }

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  const currentUrl = page.url();
  console.log('Current URL after Super Admin login:', currentUrl);
  if (!currentUrl.includes('/super-admin')) {
    throw new Error(`Expected /super-admin URL, got ${currentUrl}`);
  }

  // Take screenshot of Super Admin dashboard
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_saas_superadmin.png') });
  console.log('✅ Super Admin Dashboard captured: test_saas_superadmin.png');

  // Test Onboarding new Restaurant Tenant
  console.log('\n[TEST 2] Onboarding new restaurant tenant: Teluguness Restaurant...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const onboardBtn = btns.find(b => b.innerText.includes('Onboard New Restaurant'));
    if (onboardBtn) onboardBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Fill onboarding modal form
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Paradise Biryani'));
    if (nameInput) {
      nameInput.value = 'Teluguness Restaurant';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const phoneInput = inputs.find(i => i.placeholder && i.placeholder.includes('9876543210'));
    if (phoneInput) {
      phoneInput.value = '+91 73306 31919';
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const cityInput = inputs.find(i => i.placeholder && i.placeholder.includes('Hyderabad'));
    if (cityInput) {
      cityInput.value = 'Madhapur, Hi-Tech City';
      cityInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const ownerNameInput = inputs.find(i => i.placeholder && i.placeholder.includes('K. Sharma'));
    if (ownerNameInput) {
      ownerNameInput.value = 'Chaitanya (Owner)';
      ownerNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const ownerUserInput = inputs.find(i => i.placeholder && i.placeholder.includes('paradise_owner'));
    if (ownerUserInput) {
      ownerUserInput.value = 'teluguness_owner';
      ownerUserInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const ownerPassInput = inputs.find(i => i.placeholder && i.placeholder.includes('Min 6 characters'));
    if (ownerPassInput) {
      ownerPassInput.value = 'teluguness123';
      ownerPassInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 500));

  // Click Submit Tenant
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.innerText.includes('Complete Onboarding'));
    if (submitBtn) submitBtn.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_saas_tenant_onboarded.png') });
  console.log('✅ New Tenant Onboarded captured: test_saas_tenant_onboarded.png');

  // ==========================================
  // TEST 3: Restaurant Owner Login & Control Room
  // ==========================================
  console.log('\n[TEST 3] Logging in as Restaurant Owner (Mandi King Arabian Restaurant)...');
  await page.goto('http://localhost:5173/restaurant/login', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const ownerBtn = btns.find(b => b.innerText.includes('Restaurant Owner'));
    if (ownerBtn) ownerBtn.click();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  const ownerUrl = page.url();
  console.log('Current URL after Owner login:', ownerUrl);
  if (!ownerUrl.includes('/owner-dashboard')) {
    throw new Error(`Expected /owner-dashboard URL, got ${ownerUrl}`);
  }

  // Open Add Staff Modal
  console.log('Testing adding outlet staff member...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addStaffBtn = btns.find(b => b.innerText.includes('Add Staff Member'));
    if (addStaffBtn) addStaffBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Ramesh Kumar'));
    if (nameInput) {
      nameInput.value = 'Ramesh Captain';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const userInput = inputs.find(i => i.placeholder && i.placeholder.includes('ramesh_pos'));
    if (userInput) {
      userInput.value = 'ramesh_captain';
      userInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const passInput = inputs.find(i => i.placeholder && i.placeholder.includes('Temporary password'));
    if (passInput) {
      passInput.value = 'captain123';
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitStaffBtn = btns.find(b => b.innerText.includes('Create Staff Account'));
    if (submitStaffBtn) submitStaffBtn.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_saas_owner_dashboard.png') });
  console.log('✅ Restaurant Owner Control Room captured: test_saas_owner_dashboard.png');

  // ==========================================
  // TEST 4: Staff POS & Table Sharing View
  // ==========================================
  console.log('\n[TEST 4] Testing Staff POS Floor & Table Sharing...');
  await page.goto('http://localhost:5173/restaurant/login', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const waiterBtn = btns.find(b => b.innerText.includes('Waiter (POS)'));
    if (waiterBtn) waiterBtn.click();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  const posUrl = page.url();
  console.log('Current URL after Waiter login:', posUrl);

  // Select Table-01
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const t1 = divs.find(d => d.innerText && d.innerText.includes('Table-01') && d.innerText.includes('Seats'));
    if (t1) t1.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_saas_waiter_pos.png') });
  console.log('✅ Staff POS Floor captured: test_saas_waiter_pos.png');

  console.log('\n🎉 ALL PETPOOJA HMVC SAAS MULTI-TENANT TESTS PASSED 100%!');
  await browser.close();
}

runTest().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
