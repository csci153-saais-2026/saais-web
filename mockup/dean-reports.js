/* Dean Reports: department filter and a working "Download PDF" (same generator as the Department reports export). */
(function () {
  'use strict';
  var main = document.querySelector('main');
  if (!main) return;
  var select = main.querySelector('select[aria-label="Department"]');
  var download = [].slice.call(main.querySelectorAll('button')).filter(function (b) { return /Download PDF/.test(b.textContent); })[0];
  if (!select || !download) return;

  var CUR_OLD = 'BSCS 2018–2024', CUR_NEW = 'BSCS 2025–present';
  var DEPTS = {
    'All departments': { students: 359, gwa: '1.98', def: 61, dist: [34, 41, 18, 4, 3], rows: [['2022', CUR_OLD, 88, '1.95'], ['2023', CUR_NEW, 96, '2.02'], ['2024', CUR_NEW, 101, '2.06']] },
    'DCST': { students: 212, gwa: '1.92', def: 38, dist: [36, 42, 16, 4, 2], rows: [['2022', CUR_OLD, 52, '1.90'], ['2023', CUR_NEW, 58, '1.96'], ['2024', CUR_NEW, 62, '1.99']] },
    'DIT Alang-alang': { students: 91, gwa: '2.05', def: 14, dist: [30, 40, 21, 6, 3], rows: [['2022', 'BSIT 2018–2024', 21, '2.08'], ['2023', 'BSIT 2025–present', 29, '2.04'], ['2024', 'BSIT 2025–present', 33, '2.09']] },
    'DIT Isabel': { students: 56, gwa: '2.01', def: 9, dist: [33, 39, 20, 5, 3], rows: [['2022', 'BSIT 2018–2024', 15, '2.03'], ['2023', 'BSIT 2025–present', 19, '2.00'], ['2024', 'BSIT 2025–present', 22, '2.01']] }
  };
  var LABELS = ['1.00–1.50', '1.75–2.25', '2.50–3.00', '5.00', 'INC / DR / NA'];
  var imported = 0; try { imported = ((JSON.parse(localStorage.getItem('saais-mgmt-v1')) || {}).students || []).length; } catch (e) {}
  DEPTS['All departments'].students += imported; DEPTS['DCST'].students += imported;
  select.innerHTML = Object.keys(DEPTS).map(function (k) { return '<option>' + k + '</option>'; }).join('');

  function render() {
    var name = select.value, d = DEPTS[name];
    var values = main.querySelectorAll('.stat .stat-value');
    values[0].textContent = d.students; values[1].textContent = d.gwa; values[2].textContent = d.def;
    var meta = main.querySelector('.meta'); if (meta) meta.textContent = 'Faculty of Computing' + (name === 'All departments' ? '' : ' · ' + name) + ' · read-only';
    main.querySelectorAll('.bar-row').forEach(function (row, i) {
      row.querySelector('.bar-fill').style.width = Math.min(100, d.dist[i] * 2) + '%';
      row.querySelector('.pct').textContent = d.dist[i] + '%';
    });
    var body = main.querySelector('tbody');
    [].slice.call(body.rows).forEach(function (tr, i) {
      var r = d.rows[i]; if (!r) { tr.hidden = true; return; }
      tr.hidden = false; tr.cells[0].textContent = r[0]; tr.cells[1].textContent = r[1]; tr.cells[2].textContent = r[2]; tr.cells[3].textContent = r[3];
      var b = tr.querySelector('[data-batch]'); if (b) b.dataset.batch = r[0];
    });
  }
  select.addEventListener('change', render);
  render();

  download.addEventListener('click', function () {
    var text = function (el) { return (el ? el.textContent : '').trim().replace(/\s+/g, ' '); };
    var name = select.value, d = DEPTS[name];
    var ctx = window.DepartmentPDF.context('dean', { dept: name === 'All departments' ? '' : name, footerPrefix: 'Fictional sample records | Reference date: 28 October 2026' });
    var report = Object.assign({
      title: 'Faculty reports',
      subtitle: name + ' | read-only',
      stats: [].slice.call(main.querySelectorAll('.stat')).map(function (s) { return { label: text(s.querySelector('.stat-label')), value: text(s.querySelector('.stat-value')) }; }),
      sections: [
        { title: text(main.querySelector('.card-head h2')), headers: ['Grade range', 'Share of final grades'], rows: [].slice.call(main.querySelectorAll('.bar-row')).map(function (r) { return [text(r.firstElementChild), text(r.querySelector('.pct'))]; }) },
        { title: 'GWA by batch and curriculum version', headers: ['Batch', 'Curriculum', 'Students', 'Mean GWA'], rows: d.rows.map(function (r) { return [r[0], r[1], String(r[2]), r[3]]; }) }
      ]
    }, ctx);
    window.DepartmentPDF.preview(report, 'SAAIS-faculty-reports' + (name === 'All departments' ? '' : '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '.pdf', function () {
      if (window.SAAIS_AUDIT) window.SAAIS_AUDIT.add('Dr. Paz Villanueva', 'View', '', 'Exported faculty report (' + name + ') as PDF');
    });
  });
})();
