/* Adviser dashboard "Export PDF": same generator and layout as Department reports (Department Head/pdf-export.js). */
(function (root) {
  'use strict';
  const label = el => (el?.innerText || el?.textContent || '').trim().replace(/\s+/g, ' ');
  function download(btn) {
    const scope = btn.closest('[data-view]') || btn.closest('main'), visible = el => !el.closest('[hidden]');
    const report = Object.assign({
      title: label(scope.querySelector('h1')),
      subtitle: 'Adviser dashboard | ' + label(scope.querySelector('h1 + p')),
      stats: [], sections: []
    }, root.DepartmentPDF.context('adviser', { footerPrefix: 'Fictional sample records | Reference date: 19 September 2026' }));
    scope.querySelectorAll('.kick').forEach(kick => {
      const card = kick.parentElement;
      if (visible(card) && card.querySelector('.dsp')) report.stats.push({ label: label(kick), value: label(card.querySelector('.dsp')), note: label(card.lastElementChild).replace(/ · View list$/, '') });
    });
    scope.querySelectorAll('section').forEach(panel => {
      if (!visible(panel)) return;
      const title = label(panel.querySelector('h3')), table = panel.querySelector('table'), dist = panel.querySelectorAll('[data-dist-row]');
      if (table) {
        const selected = [...table.querySelectorAll('thead th')].map((h, i) => ({ text: label(h), i })).filter(h => h.text);
        report.sections.push({ title, headers: selected.map(h => h.text), rows: [...table.querySelectorAll('tbody tr')].filter(visible).map(row => selected.map(h => label(row.cells[h.i]))) });
      } else if (dist.length) {
        const term = panel.querySelector('[id$="dist-label"], #dist-label');
        report.sections.push({ title: title + (term ? ' - ' + label(term) : ''), headers: ['Grade range', 'Share of final grades'], rows: [...dist].map(r => [label(r.firstElementChild), label(r.querySelector('[data-pct]'))]) });
      }
    });
    root.DepartmentPDF.preview(report, 'SAAIS-adviser-' + report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf');
  }
  root.AdviserPDF = { download };
})(window);
