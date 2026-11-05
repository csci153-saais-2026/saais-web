import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export type GradeBand = {
  label: string
  percent: number
  /** Optional trailing detail, e.g. "285 grades". */
  detail?: string
  tone?: "primary" | "soft" | "fail" | "inc" | "neutral"
}

const tones: Record<NonNullable<GradeBand["tone"]>, string> = {
  primary: "[&_[data-slot=progress-indicator]]:bg-primary",
  soft: "[&_[data-slot=progress-indicator]]:bg-forest-soft",
  fail: "[&_[data-slot=progress-indicator]]:bg-status-fail",
  inc: "[&_[data-slot=progress-indicator]]:bg-status-inc",
  neutral: "[&_[data-slot=progress-indicator]]:bg-muted-2",
}

/** Horizontal bar rows showing share of grades per band. */
function GradeDistribution({ bands }: { bands: GradeBand[] }) {
  return (
    <ul className="grid gap-4">
      {bands.map((b) => (
        <li key={b.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span>{b.label}</span>
            <span>
              <b className="font-semibold">{b.percent}%</b>
              {b.detail && <span className="text-muted-foreground"> · {b.detail}</span>}
            </span>
          </div>
          <Progress value={b.percent} aria-label={b.label} className={cn("h-1.5", tones[b.tone ?? "primary"])} />
        </li>
      ))}
    </ul>
  )
}

export { GradeDistribution }
