/* Maria Isabel Bautista's academic standing, recomputed from the grades the adviser has encoded, corrected or resolved.
   The Student dashboard and checklist, the advisee pages, the advisee roster and the adviser dashboards all read this one calculation,
   so a grade saved anywhere moves GWA, units, year standing, deficiencies and standing everywhere. */
(function (root) {
  'use strict';
  var BASE = { gwa: 1.58, counted: 56, earned: 56, total: 147 };
  var UNITS = { 'CSIT 103': 4, 'CSIT 104': 3, 'CSIT 105': 3, 'CSci 103': 3, 'CSci 122': 3, 'CSci 182': 3, 'ScSc 13': 3, 'PhEd 13': 2, 'CSci 102': 3 };
  var ORD = ['1st', '2nd', '3rd', '4th'];
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function yearIndex(earned) { return earned < 36 ? 0 : earned < 72 ? 1 : earned < 110 ? 2 : 3; }

  function maria() {
    var UI = read('saais-adviser-ui-v1', root.__saaisUI || {}), flags = read('saais-grade-flags', []);
    var done = {};
    ((UI.enc && UI.enc.maria && UI.enc.maria.t1) || []).forEach(function (r) { if (r[3] || r[4]) done[r[0]] = { mid: r[3], fin: r[4] }; });
    Object.keys(UI.grades || {}).forEach(function (c) { var g = UI.grades[c]; if (g && g.fin && c !== 'CSci 102') done[c] = { mid: g.mid || (done[c] || {}).mid || '', fin: g.fin }; });
    flags.forEach(function (f) { if (f.status === 'fixed' && f.newGrade) done[f.code] = { mid: (done[f.code] || {}).mid || '', fin: f.newGrade }; });

    var pts = BASE.gwa * BASE.counted, counted = BASE.counted, earned = BASE.earned, failedUnits = 0, def = [];
    var resolved = (UI.resolved || []).filter(function (r) { return r.adv === 'maria' && r.course === 'CSci 102'; })[0];
    var inc = (UI.grades || {})['CSci 102'];
    var incGrade = resolved ? resolved.grade : inc && inc.inc ? inc.fin : null;
    if (incGrade != null) {
      var g0 = parseFloat(incGrade); counted += 3; pts += g0 * 3;
      if (g0 <= 3) earned += 3; else def.push({ code: 'CSci 102', kind: 'Failed' });
    } else def.push({ code: 'CSci 102', kind: 'Unresolved INC' });
    Object.keys(done).forEach(function (code) {
      var u = UNITS[code] || 3, f = done[code].fin;
      if (/^\d(\.\d+)?$/.test(f)) {
        var g = parseFloat(f); counted += u; pts += g * u;
        if (g <= 3) earned += u; else { failedUnits += u; def.push({ code: code, kind: 'Failed' }); }
      } else if (f === 'INC') def.push({ code: code, kind: 'Unresolved INC' });
    });
    var gwa = (pts / counted).toFixed(2), idx = yearIndex(earned), openInc = def.filter(function (d) { return d.kind === 'Unresolved INC'; }).length;
    var kinds = {}; def.forEach(function (d) { (kinds[d.kind] = kinds[d.kind] || []).push(d.code); });
    return {
      gwa: gwa, counted: counted, earned: earned, total: BASE.total, pct: earned / BASE.total * 100,
      yearStanding: ORD[idx] + ' year', yearLabel: ORD[idx] + ' Year', standing: failedUnits >= 12 ? 'Delinquency flag' : 'Good standing', flagged: failedUnits >= 12,
      openInc: openInc, deficiencies: def, defCount: def.length,
      defNote: def.length ? Object.keys(kinds).map(function (k) { return k + ': ' + kinds[k].join(', '); }).join(' · ') : 'None',
      defCodes: def.length ? def.map(function (d) { return d.code; }).join(', ') : 'None',
      defModal: def.map(function (d) { return d.code + (d.kind === 'Failed' ? ' · Failed' : ' · INC'); }).join(', ')
    };
  }
  root.SAAIS_METRICS = { maria: maria };

  /* ---------- adviser-side screens ---------- */
  function textNode(el, text) { var n = [].slice.call(el.childNodes).filter(function (x) { return x.nodeType === 3; })[0]; if (n) n.textContent = text; else el.insertBefore(document.createTextNode(text), el.firstChild); }
  function apply() {
    var title = [].slice.call(document.querySelectorAll('h1')).filter(function (h) { return /^Maria Isabel Bautista$/.test(h.textContent.trim()); })[0];
    var m = maria();
    /* advisee header: "2nd Year" and the standing chip */
    if (title) {
      var p = title.parentElement.querySelector('p');
      if (p) {
        [].slice.call(p.childNodes).forEach(function (n) { if (n.nodeType === 3 && /\d(st|nd|rd|th) Year/.test(n.textContent)) n.textContent = n.textContent.replace(/\d(st|nd|rd|th) Year/, m.yearLabel); });
        var chip = [].slice.call(p.querySelectorAll('span')).filter(function (s) { return /Good standing|Delinquency flag/.test(s.textContent); })[0];
        if (chip) [].slice.call(chip.childNodes).forEach(function (n) { if (n.nodeType === 3) n.textContent = m.standing; });
      }
    }
    /* checklist tiles */
    [].slice.call(document.querySelectorAll('.kick')).forEach(function (k) {
      var card = k.parentElement, big = card.querySelector('.dsp'), note = card.lastElementChild, label = k.textContent.trim();
      if (!big || big === note) return;
      if (label === 'Cumulative GWA') big.textContent = m.gwa;
      else if (label === 'Counted units') { textNode(big, String(m.counted)); }
      else if (label === 'Year standing') { big.textContent = m.yearStanding; note.textContent = m.earned + ' of ' + m.total + ' units earned'; }
      else if (label === 'Deficiencies') { big.textContent = String(m.defCount); note.textContent = m.defCount ? m.defNote : 'No open deficiencies'; }
    });
    /* roster row */
    [].slice.call(document.querySelectorAll('#ros-body tr.row[data-q]')).forEach(function (tr) {
      if (tr.dataset.q.indexOf('maria isabel bautista') !== 0) return;
      var c = tr.children;
      var sub = c[0].querySelector('div'); if (sub) [].slice.call(sub.childNodes).forEach(function (n) { if (n.nodeType === 3) n.textContent = n.textContent.replace(/\d(st|nd|rd|th) Year/, m.yearLabel); });
      c[2].textContent = m.yearStanding; c[3].querySelector('.mono').textContent = m.gwa; c[6].textContent = m.defCodes;
      var chip = c[5].querySelector('span'); if (chip) [].slice.call(chip.childNodes).forEach(function (n) { if (n.nodeType === 3) n.textContent = m.standing; });
      tr.dataset.standing = m.flagged ? 'flagged' : 'good'; tr.dataset.q = tr.dataset.q.replace(/\d(st|nd|rd|th) year/, m.yearStanding);
    });
    /* dashboard: how many advisees have deficiencies, and who */
    var card = [].slice.call(document.querySelectorAll('.kick')).filter(function (k) { return /With deficiencies/.test(k.textContent); })[0];
    if (card) {
      var others = 3, count = others + (m.defCount ? 1 : 0), dsp = card.parentElement.querySelector('.dsp'); if (dsp) dsp.textContent = String(count);
      var dlg = document.getElementById('dlg-def');
      if (dlg) {
        var row = [].slice.call(dlg.querySelectorAll('a')).filter(function (a) { return /Maria Isabel Bautista/.test(a.textContent); })[0];
        if (row) { if (!m.defCount) row.remove(); else { var spans = row.querySelectorAll(':scope > span'); if (spans[1]) spans[1].textContent = m.defModal; } }
      }
    }
    var mean = [].slice.call(document.querySelectorAll('.kick')).filter(function (k) { return /Mean GWA/.test(k.textContent); })[0];
    if (mean) { var d2 = mean.parentElement.querySelector('.dsp'); if (d2 && !d2.dataset.base) { d2.dataset.base = d2.textContent; d2.textContent = ((1.98 * 5 - 1.58 + parseFloat(m.gwa)) / 5).toFixed(2); } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})(window);
