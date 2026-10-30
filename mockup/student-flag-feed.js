/* Adviser-side Grade flags page: lists flags students filed in the Student portal and records the adviser's decision.
   Loaded before the page script so its Fix grade / Reject handlers bind to these rows too. */
(function () {
  var KEY = 'saais-grade-flags';
  var body = document.getElementById('flag-body');
  var tpl = body && body.querySelector('tr.row');
  if (!tpl) return;

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function update(id, patch) {
    var list = read();
    list.forEach(function (f) { if (f.id === id) Object.keys(patch).forEach(function (k) { f[k] = patch[k]; }); });
    write(list);
  }

  var empty = body.querySelector('[data-empty]');
  read().filter(function (f) { return f.status === 'open'; }).forEach(function (f) {
    var tr = tpl.cloneNode(true), td = tr.children;
    tr.dataset.flag = f.id; tr.dataset.sid = f.id; tr.dataset.name = f.studentName; tr.dataset.course = f.code; tr.dataset.grade = 'grade ' + f.grade;
    td[0].children[0].textContent = f.studentName;
    td[0].querySelector('.mono').textContent = f.studentId;
    td[1].querySelector('span').textContent = f.code;
    td[2].querySelector('span').textContent = f.grade;
    td[3].textContent = f.reason + ': ' + f.details;
    td[4].textContent = f.filed;
    tr.querySelector('[data-fix]').dataset.fix = f.id;
    tr.querySelector('[data-reject]').dataset.reject = f.id;
    body.insertBefore(tr, empty);
  });
  var count = document.getElementById('flag-count');
  if (count) count.textContent = body.querySelectorAll('tr.row').length;

  /* The page marks a row data-closed when the adviser saves; persist that outcome for the student. */
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      var tr = r.target, id = tr.dataset.sid;
      if (!id || !tr.dataset.closed) return;
      var fixed = /Fixed/.test(tr.textContent), val = function (i) { var el = document.getElementById(i); return el ? el.value.trim() : ''; };
      update(id, fixed ? { status: 'fixed', newGrade: val('fix-grade'), response: val('fix-reason') } : { status: 'rejected', response: val('rej-reason') });
    });
  }).observe(body, { attributes: true, attributeFilter: ['data-closed'], subtree: true });
})();
