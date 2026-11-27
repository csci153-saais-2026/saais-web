const fs = require('fs');
const path = require('path');

function findDcHtml(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '_gen') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(findDcHtml(p));
    else if (entry.name.endsWith('.dc.html')) out.push(p);
  }
  return out;
}

const files = findDcHtml('.');
const keys = ['Advisees','Programs','Curricula','Accounts','Audit log','Reassignment','Course catalog','Terms & offerings','My profile','Enrollment history','Grades & GWA','Curriculum checklist','Add note','Record attempt','Sign out','Sign in','Dashboard','Overview','Checklist','Notes','Cancel','Continue with override'];
for (const k of keys) {
  let total = 0; const perFile = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    const re = new RegExp('>' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<', 'g');
    const c = (s.match(re) || []).length;
    if (c > 0) { total += c; perFile.push(f + ':' + c); }
  }
  console.log(k, total, '|', perFile.join(', '));
}
