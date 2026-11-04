import * as React from "react";
import * as Icons from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/ui/kicker";
import { Code, Section, Specimen } from "@/routes/styleguide/parts";

type Swatch = {
  name: string;
  hex: string;
  token: string;
  use: string;
  bg: string;
};

// Class names are written out in full so Tailwind can see them.
const brand: Swatch[] = [
  {
    name: "Forest deep",
    hex: "#1D2F0A",
    token: "forest-deep",
    use: "Sidebar, hero and footer grounds",
    bg: "bg-forest-deep",
  },
  {
    name: "Forest",
    hex: "#2F4A12",
    token: "primary",
    use: "Primary actions, headings on light, active states",
    bg: "bg-primary",
  },
  {
    name: "Forest soft",
    hex: "#4A6B22",
    token: "forest-soft",
    use: "Secondary marks, chart fills",
    bg: "bg-forest-soft",
  },
  {
    name: "Gold",
    hex: "#E0A82E",
    token: "gold",
    use: "Single accent: override actions, active indicators",
    bg: "bg-gold",
  },
  {
    name: "Gold deep",
    hex: "#B0761A",
    token: "gold-deep",
    use: "Accent text and links on cream",
    bg: "bg-gold-deep",
  },
  {
    name: "Gold foreground",
    hex: "#3A2A05",
    token: "gold-foreground",
    use: "Text on gold (override button)",
    bg: "bg-gold-foreground",
  },
  {
    name: "Cream",
    hex: "#FBF8EF",
    token: "background",
    use: "Application background",
    bg: "bg-background",
  },
  {
    name: "Cream deep",
    hex: "#F2EDDC",
    token: "secondary",
    use: "Table headers, inert chips, panel grounds",
    bg: "bg-secondary",
  },
  {
    name: "Surface",
    hex: "#FFFFFF",
    token: "card",
    use: "Cards, panels, inputs",
    bg: "bg-card",
  },
  {
    name: "Line",
    hex: "#E1DBC6",
    token: "border",
    use: "Borders and dividers",
    bg: "bg-border",
  },
  {
    name: "Line soft",
    hex: "#EFEADB",
    token: "line-soft",
    use: "Row rules, hover ground",
    bg: "bg-line-soft",
  },
  {
    name: "Ink",
    hex: "#16200C",
    token: "foreground",
    use: "Primary text",
    bg: "bg-foreground",
  },
  {
    name: "Muted",
    hex: "#6E6C58",
    token: "muted-foreground",
    use: "Secondary text",
    bg: "bg-muted-foreground",
  },
  {
    name: "Muted 2",
    hex: "#8C8A76",
    token: "muted-2",
    use: "Captions, kickers",
    bg: "bg-muted-2",
  },
  {
    name: "Destructive",
    hex: "#9E2E1C",
    token: "destructive",
    use: "Errors, blocked actions",
    bg: "bg-destructive",
  },
];

type Pair = {
  name: string;
  token: string;
  fg: string;
  bg: string;
  hexes: string;
};

const statusPairs: Pair[] = [
  {
    name: "Passed",
    token: "status-pass",
    fg: "text-status-pass",
    bg: "bg-status-pass-bg",
    hexes: "#2C6430 / #E7F0E2",
  },
  {
    name: "Failed",
    token: "status-fail",
    fg: "text-status-fail",
    bg: "bg-status-fail-bg",
    hexes: "#9E2E1C / #FAE7E1",
  },
  {
    name: "INC",
    token: "status-inc",
    fg: "text-status-inc",
    bg: "bg-status-inc-bg",
    hexes: "#8A6206 / #FBF0D6",
  },
  {
    name: "Enrolled",
    token: "status-enrolled",
    fg: "text-status-enrolled",
    bg: "bg-status-enrolled-bg",
    hexes: "#2A4C6B / #E4EDF4",
  },
  {
    name: "Neutral",
    token: "status-neutral",
    fg: "text-status-neutral",
    bg: "bg-status-neutral-bg",
    hexes: "#5C5A4C / #ECE8DA",
  },
];

const noticePairs: Pair[] = [
  {
    name: "Advisory",
    token: "notice-advisory",
    fg: "text-notice-advisory",
    bg: "bg-notice-advisory-bg border-notice-advisory-border",
    hexes: "#7A5406 / #FCF4E0 / #EBDCAE",
  },
  {
    name: "Success",
    token: "notice-success",
    fg: "text-notice-success",
    bg: "bg-notice-success-bg border-notice-success-border",
    hexes: "#2C6430 / #E7F0E2 / #CBDDC2",
  },
  {
    name: "Danger",
    token: "notice-danger",
    fg: "text-notice-danger",
    bg: "bg-notice-danger-bg border-notice-danger-border",
    hexes: "#9E2E1C / #FAE7E1 / #EFCFC5",
  },
];

function Swatches() {
  const [copied, setCopied] = React.useState<string>();
  function copy(hex: string) {
    void navigator.clipboard?.writeText(hex);
    setCopied(hex);
    window.setTimeout(() => setCopied(undefined), 900);
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4">
      {brand.map((s) => (
        <button
          key={s.token}
          type="button"
          onClick={() => copy(s.hex)}
          className="flex flex-col justify-start overflow-hidden rounded-md border border-border bg-card text-left transition-colors hover:border-primary"
        >
          <div className={`h-16 border-b border-line-soft ${s.bg}`} />
          <div className="p-3">
            <b className="block text-[13px] font-semibold">{s.name}</b>
            <code className="font-mono text-[11.5px] text-muted-2">
              {copied === s.hex ? "Copied" : s.hex}
            </code>
            <small className="mt-1 block text-[11.5px] leading-snug text-muted-foreground">
              {s.use}
            </small>
            <code className="font-mono text-[11.5px] text-muted-2">
              {s.token}
            </code>
          </div>
        </button>
      ))}
    </div>
  );
}

const typeRows = [
  {
    name: "Display / XL",
    cls: "font-heading text-display-xl font-bold",
    spec: "Syne 700 · 56/1.08 · −0.01em",
    token: "text-display-xl",
    sample: "Advising that leaves a record",
  },
  {
    name: "Display / L",
    cls: "font-heading text-display-l font-bold",
    spec: "Syne 700 · 38/1.1",
    token: "text-display-l",
    sample: "Curriculum checklist",
  },
  {
    name: "Display / M",
    cls: "font-heading text-display-m font-bold",
    spec: "Syne 700 · 30/1.15",
    token: "text-display-m",
    sample: "System overview",
  },
  {
    name: "Heading",
    cls: "text-heading font-semibold",
    spec: "Plex Sans 600 · 16/1.4",
    token: "text-heading",
    sample: "Prerequisite check",
  },
  {
    name: "Body",
    cls: "text-body text-muted-foreground max-w-[62ch]",
    spec: "Plex Sans 400 · 15/1.55",
    token: "text-body",
    sample:
      "Strict prerequisites are checked at enrollment, but SAAIS is a soft-check system: the adviser may continue, and the continuation is the thing that gets recorded.",
  },
  {
    name: "Table cell",
    cls: "text-cell",
    spec: "Plex Sans 400 · 13.5/1.5",
    token: "text-cell",
    sample: "Design and Analysis of Algorithms",
  },
  {
    name: "Caption",
    cls: "text-caption text-muted-foreground",
    spec: "Plex Sans 400 · 12/1.5",
    token: "text-caption",
    sample:
      "Sample records for presentation · Reference date 19 September 2026",
  },
  {
    name: "Numeric / code",
    cls: "font-mono text-code font-medium",
    spec: "Plex Mono 500 · tabular",
    token: "font-mono",
    sample: "CSci 132 · 1.75 · 23-1-04412",
  },
];

const spacing = [
  { name: "Sidebar", value: "250px", bar: "w-sidebar", note: "w-sidebar" },
  { name: "Topbar height", value: "62px", bar: "w-topbar", note: "h-topbar" },
  {
    name: "Content gutter",
    value: "32px (16px mobile)",
    bar: "w-gutter",
    note: "px-gutter / px-gutter-sm",
  },
  { name: "Grid gap", value: "16–18px", bar: "w-grid", note: "gap-grid" },
  { name: "Table row", value: "11px vertical", bar: "w-row", note: "py-row" },
];

const radii = [
  { label: "4px · inputs, chips", cls: "rounded-sm" },
  { label: "6px · cards, panels", cls: "rounded-md" },
  { label: "8px · buttons", cls: "rounded-lg" },
];

function TokenSections() {
  const iconEntries = Object.entries(Icons).filter(
    ([name, v]) => name.endsWith("Icon") && typeof v === "function",
  ) as [string, Icons.IconComponent][];

  return (
    <>
      <Section
        id="colors"
        title="Colors"
        description="Three colors carried off the SAAIS mark: deep olive, gold, cream. Gold is the only accent and is reserved for the override, the exception, the thing an auditor will look for. Click a swatch to copy its hex."
      >
        <Swatches />
        <Code>{`bg-primary  text-primary-foreground  bg-forest-deep  bg-gold  text-gold-deep
bg-background  bg-card  bg-secondary  border-border  text-muted-foreground`}</Code>
      </Section>

      <Section
        id="status-colors"
        title="Status colors"
        description="Every status pairs a foreground with its own tinted ground. Text clears 4.5:1 on its ground and a label always accompanies the color."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statusPairs.map((p) => (
            <div
              key={p.token}
              className="overflow-hidden rounded-md border border-border bg-card"
            >
              <div
                className={`px-3 py-3.5 text-[13px] font-semibold ${p.bg} ${p.fg}`}
              >
                {p.name}
              </div>
              <div className="p-3">
                <code className="font-mono text-[11.5px] text-muted-2">
                  {p.hexes}
                </code>
                <small className="block text-[11.5px] text-muted-foreground">
                  {p.token} · {p.token}-bg
                </small>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {noticePairs.map((p) => (
            <div
              key={p.token}
              className="overflow-hidden rounded-md border border-border bg-card"
            >
              <div
                className={`border-b px-3 py-3.5 text-[13px] font-semibold ${p.bg} ${p.fg}`}
              >
                {p.name} notice
              </div>
              <div className="p-3">
                <code className="font-mono text-[11.5px] text-muted-2">
                  {p.hexes}
                </code>
                <small className="block text-[11.5px] text-muted-foreground">
                  {p.token}[-bg|-border]
                </small>
              </div>
            </div>
          ))}
        </div>
        <Code>{`bg-status-pass-bg text-status-pass     bg-notice-advisory-bg border-notice-advisory-border
bg-status-fail-bg text-status-fail     bg-notice-success-bg   border-notice-success-border
bg-status-inc-bg  text-status-inc      bg-notice-danger-bg    border-notice-danger-border`}</Code>
      </Section>

      <Section
        id="typography"
        title="Typography"
        description="Syne carries the institutional voice in headings, IBM Plex Sans carries the data, and IBM Plex Mono marks codes and grades. Numbers are tabular everywhere so grades and units align in a column."
      >
        <Specimen>
          {typeRows.map((r) => (
            <div
              key={r.name}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-line-soft py-4 last:border-0"
            >
              <div className="w-32 shrink-0 text-xs font-semibold text-muted-2">
                {r.name}
              </div>
              <div className={`min-w-0 flex-1 ${r.cls}`}>{r.sample}</div>
              <div className="w-60 shrink-0 text-right font-mono text-[11.5px] text-muted-2">
                {r.spec}
                <br />
                {r.token}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-baseline gap-6 pt-4">
            <div className="w-32 shrink-0 text-xs font-semibold text-muted-2">
              Kicker
            </div>
            <Kicker className="text-gold-deep">The rules engine</Kicker>
            <span className="ml-auto font-mono text-[11.5px] text-muted-2">
              Plex Sans 600 · 11.5 · 0.14em · caps
            </span>
          </div>
        </Specimen>
        <Code>{`<h1 className="font-heading text-display-m font-bold">System overview</h1>
<Kicker>Cumulative GWA</Kicker>
<span className="font-mono">23-1-04412</span>`}</Code>
      </Section>

      <Section
        id="spacing"
        title="Spacing & layout"
        description="Fixed measurements shared by every portal, exposed as Tailwind utilities (w-sidebar, h-topbar, px-gutter, gap-grid, py-row)."
      >
        <Specimen>
          {spacing.map((s) => (
            <div
              key={s.name}
              className="grid grid-cols-[150px_170px_1fr] items-center gap-4 border-b border-line-soft py-2.5 text-[13px] last:border-0"
            >
              <b className="font-semibold">{s.name}</b>
              <code className="font-mono">{s.value}</code>
              <div className="flex items-center gap-3">
                <div
                  className={`h-3.5 max-w-full rounded-sm bg-primary ${s.bar}`}
                />
                <code className="font-mono text-[11.5px] text-muted-2">
                  {s.note}
                </code>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[150px_170px_1fr] items-center gap-4 pt-2.5 text-[13px]">
            <b className="font-semibold">Page padding</b>
            <code className="font-mono">30px top · 40px bottom</code>
            <span className="text-muted-foreground">Every app page</span>
          </div>
        </Specimen>
      </Section>

      <Section
        id="radius"
        title="Radius & focus"
        description="No pills on controls. Cards and panels are 6px, inputs and chips 4px, buttons 8px. Focus is a 2px forest ring with a 2px offset on every interactive element."
      >
        <Specimen className="flex flex-wrap items-end gap-8">
          {radii.map((r) => (
            <div key={r.label}>
              <div
                className={`h-14 w-24 border-[1.5px] border-primary bg-secondary ${r.cls}`}
              />
              <span className="mt-2 block text-xs font-semibold text-muted-2">
                {r.label}
              </span>
            </div>
          ))}
          <div>
            <Button
              variant="outline"
              className="outline-2 outline-offset-2 outline-ring"
            >
              Focus ring
            </Button>
            <span className="mt-3 block text-xs font-semibold text-muted-2">
              2px / 2px offset
            </span>
          </div>
        </Specimen>
      </Section>

      <Section
        id="icons"
        title="Icons"
        description="One stroke-based family on a 24px grid at 1.6 weight, sourced from src/assets/icons. No emoji anywhere in the product."
      >
        <Specimen>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5">
            {iconEntries.map(([name, Icon]) => (
              <div
                key={name}
                className="flex flex-col items-center gap-2 rounded-md border border-line-soft px-1.5 py-3.5 text-xs text-muted-foreground"
              >
                <Icon className="size-5.5 text-foreground" />
                {name.replace(/Icon$/, "")}
              </div>
            ))}
          </div>
        </Specimen>
        <Code>{`import { BellIcon } from "@/components/icons"
<BellIcon className="size-4.5" />`}</Code>
      </Section>
    </>
  );
}

export { TokenSections };
