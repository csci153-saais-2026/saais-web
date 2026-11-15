/* Shared presentation behavior for the two department portal shells. */
(() => {
  const sidebar = document.querySelector('.sidebar');
  const workspace = document.querySelector('.workspace');
  const openButton = document.querySelector('[data-menu-open]');
  const backdrop = document.querySelector('.nav-backdrop');
  const userButton = document.querySelector('.user-trigger');
  const userMenu = document.querySelector('#user-menu-list');
  const modal = document.querySelector('#preview-dialog');
  const mobile = matchMedia('(max-width:768px)');
  let returnFocus;
  let messageTimer;

  function setDrawer(open) {
    sidebar.classList.toggle('open', open);
    openButton.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    workspace.inert = open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      returnFocus = document.activeElement;
      sidebar.querySelector('[data-menu-close]').focus();
    } else if (returnFocus) {
      returnFocus.focus();
      returnFocus = null;
    }
  }

  function setUserMenu(open) {
    userMenu.hidden = !open;
    userButton.setAttribute('aria-expanded', String(open));
  }

  function message(text) {
    const toast = document.querySelector('.toast');
    clearTimeout(messageTimer);
    toast.textContent = text;
    toast.hidden = false;
    messageTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-menu-open]')) setDrawer(true);
    if (event.target.closest('[data-menu-close]')) setDrawer(false);
    if (event.target.closest('.user-trigger')) setUserMenu(userMenu.hidden);
    else if (!event.target.closest('.user-menu')) setUserMenu(false);
    if (event.target.closest('[data-signout]')) {
      setUserMenu(false);
      message('Static preview only. No active account session is changed.');
    }
    if (event.target.closest('[data-dialog="help"]')) {
      document.querySelector('#dialog-title').textContent = 'Department portal guide';
      const body = document.querySelector('#dialog-content');
      body.replaceChildren();
      const intro = document.createElement('p');
      intro.textContent = 'Use the sidebar to move between your department’s pages. Search and filters help you locate records; the main button on each page opens the related action.';
      const note = document.createElement('p');
      note.className = 'caption';
      note.textContent = 'This is a static design with sample records. Form actions preview the workflow without saving changes.';
      body.append(intro, note);
      document.querySelector('#dialog-confirm').hidden = true;
      const rejection = modal.querySelector('[data-reject]');
      if (rejection) rejection.remove();
      modal.showModal();
    }
    if (event.target.closest('[data-dialog]')) decorateTables(modal);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.open) {
      if (!userMenu.hidden) { setUserMenu(false); userButton.focus(); }
      else if (sidebar.classList.contains('open')) setDrawer(false);
    }
    if (event.key === 'Tab' && mobile.matches && sidebar.classList.contains('open') && !modal.open) {
      const focusable = [...sidebar.querySelectorAll('a[href],button')].filter(el => !el.closest('[hidden]'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
  });
  mobile.addEventListener('change', () => setDrawer(false));

  // Use the same stacked table cards as the existing portals on small screens.
  function decorateTables(root) {
    root.querySelectorAll('table').forEach(table => {
      table.classList.add('data', 'cards');
      const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim() || (th.querySelector('input') ? 'Select' : 'Actions'));
      table.querySelectorAll('tbody tr').forEach(row => [...row.cells].forEach((cell, i) => {
        cell.dataset.label = headers[i] || 'Actions';
      }));
    });
  }
  decorateTables(document);
})();
