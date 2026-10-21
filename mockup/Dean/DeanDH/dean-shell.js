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
