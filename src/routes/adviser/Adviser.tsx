import { lazy, type ReactNode } from "react"
import { Link, Navigate, Route, Routes, useParams } from "react-router"
import { AdviserLayout } from "./AdviserLayout"
import { SampleFooter } from "@/components/features/sample-footer"
import { StudentRecordHeader } from "@/components/features/student-record-header"
import { FormField } from "@/components/features/form-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { student } from "@/mocks/adviser.mock"

const pages = {
  dashboard: lazy(() => import("./dashboard/AdviserDashboard")),
  advisees: lazy(() => import("./advisees/AdviseesPage")),
  "encode-grades": lazy(() => import("./record-grades/AdviserEncodeGrades")),
  "import-grades": lazy(() => import("./import-grades/AdviserImportGrades")),
  "grade-flags": lazy(() => import("./grade-flags/AdviserGradeFlags")),
  notifications: lazy(() => import("./notifications/AdviserNotifications")),
}

const detailPages = {
  checklist: lazy(() => import("./advisees/checklist/AdviseeChecklist")),
  grades: lazy(() => import("./advisees/grades/AdviseeGradesPage")),
  curriculum: lazy(() => import("./advisees/curriculum/AdviseeCurriculum")),
  advising: lazy(() => import("./advisees/advising/AdviseeAdvising")),
  notes: lazy(() => import("./advisees/notes/AdviseeNotes")),
  history: lazy(() => import("./advisees/history/AdviseeHistory")),
}

const tabs = [
  ["checklist", "Checklist"], ["grades", "Grades"], ["curriculum", "Curriculum"],
  ["advising", "Advising"], ["notes", "Notes"], ["history", "Audit log"],
]
export const recordPath = "/adviser/advisee/2023-04412"

/** Shared page composition kept within the Adviser route boundary. */
export function AdviserPage({ title, tab, children, sample = true }: {
  title: string
  tab?: string
  children: ReactNode
  sample?: boolean
}) {
  // Route identity affects navigation only; academic data remains the fixed fixture.
  const { id } = useParams<{ id: string }>()
  const detailPath = id ? `/adviser/advisee/${encodeURIComponent(id)}` : recordPath
  return (
    <section aria-label={title} className="min-w-0 max-w-full">
        {tab && (
          <>
            <StudentRecordHeader {...student} />
            <nav aria-label="Student record" className="mb-6 flex gap-6 overflow-x-auto border-b border-border whitespace-nowrap">
              {tabs.map(([key, label]) => (
                <Link
                  key={key}
                  to={`${detailPath}/${key}`}
                  aria-current={tab === key ? "page" : undefined}
                  className={`shrink-0 border-b-2 px-0.5 py-3 text-sm ${tab === key ? "border-gold font-semibold text-foreground" : "border-transparent text-muted-2"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </>
        )}
        {children}
        {sample && <SampleFooter>Sample records for presentation · Reference date: 19 September 2026</SampleFooter>}
    </section>
  )
}

/** Fixed-value select: no filter state or business behavior. */
export function StaticSelect({ id, label, value, options, className }: {
  id: string
  label: string
  value: string
  options: string[]
  className?: string
}) {
  return (
    <FormField htmlFor={id} label={label} className={className}>
      <Select value={value}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </FormField>
  )
}

/** Mount at /adviser/* inside the host application's existing router. */
export default function Adviser() {
  const Checklist = detailPages.checklist
  return (
    <Routes>
      <Route element={<AdviserLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        {Object.entries(pages).map(([path, Page]) => <Route key={path} path={path} element={<Page />} />)}
        <Route path="advisee/:id">
          <Route index element={<Checklist />} />
          {Object.entries(detailPages).map(([path, Page]) => <Route key={path} path={path} element={<Page />} />)}
        </Route>
        <Route path="*" element={
          <AdviserPage title="Page not found">
            <h1>Page not found</h1>
            <Link to="/adviser/dashboard">Return to dashboard</Link>
          </AdviserPage>
        } />
      </Route>
    </Routes>
  )
}
