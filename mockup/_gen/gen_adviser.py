# -*- coding: utf-8 -*-
"""Adviser portal artboards."""
import base
base.SUBDIR = "Adviser"
from base import *

USER = ("Prof. Ramon Reyes", "Academic Adviser · CS")
INI = "RR"


def kpi(title, value, sub, tone=FOREST, foot=""):
    f = (f'<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid {LINE_SF}; '
         f'font-size: 12.5px; color: {MUTED_2}">{foot}</div>') if foot else ""
    return card(f'<div class="kick" style="color: {MUTED_2}">{title}</div>'
                f'<div class="dsp" style="font-size: 36px; color: {tone}; margin-top: 8px; '
                f'line-height: 1.1">{value}</div>'
                f'<div style="font-size: 13px; color: {MUTED}; margin-top: 4px">{sub}</div>{f}',
                pad="18px 20px 20px")


def person(name, meta, ini, bg=CREAM_DP, fg=FOREST):
    return (f'<div style="display: flex; align-items: center; gap: 11px">{avatar(ini, 32, bg, fg)}'
            f'<div><div style="font-size: 13.5px; font-weight: 600; line-height: 1.3">{name}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED_2}">{meta}</div></div></div>')


# ------------------------------------------------------------------ dashboard
def attention_list():
    items = [
        ("alert", FAIL_FG, "Cruz, Angelo P.", "2022-01188",
         "Delinquency threshold reached — 12 failed units", "Review before enlistment"),
        ("clock", INC_FG, "Bautista, Maria Isabel L.", "2023-04412",
         "INC in STAT 101 lapses in 47 days", "26 October 2026"),
        ("clock", INC_FG, "Lim, Joshua T.", "2023-02940",
         "INC in CS 111 lapses in 12 days", "21 September 2026"),
        ("flag", FAIL_FG, "Santos, Kier B.", "2021-03310",
         "Second failure in MATH 22 — retake requires chair approval", "Awaiting your note"),
        ("swap", FOREST, "Villanueva, Andrea M.", "2024-00871",
         "Curriculum shift request from BSIT to BSCS", "Equivalency review pending"),
    ]
    out = ""
    for i, c, n, sn, msg, meta in items:
        out += (f'<div class="row" style="display: flex; align-items: center; gap: 14px; padding: 13px 20px; '
                f'border-bottom: 1px solid {LINE_SF}">'
                f'<div style="color: {c}; flex-shrink: 0">{ico(i, 19)}</div>'
                f'<div style="flex-grow: 1; min-width: 0">'
                f'<div style="font-size: 13.5px; font-weight: 600">{n} '
                f'<span class="mono" style="font-weight: 400; color: {MUTED_2}; font-size: 12px">{sn}</span></div>'
                f'<div style="font-size: 12.5px; color: {MUTED}; margin-top: 2px">{msg}</div></div>'
                f'<div style="font-size: 12px; color: {MUTED_2}; flex-shrink: 0; text-align: right">{meta}</div>'
                f'<div style="color: {MUTED_2}; flex-shrink: 0">{ico("right", 16)}</div></div>')
    return panel("Needs your attention", out,
                 actions=btn("View all 12", "secondary", "right", "sm"),
                 sub="Delinquency flags, INC deadlines and pending exception decisions")


def recent_activity():
    items = [("Recorded attempt", "CS 132 · Reyes, Paolo M.", "with prerequisite override", "14 min ago", INC_FG),
             ("Advising note", "Cruz, Angelo P.", "Discussed reduced load for AY 2025–26", "2 hours ago", FOREST),
             ("Elective mapping", "Bautista, Maria Isabel L.", "PHILO 12 → GE ELEC 1", "Yesterday", GOLD_DP),
             ("Equivalency decision", "Villanueva, Andrea M.", "IT 101 → CS 101 (transfer)", "Yesterday", GOLD_DP),
             ("Attempt remark", "Lim, Joshua T.", "INC contract signed with instructor", "3 days ago", FOREST)]
    out = ""
    for t, who, what, when, col in items:
        out += (f'<div style="display: flex; gap: 13px; padding: 13px 20px; border-bottom: 1px solid {LINE_SF}">'
                f'<div style="width: 7px; height: 7px; border-radius: 50%; background: {col}; '
                f'margin-top: 7px; flex-shrink: 0"></div>'
                f'<div style="flex-grow: 1"><div style="font-size: 13px"><b>{t}</b> · {who}</div>'
                f'<div style="font-size: 12.5px; color: {MUTED}; margin-top: 2px">{what}</div></div>'
                f'<div style="font-size: 11.5px; color: {MUTED_2}; flex-shrink: 0; white-space: nowrap">{when}</div></div>')
    return panel("Your recent activity", out, sub="Everything here is written to the audit log")


def load_chart():
    bars = [("1st yr", 8), ("2nd yr", 14), ("3rd yr", 11), ("4th yr", 9), ("Irreg.", 6)]
    mx = 14
    out = ""
    for lbl, v in bars:
        h = int(v / mx * 110)
        out += (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex-grow: 1">'
                f'<div style="font-size: 12.5px; font-weight: 600; color: {FOREST}">{v}</div>'
                f'<div style="width: 100%; height: {h}px; background: {FOREST}; border-radius: 3px 3px 0 0"></div>'
                f'<div style="font-size: 11.5px; color: {MUTED_2}">{lbl}</div></div>')
    return panel("Advisees by year level",
                 f'<div style="display: flex; align-items: flex-end; gap: 14px; padding: 20px; height: 190px">{out}</div>',
                 sub="48 active · 23 historical")


DASH = shell("adviser", "Dashboard", ["Adviser portal", "Dashboard"], USER, INI,
             page_head("Advising dashboard",
                       "AY 2025–2026, 1st Semester · enrolment window closes 30 September 2026",
                       btn("Record enrollment attempt", "primary", "plus", "sm",
                           attrs='data-goto="adviser/enrollment/new"'))
             + grid(4, kpi("Active advisees", "48", "assigned to you", FOREST, "23 historical advisees on file")
                    + kpi("Delinquency flags", "3", "at or past threshold", FAIL_FG, "Requires a documented plan")
                    + kpi("INC deadlines &lt; 60 days", "5", "across 4 advisees", INC_FG, "Earliest: 21 September")
                    + kpi("Pending exceptions", "4", "mappings and equivalencies", GOLD_DP, "Oldest waiting 6 days"))
             + '<div style="display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; '
               'margin-top: 18px">'
             + f'<div style="display: flex; flex-direction: column; gap: 18px">{attention_list()}{recent_activity()}</div>'
             + f'<div style="display: flex; flex-direction: column; gap: 18px">{load_chart()}'
             + card(f'<div class="kick" style="color: {MUTED_2}">Quick actions</div>'
                    f'<div style="display: flex; flex-direction: column; gap: 9px; margin-top: 14px">' +
                    "".join(f'<div class="row" {attr} style="display: flex; align-items: center; gap: 11px; '
                            f'padding: 11px 13px; border: 1px solid {LINE}; border-radius: 5px; font-size: 13.5px; '
                            f'cursor: pointer">'
                            f'<span style="color: {FOREST}">{ico(i, 18)}</span>{t}'
                            f'<span style="flex-grow: 1"></span>{ico("right", 15, MUTED_2)}</div>'
                            for i, t, attr in [
                                ("plus", "Record an enrollment attempt", 'data-goto="adviser/enrollment/new"'),
                                ("note", "Write an advising note", 'data-goto="adviser/advisees/notes"'),
                                ("node", "Map a course to an elective slot", 'data-goto="adviser/advisees/checklist"'),
                                ("swap", "Initiate an adviser reassignment", 'data-goto="adviser/reassignment"'),
                                ("print", "Print advising checklists", 'data-action="print-checklists"')]) +
                    '</div>')
             + note("The daily lapsed-INC recompute last ran <b>8 September 2026, 02:00</b> and updated 2 cached GWAs.", "gold", "clock")
             + '</div></div>', h=1300)
write("AdviserDashboard", DASH)


# ------------------------------------------------------------------ advisee roster
STANDING_OF = {"good": "good standing", "watch": "watchlist", "delinquent": "delinquent"}


def adv_row(name, ini, sn, prog, yr, gwa, units, flag, inc, since):
    if flag == "delinquent":
        flags = status("failed", "Delinquent")
    elif flag == "watch":
        flags = badge("Watchlist", INC_FG, INC_BG)
    else:
        flags = status("passed", "Good standing")
    incc = badge(inc, INC_FG, INC_BG) if inc else f'<span style="color: {MUTED_2}">—</span>'
    cells = [person(name, sn, ini), f'<span style="font-size: 12.5px">{prog}</span>',
             f'<span style="color: {MUTED}">{yr}</span>',
             f'<span class="mono" style="font-weight: 600">{gwa}</span>',
             f'<span style="color: {MUTED}">{units}</span>', flags, incc,
             f'<span style="color: {MUTED_2}; font-size: 12.5px">{since}</span>']
    attrs = f'data-standing="{STANDING_OF[flag]}" data-inc="{inc or 0}"'
    return cells, attrs


ADV_ROWS = [
    adv_row("Bautista, Maria Isabel L.", "MB", "2023-04412", "BS Computer Science", "2nd", "1.68", "61", "good", "1", "12 Jun 2024"),
    adv_row("Cruz, Angelo P.", "AC", "2022-01188", "BS Computer Science", "3rd", "3.42", "78", "delinquent", "", "05 Aug 2023"),
    adv_row("Lim, Joshua T.", "JL", "2023-02940", "BS Computer Science", "2nd", "2.14", "58", "watch", "1", "12 Jun 2024"),
    adv_row("Santos, Kier B.", "KS", "2021-03310", "BS Computer Science", "4th", "2.88", "112", "watch", "", "18 Jan 2023"),
    adv_row("Villanueva, Andrea M.", "AV", "2024-00871", "BS Info. Technology", "1st", "1.92", "24", "good", "", "03 Jun 2025"),
    adv_row("Reyes, Paolo M.", "PR", "2022-04120", "BS Computer Science", "3rd", "2.05", "84", "good", "", "05 Aug 2023"),
    adv_row("Domingo, Grace A.", "GD", "2023-01553", "BS Computer Science", "2nd", "1.44", "63", "good", "", "12 Jun 2024"),
    adv_row("Ocampo, Liza R.", "LO", "2021-02277", "BS Computer Science", "4th", "1.71", "126", "good", "", "18 Jan 2023"),
    adv_row("Mendoza, Carl John S.", "CM", "2022-03901", "BS Computer Science", "3rd", "2.63", "71", "watch", "2", "05 Aug 2023"),
    adv_row("Tolentino, Bea F.", "BT", "2024-00214", "BS Computer Science", "1st", "1.58", "21", "good", "", "03 Jun 2025"),
    adv_row("Aquino, Miguel D.", "MA", "2021-04408", "BS Computer Science", "4th", "3.11", "104", "delinquent", "1", "18 Jan 2023"),
    adv_row("Garcia, Nicole P.", "NG", "2023-03017", "BS Computer Science", "2nd", "1.83", "60", "good", "", "12 Jun 2024"),
]

ROSTER = shell("adviser", "Advisees", ["Adviser portal", "Advisees"], USER, INI,
               page_head("Advisees",
                         "Search current and historical advisees. Historical records are read-only.",
                         btn("Export roster", "secondary", "file", "sm", attrs='data-action="export-roster"')
                         + btn("Reassign an advisee", "primary", "swap", "sm", attrs='data-goto="adviser/reassignment"'))
               + flex(searchbar("Search by name, student number or course code", "380px", live="[data-filter-table]")
                      + iselect("Program", "All programs",
                                ["All programs", "BS Computer Science", "BS Info. Technology"], "program", w="190px")
                      + iselect("Year level", "All years", ["All years", "1st", "2nd", "3rd", "4th"], "year", w="150px")
                      + iselect("Standing", "All",
                                ["All", "Good standing", "Watchlist", "Delinquent"], "standing", w="150px")
                      + f'<div style="flex-grow: 1"></div>'
                      + btn("Filters", "secondary", "filter", "sm", attrs='data-action="toggle-more-filters"'),
                      gap="12px", align="flex-end", extra="margin-bottom: 16px")
               + flex("".join(ipill(t, k, on) for t, k, on in [
                   ("Active (48)", "active", True), ("Historical (23)", "historical", False),
                   ("Delinquent (3)", "delinquent", False), ("Open INC (5)", "open-inc", False)]),
                   gap="4px", extra="margin-bottom: 16px")
               + panel("Active advisees · AY 2025–2026",
                       table(["Student", "Program", "Year", "GWA", "Units", "Standing", "Open INC", "Assigned since"],
                             [c for c, a in ADV_ROWS],
                             widths=["auto", "180px", "70px", "76px", "76px", "142px", "104px", "128px"],
                             align=["left", "left", "left", "right", "right", "left", "left", "left"],
                             row_attrs=[a for c, a in ADV_ROWS], table_attrs="data-filter-table"),
                       actions=badge("12 of 48 shown", MUTED, CREAM_DP, dot=False))
               + flex(f'<span style="font-size: 13px; color: {MUTED_2}">Showing 1–12 of 48</span>'
                      + f'<div style="flex-grow: 1"></div>'
                      + btn("Previous", "secondary", "left", "sm", attrs='data-action="paginate"')
                      + btn("Next", "secondary", "right", "sm", attrs='data-action="paginate"'),
                      extra="margin-top: 16px"), h=1240)
write("AdviserAdvisees", ROSTER)


# ------------------------------------------------------------------ advisee 360
TAB_ROUTES = {
    "Overview": "adviser/advisees/detail",
    "Checklist": "adviser/advisees/checklist",
    "Grades": "adviser/advisees/grades",
    "History": "adviser/advisees/history",
    "Notes": "adviser/advisees/notes",
}


def student_header(active_tab):
    def tab_html(t):
        on = t == active_tab
        st = (f'padding: 12px 2px; margin-right: 26px; font-size: 14px; font-weight: '
              f'{"600" if on else "450"}; color: {INK if on else MUTED}; '
              f'border-bottom: 2px solid {FOREST if on else "transparent"}; cursor: pointer')
        if on:
            return f'<div style="{st}">{t}</div>'
        attr = 'data-action="not-in-prototype"' if t == "Documents" else f'data-goto="{TAB_ROUTES[t]}"'
        return f'<div {attr} style="{st}">{t}</div>'

    tabs = "".join(tab_html(t) for t in ["Overview", "Checklist", "Grades", "History", "Notes", "Documents"])
    return (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 6px; '
            f'margin-bottom: 18px; overflow: hidden">'
            f'<div style="display: flex; align-items: flex-start; gap: 20px; padding: 22px 24px 18px">'
            f'<div data-adv-avatar style="width: 62px; height: 62px; border-radius: 50%; background: {FOREST}; '
            f'color: {CREAM}; display: flex; align-items: center; justify-content: center; font-size: 22px; '
            f'font-weight: 600; flex-shrink: 0; letter-spacing: 0.02em">MB</div>'
            f'<div style="flex-grow: 1">'
            f'<div style="display: flex; align-items: center; gap: 12px">'
            f'<h2 class="dsp" data-adv-name style="font-size: 26px">Bautista, Maria Isabel L.</h2>'
            f'<span data-adv-standing style="display: inline-flex; align-items: center; gap: 6px; '
            f'padding: 2px 9px 2px 8px; border-radius: 3px; background: {PASS_BG}; color: {PASS_FG}; '
            f'font-size: 12px; font-weight: 600; letter-spacing: 0.01em; white-space: nowrap">'
            f'<span style="width: 6px; height: 6px; border-radius: 50%; background: {PASS_FG}; '
            f'flex-shrink: 0"></span>Good standing</span></div>'
            f'<div data-adv-meta style="display: flex; gap: 20px; margin-top: 8px; font-size: 13px; color: {MUTED}; '
            f'flex-wrap: wrap">'
            f'<span class="mono">2023-04412</span><span>BS Computer Science</span>'
            f'<span>Curriculum 2023–2024</span><span>2nd year</span>'
            f'<span>maria.bautista@[university].edu.ph</span></div></div>'
            f'<div style="display: flex; gap: 26px; flex-shrink: 0; text-align: right">'
            f'<div><div class="kick" style="color: {MUTED_2}">GWA</div>'
            f'<div class="dsp" data-adv-gwa style="font-size: 24px; color: {FOREST}">1.68</div></div>'
            f'<div><div class="kick" style="color: {MUTED_2}">Units</div>'
            f'<div class="dsp" data-adv-units style="font-size: 24px">61</div></div>'
            f'<div><div class="kick" style="color: {MUTED_2}">Open INC</div>'
            f'<div class="dsp" data-adv-inc style="font-size: 24px; color: {INC_FG}">1</div></div></div></div>'
            f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 0 24px; '
            f'border-top: 1px solid {LINE_SF}">'
            f'<div style="display: flex">{tabs}</div>'
            f'<div style="display: flex; gap: 8px; padding: 8px 0">'
            f'<button class="btns" data-open-modal="add-note" data-student="Bautista, Maria Isabel L." '
            f'style="display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 4px; '
            f'font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; background: {SURFACE}; '
            f'color: {INK}; border: 1px solid {LINE}">{ico("note", 16)} Add note</button>'
            f'{btn("Record attempt", "primary", "plus", "sm")}</div></div></div>')


def timeline():
    items = [("12 Jun 2024", "Adviser assignment", "Assigned to Prof. Ramon Reyes (from Prof. L. Mendez) — zero-gap transition", FOREST),
             ("14 Aug 2024", "Elective mapping", "PHILO 12 Logic and Critical Thinking → GE ELEC 1 slot", GOLD_DP),
             ("02 Mar 2025", "Equivalency decision", "MATH 30 (discontinued) satisfied by MATH 31 Discrete Structures", GOLD_DP),
             ("26 Oct 2025", "INC recorded", "STAT 101 — compliance deadline set to 26 October 2026", INC_FG),
             ("15 Jun 2026", "Advising note", "Discussed reduced load; student is working part-time", FOREST)]
    out = ""
    for d, t, b, c in items:
        out += (f'<div style="display: flex; gap: 16px; padding: 14px 20px; border-bottom: 1px solid {LINE_SF}">'
                f'<div style="width: 96px; flex-shrink: 0; font-size: 12px; color: {MUTED_2}; '
                f'padding-top: 2px">{d}</div>'
                f'<div style="width: 7px; height: 7px; border-radius: 50%; background: {c}; margin-top: 7px; '
                f'flex-shrink: 0"></div>'
                f'<div><div style="font-size: 13.5px; font-weight: 600">{t}</div>'
                f'<div style="font-size: 12.5px; color: {MUTED}; margin-top: 3px; line-height: 1.5">{b}</div></div></div>')
    out = f'<div data-adv-timeline>{out}</div>'
    return panel("Academic timeline", out, sub="Assignments, exceptions and documented decisions")


DETAIL = shell("adviser", "Advisees", ["Adviser portal", "Advisees", "Bautista, Maria Isabel L."], USER, INI,
               student_header("Overview")
               + grid(4, kpi("Cumulative GWA", "1.68", "61 counted units", FOREST, "Would be 1.84 if STAT 101 lapses")
                      + kpi("Failed units", "3", "threshold is 12", PASS_FG, "GE 6 Art Appreciation")
                      + kpi("Slots satisfied", "24 / 51", "2 via exception", FOREST, "1 elective, 2 equivalencies")
                      + kpi("Current load", "16", "units this term", ENR_FG, "5 attempts recorded"))
               + '<div style="display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; '
                 'margin-top: 18px">'
               + f'<div style="display: flex; flex-direction: column; gap: 18px">'
               + panel("Current term · AY 2025–2026, 1st Semester",
                       table(["Code", "Course", "Units", "Section", "Status", ""], [
                           [code(c), t, u, s,
                            status("enrolled"),
                            f'<a href="#" data-open-modal="remark" data-code="{c}" data-course="{t}" '
                            f'style="font-size: 12.5px; font-weight: 600">Remark</a>']
                           for c, t, u, s in [
                               ("CS 121", "Data Structures", "3.0", "CS121-A"),
                               ("CS 122", "Object-Oriented Programming", "3.0", "CS122-B"),
                               ("MATH 22", "Calculus II", "5.0", "MATH22-C"),
                               ("GE 7", "Ethics", "3.0", "GE7-D"),
                               ("PE 3", "Team Sports", "2.0", "PE3-F"),
                           ]
                       ], widths=["100px", "auto", "62px", "100px", "132px", "84px"], tbody_attrs="data-adv-courses"),
                       actions=btn("Record attempt", "secondary", "plus", "sm", attrs='data-goto="adviser/enrollment/new"'))
               + timeline() + '</div>'
               + f'<div style="display: flex; flex-direction: column; gap: 18px">'
               + note("<b>STAT 101</b> INC lapses in 47 days (26 October 2026). After the deadline it is evaluated as 5.00 and moves the student to 6 failed units.", "gold", "clock")
               + panel("Staff-only notes",
                       f'<div style="padding: 16px 20px">'
                       f'<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px">'
                       f'{badge("Not visible to the student", FAIL_FG, FAIL_BG)}</div>'
                       f'<div data-notes-list>' +
                       "".join(f'<div style="padding: 12px 0; border-top: 1px solid {LINE_SF}">'
                               f'<div style="display: flex; justify-content: space-between; font-size: 11.5px; '
                               f'color: {MUTED_2}"><span>{a}</span><span>{d}</span></div>'
                               f'<p style="font-size: 13px; color: {MUTED}; margin-top: 5px; line-height: 1.55">{t}</p></div>'
                               for a, d, t in [
                                   ("R. Reyes", "15 Jun 2026",
                                    "Working part-time weekday evenings. Agreed to cap the load at 16 units until the INC is cleared."),
                                   ("R. Reyes", "02 Mar 2025",
                                    "Approved MATH 31 as the equivalent of the discontinued MATH 30 after checking the syllabus with the Math department."),
                                   ("L. Mendez", "20 Nov 2023",
                                    "Transferred from [Previous Institution]; ENGL 101 credited as ENG 1.")]) +
                       '</div></div>',
                       actions=btn("Add note", "secondary", "note", "sm",
                                   attrs='data-open-modal="add-note" data-student="Bautista, Maria Isabel L."'))
               + panel("Adviser assignment history",
                       table(["Adviser", "From", "To"], [
                           [person("Prof. Ramon Reyes", "Current", "RR"), "12 Jun 2024",
                            f'<span style="color: {PASS_FG}; font-weight: 600">Active</span>'],
                           [person("Prof. Lourdes Mendez", "Historical", "LM", CREAM_DP, MUTED), "12 Jun 2023",
                            "12 Jun 2024"],
                       ], widths=["auto", "110px", "110px"]),
                       actions=btn("Reassign", "secondary", "swap", "sm", attrs='data-goto="adviser/reassignment"'))
               + '</div></div>', h=1420)
write("AdviseeDetail", DETAIL)


def slot_row(codev, title, units, st, fill, action):
    return [code(codev), f'<div><div>{title}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED_2}; margin-top: 2px">{fill}</div></div>',
            f'<span style="color: {MUTED_2}">{units}</span>', status(st), action]


def LINK(t, attrs=""):
    a = (" " + attrs) if attrs else ""
    return f'<a href="#"{a} style="font-size: 12.5px; font-weight: 600">{t}</a>'


def open_slots_panel():
    return panel("Open slots · Year 2 and beyond",
                 table(["Slot", "Requirement", "Units", "Status", "Action"], [
                     slot_row("GE ELEC 2", "Open elective slot", "3.0", "open", "No attempt bound to this slot",
                              LINK("Map a course", 'data-action="scroll-to-mapping-form"')),
                     slot_row("CS 132", "Design and Analysis of Algorithms", "3.0", "open", "Prerequisite CS 121 in progress",
                              LINK("Record attempt", 'data-goto="adviser/enrollment/new"')),
                     slot_row("CS 133", "Computer Organization", "3.0", "open", "Offered 2nd semester only",
                              LINK("Record attempt", 'data-goto="adviser/enrollment/new"')),
                     slot_row("CS 134", "Information Management", "3.0", "open", "By-request offering this term",
                              LINK("Record attempt", 'data-goto="adviser/enrollment/new"')),
                     slot_row("GE 6", "Art Appreciation", "3.0", "failed", "Failed AY 2024–25, 2nd Sem · retake required",
                              LINK("Record retake", 'data-goto="adviser/enrollment/new"')),
                     slot_row("MAJ ELEC 1", "Major elective slot", "3.0", "open", "No attempt bound to this slot",
                              LINK("Map a course", 'data-action="scroll-to-mapping-form"')),
                 ], widths=["112px", "auto", "62px", "134px", "124px"], tbody_attrs="data-adv-openslots"),
                 actions=badge("27 open slots", MUTED, CREAM_DP, dot=False, attrs="data-adv-openslots-count"))


# ------------------------------------------------------------------ notes
def note_entry(author, ini, date, tag, tagfg, tagbg, body, scope="", mine=False):
    s = (f'<div style="font-size: 12px; color: {MUTED_2}; margin-top: 8px">Scope: {scope}</div>') if scope else ""
    kind = "remark" if "remark" in tag.lower() else "note"
    return (f'<div data-entry-type="{kind}" data-entry-author="{"me" if mine else "other"}" '
            f'style="display: flex; gap: 14px; padding: 18px 20px; border-bottom: 1px solid {LINE_SF}">'
            f'{avatar(ini, 34, CREAM_DP, FOREST)}'
            f'<div style="flex-grow: 1">'
            f'<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">'
            f'<span style="font-size: 13.5px; font-weight: 600">{author}</span>'
            f'{badge(tag, tagfg, tagbg, dot=False)}'
            f'<span style="font-size: 12px; color: {MUTED_2}">{date}</span></div>'
            f'<p style="font-size: 13.5px; color: {MUTED}; line-height: 1.62; margin-top: 8px">{body}</p>{s}</div>'
            f'<div style="flex-shrink: 0; color: {MUTED_2}">{ico("lock", 15)}</div></div>')


NOTES = shell("adviser", "Advisees", ["Adviser portal", "Advisees", "Bautista, Maria Isabel L.", "Notes"], USER, INI,
              student_header("Notes")
              + note("Advising notes and attempt remarks are <b>staff-only</b> and append-only. A student session can never retrieve them — the restriction is a row-level security policy, not a UI condition. Entries cannot be edited or deleted once saved.", "gold", "shield")
              + '<div style="display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: 18px; '
                'margin-top: 18px">'
              + f'<div style="display: flex; flex-direction: column; gap: 18px">'
              + open_slots_panel()
              + panel("Advising notes",
                      f'<div data-notes-list>'
                      + note_entry("Prof. Ramon Reyes", "RR", "15 June 2026, 14:22", "Advising note", FOREST, CREAM_DP,
                                 "Student is working weekday evenings at [Employer]. Agreed to cap the load at 16 units "
                                 "for AY 2025–2026 until STAT 101 is cleared. She will approach the instructor about "
                                 "the INC completion requirements before the end of September.", mine=True)
                      + note_entry("Prof. Ramon Reyes", "RR", "12 March 2026, 09:05", "Attempt remark", GOLD_DP, "#FBF0D6",
                                   "Retake of CS 102 approved under grade replacement. Explained that the earlier 5.00 "
                                   "remains on the enrollment history but stops counting toward the GWA.",
                                   scope="Attempt · CS 102 · AY 2024–25, 1st Sem", mine=True)
                      + note_entry("Prof. Ramon Reyes", "RR", "02 March 2025, 16:40", "Advising note", FOREST, CREAM_DP,
                                   "Approved MATH 31 Discrete Structures as the equivalent of the discontinued MATH 30. "
                                   "Syllabus comparison confirmed with [Math Department chair]. Equivalency decision "
                                   "recorded against the Year 2 · 2nd Sem slot.", mine=True)
                      + note_entry("Prof. Ramon Reyes", "RR", "14 August 2024, 11:12", "Attempt remark", GOLD_DP, "#FBF0D6",
                                   "PHILO 12 mapped to the GE ELEC 1 slot. Slot nominal units are 3.0 and the course "
                                   "carries 3.0, so no unit shortfall.",
                                   scope="Checklist slot · GE ELEC 1 · Year 2, 1st Sem", mine=True)
                      + note_entry("Prof. Lourdes Mendez", "LM", "20 November 2023, 10:30", "Advising note", MUTED, CREAM_DP,
                                   "Transfer from [Previous Institution]. Credited ENGL 101 as ENG 1 Purposive "
                                   "Communication after transcript review. Student was advised that the transfer "
                                   "grade does not enter the destination GWA.")
                      + '</div>',
                      actions=badge("5 entries · append-only", MUTED, CREAM_DP, dot=False,
                                    attrs="data-adv-notes-count"),
                      sub="Newest first. Every entry is dated and attributed.")
              + '</div>'
              + f'<div style="display: flex; flex-direction: column; gap: 18px">'
              + panel("New note",
                      f'<div data-note-form style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                      + iselect("Type", "Advising note (student-level)",
                                ["Advising note (student-level)", "Attempt remark", "Checklist decision note"], "type")
                      + iselect("Scope", "Whole student record",
                                ["Whole student record", "Current term only", "Specific course attempt"], "scope")
                      + ifield("Note", "Write what you would want the next adviser to know…", "note", "132px")
                      + f'<div style="display: flex; align-items: center; justify-content: space-between">'
                      f'<span style="font-size: 12px; color: {MUTED_2}">Saved entries cannot be edited.</span>'
                      + btn("Save note", "primary", size="sm", attrs='data-action="save-note"')
                      + '</div></div>')
              + panel("Filter",
                      f'<div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 10px">' +
                      "".join(
                          f'<div style="display: flex; align-items: center; gap: 9px; font-size: 13.5px">'
                          f'<div data-checkbox="notes-filter" data-filter-key="{key}" data-checked="{"1" if on else "0"}" '
                          f'style="width: 15px; height: 15px; border: 1px solid {LINE}; border-radius: 3px; '
                          f'background: {FOREST if on else SURFACE}; display: flex; align-items: center; '
                          f'justify-content: center">{ico("check", 11, CREAM, 2.4) if on else ""}</div>{t}</div>'
                          for t, key, on in [("Advising notes", "advising-notes", True),
                                             ("Attempt remarks", "attempt-remarks", True),
                                             ("Written by me", "written-by-me", False),
                                             ("Previous advisers", "previous-advisers", True)]) +
                      f'<div style="height: 1px; background: {LINE_SF}; margin: 6px 0"></div>'
                      + iselect("School term", "All terms",
                                ["All terms", "AY 2025–2026, 1st Sem", "AY 2024–2025, 2nd Sem"], "notes-term")
                      + '</div>')
              + '</div></div>', h=1420)
write("AdviseeNotes", NOTES)


# ------------------------------------------------------------------ manage checklist
def exception_card(kind_badge, source, dest, decided, by):
    return (f'<div data-exception-card style="background: {CREAM}; border: 1px solid {LINE}; border-radius: 6px; '
            f'padding: 14px 16px; display: flex; flex-direction: column; gap: 11px">'
            f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">'
            f'{kind_badge}'
            f'<span style="font-size: 12px; color: {MUTED_2}; white-space: nowrap">{decided} &middot; {by}</span>'
            f'</div>'
            f'<div style="display: flex; align-items: center; gap: 10px">'
            f'<div style="flex: 1; min-width: 0; font-size: 13.5px; line-height: 1.4">{source}</div>'
            f'<div style="flex-shrink: 0; color: {MUTED_2}">{ico("right", 15)}</div>'
            f'<div style="flex-shrink: 0; font-size: 13.5px; line-height: 1.4; text-align: right">{dest}</div>'
            f'</div></div>')



MANAGE = shell("adviser", "Advisees", ["Adviser portal", "Advisees", "Bautista, Maria Isabel L.", "Checklist"], USER, INI,
               student_header("Checklist")
               + flex(f'<div><h2 class="dsp" style="font-size: 24px">Manage checklist exceptions</h2>'
                      f'<p style="font-size: 14px; color: {MUTED}; margin-top: 5px; max-width: 70ch">'
                      f'Map an enrolled course into an open elective slot, or record a one-to-one equivalency for a '
                      f'transfer or a discontinued course. Both are written to the audit log with your name.</p></div>'
                      + f'<div style="flex-grow: 1"></div>'
                      + btn("New elective mapping", "secondary", "node", "sm",
                            attrs='data-action="scroll-to-mapping-form"')
                      + btn("New equivalency decision", "primary", "swap", "sm",
                            attrs='data-action="scroll-to-equivalency-form"'),
                      align="flex-start", extra="margin-bottom: 20px")
               + '<div style="display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 18px">'
               + f'<div style="display: flex; flex-direction: column; gap: 18px">'
               + open_slots_panel()
               + panel("Recorded exceptions",
                       f'<div data-exceptions-table style="display: flex; flex-direction: column; gap: 12px">' + "".join([
                           exception_card(
                               badge("Elective mapping", GOLD_DP, "#FBF0D6", dot=False),
                               f'{code("PHILO 12")} Logic and Critical Thinking<br>'
                               f'<span style="color: {MUTED_2}">3.0 &middot; passed 1.75</span>',
                               f'{code("GE ELEC 1")}<br><span style="color: {MUTED_2}">Year 2 &middot; 1st Sem</span>',
                               "14 Aug 2024", "R. Reyes"),
                           exception_card(
                               badge("Discontinued equivalency", GOLD_DP, "#FBF0D6", dot=False),
                               f'{code("MATH 31")} Discrete Structures<br>'
                               f'<span style="color: {MUTED_2}">3.0 &middot; passed 2.50</span>',
                               f'{code("MATH 30")}<br><span style="color: {MUTED_2}">Year 2 &middot; 2nd Sem</span>',
                               "02 Mar 2025", "R. Reyes"),
                           exception_card(
                               badge("Transfer equivalency", GOLD_DP, "#FBF0D6", dot=False),
                               f'{code("ENGL 101")} [Previous Institution]<br>'
                               f'<span style="color: {MUTED_2}">3.0 &middot; credited</span>',
                               f'{code("ENG 1")}<br><span style="color: {MUTED_2}">Year 1 &middot; 1st Sem</span>',
                               "20 Nov 2023", "L. Mendez"),
                       ]) + '</div>',
                       actions=badge("3 exceptions on file", MUTED, CREAM_DP, dot=False,
                                     attrs="data-adv-exceptions-count"),
                       pad="16px",
                       sub="Recorded decisions cannot be edited — supersede them with a new decision.")
               + '</div>'
               + f'<div style="display: flex; flex-direction: column; gap: 18px">'
               + panel("New elective mapping",
                       f'<div data-mapping-form style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                       + iselect("Destination slot", "GE ELEC 2 — Year 2 · 2nd Sem (3.0 units)",
                                 ["GE ELEC 2 — Year 2 · 2nd Sem (3.0 units)", "MAJ ELEC 1 — Year 4 · 1st Sem (3.0 units)"],
                                 "dest")
                       + iselect("Source attempt", "PSYCH 10 General Psychology · 3.0 · passed 2.00",
                                 ["PSYCH 10 General Psychology · 3.0 · passed 2.00",
                                  "SOC 1 Society and Culture · 3.0 · passed 1.75"], "source")
                       + field("Units credited", "3.0", "Actual units from the attempt; the slot nominal is 3.0.")
                       + ifield("Justification (staff-only)", "Why this course fills the slot…", "justification", "84px")
                       + note("The checklist will show <b>actual units earned</b> against the nominal slot units. A shortfall is flagged but not blocked.", "gold", "flag")
                       + f'<div style="display: flex; gap: 10px; justify-content: flex-end">'
                       + btn("Cancel", "secondary", size="sm", attrs='data-action="cancel-mapping"')
                       + btn("Record mapping", "primary", size="sm", attrs='data-action="record-mapping"')
                       + '</div></div>')
               + panel("New equivalency decision",
                       f'<div data-equivalency-form style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                       + iselect("Decision type", "Discontinued course equivalency",
                                 ["Discontinued course equivalency", "Transfer equivalency"], "decision-type")
                       + iselect("Source attempt (passed)", "MATH 31 Discrete Structures · 3.0 · passed 2.50",
                                 ["MATH 31 Discrete Structures · 3.0 · passed 2.50",
                                  "ENGL 101 [Previous Institution] · 3.0 · credited"], "esource")
                       + iselect("Destination slot (new curriculum)", "MATH 30 — Year 2 · 2nd Sem (3.0 units, discontinued)",
                                 ["MATH 30 — Year 2 · 2nd Sem (3.0 units, discontinued)",
                                  "ENG 1 — Year 1 · 1st Sem (3.0 units)"], "edest")
                       + f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">'
                       + stat("3.0", "Original slot units")
                       + stat("3.0", "Source attempt units")
                       + '</div>'
                       + ifield("Justification (staff-only)", "Syllabus comparison, department confirmation, etc…",
                                "ejustification", "84px")
                       + note("For a <b>discontinued</b> course, the source attempt's units must be &ge; the original "
                              "slot's units. This decision uses the original grade and units for display, creates no "
                              "new attempt, and does not re-trigger a GWA recompute.", "gold", "flag")
                       + f'<div style="display: flex; gap: 10px; justify-content: flex-end">'
                       + btn("Cancel", "secondary", size="sm", attrs='data-action="cancel-equivalency"')
                       + btn("Record decision", "primary", size="sm", attrs='data-action="record-equivalency"')
                       + '</div></div>',
                       sub="Transfer or discontinued-course equivalency · strictly one-to-one")
               + panel("Curriculum shift preview",
                       f'<div style="padding: 20px">'
                       f'<p style="font-size: 13px; color: {MUTED}; line-height: 1.6">Simulate moving this student '
                       f'to another curriculum version before executing a formal transfer.</p>'
                       f'<div style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px">'
                       + iselect("Target curriculum", "BS Computer Science · 2025–2026",
                                 ["BS Computer Science · 2025–2026", "BS Computer Science · 2024–2025",
                                  "BS Info. Technology · 2025–2026"], "curriculum")
                       + f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px">' +
                       "".join(f'<div style="background: {CREAM}; border: 1px solid {LINE}; border-radius: 5px; '
                               f'padding: 12px"><div class="kick" style="color: {MUTED_2}; font-size: 10.5px">{l}</div>'
                               f'<div class="dsp" style="font-size: 22px; color: {c}; margin-top: 5px">{v}</div></div>'
                               for l, v, c in [("Carried", "19", FOREST), ("Lost", "2", FAIL_FG), ("New GWA", "1.71", INK)]) +
                       '</div>'
                       + btn("Run simulation", "secondary", "sparks", "sm", attrs='data-action="run-simulation"')
                       + '</div>'
                       f'<div style="margin-top: 14px; font-size: 11.5px; color: {MUTED_2}">'
                       f'Phase 5 preview — the simulator does not write anything.</div></div>')
               + '</div></div>', h=1520)
write("AdviseeChecklist", MANAGE)


# ------------------------------------------------------------------ record attempt (with override dialog)
def prereq_row(c, t, kind, ok):
    fg, bg, lbl = (PASS_FG, PASS_BG, "Satisfied") if ok else (FAIL_FG, FAIL_BG, "Not satisfied")
    kindchip = badge(kind, MUTED, CREAM_DP, dot=False)
    return [code(c), t, kindchip, badge(lbl, fg, bg)]


def override_dialog():
    return (f'<div data-prereq-modal style="position: absolute; inset: 0; background: rgba(15,26,6,0.55); '
            f'display: none; align-items: center; justify-content: center; padding: 40px">'
            f'<div style="width: 620px; background: {SURFACE}; border-radius: 10px; overflow: hidden; '
            f'box-shadow: 0 30px 80px rgba(15,26,6,0.4)">'
            f'<div style="padding: 26px 28px 22px">'
            f'<div style="display: flex; align-items: center; gap: 12px">'
            f'<div style="width: 40px; height: 40px; border-radius: 50%; background: {INC_BG}; color: {INC_FG}; '
            f'display: flex; align-items: center; justify-content: center">{ico("alert", 22)}</div>'
            f'<h2 class="dsp" style="font-size: 24px">Prerequisite not satisfied</h2></div>'
            f'<p style="font-size: 14px; color: {MUTED}; line-height: 1.62; margin-top: 16px">'
            f'<b>Bautista, Maria Isabel L.</b> has not passed {code("CS 121 Data Structures")}, a '
            f'<b>strict</b> prerequisite of {code("CS 132 Design and Analysis of Algorithms")}. '
            f'The attempt is currently in progress this term.</p>'
            f'<div style="background: {CREAM}; border: 1px solid {LINE}; border-radius: 6px; padding: 16px; '
            f'margin-top: 18px">'
            f'<div class="kick" style="color: {MUTED_2}">Continuing will record</div>'
            f'<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px">' +
            "".join(f'<div style="display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: {MUTED}">'
                    f'{ico("check", 15, FOREST_SF)}<span>{t}</span></div>'
                    for t in ["The attempt, with <b>prerequisite_override = true</b>",
                              "An immutable audit entry naming you as the approver",
                              "A visible override marker on the student's enrollment history"]) +
            f'</div></div>'
            f'<div style="margin-top: 18px">'
            f'<div style="font-size: 12.5px; font-weight: 600; color: {MUTED}; margin-bottom: 6px">'
            f'Reason for the override <span style="color: {FAIL_FG}">· required</span></div>'
            f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 4px; padding: 11px 12px; '
            f'font-size: 13.5px; min-height: 68px; line-height: 1.55">Taking CS 121 concurrently this term; '
            f'department chair approved the co-enrollment on 08 September 2026.</div></div></div>'
            f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; '
            f'background: {CREAM}; border-top: 1px solid {LINE}">'
            f'<div style="font-size: 12px; color: {MUTED_2}">Audited as r.reyes@[university].edu.ph</div>'
            f'<div style="display: flex; gap: 10px">'
            + btn("Cancel", "secondary", attrs='data-action="close-prereq-modal"')
            + btn("Continue with override", "gold", attrs='data-action="continue-override"')
            + '</div></div></div></div>')


RECORD_BODY = (page_head("Record an enrollment attempt",
                         "Attempts bind a student to a specific course offering. Prerequisites are checked, "
                         "not enforced.")
               + '<div style="display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 18px">'
               + f'<div style="display: flex; flex-direction: column; gap: 18px">'
               + panel("1 · Student and offering",
                       f'<div style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                       + iselect("Advisee", "Bautista, Maria Isabel L. · 2023-04412",
                                 ["Bautista, Maria Isabel L. · 2023-04412", "Cruz, Angelo P. · 2022-01188",
                                  "Lim, Joshua T. · 2023-02940"], "advisee")
                       + f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">'
                       + iselect("School term", "AY 2025–2026 · 1st Semester",
                                 ["AY 2025–2026 · 1st Semester", "AY 2025–2026 · 2nd Semester"], "term")
                       + iselect("Course", "CS 132 — Design and Analysis of Algorithms",
                                 ["CS 132 — Design and Analysis of Algorithms", "CS 133 — Computer Organization",
                                  "CS 134 — Information Management"], "course")
                       + '</div>'
                       + f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px">'
                       + iselect("Offering / section", "CS132-A · MWF 07:30",
                                 ["CS132-A · MWF 07:30", "CS132-B · TTH 09:00"], "offering")
                       + field("Units", "3.0", disabled=True)
                       + field("Repeatable type", "grade_replacement", disabled=True)
                       + '</div>'
                       + iselect("Curriculum slot (optional)", "Year 2 · 2nd Sem — CS 132",
                                 ["Year 2 · 2nd Sem — CS 132", "No slot — free elective"], "slot")
                       + f'<div style="font-size: 12px; color: {MUTED_2}; margin-top: -6px">Leave unset when the '
                       f'attempt does not directly fill a checklist requirement.</div></div>')
               + panel("2 · Prerequisite check",
                       table(["Code", "Prerequisite course", "Type", "Result"], [
                           prereq_row("CS 121", "Data Structures", "strict", False),
                           prereq_row("CS 110", "Discrete Computing Structures", "strict", True),
                           prereq_row("CS 122", "Object-Oriented Programming", "co_requisite", True),
                           prereq_row("MATH 31", "Discrete Structures", "recommended", True),
                       ], widths=["110px", "auto", "132px", "150px"]),
                       actions=badge("1 unsatisfied", FAIL_FG, FAIL_BG),
                       sub="Strict prerequisites raise a soft warning; the adviser decides.")
               + '</div>'
               + f'<div style="display: flex; flex-direction: column; gap: 18px">'
               + panel("Attempt summary",
                       f'<div style="padding: 20px">' +
                       "".join(f'<div style="display: flex; justify-content: space-between; gap: 16px; '
                               f'padding: 9px 0; border-bottom: 1px solid {LINE_SF}; font-size: 13.5px">'
                               f'<span style="color: {MUTED}">{k}</span><span style="font-weight: 500; '
                               f'text-align: right">{v}</span></div>'
                               for k, v in [("Student", "Bautista, Maria Isabel L."),
                                            ("Course", "CS 132"),
                                            ("Offering", "CS132-A · MWF 07:30"),
                                            ("Units", "3.0"),
                                            ("Term", "AY 2025–26 · 1st Sem"),
                                            ("Term lock", "Open"),
                                            ("Fills slot", "Year 2 · 2nd Sem"),
                                            ("Resulting load", "19 units")]) +
                       f'<div style="margin-top: 16px">{note("This term has <b>5 attempts</b> already recorded for this student. 19 units exceeds the 18-unit advisory cap for regular students.", "gold", "flag")}</div>'
                       f'<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px">'
                       + btn("Save as draft", "secondary", size="sm", attrs='data-action="save-draft"')
                       + btn("Record attempt", "primary", size="sm", attrs='data-action="submit-attempt"')
                       + '</div></div>')
               + panel("Recently recorded",
                       f'<div style="padding: 6px 0">' +
                       "".join(f'<div style="display: flex; align-items: center; gap: 12px; padding: 11px 20px; '
                               f'border-bottom: 1px solid {LINE_SF}">{code(c)}'
                               f'<div style="flex-grow: 1; font-size: 13px">{n}</div>{b}</div>'
                               for c, n, b in [
                                   ("CS 132", "Reyes, Paolo M.", badge("Override", INC_FG, INC_BG)),
                                   ("CS 121", "Domingo, Grace A.", status("enrolled")),
                                   ("GE 6", "Bautista, Maria I.", badge("Retake", MUTED, CREAM_DP, dot=False)),
                                   ("MATH 22", "Lim, Joshua T.", status("enrolled"))]) + '</div>')
               + '</div></div>')

RECORD = (f'<div style="position: relative">'
          + shell("adviser", "Record attempt", ["Adviser portal", "Record enrollment attempt"], USER, INI,
                  RECORD_BODY, h=1180)
          + override_dialog() + '</div>')
write("RecordAttempt", RECORD)


# ------------------------------------------------------------------ reassignment
def incoming_adviser_select():
    opts = [("Prof. Lourdes Mendez", "LM", "31"), ("Prof. Antonio Salazar", "AS", "22"),
            ("Prof. Carmela Reyes", "CR", "27")]
    menu = "".join(
        f'<div class="sel-opt{" selected" if i == 0 else ""}" data-value="{n}" data-initials="{ini}" '
        f'data-count="{cnt}">{n} &middot; {cnt} active advisees</div>'
        for i, (n, ini, cnt) in enumerate(opts))
    n0, ini0, cnt0 = opts[0]
    return (f'<div data-select data-name="incoming-adviser" data-value="{n0}" style="background: {SURFACE}; '
            f'border: 1px solid {FOREST}; border-radius: 6px; padding: 18px; position: relative">'
            f'<div class="sel-label" style="cursor: pointer">'
            f'<div style="display: flex; align-items: center; justify-content: space-between">'
            f'<div class="kick" style="color: {FOREST}">Incoming adviser</div>{ico("down", 16, MUTED_2)}</div>'
            f'<div style="margin-top: 12px; display: flex; align-items: center; gap: 11px">'
            f'<div data-adviser-avatar style="width: 32px; height: 32px; border-radius: 50%; background: {FOREST}; '
            f'color: {CREAM}; display: flex; align-items: center; justify-content: center; font-size: 13px; '
            f'font-weight: 600; flex-shrink: 0; letter-spacing: 0.02em">{ini0}</div>'
            f'<div><div data-adviser-name style="font-size: 13.5px; font-weight: 600; line-height: 1.3">{n0}</div>'
            f'<div data-adviser-count style="font-size: 11.5px; color: {MUTED_2}">{cnt0} active advisees</div></div>'
            f'</div></div>'
            f'<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid {LINE}; font-size: 12.5px; '
            f'color: {MUTED}">Assignment starts <b>30 September 2026</b></div>'
            f'<div class="sel-menu">{menu}</div></div>')


REASSIGN = shell("adviser", "Reassignment", ["Adviser portal", "Adviser reassignment"], USER, INI,
                 page_head("Adviser reassignment",
                           "Every student has exactly one active adviser. The incoming assignment starts the day "
                           "the outgoing one ends — the database will refuse anything else.")
                 + '<div style="display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 18px">'
                 + f'<div style="display: flex; flex-direction: column; gap: 18px">'
                 + panel("Transition",
                         f'<div style="padding: 22px">'
                         f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) 52px minmax(0, 1fr); '
                         f'gap: 16px; align-items: center">'
                         f'<div style="background: {CREAM}; border: 1px solid {LINE}; border-radius: 6px; padding: 18px">'
                         f'<div class="kick" style="color: {MUTED_2}">Outgoing adviser</div>'
                         f'<div style="margin-top: 12px">{person("Prof. Ramon Reyes", "48 active advisees", "RR")}</div>'
                         f'<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid {LINE}; '
                         f'font-size: 12.5px; color: {MUTED}">Assignment ends <b>30 September 2026</b></div></div>'
                         f'<div style="display: flex; justify-content: center; color: {GOLD_DP}">{ico("right", 26)}</div>'
                         + incoming_adviser_select()
                         + '</div>'
                         f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; '
                         f'margin-top: 20px">'
                         f'{field("Effective date", "30 September 2026", "Must equal the outgoing end date.")}'
                         + iselect("Reason", "Department load rebalancing",
                                   ["Department load rebalancing", "Sabbatical / leave coverage",
                                    "Program shift", "Student request"], "reassign-reason")
                         + '</div>'
                         f'<div style="margin-top: 16px">'
                         f'{note("Zero-gap continuity is enforced in a single transaction and backstopped by a database constraint. A transition that would leave a student unassigned for even one day is rejected before it is written.", "green", "shield")}</div></div>',
                         actions=badge("3 advisees selected", CREAM, FOREST, dot=False, attrs="data-reassign-count"))
                 + panel("Select advisees to transfer",
                         table(["", "Student", "Program", "Year", "GWA", "Standing", "Assigned since"], [
                             [icheckbox("reassign-row", checked=chk),
                              person(n, sn, i), p, y, f'<span class="mono">{gw}</span>', st,
                              f'<span style="color: {MUTED_2}; font-size: 12.5px">{d}</span>']
                             for n, sn, i, p, y, gw, st, d, chk in [
                                 ("Villanueva, Andrea M.", "2024-00871", "AV", "BS Info. Technology", "1st", "1.92",
                                  status("passed", "Good standing"), "03 Jun 2025", True),
                                 ("Tolentino, Bea F.", "2024-00214", "BT", "BS Computer Science", "1st", "1.58",
                                  status("passed", "Good standing"), "03 Jun 2025", True),
                                 ("Garcia, Nicole P.", "2023-03017", "NG", "BS Computer Science", "2nd", "1.83",
                                  status("passed", "Good standing"), "12 Jun 2024", True),
                                 ("Bautista, Maria Isabel L.", "2023-04412", "MB", "BS Computer Science", "2nd", "1.68",
                                  status("passed", "Good standing"), "12 Jun 2024", False),
                                 ("Cruz, Angelo P.", "2022-01188", "AC", "BS Computer Science", "3rd", "3.42",
                                  status("failed", "Delinquent"), "05 Aug 2023", False),
                                 ("Lim, Joshua T.", "2023-02940", "JL", "BS Computer Science", "2nd", "2.14",
                                  badge("Watchlist", INC_FG, INC_BG), "12 Jun 2024", False)]
                         ], widths=["40px", "auto", "170px", "62px", "70px", "150px", "126px"]),
                         actions=searchbar("Search advisees", "260px"))
                 + '</div>'
                 + f'<div style="display: flex; flex-direction: column; gap: 18px">'
                 + panel("Continuity check",
                         f'<div style="padding: 20px">' +
                         "".join(f'<div style="display: flex; align-items: flex-start; gap: 11px; padding: 11px 0; '
                                 f'border-bottom: 1px solid {LINE_SF}">{ico("check", 17, PASS_FG)}'
                                 f'<div><div style="font-size: 13.5px; font-weight: 600">{t}</div>'
                                 f'<div {attr} style="font-size: 12.5px; color: {MUTED}; margin-top: 2px">{b}</div></div></div>'
                                 for t, b, attr in [
                                     ("No gap introduced", "Outgoing end date equals incoming start date for all 3.", ""),
                                     ("No overlap introduced", "No student would hold two active assignments.", ""),
                                     ("Incoming adviser is active", "Prof. Mendez holds an active adviser role.",
                                      'data-continuity-incoming-desc'),
                                     ("Historical access preserved", "You keep read-only access to transferred files.", "")]) +
                         f'<div style="margin-top: 16px; display: flex; gap: 10px; justify-content: flex-end">'
                         + btn("Cancel", "secondary", size="sm", attrs='data-goto="adviser/advisees"')
                         + btn("Execute reassignment", "primary", "swap", "sm", attrs='data-action="execute-reassignment"')
                         + '</div></div>')
                 + panel("Assignment history · this term",
                         f'<div style="padding: 6px 0">' +
                         "".join(f'<div style="padding: 12px 20px; border-bottom: 1px solid {LINE_SF}">'
                                 f'<div style="font-size: 13px; font-weight: 600">{a}</div>'
                                 f'<div style="font-size: 12.5px; color: {MUTED}; margin-top: 3px">{b}</div>'
                                 f'<div style="font-size: 11.5px; color: {MUTED_2}; margin-top: 4px">{d}</div></div>'
                                 for a, b, d in [
                                     ("6 advisees → Prof. R. Reyes", "From Prof. L. Mendez · load rebalancing", "12 June 2024"),
                                     ("2 advisees → Prof. R. Reyes", "From Prof. A. Salazar · sabbatical", "05 August 2023"),
                                     ("1 advisee → Prof. L. Mendez", "From Prof. R. Reyes · program shift", "18 January 2023")]) +
                         '</div>')
                 + '</div></div>', h=1360)
write("AdviserReassign", REASSIGN)
print("adviser artboards written")
