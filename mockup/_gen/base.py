# -*- coding: utf-8 -*-
"""Shared shell + component helpers for the SAAIS mockup artboards."""
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Subfolder (relative to OUT) that the current gen_*.py script writes into.
# Set by the caller, e.g. `base.SUBDIR = "Student"`, before generating pages.
SUBDIR = ""

# ---------------------------------------------------------------- tokens
INK        = "#16200C"
FOREST     = "#2F4A12"
FOREST_DP  = "#1D2F0A"
FOREST_SF  = "#4A6B22"
GOLD       = "#E0A82E"
GOLD_DP    = "#B0761A"
GOLD_SF    = "#F6E2AE"
CREAM      = "#FBF8EF"
CREAM_DP   = "#F2EDDC"
SURFACE    = "#FFFFFF"
LINE       = "#E1DBC6"
LINE_SF    = "#EFEADB"
MUTED      = "#6E6C58"
MUTED_2    = "#8C8A76"

PASS_FG, PASS_BG = "#2C6430", "#E7F0E2"
FAIL_FG, FAIL_BG = "#9E2E1C", "#FAE7E1"
INC_FG,  INC_BG  = "#8A6206", "#FBF0D6"
ENR_FG,  ENR_BG  = "#2A4C6B", "#E4EDF4"
NEU_FG,  NEU_BG  = "#5C5A4C", "#ECE8DA"

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;450;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: %(CREAM)s;
  color: %(INK)s;
  font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
}
h1, h2, h3, h4 { margin: 0; font-weight: 600; letter-spacing: -0.011em; }
p { margin: 0; }
a { color: %(FOREST)s; text-decoration: none; }
a:hover { color: %(GOLD_DP)s; }
table { border-collapse: collapse; width: 100%%; }
.dsp { font-family: 'Syne', 'Segoe UI', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.01em; line-height: 1.08; }
.mono { font-family: 'IBM Plex Mono', 'Consolas', monospace; font-variant-ligatures: none; }
.kick { font-size: 11.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
.row:hover { background: %(LINE_SF)s; }
.navi:hover { background: rgba(224,168,46,0.10); }
.btnp:hover { background: %(FOREST_DP)s; }
.btns:hover { border-color: %(FOREST)s; }
""" % dict(CREAM=CREAM, INK=INK, FOREST=FOREST, GOLD_DP=GOLD_DP, FOREST_DP=FOREST_DP,
           LINE_SF=LINE_SF)

HEAD = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="%(PREFIX)ssupport.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>%(CSS)s  </style>
</helmet>
"""

TAIL = """</x-dc>
</body>
</html>
"""


def asset_prefix():
    return "../" if SUBDIR else ""


def write(name, body):
    path = os.path.join(OUT, SUBDIR, name + ".dc.html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(HEAD % dict(PREFIX=asset_prefix(), CSS=CSS))
        f.write(body.strip() + "\n")
        f.write(TAIL)
    return path


# ---------------------------------------------------------------- icons
_ICONS = {
 "grid":      '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
 "check":     '<path d="M4 12.5l5 5L20 6.5"/>',
 "list":      '<path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
 "chart":     '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 "clock":     '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
 "user":      '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>',
 "users":     '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 5.2a3.6 3.6 0 010 5.6M17.5 20a6.6 6.6 0 00-2.2-4.9"/>',
 "note":      '<path d="M6 3.5h9l4 4V20a.5.5 0 01-.5.5h-12A.5.5 0 016 20V4a.5.5 0 010-.5z"/><path d="M14.5 3.8V8h4.2M9 13h6M9 16.5h4"/>',
 "swap":      '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
 "plus":      '<path d="M12 5v14M5 12h14"/>',
 "book":      '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 012-2h13"/>',
 "cal":       '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 "shield":    '<path d="M12 3l7.5 3v6c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
 "cog":       '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4"/>',
 "search":    '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
 "bell":      '<path d="M18 15V10a6 6 0 10-12 0v5l-1.8 3h15.6z"/><path d="M9.8 21h4.4"/>',
 "alert":     '<path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 9.5v4.5M12 17h.01"/>',
 "flag":      '<path d="M5.5 21V3.5M5.5 4.5h12l-2.4 4 2.4 4h-12"/>',
 "down":      '<path d="M6 9l6 6 6-6"/>',
 "right":     '<path d="M9 5l7 7-7 7"/>',
 "left":      '<path d="M15 5l-7 7 7 7"/>',
 "out":       '<path d="M15 3h6v6M21 3l-9 9"/><path d="M18 13.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1h6.5"/>',
 "lock":      '<rect x="4.5" y="10" width="15" height="10.5" rx="1.6"/><path d="M8 10V7a4 4 0 018 0v3"/>',
 "mail":      '<rect x="3" y="5" width="18" height="14" rx="1.6"/><path d="M3.6 6l8.4 6.6L20.4 6"/>',
 "print":     '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="1.4"/><path d="M7 14h10v6.5H7z"/>',
 "file":      '<path d="M13.5 3H7a1.5 1.5 0 00-1.5 1.5v15A1.5 1.5 0 007 21h10a1.5 1.5 0 001.5-1.5V8z"/><path d="M13.5 3v5H18.5"/>',
 "node":      '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="12" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.4 7.2l7.2 3.6M8.4 16.8l7.2-3.6"/>',
 "sparks":    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
 "google":    '<path d="M21 12.2c0-.7-.06-1.36-.18-2H12v3.8h5.05a4.32 4.32 0 01-1.87 2.83v2.35h3.02C19.96 17.5 21 15.1 21 12.2z"/><path d="M12 21.5c2.53 0 4.65-.84 6.2-2.27l-3.02-2.35c-.84.56-1.9.9-3.18.9-2.44 0-4.5-1.65-5.24-3.87H3.64v2.42A9.5 9.5 0 0012 21.5z"/><path d="M6.76 13.9a5.7 5.7 0 010-3.64V7.84H3.64a9.5 9.5 0 000 8.48z"/><path d="M12 6.4c1.38 0 2.61.47 3.58 1.4l2.68-2.68C16.64 3.6 14.52 2.7 12 2.7a9.5 9.5 0 00-8.36 5.14l3.12 2.42C7.5 8.04 9.56 6.4 12 6.4z"/>',
 "logout":    '<path d="M9 21H5a1 1 0 01-1-1V4a1 1 0 011-1h4"/><path d="M15.5 16.5L20 12l-4.5-4.5M20 12H9"/>',
 "filter":    '<path d="M3.5 5.5h17l-6.6 7.6V20l-3.8-2.2v-4.7z"/>',
 "eye":       '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
 "layers":    '<path d="M12 3l9 4.8-9 4.8-9-4.8z"/><path d="M3 12.4l9 4.8 9-4.8M3 16.9l9 4.8 9-4.8"/>',
}


def ico(name, size=20, color="currentColor", sw=1.6):
    return ('<svg viewBox="0 0 24 24" width="%d" height="%d" fill="none" stroke="%s" '
            'stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" '
            'style="flex-shrink: 0">%s</svg>' % (size, size, color, sw, _ICONS[name]))


def ico_fill(name, size=20, color="currentColor"):
    return ('<svg viewBox="0 0 24 24" width="%d" height="%d" fill="%s" '
            'style="flex-shrink: 0">%s</svg>' % (size, size, color, _ICONS[name]))


# ---------------------------------------------------------------- atoms
def badge(text, fg, bg, dot=True):
    d = ('<span style="width: 6px; height: 6px; border-radius: 50%%; background: %s; '
         'flex-shrink: 0"></span>' % fg) if dot else ""
    return ('<span style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px 2px 8px; '
            'border-radius: 3px; background: %s; color: %s; font-size: 12px; font-weight: 600; '
            'letter-spacing: 0.01em; white-space: nowrap">%s%s</span>' % (bg, fg, d, text))


STATUS = {
    "passed":  (PASS_FG, PASS_BG, "Passed"),
    "failed":  (FAIL_FG, FAIL_BG, "Failed"),
    "inc":     (INC_FG,  INC_BG,  "INC"),
    "lapsed":  (FAIL_FG, FAIL_BG, "INC lapsed"),
    "enrolled": (ENR_FG, ENR_BG,  "Enrolled"),
    "dr":      (NEU_FG,  NEU_BG,  "Dropped"),
    "na":      (NEU_FG,  NEU_BG,  "No attendance"),
    "open":    (NEU_FG,  NEU_BG,  "Not taken"),
}


def status(key, label=None):
    fg, bg, txt = STATUS[key]
    return badge(label or txt, fg, bg)


def btn(label, kind="primary", icon=None, size="md"):
    pad = {"md": "9px 16px", "sm": "6px 12px", "lg": "13px 26px"}[size]
    fs = {"md": "14px", "sm": "13px", "lg": "15.5px"}[size]
    ic = (ico(icon, 16 if size != "lg" else 18) + " ") if icon else ""
    if kind == "primary":
        st = ("background: %s; color: %s; border: 1px solid %s" % (FOREST, CREAM, FOREST))
        cls = "btnp"
    elif kind == "gold":
        st = "background: %s; color: %s; border: 1px solid %s" % (GOLD, "#3A2A05", GOLD)
        cls = "btnp"
    elif kind == "ghost":
        st = "background: transparent; color: %s; border: 1px solid transparent" % FOREST
        cls = "btns"
    else:
        st = "background: %s; color: %s; border: 1px solid %s" % (SURFACE, INK, LINE)
        cls = "btns"
    return ('<button class="%s" style="display: inline-flex; align-items: center; gap: 7px; '
            'padding: %s; border-radius: 4px; font-family: inherit; font-size: %s; font-weight: 600; '
            'cursor: pointer; %s">%s%s</button>' % (cls, pad, fs, st, ic, label))


def card(inner, pad="20px", extra=""):
    return ('<div style="background: %s; border: 1px solid %s; border-radius: 6px; padding: %s; %s">%s</div>'
            % (SURFACE, LINE, pad, extra, inner))


def stat(value, label, note="", accent=FOREST):
    n = ('<div style="font-size: 12.5px; color: %s; margin-top: 6px">%s</div>' % (MUTED_2, note)) if note else ""
    return card(
        '<div class="kick" style="color: %s">%s</div>'
        '<div class="dsp" style="font-size: 38px; color: %s; margin-top: 10px">%s</div>%s'
        % (MUTED_2, label, accent, value, n), pad="18px 20px 20px")


def field(label, value, hint="", w="100%", disabled=False):
    bg = CREAM_DP if disabled else SURFACE
    col = MUTED_2 if disabled else INK
    h = ('<div style="font-size: 12px; color: %s; margin-top: 5px">%s</div>' % (MUTED_2, hint)) if hint else ""
    return ('<label style="display: block; width: %s">'
            '<div style="font-size: 12.5px; font-weight: 600; color: %s; margin-bottom: 6px">%s</div>'
            '<div style="background: %s; border: 1px solid %s; border-radius: 4px; padding: 9px 12px; '
            'font-size: 14px; color: %s">%s</div>%s</label>'
            % (w, MUTED, label, bg, LINE, col, value, h))


def select(label, value, w="100%"):
    return ('<label style="display: block; width: %s">'
            '<div style="font-size: 12.5px; font-weight: 600; color: %s; margin-bottom: 6px">%s</div>'
            '<div style="background: %s; border: 1px solid %s; border-radius: 4px; padding: 9px 12px; '
            'font-size: 14px; display: flex; align-items: center; justify-content: space-between">'
            '<span>%s</span>%s</div></label>'
            % (w, MUTED, label, SURFACE, LINE, value, ico("down", 16, MUTED_2)))


def searchbar(placeholder, w="320px"):
    return ('<div style="display: flex; align-items: center; gap: 9px; width: %s; background: %s; '
            'border: 1px solid %s; border-radius: 4px; padding: 8px 12px; color: %s; font-size: 14px">'
            '%s<span>%s</span></div>' % (w, SURFACE, LINE, MUTED_2, ico("search", 17, MUTED_2), placeholder))


def avatar(initials, size=34, bg=FOREST, fg=CREAM, fs=None):
    return ('<div style="width: %dpx; height: %dpx; border-radius: 50%%; background: %s; color: %s; '
            'display: flex; align-items: center; justify-content: center; font-size: %spx; '
            'font-weight: 600; flex-shrink: 0; letter-spacing: 0.02em">%s</div>'
            % (size, size, bg, fg, fs or int(size * 0.4), initials))


def progress(pct, w="100%", h=8, color=FOREST, track=CREAM_DP):
    return ('<div style="width: %s; height: %dpx; background: %s; border-radius: %dpx; overflow: hidden">'
            '<div style="width: %s%%; height: 100%%; background: %s; border-radius: %dpx"></div></div>'
            % (w, h, track, h // 2, pct, color, h // 2))


def table(cols, rows, widths=None, align=None):
    """cols: list of header strings. rows: list of list of html cells."""
    widths = widths or [None] * len(cols)
    align = align or ["left"] * len(cols)
    cg = "".join('<col style="width: %s">' % (w or "auto") for w in widths)
    th = "".join(
        '<th style="text-align: %s; padding: 10px 14px; font-size: 11.5px; font-weight: 600; '
        'letter-spacing: 0.09em; text-transform: uppercase; color: %s; border-bottom: 1px solid %s; '
        'white-space: nowrap">%s</th>' % (align[i], MUTED_2, LINE, c) for i, c in enumerate(cols))
    body = []
    for r in rows:
        tds = "".join(
            '<td style="text-align: %s; padding: 11px 14px; font-size: 13.5px; border-bottom: 1px solid %s; '
            'vertical-align: middle">%s</td>' % (align[i], LINE_SF, c) for i, c in enumerate(r))
        body.append('<tr class="row">%s</tr>' % tds)
    return ('<table><colgroup>%s</colgroup><thead><tr>%s</tr></thead><tbody>%s</tbody></table>'
            % (cg, th, "".join(body)))


def panel(title, inner, actions="", pad="0", sub=""):
    s = ('<div style="font-size: 13px; color: %s; margin-top: 2px">%s</div>' % (MUTED_2, sub)) if sub else ""
    return ('<section style="background: %s; border: 1px solid %s; border-radius: 6px; overflow: hidden">'
            '<header style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; '
            'padding: 16px 20px; border-bottom: 1px solid %s">'
            '<div><h3 style="font-size: 15.5px">%s</h3>%s</div><div style="display: flex; gap: 8px">%s</div>'
            '</header><div style="padding: %s">%s</div></section>'
            % (SURFACE, LINE, LINE_SF, title, s, actions, pad, inner))


# ---------------------------------------------------------------- app shell
NAV = {
 "student": ("Student", [
    ("grid", "Dashboard", "/student/dashboard"),
    ("check", "Curriculum checklist", "/student/checklist"),
    ("chart", "Grades & GWA", "/student/grades"),
    ("clock", "Enrollment history", "/student/enrollment-history"),
    ("user", "My profile", "/student/profile"),
 ]),
 "adviser": ("Adviser", [
    ("grid", "Dashboard", "/adviser/dashboard"),
    ("users", "Advisees", "/adviser/advisees"),
    ("plus", "Record attempt", "/adviser/enrollment/new"),
    ("swap", "Reassignment", "/adviser/reassignment"),
 ]),
 "admin": ("Administrator", [
    ("grid", "Dashboard", "/admin/dashboard"),
    ("users", "Accounts", "/admin/accounts"),
    ("layers", "Programs", "/admin/programs"),
    ("book", "Curricula", "/admin/curricula"),
    ("list", "Course catalog", "/admin/courses"),
    ("cal", "Terms & offerings", "/admin/course-offerings"),
    ("shield", "Audit log", "/admin/audit-log"),
 ]),
}


def sidebar(role, active, sub=None):
    label, items = NAV[role]
    out = []
    for icon, name, path in items:
        on = (name == active)
        if on:
            st = ("background: rgba(224,168,46,0.16); color: %s; font-weight: 600" % "#F7E9C4")
            bar = ('<span style="position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; '
                   'background: %s; border-radius: 0 2px 2px 0"></span>' % GOLD)
        else:
            st = "background: transparent; color: rgba(246,242,228,0.72); font-weight: 450"
            bar = ""
        out.append('<div class="navi" style="position: relative; display: flex; align-items: center; gap: 11px; '
                   'padding: 9px 16px 9px 17px; border-radius: 5px; font-size: 14px; %s">%s%s<span>%s</span></div>'
                   % (st, bar, ico(icon, 18, sw=1.55), name))
        if on and sub:
            for s_name, s_on in sub:
                col = "#F7E9C4" if s_on else "rgba(246,242,228,0.6)"
                out.append('<div class="navi" style="padding: 6px 16px 6px 46px; font-size: 13px; color: %s; '
                           'border-radius: 5px; font-weight: %s">%s</div>'
                           % (col, "600" if s_on else "450", s_name))
    return ('<aside style="width: 250px; flex-shrink: 0; background: %s; display: flex; flex-direction: column; '
            'padding: 22px 12px 18px">'
            '<div style="display: flex; align-items: center; gap: 11px; padding: 0 6px 20px">'
            '<img src="%slogo-mark.png" alt="SAAIS" style="width: 34px; height: 34px; border-radius: 8px">'
            '<div><div class="dsp" style="font-size: 19px; color: %s; letter-spacing: 0.01em">SAAIS</div>'
            '<div style="font-size: 10.5px; letter-spacing: 0.11em; text-transform: uppercase; '
            'color: rgba(246,242,228,0.55); font-weight: 600">%s portal</div></div></div>'
            '<div style="height: 1px; background: rgba(246,242,228,0.14); margin: 0 6px 16px"></div>'
            '<nav style="display: flex; flex-direction: column; gap: 2px">%s</nav>'
            '<div style="flex-grow: 1"></div>'
            '<div style="height: 1px; background: rgba(246,242,228,0.14); margin: 16px 6px 14px"></div>'
            '<div class="navi" style="display: flex; align-items: center; gap: 11px; padding: 9px 16px; '
            'border-radius: 5px; font-size: 13.5px; color: rgba(246,242,228,0.72)">%s<span>Sign out</span></div>'
            '</aside>'
            % (FOREST_DP, asset_prefix(), CREAM, label, "".join(out), ico("logout", 18)))


def topbar(crumbs, user, initials, right=""):
    parts = []
    for i, c in enumerate(crumbs):
        last = i == len(crumbs) - 1
        parts.append('<span style="color: %s; font-weight: %s">%s</span>'
                     % (INK if last else MUTED_2, "600" if last else "450", c))
        if not last:
            parts.append('<span style="color: %s">%s</span>' % (LINE, ico("right", 13, LINE)))
    return ('<header style="display: flex; align-items: center; justify-content: space-between; gap: 20px; '
            'padding: 0 32px; height: 62px; background: %s; border-bottom: 1px solid %s; flex-shrink: 0">'
            '<div style="display: flex; align-items: center; gap: 9px; font-size: 13.5px">%s</div>'
            '<div style="display: flex; align-items: center; gap: 16px">%s'
            '<div style="color: %s">%s</div>'
            '<div style="width: 1px; height: 26px; background: %s"></div>'
            '<div style="display: flex; align-items: center; gap: 10px">%s'
            '<div><div style="font-size: 13.5px; font-weight: 600; line-height: 1.25">%s</div>'
            '<div style="font-size: 11.5px; color: %s">%s</div></div>%s</div></div></header>'
            % (SURFACE, LINE, "".join(parts), right, MUTED_2, ico("bell", 19), LINE,
               avatar(initials), user[0], MUTED_2, user[1], ico("down", 15, MUTED_2)))


def page_head(title, sub="", actions=""):
    s = ('<p style="font-size: 14.5px; color: %s; margin-top: 6px; max-width: 640px">%s</p>' % (MUTED, sub)) if sub else ""
    a = ('<div style="display: flex; gap: 10px; flex-shrink: 0">%s</div>' % actions) if actions else ""
    return ('<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; '
            'margin-bottom: 24px"><div><h1 class="dsp" style="font-size: 30px">%s</h1>%s</div>%s</div>'
            % (title, s, a))


def shell(role, active, crumbs, user, initials, content, sub=None, right="", h=1180):
    return ('<div style="display: flex; min-height: %dpx; background: %s">%s'
            '<div style="flex-grow: 1; display: flex; flex-direction: column; min-width: 0">%s'
            '<main style="padding: 30px 32px 40px; flex-grow: 1">%s</main></div></div>'
            % (h, CREAM, sidebar(role, active, sub), topbar(crumbs, user, initials, right), content))


def grid(cols, inner, gap="16px"):
    return ('<div style="display: grid; grid-template-columns: repeat(%d, minmax(0, 1fr)); gap: %s">%s</div>'
            % (cols, gap, inner))


def flex(inner, gap="16px", align="center", justify="flex-start", wrap="nowrap", extra=""):
    return ('<div style="display: flex; align-items: %s; justify-content: %s; gap: %s; flex-wrap: %s; %s">%s</div>'
            % (align, justify, gap, wrap, extra, inner))


def note(text, tone="gold", icon="alert"):
    if tone == "gold":
        bg, fg, bd = "#FCF4E0", "#7A5406", "#EBDCAE"
    elif tone == "green":
        bg, fg, bd = PASS_BG, PASS_FG, "#CBDDC2"
    else:
        bg, fg, bd = FAIL_BG, FAIL_FG, "#EFCFC5"
    return ('<div style="display: flex; align-items: flex-start; gap: 11px; background: %s; '
            'border: 1px solid %s; border-radius: 5px; padding: 13px 16px; color: %s; font-size: 13.5px; '
            'line-height: 1.5">%s<div>%s</div></div>' % (bg, bd, fg, ico(icon, 18), text))


def code(t):
    return '<span class="mono" style="font-size: 13px; font-weight: 500">%s</span>' % t
