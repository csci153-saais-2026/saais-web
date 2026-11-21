import * as React from "react"
import type { ApiSchema } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface AdvisingNotesDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly notes: readonly ApiSchema<"AdvisingNote">[]
  /** Optional fallback or map for resolving staff author display names when `author_name` is omitted. */
  readonly authorNames?: Readonly<Record<string, string>> | ((authorId: string) => string | undefined)
  readonly defaultAuthorName?: string
  readonly className?: string
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function formatNoteDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—"
  const trimmed = dateValue.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const monthIndex = Number(isoMatch[2]) - 1
    const day = Number(isoMatch[3])
    const monthLabel = SHORT_MONTHS[monthIndex]
    if (monthLabel && day >= 1 && day <= 31) {
      return `${day} ${monthLabel} ${year}`
    }
  }
  return trimmed
}

function resolveAuthorLabel(
  note: ApiSchema<"AdvisingNote">,
  authorNames?: Readonly<Record<string, string>> | ((authorId: string) => string | undefined),
  defaultAuthorName = "Academic Adviser"
): string {
  if (note.author_name && note.author_name.trim().length > 0) {
    return note.author_name.trim()
  }
  if (typeof authorNames === "function") {
    const resolved = authorNames(note.authored_by)
    if (resolved && resolved.trim().length > 0) return resolved.trim()
  } else if (authorNames && note.authored_by in authorNames) {
    const resolved = authorNames[note.authored_by]
    if (resolved && resolved.trim().length > 0) return resolved.trim()
  }
  return defaultAuthorName
}

/**
 * Student Dashboard Advising Notes modal.
 * Displays `AdvisingNote` entries (including archived notes so the student retains a complete
 * record of advising guidance) and strictly excludes `AttemptRemark` records.
 */
export function AdvisingNotesDialog({
  open,
  onOpenChange,
  notes,
  authorNames,
  defaultAuthorName = "Academic Adviser",
  className,
}: AdvisingNotesDialogProps) {
  const sortedNotes = React.useMemo(() => {
    return [...notes].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    )
  }, [notes])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn("max-h-[90dvh] overflow-y-auto sm:max-w-[640px]", className)}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle>Advising notes</DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              Guidance recorded by your academic adviser across your advising sessions.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="shrink-0">
              Close
            </Button>
          </DialogClose>
        </DialogHeader>

        {sortedNotes.length > 0 ? (
          <div
            data-slot="advising-notes-list"
            className="divide-y divide-line-soft overflow-hidden rounded-md border border-border bg-card"
          >
            {sortedNotes.map((note) => {
              const authorLabel = resolveAuthorLabel(
                note,
                authorNames,
                defaultAuthorName
              )
              const dateLabel = formatNoteDate(note.created_at)

              return (
                <article
                  key={note.id}
                  data-slot="advising-note-row"
                  className="px-5 py-4"
                >
                  <p className="text-body whitespace-pre-wrap text-foreground">
                    {note.body_text}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-caption text-muted-2">
                    <strong className="font-semibold text-foreground">
                      {authorLabel}
                    </strong>
                    {note.author_role_label && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{note.author_role_label}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <time
                      dateTime={note.created_at}
                      className="font-mono tabular-nums"
                    >
                      {dateLabel}
                    </time>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card px-5 py-10 text-center text-body text-muted-foreground">
            No advising notes right now.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
