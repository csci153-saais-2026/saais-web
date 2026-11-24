import { AccountSkeleton } from "@/components/features/loading-skeletons";
import * as React from "react";
import { AlertIcon, DownloadIcon, PlusIcon } from "@/components/icons";
import { FormField } from "@/components/features/form-field";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { AcademicTermsTable } from "@/components/features/academic-terms-table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TermDialog } from "./TermDialog";
import { TermDetailsDialog } from "./TermDetailsDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REASON_MAX_LENGTH } from "@/lib/validation/limits";
import { QueryMessage } from "../shared/dh-ui";
import { useNotify } from "../shared/notify-context";
import type { DepartmentPdfDocument } from "../shared/department-pdf";
import { PdfViewerDialog } from "../shared/PdfViewerDialog";
import {
  useAcademicTerms,
  useCloseEncoding,
  useCreateTerm,
  type AcademicTermRecord,
} from "./terms-api";
import { buildTermsPdf } from "./terms-pdf";
import { schoolTermFormSchema } from "@/lib/validation/school-term.schema";

const SEMESTER_OPTIONS = ["1st semester", "2nd semester", "Midyear"] as const;

export default function AcademicTermsPage() {
  const termsQuery = useAcademicTerms();
  const createTerm = useCreateTerm();
  const closeEncoding = useCloseEncoding();
  const terms = termsQuery.data ?? [];
  const [formError, setFormError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [isAddTermOpen, setIsAddTermOpen] = React.useState(false);
  const [termToClose, setTermToClose] =
    React.useState<AcademicTermRecord | null>(null);
  const [termToView, setTermToView] = React.useState<AcademicTermRecord | null>(
    null,
  );
  const [closureNote, setClosureNote] = React.useState("");
  const showToast = useNotify();

  // Add term form states
  const [newAY, setNewAY] = React.useState("2025–2026");
  const [newSem, setNewSem] = React.useState<string>("2nd semester");
  const [newStartDate, setNewStartDate] = React.useState("");
  const [newEndDate, setNewEndDate] = React.useState("");
  const [newDeadline, setNewDeadline] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<"Open" | "Closed">("Open");

  const [pdf, setPdf] = React.useState<DepartmentPdfDocument | null>(null);
  const handleExportPdf = () => setPdf(buildTermsPdf(terms));

  const handleCreateTerm = async () => {
    setFormError("");
    const errors: Record<string, string> = {};
    const years = /^\s*(\d{4})\s*[–-]\s*(\d{4})\s*$/.exec(newAY);
    if (!years) errors.academicYear = "Enter the academic year as 2025–2026.";
    const termTypes: Record<
      string,
      "1st Semester" | "2nd Semester" | "Summer"
    > = {
      "1st semester": "1st Semester",
      "2nd semester": "2nd Semester",
      Midyear: "Summer",
    };
    const termType = termTypes[newSem];
    if (!termType) errors.semester = "Select a valid semester.";
    if (years && termType) {
      const result = schoolTermFormSchema.safeParse({
        start_year: Number(years[1]),
        end_year: Number(years[2]),
        term_type: termType,
        starts_on: newStartDate,
        ends_on: newEndDate,
        encoding_deadline: newDeadline,
      });
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0];
          const key =
            field === "start_year" || field === "end_year"
              ? "academicYear"
              : field === "term_type"
                ? "semester"
                : field === "starts_on"
                  ? "startDate"
                  : field === "ends_on"
                    ? "endDate"
                    : "deadline";
          errors[key] ??= issue.message;
        }
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError("Correct the highlighted fields before adding the term.");
      return;
    }
    try {
      const created = await createTerm.mutateAsync({
        academicYear: newAY.trim(),
        semester: newSem,
        startDate: newStartDate,
        endDate: newEndDate,
        deadline: newDeadline,
        closed: newStatus === "Closed",
      });
      setIsAddTermOpen(false);
      showToast(
        `Added academic term ${created.start_year}–${created.end_year} ${newSem}.`,
      );
    } catch (failure) {
      setFormError(
        failure instanceof Error
          ? failure.message
          : "The term could not be added.",
      );
    }
  };

  const handleCloseEncoding = async () => {
    if (!termToClose) return;
    const closedName = `${termToClose.academicYear} · ${termToClose.semester}`;
    try {
      await closeEncoding.mutateAsync({
        termId: termToClose.id,
        note: closureNote.trim() || undefined,
      });
      setTermToClose(null);
      setClosureNote("");
      showToast(`Encoding closed for ${closedName}. Administrator notified.`);
    } catch (failure) {
      showToast(
        failure instanceof Error
          ? failure.message
          : "Encoding could not be closed.",
      );
    }
  };

  if (termsQuery.isError && !termsQuery.data) {
    return (
      <div className="space-y-6">
        <PageHeading
          title="Academic terms"
          subtitle="Review semester dates and manage the grade encoding period."
        />
        <QueryMessage query={termsQuery} label="academic terms" />
      </div>
    );
  }

  return (
    <AccountSkeleton
      id="dh-academic-terms"
      data={termsQuery.data}
      label="Loading academic terms…"
    >
      {() => (
        <div className="space-y-6">
          <PageHeading
            title="Academic terms"
            subtitle="Review semester dates and manage the grade encoding period."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportPdf}
                  className="gap-2 cursor-pointer"
                >
                  <DownloadIcon className="size-4" />
                  Export PDF
                </Button>
                <Button
                  onClick={() => setIsAddTermOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <PlusIcon className="size-4" />
                  Add a term
                </Button>
              </div>
            }
          />

          <Alert variant="advisory">
            <AlertIcon />
            <AlertDescription>
              Closing encoding prevents further grade entry for the term. A
              backup reminder is sent to the administrator; the Department Head
              can record a completed backup in Settings.
            </AlertDescription>
          </Alert>

          <Panel
            title="Academic term history"
            description="Encoding windows are tracked separately for each semester."
            flush
          >
            <AcademicTermsTable
              rows={terms}
              onClose={(row) => {
                const selected = terms.find((term) => term.id === row.id);
                if (selected?.status === "Open") setTermToClose(selected);
              }}
              onView={(row) => {
                const selected = terms.find((term) => term.id === row.id);
                if (selected) setTermToView(selected);
              }}
              scopeLabel="Department scope"
            />
          </Panel>

          {/* Add Term Dialog */}
          <TermDialog
            open={isAddTermOpen}
            onOpenChange={setIsAddTermOpen}
            title="Add academic term"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsAddTermOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTerm}
                  disabled={createTerm.isPending}
                >
                  Add term
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
              <FormField
                label="Academic year"
                htmlFor="at-ay"
                error={fieldErrors.academicYear}
              >
                <Input
                  id="at-ay"
                  value={newAY}
                  aria-invalid={!!fieldErrors.academicYear}
                  onChange={(e) => setNewAY(e.target.value)}
                />
              </FormField>
              <FormField
                label="Semester"
                htmlFor="at-sem"
                error={fieldErrors.semester}
              >
                <Select value={newSem} onValueChange={setNewSem}>
                  <SelectTrigger id="at-sem" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTER_OPTIONS.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Start date"
                htmlFor="at-start"
                error={fieldErrors.startDate}
              >
                <Input
                  id="at-start"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </FormField>
              <FormField
                label="Actual end date"
                htmlFor="at-end"
                error={fieldErrors.endDate}
              >
                <Input
                  id="at-end"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </FormField>
              <FormField
                label="Encoding deadline"
                htmlFor="at-deadline"
                error={fieldErrors.deadline}
              >
                <Input
                  id="at-deadline"
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </FormField>
              <FormField label="Encoding status" htmlFor="at-status">
                <Select
                  value={newStatus}
                  onValueChange={(val) =>
                    setNewStatus(val as "Open" | "Closed")
                  }
                >
                  <SelectTrigger id="at-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            {formError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </TermDialog>

          {/* Close Encoding Dialog */}
          <TermDialog
            open={!!termToClose}
            onOpenChange={(open) => {
              if (!open) {
                setTermToClose(null);
                setClosureNote("");
              }
            }}
            title="Close grade encoding"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTermToClose(null);
                    setClosureNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseEncoding}
                  disabled={closeEncoding.isPending}
                >
                  Close encoding
                </Button>
              </>
            }
          >
            {termToClose && (
              <div className="space-y-4.5">
                <p className="text-foreground">
                  Close encoding for{" "}
                  <strong>
                    {termToClose.academicYear} · {termToClose.semester}
                  </strong>
                  ?
                </p>
                <Alert variant="advisory">
                  <AlertIcon />
                  <AlertDescription>
                    New grade entries will be closed for this term. A backup
                    reminder will be sent to the administrator.
                  </AlertDescription>
                </Alert>
                <FormField label="Closure note" htmlFor="closure-note">
                  <Textarea
                    id="closure-note"
                    maxLength={REASON_MAX_LENGTH}
                    placeholder="Enter a reason for this decision"
                    value={closureNote}
                    onChange={(e) => setClosureNote(e.target.value)}
                  />
                </FormField>
              </div>
            )}
          </TermDialog>

          <TermDetailsDialog
            term={termToView}
            onClose={() => setTermToView(null)}
          />

          <PdfViewerDialog document={pdf} onClose={() => setPdf(null)} />
        </div>
      )}
    </AccountSkeleton>
  );
}
