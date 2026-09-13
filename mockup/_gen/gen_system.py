# -*- coding: utf-8 -*-
"""Design system sheet + mobile artboards."""
from base import *

# ================================================================== system
def swatch(name, hexv, usage, dark=False):
    return (f'<div style="border: 1px solid {LINE}; border-radius: 6px; overflow: hidden; background: {SURFACE}">'
            f'<div style="height: 74px; background: {hexv}"></div>'
            f'<div style="padding: 11px 13px">'
            f'<div style="font-size: 13px; font-weight: 600">{name}</div>'
            f'<div class="mono" style="font-size: 12px; color: {MUTED_2}; margin-top: 2px">{hexv}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED}; margin-top: 6px; line-height: 1.45">{usage}</div>'
            f'</div></div>')


def spec(label, sample, meta):
    return (f'<div style="display: flex; align-items: baseline; gap: 24px; padding: 16px 0; '
            f'border-bottom: 1px solid {LINE_SF}">'
            f'<div style="width: 150px; flex-shrink: 0; font-size: 12px; color: {MUTED_2}; '
            f'font-weight: 600">{label}</div>'
            f'<div style="flex-grow: 1; min-width: 0">{sample}</div>'
            f'<div class="mono" style="font-size: 11.5px; color: {MUTED_2}; flex-shrink: 0; '
            f'text-align: right; width: 260px">{meta}</div></div>')


def sysblock(title, inner, sub=""):
    s = f'<p style="font-size: 13.5px; color: {MUTED}; margin-top: 6px; max-width: 78ch">{sub}</p>' if sub else ""
    return (f'<section style="margin-bottom: 44px">'
            f'<div style="display: flex; align-items: baseline; gap: 14px; padding-bottom: 14px; '
            f'border-bottom: 2px solid {INK}">'
            f'<h2 class="dsp" style="font-size: 24px">{title}</h2></div>{s}'
            f'<div style="margin-top: 22px">{inner}</div></section>')


TYPE_SPECS = [
    ("Display / XL", '<div class="dsp" style="font-size: 56px">Advising that leaves a record</div>',
     "Syne 700 · 56/1.08 · −0.01em"),
    ("Display / L", '<div class="dsp" style="font-size: 38px">Curriculum checklist</div>',
     "Syne 700 · 38/1.1"),
    ("Display / M", '<div class="dsp" style="font-size: 30px">System overview</div>',
     "Syne 700 · 30/1.15"),
    ("Heading", '<h3 style="font-size: 16px">Prerequisite check</h3>',
     "IBM Plex Sans 600 · 16/1.4"),
    ("Kicker", '<div class="kick" style="color: ' + GOLD_DP + '">The rules engine</div>',
     "IBM Plex Sans 600 · 11.5 · 0.14em · uppercase"),
    ("Body", '<p style="font-size: 15px; color: ' + MUTED + '; max-width: 62ch">Strict prerequisites are checked '
     'at enrollment, but SAAIS is a soft-check system: the adviser may continue, and the continuation is the '
     'thing that gets recorded.</p>', "IBM Plex Sans 400 · 15/1.55"),
    ("Table cell", '<span style="font-size: 13.5px">Design and Analysis of Algorithms</span>',
     "IBM Plex Sans 400 · 13.5/1.5"),
    ("Numeric / code", '<span class="mono" style="font-size: 14px">CS 132 · 1.75 · 2023-04412</span>',
     "IBM Plex Mono 500 · tabular"),
]

BADGE_ROW = flex("".join(status(k) for k in
                 ["passed", "failed", "inc", "lapsed", "enrolled", "dr", "na", "open"]), gap="10px", wrap="wrap")

BUTTON_ROW = flex(btn("Record attempt", "primary", "plus") + btn("Continue with override", "gold")
                  + btn("Export PDF", "secondary", "file") + btn("Cancel", "ghost")
                  + btn("Small", "primary", size="sm") + btn("Large action", "primary", size="lg"),
                  gap="12px", wrap="wrap")

ICON_ROW = flex("".join(
    f'<div style="display: flex; flex-direction: column; align-items: center; gap: 7px; width: 74px">'
    f'<div style="width: 42px; height: 42px; border: 1px solid {LINE}; border-radius: 6px; background: {SURFACE}; '
    f'display: flex; align-items: center; justify-content: center; color: {FOREST}">{ico(n, 21)}</div>'
    f'<div style="font-size: 10.5px; color: {MUTED_2}">{n}</div></div>'
    for n in ["grid", "check", "list", "chart", "clock", "user", "users", "note", "swap", "plus", "book",
              "cal", "shield", "cog", "search", "bell", "alert", "flag", "lock", "mail", "print", "file",
              "node", "layers", "filter", "eye", "out", "logout"]), gap="12px", wrap="wrap")

SYSTEM = (f'<div style="background: {CREAM}; padding: 48px 56px 60px">'
          f'<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 40px; '
          f'padding-bottom: 30px; margin-bottom: 40px; border-bottom: 2px solid {INK}">'
          f'<div style="display: flex; align-items: center; gap: 16px">'
          f'<img src="logo-mark.png" alt="" style="width: 60px; height: 60px; border-radius: 14px">'
          f'<div><h1 class="dsp" style="font-size: 36px">SAAIS design system</h1>'
          f'<p style="font-size: 14.5px; color: {MUTED}; margin-top: 4px">Tokens, type, components and status '
          f'vocabulary used across all three portals.</p></div></div>'
          f'<div style="text-align: right; font-size: 12.5px; color: {MUTED_2}; flex-shrink: 0; line-height: 1.7">'
          f'Derived from the SAAIS mark<br>Syne + IBM Plex Sans<br>WCAG 2.1 AA contrast targets</div></div>'

          + sysblock("Palette",
                     '<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px">'
                     + swatch("Forest deep", FOREST_DP, "Sidebar, hero and footer grounds")
                     + swatch("Forest", FOREST, "Primary actions, headings on light, active states")
                     + swatch("Forest soft", FOREST_SF, "Secondary marks, chart fills")
                     + swatch("Gold", GOLD, "Single accent — override actions, active indicators")
                     + swatch("Gold deep", GOLD_DP, "Accent text and links on cream")
                     + swatch("Cream", CREAM, "Application background")
                     + swatch("Cream deep", CREAM_DP, "Table headers, inert chips, panel grounds")
                     + swatch("Surface", SURFACE, "Cards, panels, inputs")
                     + swatch("Line", LINE, "Borders and dividers")
                     + swatch("Ink", INK, "Primary text")
                     + '</div>',
                     "Three colors carried straight off the mark: the deep olive of the tile, the gold of the "
                     "field, the cream of the letterform. Gold is the only accent and it is reserved — it marks "
                     "the override, the exception, the thing an auditor will look for.")

          + sysblock("Typography",
                     "".join(spec(l, s, m) for l, s, m in TYPE_SPECS),
                     "Syne carries the institutional voice in headings; IBM Plex Sans carries the data. "
                     "Numbers are tabular everywhere so grades and units align down a column.")

          + sysblock("Status vocabulary",
                     f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 6px; '
                     f'padding: 24px">{BADGE_ROW}'
                     f'<p style="font-size: 13.5px; color: {MUTED}; margin-top: 20px; max-width: 88ch; '
                     f'line-height: 1.6">Every badge carries a text label as well as a color, and each pairs a '
                     f'dot with the word — color is never the only channel. <b>INC</b> and <b>INC lapsed</b> are '
                     f'deliberately distinct: a lapsed INC keeps the status it was given and is only '
                     f'<i>evaluated</i> as 5.00.</p>'
                     f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; '
                     f'margin-top: 22px">' +
                     "".join(f'<div style="border: 1px solid {LINE}; border-radius: 5px; padding: 13px">'
                             f'<div style="font-size: 12.5px; font-weight: 600">{t}</div>'
                             f'<div style="font-size: 12px; color: {MUTED}; margin-top: 5px; line-height: 1.5">{d}</div></div>'
                             for t, d in [
                                 ("Contrast", "All badge text clears 4.5:1 on its own ground."),
                                 ("Focus ring", "2px forest outline, 2px offset, on every interactive element."),
                                 ("Hit target", "44px minimum on touch surfaces."),
                                 ("Screen readers", "Status is announced as text, not as a color name.")]) +
                     '</div></div>')

          + sysblock("Buttons and controls",
                     f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 6px; '
                     f'padding: 24px">{BUTTON_ROW}'
                     f'<div style="height: 1px; background: {LINE_SF}; margin: 24px 0"></div>'
                     f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px">'
                     f'{field("Text field", "CS 132")}'
                     f'{select("Select", "grade_replacement")}'
                     f'{field("Disabled", "2023-04412", disabled=True)}'
                     f'<div>{searchbar("Search", "100%")}</div></div>'
                     f'<div style="height: 1px; background: {LINE_SF}; margin: 24px 0"></div>'
                     f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px">'
                     f'{note("Advisory — an exception the adviser should read before continuing.", "gold", "flag")}'
                     f'{note("Confirmed — the invariant held and the write is safe.", "green", "shield")}'
                     f'{note("Blocked — the request was refused by a policy or a lock.", "red", "alert")}</div></div>',
                     "Gold is used for exactly one button in the product: <b>Continue with override</b>. "
                     "Nothing else competes with it.")

          + sysblock("Icons",
                     f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 6px; '
                     f'padding: 24px">{ICON_ROW}</div>',
                     "One stroke-based family on a 24px grid at 1.6 weight. No emoji anywhere in the product.")

          + sysblock("Layout and density",
                     f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px">' +
                     "".join(card(f'<div class="kick" style="color: {MUTED_2}">{t}</div>'
                                  f'<div class="dsp" style="font-size: 26px; margin-top: 8px">{v}</div>'
                                  f'<div style="font-size: 13px; color: {MUTED}; margin-top: 8px; '
                                  f'line-height: 1.55">{d}</div>')
                             for t, v, d in [
                                 ("Sidebar", "250 px", "Fixed. Collapses to a drawer below the md breakpoint."),
                                 ("Content gutter", "32 px", "30px top padding; 40px bottom on every app page."),
                                 ("Grid gap", "16–18 px", "Cards and panels sit on a consistent rhythm."),
                                 ("Card radius", "6 px", "Panels and cards. 4px on inputs and chips."),
                                 ("Table row", "11 px", "Vertical padding; 13.5px cell type; 1px hairline rule."),
                                 ("Breakpoint", "768 px", "Tables become stacked cards; nav becomes a drawer.")]) +
                     '</div>')
          + '</div>')
write("DesignSystem", SYSTEM)


# ================================================================== mobile
MW = 390


def m_header(title, back=False):
    left = (ico("left", 22, INK) if back else
            '<img src="logo-mark.png" alt="" style="width: 30px; height: 30px; border-radius: 7px">')
    return (f'<header style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; '
            f'background: {SURFACE}; border-bottom: 1px solid {LINE}; position: sticky; top: 0">'
            f'<div style="width: 44px; height: 44px; display: flex; align-items: center">{left}</div>'
            f'<div style="flex-grow: 1; font-size: 16px; font-weight: 600">{title}</div>'
            f'<div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; '
            f'color: {MUTED}">{ico("bell", 21)}</div>'
            f'<div style="width: 44px; height: 44px; display: flex; align-items: center; '
            f'justify-content: center">{avatar("MB", 32)}</div></header>')


def m_tabbar(active, items):
    out = ""
    for i, l in items:
        on = l == active
        out += (f'<div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; '
                f'padding: 10px 0 12px; min-height: 56px; color: {FOREST if on else MUTED_2}">'
                f'{ico(i, 21, sw=1.7 if on else 1.5)}'
                f'<span style="font-size: 10.5px; font-weight: {"600" if on else "450"}">{l}</span></div>')
    return (f'<nav style="display: flex; background: {SURFACE}; border-top: 1px solid {LINE}; '
            f'padding: 0 4px">{out}</nav>')


def m_shell(header, body, tabbar, h=844):
    return (f'<div style="width: {MW}px; height: {h}px; display: flex; flex-direction: column; '
            f'background: {CREAM}; overflow: hidden">{header}'
            f'<div style="flex-grow: 1; overflow: hidden; padding: 16px 16px 20px">{body}</div>{tabbar}</div>')


STU_TABS = [("grid", "Home"), ("check", "Checklist"), ("chart", "Grades"), ("clock", "History"), ("user", "Profile")]

M_DASH_BODY = (
    f'<div style="background: {FOREST_DP}; border-radius: 10px; padding: 18px; color: {CREAM}">'
    f'<div class="kick" style="color: {GOLD}">Cumulative GWA</div>'
    f'<div style="display: flex; align-items: flex-end; justify-content: space-between; margin-top: 8px">'
    f'<div class="dsp" style="font-size: 42px">1.68</div>'
    f'<div style="text-align: right; font-size: 12px; color: rgba(246,242,228,0.7); line-height: 1.5">'
    f'61 of 156 units<br>Good standing</div></div>'
    f'<div style="margin-top: 14px">{progress(39, "100%", 6, GOLD, "rgba(246,242,228,0.2)")}</div></div>'

    f'<div style="background: {INC_BG}; border: 1px solid #EBDCAE; border-radius: 8px; padding: 14px; '
    f'margin-top: 14px; display: flex; gap: 11px">'
    f'{ico("clock", 19, INC_FG)}'
    f'<div><div style="font-size: 13.5px; font-weight: 600; color: {INC_FG}">STAT 101 INC lapses in 47 days</div>'
    f'<div style="font-size: 12.5px; color: {INC_FG}; opacity: 0.85; margin-top: 3px; line-height: 1.45">'
    f'Deadline 26 October 2026</div></div></div>'

    f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 8px; margin-top: 14px; '
    f'overflow: hidden">'
    f'<div style="padding: 13px 16px; border-bottom: 1px solid {LINE}; display: flex; align-items: center; '
    f'justify-content: space-between"><span style="font-size: 14px; font-weight: 600">This term</span>'
    f'{badge("16 units", MUTED, CREAM_DP, dot=False)}</div>' +
    "".join(f'<div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; min-height: 48px; '
            f'border-bottom: 1px solid {LINE_SF}">'
            f'<div style="width: 66px; flex-shrink: 0">{code(c)}</div>'
            f'<div style="flex-grow: 1; min-width: 0"><div style="font-size: 13px">{t}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED_2}; margin-top: 1px">{s}</div></div>'
            f'{status("enrolled", "In progress")}</div>'
            for c, t, s in [("CS 121", "Data Structures", "MWF 09:00 · CS121-A"),
                            ("CS 122", "Object-Oriented Prog.", "TTh 10:30 · CS122-B"),
                            ("MATH 22", "Calculus II", "MWF 13:00 · MATH22-C"),
                            ("GE 7", "Ethics", "TTh 15:00 · GE7-D")]) +
    f'<div style="padding: 12px 16px; text-align: center; font-size: 13px; font-weight: 600; color: {FOREST}; '
    f'min-height: 44px">View all 5 courses</div></div>'

    f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 8px; padding: 14px 16px; '
    f'margin-top: 14px; display: flex; align-items: center; gap: 12px; min-height: 68px">'
    f'{avatar("RR", 42, CREAM_DP, FOREST)}'
    f'<div style="flex-grow: 1"><div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; '
    f'color: {MUTED_2}; font-weight: 600">Your adviser</div>'
    f'<div style="font-size: 14px; font-weight: 600; margin-top: 2px">Prof. Ramon Reyes</div>'
    f'<div style="font-size: 12px; color: {MUTED_2}">Tue &amp; Thu, 13:00–16:00</div></div>'
    f'<div style="color: {MUTED_2}">{ico("right", 18)}</div></div>')

write("MobileStudentHome", m_shell(m_header("Dashboard"), M_DASH_BODY, m_tabbar("Home", STU_TABS)))


def m_slot(c, t, u, st, grade, prov=""):
    p = (f'<div style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: {GOLD_DP}; '
         f'margin-top: 4px">{ico("swap", 12, GOLD_DP)}{prov}</div>') if prov else ""
    return (f'<div style="padding: 13px 16px; border-bottom: 1px solid {LINE_SF}; min-height: 60px">'
            f'<div style="display: flex; align-items: flex-start; gap: 12px">'
            f'<div style="flex-grow: 1; min-width: 0">'
            f'<div style="display: flex; align-items: center; gap: 8px">{code(c)}'
            f'<span style="font-size: 11.5px; color: {MUTED_2}">{u} units</span></div>'
            f'<div style="font-size: 13px; margin-top: 3px">{t}</div>{p}</div>'
            f'<div style="text-align: right; flex-shrink: 0">{status(st)}'
            f'<div class="mono" style="font-size: 13px; font-weight: 600; margin-top: 5px">{grade}</div></div>'
            f'</div></div>')


M_CHK_BODY = (
    f'<div style="display: flex; gap: 8px; overflow: hidden; margin-bottom: 14px">' +
    "".join(f'<div style="padding: 9px 14px; border-radius: 20px; font-size: 12.5px; font-weight: '
            f'{"600" if on else "450"}; white-space: nowrap; min-height: 40px; display: flex; '
            f'align-items: center; background: {FOREST if on else SURFACE}; '
            f'color: {CREAM if on else MUTED}; border: 1px solid {FOREST if on else LINE}">{t}</div>'
            for t, on in [("All", False), ("Year 1", False), ("Year 2", True), ("Year 3", False)]) +
    '</div>'

    f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 8px; padding: 16px; '
    f'margin-bottom: 14px">'
    f'<div style="display: flex; align-items: center; justify-content: space-between">'
    f'<span style="font-size: 13.5px; font-weight: 600">Year 2 progress</span>'
    f'<span style="font-size: 12.5px; color: {MUTED_2}">15 of 36 units</span></div>'
    f'<div style="margin-top: 10px">{progress(42)}</div></div>'

    f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 8px; overflow: hidden">'
    f'<div style="padding: 12px 16px; background: {CREAM}; border-bottom: 1px solid {LINE}; display: flex; '
    f'align-items: center; justify-content: space-between">'
    f'<span style="font-size: 13.5px; font-weight: 600">Year 2 · First Semester</span>'
    f'{badge("12 / 18", MUTED, CREAM_DP, dot=False)}</div>'
    + m_slot("CS 121", "Data Structures", "3.0", "enrolled", "—")
    + m_slot("CS 122", "Object-Oriented Programming", "3.0", "enrolled", "—")
    + m_slot("STAT 101", "Statistics for Computing", "3.0", "inc", "INC",
             "Deadline 26 Oct 2026")
    + m_slot("GE 5", "Science, Technology and Society", "3.0", "passed", "2.00")
    + m_slot("GE ELEC 1", "Open elective slot", "3.0", "passed", "1.75",
             "Mapped from PHILO 12")
    + '</div>')

write("MobileChecklist", m_shell(m_header("Checklist", back=True), M_CHK_BODY, m_tabbar("Checklist", STU_TABS)))


ADV_TABS = [("grid", "Home"), ("users", "Advisees"), ("plus", "Record"), ("swap", "Reassign"), ("user", "Me")]


def m_advisee(name, sn, ini, prog, gwa, chips):
    return (f'<div style="display: flex; align-items: center; gap: 12px; padding: 13px 16px; '
            f'border-bottom: 1px solid {LINE_SF}; min-height: 64px">{avatar(ini, 40, CREAM_DP, FOREST)}'
            f'<div style="flex-grow: 1; min-width: 0">'
            f'<div style="font-size: 13.5px; font-weight: 600">{name}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED_2}; margin-top: 1px">{sn} · {prog}</div>'
            f'<div style="display: flex; gap: 6px; margin-top: 6px">{chips}</div></div>'
            f'<div style="text-align: right; flex-shrink: 0">'
            f'<div class="mono" style="font-size: 15px; font-weight: 600">{gwa}</div>'
            f'<div style="font-size: 10.5px; color: {MUTED_2}">GWA</div></div></div>')


M_ADV_BODY = (
    f'<div style="margin-bottom: 14px">{searchbar("Search advisees", "100%")}</div>'
    f'<div style="display: flex; gap: 8px; margin-bottom: 14px">' +
    "".join(f'<div style="padding: 9px 14px; border-radius: 20px; font-size: 12.5px; font-weight: '
            f'{"600" if on else "450"}; min-height: 40px; display: flex; align-items: center; '
            f'white-space: nowrap; background: {FOREST if on else SURFACE}; color: {CREAM if on else MUTED}; '
            f'border: 1px solid {FOREST if on else LINE}">{t}</div>'
            for t, on in [("Active 48", True), ("Flagged 3", False), ("Open INC 5", False)]) +
    '</div>'
    f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 8px; overflow: hidden">'
    + m_advisee("Cruz, Angelo P.", "2022-01188", "AC", "BSCS 3rd", "3.42",
                status("failed", "Delinquent"))
    + m_advisee("Bautista, Maria Isabel L.", "2023-04412", "MB", "BSCS 2nd", "1.68",
                badge("INC · 47 days", INC_FG, INC_BG))
    + m_advisee("Lim, Joshua T.", "2023-02940", "JL", "BSCS 2nd", "2.14",
                badge("INC · 12 days", INC_FG, INC_BG))
    + m_advisee("Santos, Kier B.", "2021-03310", "KS", "BSCS 4th", "2.88",
                badge("Watchlist", INC_FG, INC_BG))
    + m_advisee("Domingo, Grace A.", "2023-01553", "GD", "BSCS 2nd", "1.44",
                status("passed", "Good standing"))
    + m_advisee("Reyes, Paolo M.", "2022-04120", "PR", "BSCS 3rd", "2.05",
                status("passed", "Good standing"))
    + '</div>')

write("MobileAdvisees", m_shell(
    f'<header style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: {SURFACE}; '
    f'border-bottom: 1px solid {LINE}">'
    f'<div style="width: 44px; height: 44px; display: flex; align-items: center">'
    f'<img src="logo-mark.png" alt="" style="width: 30px; height: 30px; border-radius: 7px"></div>'
    f'<div style="flex-grow: 1; font-size: 16px; font-weight: 600">Advisees</div>'
    f'<div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; '
    f'color: {MUTED}">{ico("filter", 21)}</div>'
    f'<div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center">'
    f'{avatar("RR", 32)}</div></header>',
    M_ADV_BODY, m_tabbar("Advisees", ADV_TABS)))

print("system + mobile artboards written")
