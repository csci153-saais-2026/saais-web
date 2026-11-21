import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type GradeBand = {
  label: string;
  percent: number;
  /** Optional trailing detail, e.g. "285 grades". */
  detail?: string;
  tone?: "primary" | "soft" | "fail" | "inc" | "neutral";
};

const tones: Record<NonNullable<GradeBand["tone"]>, string> = {
  primary: "[&_[data-slot=progress-indicator]]:bg-primary",
  soft: "[&_[data-slot=progress-indicator]]:bg-forest-soft",
  fail: "[&_[data-slot=progress-indicator]]:bg-status-fail",
  inc: "[&_[data-slot=progress-indicator]]:bg-status-inc",
  neutral: "[&_[data-slot=progress-indicator]]:bg-muted-2",
};
const percentTones: Partial<Record<NonNullable<GradeBand["tone"]>, string>> = {
  fail: "text-status-fail",
  inc: "text-status-inc",
};

/** Horizontal bar rows showing share of grades per band. */
function GradeDistribution({
  bands,
  inline = false,
}: {
  bands: GradeBand[];
  inline?: boolean;
}) {
  return (
    <ul className="grid gap-4">
      {bands.map((b) => (
        <li
          key={b.label}
          className={
            inline
              ? "grid grid-cols-[minmax(80px,110px)_minmax(0,1fr)_auto] items-center gap-3"
              : undefined
          }
        >
          <div
            className={
              inline
                ? "text-sm text-muted-foreground"
                : "mb-1.5 flex items-baseline justify-between text-sm"
            }
          >
            <span>{b.label}</span>
            {!inline && (
              <span>
                <b className="font-semibold">{b.percent}%</b>
                {b.detail && (
                  <span className="text-muted-foreground"> · {b.detail}</span>
                )}
              </span>
            )}
          </div>
          <Progress
            value={b.percent}
            aria-label={b.label}
            className={cn(
              inline ? "h-3.5" : "h-1.5",
              tones[b.tone ?? "primary"],
            )}
          />
          {inline && (
            <span
              className={cn(
                "min-w-12 text-right font-mono text-sm",
                b.tone && percentTones[b.tone],
              )}
            >
              {b.percent}%
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export { GradeDistribution };
