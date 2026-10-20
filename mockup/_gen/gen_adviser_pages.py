"""Generates the Academic Adviser pages into ../Adviser using the SAAIS design system.

Mirrors the SystemAdmin generator: static .dc.html artboards with inline design-system
styles, one file per screen plus Adviser.dc.html (every screen, hash navigation), and one
shared behaviour script whose blocks no-op when their page is absent.
Content follows the Adviser role of prototype.html (sample advisee: Maria Isabel Bautista).

Run: python _gen/gen_adviser_pages.py
"""
import html, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "Adviser"
OFFERINGS = json.loads((ROOT / "_gen" / "adviser_offerings.json").read_text(encoding="utf-8"))

HEAD = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%(title)s · SAAIS</title>
  <script src="../support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;450;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: #FBF8EF;
  color: #16200C;
  font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
}
h1, h2, h3, h4 { margin: 0; font-weight: 600; letter-spacing: -0.011em; }
p { margin: 0; }
a { color: #2F4A12; text-decoration: none; }
a:hover { color: #B0761A; }
table { border-collapse: collapse; width: 100%%; }
.dsp { font-family: 'Syne', 'Segoe UI', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.01em; line-height: 1.08; }
.mono { font-family: 'IBM Plex Mono', 'Consolas', monospace; font-variant-ligatures: none; }
.kick { font-size: 11.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
.row:hover { background: #EFEADB; }
.navi:hover { background: rgba(224,168,46,0.10); }
.btnp:hover { background: #1D2F0A; }
.btns:hover { border-color: #2F4A12; }
.tab:hover { color: #16200C; }
.crumb-link:hover { color: #2F4A12; text-decoration: underline; text-underline-offset: 3px; }
.fld { width: 100%%; background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 4px; padding: 9px 12px; font-family: inherit; font-size: 14px; color: #16200C; line-height: 1.4; }
.fld::placeholder { color: #8C8A76; }
.fld:hover { border-color: #C9C1A6; }
a:focus-visible, button:focus-visible, .fld:focus-visible, input[type=checkbox]:focus-visible, tr[data-href]:focus-visible { outline: 2px solid #2F4A12; outline-offset: 2px; }
.fld:focus { border-color: #2F4A12; }
[hidden] { display: none !important; }
dialog::backdrop { background: rgba(22,32,12,0.45); }
  </style>
</helmet>
"""

FOOT = """</x-dc>
%(script)s
</body>
</html>
"""

# --- Icons (DesignSystem.dc icon family: 24px grid, 1.6 stroke) -------------
def ico(paths, size=18, sw="1.55", stroke="currentColor"):
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{stroke}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0" aria-hidden="true">{paths}</svg>')

P_GRID = '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>'
P_USERS = '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 5.2a3.6 3.6 0 010 5.6M17.5 20a6.6 6.6 0 00-2.2-4.9"/>'
P_SWAP = '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>'
P_BOOK = '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 012-2h13"/>'
P_COG = '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4"/>'
P_SEARCH = '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'
P_SHIELD = '<path d="M12 3l7.5 3v6c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>'
P_ALERT = '<path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 9.5v4.5M12 17h.01"/>'
P_FLAG = '<path d="M5.5 21V3.5M5.5 4.5h12l-2.4 4 2.4 4h-12"/>'
P_LOCK = '<rect x="4.5" y="10" width="15" height="10.5" rx="1.6"/><path d="M8 10V7a4 4 0 018 0v3"/>'
P_LOGOUT = '<path d="M9 21H5a1 1 0 01-1-1V4a1 1 0 011-1h4"/><path d="M15.5 16.5L20 12l-4.5-4.5M20 12H9"/>'
P_BELL = '<path d="M18 15V10a6 6 0 10-12 0v5l-1.8 3h15.6z"/><path d="M9.8 21h4.4"/>'
P_CHEV_R = '<path d="M9 5l7 7-7 7"/>'
P_CHEV_D = '<path d="M6 9l6 6 6-6"/>'
P_X = '<path d="M6 6l12 12M18 6L6 18"/>'
P_SEND = '<path d="M9 5l7 7-7 7"/>'

# --- Design-system primitives ---------------------------------------------
TONES = {
    "green": ("#E7F0E2", "#2C6430"),
    "red": ("#FAE7E1", "#9E2E1C"),
    "amber": ("#FBF0D6", "#8A6206"),
    "blue": ("#E4EDF4", "#2A4C6B"),
    "neutral": ("#ECE8DA", "#5C5A4C"),
    "cream": ("#F2EDDC", "#6E6C58"),
}
STATUS = {  # attempt / requirement status -> (label, tone)
    "passed": ("Passed", "green"), "failed": ("Failed", "red"), "inc": ("INC", "amber"),
    "currently_enrolled": ("Enrolled", "blue"), "na": ("Not taken", "neutral"),
}

def badge(text, tone, dot=True, attrs=""):
    bg, fg = TONES[tone]
    d = f'<span style="width: 6px; height: 6px; border-radius: 50%; background: {fg}; flex-shrink: 0"></span>' if dot else ""
    return (f'<span {attrs} style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px 2px 8px; border-radius: 3px; '
            f'background: {bg}; color: {fg}; font-size: 12px; font-weight: 600; letter-spacing: 0.01em; white-space: nowrap">{d}{text}</span>')

def status_badge(s):
    return badge(*STATUS[s])

CALLOUT = {
    "advisory": ("#FCF4E0", "#EBDCAE", "#7A5406"),
    "confirmed": ("#E7F0E2", "#CBDDC2", "#2C6430"),
    "blocked": ("#FAE7E1", "#EFCFC5", "#9E2E1C"),
}

def callout(kind, icon, body, attrs=""):
    bg, bd, fg = CALLOUT[kind]
    return (f'<div {attrs} style="display: flex; align-items: flex-start; gap: 11px; background: {bg}; border: 1px solid {bd}; border-radius: 5px; '
            f'padding: 13px 16px; color: {fg}; font-size: 13.5px; line-height: 1.5">{ico(icon, sw="1.6")}<div>{body}</div></div>')

BTN = "display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 8px; font-family: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; text-decoration: none"

def btn_primary(label, icon=None, attrs="", small=False, href=None, typ="button"):
    pad, fs = ("6px 12px", "13px") if small else ("9px 16px", "14px")
    i = ico(icon, 16, "1.6") + " " if icon else ""
    style = f'{BTN}; padding: {pad}; font-size: {fs}; background: #2F4A12; color: #FBF8EF; border: 1px solid #2F4A12'
    if href:
        return f'<a class="btnp" href="{href}" {attrs} style="{style}">{i}{label}</a>'
    return f'<button type="{typ}" class="btnp" {attrs} style="{style}">{i}{label}</button>'

def btn_secondary(label, icon=None, attrs="", small=False, href=None):
    pad, fs = ("6px 12px", "13px") if small else ("9px 16px", "14px")
    i = ico(icon, 16, "1.6") + " " if icon else ""
    style = f'{BTN}; padding: {pad}; font-size: {fs}; background: #FFFFFF; color: #16200C; border: 1px solid #E1DBC6'
    if href:
        return f'<a class="btns" href="{href}" {attrs} style="{style}">{i}{label}</a>'
    return f'<button type="button" class="btns" {attrs} style="{style}">{i}{label}</button>'

def btn_ghost(label, attrs=""):
    return (f'<button type="button" class="btns" {attrs} style="{BTN}; padding: 9px 16px; font-size: 14px; '
            f'background: transparent; color: #2F4A12; border: 1px solid transparent">{label}</button>')

def label_wrap(text, control, fid):
    return (f'<label for="{fid}" style="display: block; width: 100%"><div style="font-size: 12.5px; font-weight: 600; color: #6E6C58; margin-bottom: 6px">{text}</div>{control}</label>')

def field(text, fid, value="", typ="text", extra=""):
    return label_wrap(text, f'<input class="fld" id="{fid}" type="{typ}" value="{value}" {extra}>', fid)

def textarea(text, fid, extra="", rows=4):
    return label_wrap(text, f'<textarea class="fld" id="{fid}" rows="{rows}" {extra} style="resize: vertical; min-height: 96px"></textarea>', fid)

def select(fid, options, selected=None, extra=""):
    opts = "".join(f'<option value="{html.escape(str(v))}"{" selected" if v == selected else ""}>{t}</option>' for v, t in options)
    return ('<div style="position: relative">'
            f'<select class="fld" id="{fid}" {extra} style="appearance: none; -webkit-appearance: none; padding-right: 34px; cursor: pointer">{opts}</select>'
            f'<span style="position: absolute; right: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; display: flex">{ico(P_CHEV_D, 16, "1.6", "#8C8A76")}</span></div>')

def panel(title, body, sub="", right="", pad="20px", attrs=""):
    s = f'<p style="font-size: 13px; color: #6E6C58; margin-top: 3px">{sub}</p>' if sub else ""
    return (f'<section {attrs} style="background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 6px; overflow: hidden; min-width: 0">'
            f'<header style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #EFEADB">'
            f'<div><h3 style="font-size: 15.5px">{title}</h3>{s}</div>{right}</header>'
            f'<div style="padding: {pad}">{body}</div></section>')

TH = ("padding: 10px 14px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; "
      "color: #8C8A76; background: #F2EDDC; border-bottom: 1px solid #E1DBC6; white-space: nowrap")
TD = "padding: 11px 14px; font-size: 13.5px; border-bottom: 1px solid #EFEADB; vertical-align: middle"

def th(text, align="left"):
    return f'<th scope="col" style="text-align: {align}; {TH}">{text}</th>'

def td(content, align="left", extra="", attrs=""):
    return f'<td {attrs} style="text-align: {align}; {TD}{extra}">{content}</td>'

def table(heads, rows, body_id="", cols=""):
    bid = f' id="{body_id}"' if body_id else ""
    return (f'<div style="overflow-x: auto"><table>{cols}<thead><tr>{"".join(th(*h) if isinstance(h, tuple) else th(h) for h in heads)}</tr></thead>'
            f'<tbody{bid}>{"".join(rows)}</tbody></table></div>')

def empty_row(span, text):
    return f'<tr data-empty hidden><td colspan="{span}" style="{TD}; text-align: center; color: #6E6C58; padding: 28px 14px">{text}</td></tr>'

def course_cell(code, title):
    return (f'<div style="font-weight: 600">{code}</div>'
            f'<div style="font-size: 12.5px; color: #6E6C58; margin-top: 2px">{title}</div>')

def muted(text):
    return f'<span style="color: #8C8A76">{text}</span>'

def page_head(title, sub, right=""):
    return (f'<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px">'
            f'<div><h1 class="dsp" style="font-size: 30px">{title}</h1>'
            f'<p style="font-size: 14.5px; color: #6E6C58; margin-top: 6px; max-width: 640px">{sub}</p></div>'
            f'<div style="display: flex; gap: 10px; flex-shrink: 0; align-items: center">{right}</div></div>')

def stats(items):
    cards = "".join(
        f'<div style="background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 6px; padding: 18px 20px 20px; min-width: 0">'
        f'<div class="kick" style="color: #8C8A76">{t}</div>'
        f'<div class="dsp" {attrs} style="font-size: 38px; margin-top: 10px; color: #2F4A12">{v}</div>'
        f'<div style="font-size: 12.5px; color: #8C8A76; margin-top: 6px">{n}</div></div>'
        for t, v, n, *rest in items for attrs in [rest[0] if rest else ""])
    return f'<div style="display: grid; grid-template-columns: repeat({len(items)}, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px">{cards}</div>'

def columns(left, right, ratio="minmax(0, 1.75fr) minmax(270px, 1fr)"):
    return (f'<div style="display: grid; grid-template-columns: {ratio}; gap: 16px; align-items: start">'
            f'<div style="display: grid; gap: 16px; min-width: 0">{left}</div>'
            f'<div style="display: grid; gap: 16px; min-width: 0">{right}</div></div>')

def avatar(initials, size=34, bg="#2F4A12", fg="#FBF8EF"):
    return (f'<div style="width: {size}px; height: {size}px; border-radius: 50%; background: {bg}; color: {fg}; display: flex; align-items: center; '
            f'justify-content: center; font-size: {size * 0.4:.1f}px; font-weight: 600; letter-spacing: 0.02em; flex-shrink: 0">{initials}</div>')

def dialog(did, title, sub, body, footer):
    return (f'<dialog id="{did}" aria-labelledby="{did}-title" style="width: min(600px, calc(100vw - 32px)); padding: 0; border: 1px solid #E1DBC6; border-radius: 6px; '
            f'background: #FFFFFF; color: #16200C; box-shadow: 0 24px 60px rgba(22,32,12,0.28)">'
            f'<header style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 20px 16px; border-bottom: 1px solid #EFEADB">'
            f'<div><h2 id="{did}-title" class="dsp" style="font-size: 22px">{title}</h2>'
            f'<p data-dlg-sub style="font-size: 13px; color: #6E6C58; margin-top: 5px">{sub}</p></div>'
            f'<button type="button" data-close aria-label="Close" class="btns" style="width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 6px; '
            f'border: 1px solid transparent; background: transparent; color: #6E6C58; cursor: pointer; flex-shrink: 0">{ico(P_X, 18, "1.6")}</button></header>'
            f'<div style="padding: 20px">{body}</div>'
            + (f'<footer style="display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; background: #FBF8EF; border-top: 1px solid #EFEADB">{footer}</footer>' if footer else "")
            + '</dialog>')

def msg(mid, top="16px"):
    return f'<div id="{mid}" style="margin-top: {top}" hidden></div>'

CAPTION = '<p style="font-size: 12px; color: #8C8A76; margin-top: 22px">Sample records for presentation · Reference date: 19 September 2026</p>'

# --- Pages -----------------------------------------------------------------
# key, nav label, file, title, crumb trail (label, key-or-None)
STUDENT = "Maria Isabel Bautista"
TRAIL = [("Advisees", "advisees"), (STUDENT, "overview")]
PAGES = [
    ("dashboard", "AdviserDashboard.dc.html", "Dashboard", [("Dashboard", None)]),
    ("advisees", "AdviserAdvisees.dc.html", "Advisees", [("Advisees", None)]),
    ("overview", "AdviseeDetail.dc.html", "Student overview", [("Advisees", "advisees"), (STUDENT, None)]),
    ("advising", "AdviseeAdvising.dc.html", "Advising", TRAIL + [("Advising", None)]),
    ("checklist", "AdviseeChecklist.dc.html", "Student checklist", TRAIL + [("Checklist", None)]),
    ("grades", "AdviseeGrades.dc.html", "Student grades", TRAIL + [("Grades", None)]),
    ("record", "AdviseeRecordGrades.dc.html", "Record enrollment", TRAIL + [("Record enrollment", None)]),
    ("history", "AdviseeHistory.dc.html", "Student history", TRAIL + [("History", None)]),
    ("reassign", "AdviserReassign.dc.html", "Reassignment", [("Reassignment", None)]),
    ("settings", "AdviserSettings.dc.html", "Settings", [("Settings", None)]),
]
FILES = {k: f for k, f, _, _ in PAGES}
NAV = [("dashboard", "Dashboard", P_GRID), ("advisees", "Advisees", P_USERS), ("reassign", "Reassignment", P_SWAP)]
NAV_OWNER = {"overview": "advisees", "advising": "advisees", "checklist": "advisees", "grades": "advisees",
             "record": "advisees", "history": "advisees"}

STANDALONE = False  # True while building Adviser.dc.html: links become #key

def href(key):
    return f"#{key}" if STANDALONE else FILES[key]

# Sample advisees (current roster + past)
ROSTER = [
    ("s1", "Maria Isabel Bautista", "2023-04412", "1.58", "56", "good"),
    ("s2", "Angelo Cruz", "2022-01188", "4.50", "3", "flagged"),
    ("s3", "Joshua Lim", "2023-02940", "1.50", "3", "good"),
    ("s5", "Carlo Dominguez", "2026-00142", "—", "0", "good"),
]
PAST = [("s4", "Andrea Villanueva", "2024-00871", "1.75", "3", "good")]

def dashboard():
    follow = [("Maria Isabel Bautista", "2023-04412", badge("1 open INC", "amber")),
              ("Angelo Cruz", "2022-01188", badge("Delinquency flag", "red")),
              ("Joshua Lim", "2023-02940", badge("1 open INC", "amber")),
              ("Carlo Dominguez", "2026-00142", badge("Good standing", "green"))]
    rows = [f'<tr class="row">' + td(course_cell(n, num)) + td(b) + td(btn_secondary("Review", small=True, href=href("overview")), "right") + '</tr>'
            for n, num, b in follow]
    follow_panel = panel("Students to follow up", table(["Student", "Reason", ""], rows),
                         sub="A focused view of academic standing and incomplete grades.",
                         right=btn_secondary("View all", href=href("advisees")), pad="0")
    activity = [("GWA recomputed", "System · Angelo Cruz", "19 Sept 2026"),
                ("Elective mapping created", "Prof. Ramon Reyes · CSci E-SC1 → CS Elective 1", "14 Aug 2026"),
                ("Term locked", "Teresa Alvarez · 2024 - 2025 · 2nd Semester", "1 Jun 2026"),
                ("Equivalency approved", "Prof. Ramon Reyes · Envi 11 → ScTS 11a", "2 Mar 2026")]
    def act_row(t, p, d, first=False):
        return (f'<div style="display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 10px; padding: 14px 20px; {"" if first else "border-top: 1px solid #EFEADB; "}font-size: 13.5px">'
                f'<div><div style="font-weight: 600">{t}</div><p style="margin-top: 4px; color: #6E6C58; font-size: 12.5px">{p}</p></div>'
                f'<span style="color: #8C8A76; font-size: 12px">{d}</span></div>')
    act_panel = panel("Recent activity", "".join(act_row(*a, first=i == 0) for i, a in enumerate(activity[:3])),
                      sub="Your latest three recorded changes.",
                      right=btn_secondary("View all", attrs='data-open="dlg-activity" aria-haspopup="dialog"'), pad="0")
    act_dialog = dialog("dlg-activity", "All recent activity", "Every recorded change for your advisees, newest first.",
                        "".join(act_row(*a, first=i == 0) for i, a in enumerate(activity)).replace("padding: 14px 20px", "padding: 12px 0"), "")
    incs = [("Angelo Cruz", "CSIT 104 · 1 Aug 2026", badge("Lapsed INC", "amber")),
            ("Joshua Lim", "CSci 102 · 21 Sept 2026", badge("INC", "amber")),
            ("Maria Isabel Bautista", "CSci 102 · 26 Oct 2026", badge("INC", "amber"))]
    inc_rows = "".join(
        f'<div style="display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 10px; padding: 14px 20px; {"" if i == 0 else "border-top: 1px solid #EFEADB; "}font-size: 13.5px">'
        f'<div><div style="font-weight: 600">{n}</div><p style="margin: 4px 0 10px; color: #6E6C58; font-size: 12.5px">{c}</p>'
        f'{btn_secondary("Review INC", small=True, href=href("grades"))}</div>{b}</div>' for i, (n, c, b) in enumerate(incs))
    inc_panel = panel("Upcoming INC deadlines", inc_rows, sub="Arrange follow-ups before the compliance date.", pad="0")
    what = panel("What does “Record enrollment” do?",
                 '<p style="font-size: 13.5px; color: #6E6C58">Records that a student is taking a specific course offering. Each retake is a separate record, preserving grades and advising history.</p>'
                 '<p style="font-size: 13.5px; color: #6E6C58; margin-top: 10px">This is an advising record. Registrar enrollment happens outside SAAIS.</p>',
                 sub="A clearer name for an enrollment attempt.")
    quick = ('<div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 24px">'
             '<span class="kick" style="color: #8C8A76; margin-right: 6px">Quick access</span>'
             + "".join(btn_secondary(f'{t} {ico(P_CHEV_R, 14, "1.6")}', small=True, href=href(k))
                       for t, k in [("Find an advisee", "advisees"), ("Record enrollment", "record"), ("Write an advising note", "advising")])
             + '</div>')
    return (page_head("Make room for meaningful advising.", "Start with the students who need your attention.")
            + stats([("Current advisees", "4", "Assigned to you"), ("Delinquency flags", "1", "Review failed units and course load"),
                     ("Open INC records", "3", "Upcoming and lapsed deadlines"), ("Recorded exceptions", "3", "Mappings and equivalencies")])
            + quick + columns(follow_panel + act_panel, inc_panel + what) + act_dialog + CAPTION)

def roster_row(sid, name, num, gwa, units, standing, group):
    b = badge("Good standing", "green") if standing == "good" else badge("Flagged", "red")
    return (f'<tr class="row" data-href="{href("overview")}" tabindex="0" data-set="{group}" data-standing="{standing}" data-q="{name.lower()} {num}"'
            f'{" hidden" if group == "past" else ""} style="cursor: pointer">'
            + td(f'<a href="{href("overview")}" style="font-weight: 600; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: #CBDDC2">{name}</a>'
                 f'<div class="mono" style="font-size: 12.5px; color: #6E6C58; margin-top: 2px">{num}</div>')
            + td("BS Computer Science") + td(f'<span class="mono" style="font-size: 13px; font-weight: 500">{gwa}</span>', "right")
            + td(units, "right") + td(b) + '</tr>')

def advisees():
    search = (f'<label for="ros-q" style="flex: 2; min-width: 230px"><div style="font-size: 12.5px; font-weight: 600; color: #6E6C58; margin-bottom: 6px">Search advisees</div>'
              f'<div style="display: flex; align-items: center; gap: 9px; background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 4px; padding: 0 12px">{ico(P_SEARCH, 17, "1.6", "#8C8A76")}'
              f'<input id="ros-q" type="search" placeholder="Name or student number" autocomplete="off" '
              f'style="flex-grow: 1; min-width: 0; border: 0; outline: 0; padding: 9px 0; font-family: inherit; font-size: 14px; color: #16200C; background: transparent"></div></label>')
    standing = f'<div style="flex: 1; min-width: 160px; max-width: 240px">{label_wrap("Standing", select("ros-standing", [("all", "All standings"), ("flagged", "Delinquency flags"), ("good", "Good standing")]), "ros-standing")}</div>'
    seg_btn = lambda k, t, on: (f'<button type="button" data-roster="{k}" aria-pressed="{"true" if on else "false"}" style="border: 0; padding: 7px 14px; border-radius: 6px; font-family: inherit; font-size: 13.5px; '
                                f'font-weight: 600; cursor: pointer; background: {"#2F4A12" if on else "transparent"}; color: {"#FBF8EF" if on else "#6E6C58"}">{t}</button>')
    seg = f'<div role="group" aria-label="Roster" style="display: flex; gap: 2px; background: #F2EDDC; padding: 3px; border-radius: 8px; margin-left: auto">{seg_btn("current", "Current", True)}{seg_btn("past", "Past", False)}</div>'
    toolbar = f'<div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 20px">{search}{standing}{seg}</div>'
    rows = [roster_row(*r, "current") for r in ROSTER] + [roster_row(*r, "past") for r in PAST] + [empty_row(5, "No advisees match these filters.")]
    tbl = table(["Student", "Program", ("GWA", "right"), ("Earned units", "right"), "Standing"], rows, "ros-body")
    return (page_head("Know your students.", "Search current and past advisees. Historical records remain read-only.",
                      btn_secondary("Reassign advisees", P_SWAP, href=href("reassign")))
            + toolbar
            + panel("Advisees", tbl, sub='<span id="ros-count">4</span> matching sample records', pad="0")
            + f'<p id="ros-past-note" style="font-size: 13px; color: #6E6C58; margin-top: 14px" hidden>Past advisees are read-only. Their records stay with their current adviser.</p>'
            + CAPTION)

# --- Advisee header + tabs (shared by every advisee page) ------------------
TABS = [("overview", "Overview"), ("advising", "Advising"), ("checklist", "Checklist"), ("grades", "Grades"),
        ("record", "Record grades"), ("history", "History")]

def student_head(active):
    email = '<a href="mailto:maria.bautista@example.edu.ph">maria.bautista@example.edu.ph</a> · ' if active == "overview" else ""
    tabs = "".join(
        f'<a class="tab" href="{href(k)}"{" aria-current=\"page\"" if k == active else ""} style="padding: 12px 2px; font-size: 14px; margin-bottom: -1px; '
        f'border-bottom: 2px solid {"#E0A82E" if k == active else "transparent"}; color: {"#16200C" if k == active else "#8C8A76"}; font-weight: {"600" if k == active else "450"}">{t}</a>'
        for k, t in TABS)
    return (f'<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 16px">{avatar("MI", 52)}'
            f'<div><h1 class="dsp" style="font-size: 30px">{STUDENT}</h1>'
            f'<p style="color: #6E6C58; font-size: 14px; margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap">'
            f'<span class="mono" style="font-size: 13px">2023-04412</span> · {email}BS Computer Science · {badge("Good standing", "green")}</p></div></div>'
            f'<nav aria-label="Student record" style="display: flex; gap: 26px; border-bottom: 1px solid #E1DBC6; margin-bottom: 24px; overflow-x: auto; white-space: nowrap">{tabs}</nav>')

ENROLLED = [  # current term, attempt id, code, title, units
    ("at19", "CSIT 103", "Data Structures and Algorithms", 4), ("at20", "CSIT 104", "Information Management", 3),
    ("at21", "CSIT 105", "Applications Development and Emerging Technologies", 3), ("at22", "CSci 103", "Discrete Structures II", 3),
    ("at23", "CSci 122", "Human Computer Interaction", 3), ("at24", "CSci 182", "Integral Calculus for CS", 3),
    ("at25", "ScSc 13", "The Contemporary World", 3), ("at26", "PhEd 13", "PATHFit 3", 2),
]
PAST_TERM = [  # 2024 - 2025 · 2nd Semester (locked): id, code, title, units, midterm, final, status
    ("at1", "CSIT 100", "Introduction to Computing", 3, "1.50", "1.50", "passed"),
    ("at2", "CSIT 101", "Fundamentals of Programming", 4, "1.75", "1.75", "passed"),
    ("at3", "CSci 180", "Pre-calculus for CS", 3, "2.00", "2.00", "passed"),
    ("at4", "Comm 11", "Purposive Communication", 3, "1.25", "1.25", "passed"),
    ("at5", "Entr 11", "Entrepreneurial Mind", 3, "1.50", "1.50", "passed"),
    ("at6", "ITec 11", "Living in the IT Era", 3, "1.75", "1.75", "passed"),
    ("at7", "ScSc 11", "Understanding the Self", 3, "2.00", "2.00", "passed"),
    ("at8", "PhEd 11", "PATHFit 1 - Movement Competency Training", 2, "1.00", "1.00", "passed"),
    ("at9", "NSTP 11", "National Service Training Program I", 3, "1.00", "1.00", "passed"),
    ("at10", "CSIT 102", "Intermediate Programming", 3, "1.50", "1.50", "passed"),
    ("at11", "CSci 102", "Discrete Structures I", 3, "—", "—", "inc"),
    ("at12", "CSci 121", "Computer Organization and Architecture", 3, "2.00", "2.00", "passed"),
    ("at13", "CSci 181", "Differential Calculus for CS", 3, "1.75", "1.75", "passed"),
    ("at14", "Math 11", "Mathematics in the Modern World", 3, "2.00", "2.00", "passed"),
    ("at15", "ScSc 12", "Readings in Philippine History", 3, "1.50", "1.50", "passed"),
    ("at16", "Envi 11", "Environmental Science", 3, "1.75", "1.75", "passed"),
    ("at17", "PhEd 12", "PATHFit 2 - Exercise-based Fitness Activities", 2, "1.00", "1.00", "passed"),
    ("at18", "NSTP 12", "National Service Training Program II", 3, "1.00", "1.00", "passed"),
    ("at27", "CSci E-SC1", "Computational Science 1", 3, "1.50", "1.50", "passed"),
    ("at28", "CSci E-WA1", "Web Systems and Technologies 1", 3, "1.75", "1.75", "passed"),
]
NO_SLOT = {"Envi 11", "CSci E-SC1", "CSci E-WA1"}

def overview():
    t1 = [f'<tr class="row">' + td(course_cell(c, t)) + td(str(u), "right") + td(status_badge("currently_enrolled")) + '</tr>' for _, c, t, u in ENROLLED]
    t0 = [f'<tr class="row">' + td(course_cell(c, t)) + td(str(u), "right") + td(status_badge(s)) + '</tr>' for _, c, t, u, _, _, s in PAST_TERM]
    term = select("ov-term", [("t1", "2025 - 2026 · 1st Semester"), ("t0", "2024 - 2025 · 2nd Semester")], "t1", 'aria-label="School term"')
    enrol = panel("Current enrollment",
                  f'<div data-term="t1">{table(["Course", ("Units", "right"), "Status"], t1)}</div>'
                  f'<div data-term="t0" hidden>{table(["Course", ("Units", "right"), "Status"], t0)}</div>'
                  '<p style="font-size: 13.5px; color: #6E6C58; padding: 16px 20px">Recorded course enrollments for this term. Your adviser maintains these records.</p>',
                  sub='<span id="ov-term-label">2025 - 2026 · 1st Semester</span>', right=f'<div style="min-width: 230px">{term}</div>', pad="0")
    hist = panel("Adviser assignment history",
                 table(["Adviser", "Start", "End"], [f'<tr class="row">{td("Prof. Lourdes Mendez")}{td("1 Jun 2023")}{td("12 Jun 2024")}</tr>',
                                                     f'<tr class="row">{td("Prof. Ramon Reyes")}{td("12 Jun 2024")}{td(badge("Current", "green"))}</tr>']),
                 sub="Continuous support, with every transition preserved.", pad="0")
    actions = panel("Advising actions",
                    '<div style="display: flex; gap: 10px; flex-wrap: wrap">'
                    + btn_primary("Record enrollment", href=href("record")) + btn_secondary("Write a note", href=href("advising"))
                    + btn_secondary("Curriculum assignment history", attrs='data-open="dlg-curhist" aria-haspopup="dialog"') + '</div>',
                    sub="Keep the student record up to date.")
    note = panel("Latest advising note",
                 '<p style="font-size: 13.5px; color: #6E6C58">Discussed a manageable course load. Review the CSci 102 (Discrete Structures I) completion requirements before the October deadline.</p>',
                 sub="Staff-only information.")
    curhist = dialog("dlg-curhist", "Curriculum assignment history", "Every curriculum this student has followed.",
                     table(["Curriculum", "Start", "End", "Reason"],
                           [f'<tr>{td("BS Computer Science · 2023–2024")}{td("1 Jun 2023")}{td(badge("Current", "green"))}{td("Initial assignment")}</tr>']), "")
    return (student_head("overview")
            + stats([("Cumulative GWA", "1.58", "56 counted units"), ("Units earned", "56", "of 147 required"),
                     ("Threshold", "12", "Failed units per school term"), ("Open INC", "1", "Includes lapsed records")])
            + columns(enrol + hist, actions + note) + curhist + CAPTION)

RECS = [("Envi 11", "Environmental Science", 3), ("CSci 126", "Networks and Communications", 3),
        ("CSci 154", "Quantitative Methods for CS", 3), ("CSci 183", "Linear Algebra and Matrix Theory", 3),
        ("Humn 11", "Art Appreciation", 3), ("ScSc 16", "Life and Works of Rizal", 3), ("PhEd 14", "PATHFit 4", 2),
        ("CSci 200", "Undergraduate Thesis I", 2), ("CSci 193", "Social Issues and Professional Practice", 3)]
NOTES = [("17 Sept 2026", "Discussed a manageable course load. Review the CSci 102 (Discrete Structures I) completion requirements before the October deadline."),
         ("14 Aug 2026", "Reviewed the CS Elective 1 mapping and explained how it appears in the curriculum checklist.")]

def note_row(date, text):
    return (f'<article style="padding: 16px 20px; border-bottom: 1px solid #EFEADB">'
            f'<div style="display: flex; justify-content: space-between; gap: 14px; font-size: 12.5px; color: #8C8A76"><strong style="color: #16200C">Prof. Ramon Reyes</strong><span>{date}</span></div>'
            f'<p style="font-size: 14px; line-height: 1.65; margin-top: 8px; white-space: pre-wrap">{text}</p></article>')

def chat_msg(text, mine):
    bubble = ("background: #2F4A12; color: #FBF8EF; border-radius: 12px 12px 3px 12px" if mine
              else "background: #F2EDDC; color: #16200C; border-radius: 12px 12px 12px 3px")
    return (f'<div style="display: flex; justify-content: {"flex-end" if mine else "flex-start"}">'
            f'<p style="max-width: 82%; padding: 9px 13px; font-size: 13.5px; line-height: 1.55; {bubble}">{text}</p></div>')

def advising():
    rows = [f'<tr class="row">'
            + td(f'<input type="checkbox" class="plan-pick" value="{c}" aria-label="Select {c}" style="accent-color: #2F4A12; width: 15px; height: 15px; margin: 0">', extra="; width: 34px")
            + td(course_cell(c, t)) + td(str(u), "right") + td("Unfulfilled requirement; strict prerequisites cleared") + '</tr>'
            for c, t, u in RECS]
    term = label_wrap("Term", select("plan-term", [("1st Semester", "1st Semester"), ("2nd Semester", "2nd Semester"), ("Summer", "Summer / Midyear")], "2nd Semester"), "plan-term")
    recs = panel("Course recommendations",
                 table(["", "Course", ("Units", "right"), "Why recommended"], rows)
                 + f'<div style="padding: 16px 20px 0">{callout("advisory", P_FLAG, "10 requirements or options excluded because of availability or prerequisites.")}</div>'
                 + '<div style="padding: 16px 20px 20px"><p style="font-size: 13.5px; color: #6E6C58">Failed requirements must be retaken. The student chooses the timing; dependent courses remain unavailable until their prerequisites pass.</p>'
                 + f'<div style="display: flex; align-items: center; gap: 12px; margin-top: 14px"><span id="plan-count" style="font-size: 14px">0 selected</span>{btn_primary("Add selected to plan", attrs="id=plan-add")}</div>'
                 + msg("plan-msg", "14px") + '</div>',
                 sub='<span id="plan-term-label">2025 - 2026 · 2nd Semester</span>', right=f'<div style="min-width: 190px">{term}</div>', pad="0")
    note_form = ('<form id="note-form" novalidate style="padding: 18px 20px 20px">'
                 + textarea("Write an advising note", "note-body", 'placeholder="Staff-only. Write what the next adviser should know."')
                 + msg("note-msg", "12px")
                 + f'<div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px">{btn_ghost("Cancel", attrs="data-reset")}'
                 + btn_primary("Save note", typ="submit") + '</div></form>')
    notes = panel("Advising notes", f'<div id="note-list">{"".join(note_row(*n) for n in NOTES)}</div>' + note_form,
                  sub="Recent notes · staff-only", pad="0")
    chat = panel("Advising assistant",
                 '<div id="chat-log" style="display: flex; flex-direction: column; gap: 10px; padding: 16px 20px; max-height: 300px; overflow-y: auto">'
                 + chat_msg("What should Maria take next term?", True)
                 + chat_msg("Demo preview: eligible offered courses for 2nd Semester: Envi 11, CSci 126, CSci 154, CSci 183, Humn 11, ScSc 16. This uses the selected record, prerequisite results and curriculum horizon. Verify before recording enrollment; this chat does not save academic changes.", False)
                 + chat_msg("Good. Flag anything hidden because of a prerequisite.", True)
                 + chat_msg("Noted below the list — it names the course and which prerequisite is still outstanding.", False)
                 + '</div><form id="chat-form" style="display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid #EFEADB; margin: 0">'
                 + '<input class="fld" id="chat-q" type="text" placeholder="Ask about this advisee…" aria-label="Ask about this advisee" autocomplete="off">'
                 + f'<button type="submit" class="btnp" aria-label="Send" style="width: 38px; height: 38px; border-radius: 50%; border: 0; background: #2F4A12; color: #FBF8EF; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0">{ico(P_SEND, 16, "1.8")}</button></form>',
                 sub="Drafts suggestions from this record — always verify before acting · Demo preview", pad="0")
    return student_head("advising") + columns(recs, notes + chat) + CAPTION

CHECKLIST = [  # (term label, [(slot, code, title, earned, required, status, source, detail)])
    ("Year 1 · Semester 1", [
        ("sl1", "CSIT 100", "Introduction to Computing", 3, 3, "passed", "Direct", "CSIT 100 · grade 1.50"),
        ("sl2", "CSIT 101", "Fundamentals of Programming", 4, 4, "passed", "Direct", "CSIT 101 · grade 1.75"),
        ("sl3", "CSci 180", "Pre-calculus for CS", 3, 3, "passed", "Direct", "CSci 180 · grade 2.00"),
        ("sl4", "Comm 11", "Purposive Communication", 3, 3, "passed", "Direct", "Comm 11 · grade 1.25"),
        ("sl5", "Entr 11", "Entrepreneurial Mind", 3, 3, "passed", "Direct", "Entr 11 · grade 1.50"),
        ("sl6", "ITec 11", "Living in the IT Era", 3, 3, "passed", "Direct", "ITec 11 · grade 1.75"),
        ("sl7", "ScSc 11", "Understanding the Self", 3, 3, "passed", "Direct", "ScSc 11 · grade 2.00"),
        ("sl8", "PhEd 11", "PATHFit 1 - Movement Competency Training", 2, 2, "passed", "Direct", "PhEd 11 · grade 1.00"),
        ("sl9", "NSTP 11", "National Service Training Program I", 3, 3, "passed", "Direct", "NSTP 11 · grade 1.00")]),
    ("Year 1 · Semester 2", [
        ("sl10", "CSIT 102", "Intermediate Programming", 3, 3, "passed", "Direct", "CSIT 102 · grade 1.50"),
        ("sl11", "CSci 102", "Discrete Structures I", 0, 3, "inc", "Direct", "CSci 102 · grade —"),
        ("sl12", "CSci 121", "Computer Organization and Architecture", 3, 3, "passed", "Direct", "CSci 121 · grade 2.00"),
        ("sl13", "CSci 181", "Differential Calculus for CS", 3, 3, "passed", "Direct", "CSci 181 · grade 1.75"),
        ("sl14", "Math 11", "Mathematics in the Modern World", 3, 3, "passed", "Direct", "Math 11 · grade 2.00"),
        ("sl15", "ScSc 12", "Readings in Philippine History", 3, 3, "passed", "Direct", "ScSc 12 · grade 1.50"),
        ("sl16", "ScTS 11a", "Science, Technology, and Society", 3, 3, "passed", "Discontinued equivalency", "Envi 11 · grade 1.75"),
        ("sl17", "Envi 11", "Environmental Science", 0, 3, "na", "Not yet taken", ""),
        ("sl18", "PhEd 12", "PATHFit 2 - Exercise-based Fitness Activities", 2, 2, "passed", "Direct", "PhEd 12 · grade 1.00"),
        ("sl19", "NSTP 12", "National Service Training Program II", 3, 3, "passed", "Direct", "NSTP 12 · grade 1.00")]),
    ("Year 2 · Semester 1", [(f"sl{20 + i}", c, t, 0, u, "currently_enrolled", "Direct", f"{c} · grade —") for i, (_, c, t, u) in enumerate(ENROLLED)]),
    ("Year 2 · Semester 2", [
        ("sl28", "CSci 104", "Algorithms and Complexity", 0, 4, "na", "Not yet taken", ""),
        ("sl29", "CSci 126", "Networks and Communications", 0, 3, "na", "Not yet taken", ""),
        ("sl30", "CSci 120", "Object-oriented Programming", 0, 3, "na", "Not yet taken", ""),
        ("sl31", "CSci 154", "Quantitative Methods for CS", 0, 3, "na", "Not yet taken", ""),
        ("sl32", "CSci 183", "Linear Algebra and Matrix Theory", 0, 3, "na", "Not yet taken", ""),
        ("sl33", "Humn 11", "Art Appreciation", 0, 3, "na", "Not yet taken", ""),
        ("sl34", "ScSc 16", "Life and Works of Rizal", 0, 3, "na", "Not yet taken", ""),
        ("sl35", "PhEd 14", "PATHFit 4", 0, 2, "na", "Not yet taken", "")]),
    ("Year 3 · Semester 1", [
        ("sl36", "CSci 107", "Automata Theory and Formal Languages", 0, 3, "na", "Not yet taken", ""),
        ("sl37", "CSci 123", "Operating Systems", 0, 3, "na", "Not yet taken", ""),
        ("sl38", "CSci 128", "Information Assurance and Security", 0, 3, "na", "Not yet taken", ""),
        ("sl39", "CSci 135", "Software Engineering I", 3, 3, "passed", "Transfer equivalency", "CSci E-WA1 · grade 1.75"),
        ("sl40", "CSci 141", "Artificial Intelligence", 0, 3, "na", "Not yet taken", ""),
        ("sl41", "CSci 198", "Research Planning and Manuscript Preparation", 0, 3, "na", "Not yet taken", ""),
        ("sl42", "Phlo 11", "Ethics", 0, 3, "na", "Not yet taken", "")]),
    ("Year 3 · Semester 2", [
        ("sl43", "CSci 200", "Undergraduate Thesis I", 0, 2, "na", "Not yet taken", ""),
        ("sl44", "CSci 108", "Programming Languages", 0, 3, "na", "Not yet taken", ""),
        ("sl45", "CSci 136", "Software Engineering II", 0, 3, "na", "Not yet taken", ""),
        ("sl46", "CSci 193", "Social Issues and Professional Practice", 0, 3, "na", "Not yet taken", ""),
        ("sl47", "CS Elective 1", "Open elective slot", 3, 3, "passed", "Elective mapping", "CSci E-SC1 · grade 1.50")]),
    ("Year 3 · Semester 3", [("sl48", "CS Elective 2", "Open elective slot", 0, 3, "na", "Not yet taken", "")]),
    ("Year 4 · Semester 1", [
        ("sl49", "CS Elective 3", "Open elective slot", 0, 3, "na", "Not yet taken", ""),
        ("sl50", "CSci 199", "Undergraduate Seminar", 0, 1, "na", "Not yet taken", ""),
        ("sl51", "CSci 200-II", "Undergraduate Thesis II", 0, 4, "na", "Not yet taken", "")]),
    ("Year 4 · Semester 2", [("sl52", "CSci 200a", "Internship / On-the-Job Training / Practicum", 0, 3, "na", "Not yet taken", "")]),
]
REMARKS = {"sl11": "Prof. Ramon Reyes · 17 Sept 2026|Completion requirements discussed. Follow up with the instructor before 26 October."}
EXCEPTIONS = [
    ("em1", "Elective mapping", "CSci E-SC1 → CS Elective 1",
     "Computational Science 1 · 3 credited units · Original grade 1.50. Computational Science 1 (cross-enrolled elective) approved as equivalent for the CS Elective 1 requirement.",
     "Prof. Ramon Reyes", "14 Aug 2026"),
    ("eq1", "Discontinued equivalency", "Envi 11 → ScTS 11a",
     "Environmental Science · 3 credited units · Original grade 1.75. Envi 11 (Environmental Science) accepted as equivalent for the discontinued ScTS 11a (Science, Technology, and Society) requirement under the revised GE framework.",
     "Prof. Ramon Reyes", "2 Mar 2026"),
    ("eq2", "Transfer equivalency", "CSci E-WA1 → CSci 135",
     "Web Systems and Technologies 1 · 3 credited units · Original grade 1.75. Prior web application development coursework from previous institution accepted as transfer equivalent for CSci 135 Software Engineering I.",
     "Prof. Lourdes Mendez", "20 Nov 2023"),
]
SHIFT = {"cv1": ("50", "6", "1.57"), "cv2": ("6", "50", "1.63")}

def checklist():
    filt = label_wrap("Show requirements", select("ck-filter", [("all", "All statuses"), ("na", "Not yet taken"), ("passed", "Passed / credited"),
                                                                 ("inc", "INC"), ("currently_enrolled", "Currently enrolled")]), "ck-filter")
    toolbar = (f'<div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 20px"><div style="min-width: 220px">{filt}</div>'
               f'<div style="display: flex; gap: 12px; margin-left: auto">{btn_primary("Map elective", attrs="data-open=dlg-map aria-haspopup=dialog")}'
               f'{btn_secondary("Add equivalency", attrs="data-open=dlg-equiv aria-haspopup=dialog")}</div></div>')
    panels = []
    for term, slots in CHECKLIST:
        rows = []
        for sid, code, title, earned, req, status, source, detail in slots:
            rem = REMARKS.get(sid, "")
            src = source + (f'<div style="font-size: 12.5px; color: #6E6C58; margin-top: 2px">{detail}</div>' if detail else "")
            rows.append(f'<tr class="row" data-status="{status}">' + td(course_cell(code, title)) + td(f"{earned} / {req}") + td(status_badge(status))
                        + td(src) + td(btn_secondary("View remarks", small=True, attrs=f'data-remarks="{code}" data-remark="{html.escape(rem)}" aria-haspopup="dialog"'), "right") + '</tr>')
        panels.append(panel(term, table(["Requirement", "Units earned / required", "Status", "Satisfaction source", ("Remarks", "right")], rows),
                            sub="Curriculum position · course availability depends on the school term.", pad="0", attrs="data-term-panel"))
    cards = "".join(
        f'<article data-exception="{eid}" style="flex: 0 0 290px; border: 1px solid #E1DBC6; border-radius: 6px; padding: 16px; background: #FBF8EF">'
        f'<span data-ex-badge>{badge(kind, "amber")}</span><h3 style="font-size: 15.5px; margin: 12px 0 6px">{title}</h3>'
        f'<p data-ex-text style="font-size: 13.5px; line-height: 1.6; color: #6E6C58">{text}</p>'
        f'<p style="font-size: 12.5px; color: #8C8A76; margin-top: 10px">{who} · {date}</p>'
        f'<div data-ex-actions style="display: flex; gap: 8px; border-top: 1px solid #E1DBC6; padding-top: 12px; margin-top: 14px">'
        f'{btn_secondary("Edit", small=True, attrs=f"data-edit-ex={eid} aria-haspopup=dialog")}{btn_secondary("Revoke", small=True, attrs=f"data-revoke={eid}")}</div></article>'
        for eid, kind, title, text, who, date in EXCEPTIONS)
    exceptions = panel("Recorded exceptions", f'<div style="display: flex; gap: 16px; overflow-x: auto; padding: 20px">{cards}</div>',
                       sub="Scroll horizontally to review every decision. Edits and revocations are audited.", pad="0")
    c, l, g = SHIFT["cv2"]
    shift = panel("Curriculum shift preview",
                  label_wrap("Target curriculum", select("shift-cv", [("cv1", "BSCS · 2023–2024"), ("cv2", "BSIT · 2024–2025")], "cv2", f"data-shift='{json.dumps(SHIFT)}'"), "shift-cv")
                  + '<div style="height: 18px"></div>'
                  + stats([("Carried units", c, "Passed courses with matching course identities", 'id="shift-c"'),
                           ("Lost units", l, "Passed units without an automatic match", 'id="shift-l"'),
                           ("Projected GWA", g, "On automatically carried courses", 'id="shift-g"')])
                  + '<p style="font-size: 13.5px; color: #6E6C58; margin-top: -8px">Read-only simulation. Elective mappings and equivalencies need adviser review; no course-code equivalence is assumed and no assignment is changed.</p>',
                  sub="Explore another curriculum without changing the record.")
    passed = [p.replace(" · Passed", " · 2024 - 2025 · 2nd Semester · Passed").replace(" · INC", " · 2024 - 2025 · 2nd Semester · INC") for p in
              [f"{code} · {STATUS[s][0]}" for _, code, _, _, _, _, s in PAST_TERM]] + [f"{c} · 2025 - 2026 · 1st Semester · Enrolled" for _, c, _, _ in ENROLLED]
    only_passed = [p for p in passed if p.endswith("Passed")]
    all_slots = [(code, f"{code} · {req} units") for _, slots in CHECKLIST for _, code, _, _, req, _, _, _ in slots]
    reason = lambda fid: textarea("Justification / reason for change", fid, 'placeholder="Required. This is written to the audit log."', 3)
    map_dlg = dialog("dlg-map", "Map an elective course", "Connect one enrollment record to an elective slot. Actual credited units will appear in the checklist.",
                     '<div style="display: grid; gap: 16px">'
                     + label_wrap("Source attempt", select("map-src", [(p, p) for p in passed]), "map-src")
                     + label_wrap("Destination slot", select("map-slot", [(c, f"{c} · 3 units") for c in ("CS Elective 1", "CS Elective 2", "CS Elective 3")]), "map-slot")
                     + reason("map-reason") + msg("map-msg", "0") + '</div>',
                     btn_ghost("Cancel", "data-close") + btn_primary("Save decision", attrs="data-save=map"))
    eq_dlg = dialog("dlg-equiv", "Record equivalency", "Use the original passed attempt to satisfy one requirement. This does not create a new attempt or change GWA.",
                    '<div style="display: grid; gap: 16px">'
                    + label_wrap("Source attempt", select("eq-src", [(p, p) for p in only_passed]), "eq-src")
                    + label_wrap("Destination slot", select("eq-slot", all_slots), "eq-slot")
                    + label_wrap("Decision type", select("eq-type", [("transfer", "Transfer equivalency"), ("discontinued", "Discontinued-course equivalency")]), "eq-type")
                    + reason("eq-reason") + msg("eq-msg", "0") + '</div>',
                    btn_ghost("Cancel", "data-close") + btn_primary("Save decision", attrs="data-save=equiv"))
    ex_dlg = dialog("dlg-edit-ex", "Edit decision", "Update the justification. The previous version is kept in the audit log.",
                    '<div style="display: grid; gap: 16px">' + reason("ex-reason") + msg("ex-msg", "0") + '</div>',
                    btn_ghost("Cancel", "data-close") + btn_primary("Save changes", attrs="data-save=exception"))
    rm_dlg = dialog("dlg-remarks", "Remarks", "", '<div id="rm-list"></div>'
                    + textarea("Add slot remark", "rm-new", 'placeholder="Visible to advisers only."', 3) + msg("rm-msg", "12px"),
                    btn_ghost("Close", "data-close") + btn_primary("Add remark", attrs="data-save=remark"))
    return (student_head("checklist") + toolbar + msg("ck-msg", "0").replace('style="margin-top: 0"', 'style="margin-bottom: 18px"')
            + f'<div style="display: grid; gap: 16px">{"".join(panels)}</div>'
            + '<p data-ck-empty style="font-size: 14px; color: #6E6C58; padding: 28px; text-align: center; background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 6px" hidden>No requirements match this filter.</p>'
            + f'<div style="display: grid; gap: 16px; margin-top: 16px">{exceptions}{shift}</div>'
            + map_dlg + eq_dlg + ex_dlg + rm_dlg + CAPTION)

def grades():
    open_rows = [f'<tr class="row" data-attempt="{a}">' + td(course_cell(c, t)) + td(str(u), "right") + td("—", attrs="data-mid") + td("—", attrs="data-fin")
                 + td(status_badge("currently_enrolled"), attrs="data-st")
                 + td(btn_secondary("Correct grade", small=True, attrs=f'data-grade="{a}" data-course="{c} — {t}" aria-haspopup="dialog"'), "right") + '</tr>'
                 for a, c, t, u in ENROLLED]
    def locked_row(a, c, t, u, m, f, s):
        st = status_badge(s) + ('<div style="font-size: 12px; color: #8A6206; margin-top: 4px">Due 26 Oct 2026</div>' if s == "inc" else "")
        act = (btn_primary("Resolve INC", small=True, attrs=f'data-resolve="{a}" data-course="{c} — {t}" aria-haspopup="dialog"') if s == "inc"
               else btn_secondary("Correct grade", small=True, attrs='data-open="dlg-locked" aria-haspopup="dialog"'))
        return (f'<tr class="row" data-attempt="{a}">' + td(course_cell(c, t)) + td(str(u), "right") + td(m, attrs="data-mid") + td(f, attrs="data-fin")
                + td(st, attrs="data-st") + td(act, "right") + '</tr>')
    heads = ["Course", ("Units", "right"), "Midterm", "Final / completion", "Status", ("Action", "right")]
    t1 = panel("2025 - 2026 · 1st Semester", table(heads, open_rows), sub="Term GWA — · 0 failed units · Open term", pad="0")
    t0 = panel("2024 - 2025 · 2nd Semester", table(heads, [locked_row(*r) for r in PAST_TERM]),
               sub=f'Term GWA 1.58 · 0 failed units · Locked term {ico(P_LOCK, 13, "1.6")}', pad="0")
    gdlg = dialog("dlg-grade", "Correct grade", "", '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">'
                  + field("Midterm grade", "gr-mid", "", "number", 'min="1" max="5" step="0.25" placeholder="1.00 – 5.00"')
                  + field("Final grade", "gr-fin", "", "number", 'min="1" max="5" step="0.25" placeholder="1.00 – 5.00"')
                  + f'<div style="grid-column: 1 / -1">{textarea("Reason for change", "gr-reason", "placeholder=\"Required. This is written to the audit log.\"", 3)}</div>'
                  + f'<div style="grid-column: 1 / -1">{msg("gr-msg", "0")}</div></div>',
                  btn_ghost("Cancel", "data-close") + btn_primary("Save grade", attrs="data-save=grade"))
    idlg = dialog("dlg-inc", "Resolve incomplete grade", "", '<div style="display: grid; gap: 16px">'
                  + field("Completion grade", "inc-grade", "", "number", 'min="1" max="5" step="0.25" placeholder="1.00 – 5.00"')
                  + textarea("Reason", "inc-reason", 'placeholder="Required. This is written to the audit log."', 3) + msg("inc-msg", "0") + '</div>',
                  btn_ghost("Cancel", "data-close") + btn_primary("Save grade", attrs="data-save=inc"))
    ldlg = dialog("dlg-locked", "This school term is locked", "Grade and status corrections are blocked. INC completion remains available before its deadline.",
                  callout("advisory", P_LOCK, "2024 - 2025 · 2nd Semester was locked by Teresa Alvarez on 1 Jun 2026. Ask the registrar to reopen the term if a correction is required."),
                  btn_primary("Close", attrs="data-close"))
    return (student_head("grades")
            + stats([("Cumulative GWA", "1.58", "Unit-weighted counted attempts"), ("Counted units", "56", "Excludes unresolved, unexpired INC"),
                     ("Earned units", "56", "Passed attempts selected by repeat rules"), ("Standing", "Good", "Threshold: 12 failed units per term")])
            + msg("gr-done", "0").replace('style="margin-top: 0"', 'style="margin-bottom: 18px"')
            + f'<div style="display: grid; gap: 16px">{t1}{t0}</div>'
            + '<p style="font-size: 13.5px; color: #6E6C58; margin-top: 16px">Once passed, the most recent passing attempt counts for non-repeatable and grade-replacement courses. Additional-credit passes count independently. Lapsed INC remains INC and counts as 5.00 for GWA and failed units.</p>'
            + gdlg + idlg + ldlg + CAPTION)

TERMS = [("t0", "2024 - 2025 · 2nd Semester · Locked"), ("t1", "2025 - 2026 · 1st Semester"), ("t2", "2025 - 2026 · 2nd Semester"), ("t3", "2025 - 2026 · Summer")]

def record():
    def rec_row(c, t, status, m="—", f="—"):
        return f'<tr class="row" data-code="{c}">' + td(course_cell(c, t)) + td(status_badge(status)) + td(m) + td(f) + '</tr>'
    t1 = [rec_row(c, t, "currently_enrolled") for _, c, t, _ in reversed(ENROLLED)]
    t0 = [rec_row(c, t, s, m, f) for _, c, t, _, m, f, s in PAST_TERM]
    heads = ["Course", "Status", "Midterm", "Final / completion"]
    term = select("rec-list-term", [("t1", "2025 - 2026 · 1st Semester"), ("t0", "2024 - 2025 · 2nd Semester")], "t1", 'aria-label="School term"')
    added = panel("Courses added and recorded",
                  f'<div data-term="t1">{table(heads, t1, "rec-body-t1")}</div><div data-term="t0" hidden>{table(heads, t0, "rec-body-t0")}</div>',
                  sub='<span id="rec-list-label">2025 - 2026 · 1st Semester</span>', right=f'<div style="min-width: 230px">{term}</div>', pad="0")
    picker = ('<div style="position: relative">'
              '<div style="font-size: 12.5px; font-weight: 600; color: #6E6C58; margin-bottom: 6px"><label for="off-q">Course offering</label></div>'
              '<input class="fld" id="off-q" type="text" placeholder="Search course code or title" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="off-list">'
              '<div id="off-list" role="listbox" hidden style="position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 5; max-height: 280px; overflow-y: auto; '
              'background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 6px; box-shadow: 0 12px 32px rgba(22,32,12,0.18); font-size: 13.5px"></div></div>')
    form = ('<form id="rec-form" novalidate><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px">'
            + f'<div style="grid-column: 1 / -1">{label_wrap("School term", select("rec-sch", TERMS, "t1"), "rec-sch")}</div>'
            + f'<div style="grid-column: 1 / -1">{picker}</div>'
            + '<div style="grid-column: 1 / -1"><div style="font-size: 12.5px; font-weight: 600; color: #6E6C58; margin-bottom: 6px">Direct curriculum slot</div>'
            + '<p id="rec-slot" style="font-size: 14px">Choose a course offering to see its curriculum slot.</p></div>'
            + field("Midterm grade", "rec-mid", "", "number", 'min="1" max="5" step="0.25"')
            + field("Final grade", "rec-fin", "", "number", 'min="1" max="5" step="0.25"')
            + '</div>' + msg("rec-msg", "16px")
            + f'<div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px">{btn_ghost("Cancel", attrs="data-reset")}{btn_primary("Review & record", typ="submit")}</div></form>')
    offering = panel("Student and course offering", form,
                     sub="Blank grades record enrollment. Fill missing grades here; use Grades to edit an existing value. Registrar enrollment remains separate.")
    prereq = panel("Prerequisite review", '<div id="rec-pre"><p style="font-size: 13.5px; color: #6E6C58; padding: 16px 20px">Choose a course offering to review its prerequisites.</p></div>',
                   sub="Strict prerequisites must be passed; correct a failed prerequisite in Grades with a reason.", pad="0")
    note = callout("advisory", P_FLAG, "A duplicate student + offering cannot be saved. Locked terms block adviser changes. Missing strict prerequisites direct you to Grades for a reasoned prerequisite-grade correction.")
    data = html.escape(json.dumps(OFFERINGS, ensure_ascii=False))
    return (student_head("record") + f'<div id="rec-data" data-offerings="{data}" hidden></div>'
            + columns(added, offering + prereq + note, "minmax(0, 3fr) minmax(270px, 2fr)") + CAPTION)

def history():
    rows = []
    order = ([r for r in PAST_TERM if r[1] in ("CSci E-WA1", "CSci E-SC1")][::-1]
             + [("", c, t, u, "—", "—", "currently_enrolled", "2025 - 2026 · 1st Semester") for _, c, t, u in reversed(ENROLLED)]
             + [r for r in PAST_TERM if r[1] not in ("CSci E-WA1", "CSci E-SC1")][::-1])
    for r in order:
        _, c, t, _, _, f, s = r[:7]
        term = r[7] if len(r) > 7 else "2024 - 2025 · 2nd Semester"
        prov = muted("No direct slot") if c in NO_SLOT else c
        rows.append(f'<tr class="row">' + td(f'<span style="font-weight: 600">{c}</span> — {t}') + td(term) + td(status_badge(s))
                    + td(f'<span class="mono" style="font-size: 13px">{f}</span>') + td(prov) + '</tr>')
    return (student_head("history")
            + panel("All course enrollments", table(["Course", "School term", "Status", "Grade", "Provenance"], rows),
                    sub="An attempt is one student’s record for one course offering.", pad="0") + CAPTION)

def reassign():
    checks = "".join(
        f'<label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #E1DBC6; border-radius: 4px; font-size: 14px; cursor: pointer; background: #FFFFFF">'
        f'<input type="checkbox" name="ra-student" value="{n}" data-num="{num}" style="accent-color: #2F4A12; width: 15px; height: 15px; margin: 0">'
        f'<span style="font-weight: 600">{n}</span><span class="mono" style="font-size: 12.5px; color: #6E6C58; margin-left: auto">{num}</span></label>'
        for _, n, num, *_ in ROSTER)
    form = ('<form id="ra-form" novalidate><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px">'
            + f'<fieldset style="grid-column: 1 / -1; border: 0; padding: 0; margin: 0"><legend style="font-size: 12.5px; font-weight: 600; color: #6E6C58; margin-bottom: 6px; padding: 0">Advisees to reassign</legend>'
            + f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">{checks}</div></fieldset>'
            + label_wrap("Incoming adviser", select("ra-to", [("Prof. Lourdes Mendez", "Prof. Lourdes Mendez")]), "ra-to")
            + field("Transition date", "ra-date", "2026-09-19", "date")
            + f'<div style="grid-column: 1 / -1">{textarea("Reason for reassignment", "ra-reason", "placeholder=\"Required. Visible in the transfer history.\"", 3)}</div>'
            + '</div>' + msg("ra-msg", "16px")
            + f'<div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px">{btn_ghost("Cancel", attrs="data-reset")}{btn_primary("Review reassignment", typ="submit")}</div></form>')
    hist = [("1 Aug 2026", "Andrea Villanueva", "2024-00871", "Prof. Ramon Reyes (you)", "Prof. Lourdes Mendez", "Load rebalancing"),
            ("12 Jun 2024", "Maria Isabel Bautista", "2023-04412", "Prof. Lourdes Mendez", "Prof. Ramon Reyes (you)", "Load rebalancing")]
    rows = [f'<tr class="row">' + td(d) + td(course_cell(n, f'<span class="mono">{num}</span>')) + td(fr) + td(to) + td(r) + '</tr>' for d, n, num, fr, to, r in hist]
    confirm = dialog("dlg-ra", "Confirm reassignment", "", '<div id="ra-summary" style="font-size: 14px"></div>'
                     + f'<div style="margin-top: 16px">{callout("advisory", P_FLAG, "The current assignment ends and the new one starts on the same date, so there is never a gap in adviser continuity.")}</div>',
                     btn_ghost("Back", "data-close") + btn_primary("Reassign", attrs="data-save=reassign"))
    return (page_head("Keep support continuous.", "A reassignment preserves history and uses the same end and start date.")
            + '<div style="display: grid; gap: 16px">'
            + panel("Reassign advisees", form, sub="Select the students and their next academic adviser.")
            + panel("Transfer history", table(["Transition date", "Student", "From", "To", "Reason"], rows, "ra-body"),
                    sub="Every reassignment involving your advisees, newest first.", pad="0")
            + '</div>' + confirm + CAPTION)

def settings():
    form = ('<form id="pw-form" novalidate><div style="display: grid; gap: 18px; max-width: 520px">'
            + field("Current password", "pw-cur", "", "password", 'autocomplete="current-password"')
            + field("New password", "pw-new", "", "password", 'autocomplete="new-password" minlength="8"')
            + field("Confirm new password", "pw-again", "", "password", 'autocomplete="new-password"')
            + '</div>' + msg("pw-msg", "18px")
            + f'<div style="display: flex; gap: 10px; margin-top: 20px">{btn_primary("Change password", typ="submit")}{btn_ghost("Cancel", attrs="data-reset")}</div></form>')
    return (page_head("Settings.", "Manage how you sign in to SAAIS.")
            + '<div style="display: grid; grid-template-columns: minmax(0, 560px) minmax(0, 360px); gap: 18px; align-items: start">'
            + panel("Change password", form, sub="Use at least 8 characters.")
            + f'<div>{callout("advisory", P_FLAG, "If you sign in with <b>Continue with Google</b>, your password is managed by Google and this page does not change it.")}</div></div>'
            + CAPTION)

BUILDERS = {"dashboard": dashboard, "advisees": advisees, "overview": overview, "advising": advising, "checklist": checklist,
            "grades": grades, "record": record, "history": history, "reassign": reassign, "settings": settings}

# --- Shell (matches SystemAdmin: 250px sidebar, 62px header) ---------------
def nav(active):
    owner = NAV_OWNER.get(active, active)
    items = []
    for key, label, icon in NAV:
        on = key == owner
        bg, col, fw = ("rgba(224,168,46,0.16)", "#F7E9C4", "600") if on else ("transparent", "rgba(246,242,228,0.72)", "450")
        bar = '<span data-bar style="position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; background: #E0A82E; border-radius: 0 2px 2px 0"' + ("" if on else " hidden") + '></span>'
        cur = ' aria-current="page"' if key == active else ""
        items.append(f'<a class="navi" href="{href(key)}" data-nav="{key}"{cur} style="position: relative; display: flex; align-items: center; gap: 11px; padding: 9px 16px 9px 17px; '
                     f'border-radius: 5px; font-size: 14px; background: {bg}; color: {col}; font-weight: {fw}">{bar}{ico(icon)}<span>{label}</span></a>')
    return "".join(items)

def crumb_html(active):
    trail = dict((k, t) for k, _, _, t in PAGES)[active]
    parts = ['<a class="crumb-link" href="%s" style="color: #8C8A76; font-weight: 450">Advising workspace</a>' % href("dashboard")]
    for label, key in trail:
        if key:
            parts.append(f'<a class="crumb-link" href="{href(key)}" style="color: #8C8A76; font-weight: 450">{label}</a>')
        else:
            parts.append(f'<span style="color: #16200C; font-weight: 600" aria-current="page">{label}</span>')
    return ico(P_CHEV_R, 13, "1.6", "#E1DBC6").join(parts)

def shell(active, main_html):
    return (
        '<div style="display: flex; min-height: 100vh; background: #FBF8EF">'
        '<aside style="width: 250px; flex-shrink: 0; background: #1D2F0A; display: flex; flex-direction: column; padding: 22px 12px 18px">'
        f'<a href="{href("dashboard")}" style="display: flex; align-items: center; gap: 11px; padding: 0 6px 20px"><img src="../logo-mark.png" alt="SAAIS" style="width: 34px; height: 34px; border-radius: 8px">'
        '<div><div class="dsp" style="font-size: 19px; color: #FBF8EF; letter-spacing: 0.01em">SAAIS</div>'
        '<div style="font-size: 10.5px; letter-spacing: 0.11em; text-transform: uppercase; color: rgba(246,242,228,0.55); font-weight: 600">Adviser portal</div></div></a>'
        '<div style="height: 1px; background: rgba(246,242,228,0.14); margin: 0 6px 16px"></div>'
        f'<nav aria-label="Academic adviser" style="display: flex; flex-direction: column; gap: 2px">{nav(active)}</nav>'
        '<div style="flex-grow: 1"></div><div style="height: 1px; background: rgba(246,242,228,0.14); margin: 16px 6px 10px"></div>'
        f'<a class="navi" href="../Docs.dc.html" style="display: flex; align-items: center; gap: 11px; padding: 9px 16px 9px 17px; border-radius: 5px; font-size: 13.5px; color: rgba(246,242,228,0.72); margin-bottom: 6px">{ico(P_BOOK)}<span>Help &amp; documentation</span></a>'
        '<div id="me" style="position: relative">'
        '<div id="me-menu" role="menu" hidden style="position: absolute; left: 0; right: 0; bottom: calc(100% + 6px); background: #FFFFFF; border: 1px solid #E1DBC6; border-radius: 6px; padding: 6px; box-shadow: 0 8px 24px rgba(22,32,12,0.22)">'
        f'<a role="menuitem" class="row" href="{href("settings")}" style="display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 4px; font-size: 13.5px; font-weight: 600; color: #16200C">'
        f'{ico(P_COG, 17, "1.6")}<span>Settings</span></a>'
        '<div style="height: 1px; background: #EFEADB; margin: 4px 2px"></div>'
        '<a role="menuitem" class="row" href="../Login.dc.html" style="display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 4px; font-size: 13.5px; font-weight: 600; color: #9E2E1C">'
        f'{ico(P_LOGOUT, 17, "1.6")}<span>Sign out</span></a></div>'
        '<button type="button" id="me-btn" class="navi" aria-haspopup="menu" aria-expanded="false" aria-controls="me-menu" style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 5px; border: 0; background: transparent; cursor: pointer; text-align: left; font-family: inherit">'
        + avatar("RR", 34, "#E0A82E", "#3A2A05")
        + '<div style="min-width: 0; flex-grow: 1"><div style="font-size: 13.5px; font-weight: 600; line-height: 1.25; color: #FBF8EF">Prof. Ramon Reyes</div>'
        '<div style="font-size: 11.5px; color: rgba(246,242,228,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis">Faculty of Computer Studies</div></div>'
        f'<span id="me-chev" style="display: flex; transition: transform 0.15s">{ico(P_CHEV_D, 15, "1.6", "rgba(246,242,228,0.55)")}</span></button></div></aside>'
        '<div style="flex-grow: 1; display: flex; flex-direction: column; min-width: 0">'
        '<header style="display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 32px; height: 62px; background: #FFFFFF; border-bottom: 1px solid #E1DBC6; flex-shrink: 0">'
        f'<nav id="crumb" aria-label="Breadcrumb" style="display: flex; align-items: center; gap: 9px; font-size: 13.5px; flex-wrap: wrap">{crumb_html(active)}</nav>'
        f'<div style="color: #8C8A76">{ico(P_BELL, 19, "1.6")}</div></header>'
        f'<main style="padding: 30px 32px 40px; flex-grow: 1; min-width: 0">{main_html}</main></div></div>\n'
    )

# --- Behaviour (shared by every file; each block no-ops when its page is absent)
JS = r"""<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var ICON = {
    ok: '<path d="M12 3l7.5 3v6c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    no: '<path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 9.5v4.5M12 17h.01"/>'
  };
  var C = { ok: ['#E7F0E2', '#CBDDC2', '#2C6430'], no: ['#FAE7E1', '#EFCFC5', '#9E2E1C'] };
  var TONE = { green: ['#E7F0E2', '#2C6430'], red: ['#FAE7E1', '#9E2E1C'], amber: ['#FBF0D6', '#8A6206'], blue: ['#E4EDF4', '#2A4C6B'], neutral: ['#ECE8DA', '#5C5A4C'] };
  function say(el, kind, text) {
    var c = C[kind];
    el.innerHTML = '<div role="status" style="display:flex;align-items:flex-start;gap:11px;background:' + c[0] + ';border:1px solid ' + c[1] +
      ';border-radius:5px;padding:13px 16px;color:' + c[2] + ';font-size:13.5px;line-height:1.5"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" aria-hidden="true">' +
      ICON[kind] + '</svg><div>' + text + '</div></div>';
    el.hidden = false;
    return false;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function badge(text, tone) {
    var t = TONE[tone];
    return '<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 9px 2px 8px;border-radius:3px;background:' + t[0] + ';color:' + t[1] +
      ';font-size:12px;font-weight:600;letter-spacing:0.01em;white-space:nowrap"><span style="width:6px;height:6px;border-radius:50%;background:' + t[1] + ';flex-shrink:0"></span>' + esc(text) + '</span>';
  }
  function today() { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function grade(v) { var n = +v; return v !== '' && !isNaN(n) && n >= 1 && n <= 5 && Math.round(n * 4) === n * 4; }
  function filterRows(body, test) {
    var n = 0;
    $$('tr.row', body).forEach(function (tr) { var on = test(tr); tr.hidden = !on; if (on) n++; });
    var e = body.querySelector('[data-empty]'); if (e) e.hidden = n > 0;
    return n;
  }

  /* Dialogs: [data-open=id] opens, [data-close] closes */
  var opener = null;
  function openDlg(id, from) { var d = $(id); opener = from || null; $$('[id$="-msg"]', d).forEach(function (m) { m.hidden = true; }); d.showModal(); return d; }
  $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openDlg(b.dataset.open, b); }); });
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', function () { if (opener) opener.focus(); });
  });
  /* [data-reset] clears its form */
  $$('[data-reset]').forEach(function (b) { b.addEventListener('click', function () { var f = b.closest('form'); f.reset(); $$('[id$="-msg"]', f).forEach(function (m) { m.hidden = true; }); }); });
  /* Clickable table rows */
  $$('tr[data-href]').forEach(function (tr) {
    tr.addEventListener('click', function (e) { if (!e.target.closest('a,button,input')) location.href = tr.dataset.href; });
    tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') location.href = tr.dataset.href; });
  });
  /* Term switchers: select[aria-label="School term"] toggles sibling [data-term] blocks */
  [['ov-term', 'ov-term-label'], ['rec-list-term', 'rec-list-label']].forEach(function (p) {
    var s = $(p[0]); if (!s) return;
    s.addEventListener('change', function () {
      $$('[data-term]', s.closest('section')).forEach(function (b) { b.hidden = b.dataset.term !== s.value; });
      $(p[1]).textContent = s.options[s.selectedIndex].text;
    });
  });

  /* Advisees roster */
  if ($('ros-body')) {
    var set = 'current';
    var run = function () {
      var q = $('ros-q').value.trim().toLowerCase(), st = $('ros-standing').value;
      $('ros-count').textContent = filterRows($('ros-body'), function (tr) {
        return tr.dataset.set === set && (!q || tr.dataset.q.indexOf(q) > -1) && (st === 'all' || tr.dataset.standing === st);
      });
      $('ros-past-note').hidden = set !== 'past';
    };
    $('ros-q').addEventListener('input', run); $('ros-standing').addEventListener('change', run);
    $$('[data-roster]').forEach(function (b) {
      b.addEventListener('click', function () {
        set = b.dataset.roster;
        $$('[data-roster]').forEach(function (x) { var on = x === b; x.setAttribute('aria-pressed', on); x.style.background = on ? '#2F4A12' : 'transparent'; x.style.color = on ? '#FBF8EF' : '#6E6C58'; });
        run();
      });
    });
  }

  /* Advising: recommendations, notes, assistant */
  if ($('plan-add')) {
    var count = function () { var n = $$('.plan-pick:checked').length; $('plan-count').textContent = n + ' selected'; return n; };
    $$('.plan-pick').forEach(function (c) { c.addEventListener('change', count); });
    $('plan-term').addEventListener('change', function () { $('plan-term-label').textContent = '2025 - 2026 · ' + this.options[this.selectedIndex].text; });
    $('plan-add').addEventListener('click', function () {
      var picked = $$('.plan-pick:checked').map(function (c) { return c.value; });
      if (!picked.length) return say($('plan-msg'), 'no', 'Select at least one course to add to the plan.');
      say($('plan-msg'), 'ok', 'Added to Maria\'s plan: <b>' + esc(picked.join(', ')) + '</b>. Record each enrollment once the offering opens.');
      $$('.plan-pick:checked').forEach(function (c) { c.checked = false; }); count();
    });
  }
  if ($('note-form')) $('note-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('note-body').value.trim();
    if (!v) return say($('note-msg'), 'no', 'Write the note before saving.');
    var a = document.createElement('article'); a.style.cssText = 'padding:16px 20px;border-bottom:1px solid #EFEADB';
    a.innerHTML = '<div style="display:flex;justify-content:space-between;gap:14px;font-size:12.5px;color:#8C8A76"><strong style="color:#16200C">Prof. Ramon Reyes</strong><span>' + today() + '</span></div>' +
      '<p style="font-size:14px;line-height:1.65;margin-top:8px;white-space:pre-wrap">' + esc(v) + '</p>';
    $('note-list').insertBefore(a, $('note-list').firstChild);
    this.reset(); say($('note-msg'), 'ok', 'Note saved. It is visible to advisers only.');
  });
  if ($('chat-form')) $('chat-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('chat-q').value.trim(); if (!v) return;
    var add = function (text, mine) {
      var d = document.createElement('div'); d.style.cssText = 'display:flex;justify-content:' + (mine ? 'flex-end' : 'flex-start');
      d.innerHTML = '<p style="max-width:82%;padding:9px 13px;font-size:13.5px;line-height:1.55;' + (mine ? 'background:#2F4A12;color:#FBF8EF;border-radius:12px 12px 3px 12px' : 'background:#F2EDDC;color:#16200C;border-radius:12px 12px 12px 3px') + '">' + esc(text) + '</p>';
      $('chat-log').appendChild(d); $('chat-log').scrollTop = $('chat-log').scrollHeight;
    };
    add(v, true); this.reset();
    setTimeout(function () { add('Demo preview: this assistant is not connected. Check the checklist and prerequisite review before recording enrollment.', false); }, 400);
  });

  /* Checklist */
  if ($('ck-filter')) {
    $('ck-filter').addEventListener('change', function () {
      var v = this.value, any = 0;
      $$('[data-term-panel]').forEach(function (p) {
        var n = filterRows(p, function (tr) { return v === 'all' || tr.dataset.status === v; });
        p.hidden = !n; any += n;
      });
      document.querySelector('[data-ck-empty]').hidden = any > 0;
    });
    var remarkBtn = null;
    $$('[data-remarks]').forEach(function (b) {
      b.addEventListener('click', function () {
        remarkBtn = b;
        var d = openDlg('dlg-remarks', b), r = b.dataset.remark;
        $('dlg-remarks-title').textContent = 'Remarks · ' + b.dataset.remarks;
        d.querySelector('[data-dlg-sub]').textContent = 'Slot remarks are visible to advisers only.';
        $('rm-list').innerHTML = r ? r.split('||').map(function (x) { var p = x.split('|');
          return '<div style="padding:12px 14px;background:#FBF8EF;border:1px solid #EFEADB;border-radius:5px;margin-bottom:16px"><div style="font-size:12.5px;color:#8C8A76">' + esc(p[0]) + '</div><p style="font-size:14px;margin-top:6px">' + esc(p[1]) + '</p></div>'; }).join('')
          : '<p style="font-size:13.5px;color:#6E6C58;margin-bottom:16px">No remarks on this slot yet.</p>';
        $('rm-new').value = '';
      });
    });
    var editing = null;
    $$('[data-edit-ex]').forEach(function (b) {
      b.addEventListener('click', function () { editing = b.closest('[data-exception]'); openDlg('dlg-edit-ex', b); $('ex-reason').value = editing.querySelector('[data-ex-text]').textContent; });
    });
    $$('[data-revoke]').forEach(function (b) {
      b.addEventListener('click', function () {
        var card = b.closest('[data-exception]');
        card.style.opacity = '0.6';
        card.querySelector('[data-ex-badge]').innerHTML = badge('Revoked', 'red');
        card.querySelector('[data-ex-actions]').innerHTML = '<span style="font-size:12.5px;color:#9E2E1C;font-weight:600">Revoked ' + today() + ' · audited</span>';
        say($('ck-msg'), 'ok', 'Decision revoked. The requirement returns to its unsatisfied state and the change is in the audit log.');
      });
    });
    var saves = {
      map: function () { if (!$('map-reason').value.trim()) return say($('map-msg'), 'no', 'Give a justification for the mapping.');
        return 'Elective mapping saved: <b>' + esc($('map-src').value.split(' · ')[0]) + ' → ' + esc($('map-slot').value) + '</b>.'; },
      equiv: function () { if (!$('eq-reason').value.trim()) return say($('eq-msg'), 'no', 'Give a justification for the equivalency.');
        return 'Equivalency saved: <b>' + esc($('eq-src').value.split(' · ')[0]) + ' → ' + esc($('eq-slot').value) + '</b>. GWA is unchanged.'; },
      exception: function () { var v = $('ex-reason').value.trim(); if (!v) return say($('ex-msg'), 'no', 'The justification cannot be empty.');
        editing.querySelector('[data-ex-text]').textContent = v; return 'Decision updated. The previous justification is kept in the audit log.'; },
      remark: function () { var v = $('rm-new').value.trim(); if (!v) return say($('rm-msg'), 'no', 'Write the remark first.');
        remarkBtn.dataset.remark = (remarkBtn.dataset.remark ? remarkBtn.dataset.remark + '||' : '') + 'Prof. Ramon Reyes · ' + today() + '|' + v;
        return 'Remark added to <b>' + esc(remarkBtn.dataset.remarks) + '</b>.'; }
    };
    $$('[data-save]').forEach(function (b) {
      if (!saves[b.dataset.save]) return;
      b.addEventListener('click', function () { var r = saves[b.dataset.save](); if (!r) return; b.closest('dialog').close(); say($('ck-msg'), 'ok', r); });
    });
    var shift = JSON.parse($('shift-cv').dataset.shift);
    $('shift-cv').addEventListener('change', function () { var s = shift[this.value]; $('shift-c').textContent = s[0]; $('shift-l').textContent = s[1]; $('shift-g').textContent = s[2]; });
  }

  /* Grades */
  if ($('dlg-grade')) {
    var row = null;
    var setResult = function (tr, fin, mid) {
      if (mid !== undefined && mid !== '') tr.querySelector('[data-mid]').textContent = (+mid).toFixed(2);
      tr.querySelector('[data-fin]').textContent = (+fin).toFixed(2);
      tr.querySelector('[data-st]').innerHTML = +fin <= 3 ? badge('Passed', 'green') : badge('Failed', 'red');
    };
    $$('[data-grade]').forEach(function (b) {
      b.addEventListener('click', function () {
        row = b.closest('tr'); var d = openDlg('dlg-grade', b);
        d.querySelector('[data-dlg-sub]').textContent = b.dataset.course + ' · Maria Isabel Bautista';
        ['gr-mid', 'gr-fin', 'gr-reason'].forEach(function (id) { $(id).value = ''; });
      });
    });
    $$('[data-resolve]').forEach(function (b) {
      b.addEventListener('click', function () {
        row = b.closest('tr'); var d = openDlg('dlg-inc', b);
        d.querySelector('[data-dlg-sub]').textContent = b.dataset.course + ' · Maria Isabel Bautista';
        ['inc-grade', 'inc-reason'].forEach(function (id) { $(id).value = ''; });
      });
    });
    document.querySelector('[data-save=grade]').addEventListener('click', function () {
      var m = $('gr-mid').value, f = $('gr-fin').value;
      if (m === '' && f === '') return say($('gr-msg'), 'no', 'Enter a midterm or final grade.');
      if ((m !== '' && !grade(m)) || (f !== '' && !grade(f))) return say($('gr-msg'), 'no', 'Grades run from 1.00 to 5.00 in 0.25 steps.');
      if (!$('gr-reason').value.trim()) return say($('gr-msg'), 'no', 'Give a reason. Every grade change is audited.');
      if (f !== '') setResult(row, f, m); else row.querySelector('[data-mid]').textContent = (+m).toFixed(2);
      this.closest('dialog').close();
      say($('gr-done'), 'ok', 'Grade recorded for <b>' + esc(row.querySelector('div').textContent) + '</b>. GWA is recomputed on save.');
    });
    document.querySelector('[data-save=inc]').addEventListener('click', function () {
      var g = $('inc-grade').value;
      if (!grade(g)) return say($('inc-msg'), 'no', 'Completion grades run from 1.00 to 5.00 in 0.25 steps.');
      if (!$('inc-reason').value.trim()) return say($('inc-msg'), 'no', 'Give a reason for the completion.');
      setResult(row, g); var b = row.querySelector('[data-resolve]'); b.disabled = true; b.style.opacity = '0.55'; b.style.cursor = 'default'; b.textContent = 'Resolved';
      this.closest('dialog').close();
      say($('gr-done'), 'ok', 'INC resolved for <b>' + esc(row.querySelector('div').textContent) + '</b> with a completion grade of ' + (+g).toFixed(2) + '. The original attempt is preserved.');
    });
  }

  /* Record enrollment */
  if ($('rec-form')) {
    var OFF = JSON.parse($('rec-data').dataset.offerings), chosen = null, confirmFor = null;
    var list = $('off-list'), q = $('off-q');
    var show = function () {
      var t = $('rec-sch').value, s = q.value.trim().toLowerCase(), groups = {};
      OFF[t].forEach(function (o) { if (!s || (o.code + ' ' + o.title).toLowerCase().indexOf(s) > -1) (groups[o.group] = groups[o.group] || []).push(o); });
      var keys = Object.keys(groups);
      list.innerHTML = keys.length ? keys.map(function (g) {
        return '<div style="padding:10px 12px;background:#FBF8EF;font-weight:600">' + esc(g) + '</div>' + groups[g].map(function (o) {
          return '<div role="option" class="row" data-off="' + o.id + '" style="padding:9px 12px;cursor:pointer;border-top:1px solid #EFEADB"><b>' + esc(o.code) + '</b> — ' + esc(o.title) + (o.note ? ' <span style="color:#8C8A76">· ' + esc(o.note) + '</span>' : '') + '</div>';
        }).join('');
      }).join('') : '<div style="padding:10px 12px;color:#6E6C58">No offerings match. Try another code or title.</div>';
      list.hidden = false; q.setAttribute('aria-expanded', 'true');
    };
    var hide = function () { list.hidden = true; q.setAttribute('aria-expanded', 'false'); };
    var RES = { 'Satisfied': 'green', 'Confirmation needed': 'amber', 'Advisory only': 'neutral' };
    var choose = function (o) {
      chosen = o; q.value = o.code + ' — ' + o.title; hide();
      $('rec-slot').textContent = o.slot || 'No direct slot. Map it to an elective after recording.';
      $('rec-pre').innerHTML = o.pre.length ? '<table><thead><tr>' + ['Prerequisite', 'Type', 'Result'].map(function (h) {
          return '<th style="text-align:left;padding:10px 14px;font-size:11.5px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:#8C8A76;background:#F2EDDC;border-bottom:1px solid #E1DBC6">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        o.pre.map(function (p) { var c = 'padding:11px 14px;font-size:13.5px;border-bottom:1px solid #EFEADB';
          return '<tr><td style="' + c + '">' + esc(p[0]) + '</td><td style="' + c + '">' + esc(p[1]) + '</td><td style="' + c + '">' + badge(p[2], RES[p[2]] || 'neutral') + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<p style="font-size:13.5px;color:#6E6C58;padding:16px 20px">' + esc(o.code) + ' has no prerequisites.</p>';
    };
    q.addEventListener('focus', show); q.addEventListener('input', function () { chosen = null; show(); });
    list.addEventListener('mousedown', function (e) { var el = e.target.closest('[data-off]'); if (!el) return; e.preventDefault();
      choose(OFF[$('rec-sch').value].filter(function (o) { return o.id === el.dataset.off; })[0]); });
    document.addEventListener('click', function (e) { if (!e.target.closest('#off-list') && e.target !== q) hide(); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    $('rec-sch').addEventListener('change', function () { chosen = null; q.value = ''; $('rec-slot').textContent = 'Choose a course offering to see its curriculum slot.';
      $('rec-pre').innerHTML = '<p style="font-size:13.5px;color:#6E6C58;padding:16px 20px">Choose a course offering to review its prerequisites.</p>'; });
    $('rec-form').addEventListener('reset', function () { setTimeout(function () { $('rec-sch').dispatchEvent(new Event('change')); }); });
    $('rec-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = $('rec-sch').value, m = $('rec-mid').value, f = $('rec-fin').value, M = $('rec-msg');
      if (t === 't0') return say(M, 'no', '2024 - 2025 · 2nd Semester is locked. Adviser changes are blocked for locked terms.');
      if (!chosen) return say(M, 'no', 'Choose a course offering from the list.');
      if ((m !== '' && !grade(m)) || (f !== '' && !grade(f))) return say(M, 'no', 'Grades run from 1.00 to 5.00 in 0.25 steps. Leave them blank to record enrollment only.');
      var body = $('rec-body-t1');
      if (t === 't1' && $$('tr', body).some(function (tr) { return tr.dataset.code === chosen.code; }))
        return say(M, 'no', 'Maria is already recorded in <b>' + esc(chosen.code) + '</b> this term. A duplicate student + offering cannot be saved; use Grades to edit it.');
      var pending = chosen.pre.filter(function (p) { return p[1] === 'Strict' && p[2] !== 'Satisfied'; });
      if (pending.length && confirmFor !== chosen.id) {
        confirmFor = chosen.id;
        return say(M, 'no', 'Strict prerequisite still in progress: <b>' + esc(pending.map(function (p) { return p[0]; }).join(', ')) + '</b>. Select <b>Review &amp; record</b> again to record it pending confirmation, or correct the prerequisite grade in Grades first.');
      }
      confirmFor = null;
      var st = f === '' ? badge('Enrolled', 'blue') : +f <= 3 ? badge('Passed', 'green') : badge('Failed', 'red');
      if (t === 't1') {
        var tr = document.createElement('tr'); tr.className = 'row'; tr.dataset.code = chosen.code;
        var c = 'padding:11px 14px;font-size:13.5px;border-bottom:1px solid #EFEADB;vertical-align:middle';
        tr.innerHTML = '<td style="' + c + '"><div style="font-weight:600">' + esc(chosen.code) + '</div><div style="font-size:12.5px;color:#6E6C58;margin-top:2px">' + esc(chosen.title) + '</div></td><td style="' + c + '">' + st +
          '</td><td style="' + c + '">' + (m === '' ? '—' : (+m).toFixed(2)) + '</td><td style="' + c + '">' + (f === '' ? '—' : (+f).toFixed(2)) + '</td>';
        body.insertBefore(tr, body.firstChild);
      }
      say(M, 'ok', 'Recorded <b>' + esc(chosen.code) + '</b> for Maria Isabel Bautista · ' + esc($('rec-sch').options[$('rec-sch').selectedIndex].text) + '.');
      chosen = null; q.value = ''; $('rec-mid').value = ''; $('rec-fin').value = '';
    });
  }

  /* Reassignment */
  if ($('ra-form')) {
    var picked = [];
    $('ra-form').addEventListener('submit', function (e) {
      e.preventDefault();
      picked = $$('input[name=ra-student]:checked');
      if (!picked.length) return say($('ra-msg'), 'no', 'Select at least one advisee to reassign.');
      if (!$('ra-date').value) return say($('ra-msg'), 'no', 'Choose the transition date.');
      if (!$('ra-reason').value.trim()) return say($('ra-msg'), 'no', 'Give the reason for the reassignment.');
      $('ra-msg').hidden = true;
      var when = new Date($('ra-date').value + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      $('ra-summary').innerHTML = '<p>Move <b>' + esc(picked.map(function (c) { return c.value; }).join(', ')) + '</b> from <b>Prof. Ramon Reyes</b> to <b>' + esc($('ra-to').value) + '</b> on <b>' + when + '</b>.</p>';
      openDlg('dlg-ra', this.querySelector('[type=submit]'));
    });
    document.querySelector('[data-save=reassign]').addEventListener('click', function () {
      var when = new Date($('ra-date').value + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      var c = 'padding:11px 14px;font-size:13.5px;border-bottom:1px solid #EFEADB;vertical-align:middle';
      picked.forEach(function (cb) {
        var tr = document.createElement('tr'); tr.className = 'row';
        tr.innerHTML = '<td style="' + c + '">' + when + '</td><td style="' + c + '"><div style="font-weight:600">' + esc(cb.value) + '</div><div class="mono" style="font-size:12.5px;color:#6E6C58;margin-top:2px">' + esc(cb.dataset.num) +
          '</div></td><td style="' + c + '">Prof. Ramon Reyes (you)</td><td style="' + c + '">' + esc($('ra-to').value) + '</td><td style="' + c + '">' + esc($('ra-reason').value.trim()) + '</td>';
        $('ra-body').insertBefore(tr, $('ra-body').firstChild);
        cb.closest('label').remove();
      });
      this.closest('dialog').close();
      say($('ra-msg'), 'ok', picked.length + ' advisee' + (picked.length > 1 ? 's' : '') + ' reassigned to <b>' + esc($('ra-to').value) + '</b> from ' + when + '. History is preserved.');
      $('ra-reason').value = '';
    });
  }

  /* Settings: change password */
  if ($('pw-form')) $('pw-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var c = $('pw-cur').value, n = $('pw-new').value, a = $('pw-again').value;
    if (!c) return say($('pw-msg'), 'no', 'Enter your current password.');
    if (n.length < 8) return say($('pw-msg'), 'no', 'Use at least 8 characters for the new password.');
    if (n === c) return say($('pw-msg'), 'no', 'Choose a password different from your current one.');
    if (n !== a) return say($('pw-msg'), 'no', 'The new password fields don\'t match.');
    this.reset(); say($('pw-msg'), 'ok', 'Password updated. Your other devices have been signed out.');
  });

  /* Profile menu (sidebar) */
  if ($('me-btn')) {
    var setMenu = function (on) {
      $('me-menu').hidden = !on; $('me-btn').setAttribute('aria-expanded', on);
      $('me-chev').style.transform = on ? 'rotate(180deg)' : '';
    };
    $('me-btn').addEventListener('click', function (e) { e.stopPropagation(); setMenu($('me-menu').hidden); });
    document.addEventListener('click', function (e) { if (!$('me').contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('me-menu').hidden) { setMenu(false); $('me-btn').focus(); } });
  }

  /* Adviser.dc.html: hash navigation between every screen */
  var views = document.querySelectorAll('[data-view]');
  if (views.length > 1) {
    var OWNER = { overview: 'advisees', advising: 'advisees', checklist: 'advisees', grades: 'advisees', record: 'advisees', history: 'advisees' };
    var showView = function () {
      var key = (location.hash || '').slice(1), v = document.querySelector('[data-view="' + key + '"]');
      if (!v) { key = 'dashboard'; v = document.querySelector('[data-view="dashboard"]'); }
      views.forEach(function (x) { x.hidden = x !== v; });
      var owner = OWNER[key] || key;
      $$('[data-nav]').forEach(function (a) {
        var on = a.dataset.nav === owner;
        a.style.background = on ? 'rgba(224,168,46,0.16)' : 'transparent';
        a.style.color = on ? '#F7E9C4' : 'rgba(246,242,228,0.72)';
        a.style.fontWeight = on ? '600' : '450';
        a.querySelector('[data-bar]').hidden = !on;
        if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      $('crumb').innerHTML = v.dataset.crumb;
      document.title = v.dataset.title + ' · SAAIS';
      if ($('me-menu')) $('me-menu').hidden = true, $('me-btn').setAttribute('aria-expanded', false), $('me-chev').style.transform = '';
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', showView); showView();
  }
})();
</script>"""

def write(name, title, body):
    (OUT / name).write_text(HEAD % {"title": title} + body + FOOT % {"script": JS}, encoding="utf-8")

for old in OUT.glob("*.html"):
    old.unlink()

for key, file, title, _ in PAGES:
    write(file, title, shell(key, BUILDERS[key]()))

STANDALONE = True
views = "".join(
    f'<div data-view="{k}" data-title="{html.escape(t)}" data-crumb="{html.escape(crumb_html(k))}"{"" if k == "dashboard" else " hidden"}>{BUILDERS[k]()}</div>'
    for k, _, t, _ in PAGES)
write("Adviser.dc.html", "Academic adviser", shell("dashboard", views))
print("Wrote", len(PAGES) + 1, "Adviser pages to", OUT)
