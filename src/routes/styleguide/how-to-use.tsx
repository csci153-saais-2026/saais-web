import { Code, Section } from "@/routes/styleguide/parts"

type Prop = [name: string, type: string, note: string]

type Doc = {
  name: string
  file: string
  summary: string
  /** id of the live example section further down this page */
  live?: string
  props?: Prop[]
  example: string
}

const ui: Doc[] = [
  {
    name: "StatusBadge",
    file: "ui/status-badge.tsx",
    live: "status-badge",
    summary: "Status chip: text label plus a leading mark (dot, or a flag for delinquent/flagged). Use it for every pass/fail/standing display; never show status by color alone.",
    props: [
      ["status", "Status", "passed · failed · inc · inc-lapsed · enrolled · dr · na · not-taken · good · delinquent · flagged · active · current · archived · invited · disabled"],
      ["children", "ReactNode", "Optional. Overrides the default label for the status."],
    ],
    example: `import { StatusBadge } from "@/components/ui/status-badge"

<StatusBadge status="passed" />
<StatusBadge status="inc-lapsed" />
<StatusBadge status="dr" />          // Dropped
<StatusBadge status="na" />          // No attendance
<StatusBadge status="delinquent" />  // flag glyph + "Delinquent"`,
  },
  {
    name: "Kicker",
    file: "ui/kicker.tsx",
    live: "badge",
    summary: "Small uppercase label placed above values and section titles.",
    example: `import { Kicker } from "@/components/ui/kicker"

<Kicker>Cumulative GWA</Kicker>
<Kicker className="text-gold-deep">The rules engine</Kicker>`,
  },
  {
    name: "BrandMark",
    file: "ui/brand-mark.tsx",
    summary: "SAAIS logo tile with the wordmark and an optional portal caption. Reads /logo-mark.png from public.",
    props: [
      ["caption", "string", "Small line under the wordmark, e.g. \"Student portal\"."],
      ["className", "string", "Set the text color when used on a dark ground."],
    ],
    example: `import { BrandMark } from "@/components/ui/brand-mark"

<BrandMark caption="Adviser portal" />`,
  },
  {
    name: "Table (responsive)",
    file: "ui/table.tsx",
    live: "table",
    summary: "Cream-headed data table. Pass responsive to stack each row into a labelled card below 768px; give every TableCell a label for its caption.",
    props: [
      ["responsive", "boolean", "On Table. Adds the stacking behavior (default false)."],
      ["label", "string", "On TableCell. Column caption shown in the stacked card."],
    ],
    example: `<Table responsive>
  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>GWA</TableHead></TableRow></TableHeader>
  <TableBody>
    <TableRow>
      <TableCell label="Student">Maria Isabel Bautista</TableCell>
      <TableCell label="GWA" className="font-mono">1.58</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
  },
  {
    name: "Dialog",
    file: "ui/dialog.tsx",
    live: "dialog",
    summary: "Modal with a forest scrim and Syne title. Compose it from its parts; control it with open/onOpenChange or a trigger.",
    props: [
      ["open / onOpenChange", "boolean / (open) => void", "On Dialog. Omit both to let DialogTrigger control it."],
      ["showCloseButton", "boolean", "On DialogContent. Defaults to true."],
    ],
    example: `import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild><Button variant="outline">Add course</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add course</DialogTitle>
      <DialogDescription>Choose a course to add to this term.</DialogDescription>
    </DialogHeader>
    <DialogFooter><Button>Add course</Button></DialogFooter>
  </DialogContent>
</Dialog>`,
  },
  {
    name: "Popover",
    file: "ui/popover.tsx",
    live: "popover",
    summary: "Floating panel anchored to a trigger. Content defaults to w-72 with p-4 padding; set className to resize or remove padding.",
    props: [
      ["align", "start | center | end", "On PopoverContent. Defaults to center."],
      ["side", "top | right | bottom | left", "On PopoverContent."],
    ],
    example: `import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

<Popover>
  <PopoverTrigger asChild><Button variant="outline">Details</Button></PopoverTrigger>
  <PopoverContent align="start" className="w-64">Content</PopoverContent>
</Popover>`,
  },
  {
    name: "Checkbox · RadioGroup · ToggleGroup",
    file: "ui/checkbox.tsx · radio-group.tsx · toggle-group.tsx",
    live: "form",
    summary: "Form primitives. Pair each with a Label. ToggleGroup is the segmented Current / Past control.",
    props: [
      ["checked / onCheckedChange", "boolean / (v) => void", "Checkbox."],
      ["value / onValueChange", "string / (v) => void", "RadioGroup and ToggleGroup (type=\"single\")."],
    ],
    example: `<span className="flex items-center gap-2">
  <Checkbox id="keep" checked={keep} onCheckedChange={(v) => setKeep(v === true)} />
  <Label htmlFor="keep">Keep me signed in</Label>
</span>

<ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} spacing={1}>
  <ToggleGroupItem value="current">Current</ToggleGroupItem>
  <ToggleGroupItem value="past">Past</ToggleGroupItem>
</ToggleGroup>`,
  },
  {
    name: "Collapsible",
    file: "ui/collapsible.tsx",
    live: "checklist",
    summary: "Show/hide wrapper used by the checklist term groups and expandable sidebar groups.",
    props: [["defaultOpen / open / onOpenChange", "boolean", "Uncontrolled or controlled."]],
    example: `<Collapsible defaultOpen>
  <CollapsibleTrigger>Year 1 · Semester 1</CollapsibleTrigger>
  <CollapsibleContent>…</CollapsibleContent>
</Collapsible>`,
  },
  {
    name: "Sidebar (primitives)",
    file: "ui/sidebar.tsx",
    live: "sidebar",
    summary: "Themed shadcn Sidebar: fixed 250px on desktop, Sheet drawer below 768px. Normally you use AppSidebar/AppShell instead; reach for the primitives only to build a custom menu.",
    props: [
      ["collapsible", "offcanvas | icon | none", "On Sidebar. Use \"none\" for a static, non-collapsing preview."],
      ["isActive", "boolean", "On SidebarMenuButton. NavLink links are also styled via aria-current=\"page\"."],
      ["asChild", "boolean", "On SidebarMenuButton. Render a NavLink/Link inside it."],
    ],
    example: `<SidebarProvider>
  <Sidebar>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Student</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild><NavLink to="/student/grades"><ChartIcon />Grades</NavLink></SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</SidebarProvider>`,
  },
  {
    name: "Icons",
    file: "components/icons/index.tsx",
    live: "icons",
    summary: "The SAAIS icon set (generated from src/assets/icons). Size with Tailwind; decorative (aria-hidden) by default. Do not import lucide-react.",
    props: [["…svg props", "IconProps", "Any SVG prop. Size with size-4, size-5, etc."]],
    example: `import { BellIcon, ChevronRightIcon } from "@/components/icons"

<BellIcon className="size-5" />
<Button><PlusIcon /> Add</Button>   // buttons size child svgs automatically`,
  },
]

const features: Doc[] = [
  {
    name: "AppShell",
    file: "features/app-shell.tsx",
    live: "sidebar",
    summary: "The signed-in page frame: sidebar, topbar with breadcrumb, and the content area. Every portal page renders inside it. Must be inside the router.",
    props: [
      ["sidebar", "AppSidebar props", "portalLabel, sections, currentPath, user, helpHref?, profileHref?, onSignOut."],
      ["crumbs", "{ label; to? }[]", "Breadcrumb trail. The last item is the current page."],
      ["topbarTrailing", "ReactNode", "Right side of the topbar, normally <NotificationBell />."],
    ],
    example: `import { AppShell } from "@/components/features/app-shell"
import { GridIcon, CheckIcon } from "@/components/icons"

const sections = [{
  title: "Student",
  items: [
    { label: "Dashboard", href: "/student/dashboard", icon: GridIcon, end: true },
    { label: "Curriculum checklist", href: "/student/checklist", icon: CheckIcon },
  ],
}]

<AppShell
  sidebar={{ portalLabel: "Student portal", sections, currentPath: location.pathname, onSignOut: signOut,
             user: { name: "Maria Isabel Bautista", subtitle: "23-1-04412", initials: "MI" } }}
  crumbs={[{ label: "My academic journey", to: "/student" }, { label: "Dashboard" }]}
  topbarTrailing={<NotificationBell items={items} allHref="/student/notifications" />}
>
  {page content}
</AppShell>`,
  },
  {
    name: "NotificationBell",
    file: "features/notification-bell.tsx",
    live: "popover",
    summary: "Topbar bell with an unread badge and a popover list.",
    props: [
      ["items", "{ id; title; time; unread?; to? }[]", "Unread items get a gold dot and count toward the badge."],
      ["allHref", "string", "Where \"See all notifications\" goes."],
      ["onMarkAllRead", "() => void", "Optional. Shows the Mark all as read button."],
    ],
    example: `<NotificationBell items={items} allHref="/notifications" onMarkAllRead={markAllRead} />`,
  },
  {
    name: "PageHeading",
    file: "features/page-heading.tsx",
    live: "page-heading",
    summary: "Page title and subtitle, with optional primary actions on the right.",
    props: [
      ["title / subtitle", "string", "Title uses Syne 30px."],
      ["actions", "ReactNode", "Usually one primary <Button>."],
    ],
    example: `<PageHeading title="Programs with a clear structure." subtitle="Each program owns its curricula." actions={<Button>New program</Button>} />`,
  },
  {
    name: "StatGrid / StatTile",
    file: "features/stat-tile.tsx",
    live: "panel",
    summary: "Row of summary metrics: kicker label, large value, short note.",
    props: [["items", "{ label; value; valueSuffix?; note? }[]", "One tile per item; 4-up on desktop."]],
    example: `<StatGrid items={[
  { label: "Cumulative GWA", value: "1.58", note: "56 counted units" },
  { label: "Units earned", value: "56", valueSuffix: "/ 147", note: "of 147 required units" },
]} />`,
  },
  {
    name: "Panel",
    file: "features/panel.tsx",
    live: "panel",
    summary: "Bordered section with a titled header and an optional header action. The standard container for page content.",
    props: [
      ["title", "string", "Required."],
      ["description", "string", "Muted line under the title."],
      ["action", "ReactNode", "Button or link at the right of the header."],
      ["flush", "boolean", "Remove body padding, for tables that run edge to edge."],
    ],
    example: `<Panel title="Course Recommendations" description="Suggested by your adviser." action={<Button variant="outline" size="sm">Open checklist</Button>}>
  …
</Panel>`,
  },
  {
    name: "DataTablePanel",
    file: "features/data-table-panel.tsx",
    live: "table",
    summary: "Panel wrapping a data table with a cream header. Below 768px rows stack into labelled cards.",
    props: [
      ["columns", "{ header; cell(row); numeric?; className? }[]", "numeric right-aligns and sets mono type."],
      ["rows / rowKey", "T[] / (row) => string", "Data and a stable key."],
      ["empty / footer", "string / ReactNode", "Empty-state text and a footer line."],
    ],
    example: `<DataTablePanel
  title="Advisees"
  description="4 matching sample records"
  rows={advisees}
  rowKey={(r) => r.id}
  columns={[
    { header: "Student", cell: (r) => r.name },
    { header: "GWA", numeric: true, cell: (r) => r.gwa },
    { header: "Standing", cell: (r) => <StatusBadge status={r.standing} /> },
  ]}
/>`,
  },
  {
    name: "FormField",
    file: "features/form-field.tsx",
    live: "form",
    summary: "Label + control + hint/error, wired together. Wrap every input in it.",
    props: [
      ["label / htmlFor", "string", "htmlFor must match the control's id."],
      ["hint / error", "string", "Error replaces the hint and is announced with role=alert."],
    ],
    example: `<FormField label="Student number" htmlFor="no" hint="Format YY-S-NNNNN, e.g. 27-1-00999." error={errors.no}>
  <Input id="no" {...register("no")} />
</FormField>`,
  },
  {
    name: "SearchInput",
    file: "features/search-input.tsx",
    live: "form",
    summary: "Input with a leading search icon. Accepts all input props.",
    example: `<SearchInput placeholder="Name or student number" value={q} onChange={(e) => setQ(e.target.value)} />`,
  },
  {
    name: "FilterBar",
    file: "features/filter-bar.tsx",
    live: "form",
    summary: "Search + select filter row with an optional Current / Past toggle.",
    props: [
      ["search / onSearchChange", "string / (v) => void", "Controlled search text."],
      ["filterOptions / filter / onFilterChange", "{ value; label }[] / string / (v) => void", "The select."],
      ["toggleOptions / toggle / onToggleChange", "optional", "Segmented control at the right."],
      ["searchLabel / searchPlaceholder / filterLabel", "string", "Captions."],
    ],
    example: `<FilterBar
  search={q} onSearchChange={setQ} searchLabel="Search advisees" searchPlaceholder="Name or student number"
  filterLabel="Standing" filter={standing} onFilterChange={setStanding}
  filterOptions={[{ value: "all", label: "All standings" }, { value: "flagged", label: "Flagged" }]}
  toggleOptions={[{ value: "current", label: "Current" }, { value: "past", label: "Past" }]}
  toggle={view} onToggleChange={setView}
/>`,
  },
  {
    name: "QuickAccess",
    file: "features/quick-access.tsx",
    live: "page-heading",
    summary: "Row of shortcut buttons under the dashboard stats.",
    props: [["links", "{ label; to }[]", "Rendered as outline buttons with a chevron."]],
    example: `<QuickAccess links={[{ label: "Open checklist", to: "/student/checklist" }, { label: "Review grades", to: "/student/grades" }]} />`,
  },
  {
    name: "SampleFooter",
    file: "features/sample-footer.tsx",
    summary: "Muted note under page content, e.g. the sample-records disclaimer.",
    example: `<SampleFooter>Sample records for presentation · Reference date: 19 September 2026</SampleFooter>`,
  },
  {
    name: "StudentRecordHeader · RecordTabs",
    file: "features/student-record-header.tsx",
    live: "avatar",
    summary: "Top of a student record: avatar, name, meta line and standing badge, then the Checklist / Grades / … tab strip.",
    props: [
      ["standing", "Status", "good or flagged, shown as a StatusBadge."],
      ["tabs / value / onValueChange", "{ value; label }[] / string / (v) => void", "RecordTabs; the active tab gets a gold underline."],
    ],
    example: `<StudentRecordHeader name="Maria Isabel Bautista" initials="MI" studentNumber="23-1-04412"
  program="BS Computer Science" yearLabel="2nd Year" email="maria@example.edu.ph" standing="good" />
<RecordTabs tabs={[{ value: "checklist", label: "Checklist" }, { value: "grades", label: "Grades" }]} value={tab} onValueChange={setTab} />`,
  },
  {
    name: "ChecklistTermGroup",
    file: "features/checklist-term-group.tsx",
    live: "checklist",
    summary: "Collapsible semester block of the curriculum checklist with passed/total units and semester GWA.",
    props: [
      ["title / description", "string", "Semester heading."],
      ["passedUnits / totalUnits / semesterGwa", "number / number / string", "Summary figures."],
      ["rows", "ChecklistRow[]", "{ code, title, unitsEarned, unitsRequired, status, source, sourceDetail?, attempts }"],
      ["onCourseInfo", "(code) => void", "Called by the Course info button."],
      ["open / onOpenChange", "boolean", "Optional control; open by default when omitted."],
    ],
    example: `<ChecklistTermGroup title="Year 1 · Semester 1" passedUnits={27} totalUnits={27} semesterGwa="1.56" rows={rows} onCourseInfo={openCourse} />`,
  },
  {
    name: "GradeDistribution",
    file: "features/grade-distribution.tsx",
    live: "progress",
    summary: "Horizontal bars showing the share of grades per band.",
    props: [["bands", "{ label; percent; detail?; tone? }[]", "tone: primary · soft · fail · inc · neutral."]],
    example: `<GradeDistribution bands={[
  { label: "1.00–1.50", percent: 33, detail: "285 grades" },
  { label: "5.00", percent: 5, tone: "fail" },
]} />`,
  },
  {
    name: "AdviserCard · DegreeProgress",
    file: "features/adviser-card.tsx · degree-progress.tsx",
    live: "panel",
    summary: "Student dashboard panels: the assigned adviser, and earned units against the degree total.",
    props: [
      ["AdviserCard", "name, initials, faculty, email, assignedSince, action?", "action sits in the cream footer."],
      ["DegreeProgress", "program, curriculum, earned, required, action?, children?", "Percent is computed; children is the helper text."],
    ],
    example: `<AdviserCard name="Prof. Ramon Reyes" initials="RR" faculty="Faculty of Computer Studies" email="ramon@example.edu.ph" assignedSince="12 Jun 2024" />
<DegreeProgress program="BS Computer Science" curriculum="2023–2024" earned={56} required={147} />`,
  },
  {
    name: "OverrideDialog",
    file: "features/override-dialog.tsx",
    live: "dialog",
    summary: "Soft-check dialog (e.g. Prerequisite not met). Requires a reason, which you must write to the audit log. Its gold button is the only gold button in the product.",
    props: [
      ["open / onOpenChange", "boolean / (open) => void", "Controlled."],
      ["title / description", "string / ReactNode", "What was violated and for whom."],
      ["onConfirm", "(reason: string) => void", "Called with the trimmed reason; blocked while it is empty."],
    ],
    example: `<OverrideDialog
  open={open} onOpenChange={setOpen}
  title="Prerequisite not met"
  description={<p><b>CSci 34</b> requires <b>CSci 33</b>, not yet passed.</p>}
  onConfirm={(reason) => recordWithOverride(reason)}
/>`,
  },
  {
    name: "AuthLayout · SignInForm",
    file: "features/auth-layout.tsx · sign-in-form.tsx",
    live: "sign-in",
    summary: "Split-screen sign-in page: forest story panel plus the form (email, password, Sign in, OR, Continue with Google).",
    props: [
      ["AuthLayout", "kicker, headline, bullets: { icon; text }[], children", "Left panel copy; children is the form."],
      ["SignInForm", "onSubmit({ email, password, keep }) => void | Promise, onGoogle?, error?, forgotHref? (default /forgot-password)", "Validates with react-hook-form + zod (signInSchema in sign-in-schema.ts): onSubmit only runs with a non-empty, well-formed email and a password, and the button is disabled while a returned Promise runs. Pass credential or account errors from the auth call through error, which shows a red rejection banner."],
    ],
    example: `<AuthLayout kicker="Signing in" headline="The advising file, exactly as your role may see it."
  bullets={[{ icon: <ShieldIcon className="size-4" />, text: "Accounts are provisioned by an administrator." }]}>
  <SignInForm onSubmit={signIn} onGoogle={signInWithGoogle} error={error} />
</AuthLayout>`,
  },
]

function ComponentDoc({ doc }: { doc: Doc }) {
  return (
    <article className="overflow-hidden rounded-md border border-border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3.5">
        <div>
          <h4 className="text-base font-semibold">{doc.name}</h4>
          <code className="font-mono text-[11.5px] text-muted-2">{doc.file}</code>
        </div>
        {doc.live && (
          <a href={`#${doc.live}`} className="text-[13px] font-semibold">
            See live example ↑
          </a>
        )}
      </header>
      <div className="grid gap-4 px-5 py-4">
        <p className="text-sm text-muted-foreground">{doc.summary}</p>
        {doc.props && (
          <dl className="grid gap-x-4 gap-y-2 text-[13px] md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            {doc.props.map(([name, type, note]) => (
              <div key={name} className="contents">
                <dt>
                  <code className="font-mono text-[12.5px] font-medium">{name}</code>
                  <span className="block font-mono text-[11.5px] text-muted-2">{type}</span>
                </dt>
                <dd className="text-muted-foreground">{note}</dd>
              </div>
            ))}
          </dl>
        )}
        <Code>{doc.example}</Code>
      </div>
    </article>
  )
}

function HowToUse() {
  return (
    <>
      <Section
        id="how-import"
        title="Importing"
        description="Import from the path alias. Base pieces live in ui, combinations in features. Icons come from the SAAIS icon set, not lucide-react. Page components must render inside the router."
      >
        <Code>{`import { Button } from "@/components/ui/button"            // base: one file per component
import { StatusBadge } from "@/components/ui/status-badge"
import { Panel } from "@/components/features/panel"            // feature: built from ui pieces
import { BellIcon } from "@/components/icons"                  // icons`}</Code>
      </Section>

      <Section
        id="how-ui"
        title="UI components"
        description="Standalone base components. Each entry shows what it is for, its props, and a copy-ready example."
      >
        {ui.map((d) => (
          <ComponentDoc key={d.name} doc={d} />
        ))}
      </Section>

      <Section
        id="how-features"
        title="Feature components"
        description="Components composed from the base pieces. Use these first when building a screen."
      >
        {features.map((d) => (
          <ComponentDoc key={d.name} doc={d} />
        ))}
      </Section>
    </>
  )
}

export { HowToUse }
