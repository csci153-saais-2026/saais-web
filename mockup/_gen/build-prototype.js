// Build script: stitches the SAAIS .dc.html artboards into one clickable prototype.
// Run: node _gen/build-prototype.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// route slug -> source file. '' is the landing page (home route).
const ROUTES = {
  '': 'Main.dc.html',
  'login': 'Login.dc.html',
  'invite': 'Invite.dc.html',
  'docs': 'Docs.dc.html',

  'student/dashboard': 'Student/StudentDashboard.dc.html',
  'student/checklist': 'Student/StudentChecklist.dc.html',
  'student/grades': 'Student/StudentGrades.dc.html',
  'student/history': 'Student/StudentHistory.dc.html',
  'student/profile': 'Student/StudentProfile.dc.html',

  'adviser/dashboard': 'Adviser/AdviserDashboard.dc.html',
  'adviser/advisees': 'Adviser/AdviserAdvisees.dc.html',
  'adviser/enrollment/new': 'Adviser/RecordAttempt.dc.html',
  'adviser/advisees/detail': 'Adviser/AdviseeDetail.dc.html',
  'adviser/advisees/notes': 'Adviser/AdviseeNotes.dc.html',
  'adviser/advisees/checklist': 'Adviser/AdviseeChecklist.dc.html',
  'adviser/reassignment': 'Adviser/AdviserReassign.dc.html',

  'admin/dashboard': 'Admin/AdminDashboard.dc.html',
  'admin/accounts': 'Admin/AdminAccounts.dc.html',
  'admin/programs': 'Admin/AdminPrograms.dc.html',
  'admin/curricula': 'Admin/AdminCurricula.dc.html',
  'admin/courses': 'Admin/AdminCourses.dc.html',
  'admin/course-offerings': 'Admin/AdminOfferings.dc.html',
  'admin/audit-log': 'Admin/AdminAudit.dc.html',

  'design-system': 'DesignSystem.dc.html',
  'mobile/student-home': 'MobileStudentHome.dc.html',
  'mobile/checklist': 'MobileChecklist.dc.html',
  'mobile/advisees': 'MobileAdvisees.dc.html',
};

const TITLES = {
  '': 'Landing page',
  'login': 'Sign in',
  'invite': 'Set password (invite link)',
  'docs': 'API contract',
  'student/dashboard': 'Student · Dashboard',
  'student/checklist': 'Student · Curriculum checklist',
  'student/grades': 'Student · Grades & GWA',
  'student/history': 'Student · Enrollment history',
  'student/profile': 'Student · My profile',
  'adviser/dashboard': 'Adviser · Dashboard',
  'adviser/advisees': 'Adviser · Advisees',
  'adviser/enrollment/new': 'Adviser · Record attempt',
  'adviser/advisees/detail': 'Adviser · Advisee overview',
  'adviser/advisees/notes': 'Adviser · Advisee notes',
  'adviser/advisees/checklist': 'Adviser · Advisee checklist',
  'adviser/reassignment': 'Adviser · Reassignment',
  'admin/dashboard': 'Admin · Dashboard',
  'admin/accounts': 'Admin · Accounts',
  'admin/programs': 'Admin · Programs',
  'admin/curricula': 'Admin · Curricula',
  'admin/courses': 'Admin · Course catalog',
  'admin/course-offerings': 'Admin · Terms & offerings',
  'admin/audit-log': 'Admin · Audit log',
  'design-system': 'Design system sheet',
  'mobile/student-home': 'Mobile · Student home',
  'mobile/checklist': 'Mobile · Checklist',
  'mobile/advisees': 'Mobile · Advisees',
};

const SITEMAP_GROUPS = [
  { label: 'Public site & auth', routes: ['', 'login', 'invite', 'docs'] },
  { label: 'Student portal', routes: ['student/dashboard', 'student/checklist', 'student/grades', 'student/history', 'student/profile'] },
  { label: 'Adviser portal', routes: ['adviser/dashboard', 'adviser/advisees', 'adviser/advisees/detail', 'adviser/advisees/checklist', 'adviser/advisees/notes', 'adviser/enrollment/new', 'adviser/reassignment'] },
  { label: 'Admin portal', routes: ['admin/dashboard', 'admin/accounts', 'admin/programs', 'admin/curricula', 'admin/courses', 'admin/course-offerings', 'admin/audit-log'] },
  { label: 'Design system & mobile', routes: ['design-system', 'mobile/student-home', 'mobile/checklist', 'mobile/advisees'] },
];

function slugId(slug) {
  return 'view-' + (slug === '' ? 'home' : slug.replace(/\//g, '-'));
}

function extract(file) {
  const src = read(file);
  const styleMatch = src.match(/<helmet>\s*<style>([\s\S]*?)<\/style>\s*<\/helmet>/);
  const bodyMatch = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
  if (!styleMatch || !bodyMatch) throw new Error('Could not parse ' + file);
  let css = styleMatch[1];
  css = css.replace(/@import[^;]+;\s*/, '');
  css = css.replace('body {', '& {');
  return { css: css.trim(), html: bodyMatch[1].trim() };
}

const views = [];
for (const [slug, file] of Object.entries(ROUTES)) {
  const { css, html } = extract(file);
  views.push({ slug, id: slugId(slug), css, html, title: TITLES[slug] });
}

const GOOGLE_FONTS_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;450;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

const scopedCss = views.map(v => `.view[data-route="${v.slug}"] {\n${v.css}\n}`).join('\n\n');

const sections = views.map(v =>
  `<section class="view" id="${v.id}" data-route="${v.slug}" hidden>\n${v.html}\n</section>`
).join('\n\n');

const sitemapHtml = SITEMAP_GROUPS.map(g => `
  <div class="sm-group">
    <div class="sm-group-title">${g.label}</div>
    ${g.routes.map(r => `<button type="button" class="sm-item" data-goto="${r}">${TITLES[r]}</button>`).join('\n    ')}
  </div>`).join('\n');

const ROUTES_JSON = JSON.stringify(Object.keys(ROUTES));

const template = fs.readFileSync(path.join(__dirname, 'shell-template.html'), 'utf8');

const out = template
  .replace('/*__FONTS_IMPORT__*/', GOOGLE_FONTS_IMPORT)
  .replace('/*__SCOPED_CSS__*/', scopedCss)
  .replace('<!--__SECTIONS__-->', sections)
  .replace('<!--__SITEMAP__-->', sitemapHtml)
  .replace('/*__ROUTES_JSON__*/', ROUTES_JSON);

fs.writeFileSync(path.join(ROOT, 'prototype.html'), out, 'utf8');
console.log('Wrote prototype.html with', views.length, 'views.');
