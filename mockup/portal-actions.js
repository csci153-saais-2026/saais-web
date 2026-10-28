/* Department Head / Staff / Dean (Head) workflows with saved state.
   Loaded after department-head.js or department-staff.js. Reassignments, terms, transfer decisions,
   equivalencies, outside credits, student imports and provisioned accounts are stored in localStorage
   (saais-mgmt-v1), so they survive reloads and show up in every portal that lists them. */
(() => {
  'use strict';
  const dialog = document.getElementById('preview-dialog');
  if (!dialog) return;
  const KEY = 'saais-mgmt-v1', ADV_KEY = 'saais-adviser-ui-v1';
  let S = {};
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = window.__saaisMgmt || {}; }
  const save = () => { window.__saaisMgmt = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const say = m => { if (typeof toast === 'function') toast(m); };
  const page = document.body.dataset.page;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]} ${MON[+m[2] - 1]} ${m[1]}` : ''; };
  const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  const who = /Department(%20| )Staff/.test(location.pathname) ? 'Rina Cruz' : /DeanDH/.test(location.pathname) ? 'Dr. Paz Villanueva' : 'Dr. Andrea Dela Cruz';
  const audit = (action, student, details, sid) => { if (window.SAAIS_AUDIT) window.SAAIS_AUDIT.add(who, action, student, details, sid); };
  const adviserState = () => { try { return JSON.parse(localStorage.getItem(ADV_KEY)) || {}; } catch (e) { return window.__saaisUI || {}; } };

  /* ---------- dialog helpers ---------- */
  let lastKey = '', lastTrigger = null;
  document.addEventListener('click', e => { const t = e.target.closest('[data-dialog]'); if (t) { lastKey = t.dataset.dialog; lastTrigger = t; } }, true);
  const control = name => {
    const label = $$('#dialog-content label').find(l => (l.querySelector('span') || {}).textContent === name);
    return label ? label.querySelector('input,select,textarea') : null;
  };
  const val = name => { const c = control(name); return c ? c.value.trim() : ''; };
  const stop = e => { e.stopImmediatePropagation(); e.preventDefault(); };
  const tableBy = (...heads) => $$('table').find(t => heads.every(h => [...t.querySelectorAll('thead th')].some(th => th.textContent.trim() === h)));
  const colIndex = (table, ...names) => [...table.querySelectorAll('thead th')].findIndex(th => names.includes(th.textContent.trim()));

  /* ---------- adviser assignments ---------- */
  const applyAssignments = () => {
    const map = S.assign || {};
    $$('table').forEach(table => {
      const adv = colIndex(table, 'Current adviser', 'Adviser'), since = colIndex(table, 'Since'), prev = colIndex(table, 'Previous adviser');
      if (adv < 0) return;
      $$('tbody tr', table).forEach(row => {
        const id = ($('.mono', row) || {}).textContent, a = map[(id || '').trim()];
        if (!a) return;
        row.cells[adv].textContent = a.adviser;
        if (since >= 0) row.cells[since].textContent = a.since;
        if (prev >= 0) row.cells[prev].textContent = a.previous || '—';
      });
    });
  };
  const reassign = () => {
    const rows = $$('.student-check:checked').map(c => c.closest('tr'));
    if (!rows.length) return say('Select at least one student to reassign.');
    const adviser = val('New adviser'), since = fmt(val('Effective since')) || today();
    if (!val('Reason for reassignment')) return say('Add a reason for the reassignment.');
    S.assign = S.assign || {};
    const adv = colIndex(rows[0].closest('table'), 'Current adviser', 'Adviser');
    rows.forEach(row => {
      const id = $('.mono', row).textContent.trim(), current = S.assign[id] ? S.assign[id].adviser : row.cells[adv].textContent.trim();
      audit('Change', $('strong', row).textContent.trim(), `Reassigned from ${current} to ${adviser} (${val('Reason for reassignment')})`, id);
      if (current !== adviser) S.assign[id] = { adviser, since, previous: current };
      else S.assign[id] = Object.assign({}, S.assign[id], { adviser, since });
    });
    save(); applyAssignments();
    $$('.student-check').forEach(c => { c.checked = false; });
    if (typeof updateSelection === 'function') updateSelection();
    dialog.close();
    say(`Reassigned ${rows.length} student${rows.length === 1 ? '' : 's'} to ${adviser}. The previous adviser stays in the history.`);
  };

  /* ---------- academic terms ---------- */
  const termKey = row => `${row.cells[0].textContent.trim()}|${row.cells[1].textContent.trim()}`;
  const termRow = t => `<tr data-new-term><td data-label="Academic year"><strong>${esc(t.year)}</strong></td><td data-label="Semester">${esc(t.sem)}</td><td data-label="Term dates">${esc(t.dates)}</td><td data-label="Encoding deadline">${esc(t.deadline)}</td><td data-label="Status"><span class="badge ${t.status === 'Open' ? 'green' : ''}">${t.status}</span></td><td data-label="Actions">${t.status === 'Open' ? '<button type="button" class="btn " data-dialog="closeTerm">Close encoding</button>' : '<button class="text-btn" type="button" data-dialog="termDetail">View term</button>'}</td></tr>`;
  const closedCells = row => {
    row.cells[4].innerHTML = '<span class="badge ">Closed</span>';
    row.cells[5].innerHTML = '<button class="text-btn" type="button" data-dialog="termDetail">View term</button>';
  };
  const applyTerms = () => {
    const table = tableBy('Academic year', 'Semester'); if (!table) return;
    const body = $('tbody', table);
    (S.newTerms || []).forEach(t => { if (!$$('tr', body).some(r => termKey(r) === `${t.year}|${t.sem}`)) body.insertAdjacentHTML('afterbegin', termRow(t)); });
    $$('tr', body).forEach(r => { if ((S.termsClosed || {})[termKey(r)] && r.cells[4].textContent.trim() === 'Open') closedCells(r); });
    const foot = $('.table-foot span'), rows = $$('tr', body);
    if (foot) foot.textContent = `${rows.filter(r => r.cells[4].textContent.trim() === 'Open').length} open term · ${rows.filter(r => r.cells[4].textContent.trim() === 'Closed').length} closed terms`;
  };
  const closeTerm = () => {
    const row = lastTrigger && lastTrigger.closest('tr'); if (!row) return;
    S.termsClosed = S.termsClosed || {}; S.termsClosed[termKey(row)] = { note: val('Closure note'), date: today() };
    audit('Change', '', `Closed grade encoding for ${row.cells[0].textContent.trim()} · ${row.cells[1].textContent.trim()}`);
    save(); applyTerms(); dialog.close();
    say('Grade encoding closed for this term. A backup reminder was sent to the administrator.');
  };
  const addTerm = () => {
    const year = val('Academic year'), start = val('Start date'), end = val('Actual end date'), deadline = val('Encoding deadline');
    if (!/^\d{4}\s*[–-]\s*\d{4}$/.test(year)) return say('Enter the academic year as 2025–2026.');
    if (!start) return say('Enter the term start date.');
    const sem = val('Semester');
    const table = tableBy('Academic year', 'Semester');
    if ($$('tbody tr', table).some(r => termKey(r) === `${year.replace('-', '–')}|${sem}`)) return say('That term already exists.');
    const status = val('Encoding status');
    (S.newTerms = S.newTerms || []).push({ year: year.replace('-', '–'), sem, dates: `${fmt(start)}${end ? ' – ' + fmt(end) : ''}`, deadline: fmt(deadline) || '—', status });
    audit('Change', '', `Added academic term ${year.replace('-', '–')} · ${sem}`);
    save(); applyTerms(); dialog.close(); say(`Academic term ${year} · ${sem} added.`);
  };

  /* ---------- curriculum transfers ---------- */
  const endorsed = () => (adviserState().endorsed || []).filter(e => e && e.id);
  const bump = (label, delta) => {
    const stat = $$('.stat').find(s => (($('.label', s) || {}).textContent || '').trim() === label);
    if (stat) { const n = $('strong', stat); n.textContent = String(Math.max(0, (parseInt(n.textContent, 10) || 0) + delta)); }
  };
  const applyTransfers = () => {
    if (page !== 'CurriculumTransfers' || typeof transferDetails === 'undefined') return;
    const table = tableBy('Student', 'Current curriculum', 'Requested curriculum'), decided = S.transfers || {};
    const history = new URLSearchParams(location.search).has('history');
    endorsed().forEach(en => {
      transferDetails[en.id] = [en.student, en.sid, en.from, en.to, en.adviser, en.date, en.reason];
      if (!history && table && !$('tbody tr[data-endorsed="' + en.id + '"]', table) && !decided[en.id]) {
        $('tbody', table).insertAdjacentHTML('afterbegin', `<tr data-endorsed="${en.id}"><td data-label="Student"><strong>${esc(en.student)}</strong><small class="mono">${esc(en.sid)}</small></td><td data-label="Current curriculum">${esc(en.from)}</td><td data-label="Requested curriculum">${esc(en.to)}</td><td data-label="Adviser">${esc(en.adviser)}</td><td data-label="Submitted">${esc(en.date)}</td><td data-label="Actions"><button class="text-btn" type="button" data-dialog="${en.id}">Review request →</button></td></tr>`);
      }
    });
    let pending = 0, approved = 0, rejected = 0;
    if (!history && table) {
      $$('tbody tr', table).forEach(row => {
        const b = $('[data-dialog]', row), d = b && decided[b.dataset.dialog];
        if (d) row.remove();
      });
      pending = $$('tbody tr', table).length;
      const foot = $('.table-foot span'); if (foot) foot.textContent = `${pending} request${pending === 1 ? '' : 's'} awaiting a decision`;
    }
    Object.values(decided).forEach(d => { if (d.decision === 'approved') approved++; else rejected++; });
    const set = (label, n) => { const stat = $$('.stat').find(s => (($('.label', s) || {}).textContent || '').trim() === label); if (stat) $('strong', stat).textContent = String(n); };
    if (!history && table) set('Pending review', pending);
    const base = { approved: 12, rejected: 2 };
    set('Approved this semester', base.approved + approved); set('Rejected this semester', base.rejected + rejected);
    $$('.tabs a').forEach(a => {
      if (/Pending review/.test(a.textContent) && !history && table) a.textContent = `Pending review (${pending})`;
      if (/Decision history/.test(a.textContent)) a.textContent = `Decision history (${14 + approved + rejected})`;
    });
    if (history) {
      const tbody = $('.table-wrap tbody');
      if (tbody) Object.values(decided).reverse().forEach(d => {
        if (!$('tr[data-decision="' + d.id + '"]', tbody)) tbody.insertAdjacentHTML('afterbegin', `<tr data-decision="${d.id}"><td>${esc(d.student)} · ${esc(d.sid)}</td><td>${esc(d.from)} → ${esc(d.to)}</td><td>${esc(d.adviser)}</td><td>${d.decision === 'approved' ? 'Approved' : 'Rejected'} · ${esc(d.date)}</td><td>${esc(d.reason || '—')}</td></tr>`);
      });
      const foot = $('.panel .table-foot span'); if (foot) foot.textContent = `${$$('tbody tr', $('.table-wrap')).length} sample decisions of ${14 + approved + rejected}`;
    }
  };
  const decide = (decision, reason) => {
    const key = lastKey, d = typeof transferDetails !== 'undefined' && transferDetails[key]; if (!d) return false;
    S.transfers = S.transfers || {};
    S.transfers[key] = { id: key, decision, reason, date: today(), student: d[0], sid: d[1], from: d[2], to: d[3], adviser: d[4] };
    audit('Change', d[0], `${decision === 'approved' ? 'Approved' : 'Rejected'} curriculum transfer ${d[2]} → ${d[3]}${reason ? ' (' + reason + ')' : ''}`, d[1]);
    save(); applyTransfers(); dialog.close();
    say(decision === 'approved' ? `Transfer approved for ${d[0]}. The student moves to ${d[3]}.` : `Transfer rejected for ${d[0]}. The adviser can see your reason.`);
    return true;
  };

  /* ---------- equivalencies ---------- */
  const splitSubject = s => { const p = s.split('·').map(x => x.trim()); return { code: p[0], title: p[1] || '', units: (p[2] || '').replace(/\D+/g, '') || '3' }; };
  const eqRow = e => `<tr data-new-eq><td data-label="Old course subject"><strong class="mono">${esc(e.a.code)}</strong><small>${esc(e.a.title)}</small></td><td data-label="Units">${esc(e.a.units)}</td><td data-label="Equivalent course subject"><strong class="mono">${esc(e.b.code)}</strong><small>${esc(e.b.title)}</small></td><td data-label="Units">${esc(e.b.units)}</td><td data-label="Curriculum pair">${esc(e.pair)}</td><td data-label="Actions"><span class="badge green">Equivalent</span></td></tr>`;
  const applyEquivalence = () => {
    const table = $('#equivalence-table table') || tableBy('Old course subject'); if (!table) return;
    const body = $('tbody', table);
    (S.equiv || []).forEach(e => { if (!$$('tr', body).some(r => r.dataset.newEq !== undefined && r.cells[0].textContent.includes(e.a.code) && r.cells[2].textContent.includes(e.b.code) && r.cells[4].textContent === e.pair)) body.insertAdjacentHTML('beforeend', eqRow(e)); });
    const foot = $('.table-foot span'); if (foot) foot.textContent = `${$$('tr', body).length} course equivalencies`;
  };
  const addEquivalence = () => {
    const a = splitSubject(val('Old course subject')), b = splitSubject(val('Equivalent course subject'));
    const pair = `${val('From curriculum')} → ${val('To curriculum').replace(/^[A-Z]+ /, '')}`;
    const table = $('#equivalence-table table') || tableBy('Old course subject');
    if ($$('tbody tr', table).some(r => r.cells[0].textContent.includes(a.code) && r.cells[4].textContent === pair)) return say('That course already has an equivalency for this curriculum pair.');
    audit('Change', '', `Added course equivalency ${a.code} ≡ ${b.code} (${pair})`);
    (S.equiv = S.equiv || []).push({ a, b, pair }); save(); applyEquivalence(); dialog.close();
    say(`Equivalency added: ${a.code} ≡ ${b.code} (${pair}).`);
  };

  /* ---------- outside credits ---------- */
  const creditRow = c => `<tr data-new-credit><td data-label="Student"><strong>${esc(c.name)}</strong><small class="mono">${esc(c.sid)}</small></td><td data-label="Original course / units"><strong>${esc(c.code)} · ${esc(c.title)}</strong><small>${esc(c.units)} units</small></td><td data-label="School / origin">${esc(c.school)}</td><td data-label="Grade">${esc(c.grade)}</td><td data-label="Equivalent subject / units"><strong>${esc(c.eq.code)} · ${esc(c.eq.title)}</strong><small>${esc(c.eq.units)} units · BSCS 2024</small></td><td data-label="Actions"><span class="badge blue">${esc(c.type)}</span></td></tr>`;
  const applyCredits = () => {
    const table = tableBy('Student', 'Original course / units'); if (!table) return;
    const body = $('tbody', table), list = S.credits || [];
    list.forEach(c => { if (!$$('tr[data-new-credit]', body).some(r => r.dataset.cid === c.cid)) { body.insertAdjacentHTML('afterbegin', creditRow(c)); body.firstElementChild.dataset.cid = c.cid; } });
    const units = list.reduce((n, c) => n + (+c.units || 0), 0);
    const set = (label, n) => { const stat = $$('.stat').find(s => (($('.label', s) || {}).textContent || '').trim() === label); if (stat) $('strong', stat).textContent = String(n); };
    set('Credited subjects', 28 + list.length); set('Units recognized', 84 + units);
    const foot = $('.table-foot span'); if (foot) foot.textContent = `Showing ${$$('tr', body).length} sample records of ${28 + list.length} credited subjects`;
  };
  const addCredit = () => {
    const stu = val('Student').split('·').map(x => x.trim()), code = val('Original course code'), title = val('Original course name'), units = val('Units'), grade = val('Grade');
    if (!code || !title) return say('Enter the original course code and name.');
    if (!/^\d+(\.\d+)?$/.test(units) || +units <= 0) return say('Units must be a positive number.');
    if (!/^[1-5]\.\d{2}$/.test(grade)) return say('Enter the grade on the VSU scale, for example 1.50.');
    (S.credits = S.credits || []).push({ cid: 'c' + Date.now(), name: stu[0], sid: stu[1], code, title, units, grade, school: val('School / degree of origin'), eq: splitSubject(val('Equivalent course subject')), type: val('Entry type') });
    audit('Change', stu[0], `Credited outside course ${code} · ${title} (grade ${grade}) from ${val('School / degree of origin')}`, stu[1]);
    save(); applyCredits(); dialog.close(); say(`Outside credit recorded for ${stu[0]}: ${code} credited once.`);
  };

  /* ---------- student import (CSV) ---------- */
  const CURRICULA = ['BSCS 2024', 'BSCS 2021', 'BSIT 2024'], ID_RE = /^\d{2}-\d-\d{5}$/;
  const yearStanding = id => { const n = 2025 - (2000 + +id.slice(0, 2)) + 1; return n < 1 ? '1st year' : n > 4 ? '4th year' : ['1st', '2nd', '3rd', '4th'][n - 1] + ' year'; };
  const studentRow = s => `<tr data-imported><td data-label="Student"><strong>${esc(s.name)}</strong><small class="mono">${esc(s.id)}</small></td><td data-label="School email">${esc(s.email)}</td><td data-label="Curriculum"><span class="badge ">${esc(s.curriculum)}</span></td><td data-label="Year standing">${yearStanding(s.id)}</td><td data-label="Adviser">${esc(s.adviser)}</td></tr>`;
  const applyStudents = () => {
    const table = $('#student-table table') || tableBy('Student', 'School email'); if (!table) return;
    const body = $('tbody', table), have = new Set($$('.mono', body).map(m => m.textContent.trim()));
    (S.students || []).forEach(s => { if (!have.has(s.id)) { body.insertAdjacentHTML('beforeend', studentRow(s)); have.add(s.id); } });
    if (typeof filterStudents === 'function') filterStudents();
    const enrolled = $$('p, span, div').find(el => el.children.length === 0 && /enrolled students/.test(el.textContent) && /^\s*\d/.test(el.textContent));
    if (enrolled) enrolled.textContent = enrolled.textContent.replace(/^\s*[\d,]+/, m => (612 + (S.students || []).length).toLocaleString('en-US'));
  };
  const parseCsv = text => {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell.trim()); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); cell = ''; if (row.some(Boolean)) rows.push(row); row = []; }
      else cell += c;
    }
    row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
    return rows;
  };
  let parsedImport = null;
  const validateImport = text => {
    const rows = parseCsv(text); if (!rows.length) return null;
    const head = rows[0].map(h => h.toLowerCase()), hasHead = head.some(h => /name|id|email/.test(h));
    const idx = (re, fallback) => { const i = head.findIndex(h => re.test(h)); return hasHead && i >= 0 ? i : fallback; };
    const col = { name: idx(/name/, 0), id: idx(/\bid\b|student id|number/, 1), email: idx(/email/, 2), curriculum: idx(/curricul/, 3), adviser: idx(/advis/, 4) };
    const have = new Set([...$$('#student-table .mono, table .mono')].map(m => m.textContent.trim()).concat((S.students || []).map(s => s.id)));
    const good = [], out = [];
    rows.slice(hasHead ? 1 : 0).forEach((r, i) => {
      const s = { name: r[col.name] || '', id: r[col.id] || '', email: r[col.email] || '', curriculum: r[col.curriculum] || '', adviser: r[col.adviser] || '' };
      const n = i + (hasHead ? 2 : 1);
      let problem = '';
      if (!s.name || !s.id || !s.email || !s.curriculum || !s.adviser) problem = 'Missing a required column';
      else if (!ID_RE.test(s.id)) problem = 'Invalid ID, expected YY-N-NNNNN';
      else if (have.has(s.id)) problem = 'Duplicate student ID';
      else if (!/^[^\s@]+@[^\s@]+$/.test(s.email)) problem = 'Invalid school email';
      else if (!CURRICULA.includes(s.curriculum)) problem = 'Unknown curriculum';
      if (!problem) { good.push(s); have.add(s.id); }
      out.push([n, s.id || '—', problem || 'Ready to import']);
    });
    return { good, out };
  };
  const importPreview = () => {
    const box = $('#dialog-content');
    const file = $('input[type="file"]', box);
    if (!file || file.dataset.wired) return;
    file.dataset.wired = '1';
    const h3 = $$('h3', box).find(h => /Validation preview/.test(h.textContent)), holder = h3 && h3.parentElement;
    if (holder) holder.innerHTML = '<h3>Validation preview</h3><p class="field-help" data-import-state>Choose a CSV file to see which rows are ready to import.</p>';
    const cap = $('.caption', box); if (cap) cap.textContent = 'XLSX and XLS cannot be read in this prototype. Save the sheet as CSV (columns: name, student ID, email, curriculum, adviser).';
    $('#dialog-confirm').textContent = 'Import valid rows';
    file.addEventListener('change', () => {
      const f = file.files[0], state = $('[data-import-state]', box); parsedImport = null;
      if (!f) return;
      if (!/\.csv$/i.test(f.name)) { state.textContent = 'That file type cannot be read here. Save it as CSV and try again.'; return; }
      const rd = new FileReader();
      rd.onload = () => {
        const res = validateImport(String(rd.result));
        if (!res) { state.textContent = 'The file is empty.'; return; }
        parsedImport = res;
        const table = `<div class="table-wrap"><table><thead><tr><th scope="col">Row</th><th scope="col">Student ID</th><th scope="col">Result</th></tr></thead><tbody>${res.out.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>`;
        holder.innerHTML = `<h3>Validation preview</h3><p class="field-help" data-import-state>${res.good.length} ready, ${res.out.length - res.good.length} rejected. Nothing is saved until you import.</p>` + table;
      };
      rd.readAsText(f);
    });
  };
  const importStudents = () => {
    if (!parsedImport || !parsedImport.good.length) return say('Choose a CSV file with at least one valid row first.');
    S.students = (S.students || []).concat(parsedImport.good); save();
    audit('Change', '', `Imported ${parsedImport.good.length} student record${parsedImport.good.length === 1 ? '' : 's'} from a spreadsheet`);
    const n = parsedImport.good.length, bad = parsedImport.out.length - n;
    parsedImport = null; applyStudents(); dialog.close();
    say(`Imported ${n} student${n === 1 ? '' : 's'}${bad ? `; ${bad} row${bad === 1 ? '' : 's'} rejected` : ''}.`);
  };

  /* ---------- provisioned accounts (Staff) ---------- */
  const ROLE_CLASS = { 'Department Head': 'amber', Adviser: 'green', 'Department staff': 'blue' };
  const acctRow = a => `<tr data-new-account><td data-label="Name"><div class="account-person"><span class="account-avatar">${esc(a.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span><strong>${esc(a.name)}</strong></div></td><td data-label="VSU email"><span class="mono">${esc(a.email)}</span></td><td data-label="Roles"><div class="account-roles">${a.roles.map(r => `<span class="badge ${ROLE_CLASS[r] || ''}">${esc(r)}</span>`).join('')}</div></td></tr>`;
  const ACC_KEY = 'saais-accounts-v1';
  const accLoad = () => { try { return JSON.parse(localStorage.getItem(ACC_KEY)) || []; } catch (e) { return window.__saaisAcc || []; } };
  const accSave = list => { window.__saaisAcc = list; try { localStorage.setItem(ACC_KEY, JSON.stringify(list)); } catch (e) {} };
  const TONES = { 'Department Head': 'amber', Adviser: 'green', 'Department staff': 'blue' };
  const applyAccounts = () => {
    const table = tableBy('Name', 'VSU email', 'Roles'); if (!table) return;
    const body = $('tbody', table), have = new Set($$('.mono', body).map(m => m.textContent.trim().toLowerCase()));
    accLoad().forEach(a => { if (!have.has(a.email.toLowerCase())) body.insertAdjacentHTML('beforeend', acctRow({ name: a.name, email: a.email, roles: a.roles.map(r => r.value || r) })); });
  };
  const provision = () => {
    const name = ($('input[type="text"]', dialog) || {}).value || '', email = (($('input[type="email"]', dialog) || {}).value || '').trim(), err = $('.account-error', dialog);
    const roles = $$('input[name="account-role"]:checked', dialog).map(i => (i.closest('label').textContent || i.value).trim());
    let message = '';
    const table = tableBy('Name', 'VSU email', 'Roles');
    if (!name.trim()) message = 'Enter the account holder’s full name.';
    else if (!/^[^\s@]+@vsu\.edu\.ph$/i.test(email)) message = 'Use a VSU email address ending in @vsu.edu.ph.';
    else if (!roles.length) message = 'Select at least one role.';
    else if (table && $$('.mono', table).some(m => m.textContent.trim().toLowerCase() === email.toLowerCase()) ) message = 'An account with that email already exists.';
    if (err) { err.textContent = message; err.hidden = !message; }
    if (message) return;
    audit('Change', '', `Provisioned account ${email} (${roles.join(', ')})`);
    accSave(accLoad().concat([{ name: name.trim(), email, fac: 'Faculty of Computer Studies', dep: 'Computer Science', prog: '', roles: roles.map(r => ({ value: r, tone: TONES[r] || 'neutral' })) }])); applyAccounts(); dialog.close();
    say(`Account provisioned for ${name.trim()}. They sign in with Google using ${email}.`);
  };

  /* ---------- wiring ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('#dialog-confirm')) {
      const key = lastKey, handlers = { reassign, closeTerm, addTerm, equivalence: addEquivalence, credit: addCredit, import: importStudents, provision };
      if (handlers[key]) { stop(e); handlers[key](); return; }
      if (typeof transferDetails !== 'undefined' && transferDetails[key]) { stop(e); decide('approved', ($('textarea', dialog) || {}).value ? $('textarea', dialog).value.trim() : ''); return; }
    }
    const rej = e.target.closest('[data-reject]');
    if (rej) {
      stop(e);
      const reason = ($('textarea', dialog) || {}).value ? $('textarea', dialog).value.trim() : '';
      if (!reason) return say('Add a decision reason before rejecting.');
      decide('rejected', reason);
    }
  }, true);
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-dialog]');
    if (t && t.dataset.dialog === 'import') importPreview();
  });

  applyAssignments(); applyTerms(); applyTransfers(); applyEquivalence(); applyCredits(); applyStudents(); applyAccounts();
})();
