/* Independent Person / Student filters and presentation-only department settings. */
(() => {
  const find = selector => document.querySelector(selector);
  const person = find('#aud-person') || find('[data-audit-person] input');
  const student = find('#aud-student') || find('[data-audit-student] input');
  const action = find('#aud-action') || find('[data-audit-action] select');
  const from = find('#aud-from') || find('[data-audit-from] input');
  const to = find('#aud-to') || find('[data-audit-to] input');
  const body = find('#aud-body') || find('#audit-table tbody');
  if (body && person && student) {
    const rows = [...body.querySelectorAll('tr')];
    let empty = find('#aud-empty');
    if (!empty) {
      empty = document.createElement('p'); empty.id = 'aud-empty'; empty.className = 'empty';
      empty.textContent = 'No entries match these filters.';
      body.closest('.table-wrap').after(empty);
    }
    const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
    function run() {
      const p = person.value.trim().toLowerCase(), s = student.value.trim().toLowerCase(); let count = 0;
      for (const row of rows) {
        const cells = row.cells;
        const who = (row.dataset.who || cells[1].textContent).trim().toLowerCase();
        let subject = (row.dataset.student || cells[3].textContent).trim().toLowerCase();
        if (/own record|own profile|student portal/.test(subject)) subject += ' ' + who;
        const kind = row.dataset.action || cells[2].textContent.trim();
        const parts = cells[0].textContent.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
        const date = row.dataset.date || (parts ? `${parts[3]}-${months[parts[2]]}-${parts[1].padStart(2,'0')}` : '');
        row.hidden = !((!p || who.includes(p)) && (!s || subject.includes(s)) &&
          (!action.value || action.value === 'All actions' || action.value === kind) &&
          (!from.value || date >= from.value) && (!to.value || date <= to.value));
        if (!row.hidden) count++;
      }
      const counter = find('#aud-count') || find('#audit-count');
      counter.textContent = counter.id === 'aud-count' ? String(count) : `${count} sample events`;
      empty.hidden = count !== 0;
    }
    [person, student, action, from, to].forEach(el => el.addEventListener('input', run));
    run();
  }

  // SystemAdmin retains its own existing controls; these handlers are for the Head preview.
  if (!find('[data-preview-settings]')) return;
  function feedback(id, text, error = false) {
    const target = document.getElementById(id);
    target.hidden = false; target.className = 'settings-feedback'; target.textContent = text;
    target.style.color = error ? '#9E2E1C' : '#2C6430'; target.setAttribute('role', 'status');
  }
  find('#th-save').addEventListener('click', () => {
    const inputs = ['th-warn','th-prob','th-dism'].map(id => document.getElementById(id));
    const values = inputs.map(el => Number(el.value));
    if (inputs.some(el => !el.value.trim()) || values.some(n => !Number.isInteger(n) || n < 0 || n > 100)) {
      feedback('th-msg', 'Each threshold must be a whole percentage from 0 to 100.', true); return;
    }
    if (!(values[0] < values[1] && values[1] < values[2])) {
      feedback('th-msg', 'Thresholds must rise in order: warning < probation < dismissal.', true); return;
    }
    feedback('th-msg', 'Threshold preview confirmed. No settings have been saved.');
  });
  find('#em-save').addEventListener('click', () => {
    if (!/^[^\s@]+@vsu\.edu\.ph$/i.test(find('#em-from').value.trim())) {
      feedback('em-msg', 'Use a VSU sender address ending in @vsu.edu.ph.', true); return;
    }
    feedback('em-msg', 'Sender preview confirmed. No settings have been saved.');
  });
  find('#bk-record').addEventListener('click', () => {
    let target = find('#backup-preview-status');
    if (!target) {
      target = document.createElement('p'); target.id = 'backup-preview-status';
      target.className = 'settings-feedback'; target.setAttribute('role','status');
      find('#bk-record').parentElement.after(target);
    }
    target.textContent = 'Preview only. No backup has been created or recorded.';
  });
})();
