# -*- coding: utf-8 -*-
"""Student portal artboards."""
import base
base.SUBDIR = "Student"
from base import *

USER = ("Maria Isabel Bautista", "Student · 2023-04412")
INI = "MB"


def kpi(title, value, sub, tone=FOREST, foot=""):
    f = (f'<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid {LINE_SF}; '
         f'font-size: 12.5px; color: {MUTED_2}">{foot}</div>') if foot else ""
    return card(f'<div class="kick" style="color: {MUTED_2}">{title}</div>'
                f'<div class="dsp" style="font-size: 36px; color: {tone}; margin-top: 8px; '
                f'line-height: 1.1">{value}</div>'
                f'<div style="font-size: 13px; color: {MUTED}; margin-top: 4px">{sub}</div>{f}',
                pad="18px 20px 20px")


# ------------------------------------------------------------------ dashboard
def adviser_card():
    return card(
        f'<div class="kick" style="color: {MUTED_2}">Your academic adviser</div>'
        f'<div style="display: flex; align-items: center; gap: 14px; margin-top: 14px">'
        f'{avatar("RR", 48, CREAM_DP, FOREST)}'
        f'<div><div style="font-size: 16px; font-weight: 600">Prof. Ramon Reyes</div>'
        f'<div style="font-size: 13px; color: {MUTED}">Department of Computer Science</div></div></div>'
        f'<div style="display: flex; flex-direction: column; gap: 9px; margin-top: 16px; padding-top: 14px; '
        f'border-top: 1px solid {LINE_SF}">'
        f'<div style="display: flex; align-items: center; gap: 9px; font-size: 13px; color: {MUTED}">'
        f'{ico("mail", 16, MUTED_2)}r.reyes@[university].edu.ph</div>'
        f'<div style="display: flex; align-items: center; gap: 9px; font-size: 13px; color: {MUTED}">'
        f'{ico("clock", 16, MUTED_2)}Consultation: Tue &amp; Thu, 13:00–16:00 · Rm. [CS-204]</div>'
        f'<div style="display: flex; align-items: center; gap: 9px; font-size: 13px; color: {MUTED}">'
        f'{ico("swap", 16, MUTED_2)}Assigned since 12 June 2024 · continuous</div></div>', pad="18px 20px 20px")


def progress_card():
    bars = [("Core major courses", 68, "34 of 50 units"),
            ("General education", 92, "33 of 36 units"),
            ("Electives", 40, "6 of 15 units"),
            ("PE &amp; NSTP", 100, "8 of 8 units")]
    out = ""
    for t, p, s in bars:
        out += (f'<div style="margin-bottom: 16px">'
                f'<div style="display: flex; justify-content: space-between; font-size: 13px; '
                f'margin-bottom: 7px"><span style="font-weight: 500">{t}</span>'
                f'<span style="color: {MUTED_2}">{s}</span></div>{progress(p)}</div>')
    return panel("Degree progress", out, pad="20px 20px 6px",
                 sub="BS Computer Science · Curriculum version 2023–2024",
                 actions=btn("Open checklist", "secondary", "right", "sm"))


def term_card():
    rows = [("CS 121", "Data Structures", "3.0", "MWF 09:00", "enrolled"),
            ("CS 122", "Object-Oriented Programming", "3.0", "TTh 10:30", "enrolled"),
            ("MATH 22", "Calculus II", "5.0", "MWF 13:00", "enrolled"),
            ("GE 7", "Ethics", "3.0", "TTh 15:00", "enrolled"),
            ("PE 3", "Team Sports", "2.0", "Sat 08:00", "enrolled")]
    body = table(["Code", "Course title", "Units", "Schedule", "Status"],
                 [[code(c), t, u, f'<span style="color: {MUTED}">{s}</span>', status(st)] for c, t, u, s, st in rows],
                 widths=["110px", "auto", "70px", "140px", "130px"])
    return panel("Currently enrolled · AY 2025–2026, 1st Semester", body,
                 actions=badge("16 units", MUTED, CREAM_DP, dot=False))


def alerts_card():
    items = [("alert", INC_FG, "INC in STAT 101 lapses in 47 days",
              "Deadline 26 October 2026. After that it is evaluated as 5.00 for GWA and delinquency."),
             ("cal", FOREST, "Advising period opens 12 October",
              "Book a consultation slot with Prof. Reyes before enlistment."),
             ("file", MUTED, "Grade summary for AY 2024–2025 is available",
              "Downloadable as a signed PDF from Grades &amp; GWA.")]
    out = ""
    for i, c, t, b in items:
        out += (f'<div style="display: flex; gap: 12px; padding: 14px 20px; border-bottom: 1px solid {LINE_SF}">'
                f'<div style="color: {c}; margin-top: 1px">{ico(i, 18)}</div>'
                f'<div><div style="font-size: 13.5px; font-weight: 600">{t}</div>'
                f'<div style="font-size: 12.5px; color: {MUTED}; margin-top: 3px; line-height: 1.5">{b}</div></div></div>')
    return panel("Notices", out, actions=badge("3 new", CREAM, FOREST, dot=False))


DASH = shell("student", "Dashboard", ["Student portal", "Dashboard"], USER, INI,
             page_head("Good afternoon, Maria.",
                       "AY 2025–2026, 1st Semester · enrollment closes 30 September 2026",
                       btn("Download checklist PDF", "secondary", "print", "sm") + btn("Message adviser", "primary", "mail", "sm"))
             + grid(4, kpi("Cumulative GWA", "1.68", "across 61 counted units", FOREST, "Recomputed 8 Sept 2026, 02:00")
                    + kpi("Units earned", "61", "of 156 required", FOREST, "39% of the degree")
                    + kpi("Standing", "Good", "no delinquency flag", PASS_FG, "Threshold: 12 failed units")
                    + kpi("Open INC", "1", "STAT 101 · lapses 26 Oct", INC_FG, "Resolve with the instructor"))
             + '<div style="display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 18px; '
               'margin-top: 18px">'
             + f'<div style="display: flex; flex-direction: column; gap: 18px">{term_card()}{progress_card()}</div>'
             + f'<div style="display: flex; flex-direction: column; gap: 18px">{adviser_card()}{alerts_card()}</div>'
             + '</div>', h=1220)
write("StudentDashboard", DASH)


# ------------------------------------------------------------------ checklist
def slot(codev, title, units, st, grade, prov=None, term=None):
    provline = ""
    if prov:
        provline = (f'<div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; '
                    f'color: {GOLD_DP}; margin-top: 3px">{ico("swap", 13, GOLD_DP)}{prov}</div>')
    tcell = f'<span style="color: {MUTED_2}; font-size: 12.5px">{term or "—"}</span>'
    return [code(codev), f'<div><div>{title}</div>{provline}</div>',
            f'<span style="color: {MUTED_2}">{units}</span>', tcell, status(st),
            f'<span class="mono" style="font-weight: 500">{grade}</span>']


def checklist_block(term_label, units, earned, rows, done=False):
    chip = (badge(f"{earned} of {units} units", PASS_FG, PASS_BG) if done
            else badge(f"{earned} of {units} units", MUTED, CREAM_DP, dot=False))
    body = table(["Code", "Course title", "Units", "Taken in", "Status", "Grade"],
                 rows, widths=["110px", "auto", "64px", "170px", "140px", "70px"],
                 align=["left", "left", "left", "left", "left", "right"])
    return (f'<section style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 6px; '
            f'overflow: hidden; margin-bottom: 16px">'
            f'<header style="display: flex; align-items: center; justify-content: space-between; '
            f'padding: 14px 18px; background: {CREAM}; border-bottom: 1px solid {LINE}">'
            f'<div style="display: flex; align-items: center; gap: 12px">{ico("down", 18, MUTED_2)}'
            f'<h3 style="font-size: 15px">{term_label}</h3></div>{chip}</header>{body}</section>')


CHK_LEGEND = flex("".join(
    f'<div style="display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: {MUTED}">'
    f'{status(k)}<span>{d}</span></div>'
    for k, d in [("passed", "counted toward units and GWA"),
                 ("enrolled", "in progress this term"),
                 ("inc", "awaiting resolution"),
                 ("failed", "must be retaken"),
                 ("open", "no attempt recorded")]), gap="20px", wrap="wrap")

CHK = shell("student", "Curriculum checklist", ["Student portal", "Curriculum checklist"], USER, INI,
            page_head("Curriculum checklist",
                      "BS Computer Science · curriculum version 2023–2024 · 156 units required",
                      btn("Print", "secondary", "print", "sm") + btn("Export PDF", "primary", "file", "sm"))
            + grid(4, kpi("Slots satisfied", "24 / 51", "direct, equivalency or mapping", FOREST)
                   + kpi("Units earned", "61", "unit-weighted", FOREST)
                   + kpi("In progress", "16", "units this term", ENR_FG)
                   + kpi("Remaining", "79", "units to graduate", MUTED_2))
            + f'<div style="margin: 22px 0 18px; padding: 14px 18px; background: {SURFACE}; '
              f'border: 1px solid {LINE}; border-radius: 6px">{CHK_LEGEND}</div>'
            + checklist_block("Year 1 · First Semester", "20", "20", [
                slot("CS 101", "Introduction to Computing", "3.0", "passed", "1.25", term="AY 2023–24, 1st Sem"),
                slot("MATH 21", "Calculus I", "5.0", "passed", "2.00", term="AY 2023–24, 1st Sem"),
                slot("GE 1", "Understanding the Self", "3.0", "passed", "1.50", term="AY 2023–24, 1st Sem"),
                slot("GE 2", "Readings in Philippine History", "3.0", "passed", "1.75", term="AY 2023–24, 1st Sem"),
                slot("PE 1", "Movement Competency", "2.0", "passed", "1.00", term="AY 2023–24, 1st Sem"),
                slot("NSTP 1", "National Service Training I", "3.0", "passed", "1.25", term="AY 2023–24, 1st Sem"),
                slot("ENG 1", "Purposive Communication", "3.0", "passed", "1.50",
                     prov="Equivalency — ENGL 101 from [Previous Institution]", term="Transfer credit"),
            ], done=True)
            + checklist_block("Year 1 · Second Semester", "20", "17", [
                slot("CS 102", "Computer Programming I", "3.0", "passed", "1.75", term="AY 2023–24, 2nd Sem"),
                slot("MATH 22", "Calculus II", "5.0", "enrolled", "—", term="AY 2025–26, 1st Sem"),
                slot("GE 3", "The Contemporary World", "3.0", "passed", "2.25", term="AY 2023–24, 2nd Sem"),
                slot("GE 4", "Mathematics in the Modern World", "3.0", "passed", "1.50", term="AY 2023–24, 2nd Sem"),
                slot("PE 2", "Rhythmic Activities", "2.0", "passed", "1.25", term="AY 2023–24, 2nd Sem"),
                slot("NSTP 2", "National Service Training II", "3.0", "passed", "1.50", term="AY 2023–24, 2nd Sem"),
            ])
            + checklist_block("Year 2 · First Semester", "18", "12", [
                slot("CS 121", "Data Structures", "3.0", "enrolled", "—", term="AY 2025–26, 1st Sem"),
                slot("CS 122", "Object-Oriented Programming", "3.0", "enrolled", "—", term="AY 2025–26, 1st Sem"),
                slot("STAT 101", "Statistics for Computing", "3.0", "inc", "INC",
                     prov="Compliance deadline 26 October 2026", term="AY 2024–25, 2nd Sem"),
                slot("GE 5", "Science, Technology and Society", "3.0", "passed", "2.00", term="AY 2024–25, 1st Sem"),
                slot("GE ELEC 1", "Open elective slot — 3 units", "3.0", "passed", "1.75",
                     prov="Elective mapping — PHILO 12 Logic and Critical Thinking", term="AY 2024–25, 1st Sem"),
                slot("PE 3", "Team Sports", "2.0", "enrolled", "—", term="AY 2025–26, 1st Sem"),
            ])
            + checklist_block("Year 2 · Second Semester", "18", "3", [
                slot("CS 132", "Design and Analysis of Algorithms", "3.0", "open", "—"),
                slot("CS 133", "Computer Organization", "3.0", "open", "—"),
                slot("CS 134", "Information Management", "3.0", "open", "—"),
                slot("MATH 31", "Discrete Structures", "3.0", "passed", "2.50",
                     prov="Discontinued-course equivalency — MATH 30 Discrete Mathematics", term="AY 2024–25, 2nd Sem"),
                slot("GE 6", "Art Appreciation", "3.0", "failed", "5.00", term="AY 2024–25, 2nd Sem"),
                slot("GE ELEC 2", "Open elective slot — 3 units", "3.0", "open", "—"),
            ])
            + f'<div style="margin-top: 4px">{note("Two slots are filled by an academic exception. Provenance is shown under the course title — ask Prof. Reyes if a mapping looks wrong.", "gold", "flag")}</div>',
            h=2020)
write("StudentChecklist", CHK)


# ------------------------------------------------------------------ grades
def term_grades(term, gwa, units, rows, locked=True):
    body = table(["Code", "Course title", "Units", "Final grade", "Status", "Weighted"],
                 rows, widths=["108px", "auto", "64px", "110px", "150px", "94px"],
                 align=["left", "left", "left", "right", "left", "right"])
    return (f'<section style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 6px; '
            f'overflow: hidden; margin-bottom: 16px">'
            f'<header style="display: flex; align-items: center; justify-content: space-between; '
            f'padding: 15px 18px; background: {CREAM}; border-bottom: 1px solid {LINE}">'
            f'<div style="display: flex; align-items: center; gap: 12px"><h3 style="font-size: 15px">{term}</h3>'
            f'{badge("Term locked", MUTED, CREAM_DP, dot=False) if locked else badge("Open", ENR_FG, ENR_BG)}</div>'
            f'<div style="display: flex; align-items: center; gap: 26px">'
            f'<div style="text-align: right"><div class="kick" style="color: {MUTED_2}">Units</div>'
            f'<div style="font-size: 15px; font-weight: 600">{units}</div></div>'
            f'<div style="text-align: right"><div class="kick" style="color: {MUTED_2}">Term GWA</div>'
            f'<div class="dsp" style="font-size: 22px; color: {FOREST}">{gwa}</div></div></div></header>{body}</section>')


def g(c, t, u, grade, st, w):
    return [code(c), t, f'<span style="color: {MUTED_2}">{u}</span>',
            f'<span class="mono" style="font-weight: 600">{grade}</span>', status(st),
            f'<span class="mono" style="color: {MUTED}">{w}</span>']


GRADES = shell("student", "Grades & GWA", ["Student portal", "Grades &amp; GWA"], USER, INI,
               page_head("Grades and GWA",
                         "Unit-weighted general weighted average across all counting attempts",
                         btn("Official grade summary", "primary", "file", "sm"))
               + grid(4, kpi("Cumulative GWA", "1.68", "61 counted units", FOREST)
                      + kpi("Best term", "1.42", "AY 2023–24, 1st Sem", PASS_FG)
                      + kpi("Counted units", "61", "excludes superseded retakes", MUTED_2)
                      + kpi("Effective adjustments", "1", "lapsed INC evaluated as 5.00", INC_FG))
               + f'<div style="margin: 22px 0 18px">{note("<b>STAT 101</b> is an unresolved INC with a 26 October 2026 deadline. It is <b>not</b> included in the figures above yet. If it lapses, your cumulative GWA becomes <b>1.84</b> and 3 units move to the failed count.", "gold", "clock")}</div>'
               + term_grades("AY 2025–2026 · First Semester", "—", "16", [
                   g("CS 121", "Data Structures", "3.0", "—", "enrolled", "—"),
                   g("CS 122", "Object-Oriented Programming", "3.0", "—", "enrolled", "—"),
                   g("MATH 22", "Calculus II", "5.0", "—", "enrolled", "—"),
                   g("GE 7", "Ethics", "3.0", "—", "enrolled", "—"),
                   g("PE 3", "Team Sports", "2.0", "—", "enrolled", "—"),
               ], locked=False)
               + term_grades("AY 2024–2025 · Second Semester", "2.31", "14", [
                   g("MATH 31", "Discrete Structures", "3.0", "2.50", "passed", "7.50"),
                   g("GE 6", "Art Appreciation", "3.0", "5.00", "failed", "15.00"),
                   g("STAT 101", "Statistics for Computing", "3.0", "INC", "inc", "excluded"),
                   g("CS 111", "Web Systems and Technologies", "3.0", "1.50", "passed", "4.50"),
                   g("PE 4", "Individual Sports", "2.0", "1.25", "passed", "2.50"),
               ])
               + term_grades("AY 2024–2025 · First Semester", "1.79", "15", [
                   g("GE 5", "Science, Technology and Society", "3.0", "2.00", "passed", "6.00"),
                   g("PHILO 12", "Logic and Critical Thinking", "3.0", "1.75", "passed", "5.25"),
                   g("CS 110", "Discrete Computing Structures", "3.0", "1.75", "passed", "5.25"),
                   g("ENG 2", "Technical Writing", "3.0", "1.50", "passed", "4.50"),
                   g("CS 102", "Computer Programming I — retake", "3.0", "1.75", "passed", "5.25"),
               ])
               + term_grades("AY 2023–2024 · First Semester", "1.42", "19", [
                   g("CS 101", "Introduction to Computing", "3.0", "1.25", "passed", "3.75"),
                   g("MATH 21", "Calculus I", "5.0", "2.00", "passed", "10.00"),
                   g("GE 1", "Understanding the Self", "3.0", "1.50", "passed", "4.50"),
                   g("GE 2", "Readings in Philippine History", "3.0", "1.75", "passed", "5.25"),
                   g("PE 1", "Movement Competency", "2.0", "1.00", "passed", "2.00"),
                   g("NSTP 1", "National Service Training I", "3.0", "1.25", "passed", "3.75"),
               ])
               + card(f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 30px">'
                      f'<div><h3 style="font-size: 15px">How your GWA is computed</h3>'
                      f'<p style="font-size: 13.5px; color: {MUTED}; margin-top: 8px; max-width: 74ch; '
                      f'line-height: 1.6">Sum of (final grade × units) divided by total units, across every '
                      f'counting attempt. A retake under <b>grade replacement</b> supersedes its earlier attempt; '
                      f'a course marked <b>additional credit</b> counts every passed attempt separately. '
                      f'Unresolved INCs past their deadline are evaluated as 5.00 without changing the recorded '
                      f'status.</p></div>'
                      f'<div style="text-align: right; flex-shrink: 0">'
                      f'<div class="mono" style="font-size: 13px; color: {MUTED_2}">Σ(grade × units) ÷ Σ units</div>'
                      f'<div class="dsp" style="font-size: 30px; color: {FOREST}; margin-top: 6px">'
                      f'102.50 ÷ 61 = 1.68</div></div></div>'),
               h=1980)
write("StudentGrades", GRADES)


# ------------------------------------------------------------------ history
def att(term, c, t, u, st, grade, off, note_txt=""):
    n = (f'<div style="font-size: 11.5px; color: {GOLD_DP}; margin-top: 3px">{note_txt}</div>') if note_txt else ""
    return [f'<span style="color: {MUTED}; font-size: 12.5px">{term}</span>', code(c),
            f'<div><div>{t}</div>{n}</div>', f'<span style="color: {MUTED_2}">{u}</span>',
            status(st), f'<span class="mono" style="font-weight: 500">{grade}</span>',
            f'<span style="color: {MUTED_2}; font-size: 12.5px">{off}</span>']


HIST = shell("student", "Enrollment history", ["Student portal", "Enrollment history"], USER, INI,
             page_head("Enrollment history",
                       "Every attempt recorded against a course offering, including superseded retakes",
                       btn("Export CSV", "secondary", "file", "sm"))
             + flex(searchbar("Search course code or title", "340px")
                    + select("School term", "All terms", "200px")
                    + select("Status", "All statuses", "180px")
                    + f'<div style="flex-grow: 1"></div>'
                    + f'<div style="font-size: 13px; color: {MUTED_2}">27 attempts · 24 counting</div>',
                    gap="12px", align="flex-end", extra="margin-bottom: 18px")
             + panel("All attempts",
                     table(["School term", "Code", "Course", "Units", "Status", "Grade", "Section"], [
                         att("AY 2025–26 · 1st", "CS 121", "Data Structures", "3.0", "enrolled", "—", "CS121-A"),
                         att("AY 2025–26 · 1st", "CS 122", "Object-Oriented Programming", "3.0", "enrolled", "—", "CS122-B"),
                         att("AY 2025–26 · 1st", "MATH 22", "Calculus II", "5.0", "enrolled", "—", "MATH22-C"),
                         att("AY 2025–26 · 1st", "GE 7", "Ethics", "3.0", "enrolled", "—", "GE7-D"),
                         att("AY 2025–26 · 1st", "PE 3", "Team Sports", "2.0", "enrolled", "—", "PE3-F"),
                         att("AY 2024–25 · 2nd", "MATH 31", "Discrete Structures", "3.0", "passed", "2.50", "MATH31-A",
                             "Satisfies discontinued MATH 30 by equivalency decision"),
                         att("AY 2024–25 · 2nd", "GE 6", "Art Appreciation", "3.0", "failed", "5.00", "GE6-B"),
                         att("AY 2024–25 · 2nd", "STAT 101", "Statistics for Computing", "3.0", "inc", "INC", "STAT101-A",
                             "Compliance deadline 26 October 2026"),
                         att("AY 2024–25 · 2nd", "CS 111", "Web Systems and Technologies", "3.0", "passed", "1.50", "CS111-A"),
                         att("AY 2024–25 · 2nd", "PE 4", "Individual Sports", "2.0", "passed", "1.25", "PE4-A"),
                         att("AY 2024–25 · 1st", "CS 102", "Computer Programming I — 2nd attempt", "3.0", "passed", "1.75", "CS102-C",
                             "Grade replacement — supersedes the AY 2023–24 attempt below"),
                         att("AY 2024–25 · 1st", "PHILO 12", "Logic and Critical Thinking", "3.0", "passed", "1.75", "PHILO12-A",
                             "Mapped to elective slot GE ELEC 1"),
                         att("AY 2024–25 · 1st", "GE 5", "Science, Technology and Society", "3.0", "passed", "2.00", "GE5-A"),
                         att("AY 2024–25 · 1st", "CS 110", "Discrete Computing Structures", "3.0", "passed", "1.75", "CS110-B"),
                         att("AY 2024–25 · 1st", "ENG 2", "Technical Writing", "3.0", "passed", "1.50", "ENG2-A"),
                         att("AY 2023–24 · 2nd", "CS 102", "Computer Programming I — 1st attempt", "3.0", "failed", "5.00", "CS102-A",
                             "Superseded by the AY 2024–25 retake · not counted in GWA"),
                         att("AY 2023–24 · 2nd", "CS 103", "Computer Programming II", "3.0", "dr", "—", "CS103-A",
                             "Dropped 14 March 2025 · within the drop period"),
                         att("AY 2023–24 · 2nd", "GE 3", "The Contemporary World", "3.0", "passed", "2.25", "GE3-B"),
                         att("AY 2023–24 · 2nd", "GE 4", "Mathematics in the Modern World", "3.0", "passed", "1.50", "GE4-A"),
                         att("AY 2023–24 · 1st", "CS 101", "Introduction to Computing", "3.0", "passed", "1.25", "CS101-A"),
                         att("AY 2023–24 · 1st", "MATH 21", "Calculus I", "5.0", "passed", "2.00", "MATH21-A"),
                         att("AY 2023–24 · 1st", "GE 1", "Understanding the Self", "3.0", "passed", "1.50", "GE1-C"),
                     ], widths=["150px", "104px", "auto", "62px", "148px", "78px", "108px"],
                        align=["left", "left", "left", "left", "left", "right", "left"]),
                     actions=badge("22 shown of 27", MUTED, CREAM_DP, dot=False)),
             h=1560)
write("StudentHistory", HIST)


# ------------------------------------------------------------------ profile
PROFILE = shell("student", "My profile", ["Student portal", "My profile"], USER, INI,
                page_head("My profile",
                          "Academic records are maintained by the registrar. Contact details you may edit yourself.")
                + '<div style="display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 18px">'
                + '<div style="display: flex; flex-direction: column; gap: 18px">'
                + panel("Contact information",
                        f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); '
                        f'gap: 18px; padding: 20px">'
                        f'{field("Full name", "Bautista, Maria Isabel L.", disabled=True)}'
                        f'{field("Student number", "2023-04412", disabled=True)}'
                        f'{field("Institutional email", "maria.bautista@[university].edu.ph", disabled=True)}'
                        f'{field("Mobile number", "+63 9XX XXX XXXX")}'
                        f'{field("Present address", "[Street], [City], [Province]")}'
                        f'{field("Emergency contact", "[Name] · [Relationship] · [Number]")}</div>',
                        actions=btn("Save changes", "primary", size="sm"),
                        sub="Fields set by the registrar are read-only.")
                + panel("Academic record",
                        f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); '
                        f'gap: 18px; padding: 20px">'
                        f'{field("Program", "BS Computer Science", disabled=True)}'
                        f'{field("Curriculum version", "2023–2024 (effective 01 June 2023)", disabled=True)}'
                        f'{field("Year level", "Second year", disabled=True)}'
                        f'{field("Date of first enrollment", "12 June 2023", disabled=True)}'
                        f'{field("Delinquency threshold", "12 failed units", "Set by the curriculum version.", disabled=True)}'
                        f'{field("Standing", "Good standing", disabled=True)}</div>')
                + panel("Sessions and sign-in",
                        f'<div style="padding: 4px 0">' +
                        table(["Device", "Location", "Last active", ""], [
                            ["Chrome on Windows 11", "[City], PH", "Active now",
                             f'<span style="color: {MUTED_2}; font-size: 12.5px">This device</span>'],
                            ["Safari on iPhone", "[City], PH", "Yesterday, 19:42",
                             f'<a href="#" style="font-size: 12.5px; font-weight: 600">Sign out</a>'],
                        ], widths=["auto", "180px", "170px", "110px"]) + '</div>',
                        actions=btn("Sign out everywhere", "secondary", size="sm"))
                + '</div>'
                + '<div style="display: flex; flex-direction: column; gap: 18px">'
                + card(f'<div style="display: flex; flex-direction: column; align-items: center; '
                       f'text-align: center; padding: 6px 0 2px">'
                       f'{avatar("MB", 76, FOREST, CREAM, 26)}'
                       f'<div class="dsp" style="font-size: 21px; margin-top: 14px">Maria Isabel Bautista</div>'
                       f'<div style="font-size: 13px; color: {MUTED}; margin-top: 2px">2023-04412 · BS Computer Science</div>'
                       f'<div style="margin-top: 12px">{badge("Good standing", PASS_FG, PASS_BG)}</div></div>')
                + adviser_card()
                + card(f'<div class="kick" style="color: {MUTED_2}">Privacy</div>'
                       f'<p style="font-size: 13px; color: {MUTED}; line-height: 1.6; margin-top: 10px">'
                       f'Your grades, attempts and advising records are sensitive personal information under the '
                       f'Data Privacy Act of 2012 (RA 10173). Advising notes written by staff are never visible '
                       f'in a student session.</p>'
                       f'<div style="margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap">'
                       f'{btn("Privacy notice", "secondary", "out", "sm")}'
                       f'{btn("Request my data", "secondary", "file", "sm")}</div>')
                + '</div></div>', h=1240)
write("StudentProfile", PROFILE)
print("student artboards written")
