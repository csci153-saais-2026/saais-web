/* Department reports: every term x program combination shows its own report (replaces the single-sample preview). */
(function () {
  'use strict';
  var content = document.getElementById('report-content');
  var term = document.querySelector('[data-report-term] select'), program = document.querySelector('[data-report-program] select');
  if (!content || !term || !program) return;
  // Drop the original "no sample for this selection" handlers by swapping in clean copies of the selects.
  [term, program].forEach(function (el) { var c = el.cloneNode(true); el.parentNode.replaceChild(c, el); });
  term = document.querySelector('[data-report-term] select'); program = document.querySelector('[data-report-program] select');
  var empty = document.getElementById('report-empty'); if (empty) empty.hidden = true; content.hidden = false;

  var LABELS = ['1.00–1.50', '1.75–2.25', '2.50–3.00', '5.00', 'INC / DR / NA'];
  /* percent split + total grades per term; curricula and cohorts per program */
  var TERMS = {
    0: { name: 'AY 2025–2026 · 1st semester', records: 3000, mix: { all: [32, 41, 19, 5, 3], bscs: [31, 42, 19, 5, 3], bsit: [35, 38, 19, 5, 3] }, gwa: { all: '1.87', bscs: '1.85', bsit: '1.93' }, def: { all: 47, bscs: 33, bsit: 14 },
      enrolled: { bscs: 428, bsit: 184 },
      curricula: { bscs: [['BSCS 2024', 'Current', 286], ['BSCS 2021', 'Older', 142]], bsit: [['BSIT 2024', 'Current', 184]] },
      cohorts: { bscs: [[2025, 'BSCS 2024', 108, '1.92'], [2024, 'BSCS 2024', 96, '1.75'], [2023, 'BSCS 2021', 82, '1.89'], [2022, 'BSCS 2021', 60, '2.04']], bsit: [[2025, 'BSIT 2024', 52, '2.01'], [2024, 'BSIT 2024', 48, '1.94'], [2023, 'BSIT 2024', 46, '1.90'], [2022, 'BSIT 2024', 38, '1.88']] } },
    1: { name: 'AY 2024–2025 · 2nd semester', records: 2870, mix: { all: [30, 42, 20, 5, 3], bscs: [29, 43, 20, 5, 3], bsit: [33, 40, 19, 5, 3] }, gwa: { all: '1.91', bscs: '1.89', bsit: '1.97' }, def: { all: 52, bscs: 38, bsit: 14 },
      enrolled: { bscs: 401, bsit: 173 },
      curricula: { bscs: [['BSCS 2024', 'Current', 190], ['BSCS 2021', 'Older', 211]], bsit: [['BSIT 2024', 'Current', 173]] },
      cohorts: { bscs: [[2024, 'BSCS 2024', 98, '1.78'], [2023, 'BSCS 2021', 86, '1.93'], [2022, 'BSCS 2021', 64, '2.07'], [2021, 'BSCS 2021', 53, '2.11']], bsit: [[2024, 'BSIT 2024', 50, '2.03'], [2023, 'BSIT 2024', 47, '1.96'], [2022, 'BSIT 2024', 40, '1.95'], [2021, 'BSIT 2024', 36, '1.93']] } }
  };
  var imp = { bscs: 0, bsit: 0 }; try { ((JSON.parse(localStorage.getItem('saais-mgmt-v1')) || {}).students || []).forEach(function (s) { imp[/^BSIT/.test(s.curriculum) ? 'bsit' : 'bscs']++; }); } catch (e) {}
  TERMS[0].enrolled.bscs += imp.bscs; TERMS[0].enrolled.bsit += imp.bsit;
  var money = function (n) { return n.toLocaleString('en-US'); };
  var esc = function (v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function pick() { return program.selectedIndex === 0 ? 'all' : program.selectedIndex === 1 ? 'bscs' : 'bsit'; }
  function sum(obj, keys) { return keys.reduce(function (n, k) { return n + obj[k]; }, 0); }
  function render() {
    var t = TERMS[term.selectedIndex], p = pick(), progs = p === 'all' ? ['bscs', 'bsit'] : [p];
    var enrolled = sum(t.enrolled, progs), def = t.def[p];
    var stats = content.querySelectorAll('.stat');
    stats[0].querySelector('strong').textContent = money(enrolled);
    stats[0].querySelector('small').textContent = p === 'all' ? 'BSCS ' + t.enrolled.bscs + ' · BSIT ' + t.enrolled.bsit : (p === 'bscs' ? 'BS Computer Science' : 'BS Information Technology');
    stats[1].querySelector('strong').textContent = t.gwa[p];
    stats[2].querySelector('strong').textContent = String(def);
    stats[2].querySelector('small').textContent = (def / enrolled * 100).toFixed(1) + '% of enrolled students';
    var records = Math.round(t.records * enrolled / (t.enrolled.bscs + t.enrolled.bsit));
    var mix = t.mix[p];
    content.querySelector('.panel-head p').textContent = t.name;
    content.querySelectorAll('.bars .bar').forEach(function (bar, i) {
      bar.querySelector('b').textContent = mix[i] + '%';
      bar.querySelector('.muted').textContent = '· ' + money(Math.round(records * mix[i] / 100)) + ' grades';
      bar.querySelector('.fill').style.width = Math.min(100, mix[i] * 2) + '%';
    });
    content.querySelector('.bars + .caption').innerHTML = money(records) + ' course grade records · Percentages sum to 100%.<br>INC, DR, and NA are excluded from the mean GWA.';
    // Department summary
    var panels = content.querySelectorAll('.split .panel'), body = panels[1].querySelector('.panel-body');
    var list = progs.reduce(function (a, k) { return a.concat(t.curricula[k]); }, []);
    body.innerHTML = list.map(function (c) { return '<div><div class="actions"><strong>' + esc(c[0]) + '</strong><span class="badge ' + (c[1] === 'Current' ? 'green' : '') + '">' + c[1] + '</span></div><p class="muted">' + c[2] + ' students</p></div>'; }).join('') + '<p class="caption">Figures are fictional design examples for this department.</p>';
    // Cohort table
    var rows = progs.reduce(function (a, k) { return a.concat(t.cohorts[k].map(function (r) { return r.concat(k); })); }, []);
    content.querySelector('table tbody').innerHTML = rows.map(function (r, i) {
      return '<tr><td data-label="Entry year">' + r[0] + '</td><td data-label="Study range">' + r[0] + '–' + (r[0] + 4) + '</td><td data-label="Curriculum">' + esc(r[1]) + '</td><td data-label="Students">' + r[2] + '</td><td data-label="Mean GWA">' + r[3] + '</td><td data-label="Actions"><button class="text-btn" type="button" data-hr-batch="' + i + '">View students →</button></td></tr>';
    }).join('');
    content.querySelector('table').dataset.rows = JSON.stringify(rows);
    var foot = content.querySelector('.table-foot span');
    if (foot) foot.textContent = (p === 'all' ? 'All programs' : p.toUpperCase()) + ' cohort preview · Report views are included in the audit log';
    var h = content.querySelector('.split .panel h2'); if (h) h.textContent = 'Final grade distribution';
  }
  term.addEventListener('change', render); program.addEventListener('change', render);
  render();

  /* View students: a cohort list that matches the table row (same dialog as before). */
  var GIVEN = ['Alex', 'Bianca', 'Carlo', 'Diana', 'Emilio', 'Frances', 'Gian', 'Hannah', 'Ivan', 'Julia', 'Kevin', 'Lara'];
  var FAMILY = ['Aguilar', 'Bautista', 'Castro', 'Domingo', 'Espino', 'Fernandez', 'Gutierrez', 'Hernandez', 'Ignacio', 'Javier', 'Katigbak', 'Lacson'];
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hr-batch]'); if (!b) return;
    var r = JSON.parse(content.querySelector('table').dataset.rows)[+b.dataset.hrBatch];
    var year = r[0], n = r[2], gwa = +r[3], prog = r[4].toUpperCase(), curr = r[1];
    var dlg = document.getElementById('preview-dialog');
    var students = [];
    for (var i = 0; i < n; i++) {
      var id = String(year).slice(2) + '-1-' + String(100 + i * 3).padStart(5, '0');
      var g = Math.max(1, Math.min(3, gwa + ((i % 7) - 3) * 0.05));
      students.push([GIVEN[i % 12] + ' ' + FAMILY[(Math.floor(i / 12) + (prog === 'BSIT' ? 5 : 0)) % 12], id, curr, g.toFixed(2)]);
    }
    document.getElementById('dialog-title').textContent = 'Batch ' + year + ' · Student GWA';
    document.getElementById('dialog-content').innerHTML = '<div class="notice">' + n + ' students · ' + prog + ' · Study range ' + year + '–' + (year + 4) + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th scope="col">Student</th><th scope="col">Student ID</th><th scope="col">Curriculum</th><th scope="col">GWA</th></tr></thead><tbody>' +
      students.map(function (s) { return '<tr><td>' + esc(s[0]) + '</td><td>' + esc(s[1]) + '</td><td>' + esc(s[2]) + '</td><td>' + s[3] + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var confirm = document.getElementById('dialog-confirm'); confirm.hidden = true; confirm.textContent = '';
    dlg.showModal();
    if (window.SAAIS_AUDIT) window.SAAIS_AUDIT.add('Dr. Andrea Dela Cruz', 'View', '', 'Viewed batch GWA report: ' + prog + ' batch ' + year + ' (' + n + ' students)');
  });
})();
