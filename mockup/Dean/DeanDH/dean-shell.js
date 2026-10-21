/* Dean copied-page routing and role control. */
(() => {
  function init() {
    const file = location.pathname.split('/').pop();
    const role = location.pathname.includes('/DeanDH/') ? 'DeanDH' : 'DeanAdviser';
    const header = document.querySelector('.app-top, .topbar, header');
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
    const iconPaths = {
      dashboard: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
      people: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 5.2a3.6 3.6 0 010 5.6M17.5 20a6.6 6.6 0 00-2.2-4.9"/>',
      grades: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
      import: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
      flag: '<path d="M5.5 21V3.5M5.5 4.5h12l-2.4 4 2.4 4h-12"/>',
      records: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    };
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      if (link.querySelector('svg')) return;
      const text = link.textContent.trim().toLowerCase();
      const key = text.includes('dashboard') ? 'dashboard' :
        text.includes('advisee') || text.includes('student') ? 'people' :
        text.includes('grade') ? (text.includes('import') ? 'import' : 'grades') :
        text.includes('audit') || text.includes('report') ? 'records' :
        text.includes('curriculum') || text.includes('equivalence') ? 'records' : 'flag';
      const icon = document.createElement('svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('width', '18');
      icon.setAttribute('height', '18');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '1.55');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = iconPaths[key];
      link.prepend(icon);
    });
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dean-role-switch';
    button.textContent = role === 'DeanDH' ? 'Dean DH' : 'Dean Adviser';
    button.title = 'Switch Dean workspace';
    button.setAttribute('aria-label', 'Current workspace: ' + button.textContent + '. Switch to ' + (role === 'DeanDH' ? 'Dean Adviser' : 'Dean DH'));
    button.addEventListener('click', () => {
      const next = role === 'DeanDH' ? 'DeanAdviser' : 'DeanDH';
      const counterparts = {
        "DHAdviseeAdvising.dc.html": "DeanAdviseeAdvising.dc.html",
        "DHAdviseeChecklist.dc.html": "DeanAdviseeChecklist.dc.html",
        "DHAdviseeCurriculum.dc.html": "DeanAdviseeCurriculum.dc.html",
        "DHAdviseeGrades.dc.html": "DeanAdviseeGrades.dc.html",
        "DHAdviseeHistory.dc.html": "DeanAdviseeHistory.dc.html",
        "DHAdviseeNotes.dc.html": "DeanAdviseeNotes.dc.html",
        "DHAdviser.dc.html": "DeanAdviser.dc.html",
        "DHAdviserAdvisees.dc.html": "DeanAdviserAdvisees.dc.html",
        "DHAdviserChangePassword.dc.html": "DeanAdviserChangePassword.dc.html",
        "DHAdviserDashboard.dc.html": "DeanAdviserDashboard.dc.html",
        "DHAdviserEncodeGrades.dc.html": "DeanAdviserEncodeGrades.dc.html",
        "DHAdviserGradeFlags.dc.html": "DeanAdviserGradeFlags.dc.html",
        "DHAdviserImportGrades.dc.html": "DeanAdviserImportGrades.dc.html",
        "DHDeanAudit.dc.html": "DeanAudit.dc.html",
        "DHDeanReports.dc.html": "DeanReports.dc.html",
        "DHDeanStudents.dc.html": "DeanStudents.dc.html",
      };
      const common = Object.prototype.hasOwnProperty.call(counterparts, file);
      const destination = common ? counterparts[file] :
        (next === 'DeanAdviser' ? 'DeanAdviserDashboard.dc.html' : 'DHAdviserDashboard.dc.html');
      try { localStorage.setItem('saais-dean-workspace', next); } catch (_) {}
      location.href = '../' + next + '/' + destination + (common ? location.search + location.hash : '');
    });
    document.addEventListener('click', event => {
      const adviser = event.target.closest('#proto-bar a');
      if (adviser && adviser.textContent.trim() === 'Adviser') {
        event.preventDefault();
        location.href = '../../Adviser/AdviserDashboard.dc.html';
      }
    });
    if (header) {
      header.append(button);
    } else {
      button.classList.add('dean-workspace-switch');
      document.body.append(button);
    }
    document.addEventListener('click', event => {
      const inert = event.target.closest('a[aria-disabled="true"]');
      if (inert) event.preventDefault();
      const row = event.target.closest('#student-rows [data-student]');
      if (row) location.href = 'DHAdviseeChecklist.dc.html?student=' + encodeURIComponent(row.dataset.student);
    });
    document.addEventListener('keydown', event => {
      const row = event.target.closest('#student-rows [data-student]');
      if (row && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); row.click();
      }
    });
    document.querySelectorAll('aside [data-nav]').forEach(a => {
      if (a.getAttribute('href') === '#') a.removeAttribute('data-nav');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
