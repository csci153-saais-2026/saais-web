const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const fileUrl = 'file:///' + path.join(__dirname, '..', 'adviser.html').replace(/\\/g, '/');
  await page.goto(fileUrl + '#/adviser/advisees');
  await page.waitForTimeout(150);
  const rows = await page.$$('.view.active tbody tr.row');
  for (const r of rows) { if ((await r.innerText()).includes('Santos, Kier B.')) { await r.click(); break; } }
  await page.waitForTimeout(150);
  await page.click('.view.active >> text=Notes >> nth=0');
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => document.querySelectorAll('.view.active [data-notes-list] > div').length);
  const countBadge = await page.evaluate(() => document.querySelector('.view.active [data-adv-notes-count]').textContent);
  console.log('Santos notes entries:', before, '| badge:', countBadge);
  await page.click('.view.active [data-note-form] [data-field="note"]');
  await page.keyboard.type('Follow-up note.');
  await page.click('.view.active [data-note-form] button:has-text("Save note")');
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => document.querySelectorAll('.view.active [data-notes-list] > div').length);
  console.log('Santos notes entries after save:', after);
  console.log('errors:', errors);
  await browser.close();
})();
