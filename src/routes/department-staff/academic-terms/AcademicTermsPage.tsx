import { TableSkeleton } from "@/components/features/loading-skeletons";
import { notify } from "@/lib/notify";
import { useState } from "react";
import { AlertIcon, PlusIcon } from "@/components/icons";
import {
  DataTablePanel,
  type Column,
} from "@/components/features/data-table-panel";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiClientError } from "@/lib/api";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import { useAcademicTerms } from "@/hooks/use-academic-terms";
import type { SchoolTerm } from "./academic-terms.api";
import { SchoolTermDialog } from "./SchoolTermDialog";
import { AddAcademicTermDialog } from "./AddAcademicTermDialog";
import {
  EncodingClosureDialog,
  type EncodingClosureDialogMode,
} from "./EncodingClosureDialog";

function termTypeLabel(termType: SchoolTerm["term_type"]): string {
  return termType === "Summer" ? "Summer/Midyear" : termType;
}

function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "Not provided";

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return `Invalid date (${value})`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return "Your account is not permitted to view academic terms for this department.";
    }
    if (error.isAuthError) {
      return "Your session could not be verified. Sign in again and retry.";
    }
    if (error.isNetworkError) {
      return "Could not reach the academic term service. Check your connection and retry.";
    }
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return "An unexpected error prevented academic terms from loading.";
}

function EncodingStatus({ isClosed }: { isClosed: boolean }) {
  const label = isClosed ? "Closed" : "Open";
  const tone = isClosed
    ? "bg-secondary text-muted-foreground"
    : "bg-status-pass-bg text-status-pass";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function AcademicTermsPage() {
  const academicTerms = useAcademicTerms();
  const scope = useStaffScope();
  const [termToViewId, setTermToViewId] = useState<string | null>(null);
  const [dialogTerm, setDialogTerm] = useState<SchoolTerm | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closureDialog, setClosureDialog] = useState<{
    mode: EncodingClosureDialogMode;
    term: SchoolTerm;
  } | null>(null);
  const closures = academicTerms.data?.departmentClosures ?? [];
  const closureByTermId = new Map(
    closures.map((closure) => [closure.school_term_id, closure]),
  );
  const terms = academicTerms.data?.terms ?? [];
  const termToView = terms.find((term) => term.id === termToViewId) ?? null;
  const isTermClosed = (term: SchoolTerm) =>
    term.is_locked || closureByTermId.get(term.id)?.is_closed === true;
  const closedTerms = terms.filter(isTermClosed).length;
  const openTerms = terms.length - closedTerms;

  const columns: Column<SchoolTerm>[] = [
    {
      header: "Academic year",
      cell: (term) => (
        <span className="font-semibold text-foreground">
          {term.start_year}–{term.end_year}
        </span>
      ),
    },
    {
      header: "Semester",
      cell: (term) => termTypeLabel(term.term_type).toLowerCase(),
    },
    {
      header: "Term dates",
      cell: (term) => (
        <>
          {formatCalendarDate(term.starts_on)} –{" "}
          {formatCalendarDate(term.ends_on)}
        </>
      ),
    },
    {
      header: "Encoding deadline",
      cell: (term) => formatCalendarDate(term.encoding_deadline),
    },
    {
      header: "Status",
      cell: (term) => <EncodingStatus isClosed={isTermClosed(term)} />,
    },
    {
      header: "Actions",
      cell: (term) => {
        return (
          <div className="flex flex-wrap items-center gap-2">
            {scope.status === "ready" && !isTermClosed(term) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Close encoding for ${term.school_year} ${termTypeLabel(term.term_type)}`}
                onClick={() => {
                  setClosureDialog({ mode: "close", term });
                }}
              >
                Close encoding
              </Button>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 py-1 text-[13px] font-semibold no-underline hover:no-underline"
                onClick={() => setTermToViewId(term.id)}
              >
                View term
              </Button>
            )}
            {scope.status === "ready" && !term.is_locked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDialogTerm(term);
                  setDialogOpen(true);
                }}
              >
                Edit term
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading
        title="Academic terms"
        subtitle="Review semester dates and manage the grade encoding period."
        actions={
          <Button
            type="button"
            onClick={() => {
              setDialogTerm(null);
              setDialogOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            Add a term
          </Button>
        }
      />

      <Alert variant="advisory">
        <AlertIcon />
        <AlertDescription>
          Closing encoding prevents further grade entry for the term. A backup
          reminder is sent to the administrator; the Department Head can record
          a completed backup in Settings.
        </AlertDescription>
      </Alert>

      {academicTerms.isPending && (
        <Panel title="Academic term history">
          <TableSkeleton
            rows={4}
            columns={4}
            label="Loading academic terms and department encoding status…"
          />
        </Panel>
      )}

      {academicTerms.isError && (
        <Panel title="Academic term history">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(academicTerms.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void academicTerms.refetch()}
              disabled={academicTerms.isFetching}
            >
              {academicTerms.isFetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        </Panel>
      )}

      {academicTerms.isSuccess && (
        <DataTablePanel
          title="Academic term history"
          description="Encoding windows are tracked separately for each semester."
          columns={columns}
          rows={[...academicTerms.data.terms].sort(
            (left, right) =>
              right.chronological_key - left.chronological_key ||
              left.id.localeCompare(right.id),
          )}
          rowKey={(term) => term.id}
          empty="No academic terms are available."
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status">
                {openTerms} open term{openTerms === 1 ? "" : "s"} ·{" "}
                {closedTerms} closed term{closedTerms === 1 ? "" : "s"}
              </p>
              <span>Department scope</span>
            </div>
          }
        />
      )}

      {termToView &&
        (() => {
          const closure = closureByTermId.get(termToView.id);
          const closed = isTermClosed(termToView);
          const closedBy = closure?.is_closed
            ? closure.closed_by_name
            : termToView.closed_by_name;
          const note = closure?.is_closed
            ? closure.closure_note
            : termToView.closure_note;
          return (
            <Dialog
              open
              onOpenChange={(open) => {
                if (!open) setTermToViewId(null);
              }}
            >
              <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-170">
                <DialogHeader className="border-b border-line-soft px-5 py-4 pr-14 sm:px-6 sm:py-5">
                  <DialogTitle className="text-[22px] leading-[1.08] tracking-[-0.01em] sm:text-2xl">
                    Academic term details
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Academic term details
                  </DialogDescription>
                </DialogHeader>
                <div className="p-5 text-sm sm:p-6">
                  <dl className="grid grid-cols-2 gap-5">
                    <div>
                      <dt className="text-xs text-muted-2">Academic year</dt>
                      <dd className="mt-1 text-[13.5px] font-medium text-foreground">
                        {termToView.start_year}–{termToView.end_year}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-2">Semester</dt>
                      <dd className="mt-1 text-[13.5px] font-medium text-foreground">
                        {termTypeLabel(termToView.term_type).toLowerCase()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-2">Term dates</dt>
                      <dd className="mt-1 text-[13.5px] font-medium text-foreground">
                        {formatCalendarDate(termToView.starts_on)} –{" "}
                        {formatCalendarDate(termToView.ends_on)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-2">
                        Encoding deadline
                      </dt>
                      <dd className="mt-1 text-[13.5px] font-medium text-foreground">
                        {formatCalendarDate(termToView.encoding_deadline)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-2">Status</dt>
                      <dd className="mt-1">
                        <StatusBadge status={closed ? "archived" : "current"}>
                          {closed ? "Closed" : "Open"}
                        </StatusBadge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-2">Closed by</dt>
                      <dd className="mt-1 text-[13.5px] font-medium text-foreground">
                        {closedBy ?? "Actor unavailable"}
                      </dd>
                    </div>
                    {note && (
                      <div className="col-span-2">
                        <dt className="text-xs text-muted-2">Closure note</dt>
                        <dd className="mt-1 text-[13.5px] font-medium text-foreground">
                          {note}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
                <DialogFooter className="border-t border-line-soft px-5 py-4 sm:px-6">
                  <Button
                    variant="outline"
                    onClick={() => setTermToViewId(null)}
                  >
                    Close
                  </Button>
                  {closure?.is_closed && !termToView.is_locked && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setClosureDialog({ mode: "reopen", term: termToView });
                        setTermToViewId(null);
                      }}
                    >
                      Reopen encoding
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}
      {dialogOpen && dialogTerm && (
        <SchoolTermDialog
          term={dialogTerm}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            notify.success(
              dialogTerm ? "Academic term updated." : "Academic term created.",
            );
          }}
        />
      )}
      {dialogOpen && !dialogTerm && (
        <AddAcademicTermDialog
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            notify.success("Academic term created.");
          }}
        />
      )}
      {closureDialog && (
        <EncodingClosureDialog
          mode={closureDialog.mode}
          term={closureDialog.term}
          onClose={() => setClosureDialog(null)}
          onComplete={(action) => {
            setClosureDialog(null);
            notify.success(
              `Department grade encoding ${action} for ${closureDialog.term.school_year}, ${termTypeLabel(closureDialog.term.term_type)}.`,
            );
          }}
        />
      )}
    </div>
  );
}
