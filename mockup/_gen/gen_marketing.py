# -*- coding: utf-8 -*-
"""Public marketing site + authentication artboards.

The landing page follows the stellic.com composition — centered sections, a
full-bleed product shot under the hero, tab switchers, a logo wall, one giant
number, a trust-badge row and a newsletter footer. The palette is unchanged:
every colour still comes from the SAAIS tokens in base.py.

Every heading — landing and app alike — is Syne. Landing headings are set
inline via h(); the rest of the artboard set gets it through class="dsp" in
base.py. The SAAIS wordmark uses .dsp too, so it is Syne everywhere, this
nav included.
"""
from base import *

W = 1440
MAXW = 1200
R_CARD = "16px"
R_TILE = "12px"
R_PILL = "999px"


# ------------------------------------------------------------------ helpers
def wrap(inner, w=MAXW, extra=""):
    return f'<div style="max-width: {w}px; margin: 0 auto; {extra}">{inner}</div>'


def h(text, size, color=INK, mw=None, center=False, mt=None, lh="1.06",
      ls="-0.01em", weight="700", tag="h2"):
    """Syne display heading — the landing page's inline equivalent of class="dsp"."""
    st = (f"font-family: 'Syne', 'Segoe UI', system-ui, sans-serif; "
          f"font-weight: {weight}; font-size: {size}px; line-height: {lh}; "
          f"letter-spacing: {ls}; color: {color}")
    if mw:
        st += f"; max-width: {mw}ch"
    if center:
        st += "; margin-left: auto; margin-right: auto; text-align: center"
    if mt is not None:
        st += f"; margin-top: {mt}px"
    return f'<{tag} style="{st}">{text}</{tag}>'


def pill(label, kind="primary", size="md", icon=None, after=None):
    pad = {"lg": "15px 30px", "md": "11px 22px", "sm": "9px 18px"}[size]
    fs = {"lg": "16px", "md": "14.5px", "sm": "13.5px"}[size]
    isz = {"lg": 18, "md": 16, "sm": 15}[size]
    if kind == "gold":
        st, cls = f"background: {GOLD}; color: #3A2A05; border: 1px solid {GOLD}", "btnp"
    elif kind == "primary":
        st, cls = f"background: {FOREST}; color: {CREAM}; border: 1px solid {FOREST}", "btnp"
    elif kind == "onDark":
        st, cls = ("background: transparent; color: %s; border: 1px solid rgba(246,242,228,0.30)"
                   % CREAM), "btns"
    else:
        st, cls = f"background: {SURFACE}; color: {INK}; border: 1px solid {LINE}", "btns"
    pre = (ico(icon, isz) + " ") if icon else ""
    post = (" " + ico(after, isz)) if after else ""
    return (f'<button class="{cls}" style="display: inline-flex; align-items: center; gap: 8px; '
            f'padding: {pad}; border-radius: {R_PILL}; font-family: inherit; font-size: {fs}; '
            f'font-weight: 600; cursor: pointer; white-space: nowrap; {st}">{pre}{label}{post}</button>')


def sect(inner, bg=SURFACE, pad="112px 56px", extra=""):
    return f'<section style="padding: {pad}; background: {bg}; {extra}">{inner}</section>'


def sect_head(kick, title, sub=None, center=True, size=44, mw=26, subw=62,
              color=INK, subcolor=None, kickcolor=None):
    al = "center" if center else "left"
    mx = "margin-left: auto; margin-right: auto;" if center else ""
    out = f'<div style="text-align: {al}; {mx} max-width: 900px">'
    if kick:
        out += f'<div class="kick" style="color: {kickcolor or GOLD_DP}">{kick}</div>'
    out += h(title, size, color, mw=mw, center=center, mt=16 if kick else 0)
    if sub:
        out += (f'<p style="font-size: 17.5px; line-height: 1.6; color: {subcolor or MUTED}; '
                f'margin-top: 18px; max-width: {subw}ch; {mx}">{sub}</p>')
    return out + "</div>"


def link_arrow(label, color=FOREST):
    return (f'<div style="display: inline-flex; align-items: center; gap: 7px; font-size: 14.5px; '
            f'font-weight: 600; color: {color}">{label}{ico("right", 15, color)}</div>')


def aura_layer(bg, blend, blur):
    """One absolutely-positioned blend-mode layer of the hero's aura mesh.

    Composites against whatever solid colour is painted immediately behind it —
    here, the hero section's own FOREST_DP background. The layer itself carries
    no background-color of its own, only the radial gradient.
    """
    return (f'<div style="position: absolute; inset: 0; background: {bg}; '
            f'mix-blend-mode: {blend}; filter: blur({blur}px); transform: translateZ(0); '
            f'pointer-events: none" aria-hidden="true"></div>')


def icon_tile(name, size=64, bg=CREAM_DP, fg=FOREST, isz=28):
    return (f'<div style="width: {size}px; height: {size}px; border-radius: {R_TILE}; background: {bg}; '
            f'display: flex; align-items: center; justify-content: center; color: {fg}; '
            f'flex-shrink: 0">{ico(name, isz)}</div>')


def brandmark(color=INK, mark=36, fs=21):
    return (f'<div style="display: flex; align-items: center; gap: 10px">'
            f'<img src="logo-mark.png" alt="" style="width: {mark}px; height: {mark}px; '
            f'border-radius: 9px">'
            f'<span class="dsp" style="font-size: {fs}px; color: {color}; '
            f'letter-spacing: 0.005em">SAAIS</span></div>')


# ------------------------------------------------------------------ chrome
NAV_LEFT = ["Platform", "Portals", "Rules engine"]
NAV_RIGHT = ["Compliance", "Documentation"]


def site_nav(on_dark=False):
    fg = "rgba(246,242,228,0.82)" if on_dark else MUTED
    brand = CREAM if on_dark else INK
    border = "rgba(246,242,228,0.14)" if on_dark else LINE
    bg = "transparent" if on_dark else SURFACE

    def items(names):
        return "".join(
            f'<div style="display: flex; align-items: center; gap: 5px; font-size: 14.5px; '
            f'color: {fg}; font-weight: 450">{n}'
            f'{ico("down", 14, fg) if n in ("Platform", "Portals") else ""}</div>'
            for n in names)

    signin = (f'<div style="font-size: 14.5px; font-weight: 600; '
              f'color: {CREAM if on_dark else FOREST}">Sign in</div>')
    return (f'<header style="display: flex; align-items: center; justify-content: space-between; '
            f'gap: 32px; padding: 20px 56px; background: {bg}; border-bottom: 1px solid {border}">'
            f'<div style="display: flex; align-items: center; gap: 40px">{brandmark(brand)}'
            f'<nav style="display: flex; align-items: center; gap: 26px">{items(NAV_LEFT)}</nav></div>'
            f'<div style="display: flex; align-items: center; gap: 26px">{items(NAV_RIGHT)}{signin}'
            f'{pill("Request a walkthrough", "gold" if on_dark else "primary", "sm")}</div></header>')


# ------------------------------------------------------------------ hero
def wide_checklist():
    """The product shot that sits under the hero, full container width."""
    rows = [
        ("CS 101", "Introduction to Computing", "3.0", "AY 2024–2025 · 1st Sem", "passed", "1.25", None),
        ("MATH 21", "Calculus I", "5.0", "AY 2024–2025 · 1st Sem", "passed", "2.00", None),
        ("CS 121", "Data Structures", "3.0", "AY 2024–2025 · 2nd Sem", "inc", "INC", None),
        ("CS 121", "Data Structures — retake", "3.0", "AY 2025–2026 · 1st Sem", "passed", "1.75",
         "↳ grade_replacement · the earlier INC is superseded, not erased"),
        ("CS 132", "Algorithms", "3.0", "AY 2025–2026 · 1st Sem", "enrolled", "—",
         "↳ prerequisite override · approved by [adviser name]"),
        ("GE ELEC 2", "Open elective slot", "3.0", "AY 2025–2026 · 1st Sem", "passed", "1.75",
         "↳ elective mapping from PHILO 12 · 3.0 units earned"),
        ("STAT 101", "Statistics", "3.0", "Not yet taken", "open", "—", None),
    ]
    body = ""
    for c, t, u, term, s, g, prov in rows:
        note_line = (f'<div style="font-size: 11.5px; color: {GOLD_DP}; margin-top: 3px">{prov}</div>'
                     if prov else "")
        body += (f'<div class="row" style="display: grid; '
                 f'grid-template-columns: 112px minmax(0, 1fr) 56px 210px 132px 64px; gap: 14px; '
                 f'align-items: center; padding: 13px 26px; border-bottom: 1px solid {LINE_SF}">'
                 f'{code(c)}<div><div style="font-size: 13.5px">{t}</div>{note_line}</div>'
                 f'<div style="font-size: 12.5px; color: {MUTED_2}">{u}</div>'
                 f'<div style="font-size: 12.5px; color: {MUTED_2}">{term}</div>{status(s)}'
                 f'<div class="mono" style="font-size: 13.5px; text-align: right; '
                 f'font-weight: 500">{g}</div></div>')
    head = (f'<div style="display: flex; align-items: center; justify-content: space-between; '
            f'gap: 20px; padding: 20px 26px; border-bottom: 1px solid {LINE}; background: {CREAM}">'
            f'<div><div style="font-size: 15px; font-weight: 600">Curriculum checklist · Year 2, '
            f'First Semester</div>'
            f'<div style="font-size: 12.5px; color: {MUTED_2}; margin-top: 2px">'
            f'[Student name] · BS Computer Science · Curriculum version 2023–2024</div></div>'
            f'<div style="display: flex; align-items: center; gap: 10px">'
            f'{badge("Adviser assigned", FOREST, CREAM_DP, dot=False)}'
            f'{badge("12 of 18 units earned", FOREST, CREAM_DP, dot=False)}</div></div>')
    foot = (f'<div style="display: flex; align-items: center; justify-content: space-between; '
            f'gap: 24px; padding: 18px 26px; background: {CREAM}">'
            f'<div style="font-size: 12.5px; color: {MUTED}; max-width: 62ch">Every filled slot carries '
            f'its provenance — a direct attempt, an equivalency decision, or an elective mapping — and '
            f'the name of whoever approved it.</div>'
            f'<div style="display: flex; align-items: center; gap: 30px">'
            f'<div><div class="kick" style="color: {MUTED_2}">Term GWA</div>'
            f'{h("1.58", 22, FOREST, mt=4, tag="div")}</div>'
            f'<div><div class="kick" style="color: {MUTED_2}">Cumulative GWA</div>'
            f'{h("1.68", 22, FOREST, mt=4, tag="div")}</div></div></div>')
    return (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: {R_CARD}; '
            f'box-shadow: 0 40px 90px rgba(15,26,6,0.30); overflow: hidden">{head}{body}{foot}</div>')


def hero():
    marks = "".join(
        f'<div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; '
        f'color: rgba(246,242,228,0.68)">{ico(i, 16, GOLD)}{t}</div>'
        for i, t in [("shield", "RA 10173 aligned"), ("check", "WCAG 2.1 AA"),
                     ("lock", "Row-level security"), ("file", "Immutable audit trail")])
    # Aura mesh — four blend-mode layers on the hero's own FOREST_DP ground, recoloured
    # from the SAAIS token set (forest greens carry the mass, gold stays rationed to one
    # small corner layer). Corner-anchored so the copy's centre stays close to flat FOREST_DP.
    aura = (
        '<div style="position: absolute; inset: 0; overflow: hidden; pointer-events: none" '
        'aria-hidden="true">'
        + aura_layer('radial-gradient(circle at 24% 18%, rgba(74,107,34,0.55) 0%, '
                     'transparent 45%)', 'screen', 260)      # FOREST_SF
        + aura_layer('radial-gradient(circle at 78% 14%, rgba(47,74,18,0.45) 0%, '
                     'transparent 42%)', 'screen', 260)      # FOREST
        + aura_layer('radial-gradient(circle at 40% 78%, rgba(246,226,174,0.18) 0%, '
                     'transparent 50%)', 'screen', 252)      # GOLD_SF, pale
        + aura_layer('radial-gradient(circle at 88% 88%, rgba(224,168,46,0.22) 0%, '
                     'transparent 32%)', 'overlay', 198)     # GOLD, rationed
        + '</div>')
    copy = (f'<div style="text-align: center">'
            f'<div class="kick" style="color: {GOLD}">Student Academic Advising Information System</div>'
            f'{h("Advising that leaves a record.", 64, CREAM, mw=17, center=True, mt=22, tag="h1")}'
            f'<p style="font-size: 19px; line-height: 1.6; color: rgba(246,242,228,0.78); '
            f'margin: 24px auto 0; max-width: 60ch">SAAIS replaces the spreadsheet-and-photocopy '
            f'advising file with one system of record: every checklist slot, every retake, every '
            f'prerequisite override, and who approved it.</p>'
            f'<div style="display: flex; gap: 14px; margin-top: 36px; justify-content: center">'
            f'{pill("Request a walkthrough", "gold", "lg")}'
            f'{pill("Read the API contract", "onDark", "lg", after="out")}</div>'
            f'<div style="display: flex; flex-wrap: wrap; gap: 14px 34px; margin-top: 40px; '
            f'justify-content: center">{marks}</div></div>')
    shot = (f'<div style="position: relative; z-index: 2; margin-top: 64px; margin-bottom: -190px">'
            f'{wide_checklist()}</div>')
    return (f'<section style="background: {FOREST_DP}; padding: 104px 56px 0; position: relative; '
            f'overflow: visible">{aura}'
            f'<div style="position: relative; z-index: 1">{wrap(copy + shot)}</div></section>')


# ------------------------------------------------------------------ sections
def audiences():
    cards = [
        ("user", "For students",
         "Open the checklist you were handed on paper — but current. See which slots are filled, "
         "which retake counts, and what the lapsed INC does to your GWA before the term ends.",
         ["Curriculum checklist with live slot status",
          "Term and cumulative GWA, unit-weighted",
          "Full attempt history across retakes",
          "Your assigned adviser, always current"]),
        ("users", "For advisers",
         "Record the attempt, see the prerequisite warning, and decide — with the override written "
         "to an audit entry that nobody can quietly edit later.",
         ["Advisee roster with delinquency and INC alerts",
          "Soft prerequisite check with Continue / Cancel",
          "Elective mapping and transfer equivalency",
          "Dated, append-only advising notes"]),
        ("cog", "For administrators",
         "Own the catalog: programs, versioned curricula, prerequisite links, repeatable rules, "
         "term locks — and read the audit log the registrar will ask you for.",
         ["Provision accounts; no public sign-up",
          "Versioned curricula with delinquency thresholds",
          "School terms, offerings, by-request flags",
          "Read-only immutable audit viewer"]),
    ]
    out = ""
    for icon, title, body, bullets in cards:
        bl = "".join(
            f'<li style="display: flex; align-items: flex-start; gap: 9px; font-size: 13.5px; '
            f'color: {MUTED}; padding: 9px 0; border-top: 1px solid {LINE_SF}">'
            f'{ico("check", 15, FOREST_SF)}<span>{b}</span></li>' for b in bullets)
        out += (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; '
                f'border-radius: {R_CARD}; padding: 34px 32px; display: flex; flex-direction: column">'
                f'{icon_tile(icon)}{h(title, 24, INK, mt=22)}'
                f'<p style="font-size: 14.5px; color: {MUTED}; line-height: 1.62; margin-top: 12px; '
                f'flex-grow: 1">{body}</p>'
                f'<ul style="list-style: none; padding: 0; margin: 22px 0 0">{bl}</ul></div>')
    return sect(
        wrap(sect_head("Three portals, one record",
                       "One advising file, read three different ways.",
                       "Row-level security decides what each role can see. Advising notes and attempt "
                       "remarks never reach a student session — not by convention, by policy in the "
                       "database.")
             + f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); '
               f'gap: 26px; margin-top: 52px">{out}</div>'),
        CREAM, pad="248px 56px 112px")


def platform_statement():
    return sect(
        wrap(f'<div style="text-align: center">'
             f'<img src="logo-mark.png" alt="" style="width: 72px; height: 72px; border-radius: 18px">'
             f'{h("SAAIS keeps the whole advising office working from one file — so a student is never "
                  "told two different things about the same requirement, and no decision has to be "
                  "reconstructed from memory.", 30, INK, mw=52, center=True, mt=30, lh="1.28", ls="-0.02em")}'
             f'</div>', w=980),
        SURFACE, pad="112px 56px 72px")


def feature_tabs():
    tabs = [("Checklist", True), ("Rules engine", False), ("Audit trail", False)]
    tb = ""
    for label, on in tabs:
        col = INK if on else MUTED_2
        bar = (f'border-bottom: 2px solid {GOLD}' if on else 'border-bottom: 2px solid transparent')
        tb += (f'<div style="padding: 12px 26px 13px; font-size: 15px; '
               f'font-weight: {"600" if on else "450"}; color: {col}; {bar}">{label}</div>')
    bullets = [("Versioned curricula",
                "Students stay bound to the curriculum version they entered under."),
               ("Positional vs. calendar terms",
                "Year 1 / Term 1 is a slot; AY 2025–2026 1st Sem is a date."),
               ("Provenance on every slot",
                "A filled slot names what filled it — attempt, equivalency or elective mapping — "
                "and who approved it.")]
    bl = "".join(
        f'<div style="display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; '
        f'border-top: 1px solid {LINE}">'
        f'<div style="color: {GOLD_DP}; margin-top: 1px">{ico("check", 17)}</div>'
        f'<div><div style="font-size: 14.5px; font-weight: 600">{a}</div>'
        f'<div style="font-size: 13.5px; color: {MUTED}; margin-top: 3px; line-height: 1.55">{b}</div>'
        f'</div></div>' for a, b in bullets)
    left = (f'<div>{h("The checklist resolves itself.", 34, INK, mw=20)}'
            f'<p style="font-size: 16px; color: {MUTED}; line-height: 1.65; margin-top: 14px">'
            f'A slot is satisfied by a direct attempt, an equivalency decision, a discontinued-course '
            f'equivalency, or an elective mapping. The checklist shows which — not just a tick.</p>'
            f'<div style="margin-top: 24px">{bl}</div>'
            f'<div style="margin-top: 26px">{link_arrow("Learn about the checklist")}</div></div>')
    return sect(
        wrap(sect_head(None, "Confidence and clarity for the whole advising office, in one record.",
                       size=40, mw=30)
             + f'<div style="display: flex; align-items: center; justify-content: center; gap: 8px; '
               f'margin-top: 40px; border-bottom: 1px solid {LINE}">{tb}</div>'
             + f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); '
               f'gap: 64px; align-items: center; margin-top: 52px">{left}{visual_gwa()}</div>'),
        SURFACE, pad="0 56px 112px")


def visual_gwa():
    rows = [("CS 121", "Data Structures", "3.0", "INC", "inc"),
            ("CS 121", "Data Structures — retake", "3.0", "1.75", "passed"),
            ("PE 3", "Team Sports", "2.0", "5.00", "failed"),
            ("STAT 101", "Statistics", "3.0", "INC lapsed", "lapsed")]
    body = ""
    for c, t, u, g, s in rows:
        counts = "counts" if s in ("passed", "lapsed", "failed") else "superseded"
        body += (f'<div style="display: grid; grid-template-columns: 88px minmax(0, 1fr) 40px 120px 92px; '
                 f'gap: 8px; align-items: center; padding: 13px 20px; '
                 f'border-bottom: 1px solid {LINE_SF}">'
                 f'{code(c)}<div style="font-size: 13px">{t}</div>'
                 f'<div style="font-size: 12.5px; color: {MUTED_2}">{u}</div>{status(s, g)}'
                 f'<div style="font-size: 11.5px; color: {MUTED_2}; text-align: right">{counts}</div>'
                 f'</div>')
    return (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: {R_CARD}; '
            f'overflow: hidden; box-shadow: 0 18px 44px rgba(15,26,6,0.08)">'
            f'<div style="padding: 18px 20px; border-bottom: 1px solid {LINE}; background: {CREAM}; '
            f'font-size: 13.5px; font-weight: 600">How the engine counts an attempt</div>{body}'
            f'<div style="padding: 18px 20px; display: flex; align-items: center; '
            f'justify-content: space-between; background: {CREAM_DP}">'
            f'<div style="font-size: 12.5px; color: {MUTED}; max-width: 60%">Lapsed INC is never '
            f'rewritten to failed — it is evaluated as 5.00 for GWA and delinquency only.</div>'
            f'<div style="text-align: right"><div class="kick" style="color: {MUTED_2}">Cumulative '
            f'GWA</div>{h("2.14", 26, FOREST, mt=4, tag="div")}</div></div></div>')


def visual_override():
    return (f'<div style="background: {SURFACE}; border-radius: {R_CARD}; overflow: hidden; '
            f'box-shadow: 0 24px 60px rgba(15,26,6,0.28)">'
            f'<div style="padding: 26px 28px; border-bottom: 1px solid {LINE}">'
            f'<div style="display: flex; align-items: center; gap: 10px; color: {INC_FG}">'
            f'{ico("alert", 20)}{h("Prerequisite not satisfied", 20, INK, tag="div")}</div>'
            f'<p style="font-size: 14px; color: {MUTED}; margin-top: 12px; line-height: 1.6; '
            f'max-width: 74ch"><b>[Student name]</b> has not passed {code("CS 121 Data Structures")}, '
            f'a strict prerequisite of {code("CS 132 Algorithms")}. Continuing records the attempt '
            f'with <b>prerequisite_override = true</b> and writes an audit entry under your name.</p>'
            f'</div>'
            f'<div style="padding: 16px 28px; background: {CREAM}; display: flex; align-items: center; '
            f'justify-content: space-between; gap: 20px">'
            f'<div style="font-size: 12.5px; color: {MUTED_2}">Audited · '
            f'[adviser]@[institution].edu.ph</div>'
            f'<div style="display: flex; gap: 10px">{pill("Cancel", "secondary", "sm")}'
            f'{pill("Continue with override", "gold", "sm")}</div></div></div>')


def integration_band():
    frame = (f'<div style="background: {FOREST_DP}; border-radius: 22px; padding: 56px; '
             f'margin-top: 48px; position: relative; overflow: hidden">'
             f'<div style="position: absolute; right: -160px; bottom: -200px; width: 560px; '
             f'height: 560px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, '
             f'rgba(224,168,46,0.16), rgba(224,168,46,0) 64%)"></div>'
             f'<div style="position: relative; max-width: 900px; margin: 0 auto">'
             f'{visual_override()}</div></div>')
    return sect(
        wrap(sect_head("The prerequisite engine",
                       "Warn the adviser. Never block the judgement.",
                       "Strict prerequisites are checked at enrollment, but SAAIS is a soft-check "
                       "system: the adviser may continue, and the continuation is the thing that "
                       "gets recorded.", size=40)
             + frame
             + f'<div style="display: flex; justify-content: center; margin-top: 34px">'
               f'{link_arrow("Explore the three portals")}</div>'),
        CREAM)


def testimonial():
    return sect(
        wrap(f'<div style="text-align: center">'
             f'<div style="color: {GOLD}; font-family: Georgia, \'Times New Roman\', serif; font-size: 64px; '
             f'line-height: 0.5; height: 32px">&ldquo;</div>'
             f'{h("[Placeholder quote — replace with a real pilot adviser.] The override dialog "
                  "changed the conversation. We stopped arguing about whether a student was allowed "
                  "in, and started reading who decided and why.", 30, INK, mw=52, center=True, mt=0,
                  lh="1.36", ls="-0.02em", weight="500", tag="blockquote")}'
             f'<div style="display: flex; align-items: center; justify-content: center; gap: 14px; '
             f'margin-top: 32px">{avatar("RC", 46, CREAM_DP, FOREST)}'
             f'<div style="text-align: left">'
             f'<div style="font-size: 14.5px; font-weight: 600">[Adviser name]</div>'
             f'<div style="font-size: 13px; color: {MUTED_2}">[Title] · [Department], '
             f'[Partner University]</div></div></div>'
             f'<p style="font-size: 12.5px; color: {MUTED_2}; margin-top: 30px">Unattributed by '
             f'design. SAAIS has no pilot results to quote yet, and will not invent any.</p></div>',
             w=900),
        SURFACE, pad="104px 56px")


def trust_badges():
    items = [
        ("shield", "Aligned to RA 10173",
         "Grades, enrollment records and advising notes are treated as sensitive personal "
         "information under the Philippine Data Privacy Act."),
        ("check", "Built to WCAG 2.1 AA",
         "Status is never colour alone; every badge carries a label and a shape. Full keyboard "
         "paths, including the override dialog. Audited in Phase 4."),
        ("lock", "Row-level security, append-only audit",
         "Role boundaries live in the database, not in application discipline. The audit table "
         "rejects UPDATE and DELETE outright."),
    ]
    out = ""
    for i, t, b in items:
        out += (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; '
                f'border-radius: {R_CARD}; padding: 30px 28px">'
                f'{icon_tile(i, 52, CREAM_DP, FOREST, 24)}{h(t, 18, INK, mt=20, lh="1.3", ls="-0.02em")}'
                f'<p style="font-size: 13.5px; color: {MUTED}; line-height: 1.62; '
                f'margin-top: 10px">{b}</p></div>')
    return sect(
        wrap(f'<div class="kick" style="color: {MUTED_2}; text-align: center">What the build '
             f'commits to</div>'
             f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); '
             f'gap: 22px; margin-top: 30px">{out}</div>'),
        CREAM_DP, pad="86px 56px")


def big_number():
    minor = [("1.00–5.00", "grading scale, in discrete 0.25 steps"),
             ("5", "workflow phases from catalog to audit"),
             ("0", "gaps allowed in adviser continuity")]
    out = "".join(
        f'<div style="text-align: center; padding: 0 20px">'
        f'{h(v, 34, CREAM, center=True, tag="div")}'
        f'<div style="font-size: 13.5px; color: rgba(246,242,228,0.62); margin: 10px auto 0; '
        f'max-width: 24ch; line-height: 1.5">{l}</div></div>' for v, l in minor)
    return sect(
        wrap(f'<div style="text-align: center">'
             f'{h("18", 104, CREAM, center=True, lh="1", tag="div")}'
             f'<p style="font-size: 18px; color: rgba(246,242,228,0.78); margin: 18px auto 0; '
             f'max-width: 42ch">core entities modelled in the advising schema — the whole advising '
             f'record, not a subset of it</p></div>'
             f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); '
             f'gap: 30px; margin-top: 60px; padding-top: 44px; '
             f'border-top: 1px solid rgba(246,242,228,0.16)">{out}</div>'),
        FOREST, pad="100px 56px")


def lifecycle_tabs():
    steps = [
        ("Provision", False, "Admin creates the profile and role. Google sign-in is rejected "
         "server-side unless the email is pre-registered.", []),
        ("Advise", False, "The adviser opens the advisee's 360 view: checklist, grades, history, "
         "staff-only notes.", []),
        ("Record", True, "An attempt is bound to a course offering. Strict prerequisites soft-check; "
         "the adviser may continue, and the continuation is what gets written.",
         [("attempt", "one row, bound to an offering in an unlocked school term"),
          ("prerequisite_override", "set true only when the adviser continues past the warning"),
          ("audit entry", "written in the same transaction, under the adviser's name")]),
        ("Resolve", False, "INC resolutions, elective mappings and equivalency decisions land as "
         "their own auditable rows.", []),
        ("Audit", False, "The registrar reads an append-only log the application itself cannot "
         "update or delete.", []),
    ]
    tb = ""
    for n, on, _b, _w in steps:
        if on:
            st = f"background: {FOREST}; color: {CREAM}; border: 1px solid {FOREST}"
        else:
            st = f"background: {SURFACE}; color: {MUTED}; border: 1px solid {LINE}"
        tb += (f'<div style="padding: 10px 22px; border-radius: {R_PILL}; font-size: 14px; '
               f'font-weight: 600; {st}">{n}</div>')
    active = next(s for s in steps if s[1])
    idx = steps.index(active) + 1
    writes = "".join(
        f'<div style="display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 16px; '
        f'align-items: baseline; padding: 13px 0; border-top: 1px solid {LINE_SF}">'
        f'{code(a)}<div style="font-size: 13.5px; color: {MUTED}; line-height: 1.55">{b}</div></div>'
        for a, b in active[3])
    panel = (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: {R_CARD}; '
             f'padding: 40px; margin-top: 36px; display: grid; '
             f'grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 56px; '
             f'align-items: start">'
             f'<div><div style="display: flex; align-items: center; gap: 12px">'
             f'<div style="width: 30px; height: 30px; border-radius: 50%; background: {FOREST}; '
             f'color: {CREAM}; display: flex; align-items: center; justify-content: center; '
             f'font-size: 13px; font-weight: 600">{idx}</div>'
             f'<div class="kick" style="color: {MUTED_2}">Step {idx} of 5</div></div>'
             f'{h(active[0], 30, INK, mt=18)}'
             f'<p style="font-size: 15.5px; color: {MUTED}; line-height: 1.65; '
             f'margin-top: 12px">{active[2]}</p></div>'
             f'<div><div class="kick" style="color: {MUTED_2}">What this step writes</div>'
             f'<div style="margin-top: 12px">{writes}</div></div></div>')
    return sect(
        wrap(sect_head(None, "From a name on a list to a signed audit entry.", size=40, mw=26)
             + f'<div style="display: flex; align-items: center; justify-content: center; gap: 10px; '
               f'flex-wrap: wrap; margin-top: 40px">{tb}</div>' + panel),
        CREAM)


def rules_grid():
    rules = [
        ("layers", "Repeatable types",
         "grade_replacement keeps only the most recent passed attempt; additional_credit stacks "
         "every pass. A later failure never reverts a course already passed."),
        ("clock", "Lapsed INC recompute",
         "A daily pg_cron job re-evaluates INCs past their one-year deadline, so a GWA changes with "
         "the calendar even when no row was edited."),
        ("swap", "Zero-gap reassignment",
         "The incoming assignment starts the day the outgoing one ends — enforced in one transaction "
         "and backstopped by a database constraint."),
        ("node", "Elective mapping",
         "An adviser maps a real enrolled course into an open elective slot. The checklist shows "
         "actual units earned against the nominal slot."),
        ("check", "Transfer equivalency",
         "One-to-one decisions let a passed course from the old curriculum satisfy a destination "
         "slot without re-triggering a GWA recompute."),
        ("lock", "Term locks & by-request",
         "Locked school terms refuse new attempts; by-request offerings stay visible to advisers "
         "without appearing as scheduled sections."),
    ]
    out = ""
    for i, t, b in rules:
        out += (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; '
                f'border-radius: {R_CARD}; padding: 28px">'
                f'<div style="display: flex; align-items: center; gap: 11px; color: {FOREST}">'
                f'{ico(i, 20)}{h(t, 17, INK, lh="1.3", ls="-0.02em", tag="h3")}</div>'
                f'<p style="font-size: 13.5px; color: {MUTED}; line-height: 1.65; '
                f'margin-top: 12px">{b}</p></div>')
    return sect(
        wrap(sect_head("The rules engine",
                       "Every exception the registrar argues about, written down once.",
                       "These are not settings buried in a form. Each rule is a documented operation "
                       "in the OpenAPI contract and a constraint in the database.")
             + f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); '
               f'gap: 22px; margin-top: 48px">{out}</div>'),
        SURFACE)


def phases():
    ph = [("Phase 1", "Foundation & data engine", "Contract, schema, RLS, admin catalog", True),
          ("Phase 2", "Advising & checklists", "Assignments, attempts, GWA, portals", True),
          ("Phase 3", "Exceptions & rules", "INC lapse, electives, equivalencies, notes", True),
          ("Phase 4", "Audit & compliance", "Audit viewer, PDF exports, WCAG, E2E", False),
          ("Phase 5", "Enhancements", "Prerequisite DAG, what-if simulator, AI assistant", False)]
    out = ""
    for k, t, b, done in ph:
        chip = badge("Built", PASS_FG, PASS_BG) if done else badge("Planned", NEU_FG, NEU_BG)
        out += (f'<div style="background: {SURFACE}; border: 1px solid {LINE}; '
                f'border-radius: {R_CARD}; padding: 26px 24px; '
                f'border-top: 3px solid {FOREST if done else LINE}">'
                f'<div style="display: flex; align-items: center; justify-content: space-between">'
                f'<div class="kick" style="color: {MUTED_2}">{k}</div>{chip}</div>'
                f'{h(t, 17, INK, mt=14, lh="1.3", ls="-0.02em", tag="h3")}'
                f'<p style="font-size: 13px; color: {MUTED}; margin-top: 8px; '
                f'line-height: 1.58">{b}</p></div>')
    return sect(
        wrap(sect_head("Roadmap", "Delivered in five phases, not one big launch.",
                       "Phases 1 to 3 are built in the specification and the mockup set. Phases 4 "
                       "and 5 are planned, and are drawn as planned — nothing here is deployed.",
                       size=40)
             + f'<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); '
               f'gap: 18px; margin-top: 48px">{out}</div>'),
        CREAM)


def cta_band():
    glow = ('<div style="position: absolute; inset: 0; overflow: hidden; pointer-events: none">'
            '<div style="position: absolute; left: 50%; top: -300px; margin-left: -450px; '
            'width: 900px; height: 900px; border-radius: 50%; background: radial-gradient('
            'circle at 50% 50%, rgba(224,168,46,0.16), rgba(224,168,46,0) 62%)"></div></div>')
    return sect(
        glow + wrap(f'<div style="position: relative; text-align: center">'
                    f'{h("A record your registrar can read starts here.", 48, CREAM, mw=24, center=True, tag="h2")}'
                    f'<p style="font-size: 17.5px; color: rgba(246,242,228,0.72); '
                    f'margin: 20px auto 0; max-width: 58ch">Bring a curriculum version and a '
                    f'de-identified student history to a 45-minute session with your registrar and '
                    f'one adviser. You will see the checklist it produces and the audit entries it '
                    f'writes.</p>'
                    f'<div style="display: flex; justify-content: center; margin-top: 34px">'
                    f'{pill("Request a walkthrough", "gold", "lg")}</div>'
                    f'<div style="font-size: 13px; color: rgba(246,242,228,0.55); margin-top: 16px">'
                    f'[advising@your-institution.edu.ph]</div></div>'),
        FOREST_DP, pad="128px 56px", extra="position: relative; overflow: hidden")


def footer():
    cols = [("Platform", ["Curriculum checklists", "GWA engine", "Rules engine", "Audit trail",
                          "Exports"]),
            ("Portals", ["Student", "Adviser", "Administrator", "API documentation"]),
            ("Compliance", ["Data Privacy Act (RA 10173)", "WCAG 2.1 AA", "Security model",
                            "Data retention"]),
            ("Project", ["About the team", "Release notes", "Open questions", "Contact"])]
    out = ""
    for t, links in cols:
        li = "".join(f'<div style="font-size: 13.5px; color: rgba(246,242,228,0.62); '
                     f'padding: 5px 0">{l}</div>' for l in links)
        out += (f'<div><div class="kick" style="color: {GOLD}">{t}</div>'
                f'<div style="margin-top: 14px">{li}</div></div>')
    brand = (f'<div>{brandmark(CREAM, 34, 20)}'
             f'<p style="font-size: 13px; color: rgba(246,242,228,0.55); line-height: 1.62; '
             f'margin-top: 14px">Student Academic Advising Information System. Built for '
             f'institutions that must be able to explain every decision in a student\'s file.</p>'
             f'<div style="display: flex; gap: 10px; margin-top: 20px">'
             + "".join(
                 f'<div style="width: 34px; height: 34px; border-radius: 50%; '
                 f'border: 1px solid rgba(246,242,228,0.16); display: flex; align-items: center; '
                 f'justify-content: center; color: rgba(246,242,228,0.62)">{ico(i, 16)}</div>'
                 for i in ("mail", "file", "out"))
             + f'</div></div>')
    news = (f'<div style="max-width: 460px"><div class="kick" style="color: {GOLD}">Release notes</div>'
            f'<p style="font-size: 13px; color: rgba(246,242,228,0.62); line-height: 1.6; '
            f'margin-top: 14px">Get the phase notes when they are published. Specification '
            f'changes only — no marketing.</p>'
            f'<div style="display: flex; gap: 8px; margin-top: 16px">'
            f'<div style="flex-grow: 1; background: rgba(246,242,228,0.06); '
            f'border: 1px solid rgba(246,242,228,0.16); border-radius: {R_PILL}; padding: 9px 16px; '
            f'font-size: 13.5px; color: rgba(246,242,228,0.45)">you@[institution].edu.ph</div>'
            f'{pill("Sign up", "gold", "sm")}</div>'
            f'<div style="font-size: 12px; color: rgba(246,242,228,0.45); line-height: 1.55; '
            f'margin-top: 16px">Looking for your institution\'s sign-in? Accounts are provisioned '
            f'by an administrator — ask your adviser for the link.</div></div>')
    return (f'<footer style="background: #16230A; padding: 76px 56px 34px">'
            + wrap(f'<div style="display: grid; grid-template-columns: 290px repeat(4, minmax(0, 1fr)); '
                   f'gap: 44px">{brand}{out}</div>'
                   f'<div style="margin-top: 52px; padding-top: 34px; '
                   f'border-top: 1px solid rgba(246,242,228,0.12); display: grid; '
                   f'grid-template-columns: 290px minmax(0, 1fr); gap: 44px">'
                   f'<div></div>{news}</div>'
                   f'<div style="display: flex; align-items: center; justify-content: space-between; '
                   f'gap: 20px; margin-top: 44px; padding-top: 24px; '
                   f'border-top: 1px solid rgba(246,242,228,0.12); font-size: 12.5px; '
                   f'color: rgba(246,242,228,0.45)">'
                   f'<div>© 2026 SAAIS Project Team · [Institution]. All rights reserved.</div>'
                   f'<div style="display: flex; gap: 24px"><span>Privacy notice</span>'
                   f'<span>Data retention</span><span>Accessibility statement</span>'
                   f'<span>Status</span></div></div>')
            + '</footer>')


LANDING = (site_nav() + hero() + audiences() + platform_statement()
           + feature_tabs() + integration_band() + testimonial() + trust_badges()
           + big_number() + lifecycle_tabs() + rules_grid() + phases() + cta_band() + footer())

write("Main", '<div style="background: #16230A">' + LANDING + '</div>')


# ------------------------------------------------------------------ auth
def auth_shell(right_inner, quote_kick="Signing in", h=980):
    marks = "".join(
        f'<div style="display: flex; align-items: center; gap: 9px; font-size: 13px; '
        f'color: rgba(246,242,228,0.62)">{ico(i, 16, GOLD)}{t}</div>'
        for i, t in [("shield", "Accounts are provisioned by an administrator — there is no public sign-up."),
                     ("lock", "Google sign-in is matched against the pre-registered profile server-side."),
                     ("file", "Every sign-in and role change is written to the audit log.")])
    left = (f'<div style="width: 620px; flex-shrink: 0; background: {FOREST_DP}; padding: 56px 52px; '
            f'display: flex; flex-direction: column; position: relative; overflow: hidden">'
            f'<div style="position: absolute; left: -140px; bottom: -180px; width: 520px; height: 520px; '
            f'border-radius: 50%; background: radial-gradient(circle at 40% 40%, rgba(224,168,46,0.16), '
            f'rgba(224,168,46,0) 65%)"></div>'
            f'<div style="position: relative; display: flex; align-items: center; gap: 11px">'
            f'<img src="logo-mark.png" alt="" style="width: 40px; height: 40px; border-radius: 10px">'
            f'<span class="dsp" style="font-size: 23px; color: {CREAM}">SAAIS</span></div>'
            f'<div style="flex-grow: 1"></div>'
            f'<div style="position: relative"><div class="kick" style="color: {GOLD}">{quote_kick}</div>'
            f'<h2 class="dsp" style="font-size: 38px; color: {CREAM}; margin-top: 16px; max-width: 16ch">'
            f'The advising file, exactly as your role may see it.</h2>'
            f'<div style="display: flex; flex-direction: column; gap: 13px; margin-top: 30px; '
            f'padding-top: 24px; border-top: 1px solid rgba(246,242,228,0.14)">{marks}</div></div>'
            f'<div style="flex-grow: 1"></div>'
            f'<div style="position: relative; font-size: 12px; color: rgba(246,242,228,0.4)">'
            f'© 2026 SAAIS · [Institution] · Data Privacy Act (RA 10173)</div></div>')
    return (f'<div style="display: flex; min-height: {h}px; background: {CREAM}">{left}'
            f'<div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; '
            f'padding: 56px">{right_inner}</div></div>')


def login_form():
    return (f'<div style="width: 420px">'
            f'<h1 class="dsp" style="font-size: 32px">Sign in</h1>'
            f'<p style="font-size: 14.5px; color: {MUTED}; margin-top: 8px">Use your institutional account. '
            f'If your email is not registered, ask your department administrator to provision it.</p>'
            f'<div class="btns" style="display: flex; align-items: center; justify-content: center; gap: 11px; '
            f'margin-top: 28px; padding: 12px; background: {SURFACE}; border: 1px solid {LINE}; '
            f'border-radius: 5px; font-size: 14.5px; font-weight: 600">'
            f'{ico_fill("google", 18, "#5F6368")}Continue with Google</div>'
            f'<div style="display: flex; align-items: center; gap: 14px; margin: 22px 0; color: {MUTED_2}; '
            f'font-size: 12px">'
            f'<div style="flex-grow: 1; height: 1px; background: {LINE}"></div>OR'
            f'<div style="flex-grow: 1; height: 1px; background: {LINE}"></div></div>'
            f'<div style="display: flex; flex-direction: column; gap: 16px">'
            f'{field("Institutional email", "maria.bautista@[university].edu.ph")}'
            f'{field("Password", "••••••••••••")}'
            f'<div style="display: flex; align-items: center; justify-content: space-between">'
            f'<div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: {MUTED}">'
            f'<div style="width: 15px; height: 15px; border: 1px solid {LINE}; border-radius: 3px; '
            f'background: {SURFACE}"></div>Keep me signed in</div>'
            f'<a href="#" style="font-size: 13.5px; font-weight: 600">Forgot password?</a></div>'
            f'<div style="margin-top: 4px">'
            f'<button class="btnp" style="width: 100%; padding: 12px; background: {FOREST}; color: {CREAM}; '
            f'border: none; border-radius: 5px; font-family: inherit; font-size: 15px; font-weight: 600; '
            f'cursor: pointer">Sign in</button></div></div>'
            f'<div style="margin-top: 24px">'
            f'{note("Sign-in was rejected: <b>j.delacruz@gmail.com</b> is not a registered institutional profile. Contact an administrator.", "red", "alert")}</div>'
            f'<p style="font-size: 12.5px; color: {MUTED_2}; margin-top: 22px; line-height: 1.55">'
            f'By signing in you accept that your academic records are processed under the institution\'s '
            f'privacy notice. <a href="#">Read the notice</a></p></div>')


write("Login", auth_shell(login_form(), "Signing in"))


def invite_form():
    steps = ""
    for i, (t, on) in enumerate([("Invitation verified", True), ("Set your password", True),
                                 ("Review your profile", False)], 1):
        col = FOREST if on else LINE
        fg = CREAM if on else MUTED_2
        steps += (f'<div style="display: flex; align-items: center; gap: 10px; flex-grow: 1">'
                  f'<div style="width: 24px; height: 24px; border-radius: 50%; background: {col}; color: {fg}; '
                  f'display: flex; align-items: center; justify-content: center; font-size: 12px; '
                  f'font-weight: 600">{i}</div>'
                  f'<div style="font-size: 13px; color: {INK if on else MUTED_2}; font-weight: '
                  f'{"600" if on else "450"}">{t}</div>'
                  f'{"" if i == 3 else f2}</div>')
    return (f'<div style="width: 460px">'
            f'<div class="kick" style="color: {GOLD_DP}">Invitation · expires in 6 days</div>'
            f'<h1 class="dsp" style="font-size: 32px; margin-top: 10px">Set your password</h1>'
            f'<p style="font-size: 14.5px; color: {MUTED}; margin-top: 8px">You were invited as an '
            f'<b>Academic Adviser</b> for the [College of Computer Studies].</p>'
            f'<div style="display: flex; align-items: center; margin: 26px 0 24px">{steps}</div>'
            f'<div style="display: flex; flex-direction: column; gap: 16px">'
            f'{field("Institutional email", "r.reyes@[university].edu.ph", "Fixed by the invitation — contact an administrator to change it.", disabled=True)}'
            f'{field("New password", "••••••••••••••")}'
            f'{field("Confirm new password", "••••••••••••••")}</div>'
            f'<div style="margin-top: 18px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 5px; '
            f'padding: 14px 16px">'
            f'<div style="font-size: 12.5px; font-weight: 600; color: {MUTED}">Password requirements</div>'
            f'<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; '
            f'margin-top: 10px">' +
            "".join(f'<div style="display: flex; align-items: center; gap: 7px; font-size: 12.5px; '
                    f'color: {PASS_FG if ok else MUTED_2}">{ico("check", 14, PASS_FG if ok else LINE)}{t}</div>'
                    for t, ok in [("At least 12 characters", True), ("One uppercase letter", True),
                                  ("One number", True), ("One symbol", False)]) +
            f'</div></div>'
            f'<div style="margin-top: 20px">'
            f'<button class="btnp" style="width: 100%; padding: 12px; background: {FOREST}; color: {CREAM}; '
            f'border: none; border-radius: 5px; font-family: inherit; font-size: 15px; font-weight: 600; '
            f'cursor: pointer">Set password and continue</button></div>'
            f'<p style="font-size: 12.5px; color: {MUTED_2}; margin-top: 18px; text-align: center">'
            f'Wrong person? <a href="#">Decline this invitation</a></p></div>')


f2 = f'<div style="flex-grow: 1; height: 1px; background: {LINE}; margin: 0 10px"></div>'
write("Invite", auth_shell(invite_form(), "Invitation"))


# ------------------------------------------------------------------ docs
def docs_page():
    groups = [("Auth", ["signInWithPassword", "signInWithGoogle", "acceptInvite"]),
              ("Student", ["getCurriculumChecklist", "listTermGrades", "listOwnAttempts", "getOwnProfile"]),
              ("Adviser", ["listAdvisees", "getAdviseeOverview", "recordEnrollmentAttempt",
                           "applyEquivalencyDecision", "createElectiveMapping", "createAdvisingNote",
                           "reassignAdviser"]),
              ("Admin", ["listProfiles", "createProfile", "listPrograms", "createCurriculumVersion",
                         "listCourses", "createCourseOffering", "listAuditLog"])]
    side = ""
    for g, ops in groups:
        li = "".join(
            f'<div style="padding: 5px 12px 5px 20px; font-size: 12.5px; border-radius: 4px; '
            f'background: {CREAM_DP if o == "recordEnrollmentAttempt" else "transparent"}; '
            f'font-weight: {"600" if o == "recordEnrollmentAttempt" else "450"}; '
            f'color: {INK if o == "recordEnrollmentAttempt" else MUTED}" class="mono">{o}</div>' for o in ops)
        side += (f'<div style="margin-bottom: 18px"><div class="kick" style="color: {MUTED_2}; '
                 f'padding: 0 12px 8px">{g}</div>{li}</div>')
    req = ("{\n"
           '  "student_id": "b7c1…9f2a",\n'
           '  "course_offering_id": "3d40…11c8",\n'
           '  "curriculum_term_course_id": "9a02…7b31",\n'
           '  "prerequisite_override": true,\n'
           '  "override_reason": "Concurrent with CS 121 retake; approved by dept chair."\n'
           "}")
    err = ("{\n"
           '  "code": "PGRST116",\n'
           '  "message": "prerequisite not satisfied",\n'
           '  "details": "CS 132 requires CS 121 (strict)",\n'
           '  "hint": "resubmit with prerequisite_override=true"\n'
           "}")
    codeblock = (lambda t, label, tone: (
        f'<div style="border: 1px solid rgba(246,242,228,0.13); border-radius: 6px; overflow: hidden; '
        f'background: #1A2A0C">'
        f'<div style="padding: 9px 14px; border-bottom: 1px solid rgba(246,242,228,0.13); font-size: 11.5px; '
        f'letter-spacing: 0.08em; text-transform: uppercase; color: {tone}; font-weight: 600">{label}</div>'
        f'<pre class="mono" style="margin: 0; padding: 14px; font-size: 12.5px; line-height: 1.65; '
        f'color: rgba(246,242,228,0.85); white-space: pre-wrap">{t}</pre></div>'))
    right = (f'<div style="width: 470px; flex-shrink: 0; background: {FOREST_DP}; padding: 26px; '
             f'display: flex; flex-direction: column; gap: 16px">'
             f'{codeblock("POST /functions/v1/enrollment-attempts", "Request", GOLD)}'
             f'{codeblock(req, "Body", GOLD)}'
             f'{codeblock(err, "409 — Error schema", "#E8A08D")}</div>')
    main = (f'<div style="flex-grow: 1; padding: 34px 40px; min-width: 0">'
            f'<div style="display: flex; align-items: center; gap: 10px">'
            f'{badge("POST", CREAM, FOREST, dot=False)}'
            f'<span class="mono" style="font-size: 14px">/functions/v1/enrollment-attempts</span></div>'
            f'<h1 class="dsp" style="font-size: 30px; margin-top: 14px">recordEnrollmentAttempt</h1>'
            f'<p style="font-size: 14.5px; color: {MUTED}; line-height: 1.65; margin-top: 12px; max-width: 62ch">'
            f'Records a student attempt against a course offering. Runs the strict-prerequisite soft check. '
            f'When <b>prerequisite_override</b> is true, the attempt and its AuditLogEntry are written in a '
            f'single transaction.</p>'
            f'<div style="display: flex; gap: 10px; margin-top: 16px">'
            f'{badge("bearerAuth", MUTED, CREAM_DP, dot=False)}{badge("Role: adviser, admin", MUTED, CREAM_DP, dot=False)}'
            f'{badge("Contract v1.4.0", MUTED, CREAM_DP, dot=False)}</div>'
            f'<h3 style="font-size: 15px; margin-top: 30px">Request body</h3>'
            f'<div style="margin-top: 12px; border: 1px solid {LINE}; border-radius: 6px; overflow: hidden; '
            f'background: {SURFACE}">' +
            table(["Field", "Type", "Required", "Notes"],
                  [[code("student_id"), "uuid", "yes", "Must be an actively assigned advisee."],
                   [code("course_offering_id"), "uuid", "yes", "Offering must belong to an unlocked school term."],
                   [code("curriculum_term_course_id"), "uuid", "no", "Set when the attempt fills a checklist slot."],
                   [code("prerequisite_override"), "boolean", "no", "Defaults to false; true forces the audit write."],
                   [code("override_reason"), "string", "conditional", "Required when the override flag is true."]],
                  widths=["210px", "90px", "100px", "auto"]) +
            f'</div>'
            f'<h3 style="font-size: 15px; margin-top: 30px">Responses</h3>'
            f'<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px">' +
            "".join(f'<div style="display: flex; align-items: center; gap: 14px; padding: 11px 16px; '
                    f'background: {SURFACE}; border: 1px solid {LINE}; border-radius: 5px">'
                    f'{badge(c, fg, bg, dot=False)}<span style="font-size: 13.5px; color: {MUTED}">{d}</span></div>'
                    for c, d, fg, bg in [("201", "Attempt recorded.", PASS_FG, PASS_BG),
                                         ("409", "Strict prerequisite not satisfied and no override supplied.", INC_FG, INC_BG),
                                         ("403", "Caller is not the student's active adviser.", FAIL_FG, FAIL_BG),
                                         ("423", "The school term is locked.", NEU_FG, NEU_BG)]) +
            f'</div></div>')
    return (f'<div style="min-height: 1040px; background: {CREAM}">'
            f'{site_nav()}'
            f'<div style="display: flex; min-height: 978px">'
            f'<div style="width: 268px; flex-shrink: 0; border-right: 1px solid {LINE}; padding: 26px 14px; '
            f'background: {SURFACE}">'
            f'<div style="padding: 0 8px 16px">{searchbar("Search operations", "100%")}</div>{side}</div>'
            f'{main}{right}</div></div>')


write("Docs", docs_page())
print("marketing artboards written")
