# DESIGN.md — SAAIS landing page

The design system as shipped on `Main.dc.html`, composed against **stellic.com** as the reference.

Everything structural came from that reference. The **colour scheme did not** — the SAAIS palette is
derived from `logo.png`, is documented in `canvas.json` as project identity, and is carried through
unchanged. No new hex value was introduced by the rebuild.

**Source of truth is the generator, not the artboard.** `Main.dc.html` is emitted by
`_gen/gen_marketing.py`. Edit the generator, then:

```
cd _gen && python gen_marketing.py
```

That rewrites `Main`, `Login`, `Invite` and `Docs` only. `_gen/base.py` holds the tokens, the header
typeface and the shared component helpers and is **not** landing-specific — changing it means every
artboard is stale until each `gen_*.py` is re-run:

```
cd _gen && for f in gen_marketing.py gen_student.py gen_adviser.py gen_admin.py gen_system.py; do python "$f"; done
```

The header typeface (§3) was changed this way: it lives in `base.py`, so the whole 27-artboard set
was regenerated, not just the landing page.

---

## 1. Reference and intent

### Taken from stellic.com

| Device | How it lands here |
|---|---|
| Centred composition | Every section is a centred header over a centred body, inside a 1200px container |
| Sans-serif headings | Landing headings use the local `h()` helper, now set in Syne |
| Full-bleed product shot under the hero | `wide_checklist()` sits below the hero copy and overhangs the next section by 190px |
| Tab switchers instead of stacked feature rows | `feature_tabs()` (Checklist / Rules engine / Audit trail) and `lifecycle_tabs()` (5 workflow steps) |
| One oversized impact number | `big_number()` — a single 104px numeral over a 3-up of supporting figures |
| Trust / compliance badge row | `trust_badges()` — three cards, icon tile + title + one line |
| Newsletter column in the footer | `footer()` — "Release notes" signup plus a "looking for your sign-in?" note |
| Large radii, generous rhythm | 16px cards, 999px buttons, 112px section padding |
| Photo-backed closing CTA | Replaced with the gold radial glow — see §8 |

### Deliberately not taken

- **Its palette.** Stellic is white-and-blue. SAAIS stays forest, gold and cream.
- **Its named-customer proof.** No press section, no named case-study carousel, no adoption number.
  See §8.
- **Its announcement bar.** Stellic has none, and the previous SAAIS bar claimed "Phase 3 is live",
  which is false — the system is not deployed. Removing it satisfied both.
- **Its institution logo wall.** Stellic sells to many schools and shows a roster of pilots. SAAIS is
  scoped to one institution — there is no fleet of customers to display, so the section was removed
  rather than placeholdered. `audiences()` now sits directly under the hero shot.

### One addition beyond the reference

The hero's atmosphere — four blend-mode gradient layers — is not from stellic.com; it came from a
separate "aura gradient" background spec and was recoloured into the SAAIS token set before use (§2,
"Hero aura mesh"). It replaced the hero's original two-blob decorative glow.

---

## 2. Colour

**Unchanged from `_gen/base.py`.** These are the only colours on the page.

### Core tokens

| Token | Value | Role on the landing page |
|---|---|---|
| `INK` | `#16200C` | Headings, primary body text |
| `FOREST` | `#2F4A12` | Primary buttons, active step pill, numerals, big-number ground |
| `FOREST_DP` | `#1D2F0A` | Hero ground, integration frame, closing CTA ground |
| `FOREST_SF` | `#4A6B22` | Secondary check marks in the audience cards |
| `GOLD` | `#E0A82E` | Hero kicker, gold buttons, footer column headings, tab underline |
| `GOLD_DP` | `#B0761A` | Section kickers on light grounds, provenance lines, feature check marks |
| `GOLD_SF` | `#F6E2AE` | Reserved; unused on this page |
| `CREAM` | `#FBF8EF` | Section ground; text on dark grounds |
| `CREAM_DP` | `#F2EDDC` | Alternate section ground, icon tiles, inert chips |
| `SURFACE` | `#FFFFFF` | Cards, panels, screenshot bodies, alternate section ground |
| `LINE` | `#E1DBC6` | Card and section borders, tab strip rule |
| `LINE_SF` | `#EFEADB` | Row dividers, list separators |
| `MUTED` | `#6E6C58` | Body copy |
| `MUTED_2` | `#8C8A76` | Meta text, kickers on neutral, placeholder marks |

### Status pairs (foreground / background)

| Status | fg | bg |
|---|---|---|
| Passed | `#2C6430` | `#E7F0E2` |
| Failed / INC lapsed | `#9E2E1C` | `#FAE7E1` |
| INC | `#8A6206` | `#FBF0D6` |
| Enrolled | `#2A4C6B` | `#E4EDF4` |
| Neutral / not taken | `#5C5A4C` | `#ECE8DA` |

### Literals outside the token set

| Value | Use |
|---|---|
| `#16230A` | Footer ground and the page backstop behind every section |
| `#3A2A05` | Text on gold buttons |

### Cream-on-dark alpha ramp

Text and rules on `FOREST_DP` / `FOREST` / `#16230A` are `rgba(246,242,228,α)`:

| α | Use |
|---|---|
| 0.82 | Nav items on dark |
| 0.78 | Hero subhead, big-number caption |
| 0.72 | Closing CTA subhead |
| 0.68 | Hero compliance marks |
| 0.62 | Footer links, stat captions, footer social icons |
| 0.55 | Footer brand paragraph, CTA contact line |
| 0.45 | Legal bar, newsletter placeholder text |
| 0.30 | Border of the secondary hero button |
| 0.16 | Section dividers on dark, newsletter input border |
| 0.12 | Footer rules |
| 0.06 | Newsletter input fill |

### Hero aura mesh

The hero's atmosphere is four absolutely-positioned, corner-anchored radial-gradient layers
composited with CSS blend modes (`aura_layer()` in `gen_marketing.py`) against the hero
`<section>`'s own `FOREST_DP` background — no separate base-color element is needed because the
section already paints solid `FOREST_DP` behind them. Every layer colour is an exact RGB conversion
of an existing token, so the mesh introduces no new colour:

| Layer | Position | Colour (token → rgba) | Alpha | Blend | Blur |
|---|---|---|---|---|---|
| 1 | 24% 18% | `FOREST_SF` → `rgba(74,107,34,α)` | 0.55 | `screen` | 260px |
| 2 | 78% 14% | `FOREST` → `rgba(47,74,18,α)` | 0.45 | `screen` | 260px |
| 3 | 40% 78% | `GOLD_SF` → `rgba(246,226,174,α)` | 0.18 | `screen` | 252px |
| 4 | 88% 88% | `GOLD` → `rgba(224,168,46,α)` | 0.22 | `overlay` | 198px |

Forest tones carry the mass (layers 1–2); gold is confined to one small, low-alpha corner layer
(layer 4) — the rationing rule below applies to this mesh exactly as it does everywhere else. Each
layer fades to `transparent` well before reaching the hero's centre, so the headline and subhead sit
on close-to-flat `FOREST_DP` and keep full contrast. Layers are wrapped in an `inset: 0; overflow:
hidden` container so blur doesn't bleed past the hero's edge, while the hero `<section>` itself stays
`overflow: visible` so the product screenshot below can still overhang into the next section (§7,
pattern 1). The hero copy is lifted to `z-index: 1` above the mesh.

**Elsewhere on the page, the simpler two-blob glow is unchanged:** decorative only, always
`rgba(224,168,46,α)` fading to `rgba(224,168,46,0)`, no blend mode — `0.16` (integration frame,
closing CTA). The richer aura treatment is intentionally scoped to the hero, the one section built to
carry it (§4 layout note); the smaller glows stay simple so they don't compete with it.

### The rationing rule

> **Gold is the only accent and it is rationed.** In the product it marks exactly one action —
> "Continue with override" — plus the active sidebar indicator and exception provenance. If gold
> shows up, something happened that an auditor will read.

On the landing page gold is therefore held to: the hero kicker, section kickers, the primary CTA,
the active tab underline, provenance lines in the product shots, and footer column headings. It is
never used as a decorative fill or a background for a whole section.

---

## 3. Typography

Loaded once, in `base.py`'s CSS:

```
Syne 500/600/700/800 · IBM Plex Sans 400/450/500/600/700 · IBM Plex Mono 400/500/600
```

**Syne (Google Fonts) is the header font for the whole mockup set**, headings and wordmark alike —
not just the landing page. It replaced Newsreader everywhere in this rebuild; nothing in the set
still loads or references Newsreader.

- On the 26 app artboards, headings get Syne through the shared `.dsp` class in `base.py`
  (`font-family: 'Syne', 'Segoe UI', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.01em`).
  This is a one-line change in one file — every `<h1 class="dsp">` / `<h2 class="dsp">` in the set
  picked it up on regeneration.
- On the landing page, headings are set inline by the local `h()` helper in `gen_marketing.py`,
  which mirrors the same family, weight and tracking so the two mechanisms stay visually identical.
- **The SAAIS wordmark uses `.dsp`, so it is Syne too**, including in this page's nav and footer —
  there is no longer a serif/sans split between the logotype and the headings around it.
- The `&ldquo;` glyph opening the testimonial is a decorative quotation mark, not a heading — it
  stays on a plain `Georgia, 'Times New Roman', serif` stack for contrast against the Syne body copy.

Syne is a display face: it reads flat below 600 weight, so nothing in the set sets it lighter than
that. Import only the weights actually used — `500` (blockquote), `600`/`700` (most headings),
`800` (reserved for future oversized numerals) — to keep the page-load font payload down.

### Scale as shipped

| Role | Family / weight | Size | Line | Tracking |
|---|---|---|---|---|
| Hero h1 | Syne 700 | 64 | 1.06 | −0.01em |
| Closing CTA h2 | Syne 700 | 48 | 1.06 | −0.01em |
| Section h2 (primary) | Syne 700 | 44 | 1.06 | −0.01em |
| Section h2 (secondary) | Syne 700 | 40 | 1.06 | −0.01em |
| Feature panel h2 | Syne 700 | 34 | 1.06 | −0.01em |
| Big number | Syne 700 | 104 | 1.0 | −0.01em |
| Minor stat | Syne 700 | 34 | 1.06 | −0.01em |
| Platform statement | Syne 700 | 30 | 1.28 | −0.02em |
| Blockquote | Syne 500 | 30 | 1.36 | −0.02em |
| Step panel h2 | Syne 700 | 30 | 1.06 | −0.01em |
| Audience card title | Syne 700 | 24 | 1.06 | −0.01em |
| Small card title | Syne 700 | 17–18 | 1.3 | −0.02em |
| App headings (`.dsp`) | Syne 700 | 16–56 | 1.08 | −0.01em |
| Hero subhead | Plex Sans 400 | 19 | 1.6 | — |
| Section subhead | Plex Sans 400 | 17.5 | 1.6 | — |
| Body | Plex Sans 400 | 15.5–16 | 1.65 | — |
| Card body | Plex Sans 400 | 13.5–14.5 | 1.62 | — |
| Meta / caption | Plex Sans 400 | 12–13 | 1.55 | — |
| Kicker (`.kick`) | Plex Sans 600 | 11.5 | — | 0.14em, uppercase |
| Course codes, grades (`.mono`) | Plex Mono 500 | 13–13.5 | — | tabular |

Measure is capped in `ch`, not px: headings 17–30ch, subheads 58–62ch, body ≤ 74ch.

`font-variant-numeric: tabular-nums` is on `body`, so grades and GWA figures align in columns.

Syne's letterforms run wider than Newsreader's, so heading-heavy artboards were re-measured after
the swap; five needed a taller pinned frame in `canvas.json` (`Main`, `StudentChecklist`,
`StudentGrades`, `AdminOfferings`, `AdminAudit`) — body copy, still Plex Sans, was unaffected.

---

## 4. Layout

- **Artboard:** 1440 × 9260 (`canvas.json`). Re-measure and update `h` after any structural change.
- **Container:** 1200px, centred — the `wrap()` helper. Narrower for reading-width blocks:
  980px (platform statement), 900px (testimonial, the dialog inside the integration frame).
- **Gutter:** 56px, matching the app artboards' page padding.
- **Section rhythm:** `112px 56px` default. Exceptions: hero `104px top / 0 bottom`,
  audiences `248px top` (to clear the hero shot's overhang), trust badges `86px`,
  big number `100px`, testimonial `104px`, closing CTA `128px`, footer `76px top / 34px bottom`.
- **Grids:** 3-up at 22–26px gap, 5-up at 18px, feature split at `1fr / 1.2fr` with 64px gap,
  step panel at `1fr / 1.15fr` with 56px gap, footer at `290px + 4 × 1fr` with 44px gap.

### Ground alternation

`SURFACE` nav → `FOREST_DP` hero → `CREAM` audiences →
`SURFACE` statement + tabs → `CREAM` integration → `SURFACE` testimonial →
`CREAM_DP` badges → `FOREST` big number → `CREAM` lifecycle → `SURFACE` rules →
`CREAM` roadmap → `FOREST_DP` CTA → `#16230A` footer.

The hero's overhanging screenshot sits on a `CREAM` ground either way, so the seam reads as one
continuous light section rather than a hard color change — that was true with the logo wall in
between and stays true without it.

Never two identical grounds in a row, except the statement and the tab section, which are one
continuous white expanse by design — the statement is the tab section's overline.

---

## 5. Radii, elevation, borders

| Radius | Applied to |
|---|---|
| 999px | All buttons and pills, the newsletter input, the footer social circles |
| 22px | The integration frame around the override dialog |
| 18px | The statement logo mark |
| 16px | Cards, panels, product screenshots |
| 12px | Icon tiles |
| 9px | Nav / footer logo mark |
| 3–5px | Status badges and form fields inherited from `base.py` |

| Shadow | Value | Applied to |
|---|---|---|
| Hero shot | `0 40px 90px rgba(15,26,6,0.30)` | The full-bleed checklist under the hero |
| Dialog | `0 24px 60px rgba(15,26,6,0.28)` | The override dialog on its dark frame |
| Card lift | `0 18px 44px rgba(15,26,6,0.08)` | The GWA engine card in the tab panel |

Borders are `1px solid LINE` on cards and section rules; `1px solid LINE_SF` on internal row
dividers. Roadmap cards carry a `3px` top border — `FOREST` when built, `LINE` when planned.

---

## 6. Components

| Component | Helper | Notes |
|---|---|---|
| Button / pill | `pill(label, kind, size, icon, after)` | `gold` · `primary` · `onDark` · `secondary`; `sm` `md` `lg`. Keeps `.btnp` / `.btns` hover from `base.py` |
| Section shell | `sect(inner, bg, pad, extra)` | Full-bleed ground |
| Container | `wrap(inner, w, extra)` | Centred, default 1200px |
| Heading | `h(text, size, color, mw, center, …)` | The sans-display helper; the landing page's `.dsp` replacement |
| Section header | `sect_head(kick, title, sub, …)` | Centred kicker + heading + subhead, capped at 900px |
| Icon tile | `icon_tile(name, size, bg, fg, isz)` | 64px on audience cards, 52px on badges |
| Arrow link | `link_arrow(label, color)` | Stellic's "Learn about …" affordance |
| Brand lockup | `brandmark(color, mark, fs)` | Mark + Syne wordmark |
| Status badge | `status()` / `badge()` from `base.py` | Dot + label; never colour alone |
| Course code | `code()` from `base.py` | IBM Plex Mono 500 |
| Avatar, table, field | `avatar()` / `table()` / `field()` from `base.py` | Unchanged |

### Tabs

Two forms, both static — the active state is drawn, not scripted.

- **Underline tabs** (`feature_tabs`): row centred on a `LINE` rule; active is `INK` 600 with a
  `2px GOLD` bottom border, inactive `MUTED_2` 450.
- **Pill tabs** (`lifecycle_tabs`): active is filled `FOREST` on `CREAM`; inactive is `SURFACE`
  with a `LINE` border and `MUTED` text.

### Product screenshots

White body, `LINE` border, 16px radius, `CREAM` header and footer bars, `LINE_SF` row dividers,
`.mono` for codes and grades, and a `GOLD_DP` provenance line under any row that was filled by an
exception. The screenshots are the page's main visual — there is no photography and no illustration.

---

## 7. Section patterns

Reusable shapes, in the order they appear:

1. **Centred hero + overhanging shot** — copy centred on a dark ground, shot below with
   `margin-bottom: -190px` and the next section padded to clear it (see `audiences()`, §4).
2. **3-up card grid** — centred header, then equal cards with icon tile, title, body, divider list.
3. **Statement** — mark over one large centred sentence; acts as an overline for what follows.
4. **Tab switcher** — centred header, tab row, then a two-column panel (copy left, screenshot right).
5. **Framed dialog** — a product dialog centred on a `FOREST_DP` rounded frame with a gold glow.
6. **Centred quote** — ornament, blockquote, avatar + attribution, honesty note.
7. **Badge row** — kicker over three equal compliance cards.
8. **Big-number band** — one 104px numeral on `FOREST`, rule, 3-up of supporting figures.
9. **Step selector** — pill tabs over a panel showing that step's copy and what it writes.
10. **Closing CTA** — centred heading, subhead, one gold pill, contact placeholder, gold glow.
11. **Footer** — brand + social, four link columns, newsletter row, legal bar.

There is deliberately no institution-logo-wall pattern (§1, "Deliberately not taken") — SAAIS is
single-institution software, not a multi-tenant product with a roster of customers to show.

---

## 8. Content honesty rules

These are design rules, not just copy rules. They come from `PRODUCT.md` and they are the reason
several sections look the way they do.

- **No real institution is named or invented.** Every institutional reference is a visible bracket:
  `[Partner University]`, `[Institution]`, `[Student name]`, `[adviser]@[institution].edu.ph`.
- **No fabricated proof.** No testimonial, customer, pilot result, adoption number, benchmark,
  press mention, award or endorsement. The quote is therefore rendered as a **bracketed placeholder
  that says so on the page** — "Unattributed by design. SAAIS has no pilot results to quote yet, and
  will not invent any."
- **Stellic's press section, case-study carousel and institution logo wall were dropped**, not
  placeholdered. The first two are entirely third-party attribution SAAIS has none of; the logo wall
  assumes a multi-tenant product with a roster of pilot customers, which SAAIS is not — it is built
  for one institution.
- **The big number and the badge row use facts the project can stand behind** — the 18-entity
  schema, the 1.00–5.00 scale in 0.25 steps, five phases, zero-gap adviser continuity, RA 10173,
  WCAG 2.1 AA, row-level security, an append-only audit table.
- **Nothing is deployed.** No "live", "in production" or "used by" framing. The roadmap says
  **Built** (in the specification and the mockup set), not *Shipped*, and Phases 4–5 read *Planned*.
- **Only `logo.png` and `logo-mark.png` are real assets.** There is no photography on the page;
  where Stellic uses a photo, this page uses a gold radial glow on a forest ground.
- **Voice:** institutional and precise. Authority comes from being exact about academic rules, not
  from marketing enthusiasm. Use the domain terms verbatim — attempt, offering, checklist slot,
  curriculum version, GWA, delinquency flag, INC lapse, equivalency decision, elective mapping,
  override, audit entry.

---

## 9. Accessibility

WCAG 2.1 Level AA is a project requirement, audited in Phase 4.

- **Status is never colour alone.** Every status badge carries a text label plus a dot; grades are
  printed as values, not encoded in a swatch.
- **Contrast.** Body copy is `MUTED #6E6C58` on `CREAM`/`SURFACE`; the cream-on-dark ramp does not
  go below `0.62` for anything that must be read (`0.45` and below is reserved for legal and
  placeholder text). Gold `#E0A82E` is used with `#3A2A05` text, never with cream.
- **Semantics.** `section` / `header` / `footer` / `nav` / `h1`–`h3` / `ul` / `blockquote` are used
  for what they are. There is exactly one `h1`, in the hero.
- **Type floor.** No text below 11.5px, and that size only for uppercase kickers with 0.14em
  tracking.
- **Hit targets.** Buttons are ≥ 38px tall at `sm` and ≥ 48px at `lg`; the mobile artboards hold the
  44px minimum.
- The tab states here are **drawn, not interactive** — this is a static mockup. A build must give
  them real `role="tab"` semantics, keyboard arrow navigation, and a visible focus ring.

---

## 10. Provenance

| File | Role |
|---|---|
| `_gen/gen_marketing.py` | Source of `Main`, `Login`, `Invite`, `Docs`. All landing work happens here |
| `_gen/base.py` | Colour tokens, shared CSS, icon set, component helpers. Shared by all 27 artboards |
| `canvas.json` | Artboard frames and the design annotations |
| `PRODUCT.md` | Brand commitments, evidence rules, product principles |
| `PRD.md`, `Student Academic Advising Information System.md` | The specification the copy is written from |

`site_nav()` and `footer()` are shared with `Docs.dc.html`, so nav and footer changes land on both
artboards. `saais-mockups.html` is a published canvas bundle with every artboard embedded — nothing
in `_gen/` regenerates it, so it holds the previous landing page until it is re-published from the
Design Canvas.
