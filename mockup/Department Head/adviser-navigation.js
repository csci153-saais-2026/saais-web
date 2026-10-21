/* Mobile navigation for the adviser screens, preserving their existing controls. */
(() => {
 const sidebar = document.querySelector('.head-adviser-sidebar');
 if (!sidebar) return;
 const workspace = sidebar.nextElementSibling;
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
