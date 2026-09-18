const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  const fileUrl = 'file:///' + path.join(__dirname, '..', 'adviser.html').replace(/\\/g, '/');
  await page.goto(fileUrl + '#/adviser/advisees');
  await page.waitForTimeout(200);

  async function clickRowByName(name) {
    await page.evaluate(() => { location.hash = '#/adviser/advisees'; });
    await page.waitForTimeout(150);
    const rows = await page.$$('.view.active tbody tr.row');
    for (const r of rows) {
      const text = await r.innerText();
      if (text.includes(name)) { await r.click(); return true; }
    }
    return false;
  }

  async function readDetailHeader() {
    return page.evaluate(() => {
      const v = document.querySelector('.view.active');
      return {
        name: v.querySelector('[data-adv-name]')?.textContent,
        avatar: v.querySelector('[data-adv-avatar]')?.textContent,
        breadcrumb: v.querySelector('[data-adv-breadcrumb]')?.textContent,
        standing: v.querySelector('[data-adv-standing]')?.textContent,
        meta: v.querySelector('[data-adv-meta]')?.textContent,
        gwa: v.querySelector('[data-adv-gwa]')?.textContent,
        units: v.querySelector('[data-adv-units]')?.textContent,
        inc: v.querySelector('[data-adv-inc]')?.textContent,
        addNoteStudent: v.querySelector('[data-open-modal="add-note"]')?.getAttribute('data-student'),
      };
    });
  }

  // Test a delinquent student
  await clickRowByName('Cruz, Angelo P.');
  await page.waitForTimeout(150);
  console.log('Cruz detail:', JSON.stringify(await readDetailHeader(), null, 0));

  // Now go to Checklist tab for same student — should still show Cruz
  await page.click('.view.active >> text=Checklist >> nth=0');
  await page.waitForTimeout(150);
  console.log('Cruz checklist header:', JSON.stringify(await readDetailHeader(), null, 0));

  // Different student: watchlist standing
  await clickRowByName('Mendoza, Carl John S.');
  await page.waitForTimeout(150);
  console.log('Mendoza detail:', JSON.stringify(await readDetailHeader(), null, 0));

  // Another: good standing, 1st year
  await clickRowByName('Villanueva, Andrea M.');
  await page.waitForTimeout(150);
  console.log('Villanueva detail:', JSON.stringify(await readDetailHeader(), null, 0));

  console.log('\nJS ERRORS:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
