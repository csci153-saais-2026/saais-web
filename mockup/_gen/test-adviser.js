const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  const fileUrl = 'file:///' + path.join(__dirname, '..', 'adviser.html').replace(/\\/g, '/');
  let step = 0;
  const check = async (label) => {
    step++;
    console.log(step + ') ' + label + ' -> hash=' + await page.evaluate(() => location.hash));
  };

  await page.goto(fileUrl + '#/adviser/dashboard');
  await page.waitForTimeout(200);
  await check('dashboard loaded');

  // Quick action: Write an advising note -> should go to notes route
  await page.click('text=Write an advising note');
  await page.waitForTimeout(150);
  await check('clicked quick action "Write an advising note"');

  // Go to advisees list
  await page.evaluate(() => { location.hash = '#/adviser/advisees'; });
  await page.waitForTimeout(150);

  // Dropdown: open Program select, pick BS Info. Technology
  await page.click('label:has-text("Program") .sel-label');
  await page.waitForTimeout(100);
  const selOpen = await page.evaluate(() => !!document.querySelector('[data-select].open'));
  console.log('dropdown opened:', selOpen);
  await page.click('.sel-opt:has-text("BS Info. Technology")');
  const selVal = await page.evaluate(() => document.querySelector('label span')?.textContent);
  await page.waitForTimeout(100);

  // Live search filter
  await page.fill('input[data-live-search]', 'Cruz');
  await page.waitForTimeout(150);
  const visibleRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.view.active tbody tr')).filter(r => r.style.display !== 'none').length;
  });
  console.log('rows visible after searching "Cruz":', visibleRows);
  await page.fill('input[data-live-search]', '');

  // Pill filter: Delinquent
  await page.click('[data-pill="delinquent"]');
  await page.waitForTimeout(150);
  const delinquentRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.view.active tbody tr')).filter(r => r.style.display !== 'none').length;
  });
  console.log('rows visible after Delinquent pill:', delinquentRows);
  await page.click('[data-pill="active"]');

  // Row click -> detail
  await page.click('tbody tr.row >> nth=0');
  await page.waitForTimeout(150);
  await check('clicked advisee row');

  // Add note modal
  await page.click('button:has-text("Add note")');
  await page.waitForTimeout(150);
  const modalOpen1 = await page.evaluate(() => document.getElementById('proto-modal-overlay').classList.contains('open'));
  console.log('add-note modal open:', modalOpen1);
  await page.click('#proto-modal-body [contenteditable]');
  await page.keyboard.type('Test note from automated check.');
  await page.click('#proto-modal-body button:has-text("Save note")');
  await page.waitForTimeout(150);
  const modalClosed1 = await page.evaluate(() => !document.getElementById('proto-modal-overlay').classList.contains('open'));
  const noteAppended = await page.evaluate(() => document.querySelector('[data-notes-list]')?.firstElementChild?.textContent.includes('Test note from automated check.'));
  console.log('modal closed after save:', modalClosed1, '| note appended:', noteAppended);

  // Remark modal
  await page.click('a:has-text("Remark") >> nth=0');
  await page.waitForTimeout(150);
  const remarkModalOpen = await page.evaluate(() => document.getElementById('proto-modal-overlay').classList.contains('open') && document.getElementById('proto-modal-body').textContent.includes('CS 121'));
  console.log('remark modal open w/ CS 121 context:', remarkModalOpen);
  await page.keyboard.press('Escape');

  // Go to enrollment/new, submit attempt -> prereq modal
  await page.evaluate(() => { location.hash = '#/adviser/enrollment/new'; });
  await page.waitForTimeout(150);
  await page.click('.view.active button:has-text("Record attempt")');
  await page.waitForTimeout(150);
  const prereqOpen = await page.evaluate(() => {
    const el = document.querySelector('.view.active [data-prereq-modal]');
    return el && getComputedStyle(el).display !== 'none';
  });
  console.log('prereq modal opened on submit:', prereqOpen);
  await page.click('[data-action="continue-override"]');
  await page.waitForTimeout(150);
  await check('after continue-override');

  // Reassignment page: checkbox toggle + execute confirm
  await page.evaluate(() => { location.hash = '#/adviser/reassignment'; });
  await page.waitForTimeout(150);
  const beforeCount = await page.evaluate(() => document.querySelector('.view.active [data-reassign-count]').textContent);
  await page.click('.view.active [data-checkbox="reassign-row"][data-checked="0"] >> nth=0');
  await page.waitForTimeout(100);
  const afterCount = await page.evaluate(() => document.querySelector('.view.active [data-reassign-count]').textContent);
  console.log('reassign count before/after checkbox click:', beforeCount, '/', afterCount);

  await page.click('.view.active button:has-text("Execute reassignment")');
  await page.waitForTimeout(150);
  const confirmModalOpen = await page.evaluate(() => document.getElementById('proto-modal-body').textContent.includes('Confirm reassignment'));
  console.log('execute reassignment opened confirm modal:', confirmModalOpen);
  await page.click('button:has-text("Confirm reassignment")');
  await page.waitForTimeout(200);
  await check('after confirming reassignment (should navigate to advisees)');

  console.log('\nJS ERRORS:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
