/* Dean copied-page routing and role control. */
(() => {
  function init() {
    const profile = document.querySelector('.dean-profile');
    if (profile) {
      const trigger = profile.querySelector('.dean-profile-trigger');
      const popup = profile.querySelector('.dean-profile-popup');
      const items = Array.from(popup.querySelectorAll('a, button'));
      const setOpen = open => {
        popup.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
      };
      trigger.addEventListener('click', () => setOpen(popup.hidden));
      trigger.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          items[event.key === 'ArrowDown' ? 0 : items.length - 1].focus();
        }
      });
      profile.addEventListener('keydown', event => {
        if (event.key === 'Escape') { setOpen(false); trigger.focus(); }
        if (popup.contains(event.target) && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          const offset = event.key === 'ArrowDown' ? 1 : -1;
          items[(items.indexOf(document.activeElement) + offset + items.length) % items.length].focus();
        }
      });
      document.addEventListener('click', event => { if (!profile.contains(event.target)) setOpen(false); });
      profile.addEventListener('focusout', event => { if (!profile.contains(event.relatedTarget)) setOpen(false); });
      profile.querySelector('[data-dean-signout]').addEventListener('click', () => {
        try { sessionStorage.removeItem('saais-session'); } catch (_) {}
        location.href = '../../Login.dc.html';
      });
    }
    document.addEventListener('click', event => {
      const adviser = event.target.closest('#proto-bar a');
      if (adviser && adviser.textContent.trim() === 'Adviser') {
        event.preventDefault();
        location.href = '../../Adviser/AdviserDashboard.dc.html';
      }
    });
    document.addEventListener('click', event => {
      const inert = event.target.closest('a[aria-disabled="true"]');
      if (inert) event.preventDefault();
      const row = event.target.closest('#student-rows [data-student]');
      if (row) location.href = 'DHAdviseeChecklist.dc.html?readonly=1&student=' + encodeURIComponent(row.dataset.student) + '&name=' + encodeURIComponent(row.cells[0].textContent.trim());
    });
    document.addEventListener('keydown', event => {
      const row = event.target.closest('#student-rows [data-student]');
      if (row && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); row.click();
      }
    });
    const params = new URLSearchParams(location.search);
    if (params.get('readonly') === '1') {
      /* Dean > Students opens an advisee record read-only, with Students (not Advisees) as the active section. */
      const main = document.querySelector('main');
      const advisees = document.querySelector('aside a[data-nav="advisees"]');
      const students = document.querySelector('aside a[href$="DeanStudents.dc.html"]');
      if (advisees && students) {
        const barOf = link => link.querySelector('[data-bar]');
        [advisees.style.cssText, students.style.cssText] = [students.style.cssText, advisees.style.cssText];
        barOf(advisees).hidden = true;
        barOf(students).hidden = false;
        advisees.removeAttribute('aria-current');
        students.setAttribute('aria-current', 'page');
        document.querySelectorAll('aside details.dean-role-section').forEach(section => { section.open = section.contains(students); });
      }
      const crumb = document.querySelector('#crumb a[href$="Advisees.dc.html"]');
      if (crumb && students) { crumb.textContent = 'Students'; crumb.href = students.getAttribute('href'); }
      const name = params.get('name');
      const heading = main && main.querySelector('h1');
      if (name && heading) {
        heading.textContent = name;
        const avatar = heading.closest('div').previousElementSibling;
        if (avatar) avatar.textContent = name.split(' ').map(part => part[0]).slice(0, 2).join('');
        const number = heading.parentElement.querySelector('.mono');
        if (number && params.get('student')) number.textContent = params.get('student');
        const mail = heading.parentElement.querySelector('a[href^="mailto:"]');
        if (mail) { mail.textContent = name.toLowerCase().split(' ').join('.') + '@example.edu.ph'; mail.href = 'mailto:' + mail.textContent; }
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
        notice.innerHTML = '<strong>Read-only Dean view.</strong> Opening this record is recorded in the audit log.';
        main.prepend(notice);
      }
    }
    document.querySelectorAll('aside [data-nav]').forEach(a => {
      if (a.getAttribute('href') === '#') a.removeAttribute('data-nav');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
