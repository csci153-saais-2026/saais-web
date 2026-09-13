# -*- coding: utf-8 -*-
"""Administrator portal artboards."""
import base
base.SUBDIR = "Admin"
from base import *

USER = ("Teresa Alvarez", "System Administrator")
INI = "TA"
LINK = lambda t: f'<a href="#" style="font-size: 12.5px; font-weight: 600">{t}</a>'
ACTS = f'<div style="display: flex; gap: 12px; justify-content: flex-end">{LINK("Edit")}{LINK("Archive")}</div>'


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


def toolbar(search, selects, right=""):
    s = "".join(select(l, v, w) for l, v, w in selects)
    return flex(searchbar(search, "340px") + s + '<div style="flex-grow: 1"></div>' + right,
                gap="12px", align="flex-end", extra="margin-bottom: 16px")


# ------------------------------------------------------------------ dashboard
def health_row(label, value, tone, detail):
    return (f'<div style="display: flex; align-items: center; gap: 14px; padding: 13px 20px; '
            f'border-bottom: 1px solid {LINE_SF}">'
            f'<div style="width: 8px; height: 8px; border-radius: 50%; background: {tone}; flex-shrink: 0"></div>'
            f'<div style="flex-grow: 1"><div style="font-size: 13.5px; font-weight: 600">{label}</div>'
            f'<div style="font-size: 12.5px; color: {MUTED}; margin-top: 2px">{detail}</div></div>'
            f'<div class="mono" style="font-size: 13px; color: {MUTED}; flex-shrink: 0">{value}</div></div>')


def term_progress():
    terms = [("AY 2025–2026 · 1st Semester", "Open", 62, ENR_FG, "3,184 attempts recorded"),
             ("AY 2024–2025 · 2nd Semester", "Locked", 100, MUTED_2, "3,410 attempts · grades final"),
             ("AY 2024–2025 · 1st Semester", "Locked", 100, MUTED_2, "3,297 attempts · grades final")]
    out = ""
    for t, s, p, c, d in terms:
        chip = badge(s, ENR_FG, ENR_BG) if s == "Open" else badge(s, MUTED, CREAM_DP, dot=False)
        out += (f'<div style="padding: 15px 20px; border-bottom: 1px solid {LINE_SF}">'
                f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">'
                f'<div style="font-size: 13.5px; font-weight: 600">{t}</div>{chip}</div>'
                f'<div style="display: flex; align-items: center; gap: 14px; margin-top: 10px">'
                f'{progress(p, "100%", 6, c)}'
                f'<span style="font-size: 12px; color: {MUTED_2}; white-space: nowrap">{d}</span></div></div>')
    return panel("School terms", out, actions=btn("Manage terms", "secondary", "right", "sm"))


DASH = shell("admin", "Dashboard", ["Administrator", "Dashboard"], USER, INI,
             page_head("System overview",
                       "AY 2025–2026, 1st Semester · master data, provisioning and integrity",
                       btn("Provision account", "primary", "plus", "sm"))
             + grid(4, kpi("Active students", "3,842", "with a curriculum assignment", FOREST, "94 provisioned this month")
                    + kpi("Advisers", "126", "across 9 colleges", FOREST, "Average load: 30 advisees")
                    + kpi("Courses in catalog", "1,047", "893 active · 154 discontinued", FOREST, "Last edit 2 days ago")
                    + kpi("Audit entries", "418,205", "append-only", GOLD_DP, "1,284 written this week"))
             + '<div style="display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; '
               'margin-top: 18px">'
             + f'<div style="display: flex; flex-direction: column; gap: 18px">'
             + panel("Data integrity",
                     health_row("Adviser continuity", "0 gaps", PASS_FG,
                                "Every active student holds exactly one active assignment")
                     + health_row("Lapsed INC recompute", "8 Sept, 02:00", PASS_FG,
                                  "Daily pg_cron job · 2 cached GWAs invalidated and rebuilt")
                     + health_row("Contract drift check", "passing", PASS_FG,
                                  "openapi.yaml v1.4.0 matches the live PostgREST schema")
                     + health_row("Curriculum slots without courses", "3 slots", INC_FG,
                                  "BSIT 2025–2026 · Year 3 electives not yet populated")
                     + health_row("Orphaned offerings", "1 offering", INC_FG,
                                  "STAT 101-C references a discontinued course"),
                     actions=btn("Run checks", "secondary", "shield", "sm"),
                     sub="Invariants the database enforces, reported here for visibility")
             + panel("Recent administrative changes",
                     f'<div style="padding: 4px 0">' +
                     table(["When", "Actor", "Action", "Target"], [
                         ["8 Sept, 10:12", person("T. Alvarez", "Admin", "TA"),
                          badge("Created profile", PASS_FG, PASS_BG), "b.tolentino@[university].edu.ph · student"],
                         ["8 Sept, 09:40", person("T. Alvarez", "Admin", "TA"),
                          badge("Locked term", MUTED, CREAM_DP, dot=False), "AY 2024–2025 · 2nd Semester"],
                         ["7 Sept, 16:22", person("J. Ferrer", "Admin", "JF"),
                          badge("Updated course", INC_FG, INC_BG), "CS 111 · units 3.0 → 3.0, lab hours 0 → 3"],
                         ["7 Sept, 14:05", person("J. Ferrer", "Admin", "JF"),
                          badge("Discontinued", FAIL_FG, FAIL_BG), "MATH 30 Discrete Mathematics"],
                         ["6 Sept, 11:48", person("T. Alvarez", "Admin", "TA"),
                          badge("Published curriculum", PASS_FG, PASS_BG), "BS Computer Science · 2025–2026"],
                     ], widths=["130px", "180px", "170px", "auto"]) + '</div>',
                     actions=btn("Open audit log", "secondary", "right", "sm"))
             + '</div>'
             + f'<div style="display: flex; flex-direction: column; gap: 18px">'
             + term_progress()
             + panel("Accounts by role",
                     f'<div style="padding: 20px">' +
                     "".join(f'<div style="margin-bottom: 16px">'
                             f'<div style="display: flex; justify-content: space-between; font-size: 13px; '
                             f'margin-bottom: 7px"><span>{l}</span>'
                             f'<span style="font-weight: 600">{v}</span></div>{progress(p, "100%", 7, c)}</div>'
                             for l, v, p, c in [("Students", "3,842", 96, FOREST),
                                                ("Advisers", "126", 12, FOREST_SF),
                                                ("Administrators", "7", 3, GOLD),
                                                ("Pending invitations", "18", 5, MUTED_2)]) + '</div>')
             + note("Public self-registration is disabled system-wide. A Google sign-in with no matching pre-registered profile is rejected by the auth hook before a user row is created.", "gold", "lock")
             + '</div></div>', h=1300)
write("AdminDashboard", DASH)


# ------------------------------------------------------------------ accounts
def role_chip(r):
    return {"student": badge("Student", ENR_FG, ENR_BG),
            "adviser": badge("Adviser", FOREST, CREAM_DP),
            "admin": badge("Administrator", GOLD_DP, "#FBF0D6")}[r]


def acct(name, ini, email, role, dept, st, last):
    stc = {"active": status("passed", "Active"),
           "invited": badge("Invited", INC_FG, INC_BG),
           "disabled": badge("Disabled", NEU_FG, NEU_BG)}[st]
    return [person(name, email, ini), role_chip(role),
            f'<span style="font-size: 12.5px; color: {MUTED}">{dept}</span>', stc,
            f'<span style="color: {MUTED_2}; font-size: 12.5px">{last}</span>', ACTS]


ACCOUNTS = shell("admin", "Accounts", ["Administrator", "Accounts"], USER, INI,
                 page_head("Accounts",
                           "Profiles are created here first. A sign-in whose email has no profile is rejected "
                           "server-side.",
                           btn("Bulk import CSV", "secondary", "file", "sm") + btn("Provision account", "primary", "plus", "sm"))
                 + grid(4, kpi("Total accounts", "3,975", "all roles", FOREST)
                        + kpi("Pending invitations", "18", "expire after 7 days", INC_FG)
                        + kpi("Disabled", "42", "retained for audit", MUTED_2)
                        + kpi("Rejected sign-ins", "6", "last 30 days", FAIL_FG))
                 + f'<div style="margin: 18px 0">{toolbar("Search name or institutional email", [("Role", "All roles", "160px"), ("Department", "All departments", "200px"), ("Status", "All", "150px")], btn("Export", "secondary", "file", "sm"))}</div>'
                 + panel("All accounts",
                         table(["Account", "Role", "Department / program", "Status", "Last sign-in", ""], [
                             acct("Bautista, Maria Isabel L.", "MB", "maria.bautista@[university].edu.ph", "student",
                                  "BS Computer Science", "active", "Today, 08:14"),
                             acct("Reyes, Ramon", "RR", "r.reyes@[university].edu.ph", "adviser",
                                  "Computer Science", "active", "Today, 07:52"),
                             acct("Mendez, Lourdes", "LM", "l.mendez@[university].edu.ph", "adviser",
                                  "Computer Science", "active", "Yesterday, 16:30"),
                             acct("Tolentino, Bea F.", "BT", "b.tolentino@[university].edu.ph", "student",
                                  "BS Computer Science", "invited", "—"),
                             acct("Ferrer, Josefina", "JF", "j.ferrer@[university].edu.ph", "admin",
                                  "Office of the Registrar", "active", "Today, 09:05"),
                             acct("Cruz, Angelo P.", "AC", "angelo.cruz@[university].edu.ph", "student",
                                  "BS Computer Science", "active", "3 days ago"),
                             acct("Salazar, Antonio", "AS", "a.salazar@[university].edu.ph", "adviser",
                                  "Information Technology", "disabled", "12 Mar 2026"),
                             acct("Villanueva, Andrea M.", "AV", "andrea.villanueva@[university].edu.ph", "student",
                                  "BS Information Technology", "active", "Yesterday, 20:11"),
                             acct("Domingo, Grace A.", "GD", "grace.domingo@[university].edu.ph", "student",
                                  "BS Computer Science", "active", "Today, 06:47"),
                             acct("Ocampo, Liza R.", "LO", "liza.ocampo@[university].edu.ph", "student",
                                  "BS Computer Science", "invited", "—"),
                         ], widths=["auto", "150px", "210px", "128px", "132px", "120px"],
                            align=["left", "left", "left", "left", "left", "right"]),
                         actions=badge("10 of 3,975 shown", MUTED, CREAM_DP, dot=False))
                 + f'<div style="margin-top: 18px">'
                 + note("Deleting an account is not offered. Disabling revokes access while keeping the profile "
                        "referenced by attempts, notes and audit entries — the audit trail must stay resolvable.",
                        "gold", "shield") + '</div>', h=1300)
write("AdminAccounts", ACCOUNTS)


# ------------------------------------------------------------------ programs
def prog(code_, name, college, curricula, students, active):
    return [f'<span class="mono" style="font-weight: 600">{code_}</span>',
            f'<div><div style="font-weight: 500">{name}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED_2}; margin-top: 2px">{college}</div></div>',
            f'<span style="color: {MUTED}">{curricula}</span>',
            f'<span style="color: {MUTED}">{students}</span>',
            status("passed", "Active") if active else badge("Archived", NEU_FG, NEU_BG), ACTS]


PROGRAMS = shell("admin", "Programs", ["Administrator", "Programs"], USER, INI,
                 page_head("Degree programs",
                           "A program holds one or more versioned curricula. Students are bound to a version, "
                           "never to the program alone.",
                           btn("New program", "primary", "plus", "sm"))
                 + '<div style="display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px">'
                 + f'<div>{toolbar("Search programs", [("College", "All colleges", "220px")])}'
                 + panel("Programs",
                         table(["Code", "Program", "Curricula", "Students", "Status", ""], [
                             prog("BSCS", "BS Computer Science", "College of Computer Studies", "4 versions", "812", True),
                             prog("BSIT", "BS Information Technology", "College of Computer Studies", "3 versions", "744", True),
                             prog("BSIS", "BS Information Systems", "College of Computer Studies", "2 versions", "318", True),
                             prog("BSA", "BS Accountancy", "College of Business", "3 versions", "596", True),
                             prog("BSN", "BS Nursing", "College of Health Sciences", "2 versions", "480", True),
                             prog("BSED-MATH", "BSEd major in Mathematics", "College of Education", "2 versions", "271", True),
                             prog("BSCE", "BS Civil Engineering", "College of Engineering", "3 versions", "621", True),
                             prog("ABCOM", "AB Communication", "College of Arts and Letters", "1 version", "0", False),
                         ], widths=["110px", "auto", "116px", "94px", "118px", "120px"],
                            align=["left", "left", "left", "right", "left", "right"]))
                 + '</div>'
                 + f'<div style="display: flex; flex-direction: column; gap: 18px">'
                 + panel("New program",
                         f'<div style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                         f'{field("Program code", "BSCS")}'
                         f'{field("Program name", "BS Computer Science")}'
                         f'{select("College", "College of Computer Studies")}'
                         f'{field("Nominal duration", "4 years")}'
                         f'<div style="display: flex; gap: 10px; justify-content: flex-end">'
                         f'{btn("Cancel", "secondary", size="sm")}{btn("Create program", "primary", size="sm")}</div></div>')
                 + panel("BSCS · curriculum versions",
                         f'<div style="padding: 6px 0">' +
                         "".join(f'<div style="display: flex; align-items: center; gap: 12px; padding: 12px 20px; '
                                 f'border-bottom: 1px solid {LINE_SF}">'
                                 f'<div style="flex-grow: 1"><div style="font-size: 13.5px; font-weight: 600">{v}</div>'
                                 f'<div style="font-size: 12px; color: {MUTED_2}; margin-top: 2px">{d}</div></div>{c}</div>'
                                 for v, d, c in [
                                     ("2025–2026", "Effective 01 June 2025 · 158 units · threshold 12",
                                      badge("Current", PASS_FG, PASS_BG)),
                                     ("2023–2024", "Effective 01 June 2023 · 156 units · threshold 12",
                                      badge("812 students", MUTED, CREAM_DP, dot=False)),
                                     ("2021–2022", "Effective 01 June 2021 · 162 units · threshold 15",
                                      badge("Teach-out", INC_FG, INC_BG)),
                                     ("2018–2019", "Effective 01 June 2018 · 168 units · threshold 15",
                                      badge("Closed", NEU_FG, NEU_BG))]) + '</div>',
                         actions=btn("Add version", "secondary", "plus", "sm"))
                 + '</div></div>', h=1180)
write("AdminPrograms", PROGRAMS)


# ------------------------------------------------------------------ curricula
def curr_term(label, units, courses):
    rows = "".join(
        f'<div style="display: grid; grid-template-columns: 100px 1fr 54px 130px 86px; gap: 10px; '
        f'align-items: center; padding: 9px 18px; border-bottom: 1px solid {LINE_SF}">'
        f'{code(c)}<div style="font-size: 13px">{t}</div>'
        f'<div style="font-size: 12.5px; color: {MUTED_2}">{u}</div>'
        f'<div style="font-size: 12px; color: {MUTED}">{pre}</div>'
        f'<div style="text-align: right">{el}</div></div>'
        for c, t, u, pre, el in courses)
    return (f'<div style="border: 1px solid {LINE}; border-radius: 6px; overflow: hidden; margin-bottom: 12px; '
            f'background: {SURFACE}">'
            f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; '
            f'background: {CREAM}; border-bottom: 1px solid {LINE}">'
            f'<div style="display: flex; align-items: center; gap: 10px">{ico("down", 17, MUTED_2)}'
            f'<span style="font-size: 14px; font-weight: 600">{label}</span></div>'
            f'<div style="display: flex; align-items: center; gap: 12px">'
            f'{badge(units + " units", MUTED, CREAM_DP, dot=False)}{LINK("Add course")}</div></div>{rows}</div>')


EL = badge("Elective slot", GOLD_DP, "#FBF0D6", dot=False)
NOEL = f'<span style="font-size: 12px; color: {MUTED_2}">Required</span>'

CURRICULA = shell("admin", "Curricula", ["Administrator", "Curricula", "BSCS 2023–2024"], USER, INI,
                  page_head("BS Computer Science · curriculum 2023–2024",
                            "Effective 01 June 2023 · 156 units · delinquency threshold 12 failed units",
                            btn("Duplicate as new version", "secondary", "layers", "sm") + btn("Save changes", "primary", size="sm"))
                  + grid(4, kpi("Total units", "156", "across 8 positional terms", FOREST)
                         + kpi("Course slots", "51", "45 required · 6 elective", FOREST)
                         + kpi("Students bound", "812", "on this version", FOREST)
                         + kpi("Delinquency threshold", "12", "failed units", INC_FG))
                  + '<div style="display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 18px; '
                    'margin-top: 18px">'
                  + f'<div>'
                  + curr_term("Year 1 · First Semester", "20", [
                      ("CS 101", "Introduction to Computing", "3.0", "—", NOEL),
                      ("MATH 21", "Calculus I", "5.0", "—", NOEL),
                      ("GE 1", "Understanding the Self", "3.0", "—", NOEL),
                      ("GE 2", "Readings in Philippine History", "3.0", "—", NOEL),
                      ("PE 1", "Movement Competency", "2.0", "—", NOEL),
                      ("NSTP 1", "National Service Training I", "3.0", "—", NOEL),
                      ("ENG 1", "Purposive Communication", "3.0", "—", NOEL)])
                  + curr_term("Year 2 · First Semester", "18", [
                      ("CS 121", "Data Structures", "3.0", "CS 102 (strict)", NOEL),
                      ("CS 122", "Object-Oriented Programming", "3.0", "CS 102 (strict)", NOEL),
                      ("STAT 101", "Statistics for Computing", "3.0", "MATH 22 (strict)", NOEL),
                      ("GE 5", "Science, Technology and Society", "3.0", "—", NOEL),
                      ("GE ELEC 1", "Open elective — 3 units", "3.0", "—", EL),
                      ("PE 3", "Team Sports", "2.0", "PE 2 (strict)", NOEL)])
                  + curr_term("Year 2 · Second Semester", "18", [
                      ("CS 132", "Design and Analysis of Algorithms", "3.0", "CS 121 (strict)", NOEL),
                      ("CS 133", "Computer Organization", "3.0", "CS 110 (strict)", NOEL),
                      ("CS 134", "Information Management", "3.0", "CS 121 (strict)", NOEL),
                      ("MATH 31", "Discrete Structures", "3.0", "MATH 22 (recommended)", NOEL),
                      ("GE 6", "Art Appreciation", "3.0", "—", NOEL),
                      ("GE ELEC 2", "Open elective — 3 units", "3.0", "—", EL)])
                  + '</div>'
                  + f'<div style="display: flex; flex-direction: column; gap: 18px">'
                  + panel("Version settings",
                          f'<div style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                          f'{select("Program", "BS Computer Science")}'
                          f'{field("Version label", "2023–2024")}'
                          f'{field("Effective date", "01 June 2023")}'
                          f'{field("Delinquency threshold", "12", "Failed units at which a student is flagged.")}'
                          f'{select("Status", "Active — accepting new students")}</div>')
                  + panel("Positional terms",
                          f'<div style="padding: 6px 0">' +
                          "".join(f'<div class="row" style="display: flex; align-items: center; '
                                  f'justify-content: space-between; padding: 10px 20px; '
                                  f'border-bottom: 1px solid {LINE_SF}; font-size: 13px">'
                                  f'<span>{t}</span><span style="color: {MUTED_2}">{u} units</span></div>'
                                  for t, u in [("Year 1 · 1st Sem", "20"), ("Year 1 · 2nd Sem", "20"),
                                               ("Year 2 · 1st Sem", "18"), ("Year 2 · 2nd Sem", "18"),
                                               ("Year 3 · 1st Sem", "21"), ("Year 3 · 2nd Sem", "21"),
                                               ("Year 4 · 1st Sem", "20"), ("Year 4 · 2nd Sem", "18")]) + '</div>',
                          actions=btn("Add term", "secondary", "plus", "sm"))
                  + note("A positional term is a slot in the curriculum (Year 2 · 1st Sem). It is not a calendar "
                         "term — an attempt binds to a <b>school term</b> such as AY 2025–2026, 1st Semester.",
                         "gold", "cal")
                  + '</div></div>', h=1560)
write("AdminCurricula", CURRICULA)


# ------------------------------------------------------------------ courses
def crs(c, t, lec, lab, units, rep, pres, active):
    repchip = {"none": badge("none", NEU_FG, NEU_BG),
               "grade_replacement": badge("grade_replacement", FOREST, CREAM_DP),
               "additional_credit": badge("additional_credit", GOLD_DP, "#FBF0D6")}[rep]
    return [code(c), f'<span style="font-weight: 500">{t}</span>',
            f'<span style="color: {MUTED_2}">{lec}</span>', f'<span style="color: {MUTED_2}">{lab}</span>',
            f'<span style="font-weight: 600">{units}</span>', repchip,
            f'<span style="font-size: 12.5px; color: {MUTED}">{pres}</span>',
            status("passed", "Active") if active else badge("Discontinued", FAIL_FG, FAIL_BG), ACTS]


COURSES = shell("admin", "Course catalog", ["Administrator", "Course catalog"], USER, INI,
                page_head("Course catalog",
                          "Master list of courses, their credit structure, prerequisite links and repeatable rules.",
                          btn("Import catalog", "secondary", "file", "sm") + btn("New course", "primary", "plus", "sm"))
                + f'{toolbar("Search code or title", [("Department", "All departments", "190px"), ("Repeatable", "All types", "190px"), ("Status", "Active only", "150px")], btn("Export", "secondary", "file", "sm"))}'
                + '<div style="display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 18px">'
                + panel("Courses",
                        table(["Code", "Title", "Lec", "Lab", "Units", "Repeatable", "Prerequisites", "Status", ""], [
                            crs("CS 101", "Introduction to Computing", "3", "0", "3.0", "grade_replacement", "—", True),
                            crs("CS 102", "Computer Programming I", "2", "3", "3.0", "grade_replacement", "CS 101", True),
                            crs("CS 110", "Discrete Computing Structures", "3", "0", "3.0", "grade_replacement", "MATH 21", True),
                            crs("CS 121", "Data Structures", "2", "3", "3.0", "grade_replacement", "CS 102", True),
                            crs("CS 122", "Object-Oriented Programming", "2", "3", "3.0", "grade_replacement", "CS 102", True),
                            crs("CS 132", "Design and Analysis of Algorithms", "3", "0", "3.0", "grade_replacement", "CS 121", True),
                            crs("CS 199", "Special Topics in Computing", "3", "0", "3.0", "additional_credit", "CS 121", True),
                            crs("CS 200", "Practicum", "0", "18", "6.0", "additional_credit", "3rd year standing", True),
                            crs("MATH 21", "Calculus I", "5", "0", "5.0", "grade_replacement", "—", True),
                            crs("MATH 30", "Discrete Mathematics", "3", "0", "3.0", "none", "MATH 22", False),
                            crs("MATH 31", "Discrete Structures", "3", "0", "3.0", "grade_replacement", "MATH 22", True),
                            crs("STAT 101", "Statistics for Computing", "3", "0", "3.0", "grade_replacement", "MATH 22", True),
                        ], widths=["104px", "auto", "48px", "48px", "62px", "168px", "150px", "126px", "112px"],
                           align=["left", "left", "right", "right", "right", "left", "left", "left", "right"]),
                        actions=badge("12 of 1,047 shown", MUTED, CREAM_DP, dot=False))
                + f'<div style="display: flex; flex-direction: column; gap: 18px">'
                + panel("CS 132 · prerequisites",
                        f'<div style="padding: 6px 0">' +
                        table(["Course", "Type", ""], [
                            [f'{code("CS 121")} Data Structures', badge("strict", FAIL_FG, FAIL_BG), LINK("Remove")],
                            [f'{code("CS 110")} Discrete Computing Structures', badge("strict", FAIL_FG, FAIL_BG), LINK("Remove")],
                            [f'{code("CS 122")} Object-Oriented Prog.', badge("co_requisite", INC_FG, INC_BG), LINK("Remove")],
                            [f'{code("MATH 31")} Discrete Structures', badge("recommended", MUTED, CREAM_DP), LINK("Remove")],
                        ], widths=["auto", "134px", "80px"], align=["left", "left", "right"]) + '</div>',
                        actions=btn("Link prerequisite", "secondary", "plus", "sm"),
                        sub="Only strict links raise the enrollment warning.")
                + panel("Edit course",
                        f'<div style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                        f'<div style="display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 16px">'
                        f'{field("Code", "CS 132")}{field("Title", "Design and Analysis of Algorithms")}</div>'
                        f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px">'
                        f'{field("Lecture hours", "3")}{field("Lab hours", "0")}{field("Units", "3.0")}</div>'
                        f'{select("Repeatable type", "grade_replacement")}'
                        f'<div style="font-size: 12px; color: {MUTED_2}; margin-top: -8px; line-height: 1.55">'
                        f'<b>grade_replacement</b> — only the most recent passed attempt counts. '
                        f'<b>additional_credit</b> — every passed attempt stacks credit.</div>'
                        f'{select("Status", "Active")}'
                        f'<div style="display: flex; gap: 10px; justify-content: flex-end">'
                        f'{btn("Cancel", "secondary", size="sm")}{btn("Save course", "primary", size="sm")}</div></div>')
                + '</div></div>', h=1420)
write("AdminCourses", COURSES)


# ------------------------------------------------------------------ offerings
def off(sect, c, t, term, sched, cap, enrolled, byreq, locked):
    chips = []
    if byreq:
        chips.append(badge("By request", GOLD_DP, "#FBF0D6", dot=False))
    if locked:
        chips.append(badge("Term locked", MUTED, CREAM_DP, dot=False))
    if not chips:
        chips.append(status("passed", "Open"))
    pct = int(enrolled / cap * 100)
    return [f'<span class="mono" style="font-weight: 600">{sect}</span>',
            f'<div><div style="font-size: 13px">{code(c)} {t}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED_2}; margin-top: 2px">{term}</div></div>',
            f'<span style="font-size: 12.5px; color: {MUTED}">{sched}</span>',
            f'<div style="display: flex; align-items: center; gap: 9px">'
            f'{progress(pct, "62px", 6, FOREST if pct < 95 else INC_FG)}'
            f'<span style="font-size: 12.5px; color: {MUTED}">{enrolled}/{cap}</span></div>',
            "".join(chips), ACTS]


OFFERINGS = shell("admin", "Terms & offerings", ["Administrator", "Terms &amp; offerings"], USER, INI,
                  page_head("School terms and course offerings",
                            "A calendar term carries offerings. Locking a term stops new attempts from being "
                            "recorded against it.",
                            btn("New school term", "secondary", "cal", "sm") + btn("New offering", "primary", "plus", "sm"))
                  + '<div style="display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 18px">'
                  + f'<div style="display: flex; flex-direction: column; gap: 18px">'
                  + panel("School terms",
                          f'<div style="padding: 6px 0">' +
                          "".join(f'<div class="row" style="padding: 13px 20px; border-bottom: 1px solid {LINE_SF}; '
                                  f'background: {CREAM if on else "transparent"}">'
                                  f'<div style="display: flex; align-items: center; justify-content: space-between; '
                                  f'gap: 10px"><span style="font-size: 13.5px; font-weight: '
                                  f'{"600" if on else "450"}">{t}</span>{c}</div>'
                                  f'<div style="font-size: 12px; color: {MUTED_2}; margin-top: 4px">{d}</div></div>'
                                  for t, d, c, on in [
                                      ("AY 2025–2026 · 1st Sem", "08 Jun 2026 – 12 Oct 2026 · 412 offerings",
                                       badge("Open", ENR_FG, ENR_BG), True),
                                      ("AY 2024–2025 · 2nd Sem", "06 Jan 2026 – 15 May 2026 · 398 offerings",
                                       badge("Locked", MUTED, CREAM_DP, dot=False), False),
                                      ("AY 2024–2025 · 1st Sem", "09 Jun 2025 – 13 Oct 2025 · 405 offerings",
                                       badge("Locked", MUTED, CREAM_DP, dot=False), False),
                                      ("AY 2023–2024 · 2nd Sem", "08 Jan 2025 – 17 May 2025 · 389 offerings",
                                       badge("Locked", MUTED, CREAM_DP, dot=False), False)]) + '</div>')
                  + panel("Term settings",
                          f'<div style="padding: 20px; display: flex; flex-direction: column; gap: 16px">'
                          f'{field("Term label", "AY 2025–2026 · 1st Semester")}'
                          f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">'
                          f'{field("Starts", "08 Jun 2026")}{field("Ends", "12 Oct 2026")}</div>'
                          f'<div style="display: flex; align-items: center; justify-content: space-between; '
                          f'padding: 12px 14px; border: 1px solid {LINE}; border-radius: 5px">'
                          f'<div><div style="font-size: 13.5px; font-weight: 600">Term lock</div>'
                          f'<div style="font-size: 12px; color: {MUTED_2}; margin-top: 2px">Blocks new attempts</div></div>'
                          f'<div style="width: 40px; height: 22px; border-radius: 11px; background: {LINE}; '
                          f'padding: 3px; display: flex"><div style="width: 16px; height: 16px; border-radius: 50%; '
                          f'background: {SURFACE}"></div></div></div>'
                          f'<div style="display: flex; align-items: center; justify-content: space-between; '
                          f'padding: 12px 14px; border: 1px solid {LINE}; border-radius: 5px">'
                          f'<div><div style="font-size: 13.5px; font-weight: 600">Override flag</div>'
                          f'<div style="font-size: 12px; color: {MUTED_2}; margin-top: 2px">Admins may still write</div></div>'
                          f'<div style="width: 40px; height: 22px; border-radius: 11px; background: {FOREST}; '
                          f'padding: 3px; display: flex; justify-content: flex-end">'
                          f'<div style="width: 16px; height: 16px; border-radius: 50%; background: {CREAM}"></div></div></div>'
                          f'{btn("Save term", "primary", size="sm")}</div>')
                  + '</div>'
                  + f'<div>{toolbar("Search section, code or title", [("Department", "All", "150px"), ("Type", "All offerings", "170px")], btn("Bulk edit", "secondary", "filter", "sm"))}'
                  + panel("Offerings · AY 2025–2026, 1st Semester",
                          table(["Section", "Course", "Schedule", "Enrolment", "Flags", ""], [
                              off("CS121-A", "CS 121", "Data Structures", "AY 2025–26 · 1st Sem", "MWF 09:00–10:00", 40, 38, False, False),
                              off("CS121-B", "CS 121", "Data Structures", "AY 2025–26 · 1st Sem", "MWF 13:00–14:00", 40, 40, False, False),
                              off("CS122-B", "CS 122", "Object-Oriented Programming", "AY 2025–26 · 1st Sem", "TTh 10:30–12:00", 35, 31, False, False),
                              off("CS132-A", "CS 132", "Design and Analysis of Algorithms", "AY 2025–26 · 1st Sem", "MWF 07:30–08:30", 35, 12, False, False),
                              off("CS134-R", "CS 134", "Information Management", "AY 2025–26 · 1st Sem", "By arrangement", 15, 3, True, False),
                              off("CS199-R", "CS 199", "Special Topics in Computing", "AY 2025–26 · 1st Sem", "By arrangement", 12, 5, True, False),
                              off("MATH22-C", "MATH 22", "Calculus II", "AY 2025–26 · 1st Sem", "MWF 13:00–14:30", 45, 44, False, False),
                              off("STAT101-A", "STAT 101", "Statistics for Computing", "AY 2025–26 · 1st Sem", "TTh 08:00–09:30", 40, 27, False, False),
                              off("GE7-D", "GE 7", "Ethics", "AY 2025–26 · 1st Sem", "TTh 15:00–16:30", 50, 49, False, False),
                              off("PE3-F", "PE 3", "Team Sports", "AY 2025–26 · 1st Sem", "Sat 08:00–11:00", 60, 55, False, False),
                          ], widths=["112px", "auto", "168px", "150px", "160px", "112px"],
                             align=["left", "left", "left", "left", "left", "right"]),
                          actions=badge("10 of 412 shown", MUTED, CREAM_DP, dot=False))
                  + f'<div style="margin-top: 18px">'
                  + note("<b>By-request</b> offerings do not appear in the student enlistment list. An adviser can "
                         "still record an attempt against them — used for practicum, special topics and "
                         "graduating-student accommodations.", "gold", "flag") + '</div></div></div>', h=1400)
write("AdminOfferings", OFFERINGS)


# ------------------------------------------------------------------ audit log
def audit(ts, actor, ini, role, action, afg, abg, target, detail, ip):
    return [f'<div><div class="mono" style="font-size: 12.5px">{ts}</div>'
            f'<div style="font-size: 11px; color: {MUTED_2}; margin-top: 2px">{ip}</div></div>',
            person(actor, role, ini), badge(action, afg, abg, dot=False),
            f'<div><div style="font-size: 13px">{target}</div>'
            f'<div style="font-size: 11.5px; color: {MUTED}; margin-top: 3px; line-height: 1.45">{detail}</div></div>',
            f'<a href="#" style="font-size: 12.5px; font-weight: 600">Payload</a>']


AUDIT = shell("admin", "Audit log", ["Administrator", "Audit log"], USER, INI,
              page_head("Audit log",
                        "Append-only. The database rejects UPDATE and DELETE on this table — including from the "
                        "application's own service role.",
                        btn("Export range", "secondary", "file", "sm"))
              + grid(4, kpi("Entries", "418,205", "since 01 June 2023", FOREST)
                     + kpi("This week", "1,284", "across 87 actors", FOREST)
                     + kpi("Prerequisite overrides", "63", "last 30 days", INC_FG, "12 advisers")
                     + kpi("Rejected sign-ins", "6", "last 30 days", FAIL_FG, "Unregistered emails"))
              + f'<div style="margin: 18px 0">{toolbar("Search actor, target or entity id", [("Action", "All actions", "200px"), ("Actor role", "All roles", "160px"), ("Date range", "Last 7 days", "180px")], btn("Filters", "secondary", "filter", "sm"))}</div>'
              + panel("Entries",
                      table(["Timestamp", "Actor", "Action", "Target", ""], [
                          audit("8 Sept 2026, 10:41:07", "Ramon Reyes", "RR", "Adviser",
                                "Prerequisite override", INC_FG, INC_BG,
                                "Attempt · CS 132 · Reyes, Paolo M.",
                                "CS 121 (strict) not satisfied · reason: “Concurrent enrolment approved by chair”",
                                "10.24.8.114"),
                          audit("8 Sept 2026, 10:12:55", "Teresa Alvarez", "TA", "Administrator",
                                "Profile created", PASS_FG, PASS_BG,
                                "Profile · b.tolentino@[university].edu.ph",
                                "Role: student · program BSCS · invitation sent",
                                "10.24.1.8"),
                          audit("8 Sept 2026, 09:40:31", "Teresa Alvarez", "TA", "Administrator",
                                "Term locked", NEU_FG, NEU_BG,
                                "SchoolTerm · AY 2024–2025, 2nd Semester",
                                "is_locked false → true · 3,410 attempts frozen",
                                "10.24.1.8"),
                          audit("8 Sept 2026, 02:00:04", "system", "SY", "Service role",
                                "Lapsed INC recompute", MUTED, CREAM_DP,
                                "Job · recomputeLapsedIncGwa",
                                "2 attempts lapsed · 2 cached GWAs invalidated · 1 delinquency flag raised",
                                "pg_cron"),
                          audit("7 Sept 2026, 16:22:18", "Josefina Ferrer", "JF", "Administrator",
                                "Course updated", INC_FG, INC_BG,
                                "Course · CS 111 Web Systems and Technologies",
                                "lab_hours 0 → 3 · lecture_hours 3 → 2 · units unchanged",
                                "10.24.1.19"),
                          audit("7 Sept 2026, 14:05:02", "Josefina Ferrer", "JF", "Administrator",
                                "Course discontinued", FAIL_FG, FAIL_BG,
                                "Course · MATH 30 Discrete Mathematics",
                                "status active → discontinued · 4 curriculum slots affected",
                                "10.24.1.19"),
                          audit("7 Sept 2026, 11:33:40", "Ramon Reyes", "RR", "Adviser",
                                "Equivalency decision", GOLD_DP, "#FBF0D6",
                                "EquivalencyDecision · Villanueva, Andrea M.",
                                "IT 101 (BSIT 2024–2025) → CS 101 slot (BSCS 2023–2024) · one-to-one",
                                "10.24.8.114"),
                          audit("6 Sept 2026, 15:19:27", "Ramon Reyes", "RR", "Adviser",
                                "Adviser reassignment", FOREST, CREAM_DP,
                                "AdviserAssignment · 3 students",
                                "R. Reyes → L. Mendez · effective 30 Sept 2026 · zero-gap verified",
                                "10.24.8.114"),
                          audit("6 Sept 2026, 11:48:12", "Teresa Alvarez", "TA", "Administrator",
                                "Curriculum published", PASS_FG, PASS_BG,
                                "CurriculumVersion · BSCS 2025–2026",
                                "158 units · 8 positional terms · threshold 12 · effective 01 June 2025",
                                "10.24.1.8"),
                          audit("5 Sept 2026, 08:02:44", "unknown", "??", "Rejected",
                                "Sign-in rejected", FAIL_FG, FAIL_BG,
                                "Auth hook · j.delacruz@gmail.com",
                                "No pre-registered profile matches this Google account · user row not created",
                                "121.58.x.x"),
                          audit("4 Sept 2026, 13:27:56", "Lourdes Mendez", "LM", "Adviser",
                                "Elective mapping", GOLD_DP, "#FBF0D6",
                                "ElectiveMapping · Domingo, Grace A.",
                                "PSYCH 10 (3.0, passed 2.00) → GE ELEC 2 slot · nominal 3.0 units",
                                "10.24.8.51"),
                          audit("4 Sept 2026, 09:14:03", "Ramon Reyes", "RR", "Adviser",
                                "INC resolved", PASS_FG, PASS_BG,
                                "INCResolution · Lim, Joshua T. · CS 111",
                                "Completion grade 2.25 recorded 11 days before the deadline",
                                "10.24.8.114"),
                      ], widths=["176px", "180px", "184px", "auto", "92px"],
                         align=["left", "left", "left", "left", "right"]),
                      actions=badge("12 of 418,205 shown", MUTED, CREAM_DP, dot=False))
              + f'<div style="margin-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); '
                f'gap: 18px">'
              + note("This viewer is read-only for every role, administrators included. There is no interface — "
                     "and no database grant — for editing or removing an entry.", "green", "shield")
              + note("Entries are retained for the period stated in the institution's records policy. Export a "
                     "date range before any scheduled purge.", "gold", "clock")
              + '</div>', h=1520)
write("AdminAudit", AUDIT)
print("admin artboards written")
