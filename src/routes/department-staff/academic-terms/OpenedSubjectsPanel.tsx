import { notify } from "@/lib/notify";
import { useMemo, useState } from "react";
import {
  DataTablePanel,
  type Column,
} from "@/components/features/data-table-panel";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api";
import { useCurricula, useCurriculum } from "@/hooks/use-curricula";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import type { CurriculumVersion } from "../curricula/curricula.api";
import type { SchoolTerm } from "./academic-terms.api";
import { type OpenedSubject } from "./course-offerings.api";
import { isRequiredDiscontinuedCourse } from "./course-offering.schema";
import {
  CourseOfferingDialog,
  type CourseOfferingDialogMode,
} from "./CourseOfferingDialog";
import { useCourseOfferings } from "./use-course-offerings";

function termTypeLabel(termType: SchoolTerm["term_type"]): string {
  return termType === "Summer" ? "Summer/Midyear" : termType;
}

function errorMessage(error: unknown, resource: string): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return `Your account is not permitted to view ${resource}.`;
    }
    if (error.isAuthError) {
      return "Your session could not be verified. Sign in again and retry.";
    }
    if (error.isNetworkError) {
      return `Could not reach the ${resource} service. Check your connection and retry.`;
    }
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return `An unexpected error prevented ${resource} from loading.`;
}

function versionLabel(
  version: CurriculumVersion,
  programCode: string | undefined,
): string {
  return `${programCode ?? "Program unavailable"} - ${version.version_label} (${version.status})`;
}

function formatUnits(units: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
    units,
  );
}

function OpenedSubjectsForTerm({ term }: { term: SchoolTerm }) {
  const offerings = useCourseOfferings(term.id);
  const curricula = useCurricula();
  const scope = useStaffScope();
  const [versionId, setVersionId] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [dialog, setDialog] = useState<{
    mode: CourseOfferingDialogMode;
    item?: OpenedSubject;
  } | null>(null);
  const versions = curricula.data?.versions ?? [];
  const selectedVersion = versions.find((version) => version.id === versionId);
  const curriculum = useCurriculum(selectedVersion?.id);
  const requiredCourseIds = useMemo(
    () =>
      new Set(
        (curriculum.data?.slots ?? [])
          .filter(
            (slot): slot is typeof slot & { course_id: string } =>
              slot.course_id !== null &&
              slot.course_id !== undefined &&
              !slot.is_elective_slot &&
              slot.slot_type !== "elective",
          )
          .map((slot) => slot.course_id),
      ),
    [curriculum.data?.slots],
  );
  const discontinuedRequiredCourses = useMemo(() => {
    if (scope.status !== "ready" || !selectedVersion || !curriculum.isSuccess) {
      return [];
    }

    return curriculum.data.courses.filter((course) =>
      isRequiredDiscontinuedCourse(
        course,
        requiredCourseIds,
        scope.departmentId,
      ),
    );
  }, [
    curriculum.data,
    curriculum.isSuccess,
    requiredCourseIds,
    scope,
    selectedVersion,
  ]);
  const yearLevels = useMemo(
    () =>
      [
        ...new Set(
          (curriculum.data?.terms ?? []).map((item) => item.year_level),
        ),
      ].sort((left, right) => left - right),
    [curriculum.data?.terms],
  );

  const matchingCourseIds = useMemo(() => {
    if (!selectedVersion || !curriculum.isSuccess) return null;

    const selectedTermIds = new Set(
      curriculum.data.terms
        .filter(
          (item) => yearLevel === "" || String(item.year_level) === yearLevel,
        )
        .map((item) => item.id),
    );

    return new Set(
      curriculum.data.slots
        .filter(
          (slot): slot is typeof slot & { course_id: string } =>
            slot.course_id !== null &&
            slot.course_id !== undefined &&
            selectedTermIds.has(slot.curriculum_term_id),
        )
        .map((slot) => slot.course_id),
    );
  }, [curriculum.data, curriculum.isSuccess, selectedVersion, yearLevel]);

  const rows = useMemo(() => {
    if (!offerings.data) return [];

    return offerings.data
      .filter(
        (item) =>
          matchingCourseIds === null || matchingCourseIds.has(item.course.id),
      )
      .sort(
        (left, right) =>
          left.course.code.localeCompare(right.course.code) ||
          (left.offering.section ?? "").localeCompare(
            right.offering.section ?? "",
          ) ||
          left.offering.id.localeCompare(right.offering.id),
      );
  }, [matchingCourseIds, offerings.data]);

  const units = rows.reduce((sum, item) => sum + item.course.units, 0);
  const columns: Column<OpenedSubject>[] = [
    {
      header: "Course",
      cell: (item) => (
        <div className="flex max-w-72 min-w-0 flex-col">
          <span className="font-medium text-foreground">
            {item.course.code}
          </span>
          <span className="truncate" title={item.course.title}>
            {item.course.title}
          </span>
          {item.course.status === "discontinued" && (
            <span className="text-xs text-muted-foreground">Discontinued</span>
          )}
        </div>
      ),
    },
    {
      header: "Section",
      cell: (item) => item.offering.section ?? "Not specified",
    },
    {
      header: "Schedule",
      cell: (item) => item.offering.schedule ?? "Not specified",
    },
    {
      header: "Instructor",
      cell: (item) => (
        <span
          className="block max-w-56 truncate"
          title={item.offering.instructor ?? undefined}
        >
          {item.offering.instructor ?? "Not specified"}
        </span>
      ),
    },
    {
      header: "Availability",
      cell: (item) => (item.offering.is_by_request ? "By request" : "Standard"),
    },
    {
      header: "Units",
      cell: (item) => formatUnits(item.course.units),
      numeric: true,
    },
    {
      header: "Actions",
      cell: (item) =>
        scope.status !== "ready" ||
        item.course.department_id !== scope.departmentId ? (
          <span className="text-muted-foreground">Read-only</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label={`Edit ${item.course.code} offering section ${item.offering.section ?? "unspecified"}`}
              onClick={() => setDialog({ mode: "edit", item })}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label={`Remove ${item.course.code} offering section ${item.offering.section ?? "unspecified"}`}
              onClick={() => setDialog({ mode: "delete", item })}
            >
              Remove
            </Button>
          </div>
        ),
    },
  ];

  const curriculumReady = selectedVersion === undefined || curriculum.isSuccess;

  return (
    <>
      <Panel
        title="Opened subjects filters"
        description="Filter explicit offerings by courses referenced in a department curriculum."
        className="department-filter-typography"
        action={
          <Button
            type="button"
            disabled={scope.status !== "ready"}
            onClick={() => setDialog({ mode: "create" })}
          >
            Add offering
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="opened-subjects-curriculum"
              className="text-sm font-medium"
            >
              Curriculum version
            </label>
            <select
              id="opened-subjects-curriculum"
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedVersion?.id ?? ""}
              disabled={curricula.isPending || curricula.isError}
              onChange={(event) => {
                setVersionId(event.target.value);
                setYearLevel("");
              }}
            >
              <option value="">All curricula</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {versionLabel(
                    version,
                    curricula.data?.programs.find(
                      (program) => program.id === version.program_id,
                    )?.code,
                  )}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="opened-subjects-year-level"
              className="text-sm font-medium"
            >
              Year standing
            </label>
            <select
              id="opened-subjects-year-level"
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={
                yearLevels.some((level) => String(level) === yearLevel)
                  ? yearLevel
                  : ""
              }
              disabled={!selectedVersion || !curriculum.isSuccess}
              onChange={(event) => setYearLevel(event.target.value)}
            >
              <option value="">All year standings</option>
              {yearLevels.map((level) => (
                <option key={level} value={level}>
                  Year {level}
                </option>
              ))}
            </select>
          </div>
        </div>
        {curricula.isPending && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Loading curriculum filters…
          </p>
        )}
        {curricula.isError && (
          <div className="mt-4 space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(curricula.error, "curriculum versions")}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={curricula.isFetching}
              onClick={() => void curricula.refetch()}
            >
              {curricula.isFetching ? "Retrying…" : "Retry curriculum versions"}
            </Button>
          </div>
        )}
        {selectedVersion && curriculum.isPending && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Loading curriculum year standings…
          </p>
        )}
        {selectedVersion && curriculum.isError && (
          <div className="mt-4 space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(curriculum.error, "curriculum requirements")}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={curriculum.isFetching}
              onClick={() => void curriculum.refetch()}
            >
              {curriculum.isFetching
                ? "Retrying…"
                : "Retry curriculum requirements"}
            </Button>
          </div>
        )}
      </Panel>

      {!curriculumReady ? null : offerings.isPending ? (
        <Panel title="Opened subjects">
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Loading offerings for {term.school_year},{" "}
            {termTypeLabel(term.term_type)}…
          </p>
        </Panel>
      ) : offerings.isError ? (
        <Panel title="Opened subjects">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(offerings.error, "course offerings")}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={offerings.isFetching}
              onClick={() => void offerings.refetch()}
            >
              {offerings.isFetching ? "Retrying…" : "Retry opened subjects"}
            </Button>
          </div>
        </Panel>
      ) : (
        <DataTablePanel
          title="Opened subjects"
          description={`${term.school_year} · ${termTypeLabel(term.term_type)}`}
          columns={columns}
          rows={rows}
          rowKey={(item) => item.offering.id}
          empty={
            offerings.data.length === 0
              ? "No course offerings are recorded for this term."
              : "No offerings match the selected curriculum filters."
          }
          footer={
            <p role="status">
              {rows.length} offering{rows.length === 1 ? "" : "s"} ·{" "}
              {formatUnits(units)} opened units, including by-request offerings.
            </p>
          }
        />
      )}
      {dialog && (
        <CourseOfferingDialog
          mode={dialog.mode}
          term={term}
          offering={dialog.item?.offering}
          course={dialog.item?.course}
          discontinuedRequiredCourses={discontinuedRequiredCourses}
          onClose={() => setDialog(null)}
          onComplete={(action) => {
            setDialog(null);
            notify.success(
              action === "created"
                ? "Course offering added."
                : action === "updated"
                  ? "Course offering updated."
                  : "Course offering removed.",
            );
          }}
        />
      )}
    </>
  );
}

export function OpenedSubjectsPanel({
  terms,
}: {
  terms: readonly SchoolTerm[];
}) {
  const termsKey = JSON.stringify(terms.map((term) => term.id).sort());
  const [selection, setSelection] = useState({ termsKey: "", termId: "" });
  const selectedTermId =
    selection.termsKey === termsKey ? selection.termId : "";
  const selectedTerm =
    terms.find((term) => term.id === selectedTermId) ?? terms[0];

  if (!selectedTerm) {
    return (
      <Panel title="Opened subjects">
        <p className="text-sm text-muted-foreground">
          No academic terms are available for selecting opened subjects.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Term offerings"
        description="Choose a school term to review its explicitly recorded course offerings."
      >
        <div className="grid max-w-xl gap-2">
          <label htmlFor="opened-subjects-term" className="text-sm font-medium">
            Academic term
          </label>
          <select
            id="opened-subjects-term"
            className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedTerm.id}
            onChange={(event) =>
              setSelection({ termsKey, termId: event.target.value })
            }
          >
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.school_year} · {termTypeLabel(term.term_type)}
              </option>
            ))}
          </select>
        </div>
      </Panel>
      <OpenedSubjectsForTerm key={selectedTerm.id} term={selectedTerm} />
    </div>
  );
}
