/* Fictional Dean directory and read-only audit preview; no shared globals. */
(() => {
  'use strict';
  const students = [
    ['Ana Reyes', '23-1-01234', 'DCST', 'BSCS 2025–present', 'Prof. Mara Reyes'],
    ['Ben Lopez', '23-1-01301', 'DCST', 'BSCS 2025–present', 'Prof. Mara Reyes'],
    ['Carla Mendoza', '22-1-00877', 'DCST', 'BSCS 2018–2024', 'Prof. Mara Reyes'],
    ['Dino Castillo', '24-1-02011', 'DCST', 'BSCS 2025–present', 'Prof. Mara Reyes'],
    ['Ella Navarro', '22-1-00912', 'DCST', 'BSCS 2018–2024', 'Prof. Mara Reyes'],
    ['Fe Aquino', '25-1-00145', 'DCST', 'BSCS 2025–present', 'Dr. Leo Santos'],
    ['Gio Bautista', '24-1-02230', 'DCST', 'BSCS 2025–present', 'Dr. Leo Santos'],
    ['Hana Lim', '22-1-00950', 'DCST', 'BSCS 2018–2024', 'Prof. Jun Villa'],
    ['Ivan Torres', '23-1-01412', 'DCST', 'BSCS 2018–2024', 'Prof. Jun Villa'],
    ['Joy Ramos', '25-1-00188', 'DCST', 'BSCS 2025–present', 'Dr. Paz Villanueva']
  ];
  const seed = [
    ['16 Oct 2026 09:14', 'Prof. Mara Reyes', 'View', 'Ana Reyes', 'Opened checklist'],
    ['14 Oct 2026 16:02', 'Prof. Mara Reyes', 'Change', 'Ana Reyes', 'CSci 25 final: 2.25 → 2.50'],
    ['14 Oct 2026 15:40', 'Dr. Paz Villanueva', 'View', '—', 'Report drill-down: batch 2023 (96 students)'],
    ['13 Oct 2026 08:01', 'System administrator', 'View', 'Ben Lopez', 'Opened grades by term']
  ];
  const key = 'saais-dean-adviser-audit-screenshot-v2';
  const readAudit = () => {
    try {
      const rows = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (Array.isArray(rows) && rows.every(row => Array.isArray(row) && row.length === 5 && row.every(cell => typeof cell === 'string'))) return rows;
    } catch (_) {}
    return seed.slice();
  };
  const value = id => document.getElementById(id)?.value.trim() || '';
  function render(body, rows, empty) {
    body.replaceChildren();
    rows.forEach(values => {
      const row = body.insertRow();
      values.forEach(text => { row.insertCell().textContent = text; });
    });
    if (!rows.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 5;
      cell.className = 'empty-row';
      cell.textContent = empty;
    }
  }
  function init() {
    if (document.documentElement.dataset.deanScreen === 'reports') {
      const style = document.createElement('style');
      style.textContent = `
        .dean-students-dialog { width:448px; max-width:calc(100vw - 32px); max-height:calc(100vh - 32px); overflow:auto; padding:14px; border:0; border-radius:10px; background:var(--white); color:var(--ink); }
        .dean-students-dialog::backdrop { background:rgba(29,47,10,.45); }
        .dean-students-dialog .dean-dialog-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
        .dean-students-dialog h2 { font-size:18px; }
        .dean-students-dialog button { border:1px solid var(--forest); border-radius:5px; color:var(--forest); padding:4px 8px; font-size:11px; }
        .dean-students-dialog .dean-dialog-notice { padding:8px 12px; border-radius:5px; margin:0 0 10px; background:var(--blue-bg); color:var(--blue); font-size:12px; }
        .dean-students-dialog th,.dean-students-dialog td { padding:7px 8px; font-size:12px; }
        .dean-students-dialog th { border-top:0; font-size:10px; }
      `;
      document.head.append(style);
      const dialog = document.createElement('dialog');
      dialog.className = 'dean-students-dialog';
      dialog.setAttribute('aria-labelledby', 'dean-students-title');
      dialog.innerHTML = '<div class="dean-dialog-heading"><h2 id="dean-students-title">Students behind this number</h2><button type="button" autofocus>Close</button></div><p class="dean-dialog-notice">Opening this list is recorded in the audit log.</p><table><thead><tr><th scope="col">Student</th><th scope="col" class="right">GWA</th></tr></thead><tbody><tr><td>Ana Reyes</td><td class="right">1.72</td></tr><tr><td>Ben Lopez</td><td class="right">2.10</td></tr><tr><td>Carla Mendoza</td><td class="right">1.58</td></tr></tbody></table>';
      document.body.append(dialog);
      dialog.querySelector('button').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => {
        const box = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
      });
      document.querySelectorAll('button[data-batch]').forEach(button => {
        button.addEventListener('click', () => {
          dialog.showModal();
          const audit = readAudit();
          const count = button.closest('tr').cells[2].textContent.trim();
          audit.unshift([new Date().toISOString().slice(0, 16).replace('T', ' '), 'Dr. Paz Villanueva', 'View', '—', 'Report drill-down: batch ' + button.dataset.batch + ' (' + count + ' students)']);
          try { sessionStorage.setItem(key, JSON.stringify(audit)); } catch (_) {}
        });
      });
    }
    const body = document.getElementById('student-rows');
    if (body) {
      const update = () => {
        const query = value('student-query').toLowerCase();
        const rows = students.filter(row =>
          (row[0] + ' ' + row[1]).toLowerCase().includes(query) &&
          (!value('student-curriculum') || row[3] === value('student-curriculum')) &&
          (!value('student-adviser') || row[4] === value('student-adviser')));
        render(body, rows, 'No students match these filters.');
        document.getElementById('student-count').textContent = rows.length + ' students';
        Array.from(body.rows).forEach((element, index) => {
          if (!rows[index]) return;
          element.className = 'clickable-row';
          element.tabIndex = 0;
          element.dataset.student = rows[index][1];
        });
      };
      document.querySelector('[data-filter-group="students"]').addEventListener('input', update);
      body.addEventListener('click', event => {
        const row = event.target.closest('[data-student]');
        if (!row) return;
        const student = students.find(item => item[1] === row.dataset.student);
        const audit = readAudit();
        audit.unshift([new Date().toISOString().slice(0, 16).replace('T', ' '), 'Dr. Paz Villanueva', 'View', student[1] + ' · ' + student[0], 'Viewed student academic record']);
        try { sessionStorage.setItem(key, JSON.stringify(audit)); } catch (_) {}
      });
      update();
    }
    const audit = document.getElementById('audit-rows');
    if (audit) {
      const update = () => {
        const rows = readAudit().filter(row =>
          row[1].toLowerCase().includes(value('audit-person').toLowerCase()) &&
          row[3].toLowerCase().includes(value('audit-student').toLowerCase()) &&
          (!value('audit-action') || row[2] === value('audit-action')) &&
          (!value('audit-from') || new Date(row[0]) >= new Date(value('audit-from') + 'T00:00:00')));
        render(audit, rows, 'No audit records match these filters.');
        Array.from(audit.rows).forEach((row, index) => {
          if (!rows[index]) return;
          const pill = document.createElement('span');
          pill.className = 'audit-pill ' + rows[index][2].toLowerCase();
          pill.textContent = rows[index][2];
          row.cells[2].replaceChildren(pill);
        });
      };
      document.querySelector('[data-filter-group="audit"]').addEventListener('input', update);
      update();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
