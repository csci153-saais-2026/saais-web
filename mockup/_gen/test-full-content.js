const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
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

  async function readDetail() {
    return page.evaluate(() => {
      const v = document.querySelector('.view.active');
      return {
        name: v.querySelector('[data-adv-name]')?.textContent,
        courses: Array.from(v.querySelectorAll('[data-adv-courses] tr')).map(tr => tr.children[0].textContent + '/' + tr.children[4].textContent.trim()),
        timeline: Array.from(v.querySelectorAll('[data-adv-timeline] > div')).map(d => d.children[2].children[0].textContent),
        notes: v.querySelector('[data-notes-list]')?.textContent.slice(0, 60),
      };
    });
  }

  async function readChecklist() {
    return page.evaluate(() => {
      const v = document.querySelector('.view.active');
      return {
        slots: Array.from(v.querySelectorAll('[data-adv-openslots] tr')).map(tr => tr.children[0].textContent + ':' + tr.children[3].textContent.trim()),
        slotsCount: v.querySelector('[data-adv-openslots-count]')?.textContent,
        exceptions: v.querySelector('[data-exceptions-table] tbody')?.textContent.trim(),
        exceptionsCount: v.querySelector('[data-adv-exceptions-count]')?.textContent,
      };
    });
  }

  // Student 1: Cruz (Delinquent, 3rd yr CS)
  await clickRowByName('Cruz, Angelo P.');
  await page.waitForTimeout(150);
  console.log('Cruz detail:', JSON.stringify(await readDetail()));
  await page.click('.view.active >> text=Checklist >> nth=0');
  await page.waitForTimeout(150);
  console.log('Cruz checklist:', JSON.stringify(await readChecklist()));

  // Student 2: Villanueva (Good standing, 1st yr IT)
  await clickRowByName('Villanueva, Andrea M.');
  await page.waitForTimeout(150);
  console.log('Villanueva detail:', JSON.stringify(await readDetail()));

  // Student 3: Mendoza (Watchlist, INC=2, 3rd yr)
  await clickRowByName('Mendoza, Carl John S.');
  await page.waitForTimeout(150);
  console.log('Mendoza detail:', JSON.stringify(await readDetail()));
  await page.click('.view.active >> text=Checklist >> nth=0');
  await page.waitForTimeout(150);
  console.log('Mendoza checklist:', JSON.stringify(await readChecklist()));

  // Now go back to Bautista (default) — should restore original authored content
  await clickRowByName('Bautista, Maria Isabel L.');
  await page.waitForTimeout(150);
  const bautista = await readDetail();
  console.log('Bautista (restored) detail:', JSON.stringify(bautista));
  await page.click('.view.active >> text=Checklist >> nth=0');
  await page.waitForTimeout(150);
  const bautistaChecklist = await readChecklist();
  console.log('Bautista (restored) checklist:', JSON.stringify(bautistaChecklist));

  const restoredCorrectly = bautista.courses.some(c => c.includes('CS 121')) && bautistaChecklist.exceptionsCount.includes('3');
  console.log('Bautista original content correctly restored:', restoredCorrectly);

  console.log('\nJS ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
