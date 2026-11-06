import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge, type Status } from "@/components/ui/status-badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/** Avatar, name, meta line and standing badge for a single student record. */
function StudentRecordHeader({
  name,
  initials,
  studentNumber,
  program,
  yearLabel,
  email,
  standing,
}: {
  name: string
  initials: string
  studentNumber: string
  program: string
  yearLabel: string
  email: string
  standing: Status
}) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <Avatar className="size-[52px]">
        <AvatarFallback className="bg-primary font-heading text-lg font-bold text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h1 className="text-3xl leading-tight">{name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono text-[13px]">{studentNumber}</span>
          <span>· {program}</span>
          <span>· {yearLabel}</span>
          <span>· {email}</span>
          <StatusBadge status={standing} />
        </p>
      </div>
    </div>
  )
}

/** Underlined tab strip with a gold active indicator (Checklist / Grades / Curriculum / ...). */
function RecordTabs({
  tabs,
  value,
  onValueChange,
}: {
  tabs: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="mb-6">
      <TabsList variant="line" className="h-auto group-data-horizontal/tabs:h-auto w-full justify-start gap-6 overflow-x-auto border-b border-border p-0">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="h-auto flex-none rounded-none border-0 px-0 pt-2 pb-3 text-muted-foreground after:bg-gold group-data-horizontal/tabs:after:bottom-0 data-[state=active]:after:opacity-100 data-[state=active]:font-semibold data-[state=active]:text-foreground"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { StudentRecordHeader, RecordTabs }
