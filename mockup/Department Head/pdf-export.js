/* Local PDF generation: searchable text, paginated tables, no service or print dialog.
   Every export gets a letterhead and signature blocks. Neither is fixed: the unit name comes from the
   department (or faculty) of the exporting account, and the signatories from the account that prepared
   the report and the adviser / department head / dean assigned to the student or unit it covers.
   Callers pass report.unit / report.signatories, or build them with DepartmentPDF.context. */
(function (root) {
  'use strict';
  const clean = value => String(value ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[–—]/g, '-').replace(/→/g, ' -> ').replace(/≥/g, '>=').replace(/·/g, ' | ')
    .replace(/[^\x20-\x7e\n]/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const escape = value => clean(value).replace(/([\\()])/g, '\\$1').replace(/\n/g, ' ');
  function wrap(value, max) {
    const words = clean(value).split(/\s+/), lines = []; let line = '';
    for (let word of words) {
      if (line.length + word.length + 1 > max && line) { lines.push(line); line = ''; }
      while (word.length > max) { lines.push(word.slice(0, max)); word = word.slice(max); }
      line += (line ? ' ' : '') + word;
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  }
  const GREEN = '.184 .290 .071', INK = '.086 .125 .047', MUTED = '.431 .424 .345';
  function create(report) {
    const width = 842, height = 595, margin = 40, bodyWidth = width - margin * 2;
    const pages = []; let commands, y;
    const text = (value, x, top, size = 10, bold = false, color = INK) => {
      commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${(height - top).toFixed(2)} Tm (${escape(value)}) Tj ET`);
    };
    const rect = (x, top, w, h, color) => commands.push(`${color} rg ${x.toFixed(2)} ${(height - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    const textWidth = (value, size, bold) => clean(value).length * size * (bold ? .56 : .5);
    const center = (value, cx, top, size, bold, color) => text(value, cx - textWidth(value, size, bold) / 2, top, size, bold, color);
    const dashedBox = (x, top, w, h, label) => {
      commands.push(`.62 .62 .58 RG .8 w [3 3] 0 d ${x.toFixed(2)} ${(height - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S [] 0 d`);
      const lines = wrap(label, Math.max(8, Math.floor((w - 8) / 4.2)));
      lines.forEach((line, i) => center(line, x + w / 2, top + h / 2 - (lines.length - 1) * 5 + i * 10 + 3, 7.5, false, '.35 .45 .55'));
    };
    const letterhead = () => {
      const unit = report.unit, top = 30, h = 62;
      let x = margin;
      if (report.logos !== false) {
        for (const logo of report.logos || [{ label: 'Bagong Pilipinas logo', w: 62 }, { label: 'VSU Brand Logo + Text Logo', w: 124 }]) {
          dashedBox(x, top, logo.w, h, logo.label); x += logo.w + 8;
        }
      }
      rect(x + 6, top - 2, 2.2, h + 4, GREEN);
      const tx = x + 20, lines = wrap(String(unit.name).toUpperCase(), Math.floor((width - margin - tx) / 12.6));
      text(unit.prefix, tx, top + 16, 13, false, GREEN);
      lines.forEach((line, i) => text(line, tx, top + 40 + i * 24, 21.5, true, GREEN));
      y = top + h + 24;
    };
    function newPage() {
      commands = []; pages.push(commands);
      rect(0, 0, width, 7, GREEN);
      if (report.unit) {
        if (pages.length === 1) {
          letterhead();
          center(report.title.toUpperCase(), width / 2, y + 6, 14, true);
          y += 28;
          if (report.subtitle) { center(report.subtitle, width / 2, y - 2, 9.5, false, MUTED); y += 16; }
          const info = report.info || [], cols = 3, colW = bodyWidth / cols;
          info.forEach((pair, i) => {
            const cx = margin + (i % cols) * colW, top = y + Math.floor(i / cols) * 15;
            text(pair[0] + ':', cx, top, 9.5, true); text(pair[1], cx + textWidth(pair[0] + ':', 9.5, true) + 5, top, 9.5);
          });
          y += Math.ceil(info.length / cols) * 15 + (info.length ? 8 : 0);
        } else {
          text(report.runningHead || report.title + ' (continued)', margin, 32, 9, false, MUTED);
          y = 56;
        }
        return;
      }
      text(report.crumb || 'SAAIS  /  DEPARTMENT HEAD  /  DCST', margin, 32, 9, true, MUTED);
      text(report.title, margin, 62, 23, true);
      text(report.subtitle || 'Department of Computer Science and Technology', margin, 82, 10, false, MUTED);
      y = 110;
    }
    function ensure(h) { if (y + h > height - 45) { newPage(); return true; } return false; }
    function paragraph(value, bold = false, size = 10) {
      for (const line of wrap(value, Math.floor(bodyWidth / (size * .54)))) {
        ensure(size + 6); text(line, margin, y, size, bold); y += size + 5;
      }
      y += 7;
    }
    newPage();
    if (report.unit) {
      const stats = report.stats || [];
      if (stats.length) {
        const line = stats.map(s => `${s.label}: ${s.value}${s.note ? ' (' + s.note + ')' : ''}`);
        const rows = wrap(line.join('   |   '), Math.floor((bodyWidth - 20) / 5)), h = rows.length * 14 + 12;
        ensure(h + 10); rect(margin, y - 12, bodyWidth, h, '.945 .961 .941');
        rows.forEach((r, i) => text(r, margin + 10, y + 2 + i * 14, 9.5, true)); y += h + 8;
      }
    } else for (const stat of report.stats || []) paragraph(`${stat.label}: ${stat.value}${stat.note ? ' - ' + stat.note : ''}`, true);
    for (const section of report.sections || []) {
      ensure(70); paragraph(section.title, true, 13);
      if (section.headers && section.headers.length) {
        const headers = section.headers, rows = section.rows || [];
        const weights = headers.map((h, i) => Math.min(42, Math.max(12, clean(h).length, ...rows.map(row => Math.min(42, clean(row[i]).length)))));
        const sum = weights.reduce((a, b) => a + b, 0), widths = weights.map(w => bodyWidth * w / sum);
        const capacities = widths.map(w => Math.max(6, Math.floor((w - 16) / 5.1)));
        function row(values, isHeader, index) {
          const lines = headers.map((h, i) => wrap(values[i] || '-', capacities[i]));
          const h = Math.max(...lines.map(ls => ls.length)) * 13 + 14;
          if (!isHeader && ensure(h)) { paragraph(section.title + ' (continued)', true, 13); row(headers, true, 0); }
          rect(margin, y - 10, bodyWidth, h, isHeader ? GREEN : index % 2 ? '.984 .973 .937' : '1 1 1');
          let x = margin;
          lines.forEach((ls, i) => {
            ls.forEach((line, j) => text(line, x + 8, y + 3 + j * 13, 9.5, isHeader, isHeader ? '.984 .973 .937' : INK));
            x += widths[i];
          });
          y += h;
        }
        row(headers, true, 0); rows.forEach((values, i) => row(values, false, i)); y += 16;
      } else if (section.text) paragraph(section.text);
    }
    const sigs = report.signatories || [];
    if (report.unit && sigs.length) {
      ensure(100); y += 34;
      const colW = Math.min(250, bodyWidth / sigs.length - 24);
      sigs.forEach((sig, i) => {
        const cx = margin + bodyWidth * (i + .5) / sigs.length;
        rect(cx - colW / 2, y, colW, .8, INK);
        if (sig.name) center(sig.name, cx, y + 14, 10, true);
        center(sig.role, cx, y + (sig.name ? 28 : 14), 9.5, false);
      });
      y += 44;
    }
    pages.forEach((page, i) => {
      commands = page;
      text(report.footer || 'Fictional sample records | Academic snapshot: 15 August 2025', margin, height - 22, 8, false, MUTED);
      text(`Page ${i + 1} of ${pages.length}`, width - 100, height - 22, 8, false, MUTED);
    });
    const objects = [null, '<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
    const kids = [];
    pages.forEach(page => {
      const pageId = objects.length, streamId = pageId + 1, stream = page.join('\n') + '\n';
      kids.push(`${pageId} 0 R`);
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`);
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    });
    objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
    let pdf = '%PDF-1.4\n', offsets = [0];
    for (let i = 1; i < objects.length; i++) { offsets.push(pdf.length); pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n` + offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(pdf);
  }

  /* ---- Letterhead and signatory context --------------------------------------------------------
     DIRECTORY is the sample institutional data. In production these come from the Department /
     Faculty records and the adviser assignment. A letterhead override saved by the department
     (localStorage 'saais-pdf-letterhead-v1': { DCST: { prefix, name } }) wins over the directory. */
  const DIRECTORY = {
    faculties: { FCOMP: { prefix: 'Faculty of', name: 'Computing', dean: 'Dr. Paz Villanueva' } },
    departments: {
      'DCST': { prefix: 'Department of', name: 'Computer Science & Technology', faculty: 'FCOMP', head: 'Dr. Andrea Dela Cruz' },
      'DIT Alang-alang': { prefix: 'Department of', name: 'Information Technology, Alang-alang', faculty: 'FCOMP', head: '' },
      'DIT Isabel': { prefix: 'Department of', name: 'Information Technology, Isabel', faculty: 'FCOMP', head: '' }
    },
    advisers: { '2023-04412': 'Prof. Ramon Reyes', '23-1-01234': 'Prof. Mara Reyes', '23-1-01301': 'Prof. Mara Reyes', '24-1-02011': 'Prof. Mara Reyes' }
  };
  const store = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { return {}; } };
  const text1 = el => (el && el.textContent || '').trim().replace(/\s+/g, ' ');
  function account() {
    const doc = root.document; if (!doc) return { name: '', sub: '' };
    const me = doc.querySelector('#me-btn');
    if (me) { const d = me.querySelector('div:nth-child(2)'); if (d && d.children.length > 1) return { name: text1(d.children[0]), sub: text1(d.children[d.children.length - 1]) }; }
    const head = doc.querySelector('.user-name');
    if (head) return { name: text1(head.querySelector('b')), sub: text1(head.querySelector('small')) };
    const dean = doc.querySelector('.dean-profile-trigger, .dean-profile');
    if (dean) { const l = (dean.innerText || '').split('\n').map(s => s.trim()).filter(Boolean); return { name: l.find(s => /^(Dr|Prof)\./.test(s)) || '', sub: l[l.length - 1] || '' }; }
    return { name: '', sub: '' };
  }
  const deptOf = acct => { const m = /\b(DCST|DIT [A-Za-z-]+)\b/.exec(acct.sub || ''); return m ? m[1] : 'DCST'; };
  function unit(code) {
    const d = DIRECTORY.departments[code] || DIRECTORY.departments.DCST, o = store('saais-pdf-letterhead-v1')[code] || {};
    return { prefix: o.prefix || d.prefix, name: o.name || d.name };
  }
  const facultyUnit = code => { const f = DIRECTORY.faculties[(DIRECTORY.departments[code] || DIRECTORY.departments.DCST).faculty]; return { prefix: f.prefix, name: f.name }; };
  const head = code => (DIRECTORY.departments[code] || {}).head || '';
  const dean = code => (DIRECTORY.faculties[(DIRECTORY.departments[code] || DIRECTORY.departments.DCST).faculty] || {}).dean || '';
  const adviserOf = id => { const a = (store('saais-mgmt-v1').assign || {})[id]; return (a && a.adviser) || DIRECTORY.advisers[id] || ''; };
  const dateNow = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  /* kind: 'student' (exported by or for one student), 'adviser', 'head', 'dean'. */
  function context(kind, opts = {}) {
    const acct = account(), code = opts.dept || deptOf(acct);
    const by = acct.name ? ` by ${acct.name}` : '';
    const footer = (opts.footerPrefix ? opts.footerPrefix + ' | ' : '') + 'Generated ' + dateNow() + by + ' through SAAIS';
    if (kind === 'student') {
      const adviser = opts.adviser || adviserOf(opts.studentId) || text1(root.document && root.document.querySelector('.adviser-contact strong'));
      return { unit: unit(code), footer, signatories: [{ role: 'Prepared by: Academic Adviser', name: adviser }, { role: 'Noted by: Department Head', name: head(code) }] };
    }
    if (kind === 'adviser') return { unit: unit(code), footer, signatories: [{ role: 'Prepared by: Academic Adviser', name: acct.name }, { role: 'Noted by: Department Head', name: head(code) }] };
    if (kind === 'head') return { unit: unit(code), footer, signatories: [{ role: 'Prepared by: Department Head', name: acct.name || head(code) }, { role: 'Noted by: Dean', name: dean(code) }] };
    return { unit: opts.dept ? unit(code) : facultyUnit(code), footer, signatories: [{ role: 'Prepared by: Dean', name: acct.name || dean(code) }] };
  }


  /* PDF viewer: exports open here first; nothing downloads until the user chooses Download. */
  function preview(report, filename, onDownload) {
    const doc = root.document, url = URL.createObjectURL(new Blob([create(report)], { type: 'application/pdf' }));
    const dlg = doc.createElement('dialog');
    dlg.setAttribute('aria-label', 'PDF preview: ' + report.title);
    dlg.style.cssText = 'width:min(1100px,calc(100vw - 32px));height:calc(100vh - 32px);max-width:none;max-height:none;padding:0;border:1px solid #E1DBC6;border-radius:6px;background:#fff;color:#16200C;box-shadow:0 24px 80px rgba(22,32,12,.3);overflow:hidden';
    const btn = 'border-radius:8px;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;padding:9px 18px;';
    dlg.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;border-bottom:1px solid #EFEADB">' +
          '<div style="min-width:0"><div style="font-size:16px;font-weight:600">Preview: ' + clean(report.title) + '</div><div style="font-size:12.5px;color:#6E6C58;margin-top:2px">' + clean(filename) + '</div></div>' +
          '<div style="display:flex;gap:10px;flex-shrink:0"><button type="button" data-close style="' + btn + 'background:#fff;color:#16200C;border:1px solid #E1DBC6">Close</button>' +
          '<button type="button" data-dl style="' + btn + 'background:#2F4A12;color:#FBF8EF;border:1px solid #2F4A12">Download PDF</button></div></div>' +
        '<iframe title="PDF preview" src="' + url + '" style="flex:1;width:100%;border:0;background:#5B6560"></iframe></div>';
    doc.body.appendChild(dlg);
    const done = () => { URL.revokeObjectURL(url); dlg.remove(); };
    dlg.addEventListener('close', done);
    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
      if (e.target.closest('[data-dl]')) {
        const link = doc.createElement('a'); link.href = url; link.download = filename;
        doc.body.append(link); link.click(); link.remove();
        if (onDownload) onDownload();
      }
    });
    dlg.showModal();
  }

  function download() {
    const main = document.querySelector('main');
    const visible = el => !el.closest('[hidden]');
    const label = el => (el?.innerText || el?.textContent || '').trim().replace(/\s+/g, ' ');
    const report = Object.assign({ title: label(main.querySelector('h1')), subtitle: 'AY 2025-2026 | 1st semester', stats: [], sections: [] }, context('head', { footerPrefix: 'Fictional sample records' }));
    main.querySelectorAll('.stat').forEach(stat => { if (visible(stat)) report.stats.push({ label: label(stat.querySelector('.label')), value: label(stat.querySelector('strong')), note: label(stat.querySelector('small')) }); });
    main.querySelectorAll('.panel').forEach(panel => {
      if (!visible(panel)) return;
      const title = label(panel.querySelector('h2')), table = panel.querySelector('table');
      if (table) {
        const selected = [...table.querySelectorAll('thead th')].map((h, i) => ({ text: label(h), i })).filter(h => h.text && h.text !== 'Actions');
        report.sections.push({ title, headers: selected.map(h => h.text), rows: [...table.querySelectorAll('tbody tr')].filter(visible).map(row => selected.map(h => label(row.cells[h.i]))) });
      } else if (panel.querySelector('.bars')) {
        report.sections.push({ title, headers: ['Grade range', 'Distribution'], rows: [...panel.querySelectorAll('.bar-label')].map(bar => [...bar.children].map(label)) });
      } else report.sections.push({ title, text: label(panel.querySelector('.panel-body')) });
    });
    preview(report, 'SAAIS-' + report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf');
  }
  const api = { create, preview, download, context, account, DIRECTORY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DepartmentPDF = api;
})(typeof window !== 'undefined' ? window : globalThis);
