/* Local PDF generation: searchable text, paginated tables, no service or print dialog. */
(function (root) {
  'use strict';
  const clean = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
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
  function create(report) {
    const width = 842, height = 595, margin = 40, bodyWidth = width - margin * 2;
    const pages = []; let commands, y;
    const text = (value, x, top, size = 10, bold = false, color = '.086 .125 .047') => {
      commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${(height - top).toFixed(2)} Tm (${escape(value)}) Tj ET`);
    };
    const rect = (x, top, w, h, color) => commands.push(`${color} rg ${x.toFixed(2)} ${(height - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    function newPage() {
      commands = []; pages.push(commands);
      rect(0, 0, width, 7, '.184 .290 .071');
      text(report.crumb || 'SAAIS  /  DEPARTMENT HEAD  /  DCST', margin, 32, 9, true, '.431 .424 .345');
      text(report.title, margin, 62, 23, true);
      text(report.subtitle || 'Department of Computer Science and Technology', margin, 82, 10, false, '.431 .424 .345');
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
    for (const stat of report.stats || []) paragraph(`${stat.label}: ${stat.value}${stat.note ? ' - ' + stat.note : ''}`, true);
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
          rect(margin, y - 10, bodyWidth, h, isHeader ? '.184 .290 .071' : index % 2 ? '.984 .973 .937' : '1 1 1');
          let x = margin;
          lines.forEach((ls, i) => {
            ls.forEach((line, j) => text(line, x + 8, y + 3 + j * 13, 9.5, isHeader, isHeader ? '.984 .973 .937' : '.086 .125 .047'));
            x += widths[i];
          });
          y += h;
        }
        row(headers, true, 0); rows.forEach((values, i) => row(values, false, i)); y += 16;
      } else if (section.text) paragraph(section.text);
    }
    pages.forEach((page, i) => {
      commands = page;
      text(report.footer || 'Fictional sample records | Academic snapshot: 15 August 2025', margin, height - 22, 8, false, '.431 .424 .345');
      text(`Page ${i + 1} of ${pages.length}`, width - 100, height - 22, 8, false, '.431 .424 .345');
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
  function download() {
    const main = document.querySelector('main');
    const visible = el => !el.closest('[hidden]');
    const label = el => (el?.innerText || el?.textContent || '').trim().replace(/\s+/g, ' ');
    const report = { title: label(main.querySelector('h1')), subtitle: 'AY 2025-2026 | 1st semester | DCST', stats: [], sections: [] };
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
    const url = URL.createObjectURL(new Blob([create(report)], { type: 'application/pdf' }));
    const link = document.createElement('a'); link.href = url; link.download = 'SAAIS-' + report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const api = { create, download };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DepartmentPDF = api;
})(typeof window !== 'undefined' ? window : globalThis);
