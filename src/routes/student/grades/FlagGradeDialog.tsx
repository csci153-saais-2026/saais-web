import * as React from "react"
import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ApiSchema } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import {
  gradeFlagSchema,
  type GradeFlagValues,
} from "./grade-flag-schema"

export type FlagGradeIssueType = GradeFlagValues["issue_type"]

export interface FlagGradeTarget {
  readonly attemptId: string
  readonly code: string
  readonly title: string
  readonly recordedGrade: string
  readonly reportedStage?: "midterm" | "final" | null
}

export interface FlagGradeDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly target: FlagGradeTarget | null
  readonly onSubmit: (
    payload: ApiSchema<"GradeFlagCreateRequest">
  ) => Promise<void> | void
  readonly isSubmitting?: boolean
  readonly submitError?: string | null
  readonly className?: string
}

const ISSUE_TYPE_OPTIONS: readonly {
  readonly value: FlagGradeIssueType
  readonly label: string
}[] = [
  { value: "incorrect_grade", label: "Incorrect grade" },
  { value: "missing_grade", label: "Missing grade" },
  { value: "wrong_course_credited", label: "Wrong course credited" },
  { value: "other", label: "Other" },
]

/**
 * Student Grades modal for flagging a recorded grade or missing grade for adviser review.
 */
export function FlagGradeDialog({
  open,
  onOpenChange,
  target,
  onSubmit,
  isSubmitting = false,
  submitError = null,
  className,
}: FlagGradeDialogProps) {
  const [issueType, setIssueType] =
    React.useState<FlagGradeIssueType>("incorrect_grade")
  const [details, setDetails] = React.useState("")
  const [detailsError, setDetailsError] = React.useState<string>()

  const prevTargetIdRef = React.useRef<string | null>(null)
  const prevOpenRef = React.useRef<boolean>(false)

  React.useEffect(() => {
    const targetId = target?.attemptId ?? null
    if ((open && !prevOpenRef.current) || targetId !== prevTargetIdRef.current) {
      setIssueType("incorrect_grade")
      setDetails("")
      setDetailsError(undefined)
    }
    prevOpenRef.current = open
    prevTargetIdRef.current = targetId
  }, [open, target?.attemptId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!target) return

    const parsed = gradeFlagSchema.safeParse({
      attempt_id: target.attemptId,
      reported_stage: target.reportedStage ?? "final",
      reported_grade_text: target.recordedGrade,
      issue_type: issueType,
      details,
    })

    if (!parsed.success) {
      const detailsIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === "details"
      )
      setDetailsError(
        detailsIssue?.message ?? "Please describe the grade issue before submitting."
      )
      return
    }

    setDetailsError(undefined)
    await onSubmit(parsed.data)
  }

  const courseDisplay = target ? `${target.code} · ${target.title}` : "—"
  const gradeDisplay = target?.recordedGrade || "No grade yet"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[600px]", className)}>
        <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Flag a grade</DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              Send a grade concern to your academic adviser for verification.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Course" htmlFor="flag-grade-course">
              <Input
                id="flag-grade-course"
                type="text"
                value={courseDisplay}
                readOnly
                disabled
                className="font-mono text-cell tabular-nums"
              />
            </FormField>

            <FormField label="Recorded grade" htmlFor="flag-grade-recorded">
              <Input
                id="flag-grade-recorded"
                type="text"
                value={gradeDisplay}
                readOnly
                disabled
                className="font-mono text-cell tabular-nums"
              />
            </FormField>

            <FormField
              label="Reason"
              htmlFor="flag-grade-reason"
              className="sm:col-span-2"
            >
              <Select
                value={issueType}
                onValueChange={(value) =>
                  setIssueType(value as FlagGradeIssueType)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="flag-grade-reason"
                  aria-label="Reason"
                  className="min-h-11 w-full md:min-h-[38px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Details"
              htmlFor="flag-grade-details"
              error={detailsError}
              className="sm:col-span-2"
            >
              <Textarea
                id="flag-grade-details"
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value)
                  if (detailsError && e.target.value.trim()) {
                    setDetailsError(undefined)
                  }
                }}
                placeholder="Explain what appears incorrect or missing."
                aria-invalid={!!detailsError}
                disabled={isSubmitting}
                required
              />
            </FormField>
          </div>

          {submitError && (
            <p role="alert" className="text-cell text-destructive">
              {submitError}
            </p>
          )}

          <DialogFooter className="gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="min-h-11 md:min-h-[38px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!target || isSubmitting}
              className="min-h-11 md:min-h-[38px]"
            >
              {isSubmitting ? "Submitting..." : "Submit flag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
