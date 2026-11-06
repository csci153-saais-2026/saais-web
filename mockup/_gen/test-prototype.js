const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  const fileUrl = 'file:///' + path.join(__dirname, '..', 'prototype.html').replace(/\\/g, '/');
  const shot = (name) => page.screenshot({ path: path.join(__dirname, name), fullPage: false });

  await page.goto(fileUrl);
  await page.waitForTimeout(300);
  console.log('1) landing loaded, hash=', await page.evaluate(() => location.hash));
  await shot('01-landing.png');

  await page.click('text=Sign in >> nth=0');
  await page.waitForTimeout(200);
  console.log('2) after clicking Sign in, hash=', await page.evaluate(() => location.hash));
  await shot('02-login.png');

  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(200);
  console.log('3) after login Sign in button, hash=', await page.evaluate(() => location.hash));
  await shot('03-student-dashboard.png');

  await page.click('.navi:has-text("Curriculum checklist")');
  await page.waitForTimeout(200);
  console.log('4) after clicking Curriculum checklist, hash=', await page.evaluate(() => location.hash));
  await shot('04-student-checklist.png');

  await page.click('#proto-bar [data-role="adviser"]');
  await page.waitForTimeout(200);
  console.log('5a) after Demo as Adviser, hash=', await page.evaluate(() => location.hash));
  await page.click('#proto-bar [data-role="admin"]');
  await page.waitForTimeout(200);
  console.log('5b) after Demo as Admin, hash=', await page.evaluate(() => location.hash));
  await shot('05-admin-dashboard.png');

  await page.click('#proto-map');
  await page.waitForTimeout(200);
  const smVisible = await page.isVisible('#proto-sitemap.open');
  console.log('6) sitemap open:', smVisible);
  await shot('06-sitemap.png');
  await page.click('[data-goto="adviser/advisees"]');
  await page.waitForTimeout(200);
  console.log('6b) after sitemap goto adviser/advisees, hash=', await page.evaluate(() => location.hash));
  await shot('07-adviser-advisees.png');

  await page.click('tr.row >> nth=0');
  await page.waitForTimeout(200);
  console.log('7) after clicking advisee row, hash=', await page.evaluate(() => location.hash));
  await shot('08-advisee-detail.png');

  await page.click('text=Checklist >> nth=0');
  await page.waitForTimeout(200);
  console.log('8) after clicking Checklist tab, hash=', await page.evaluate(() => location.hash));
  await shot('09-advisee-checklist.png');

  await page.click('text=Notes >> nth=0');
  await page.waitForTimeout(200);
  console.log('9) after clicking Notes tab, hash=', await page.evaluate(() => location.hash));
  await shot('10-advisee-notes.png');

  console.log('CONSOLE/PAGE ERRORS:', errors.length ? errors : 'none');

  await browser.close();
})();
