// Run with node mockup/_gen/test-confirmed-decisions.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function page(file, setup) {
  const console = new VirtualConsole();
  const errors = [];
  console.on('jsdomError', error => {
    if (error.type !== 'css parsing' && error.message !== 'Not implemented: navigation (except hash changes)') {
      errors.push(`${file}: ${error.message}`);
    }
  });
  const dom = new JSDOM(read(file), {
    url: `http://localhost/mockup/${file}`,
    runScripts: 'outside-only',
    virtualConsole: console
  });
  const w = dom.window;
  w.structuredClone = structuredClone;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  if (setup) setup(w);

  const scripts = [...w.document.querySelectorAll('script')];
  for (const script of [...scripts.filter(s => !s.defer), ...scripts.filter(s => s.defer)]) {
    const ref = script.getAttribute('src');
    const code = ref ? read(path.join(path.dirname(file), ref)) : script.textContent;
    w.eval(code);
  }
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  assert.deepEqual(errors, []);
  return dom;
}

// Archived notes stay visible to the student they concern.
{
  const notes = '<article data-state="active"><strong>Prof. Reyes</strong><span data-date>17 Sept 2026</span><p>Active note for the student.</p></article>' +
    '<article data-state="archived"><strong>Prof. Reyes</strong><span data-date>2 Mar 2026</span><p>Archived note for the student.</p></article>';
  const dom = page('Student/Student.html', w => {
    w.localStorage.setItem('saais-adviser-ui-v1', JSON.stringify({ 'notes-list': notes }));
  });
  const { document } = dom.window;
  document.querySelector('[data-advising-notes]').click();
  const rows = [...document.querySelectorAll('dialog .note-row p')].map(node => node.textContent.trim());
  assert.deepEqual(rows, ['Active note for the student.', 'Archived note for the student.']);
  dom.window.close();
}

// Dean remains an independently selectable role, and the account form keeps multi-select role checkboxes.
{
  const accountMarkup = read('SystemAdmin/AdminAccountsRoles.dc.html');
  assert.match(accountMarkup, /<input type="checkbox" name="acct-role" value="Dean"/);
  assert.ok((accountMarkup.match(/name="acct-role"/g) || []).length > 1);
}

function submitCredit(grade, { units = '3', reason = 'Regression test reason' } = {}) {
  const dom = page('Department Head/OutsideCredits.dc.html');
  const { document, localStorage } = dom.window;
  document.querySelector('[data-dialog="credit"]').click();
  const control = name => {
    const label = [...document.querySelectorAll('#dialog-content label')]
      .find(item => item.querySelector('span')?.textContent.trim() === name);
    assert.ok(label, `Credit dialog has ${name} field`);
    return label.querySelector('input,select,textarea');
  };
  control('Grade').value = grade;
  control('Units').value = units;
  control('Reason for credit').value = reason;
  document.querySelector('#dialog-confirm').click();

  const state = JSON.parse(localStorage.getItem('saais-mgmt-v1') || '{}');
  const audit = JSON.parse(localStorage.getItem('saais-audit-v1') || '[]');
  const message = document.querySelector('#dialog-content [data-action-message]')?.textContent || '';
  const result = { dom, document, state, audit, message };
  return result;
}

for (const grade of ['1.00', '2.75', '3.00']) {
  const result = submitCredit(grade);
  assert.equal(result.state.credits?.length, 1, `grade ${grade} is accepted`);
  assert.equal(result.state.credits[0].grade, grade);
  assert.equal(result.state.credits[0].reason, 'Regression test reason');
  assert.match(result.audit[0].details, /reason: Regression test reason/, 'accepted credit is audited with its reason');
  result.dom.window.close();
}

for (const [grade, description] of [
  ['0.99', 'below 1.00'],
  ['3.01', 'above 3.00'],
  ['1.5', 'malformed decimal'],
  ['abc', 'malformed text']
]) {
  const result = submitCredit(grade);
  assert.equal(result.state.credits?.length || 0, 0, `${description} grade is rejected`);
  assert.equal(result.audit.length, 0, `${description} grade creates no audit entry`);
  assert.match(result.message, /passing grade from 1\.00 to 3\.00/, `${description} grade explains the allowed range`);
  result.dom.window.close();
}

{
  const result = submitCredit('2.00', { units: '0' });
  assert.match(result.message, /positive number/, 'positive-units validation remains');
  assert.equal(result.state.credits?.length || 0, 0);
  result.dom.window.close();
}

{
  const result = submitCredit('2.00', { reason: '' });
  assert.match(result.message, /Give a reason for this credit/, 'reason remains required');
  assert.equal(result.state.credits?.length || 0, 0);
  result.dom.window.close();
}

// Keep the confirmed transfer workflow limited to a curriculum decision, without adviser reassignment.
{
  const actions = read('portal-actions.js');
  const start = actions.indexOf('const decide = (decision, reason) => {');
  const end = actions.indexOf('/* ---------- equivalencies ---------- */', start);
  assert.ok(start >= 0 && end > start, 'curriculum-transfer decision handler exists');
  const decision = actions.slice(start, end);
  assert.match(decision, /S\.transfers\[key\] =/);
  assert.doesNotMatch(decision, /S\.assign|assign\[/, 'approving a transfer does not change the adviser assignment');
}

console.log('Confirmed-decision regressions passed: student notes, Dean/multi-role selection, outside-credit grade bounds and preserved validations, and curriculum-transfer assignment boundaries.');
