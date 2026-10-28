/* Shared audit trail for the mock-up. Portals call SAAIS_AUDIT.add(...) when someone changes a record;
   the audit-log screens (Department Head, Dean, System Admin and each advisee's Audit log tab) read it back.
   Stored in localStorage (saais-audit-v1) with the rest of the demo state. */
(function (root) {
  'use strict';
  var KEY = 'saais-audit-v1', MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function read() { try { var a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch (e) { return root.__saaisAudit || []; } }
  function write(list) { root.__saaisAudit = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp(ts) {
    var d = new Date(ts), h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    return {
      date: pad(d.getDate()) + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(),
      iso: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      time12: pad(h % 12 || 12) + ':' + pad(d.getMinutes()) + ' ' + ap,
      time24: pad(h) + ':' + pad(d.getMinutes())
    };
  }
  root.SAAIS_AUDIT = {
    /* who: person, action: 'View' | 'Change' | 'Sign-in', student: name (or '' when none), sid: student number, details: what happened */
    add: function (who, action, student, details, sid, label) {
      var list = read();
      list.unshift({ ts: Date.now(), who: who, action: action, student: student || '', sid: sid || '', details: details, label: label || '' });
      write(list.slice(0, 300));
    },
    entries: read,
    stamp: stamp
  };
})(window);
