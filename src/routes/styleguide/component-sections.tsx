import * as React from "react";
import {
  AlertIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  GridIcon,
  PlusIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import { AdviserCard } from "@/components/features/adviser-card";
import { ChecklistTermGroup } from "@/components/features/checklist-term-group";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { DegreeProgress } from "@/components/features/degree-progress";
import { FilterBar } from "@/components/features/filter-bar";
import { FormField } from "@/components/features/form-field";
import { GradeDistribution } from "@/components/features/grade-distribution";
import { NotificationBell } from "@/components/features/notification-bell";
import { OverrideDialog } from "@/components/features/override-dialog";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { QuickAccess } from "@/components/features/quick-access";
import { SearchInput } from "@/components/features/search-input";
import { SignInForm } from "@/components/features/sign-in-form";
import { StatGrid } from "@/components/features/stat-tile";
import {
  RecordTabs,
  StudentRecordHeader,
} from "@/components/features/student-record-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/ui/brand-mark";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kicker } from "@/components/ui/kicker";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Caption, Code, Section, Specimen } from "@/routes/styleguide/parts";

const statuses: Status[] = [
  "passed",
  "failed",
  "inc",
  "inc-lapsed",
  "enrolled",
  "dr",
  "na",
  "not-taken",
  "good",
  "delinquent",
  "flagged",
  "active",
  "current",
  "archived",
  "invited",
  "disabled",
];

const advisees = [
  {
    id: "1",
    name: "Maria Isabel Bautista",
    no: "23-1-04412",
    program: "BS Computer Science",
    gwa: "1.58",
    standing: "good" as Status,
    def: "CSci 102",
  },
  {
    id: "2",
    name: "Angelo Cruz",
    no: "22-1-01188",
    program: "BS Computer Science",
    gwa: "4.50",
    standing: "delinquent" as Status,
    def: "CSIT 101, CSci 104",
  },
  {
    id: "3",
    name: "Joshua Lim",
    no: "23-1-02940",
    program: "BS Computer Science",
    gwa: "1.50",
    standing: "good" as Status,
    def: "CSci 102",
  },
];

function ButtonSection() {
  return (
    <Section
      id="button"
      title="Button"
      description="Gold is used for exactly one button in the product: Continue with override. Nothing else competes with it."
    >
      <Specimen className="grid gap-5">
        <div>
          <Caption>Variants</Caption>
          <div className="flex flex-wrap items-center gap-3">
            <Button><PlusIcon /> Record attempt</Button>
            <Button variant="outline"><DownloadIcon /> Export PDF</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Link</Button>
            <Button className="bg-gold text-gold-foreground hover:bg-gold/90">
              Continue with override
            </Button>
          </div>
        </div>
        <div>
          <Caption>Sizes and states</Caption>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large action</Button>
            <Button variant="outline" size="icon" aria-label="Add">
              <PlusIcon />
            </Button>
            <Button>
              <PlusIcon /> With icon
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Specimen>
      <Code>{`import { Button } from "@/components/ui/button"
<Button>Record attempt</Button>
<Button variant="outline" size="sm">Course info</Button>
<Button className="bg-gold text-gold-foreground">Continue with override</Button>`}</Code>
    </Section>
  );
}

function StatusSection() {
  return (
    <Section
      id="status-badge"
      title="Status badge"
      description="Each badge pairs a text word with a leading mark (a dot, or a flag glyph for Delinquent and Flagged), so color is never the only channel. INC and INC lapsed are deliberately distinct: a lapsed INC keeps the status it was given and is only evaluated as 5.00."
    >
      <Specimen className="flex flex-wrap gap-2.5">
        {statuses.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </Specimen>
      <Code>{`import { StatusBadge } from "@/components/ui/status-badge"
<StatusBadge status="passed" />
<StatusBadge status="inc-lapsed" />
<StatusBadge status="dr" />          // Dropped
<StatusBadge status="na" />          // No attendance
<StatusBadge status="delinquent" />  // flag glyph + "Delinquent"`}</Code>
    </Section>
  );
}

function BadgeSection() {
  return (
    <Section
      id="badge"
      title="Badge & kicker"
      description="The generic badge for counts and labels, and the small uppercase kicker used above values and sections."
    >
      <Specimen className="flex flex-wrap items-center gap-3">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Kicker className="ml-3">Cumulative GWA</Kicker>
      </Specimen>
    </Section>
  );
}

function FormSection() {
  const [seg, setSeg] = React.useState("current");
  const [q, setQ] = React.useState("");
  const [f, setF] = React.useState("all");
  return (
    <Section
      id="form"
      title="Form controls"
      description="Inputs and chips use a 4px radius. Labels sit above in 13px semibold, and errors announce as text with role=alert."
    >
      <Specimen className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Text field" htmlFor="sg-text">
            <Input id="sg-text" defaultValue="CSci 132" />
          </FormField>
          <FormField label="Select" htmlFor="sg-select">
            <Select defaultValue="grade_replacement">
              <SelectTrigger id="sg-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grade_replacement">
                  grade_replacement
                </SelectItem>
                <SelectItem value="none">none</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Disabled" htmlFor="sg-dis">
            <Input id="sg-dis" defaultValue="23-1-04412" disabled />
          </FormField>
          <FormField label="Search" htmlFor="sg-search">
            <SearchInput id="sg-search" placeholder="Name or student number" />
          </FormField>
          <FormField
            label="With error"
            htmlFor="sg-err"
            error="Grade must be 1.00–3.00, 5.00, INC, DR or NA."
          >
            <Input id="sg-err" defaultValue="1.10" aria-invalid />
          </FormField>
          <FormField
            label="With hint"
            htmlFor="sg-hint"
            hint="Format YY-S-NNNNN, e.g. 27-1-00999."
          >
            <Input id="sg-hint" placeholder="23-1-04412" />
          </FormField>
        </div>
        <FormField label="Textarea" htmlFor="sg-ta">
          <Textarea
            id="sg-ta"
            placeholder="Required. This is written to the audit log."
          />
        </FormField>
        <div className="flex flex-wrap items-center gap-8">
          <span className="flex items-center gap-2">
            <Checkbox id="sg-c1" defaultChecked />
            <Label htmlFor="sg-c1">Keep me signed in</Label>
          </span>
          <span className="flex items-center gap-2">
            <Checkbox id="sg-c2" />
            <Label htmlFor="sg-c2">Unchecked</Label>
          </span>
          <RadioGroup defaultValue="a" className="flex w-auto gap-6">
            <span className="flex items-center gap-2">
              <RadioGroupItem id="sg-r1" value="a" />
              <Label htmlFor="sg-r1">CSci 33</Label>
            </span>
            <span className="flex items-center gap-2">
              <RadioGroupItem id="sg-r2" value="b" />
              <Label htmlFor="sg-r2">Math 21</Label>
            </span>
          </RadioGroup>
          <ToggleGroup
            type="single"
            value={seg}
            onValueChange={(v) => v && setSeg(v)}
            spacing={1}
            className="rounded-md bg-muted p-1"
          >
            <ToggleGroupItem
              value="current"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Current
            </ToggleGroupItem>
            <ToggleGroupItem
              value="past"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Past
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <Caption>FilterBar (search + select + toggle)</Caption>
          <FilterBar
            search={q}
            onSearchChange={setQ}
            searchLabel="Search advisees"
            searchPlaceholder="Name or student number"
            filterLabel="Standing"
            filter={f}
            onFilterChange={setF}
            filterOptions={[
              { value: "all", label: "All standings" },
              { value: "good", label: "Good standing" },
              { value: "flagged", label: "Flagged" },
            ]}
            toggleOptions={[
              { value: "current", label: "Current" },
              { value: "past", label: "Past" },
            ]}
            toggle={seg}
            onToggleChange={setSeg}
          />
        </div>
      </Specimen>
      <Code>{`<FormField label="Institutional email" htmlFor="email" error={err}>
  <Input id="email" type="email" />
</FormField>
<FilterBar search={q} onSearchChange={setQ} filterOptions={opts} filter={f} onFilterChange={setF} />`}</Code>
    </Section>
  );
}

function NoticeSection() {
  return (
    <Section
      id="alert"
      title="Alert & notices"
      description="Three tones: advisory (an exception to read), confirmed (the invariant held) and blocked (refused by a policy or a lock)."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Alert variant="advisory">
          <AlertIcon />
          <AlertDescription>
            Advisory: an exception the adviser should read before continuing.
          </AlertDescription>
        </Alert>
        <Alert variant="success">
          <ShieldIcon />
          <AlertDescription>
            Confirmed: the invariant held and the write is safe.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertIcon />
          <AlertDescription>
            Blocked: the request was refused by a policy or a lock.
          </AlertDescription>
        </Alert>
      </div>
      <Code>{`<Alert variant="advisory"><AlertIcon /><AlertDescription>Advisory: …</AlertDescription></Alert>
<Alert variant="success"><ShieldIcon /><AlertDescription>Confirmed: …</AlertDescription></Alert>
<Alert variant="destructive"><AlertIcon /><AlertDescription>Blocked: …</AlertDescription></Alert>`}</Code>
    </Section>
  );
}

function PanelSection() {
  return (
    <Section
      id="panel"
      title="Panel & stat tile"
      description="Panels and cards use a 6px radius, a hairline border and no shadow. Stat tiles show a kicker, a large Syne value and a short note."
    >
      <Specimen cream>
        <StatGrid
          items={[
            {
              label: "Cumulative GWA",
              value: "1.58",
              note: "56 counted units",
            },
            {
              label: "Units earned",
              value: "56",
              valueSuffix: "/ 147",
              note: "of 147 required units",
            },
            {
              label: "Academic standing",
              value: "Good",
              note: "12 failed units per term triggers a flag",
            },
            {
              label: "Open INC",
              value: "1",
              note: "Review completion deadlines",
            },
          ]}
        />
        <Panel
          title="Course Recommendations"
          description="Suggested by your adviser; recorded enrollment is separate."
          action={
            <Button variant="outline" size="sm">
              Open checklist
            </Button>
          }
        >
          <p className="py-2 text-center text-muted-foreground">
            No recommendations yet.
          </p>
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdviserCard
            name="Prof. Ramon Reyes"
            initials="RR"
            faculty="Faculty of Computer Studies"
            email="ramon.reyes@example.edu.ph"
            assignedSince="12 Jun 2024"
            action={
              <Button variant="outline" size="sm">
                View assignment history
              </Button>
            }
          />
          <DegreeProgress
            program="BS Computer Science"
            curriculum="2023–2024"
            earned={56}
            required={147}
            action={
              <Button variant="outline" size="sm">
                Open checklist
              </Button>
            }
          >
            View the checklist to see direct credit, elective mappings and
            equivalency decisions.
          </DegreeProgress>
        </div>
      </Specimen>
      <Code>{`<StatGrid items={[{ label: "Cumulative GWA", value: "1.58", note: "56 counted units" }]} />
<Panel title="Course Recommendations" description="…" action={<Button>…</Button>}>…</Panel>
<AdviserCard name="…" initials="RR" faculty="…" email="…" assignedSince="…" />
<DegreeProgress program="…" curriculum="…" earned={56} required={147} />`}</Code>
    </Section>
  );
}

function TableSection() {
  return (
    <Section
      id="table"
      title="Table"
      description="Cream header row with kicker-style captions, 11px row padding and hairline rules. Below 768px rows stack into labelled cards."
    >
      <Specimen flush cream>
        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              {["Student", "Program", "GWA", "Standing"].map((h) => (
                <TableHead
                  key={h}
                  className="text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {advisees.map((a) => (
              <TableRow key={a.id}>
                <TableCell label="Student">
                  <b className="block font-semibold">{a.name}</b>
                  <span className="font-mono text-xs text-muted-foreground">
                    {a.no}
                  </span>
                </TableCell>
                <TableCell label="Program">{a.program}</TableCell>
                <TableCell label="GWA" className="font-mono">{a.gwa}</TableCell>
                <TableCell label="Standing">
                  <StatusBadge status={a.standing} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Specimen>
      <Caption>DataTablePanel (panel + responsive table)</Caption>
      <Specimen cream>
        <DataTablePanel
          title="Advisees"
          description="3 matching sample records"
          rows={advisees}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Student",
              cell: (r) => (
                <>
                  <b className="block font-semibold">{r.name}</b>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.no}
                  </span>
                </>
              ),
            },
            { header: "GWA", numeric: true, cell: (r) => r.gwa },
            {
              header: "Standing",
              cell: (r) => <StatusBadge status={r.standing} />,
            },
            { header: "Deficiencies", cell: (r) => r.def },
          ]}
          footer="Sample records for presentation"
        />
      </Specimen>
      <Code>{`<Table responsive>          // stacks into labelled cards below 768px
  <TableBody><TableRow><TableCell label="Student">…</TableCell></TableRow></TableBody>
</Table>

<DataTablePanel title="Advisees" columns={cols} rows={rows} rowKey={(r) => r.id} />`}</Code>
    </Section>
  );
}

function TabsSection() {
  const [tab, setTab] = React.useState("checklist");
  return (
    <Section
      id="tabs"
      title="Tabs & breadcrumb"
      description="Record tabs use an underline with a gold active indicator. The breadcrumb trail lives in the topbar."
    >
      <Specimen className="grid gap-6">
        <RecordTabs
          tabs={[
            { value: "checklist", label: "Checklist" },
            { value: "grades", label: "Grades" },
            { value: "curriculum", label: "Curriculum" },
            { value: "advising", label: "Advising" },
            { value: "notes", label: "Notes" },
            { value: "audit", label: "Audit log" },
          ]}
          value={tab}
          onValueChange={setTab}
        />
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Default tabs</TabsTrigger>
            <TabsTrigger value="b">Second</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="text-sm text-muted-foreground">
            Base shadcn tabs content.
          </TabsContent>
          <TabsContent value="b" className="text-sm text-muted-foreground">
            Second panel.
          </TabsContent>
        </Tabs>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#tabs">Advising workspace</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">
                Advisees
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Specimen>
      <Code>{`<RecordTabs tabs={tabs} value={tab} onValueChange={setTab} />`}</Code>
    </Section>
  );
}

function ProgressSection() {
  return (
    <Section
      id="progress"
      title="Progress & grade distribution"
      description="Forest fills for passing bands, red for failing, olive-gold for INC/DR/NA."
    >
      <Specimen className="grid gap-6">
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>56 units earned</span>
            <span>38% of 147 units</span>
          </div>
          <Progress value={38} className="h-2" aria-label="Degree progress" />
        </div>
        <GradeDistribution
          bands={[
            { label: "1.00–1.50", percent: 33, detail: "285 grades" },
            {
              label: "1.75–2.25",
              percent: 40,
              detail: "346 grades",
              tone: "soft",
            },
            { label: "5.00", percent: 5, detail: "43 grades", tone: "fail" },
            {
              label: "INC / DR / NA",
              percent: 3,
              detail: "26 grades",
              tone: "inc",
            },
          ]}
        />
      </Specimen>
      <Code>{`<GradeDistribution bands={[{ label: "5.00", percent: 5, tone: "fail" }]} />`}</Code>
    </Section>
  );
}

function AvatarSection() {
  return (
    <Section
      id="avatar"
      title="Avatar & record header"
      description="Initials on forest; gold only inside the dark sidebar."
    >
      <Specimen className="grid gap-6">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary text-primary-foreground">
              RR
            </AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              RR
            </AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback className="bg-primary text-primary-foreground">
              MI
            </AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback className="bg-gold text-gold-foreground">
              MI
            </AvatarFallback>
          </Avatar>
        </div>
        <StudentRecordHeader
          name="Maria Isabel Bautista"
          initials="MI"
          studentNumber="23-1-04412"
          program="BS Computer Science"
          yearLabel="2nd Year"
          email="maria.bautista@example.edu.ph"
          standing="good"
        />
      </Specimen>
      <Code>{`<StudentRecordHeader name="…" initials="MI" studentNumber="23-1-04412" standing="good" … />`}</Code>
    </Section>
  );
}

function DialogSection() {
  const [open, setOpen] = React.useState(false);
  const [last, setLast] = React.useState<string>();
  return (
    <Section
      id="dialog"
      title="Dialog"
      description="Forest scrim, 6px radius, Syne title. The soft-check override dialog requires a reason, which is written to the audit log."
    >
      <Specimen className="flex flex-wrap items-center gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add course</DialogTitle>
              <DialogDescription>
                Choose a course to add to Ana Reyes&apos;s 2026–2027 · 1st
                Semester record.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button>Add course</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          className="bg-gold text-gold-foreground hover:bg-gold/90"
          onClick={() => setOpen(true)}
        >
          Prerequisite override
        </Button>
        {last && (
          <span className="text-sm text-muted-foreground">
            Override reason recorded: “{last}”
          </span>
        )}
        <OverrideDialog
          open={open}
          onOpenChange={setOpen}
          title="Prerequisite not met"
          description={
            <>
              <p>
                <b>CSci 34</b> requires <b>CSci 33</b>, not yet passed.
              </p>
              <p>
                For Ana Reyes. Continue to record it anyway with an override, or
                cancel.
              </p>
            </>
          }
          onConfirm={(reason) => {
            setLast(reason);
            setOpen(false);
          }}
        />
      </Specimen>
      <Code>{`<OverrideDialog open={open} onOpenChange={setOpen} title="Prerequisite not met"
  description={…} onConfirm={(reason) => save(reason)} />`}</Code>
    </Section>
  );
}

function PopoverSection() {
  return (
    <Section
      id="popover"
      title="Popover & notifications"
      description="The topbar bell opens a 360px popover with unread dots in gold."
    >
      <Specimen className="flex flex-wrap items-center gap-6">
        <NotificationBell
          allHref="/styleguide"
          onMarkAllRead={() => undefined}
          items={[
            {
              id: "1",
              title: "Curriculum transfer awaiting review",
              time: "3 hours ago",
              unread: true,
            },
            {
              id: "2",
              title: "Students without an adviser",
              time: "Yesterday",
              unread: true,
            },
            {
              id: "3",
              title: "Grade encoding period closes soon",
              time: "4 days ago",
            },
          ]}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Base popover</Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-4 text-sm">
            Any content goes here.
          </PopoverContent>
        </Popover>
      </Specimen>
      <Code>{`<NotificationBell items={items} allHref="/notifications" onMarkAllRead={markAll} />`}</Code>
    </Section>
  );
}

function SidebarSection() {
  const items = [
    { label: "Dashboard", icon: GridIcon, active: false },
    { label: "Curriculum checklist", icon: CheckIcon, active: true },
    { label: "Enrollment history", icon: ClockIcon, active: false },
    { label: "My profile", icon: UserIcon, active: false },
  ];
  return (
    <Section
      id="sidebar"
      title="Sidebar"
      description="Fixed 250px forest sidebar with a gold left-edge active indicator, kicker group labels and an account footer. A Sheet drawer below 768px. Shown static here; AppShell wires it to the router."
    >
      <Specimen flush className="w-fit">
        <SidebarProvider className="min-h-0 w-62.5">
          <Sidebar collapsible="none" className="h-90">
            <SidebarHeader className="px-5 pt-5">
              <BrandMark
                caption="Student portal"
                className="text-sidebar-foreground"
              />
            </SidebarHeader>
            <SidebarContent className="px-3">
              <SidebarGroup>
                <SidebarGroupLabel>Student</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {items.map(({ label, icon: Icon, active }) => (
                      <SidebarMenuItem key={label}>
                        <SidebarMenuButton isActive={active}>
                          <Icon aria-hidden />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </Specimen>
      <Code>{`<AppShell
  sidebar={{ portalLabel: "Student portal", sections, user, onSignOut }}
  crumbs={[{ label: "My academic journey", to: "/" }, { label: "Dashboard" }]}
  topbarTrailing={<NotificationBell … />}
>{children}</AppShell>`}</Code>
    </Section>
  );
}

function PageSection() {
  return (
    <Section
      id="page-heading"
      title="Page heading & quick access"
      description="Syne 30px title, muted subtitle and primary actions on the right, followed by shortcut buttons."
    >
      <Specimen cream>
        <PageHeading
          title="Programs with a clear structure."
          subtitle="Each degree program owns its curriculum versions."
          actions={<Button>New program</Button>}
        />
        <QuickAccess
          links={[
            { label: "Open checklist", to: "/styleguide" },
            { label: "Review grades", to: "/styleguide" },
            { label: "Enrollment history", to: "/styleguide" },
          ]}
        />
        <p className="text-xs text-muted-2">
          <BellIcon className="mr-1 inline size-3.5" />
          Sample records for presentation · Reference date: 19 September 2026
        </p>
      </Specimen>
      <Code>{`<PageHeading title="…" subtitle="…" actions={<Button>New program</Button>} />
<QuickAccess links={[{ label: "Open checklist", to: "/student/checklist" }]} />`}</Code>
    </Section>
  );
}

function ChecklistSection() {
  return (
    <Section
      id="checklist"
      title="Checklist term group"
      description="A collapsible semester block with passed units, total units and semester GWA, over a requirement table."
    >
      <Specimen cream>
        <ChecklistTermGroup
          title="Year 1 · Semester 1"
          description="Curriculum position · course availability depends on the school term."
          passedUnits={27}
          totalUnits={27}
          semesterGwa="1.56"
          rows={[
            {
              code: "CSIT 100",
              title: "Introduction to Computing",
              unitsEarned: 3,
              unitsRequired: 3,
              status: "passed",
              source: "Direct",
              sourceDetail: "grade 1.50",
              attempts: 1,
            },
            {
              code: "CSci 180",
              title: "Pre-calculus for CS",
              unitsEarned: 3,
              unitsRequired: 3,
              status: "passed",
              source: "Direct",
              sourceDetail: "grade 2.00",
              attempts: 3,
            },
            {
              code: "CSci 102",
              title: "Data Structures",
              unitsEarned: 0,
              unitsRequired: 3,
              status: "inc",
              source: "—",
              attempts: 1,
            },
          ]}
        />
      </Specimen>
      <Code>{`<ChecklistTermGroup title="Year 1 · Semester 1" passedUnits={27} totalUnits={27} semesterGwa="1.56" rows={rows} />`}</Code>
    </Section>
  );
}

function AuthSection() {
  return (
    <Section
      id="sign-in"
      title="Sign-in"
      description="SignInForm sits inside AuthLayout, a split screen with a forest story panel on the left and a cream form column on the right."
    >
      <Specimen cream className="flex justify-center">
        <div className="w-full max-w-105">
          <SignInForm
            onSubmit={() => undefined}
            error="Sign-in was rejected: j.delacruz@gmail.com is not a registered institutional profile."
          />
        </div>
      </Specimen>
      <Code>{`<AuthLayout kicker="Signing in" headline="…" bullets={bullets}>
  <SignInForm onSubmit={signIn} error={err} />
</AuthLayout>`}</Code>
    </Section>
  );
}

function ComponentSections() {
  return (
    <>
      <ButtonSection />
      <StatusSection />
      <BadgeSection />
      <FormSection />
      <NoticeSection />
      <PanelSection />
      <TableSection />
      <TabsSection />
      <ProgressSection />
      <AvatarSection />
      <DialogSection />
      <PopoverSection />
      <SidebarSection />
      <PageSection />
      <ChecklistSection />
      <AuthSection />
    </>
  );
}

export { ComponentSections };
