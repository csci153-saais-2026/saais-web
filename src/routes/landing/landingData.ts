import type { Status } from '@/components/ui/status-badge'

export interface NavLinkItem {
  label: string
  href: string
  hasDropdown?: boolean
}

export const NAV_LEFT_LINKS: readonly NavLinkItem[] = [
  { label: 'Platform', href: '#platform', hasDropdown: true },
  { label: 'Portals', href: '#portals', hasDropdown: true },
  { label: 'Rules engine', href: '#rules-engine' },
]

export const NAV_RIGHT_LINKS: readonly NavLinkItem[] = [
  { label: 'Compliance', href: '#compliance' },
  { label: 'Documentation', href: '/docs' },
]

export interface HeroChecklistRow {
  code: string
  title: string
  units: string
  term: string
  status: Status
  grade: string
  provenance?: string
}

export const HERO_CONTENT = {
  kicker: 'Student Academic Advising Information System',
  headline: 'Advising that leaves a record.',
  subhead:
    'SAAIS replaces the spreadsheet-and-photocopy advising file with one system of record: every checklist slot, every retake, every prerequisite override, and who approved it.',
  primaryCta: 'Request a walkthrough',
  secondaryCta: 'Read the API contract',
  secondaryCtaHref: '/docs/openapi',
  complianceMarks: [
    { icon: 'shield', label: 'RA 10173 aligned' },
    { icon: 'check', label: 'WCAG 2.1 AA' },
    { icon: 'lock', label: 'Row-level security' },
    { icon: 'file', label: 'Immutable audit trail' },
  ] as const,
} as const

export const HERO_CHECKLIST_META = {
  title: 'Curriculum checklist · Year 2, First Semester',
  subtitle: '[Student name] · BS Computer Science · Curriculum version 2023–2024',
  badges: ['Adviser assigned', '12 of 18 units earned'] as const,
  footerNote:
    'Every filled slot carries its provenance — a direct attempt, an equivalency decision, or an elective mapping — and the name of whoever approved it.',
  termGwa: '1.58',
  cumulativeGwa: '1.68',
} as const

export const HERO_CHECKLIST_ROWS: readonly HeroChecklistRow[] = [
  {
    code: 'CS 101',
    title: 'Introduction to Computing',
    units: '3.0',
    term: 'AY 2024–2025 · 1st Sem',
    status: 'passed',
    grade: '1.25',
  },
  {
    code: 'MATH 21',
    title: 'Calculus I',
    units: '5.0',
    term: 'AY 2024–2025 · 1st Sem',
    status: 'passed',
    grade: '2.00',
  },
  {
    code: 'CS 121',
    title: 'Data Structures',
    units: '3.0',
    term: 'AY 2024–2025 · 2nd Sem',
    status: 'inc',
    grade: 'INC',
  },
  {
    code: 'CS 121',
    title: 'Data Structures — retake',
    units: '3.0',
    term: 'AY 2025–2026 · 1st Sem',
    status: 'passed',
    grade: '1.75',
    provenance: '↳ grade_replacement · the earlier INC is superseded, not erased',
  },
  {
    code: 'CS 132',
    title: 'Algorithms',
    units: '3.0',
    term: 'AY 2025–2026 · 1st Sem',
    status: 'enrolled',
    grade: '—',
    provenance: '↳ prerequisite override · approved by [adviser name]',
  },
  {
    code: 'GE ELEC 2',
    title: 'Open elective slot',
    units: '3.0',
    term: 'AY 2025–2026 · 1st Sem',
    status: 'passed',
    grade: '1.75',
    provenance: '↳ elective mapping from PHILO 12 · 3.0 units earned',
  },
  {
    code: 'STAT 101',
    title: 'Statistics',
    units: '3.0',
    term: 'Not yet taken',
    status: 'not-taken',
    grade: '—',
  },
]

export interface PortalCard {
  id: 'student' | 'adviser' | 'admin'
  icon: 'user' | 'users' | 'cog'
  title: string
  description: string
  bullets: readonly string[]
}

export const PORTALS_SECTION = {
  kicker: 'Three portals, one record',
  title: 'One advising file, read three different ways.',
  subhead:
    'Row-level security decides what each role can see. Advising notes and attempt remarks never reach a student session — not by convention, by policy in the database.',
} as const

export const PORTAL_CARDS: readonly PortalCard[] = [
  {
    id: 'student',
    icon: 'user',
    title: 'For students',
    description:
      'Open the checklist you were handed on paper — but current. See which slots are filled, which retake counts, and what the lapsed INC does to your GWA before the term ends.',
    bullets: [
      'Curriculum checklist with live slot status',
      'Term and cumulative GWA, unit-weighted',
      'Full attempt history across retakes',
      'Your assigned adviser, always current',
    ],
  },
  {
    id: 'adviser',
    icon: 'users',
    title: 'For advisers',
    description:
      'Record the attempt, see the prerequisite warning, and decide — with the override written to an audit entry that nobody can quietly edit later.',
    bullets: [
      'Advisee roster with delinquency and INC alerts',
      'Soft prerequisite check with Continue / Cancel',
      'Elective mapping and transfer equivalency',
      'Dated, append-only advising notes',
    ],
  },
  {
    id: 'admin',
    icon: 'cog',
    title: 'For administrators',
    description:
      'Own the catalog: programs, versioned curricula, prerequisite links, repeatable rules, term locks — and read the audit log the registrar will ask you for.',
    bullets: [
      'Provision accounts; no public sign-up',
      'Versioned curricula with delinquency thresholds',
      'School terms, offerings, by-request flags',
      'Read-only immutable audit viewer',
    ],
  },
]

export const PLATFORM_STATEMENT =
  'SAAIS keeps the whole advising office working from one file — so a student is never told two different things about the same requirement, and no decision has to be reconstructed from memory.'

export type FeatureTabId = 'Checklist' | 'Rules engine' | 'Audit trail'

export interface FeatureTabBullet {
  title: string
  description: string
}

export interface FeatureTabPreviewRow {
  code: string
  title: string
  units: string
  status: Status
  statusLabel: string
  outcome: string
}

export interface FeatureTabItem {
  id: FeatureTabId
  label: FeatureTabId
  heading: string
  description: string
  bullets: readonly FeatureTabBullet[]
  linkLabel: string
  linkHref: string
  panelTitle: string
  panelRows: readonly FeatureTabPreviewRow[]
  panelFooterNote: string
  panelMetricLabel: string
  panelMetricValue: string
}

export const FEATURE_TABS_SECTION = {
  title: 'Confidence and clarity for the whole advising office, in one record.',
} as const

export const FEATURE_TABS: readonly FeatureTabItem[] = [
  {
    id: 'Checklist',
    label: 'Checklist',
    heading: 'The checklist resolves itself.',
    description:
      'A slot is satisfied by a direct attempt, an equivalency decision, a discontinued-course equivalency, or an elective mapping. The checklist shows which — not just a tick.',
    bullets: [
      {
        title: 'Versioned curricula',
        description: 'Students stay bound to the curriculum version they entered under.',
      },
      {
        title: 'Positional vs. calendar terms',
        description: 'Year 1 / Term 1 is a slot; AY 2025–2026 1st Sem is a date.',
      },
      {
        title: 'Provenance on every slot',
        description:
          'A filled slot names what filled it — attempt, equivalency or elective mapping — and who approved it.',
      },
    ],
    linkLabel: 'Learn about the checklist',
    linkHref: '#workflow',
    panelTitle: 'How the engine counts an attempt',
    panelRows: [
      {
        code: 'CS 121',
        title: 'Data Structures',
        units: '3.0',
        status: 'inc',
        statusLabel: 'INC',
        outcome: 'superseded',
      },
      {
        code: 'CS 121',
        title: 'Data Structures — retake',
        units: '3.0',
        status: 'passed',
        statusLabel: '1.75',
        outcome: 'counts',
      },
      {
        code: 'PE 3',
        title: 'Team Sports',
        units: '2.0',
        status: 'failed',
        statusLabel: '5.00',
        outcome: 'counts',
      },
      {
        code: 'STAT 101',
        title: 'Statistics',
        units: '3.0',
        status: 'inc-lapsed',
        statusLabel: 'INC lapsed',
        outcome: 'counts',
      },
    ],
    panelFooterNote:
      'Lapsed INC is never rewritten to failed — it is evaluated as 5.00 for GWA and delinquency only.',
    panelMetricLabel: 'Cumulative GWA',
    panelMetricValue: '2.14',
  },
  {
    id: 'Rules engine',
    label: 'Rules engine',
    heading: 'Academic rules enforced in the database.',
    description:
      'Repeatable course policies, lapsed INC evaluation, zero-gap adviser reassignments, and term locks run as transactional rules — never manual spreadsheet workarounds.',
    bullets: [
      {
        title: 'Soft prerequisite checks',
        description:
          'Strict prerequisites warn at enrollment; advisers may continue with prerequisite_override = true.',
      },
      {
        title: 'Scheduled INC lapse',
        description:
          'A daily pg_cron job evaluates INCs past their one-year deadline as 5.00 for GWA and delinquency.',
      },
      {
        title: 'Term locks & offerings',
        description:
          'Locked school terms refuse new attempts while keeping historical records intact.',
      },
    ],
    linkLabel: 'Explore the rules engine',
    linkHref: '#rules-engine',
    panelTitle: 'Rule constraints in the advising schema',
    panelRows: [
      {
        code: 'REPEAT',
        title: 'grade_replacement',
        units: '3.0',
        status: 'passed',
        statusLabel: 'Latest pass',
        outcome: 'enforced',
      },
      {
        code: 'CREDIT',
        title: 'additional_credit',
        units: '3.0',
        status: 'passed',
        statusLabel: 'Stacks',
        outcome: 'enforced',
      },
      {
        code: 'PREREQ',
        title: 'prerequisite_override',
        units: '3.0',
        status: 'inc',
        statusLabel: 'Soft check',
        outcome: 'audited',
      },
      {
        code: 'TERM',
        title: 'Locked school term',
        units: '—',
        status: 'not-taken',
        statusLabel: 'Read-only',
        outcome: 'blocked',
      },
    ],
    panelFooterNote:
      'Every rule corresponds to a documented operation in the OpenAPI contract and a database constraint.',
    panelMetricLabel: 'Core entities',
    panelMetricValue: '18',
  },
  {
    id: 'Audit trail',
    label: 'Audit trail',
    heading: 'Every override and grade change leaves an immutable entry.',
    description:
      'The audit table rejects UPDATE and DELETE outright. Server-derived actor IDs and timestamps record who approved every exception.',
    bullets: [
      {
        title: 'Append-only by policy',
        description:
          'Database rules prevent edits or deletions to historical audit rows.',
      },
      {
        title: 'Same-transaction writes',
        description:
          'Prerequisite overrides, grade flags, and reassignments commit alongside their audit entry.',
      },
      {
        title: 'Registrar-ready viewer',
        description:
          'Filter by actor, student, or action without exposing private advising notes to students.',
      },
    ],
    linkLabel: 'View compliance commitments',
    linkHref: '#compliance',
    panelTitle: 'Append-only audit log entries',
    panelRows: [
      {
        code: 'OVERRIDE',
        title: 'CS 132 · prerequisite_override = true',
        units: '3.0',
        status: 'enrolled',
        statusLabel: 'Recorded',
        outcome: 'immutable',
      },
      {
        code: 'ELECTIVE',
        title: 'PHILO 12 → GE ELEC 2',
        units: '3.0',
        status: 'passed',
        statusLabel: 'Mapped',
        outcome: 'immutable',
      },
      {
        code: 'REASSIGN',
        title: 'Zero-gap adviser handoff',
        units: '—',
        status: 'active',
        statusLabel: 'Committed',
        outcome: 'immutable',
      },
      {
        code: 'MUTATION',
        title: 'UPDATE / DELETE on audit_log',
        units: '—',
        status: 'failed',
        statusLabel: 'Rejected',
        outcome: 'blocked',
      },
    ],
    panelFooterNote:
      'Actor identity and timestamp are derived server-side in the same transaction as the academic write.',
    panelMetricLabel: 'Audit edits allowed',
    panelMetricValue: '0',
  },
]

export const PREREQUISITE_ENGINE_SECTION = {
  kicker: 'The prerequisite engine',
  title: 'Warn the adviser. Never block the judgement.',
  subhead:
    'Strict prerequisites are checked at enrollment, but SAAIS is a soft-check system: the adviser may continue, and the continuation is the thing that gets recorded.',
  dialogTitle: 'Prerequisite not satisfied',
  dialogStudent: '[Student name]',
  dialogMissingCourse: 'CS 121 Data Structures',
  dialogTargetCourse: 'CS 132 Algorithms',
  dialogAuditLine: 'Audited · [adviser]@[institution].edu.ph',
  dialogCancelLabel: 'Cancel',
  dialogContinueLabel: 'Continue with override',
  linkLabel: 'Explore the three portals',
  linkHref: '#portals',
} as const

export const TESTIMONIAL_PLACEHOLDER = {
  quote:
    '[Placeholder quote — replace with a real pilot adviser.] The override dialog changed the conversation. We stopped arguing about whether a student was allowed in, and started reading who decided and why.',
  initials: 'RC',
  author: '[Adviser name]',
  role: '[Title] · [Department], [Partner University]',
  notice: 'Unattributed by design. SAAIS has no pilot results to quote yet, and will not invent any.',
} as const

export interface TrustBadgeItem {
  icon: 'shield' | 'check' | 'lock'
  title: string
  description: string
}

export const TRUST_BADGES_SECTION = {
  kicker: 'What the build commits to',
} as const

export const TRUST_BADGES: readonly TrustBadgeItem[] = [
  {
    icon: 'shield',
    title: 'Aligned to RA 10173',
    description:
      'Grades, enrollment records and advising notes are treated as sensitive personal information under the Philippine Data Privacy Act.',
  },
  {
    icon: 'check',
    title: 'Built to WCAG 2.1 AA',
    description:
      'Status is never colour alone; every badge carries a label and a shape. Full keyboard paths, including the override dialog. Audited in Phase 4.',
  },
  {
    icon: 'lock',
    title: 'Row-level security, append-only audit',
    description:
      'Role boundaries live in the database, not in application discipline. The audit table rejects UPDATE and DELETE outright.',
  },
]

export const BIG_NUMBER_SECTION = {
  value: '18',
  caption:
    'core entities modelled in the advising schema — the whole advising record, not a subset of it',
  stats: [
    { value: '1.00–5.00', label: 'grading scale, in discrete 0.25 steps' },
    { value: '5', label: 'workflow phases from catalog to audit' },
    { value: '0', label: 'gaps allowed in adviser continuity' },
  ] as const,
} as const

export type WorkflowStepId = 'Provision' | 'Advise' | 'Record' | 'Resolve' | 'Audit'

export interface WorkflowWriteItem {
  entity: string
  description: string
}

export interface WorkflowStep {
  id: WorkflowStepId
  stepNumber: number
  label: WorkflowStepId
  description: string
  writes: readonly WorkflowWriteItem[]
}

export const WORKFLOW_SECTION = {
  title: 'From a name on a list to a signed audit entry.',
  defaultStep: 'Record' as WorkflowStepId,
} as const

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    id: 'Provision',
    stepNumber: 1,
    label: 'Provision',
    description:
      'Admin creates the profile and role. Google sign-in is rejected server-side unless the email is pre-registered.',
    writes: [
      {
        entity: 'profile',
        description: 'pre-registered account with institutional email and status = invited',
      },
      {
        entity: 'role_assignment',
        description: 'scoped role grants across student, adviser, staff, head, dean, or admin',
      },
      {
        entity: 'audit entry',
        description: 'written with the provisioning actor and timestamp',
      },
    ],
  },
  {
    id: 'Advise',
    stepNumber: 2,
    label: 'Advise',
    description:
      "The adviser opens the advisee's 360 view: checklist, grades, history, advising notes.",
    writes: [
      {
        entity: 'adviser_assignment',
        description: 'continuous, zero-gap assignment linking student and adviser',
      },
      {
        entity: 'advising_note',
        description: 'dated, append-only note hidden from student sessions by RLS',
      },
      {
        entity: 'audit entry',
        description: 'records any reassignment or advising action',
      },
    ],
  },
  {
    id: 'Record',
    stepNumber: 3,
    label: 'Record',
    description:
      'An attempt is bound to a course offering. Strict prerequisites soft-check; the adviser may continue, and the continuation is what gets written.',
    writes: [
      {
        entity: 'attempt',
        description: 'one row, bound to an offering in an unlocked school term',
      },
      {
        entity: 'prerequisite_override',
        description: 'set true only when the adviser continues past the warning',
      },
      {
        entity: 'audit entry',
        description: "written in the same transaction, under the adviser's name",
      },
    ],
  },
  {
    id: 'Resolve',
    stepNumber: 4,
    label: 'Resolve',
    description:
      'INC resolutions, elective mappings and equivalency decisions land as their own auditable rows.',
    writes: [
      {
        entity: 'elective_mapping',
        description: 'maps an enrolled course into an open elective slot with actual units',
      },
      {
        entity: 'course_equivalency',
        description: 'one-to-one equivalency decision satisfying a destination slot',
      },
      {
        entity: 'audit entry',
        description: 'captures the approving adviser and resolution details',
      },
    ],
  },
  {
    id: 'Audit',
    stepNumber: 5,
    label: 'Audit',
    description:
      'The registrar reads an append-only log the application itself cannot update or delete.',
    writes: [
      {
        entity: 'audit_log',
        description: 'immutable, read-only history of overrides, grades, and role changes',
      },
      {
        entity: 'export',
        description: 'auditable student record and checklist summary for registrar review',
      },
    ],
  },
]

export interface RulesEngineCard {
  icon: 'layers' | 'clock' | 'swap' | 'node' | 'check' | 'lock'
  title: string
  description: string
}

export const RULES_ENGINE_SECTION = {
  kicker: 'The rules engine',
  title: 'Every exception the registrar argues about, written down once.',
  subhead:
    'These are not settings buried in a form. Each rule is a documented operation in the OpenAPI contract and a constraint in the database.',
} as const

export const RULES_ENGINE_CARDS: readonly RulesEngineCard[] = [
  {
    icon: 'layers',
    title: 'Repeatable types',
    description:
      'grade_replacement keeps only the most recent passed attempt; additional_credit stacks every pass. A later failure never reverts a course already passed.',
  },
  {
    icon: 'clock',
    title: 'Lapsed INC recompute',
    description:
      'A daily pg_cron job re-evaluates INCs past their one-year deadline, so a GWA changes with the calendar even when no row was edited.',
  },
  {
    icon: 'swap',
    title: 'Zero-gap reassignment',
    description:
      'The incoming assignment starts the day the outgoing one ends — enforced in one transaction and backstopped by a database constraint.',
  },
  {
    icon: 'node',
    title: 'Elective mapping',
    description:
      'An adviser maps a real enrolled course into an open elective slot. The checklist shows actual units earned against the nominal slot.',
  },
  {
    icon: 'check',
    title: 'Transfer equivalency',
    description:
      'One-to-one decisions let a passed course from the old curriculum satisfy a destination slot without re-triggering a GWA recompute.',
  },
  {
    icon: 'lock',
    title: 'Term locks & by-request',
    description:
      'Locked school terms refuse new attempts; by-request offerings stay visible to advisers without appearing as scheduled sections.',
  },
]

export type RoadmapStatus = 'Built' | 'Planned'

export interface RoadmapPhase {
  phase: string
  status: RoadmapStatus
  title: string
  description: string
}

export const ROADMAP_SECTION = {
  kicker: 'Roadmap',
  title: 'Delivered in five phases, not one big launch.',
  subhead:
    'Phases 1 to 3 are built in the specification and the mockup set. Phases 4 and 5 are planned, and are drawn as planned — nothing here is deployed.',
} as const

export const ROADMAP_PHASES: readonly RoadmapPhase[] = [
  {
    phase: 'Phase 1',
    status: 'Built',
    title: 'Foundation & data engine',
    description: 'Contract, schema, RLS, admin catalog',
  },
  {
    phase: 'Phase 2',
    status: 'Built',
    title: 'Advising & checklists',
    description: 'Assignments, attempts, GWA, portals',
  },
  {
    phase: 'Phase 3',
    status: 'Built',
    title: 'Exceptions & rules',
    description: 'INC lapse, electives, equivalencies, notes',
  },
  {
    phase: 'Phase 4',
    status: 'Planned',
    title: 'Audit & compliance',
    description: 'Audit viewer, PDF exports, WCAG, E2E',
  },
  {
    phase: 'Phase 5',
    status: 'Planned',
    title: 'Enhancements',
    description: 'Prerequisite DAG, what-if simulator, AI assistant',
  },
]

export const CLOSING_CTA = {
  title: 'A record your registrar can read starts here.',
  subhead:
    'Bring a curriculum version and a de-identified student history to a 45-minute session with your registrar and one adviser. You will see the checklist it produces and the audit entries it writes.',
  buttonLabel: 'Request a walkthrough',
  contactEmail: '[advising@your-institution.edu.ph]',
} as const

export interface FooterLink {
  label: string
  href: string
}

export interface FooterColumn {
  title: string
  links: readonly FooterLink[]
}

export const FOOTER_BRAND = {
  name: 'SAAIS',
  description:
    "Student Academic Advising Information System. Built for institutions that must be able to explain every decision in a student's file.",
} as const

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Curriculum checklists', href: '#features' },
      { label: 'GWA engine', href: '#features' },
      { label: 'Rules engine', href: '#rules-engine' },
      { label: 'Audit trail', href: '#features' },
      { label: 'Exports', href: '#roadmap' },
    ],
  },
  {
    title: 'Portals',
    links: [
      { label: 'Student', href: '/login' },
      { label: 'Adviser', href: '/login' },
      { label: 'Administrator', href: '/login' },
      { label: 'API documentation', href: '/docs' },
    ],
  },
  {
    title: 'Compliance',
    links: [
      { label: 'Data Privacy Act (RA 10173)', href: '#compliance' },
      { label: 'WCAG 2.1 AA', href: '#compliance' },
      { label: 'Security model', href: '#compliance' },
      { label: 'Data retention', href: '#compliance' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'About the team', href: '#roadmap' },
      { label: 'Release notes', href: '#release-notes' },
      { label: 'Open questions', href: '/docs' },
      { label: 'Contact', href: '#contact' },
    ],
  },
]

export const FOOTER_NEWSLETTER = {
  kicker: 'Release notes',
  description:
    'Get the phase notes when they are published. Specification changes only — no marketing.',
  placeholder: 'you@[institution].edu.ph',
  buttonLabel: 'View release notes',
  signInNote:
    "Looking for your institution's sign-in? Accounts are provisioned by an administrator — ask your adviser for the link.",
} as const

export const FOOTER_LEGAL = {
  copyright: '© 2026 SAAIS Project Team · [Institution]. All rights reserved.',
  links: ['Privacy notice', 'Data retention', 'Accessibility statement', 'Status'] as const,
} as const
