"""Builds each portal's Notifications page from that portal's Change password page, so the sidebar,
top bar and profile menu are the portal's own. Only <main>, the title and the breadcrumb change.
Run from anywhere: python mockup/_gen/gen_notifications_pages.py"""
import os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
# (template, output, relative path to mockup root)
PAGES = [
    ('Student/StudentChangePassword.html', 'Student/StudentNotifications.html', '..'),
    ('Adviser/AdviserChangePassword.dc.html', 'Adviser/AdviserNotifications.dc.html', '..'),
    ('Department Head/AdviserChangePassword.dc.html', 'Department Head/Notifications.dc.html', '..'),
    ('Department Staff/ChangePassword.dc.html', 'Department Staff/Notifications.dc.html', '..'),
    ('SystemAdmin/AdminChangePassword.dc.html', 'SystemAdmin/AdminNotifications.dc.html', '..'),
    ('Dean/DeanAdviser/DeanAdviserChangePassword.dc.html', 'Dean/DeanAdviser/DeanAdviserNotifications.dc.html', '../..'),
    ('Dean/DeanDH/DHAdviserChangePassword.dc.html', 'Dean/DeanDH/DHAdviserNotifications.dc.html', '../..'),
]

def sub1(pattern, repl, s, flags=0):
    out, n = re.subn(pattern, lambda m: repl(m) if callable(repl) else repl, s, count=1, flags=flags)
    assert n == 1, pattern
    return out

for src, dst, rel in PAGES:
    s = open(os.path.join(ROOT, src), encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    s = s.replace('\r\n', '\n')
    s = sub1(r'<title>Change password([^<]*)</title>', lambda m: '<title>Notifications' + m.group(1) + '</title>', s)
    if 'aria-current="page">Change password<' in s:
        s = s.replace('aria-current="page">Change password<', 'aria-current="page">Notifications<', 1)
    else:  # System admin keeps its crumb in a span
        s = sub1(r'(<span id="crumb"[^>]*>)Change password<', lambda m: m.group(1) + 'Notifications<', s)
    s = sub1(r'(<main[^>]*>).*?(</main>)', lambda m: m.group(1) + '<div id="notif-root"></div>' + m.group(2), s, re.S)
    assert s.count('</body>') == 1, src
    s = s.replace('</body>', '<script src="%s/notifications-page.js" defer></script>\n</body>' % rel)
    open(os.path.join(ROOT, dst), 'w', encoding='utf-8', newline='').write(s.replace('\n', nl))
    print('wrote', dst)
