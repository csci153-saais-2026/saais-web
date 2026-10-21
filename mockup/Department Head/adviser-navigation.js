/* Mobile navigation for the adviser screens, preserving their existing controls. */
(() => {
 const sidebar = document.querySelector('.head-adviser-sidebar');
 if (!sidebar) return;
 const workspace = sidebar.nextElementSibling;
 const params = new URLSearchParams(location.search);
 if (params.get('readonly') === '1') {
  /* Department Head > Students opens an advisee record read-only, with Students (not Advisees) as the active section. */
  const main = document.querySelector('main');
  const advisees = sidebar.querySelector('a[data-nav="advisees"]');
  const idle = sidebar.querySelector('a[data-nav="encode"]');
  const students = sidebar.querySelector('a[href="Students.dc.html"]');
  if (advisees && idle && students) {
   const bar = advisees.querySelector('[data-bar]');
   students.style.cssText = advisees.style.cssText;
   students.prepend(bar.cloneNode(true));
   students.setAttribute('aria-current', 'page');
   advisees.style.cssText = idle.style.cssText;
   bar.hidden = true;
   advisees.removeAttribute('aria-current');
   sidebar.querySelectorAll('details.role-nav-section').forEach(section => { section.open = section.contains(students); });
  }
  const crumb = document.querySelector('#crumb a[href$="AdviserAdvisees.dc.html"]');
  if (crumb) { crumb.textContent = 'Students'; crumb.href = 'Students.dc.html'; }
  const name = params.get('name');
  const heading = main && main.querySelector('h1');
  if (name && heading) {
   heading.textContent = name;
   const avatar = heading.closest('div').previousElementSibling;
   if (avatar) avatar.textContent = name.split(' ').map(part => part[0]).slice(0, 2).join('');
   const number = heading.parentElement.querySelector('.mono');
   if (number && params.get('student')) number.textContent = params.get('student');
   const mail = heading.parentElement.querySelector('a[href^="mailto:"]');
   if (mail) { mail.textContent = name.toLowerCase().split(' ').join('.') + '@school.edu.ph'; mail.href = 'mailto:' + mail.textContent; }
   document.querySelectorAll('#crumb a.crumb-link').forEach(link => { if (/Advisee(Checklist|Grades|History)\.dc\.html$/.test(link.getAttribute('href'))) link.textContent = name; });
  }
  document.querySelectorAll('a.tab').forEach(tab => {
   if (/Advisee(Curriculum|Advising|Notes)\.dc\.html$/.test(tab.getAttribute('href'))) tab.remove();
   else tab.href = tab.getAttribute('href') + location.search;
  });
  document.querySelectorAll('main [data-grade]').forEach(button => button.remove());
  if (main) {
   const notice = document.createElement('div');
   notice.setAttribute('role', 'status');
   notice.style.cssText = "margin-bottom:16px;padding:12px 16px;border:1px solid #E1DBC6;border-radius:6px;background:#EFEADB;color:#16200C;font:450 14px/1.5 'IBM Plex Sans','Segoe UI',sans-serif";
   notice.innerHTML = '<strong>Read-only view.</strong> Department Heads can review this record but not change it.';
   main.prepend(notice);
  }
 }
 const header = workspace.querySelector('header');
 const trigger = document.createElement('button');
 trigger.type = 'button';
 trigger.className = 'adviser-menu-toggle';
 trigger.textContent = 'Menu';
 trigger.setAttribute('aria-controls', 'head-navigation');
 trigger.setAttribute('aria-expanded', 'false');
 header.prepend(trigger);
 const close = document.createElement('button');
 close.type = 'button';
 close.className = 'adviser-menu-close';
 close.textContent = 'Close navigation';
 sidebar.prepend(close);
 const backdrop = document.createElement('button');
 backdrop.type = 'button';
 backdrop.className = 'adviser-nav-backdrop';
 backdrop.setAttribute('aria-label', 'Close navigation');
 backdrop.hidden = true;
 document.body.append(backdrop);
 function setOpen(open) {
  sidebar.classList.toggle('open', open);
  trigger.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !open;
  workspace.inert = open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) close.focus();
  else if (sidebar.contains(document.activeElement)) trigger.focus();
 }
 trigger.addEventListener('click', () => setOpen(true));
 close.addEventListener('click', () => setOpen(false));
 backdrop.addEventListener('click', () => setOpen(false));
 sidebar.addEventListener('click', event => { if (event.target.closest('a') && sidebar.classList.contains('open')) setOpen(false); });
 document.addEventListener('keydown', event => {
  if (!sidebar.classList.contains('open') || document.querySelector('dialog[open]')) return;
  if (event.key === 'Escape') setOpen(false);
  if (event.key === 'Tab') {
   const items = [...sidebar.querySelectorAll('a[href],button,summary')].filter(el => el.getClientRects().length);
   const first = items[0], last = items[items.length - 1];
   if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
   else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
 });
 matchMedia('(max-width:768px)').addEventListener('change', () => setOpen(false));
})();
