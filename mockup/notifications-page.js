/* Notifications screen. Renders into #notif-root inside each portal's own shell (sidebar and top bar stay).
   Reached only from "See all notifications" in the bell popover. Data and read state: window.SAAIS_NOTIFS (portal-ui.js). */
(() => {
  'use strict';
  const start = () => {
    const root = document.getElementById('notif-root'), N = window.SAAIS_NOTIFS;
    if (!root || !N) return;
    const ICON = {
      note: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
      grade: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
      alert: '<path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 9.5v4.5M12 17h.01"/>',
      flag: '<path d="M5.5 21V3.5M5.5 4.5h12l-2.4 4 2.4 4h-12"/>',
      import: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
      person: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20a6.5 6.5 0 0113 0"/>',
      transfer: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
      report: '<path d="M4 3v18h18M9 17v-5m5 5V7m5 10V4"/>'
    };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const style = document.createElement('style');
    style.textContent = `
#notif-root { font-family: 'IBM Plex Sans','Segoe UI',system-ui,sans-serif; color: #16200C; }
#notif-root .ntf-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; flex-wrap: wrap; }
#notif-root h1 { margin: 0; font-family: 'Syne','Segoe UI',system-ui,sans-serif; font-weight: 700; font-size: 30px; letter-spacing: -0.01em; line-height: 1.08; }
#notif-root .ntf-sub { margin: 6px 0 0; color: #6E6C58; font-size: 14.5px; }
#notif-root .ntf-btn { display: inline-flex; align-items: center; padding: 9px 16px; border-radius: 8px; font: 600 14px 'IBM Plex Sans','Segoe UI',sans-serif; cursor: pointer; background: #FFFFFF; color: #16200C; border: 1px solid #E1DBC6; min-height: 0; }
#notif-root .ntf-btn:hover:not(:disabled) { border-color: #2F4A12; }
#notif-root .ntf-btn:disabled { opacity: .55; cursor: default; }
#notif-root .ntf-tabs { display: inline-flex; padding: 3px; border: 1px solid #E1DBC6; border-radius: 8px; background: #FFFFFF; margin-bottom: 16px; }
#notif-root .ntf-tabs button { border: 0; padding: 7px 16px; border-radius: 6px; background: transparent; color: #6E6C58; font: 600 13.5px 'IBM Plex Sans','Segoe UI',sans-serif; cursor: pointer; min-height: 0; }
#notif-root .ntf-tabs button[aria-pressed=true] { background: #2F4A12; color: #FBF8EF; }
#notif-root .ntf-panel { background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 6px; overflow: hidden; }
#notif-root ul { list-style: none; margin: 0; padding: 0; }
#notif-root li + li { border-top: 1px solid #EFEADB; }
#notif-root .ntf-item { display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px; color: inherit; text-decoration: none; }
#notif-root a.ntf-item:hover { background: #F7F3E6; }
#notif-root .ntf-dot { flex-shrink: 0; width: 9px; height: 9px; margin-top: 7px; border-radius: 50%; background: transparent; }
#notif-root .is-unread .ntf-dot { background: #E0A82E; }
#notif-root .ntf-ico { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; background: #ECE8DA; color: #5C5A4C; display: flex; align-items: center; justify-content: center; }
#notif-root .ntf-ico svg { width: 17px; height: 17px; }
#notif-root .ntf-body { min-width: 0; flex: 1; }
#notif-root .ntf-body strong { display: block; font-weight: 500; font-size: 14.5px; }
#notif-root .is-unread .ntf-body strong { font-weight: 600; }
#notif-root .ntf-body p { margin: 3px 0 0; color: #6E6C58; font-size: 13.5px; }
#notif-root .ntf-go { margin-top: 6px; display: inline-block; font-size: 13px; font-weight: 600; color: #2F4A12; }
#notif-root .ntf-when { flex-shrink: 0; color: #6E6C58; font-size: 12.5px; white-space: nowrap; }
#notif-root .ntf-empty { padding: 44px 20px; text-align: center; color: #6E6C58; font-size: 14px; }
#notif-root .ntf-foot { margin-top: 20px; color: #6E6C58; font-size: 12px; }
#notif-root button:focus-visible, #notif-root a:focus-visible { outline: 2px solid #2F4A12; outline-offset: 2px; }
@media (max-width: 600px) { #notif-root .ntf-item { flex-wrap: wrap; } #notif-root .ntf-when { order: 3; margin-left: 63px; } }`;
    document.head.appendChild(style);
    root.innerHTML =
      '<div class="ntf-top"><div><h1>Notifications</h1><p class="ntf-sub" id="ntf-sub"></p></div>' +
      '<button type="button" class="ntf-btn" id="ntf-all">Mark all as read</button></div>' +
      '<div class="ntf-tabs" role="group" aria-label="Filter notifications">' +
      '<button type="button" data-filter="all" aria-pressed="true">All</button>' +
      '<button type="button" data-filter="unread" aria-pressed="false">Unread <span id="ntf-count"></span></button></div>' +
      '<section class="ntf-panel" aria-live="polite"><ul id="ntf-list"></ul></section>' +
      '<p class="ntf-foot">Sample records for presentation</p>';
    let filter = 'all';
    const $ = id => document.getElementById(id);
    const draw = () => {
      const all = N.list(), unread = all.filter(n => !n.read), shown = filter === 'unread' ? unread : all;
      $('ntf-count').textContent = unread.length ? '(' + unread.length + ')' : '';
      $('ntf-all').disabled = !unread.length;
      $('ntf-sub').textContent = unread.length ? unread.length + ' unread of ' + all.length + ' notifications.' : 'You are all caught up.';
      $('ntf-list').innerHTML = shown.length ? shown.map(n => {
        const inner = '<span class="ntf-dot" aria-hidden="true"></span><span class="ntf-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICON[n.kind] || ICON.alert) + '</svg></span>' +
          '<span class="ntf-body"><strong>' + esc(n.title) + '</strong><p>' + esc(n.body) + '</p>' + (n.href ? '<span class="ntf-go">Open</span>' : '') + '</span><span class="ntf-when">' + esc(n.when) + '</span>';
        return '<li>' + (n.href ? '<a class="ntf-item' + (n.read ? '' : ' is-unread') + '" href="' + esc(n.href) + '" data-id="' + esc(n.id) + '">' + inner + '</a>'
          : '<div class="ntf-item' + (n.read ? '' : ' is-unread') + '" data-id="' + esc(n.id) + '">' + inner + '</div>') + '</li>';
      }).join('') : '<li class="ntf-empty">' + (filter === 'unread' ? 'No unread notifications.' : 'No notifications.') + '</li>';
    };
    $('ntf-list').addEventListener('click', e => {
      const it = e.target.closest('[data-id]'); if (!it) return;
      N.markRead(it.dataset.id); if (!it.matches('a')) draw();
    });
    $('ntf-all').addEventListener('click', () => { N.markAll(); draw(); });
    root.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
    window.addEventListener('saais-notifications', draw);
    draw();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
