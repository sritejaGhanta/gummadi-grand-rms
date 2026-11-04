const puppeteer = require('/var/www/html/Restorent/frontend/node_modules/puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('1. Navigating to login page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/tmp/branding-1-login.png' });

  console.log('2. Logging in as admin...');
  await page.waitForSelector('input[placeholder="Enter staff username"]');
  await page.$eval('input[placeholder="Enter staff username"]', (el) => (el.value = ''));
  await page.type('input[placeholder="Enter staff username"]', 'admin');
  await page.$eval('input[placeholder="Enter password"]', (el) => (el.value = ''));
  await page.type('input[placeholder="Enter password"]', 'admin123');
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
  await page.waitForSelector('header, aside', { timeout: 5000 }).catch(() => {});
  console.log(`Current URL after login: ${page.url()}`);

  console.log('3. Navigating to Settings page...');
  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/tmp/branding-2-settings.png' });

  // Read initial --theme-primary
  let currentThemePrimary = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
  });
  console.log(`Initial --theme-primary: ${currentThemePrimary}`);

  console.log('4. Clicking "Emerald Jade Palace" Theme Preset...');
  // Find the button with Emerald Jade Palace
  const clickedPreset = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const emeraldBtn = buttons.find(b => b.innerText.includes('Emerald Jade Palace'));
    if (emeraldBtn) {
      emeraldBtn.click();
      return true;
    }
    return false;
  });
  console.log(`Clicked Emerald Preset: ${clickedPreset}`);

  // Check if live preview updated the CSS variable
  let previewThemePrimary = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
  });
  console.log(`Live preview --theme-primary: ${previewThemePrimary}`);

  console.log('5. Clicking "Emerald Palace Chef" Preset Logo...');
  const clickedLogo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const logoBtn = buttons.find(b => b.innerText.includes('Emerald Palace Chef'));
    if (logoBtn) {
      logoBtn.click();
      return true;
    }
    return false;
  });
  console.log(`Clicked Emerald Logo: ${clickedLogo}`);

  console.log('6. Saving settings...');
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/branding-3-saved-emerald.png' });

  // Verify Navbar logo
  const navbarLogoSrc = await page.evaluate(() => {
    const img = document.querySelector('header img');
    return img ? img.src.substring(0, 50) + '...' : null;
  });
  console.log(`Navbar Logo Src: ${navbarLogoSrc}`);

  console.log('7. Navigating to /admin dashboard to verify branding persistence...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/tmp/branding-4-admin-emerald.png' });

  const adminThemePrimary = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
  });
  console.log(`Admin Dashboard --theme-primary: ${adminThemePrimary}`);

  console.log('8. Going to /login to check branding on login screen...');
  // Logout
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/tmp/branding-5-login-emerald.png' });

  const loginLogoSrc = await page.evaluate(() => {
    const img = document.querySelector('img[alt]');
    return img ? img.src.substring(0, 50) + '...' : null;
  });
  console.log(`Login Screen Logo Src: ${loginLogoSrc}`);

  await browser.close();
  console.log('TEST COMPLETE!');
})();