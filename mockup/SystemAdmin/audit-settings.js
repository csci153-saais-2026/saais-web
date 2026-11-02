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
    // Changes made anywhere in the prototype (SAAIS_AUDIT) appear above the sample entries.
    if (window.SAAIS_AUDIT) {
      const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const tone = { View: 'blue', Change: 'green' };
      body.insertAdjacentHTML('afterbegin', window.SAAIS_AUDIT.entries().map(e => {
        const t = window.SAAIS_AUDIT.stamp(e.ts), subject = e.student ? (e.sid ? e.sid + ' · ' : '') + e.student : '—';
        return `<tr data-saved data-date="${t.iso}" data-who="${esc(e.who.toLowerCase())}" data-action="${esc(e.action)}" data-student="${e.student ? esc(subject.toLowerCase()) : ''}"><td data-label="Timestamp">${t.date}<br><small>${t.time12}</small></td><td data-label="Person">${esc(e.who)}</td><td data-label="Action"><span class="badge ${tone[e.action] || ''}">${esc(e.action)}</span></td><td data-label="Student / record">${esc(subject)}</td><td data-label="Details">${esc(e.details)}</td></tr>`;
      }).join(''));
    }
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
  // System-wide values are saved in this browser (shared with the System Admin Settings page).
  const SKEY = 'saais-settings-v1';
  const WHO = /DeanDH/.test(location.pathname) ? 'Dr. Paz Villanueva' : 'Dr. Andrea Dela Cruz';
  let ST = {}; try { ST = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { ST = window.__saaisSettings || {}; }
  const persist = () => { window.__saaisSettings = ST; try { localStorage.setItem(SKEY, JSON.stringify(ST)); } catch (e) {} };
  const todayText = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const showBackup = () => {
    if (!ST.backup) return;
    const text = find('#bk-text'), banner = find('#bk-banner');
    if (text) text.innerHTML = 'Last backup: <b>' + ST.backup + '</b>. Every closed encoding period is covered.';
    if (banner) { banner.style.background = '#E7F0E2'; banner.style.borderColor = '#CBDDC2'; banner.style.color = '#2C6430'; }
  };
  if (ST.th) ['th-warn', 'th-prob', 'th-dism'].forEach((id, i) => { const el = document.getElementById(id); if (el && ST.th[i] != null) el.value = ST.th[i]; });
  if (ST.email && find('#em-from')) find('#em-from').value = ST.email;
  showBackup();
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
    ST.th = values; persist();
    if (window.SAAIS_AUDIT) window.SAAIS_AUDIT.add(WHO, 'Change', '', 'Changed scholastic standing thresholds to ' + values.join('% / ') + '%');
    feedback('th-msg', 'Saved. Warning from ' + values[0] + '%, probation from ' + values[1] + '%, dismissal from ' + values[2] + '%. Standing is recomputed on the next grade change.');
  });
  find('#em-save').addEventListener('click', () => {
    if (!/^[^\s@]+@vsu\.edu\.ph$/i.test(find('#em-from').value.trim())) {
      feedback('em-msg', 'Use a VSU sender address ending in @vsu.edu.ph.', true); return;
    }
    ST.email = find('#em-from').value.trim(); persist();
    if (window.SAAIS_AUDIT) window.SAAIS_AUDIT.add(WHO, 'Change', '', 'Changed the sender address to ' + ST.email);
    feedback('em-msg', 'Saved. New notifications will be sent from ' + ST.email + '.');
  });
  find('#bk-record').addEventListener('click', () => {
    let target = find('#backup-preview-status');
    if (!target) {
      target = document.createElement('p'); target.id = 'backup-preview-status';
      target.className = 'settings-feedback'; target.setAttribute('role','status');
      find('#bk-record').parentElement.after(target);
    }
    ST.backup = todayText(); persist(); showBackup();
    if (window.SAAIS_AUDIT) window.SAAIS_AUDIT.add(WHO, 'Change', '', 'Recorded a completed backup (' + ST.backup + ')');
    target.textContent = 'Backup recorded for ' + ST.backup + '.';
  });
})();
