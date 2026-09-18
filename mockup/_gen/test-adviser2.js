const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  const fileUrl = 'file:///' + path.join(__dirname, '..', 'adviser.html').replace(/\\/g, '/');
  await page.goto(fileUrl + '#/adviser/advisees/checklist');
  await page.waitForTimeout(200);

  // Record mapping: pick dest/source, fill justification, submit
  await page.click('[data-mapping-form] [data-name="dest"] .sel-label');
  await page.click('[data-mapping-form] .sel-opt:has-text("MAJ ELEC 1")');
  await page.click('[data-mapping-form] [data-field="justification"]');
  await page.keyboard.type('Matches major elective requirement.');
  const before = await page.evaluate(() => document.querySelectorAll('[data-exceptions-table] > [data-exception-card]').length);
  await page.click('[data-mapping-form] button:has-text("Record mapping")');
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => document.querySelectorAll('[data-exceptions-table] > [data-exception-card]').length);
  console.log('exceptions cards before/after record-mapping:', before, '/', after);

  // Run simulation button + toast
  await page.click('button:has-text("Run simulation")');
  await page.waitForTimeout(150);
  const toastVisible = await page.evaluate(() => !!document.querySelector('.proto-toast.show'));
  console.log('toast shown after run simulation:', toastVisible);

  // Grades tab -> not in prototype toast
  await page.click('.view.active >> text=Grades >> nth=0');
  await page.waitForTimeout(150);
  const toastText = await page.evaluate(() => { const t = document.querySelectorAll('.proto-toast'); return t.length ? t[t.length - 1].textContent : ''; });
  console.log('toast on Grades tab click:', JSON.stringify(toastText));

  // Notes page: filter checkboxes
  await page.evaluate(() => { location.hash = '#/adviser/advisees/notes'; });
  await page.waitForTimeout(200);
  const totalEntries = await page.evaluate(() => document.querySelectorAll('.view.active [data-notes-list] > div').length);
  await page.click('.view.active [data-checkbox="notes-filter"][data-filter-key="attempt-remarks"]');
  await page.waitForTimeout(100);
  const afterUncheckRemarks = await page.evaluate(() => Array.from(document.querySelectorAll('.view.active [data-notes-list] > div')).filter(d => d.style.display !== 'none').length);
  console.log('note entries total/after unchecking Attempt remarks:', totalEntries, '/', afterUncheckRemarks);

  await page.click('.view.active [data-checkbox="notes-filter"][data-filter-key="attempt-remarks"]');
  await page.click('.view.active [data-checkbox="notes-filter"][data-filter-key="written-by-me"]');
  await page.waitForTimeout(100);
  const onlyMine = await page.evaluate(() => Array.from(document.querySelectorAll('.view.active [data-notes-list] > div')).filter(d => d.style.display !== 'none').length);
  console.log('note entries after "Written by me" only:', onlyMine);

  // New note form: fill + save, verify prepend
  await page.click('.view.active [data-note-form] [data-field="note"]');
  await page.keyboard.type('Automated test note content.');
  await page.click('.view.active [data-note-form] button:has-text("Save note")');
  await page.waitForTimeout(150);
  const firstEntryText = await page.evaluate(() => document.querySelector('.view.active [data-notes-list] > div')?.textContent || '');
  console.log('first note entry after save contains new text:', firstEntryText.includes('Automated test note content.'));

  console.log('\nJS ERRORS:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
