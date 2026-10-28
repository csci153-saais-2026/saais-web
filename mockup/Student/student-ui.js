/* Student portal behaviour shared by Student.html and the Student*.html pages:
   advising-notes modal, collapsible checklist tables, grade flagging, compact checklist download. */
(function () {
  if (window.__studentUi) return;
  window.__studentUi = true;

  var ADVISER = 'Prof. Ramon Reyes';
  var NOTES = [
    { date: '17 Sep 2026', text: 'Discussed a manageable course load. Review the CSci 102 (Discrete Structures I) completion requirements before the October deadline.' },
    { date: '14 Aug 2026', text: 'Reviewed the CS Elective 1 mapping and explained how it appears in the curriculum checklist.' }
  ];
  var REASONS = ['Incorrect grade', 'Missing grade', 'Wrong course credited', 'Other'];
  /* Flags persist in localStorage so advisers see them and the student sees the outcome. */
  var FLAG_KEY = 'saais-grade-flags';
  function loadFlags() { try { return JSON.parse(localStorage.getItem(FLAG_KEY)) || []; } catch (e) { return window.__suFlags || []; } }
  function saveFlags() { window.__suFlags = FLAGS; try { localStorage.setItem(FLAG_KEY, JSON.stringify(FLAGS)); } catch (e) {} }
  var FLAGS = loadFlags();

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

  var css = [
    '.su-chev{display:inline-flex;align-items:center;color:#8C8A76;transition:transform .15s;flex-shrink:0}',
    '.su-collapsible>.panel-head{cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;gap:12px}',
    '.su-collapsible>.panel-head:hover{background:#F6F1E0}',
    '.su-collapsible.collapsed>.table-scroll{display:none}',
    '.su-collapsible.collapsed>.panel-head{border-bottom:0}',
    '.su-collapsible.collapsed .su-chev{transform:rotate(-90deg)}',
    '.su-flagcol{width:1%;white-space:nowrap}',
    '.su-headend{display:flex;align-items:center;gap:18px;margin-left:auto}',
    '.su-sgwa{display:flex;flex-direction:column;align-items:flex-end;line-height:1.2}',
    '.su-sgwa small{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8C8A76}',
    '.su-sgwa b{font:700 18px \"Syne\",sans-serif;color:#2F4A12}',
    '.app .data th.su-flagcol,.app .data td.su-flagcol{padding-right:56px}',
    '@media(max-width:900px){.app .data th.su-flagcol,.app .data td.su-flagcol{padding-right:0}}',
    '.app .data button.su-flagged{background:#FBF0D6;border-color:#EBDCAE;color:#8A6206}',
    '.su-fixes{margin:8px 0 0;padding-left:18px;color:#6E6C58;font-size:13.5px;display:grid;gap:6px}',
    '.dialog-content h3{font-size:15.5px;margin:20px 0 6px}',
    '.dialog-content>p{margin:0 0 10px}',
    '.su-list .note-row:last-child{border-bottom:0}',
    '.su-toggle-row{display:flex;justify-content:flex-end;margin-bottom:12px}',
    '.side #me-menu a:hover{background:#EFEADB}',
    '.side #me-btn:hover{background:rgba(224,168,46,0.10) !important}',
    '.su-photo{display:flex;align-items:center;gap:20px}',
    '.su-photo-av{width:96px;height:96px;border-radius:50%;background:#E0A82E;color:#3A2A05;display:flex;align-items:center;justify-content:center;font:700 32px "Syne",sans-serif;flex-shrink:0;background-size:cover;background-position:center}',
    '.su-photo-btns{display:flex;gap:10px;flex-wrap:wrap}',
    '.su-pad{padding:6px 24px 20px}',
    '.su-pwgrid{display:grid;grid-template-columns:minmax(0,560px) minmax(0,360px);gap:18px;align-items:start}',
    '@media(max-width:1100px){.su-pwgrid{grid-template-columns:minmax(0,1fr)}}',
    '.su-pw{position:relative;display:block;margin-top:6px}',
    '.su-pw input{width:100%;padding-right:44px}',
    '.app button.su-eye{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:34px;height:34px;padding:0;border:0;background:transparent;color:#8C8A76;border-radius:4px}',
    '.app button.su-eye:hover{background:transparent;border:0;color:#16200C}',
    '.su-hr{border:0;border-top:1px solid #EFEADB;margin:20px 0}',
    '.su-stack{display:grid;gap:18px}',
    '.su-rules{list-style:none;margin:18px 0 0;padding:14px 16px;background:#FBF8EF;border:1px solid #EFEADB;border-radius:5px;display:grid;gap:8px}',
    '.su-rules li{display:flex;align-items:center;gap:9px;font-size:13px;color:#6E6C58}',
    '.su-rules [data-mark]{width:18px;height:18px;border-radius:50%;border:1.5px solid #E1DBC6;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}',
    '.su-actions{display:flex;gap:10px;margin-top:20px}',
    '.su-side{display:grid;gap:14px}',
    '.su-note{display:flex;align-items:flex-start;gap:11px;border-radius:5px;padding:13px 16px;font-size:13.5px;line-height:1.5}',
    '.su-gold{background:#FCF4E0;border:1px solid #EBDCAE;color:#7A5406}',
    '.su-green{background:#E7F0E2;border:1px solid #CBDDC2;color:#2C6430}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- dialog (reuses the app's .dialog look) ---------- */
  var dlg;
  function showDialog(title, body) {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'dialog';
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }
    dlg.innerHTML = '<header class="dialog-head"><h2>' + esc(title) + '</h2><button type="button" data-su-close>Close</button></header><div class="dialog-content">' + body + '</div>';
    dlg.setAttribute('aria-label', title);
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- advising notes ---------- */
  function openNotes() {
    var rows = NOTES.map(function (n) {
      return '<div class="note-row"><p>' + esc(n.text) + '</p><div class="note-meta"><strong>' + esc(ADVISER) + '</strong> · ' + esc(n.date) + '</div></div>';
    }).join('');
    showDialog('Advising notes', '<div class="su-list">' + rows + '</div>');
  }

  /* ---------- grade flags ---------- */
  var current = null;
  function rowInfo(btn) { return { code: btn.dataset.code, title: btn.dataset.title, grade: btn.dataset.grade }; }
  function isOpen(code) { return FLAGS.some(function (f) { return f.code === code && f.status === 'open'; }); }

  function openFlagForm(btn) {
    current = rowInfo(btn);
    var body = '<form data-su-flagform><div class="form-grid">' +
      '<label class="field">Course<input type="text" value="' + esc(current.code + ' · ' + current.title) + '" disabled></label>' +
      '<label class="field">Recorded grade<input type="text" value="' + esc(current.grade) + '" disabled></label>' +
      '<label class="field wide">Reason<select name="reason">' + REASONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></label>' +
      '<label class="field wide">Details<textarea name="details" required></textarea></label></div>' +
      '<div class="form-footer"><button type="button" data-su-close>Cancel</button><button type="submit" class="primary">Submit flag</button></div></form>';
    showDialog('Flag a grade', body);
  }

  function flagBadge(f) {
    return f.status === 'fixed' ? '<span class="badge passed">Corrected</span>' : f.status === 'rejected' ? '<span class="badge failed">Rejected</span>' : '<span class="badge inc">Under review</span>';
  }
  function outcome(f) {
    if (f.status === 'fixed') return '<p><strong>Adviser:</strong> grade corrected to ' + esc(f.newGrade) + (f.response ? ' · ' + esc(f.response) : '') + '</p>';
    if (f.status === 'rejected') return '<p><strong>Adviser:</strong> ' + esc(f.response || 'The recorded grade stands.') + '</p>';
    return '';
  }

  function openFlagList() {
    FLAGS = loadFlags();
    var body = FLAGS.length ? '<div class="su-list">' + FLAGS.map(function (f) {
      return '<div class="activity-row"><div><strong>' + esc(f.code) + ' · ' + esc(f.title) + '</strong><p>' + esc(f.reason) + ' · recorded grade ' + esc(f.grade) + '</p><p>' + esc(f.details) + '</p><p>Filed ' + esc(f.filed) + '</p>' + outcome(f) + '</div>' + flagBadge(f) + '</div>';
    }).join('') + '</div>' : '<div class="empty">No grade flags yet.</div>';
    showDialog('Grade flags', body);
  }

  function markFlagged() {
    FLAGS = loadFlags();
    document.querySelectorAll('[data-flag]').forEach(function (b) {
      var on = isOpen(b.dataset.code);
      b.classList.toggle('su-flagged', on);
      b.textContent = on ? 'Flagged' : 'Flag Grade';
    });
  }

  /* ---------- course info ---------- */
  var BADGE = { Passed: 'passed', INC: 'inc', Enrolled: 'currently_enrolled', Failed: 'failed' };
  function openCourseInfo(btn) {
    var i = JSON.parse(btn.dataset.info), st = i.status[0];
    var attempts = i.rows.length
      ? '<div class="table-scroll"><table class="data"><thead><tr>' + ['Term', 'Midterm', 'Final', 'Completion', 'Instructor'].map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        i.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="empty">No attempts recorded yet.</div>';
    var fixes = i.fixes.length ? '<ul class="su-fixes">' + i.fixes.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' : '<p>No grade fixes recorded.</p>';
    showDialog(i.title, '<p>' + esc(i.meta) + '</p><p>Status: <span class="badge ' + (BADGE[st] || 'na') + '">' + esc(st) + '</span></p>' + attempts + '<h3>Grade fix history</h3>' + fixes);
  }

  /* ---------- checklist: collapsible panels + status filter ---------- */
  var chevron = '<span class="su-chev" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>';
  function semGwa(sec) {
    var pts = 0, units = 0, passed = 0, total = 0;
    function n(x) { return String(+x.toFixed(2)); }
    sec.querySelectorAll('tbody tr').forEach(function (tr) {
      var c = tr.children, ru = c[1] && c[1].textContent.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      if (ru) { total += +ru[2]; if (c[2] && c[2].textContent.trim() === 'Passed') passed += +ru[2]; }
      var g = (c[3] && c[3].textContent.match(/grade\s+(\d+(?:\.\d+)?)/)) || null, u = c[1] && c[1].textContent.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      if (!g || !u) return;
      pts += +g[1] * +u[2]; units += +u[2];
    });
    return '<div class="su-sgwa"><small>Passed units</small><b>' + n(passed) + '/' + n(total) + '</b></div><div class="su-sgwa"><small>Total units</small><b>' + n(total) + '</b></div><div class="su-sgwa"><small>Semester GWA</small><b>' + (units ? (pts / units).toFixed(2) : '—') + '</b></div>';
  }
  function initCollapsible() {
    document.querySelectorAll('main section.panel').forEach(function (s) {
      var head = s.children[0], body = s.children[1];
      if (!head || !body || !body.classList.contains('table-scroll') || !body.querySelector('[data-flag], td') || s.classList.contains('su-collapsible')) return;
      if (!s.closest('[data-pg="checklist"], [data-pg="grades"], [data-su-collapse]')) return;
      s.classList.add('su-collapsible');
      head.insertAdjacentHTML('beforeend', '<div class="su-headend">' + (s.querySelector('td[data-label="Requirement"]') ? semGwa(s) : '') + chevron + '</div>');
      head.setAttribute('aria-expanded', 'true');
    });
  }
  function applyFilter(sel) {
    var v = sel.value, scope = sel.closest('main');
    scope.querySelectorAll('section.su-collapsible').forEach(function (s) {
      var any = false;
      s.querySelectorAll('tbody tr').forEach(function (tr) {
        var b = tr.querySelector('.badge'), c = b ? b.className.replace('badge', '').trim() : '';
        var show = v === 'all' || (v === 'open' && c === 'na') || (v === 'passed' && c === 'passed') || c === v;
        tr.hidden = !show; if (show) any = true;
      });
      s.hidden = !any;
    });
  }

  /* ---------- compact checklist download ---------- */
  function downloadChecklist(main) {
    var secs = [].slice.call(main.querySelectorAll('section.su-collapsible'));
    var earned = 0, req = 0;
    var blocks = secs.map(function (s) {
      var rows = [].slice.call(s.querySelectorAll('tbody tr')).map(function (tr) {
        var c = tr.children, u = c[1].textContent.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/) || [0, 0, 0];
        earned += +u[1]; req += +u[2];
        var b = c[2].textContent.trim(), g = (c[3].textContent.match(/grade\s+([\d.]+)/) || [])[1] || '';
        var ab = { 'Passed': 'P', 'Enrolled': 'E', 'INC': 'INC', 'Failed': 'F', 'Not taken': '' }[b];
        return '<tr><td class="c">' + esc(c[0].querySelector('strong').textContent) + '</td><td>' + esc(c[0].querySelector('.course-title').textContent) + '</td><td class="n">' + esc(u[2]) + '</td><td class="n">' + esc(g) + '</td><td class="s s' + esc(ab || '') + '">' + esc(ab === undefined ? b : ab) + '</td></tr>';
      }).join('');
      return '<div class="blk"><div class="bh"><b>' + esc(s.querySelector('h2').textContent.trim()) + '</b></div><table>' + rows + '</table></div>';
    }).join('');
    var nm = document.querySelector('.user-name b'), id = document.querySelector('.user-name small');
    var doc = '<!doctype html><html><head><meta charset="utf-8"><title>Curriculum checklist</title><style>' +
      '@page{size:A4;margin:10mm}body{font:8.5pt/1.25 "Segoe UI",Arial,sans-serif;color:#111;margin:0}' +
      'h1{font-size:13pt;margin:0}.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5pt solid #2F4A12;padding-bottom:4pt;margin-bottom:6pt}' +
      '.meta{font-size:8pt;color:#333;text-align:right}.cols{columns:2;column-gap:10pt}' +
      '.blk{break-inside:avoid;margin-bottom:6pt}.bh{background:#E8EEDD;padding:1.5pt 4pt;font-size:8pt}' +
      'table{width:100%;border-collapse:collapse}td{padding:1pt 4pt;border-bottom:.4pt solid #ccc;vertical-align:top}' +
      '.c{white-space:nowrap;font-weight:600;font-size:7.5pt;width:16%}.n{text-align:right;white-space:nowrap;width:8%}.s{text-align:center;width:8%;font-weight:700}' +
      '.sF{color:#9E2E1C}.sINC{color:#8A6206}.sP{color:#2C6430}.sE{color:#2A4C6B}.foot{font-size:7pt;color:#555;margin-top:4pt}</style></head><body>' +
      '<div class="top"><div><h1>Curriculum checklist &middot; BS Computer Science</h1><div style="font-size:8pt">' + esc(nm ? nm.textContent : '') + ' &middot; ' + esc(id ? id.textContent : '') + ' &middot; Curriculum 2023&ndash;2024</div></div>' +
      '<div class="meta">' + earned + ' of ' + req + ' units earned<br>Generated ' + today() + '</div></div>' +
      '<div class="cols">' + blocks + '</div>' +
      '<div class="foot">P passed &middot; E enrolled &middot; INC incomplete &middot; F failed &middot; blank = not yet taken. Columns: code, title, units, grade, status.</div></body></html>';
    var fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    fr.onload = function () { fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(function () { fr.remove(); }, 2000); };
    fr.srcdoc = doc;
  }

  /* ---------- profile menu (same pattern as Adviser / SystemAdmin) ---------- */
  function setMenu(on) {
    var m = document.getElementById('me-menu'); if (!m) return;
    m.hidden = !on; document.getElementById('me-btn').setAttribute('aria-expanded', on);
    document.getElementById('me-chev').style.transform = on ? 'rotate(180deg)' : '';
  }

  /* ---------- collapse all / expand all ---------- */
  function panels(main) { return [].slice.call(main.querySelectorAll('section.su-collapsible')).filter(function (s) { return !s.hidden; }); }
  function syncToggle(main) {
    var b = main && main.querySelector('[data-su-toggleall]'); if (!b) return;
    var ps = panels(main), allClosed = ps.length && ps.every(function (s) { return s.classList.contains('collapsed'); });
    b.textContent = allClosed ? 'Expand all' : 'Collapse all';
  }
  function toggleAll(main) {
    var ps = panels(main), close = !ps.every(function (s) { return s.classList.contains('collapsed'); });
    ps.forEach(function (s) { s.classList.toggle('collapsed', close); s.children[0].setAttribute('aria-expanded', String(!close)); });
    syncToggle(main);
  }
  function addToggleButtons() {
    document.querySelectorAll('main').forEach(function (main) {
      if (main.querySelector('[data-su-toggleall]') || !main.querySelector('section.su-collapsible')) return;
      var html = '<button type="button" data-su-toggleall>Collapse all</button>', bar = main.querySelector('.toolbar');
      if (bar) bar.insertAdjacentHTML('beforeend', '<div class="toolbar-actions">' + html + '</div>');
      else main.querySelector('section.su-collapsible').parentElement.insertAdjacentHTML('afterbegin', '<div class="su-toggle-row">' + html + '</div>');
    });
  }

  /* ---------- profile photo ---------- */
  var PHOTO_KEY = 'saais-student-photo';
  function getPhoto() { try { return localStorage.getItem(PHOTO_KEY); } catch (e) { return window.__suPhoto || null; } }
  function setPhoto(v) { window.__suPhoto = v; try { if (v) localStorage.setItem(PHOTO_KEY, v); else localStorage.removeItem(PHOTO_KEY); } catch (e) {} }
  function applyPhoto() {
    var p = getPhoto(), els = [].slice.call(document.querySelectorAll('[data-avatar-lg]'));
    var side = document.querySelector('#me-btn > div:first-child'); if (side) els.push(side);
    els.forEach(function (el) {
      if (!el.dataset.ini) el.dataset.ini = el.textContent.trim();
      el.style.backgroundImage = p ? 'url("' + p + '")' : '';
      el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center';
      el.textContent = p ? '' : el.dataset.ini;
    });
    document.querySelectorAll('[data-photo-remove]').forEach(function (b) { b.hidden = !p; });
  }
  function photoMsg(t, bad) {
    document.querySelectorAll('[data-photo-msg]').forEach(function (m) { m.textContent = t; m.style.color = bad ? '#9E2E1C' : ''; });
  }
  function handlePhoto(input) {
    var f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) return photoMsg('Choose a JPG or PNG image.', true);
    if (f.size > 2 * 1024 * 1024) return photoMsg('That image is over 2 MB. Choose a smaller one.', true);
    var r = new FileReader();
    r.onload = function () { setPhoto(r.result); applyPhoto(); photoMsg('Photo updated.'); };
    r.readAsDataURL(f);
  }

  /* ---------- wiring ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-su-close]')) { if (dlg) dlg.close(); return; }
    if (t.closest('[data-advising-notes]')) return openNotes();
    if (t.closest('[data-grade-flags]')) return openFlagList();
    var dl = t.closest('[data-download-checklist]');
    if (dl) return downloadChecklist(dl.closest('main'));
    var ci = t.closest('[data-info]');
    if (ci) return openCourseInfo(ci);
    var fb = t.closest('[data-flag]');
    if (fb) return isOpen(fb.dataset.code) ? openFlagList() : openFlagForm(fb);
    if (t.closest('#me-btn')) { setMenu(document.getElementById('me-menu').hidden); return; }
    if (!t.closest('#me') || t.closest('#me-menu a')) setMenu(false);
    if (t.closest('[data-photo-pick]')) { t.closest('.su-photo').querySelector('[data-photo-input]').click(); return; }
    if (t.closest('[data-photo-remove]')) { setPhoto(null); applyPhoto(); photoMsg('Photo removed.'); return; }
    var ta = t.closest('[data-su-toggleall]');
    if (ta) { toggleAll(ta.closest('main')); return; }
    var mn = t.closest('[data-action="menu"]');
    if (mn) { var sd = document.querySelector('.side'); sd.classList.toggle('open'); mn.setAttribute('aria-expanded', String(sd.classList.contains('open'))); return; }
    var h = t.closest('.su-collapsible > .panel-head');
    if (h) { var c = h.parentElement.classList.toggle('collapsed'); h.setAttribute('aria-expanded', String(!c)); syncToggle(h.closest('main')); }
  });
  document.addEventListener('submit', function (e) {
    if (!e.target.matches('[data-su-flagform]')) return;
    e.preventDefault();
    var f = e.target;
    var nm = document.querySelector('.user-name b'), id = document.querySelector('.user-name small');
    FLAGS = loadFlags();
    FLAGS.unshift({ id: 'sf' + Date.now(), status: 'open', studentName: nm ? nm.textContent.trim() : 'Student', studentId: id ? id.textContent.trim() : '', code: current.code, title: current.title, grade: current.grade, reason: f.reason.value, details: f.details.value.trim(), filed: today() });
    saveFlags();
    markFlagged();
    dlg.close();
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-photo-input]')) return handlePhoto(e.target); if (e.target.name === 'checklist-filter') { applyFilter(e.target); syncToggle(e.target.closest('main')); } });


  /* ---------- change password ---------- */
  function initPassword() {
    var $ = function (id) { return document.getElementById(id); };
    if (!$('pw-form')) return;
    var EYE = '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>';
    document.querySelectorAll('[data-reveal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = $(b.dataset.reveal), on = f.type === 'password';
        f.type = on ? 'text' : 'password';
        b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
        b.querySelector('svg').innerHTML = on ? EYE + '<path d="M4 4l16 16"/>' : EYE;
      });
    });
    document.querySelectorAll('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (document.querySelector('.pg')) location.hash = '#/dashboard'; else location.href = 'StudentDashboard.html';
      });
    });
    function rules() {
      var c = $('pw-cur').value, n = $('pw-new').value, a = $('pw-again').value;
      var r = { len: n.length >= 12, mix: /[A-Za-z]/.test(n) && /\d/.test(n), diff: !!n && n !== c, match: !!n && n === a };
      Object.keys(r).forEach(function (k) {
        var li = document.querySelector('[data-rule="' + k + '"]'), m = li.querySelector('[data-mark]');
        m.style.background = r[k] ? '#2C6430' : 'transparent'; m.style.borderColor = r[k] ? '#2C6430' : '#E1DBC6';
        li.style.color = r[k] ? '#2C6430' : '#6E6C58';
      });
      return r;
    }
    ['pw-cur', 'pw-new', 'pw-again'].forEach(function (id) { $(id).addEventListener('input', rules); });
    function say(kind, text) {
      var ok = kind === 'ok', c = ok ? ['#E7F0E2', '#CBDDC2', '#2C6430', 'M12 3l7.5 3v6c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6zM9 12l2.2 2.2L15.5 10'] : ['#FAE7E1', '#EFCFC5', '#9E2E1C', 'M12 3.5l9.5 16.5H2.5zM12 9.5v4.5M12 17h.01'];
      $('pw-msg').innerHTML = '<div role="status" class="su-note" style="margin-top:18px;background:' + c[0] + ';border:1px solid ' + c[1] + ';color:' + c[2] + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="' + c[3] + '"/></svg><div>' + text + '</div></div>';
      $('pw-msg').hidden = false;
    }
    $('pw-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var r = rules();
      if (!$('pw-cur').value) { say('no', 'Enter your current password.'); return $('pw-cur').focus(); }
      if (!(r.len && r.mix && r.diff && r.match)) return say('no', "The new password doesn't meet every requirement below yet.");
      ['pw-cur', 'pw-new', 'pw-again'].forEach(function (id) { $(id).value = ''; }); rules();
      say('ok', 'Password updated. Your other devices have been signed out.');
    });
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('storage', function (e) { if (e.key === FLAG_KEY) markFlagged(); });
  function init() { initCollapsible(); addToggleButtons(); markFlagged(); initPassword(); applyPhoto(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
