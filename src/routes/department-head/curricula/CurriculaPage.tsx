import { AccountSkeleton } from "@/components/features/loading-skeletons";
import * as React from "react";
import { PlusIcon } from "@/components/icons";
import { FormField } from "@/components/features/form-field";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { StatGrid } from "@/components/features/stat-tile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryMessage } from "../shared/dh-ui";
import { useNotify } from "../shared/notify-context";
import { formatDisplayDate } from "../shared/dh-utils";
import {
  CURRICULUM_SEMESTERS,
  useCurricula,
  type CurriculumCourseSlot,
  type CurriculumSemester,
  type CurriculumSlotType,
  type CurriculumTermBlock,
  type CurriculumVersionRecord,
  type CurriculumVersionStatus,
} from "./curricula-api";
import { useCurriculaActions } from "./use-curricula-actions";

type CurriculaDialogState =
  | { kind: "add-version" }
  | { kind: "edit-version"; versionId: string }
  | { kind: "del-version"; versionId: string }
  | { kind: "add-term" }
  | { kind: "edit-term"; termId: string }
  | { kind: "del-term"; termId: string }
  | { kind: "new-course" }
  | { kind: "add-slot"; termId: string }
  | { kind: "edit-slot"; termId: string; slotId: string }
  | { kind: "del-slot"; termId: string; slotId: string }
  | null;

const YEAR_LEVELS = ["1", "2", "3", "4", "5"] as const;
const TERM_OPTIONS = [1, 2, 3, 4, 5].flatMap((y) =>
  CURRICULUM_SEMESTERS.map((sem) => `Year ${y} · ${sem}`),
);
const SLOT_TYPES: CurriculumSlotType[] = [
  "Required course",
  "Elective slot",
  "GE slot",
];

function versionLabel(v: CurriculumVersionRecord) {
  return `${v.prog} · ${v.year}`;
}

function versionReferenceReason(version: CurriculumVersionRecord) {
  if (version.enrolled > 0) return "Students are assigned to this curriculum.";
  if (version.references?.length) {
    return `This curriculum is referenced by ${version.references.join(" and ")}.`;
  }
  return null;
}

export default function CurriculaPage() {
  const query = useCurricula();
  const actions = useCurriculaActions();
  const versions = React.useMemo(
    () => query.data?.versions ?? [],
    [query.data],
  );
  const programs = query.data?.programs ?? [];
  const [selectedVersionId, setSelectedVersionId] = React.useState<string>("");
  const [dialog, setDialog] = React.useState<CurriculaDialogState>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Version form state
  const [vProg, setVProg] = React.useState("");
  const [vYear, setVYear] = React.useState("");
  const [vUnits, setVUnits] = React.useState("147");
  const [vFrom, setVFrom] = React.useState("");
  const [vStatus, setVStatus] =
    React.useState<CurriculumVersionStatus>("draft");
  const [vCloneFrom, setVCloneFrom] = React.useState("");

  // Term form state
  const [tYear, setTYear] = React.useState("1");
  const [tSem, setTSem] = React.useState<CurriculumSemester>("Semester 1");

  // Slot form state
  const [sCourseId, setSCourseId] = React.useState("");
  const [sUnits, setSUnits] = React.useState("3");
  const [sType, setSType] =
    React.useState<CurriculumSlotType>("Required course");

  // New course form state
  const [ncCode, setNcCode] = React.useState("");
  const [ncTitle, setNcTitle] = React.useState("");
  const [ncUnits, setNcUnits] = React.useState("3");
  const [ncDepartmentId, setNcDepartmentId] = React.useState("");
  const [ncTerm, setNcTerm] = React.useState(TERM_OPTIONS[0]);
  const [ncKind, setNcKind] = React.useState<"Non-Elective" | "Elective">(
    "Non-Elective",
  );

  const showToast = useNotify();

  const currentVersion =
    versions.find((v) => v.id === selectedVersionId) ?? versions[0] ?? null;
  const departments = query.data?.departments ?? [];
  const activeCourses = (query.data?.courses ?? []).filter(
    (course) =>
      course.departmentId === currentVersion?.departmentId &&
      course.status === "active",
  );

  const deleteTargetVersion =
    dialog?.kind === "del-version"
      ? versions.find((v) => v.id === dialog.versionId)
      : null;
  const deleteTargetTerm =
    dialog?.kind === "del-term" || dialog?.kind === "del-slot"
      ? currentVersion?.terms.find((t) => t.id === dialog.termId)
      : null;
  const deleteTargetSlot =
    dialog?.kind === "del-slot"
      ? deleteTargetTerm?.rows.find((r) => r.id === dialog.slotId)
      : null;

  const deleteBlockReason = (() => {
    switch (dialog?.kind) {
      case "del-version": {
        if (!deleteTargetVersion)
          return "This curriculum is no longer available.";
        const referenceReason = versionReferenceReason(deleteTargetVersion);
        if (referenceReason)
          return `${referenceReason} Retire it to preserve existing records.`;
        if (
          deleteTargetVersion.terms.some((term) =>
            term.rows.some((slot) => slot.hasAcademicHistory),
          )
        ) {
          return "This curriculum contains slots used by academic history. Retire it to preserve those records.";
        }
        return null;
      }
      case "del-term":
        if (!currentVersion || !deleteTargetTerm)
          return "This term is no longer available.";
        if (deleteTargetTerm.rows.some((slot) => slot.hasAcademicHistory)) {
          return "This term contains slots used by academic history.";
        }
        if (
          currentVersion.terms.length === 1 &&
          versionReferenceReason(currentVersion)
        ) {
          return "A referenced curriculum must retain at least one term.";
        }
        return null;
      case "del-slot":
        if (!currentVersion || !deleteTargetTerm || !deleteTargetSlot)
          return "This slot is no longer available.";
        if (deleteTargetSlot.hasAcademicHistory)
          return "This slot is used by academic history.";
        if (
          deleteTargetTerm.rows.length === 1 &&
          versionReferenceReason(currentVersion)
        ) {
          return "Each term in a referenced curriculum must retain at least one slot.";
        }
        return null;
      default:
        return null;
    }
  })();

  const closeDialog = () => {
    setDialog(null);
    setFormError(null);
  };

  const openAddVersion = () => {
    setVProg(programs[0]?.code ?? "");
    setVYear("");
    setVUnits("147");
    setVFrom("");
    setVStatus("draft");
    setVCloneFrom("");
    setFormError(null);
    setDialog({ kind: "add-version" });
  };

  const openEditVersion = () => {
    if (!currentVersion) return;
    setVProg(currentVersion.prog);
    setVYear(currentVersion.year);
    setVUnits(String(currentVersion.units));
    setVFrom(currentVersion.from);
    setVStatus(currentVersion.status);
    setFormError(null);
    setDialog({ kind: "edit-version", versionId: currentVersion.id });
  };

  const openAddTerm = () => {
    if (!currentVersion) return;
    setTYear("1");
    setTSem("Semester 1");
    setFormError(null);
    setDialog({ kind: "add-term" });
  };

  const openEditTerm = (term: CurriculumTermBlock) => {
    setTYear(String(term.year));
    setTSem(term.sem);
    setFormError(null);
    setDialog({ kind: "edit-term", termId: term.id });
  };

  const openNewCourse = () => {
    if (!currentVersion) return;
    setNcCode("");
    setNcTitle("");
    setNcUnits("3");
    setNcDepartmentId(currentVersion.departmentId);
    setNcTerm(TERM_OPTIONS[0]);
    setNcKind("Non-Elective");
    setFormError(null);
    setDialog({ kind: "new-course" });
  };

  const openAddSlot = (termId: string) => {
    setSCourseId("");
    setSUnits("3");
    setSType("Required course");
    setFormError(null);
    setDialog({ kind: "add-slot", termId });
  };

  const openEditSlot = (termId: string, slot: CurriculumCourseSlot) => {
    setSCourseId(slot.courseId ?? "");
    setSUnits(String(slot.requiredUnits));
    setSType(slot.type);
    setFormError(null);
    setDialog({ kind: "edit-slot", termId, slotId: slot.id });
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog || deleteBlockReason) return;
    try {
      await confirmDialog(dialog);
    } catch (failure) {
      setFormError(
        failure instanceof Error
          ? failure.message
          : "The change could not be saved.",
      );
    }
  };

  async function confirmDialog(active: NonNullable<CurriculaDialogState>) {
    if (active.kind === "add-version" || active.kind === "edit-version") {
      const year = vYear.trim();
      const units = Number(vUnits);
      if (!year) {
        setFormError("Enter the academic year, for example 2023\u20132024.");
        return;
      }
      if (!Number.isFinite(units) || units <= 0) {
        setFormError("Required units must be a positive number.");
        return;
      }
      if (!vFrom) {
        setFormError("Choose the date this version takes effect.");
        return;
      }
      const program = programs.find((item) => item.code === vProg);
      if (!program) {
        setFormError("Choose a program.");
        return;
      }
      const duplicate = versions.some(
        (v) =>
          (active.kind === "add-version" || v.id !== active.versionId) &&
          v.prog === vProg &&
          v.year === year,
      );
      if (duplicate) {
        setFormError(`${vProg} \u00b7 ${year} already exists.`);
        return;
      }
      const label = `${vProg} ${year}`;
      if (active.kind === "edit-version") {
        await actions.updateVersion(active.versionId, {
          label,
          start: vFrom,
          units,
          status: vStatus,
          ...(vCloneFrom ? { cloneFromVersionId: vCloneFrom } : {}),
        });
      } else {
        const created = await actions.createVersion({
          programId: program.id,
          label,
          start: vFrom,
          units,
          status: vStatus,
        });
        setSelectedVersionId(created.id);
      }
      showToast(`${vProg} \u00b7 ${year} was saved.`);
      closeDialog();
      return;
    }

    if (active.kind === "del-version") {
      const target = versions.find((v) => v.id === active.versionId);
      await actions.deleteVersion(active.versionId);
      setSelectedVersionId("");
      showToast(`${target ? versionLabel(target) : "Version"} was deleted.`);
      closeDialog();
      return;
    }

    if (!currentVersion) return;

    if (active.kind === "add-term" || active.kind === "edit-term") {
      const yearNum = Number(tYear);
      const duplicate = currentVersion.terms.some(
        (t) =>
          (active.kind === "add-term" || t.id !== active.termId) &&
          t.year === yearNum &&
          t.sem === tSem,
      );
      if (duplicate) {
        setFormError(
          `Year ${yearNum} \u00b7 ${tSem} already exists in this version.`,
        );
        return;
      }
      if (active.kind === "edit-term")
        await actions.updateTerm(active.termId, yearNum, tSem);
      else await actions.createTerm(currentVersion.id, yearNum, tSem);
      showToast(`Year ${yearNum} \u00b7 ${tSem} was saved.`);
      closeDialog();
      return;
    }

    if (active.kind === "del-term") {
      await actions.deleteTerm(active.termId);
      showToast("The term was deleted.");
      closeDialog();
      return;
    }

    if (active.kind === "new-course") {
      const code = ncCode.trim();
      const title = ncTitle.trim();
      const unitsNum = Number(ncUnits);
      if (!code) {
        setFormError("Enter the course code, for example CSIT 100.");
        return;
      }
      if (!title) {
        setFormError("Enter the course title.");
        return;
      }
      if (ncUnits.trim() === "" || !Number.isFinite(unitsNum) || unitsNum < 0) {
        setFormError("Units must be zero or more.");
        return;
      }
      const codeTaken = versions.some((v) =>
        v.terms.some((t) =>
          t.rows.some((r) =>
            r.courseOrSlot
              .toLowerCase()
              .startsWith(`${code.toLowerCase()} \u2014`),
          ),
        ),
      );
      if (codeTaken) {
        setFormError(`${code} already exists. Course codes must be unique.`);
        return;
      }

      const department = departments.find((item) => item.id === ncDepartmentId);
      if (!department) {
        setFormError("Choose a department.");
        return;
      }
      const targetVersion = versions.find(
        (version) =>
          version.departmentId === department.id &&
          version.status !== "retired",
      );
      if (!targetVersion) {
        setFormError(
          "No active or draft curriculum is available for this department.",
        );
        return;
      }
      const match = /^Year (\d) \u00b7 (.+)$/.exec(ncTerm);
      const parsedYear = match ? Number(match[1]) : 1;
      const parsedSem = (match?.[2] ?? "Semester 1") as CurriculumSemester;
      let termId = targetVersion.terms.find(
        (t) => t.year === parsedYear && t.sem === parsedSem,
      )?.id;
      if (!termId)
        termId = (
          await actions.createTerm(targetVersion.id, parsedYear, parsedSem)
        ).id;
      await actions.createCourse({
        departmentId: department.id,
        code,
        title,
        units: unitsNum,
        elective: ncKind === "Elective",
        termId,
      });
      setSelectedVersionId(targetVersion.id);
      showToast(
        `${code} was added to ${versionLabel(targetVersion)}, ${ncTerm}.`,
      );
      closeDialog();
      return;
    }

    if (active.kind === "add-slot" || active.kind === "edit-slot") {
      const unitsNum = Number(sUnits);
      const course = activeCourses.find((item) => item.id === sCourseId);
      if (!course) {
        setFormError("Choose an active course from this department.");
        return;
      }
      if (sUnits.trim() === "" || !Number.isFinite(unitsNum) || unitsNum < 0) {
        setFormError("Required units must be zero or more.");
        return;
      }
      if (active.kind === "edit-slot")
        await actions.updateSlot(active.slotId, course.id, unitsNum, sType);
      else await actions.createSlot(active.termId, course.id, unitsNum, sType);
      showToast(`${course.code} was saved.`);
      closeDialog();
      return;
    }

    if (active.kind === "del-slot") {
      await actions.deleteSlot(active.slotId);
      showToast("The course was removed.");
      closeDialog();
    }
  }

  const dialogMeta = (() => {
    if (!dialog) return { title: "", confirmLabel: "", isDelete: false };
    switch (dialog.kind) {
      case "add-version":
        return {
          title: "Add version",
          confirmLabel: "Add version",
          isDelete: false,
        };
      case "edit-version":
        return {
          title: "Edit version",
          confirmLabel: "Save changes",
          isDelete: false,
        };
      case "del-version":
        return {
          title: "Delete record",
          confirmLabel: "Delete",
          isDelete: true,
        };
      case "add-term":
        return { title: "Add term", confirmLabel: "Add term", isDelete: false };
      case "edit-term":
        return {
          title: "Edit term",
          confirmLabel: "Save changes",
          isDelete: false,
        };
      case "del-term":
        return {
          title: "Delete record",
          confirmLabel: "Delete",
          isDelete: true,
        };
      case "new-course":
        return {
          title: "New course",
          confirmLabel: "Add course",
          isDelete: false,
        };
      case "add-slot":
        return {
          title: "Add course / slot",
          confirmLabel: "Add",
          isDelete: false,
        };
      case "edit-slot":
        return {
          title: "Edit course / slot",
          confirmLabel: "Save changes",
          isDelete: false,
        };
      case "del-slot":
        return {
          title: "Delete record",
          confirmLabel: "Delete",
          isDelete: true,
        };
    }
  })();

  if (query.isError && !query.data) {
    return (
      <div className="space-y-6">
        <PageHeading
          title="Shape the path to graduation."
          subtitle="Versioned requirements keep past and present curricula distinct."
        />
        <QueryMessage query={query} label="curricula" />
      </div>
    );
  }

  return (
    <AccountSkeleton
      id="dh-curricula"
      data={query.data}
      label="Loading curricula…"
    >
      {() => (
        <div className="space-y-6">
          <PageHeading
            title="Shape the path to graduation."
            subtitle="Versioned requirements keep past and present curricula distinct."
            actions={
              <Button onClick={openAddVersion}>
                <PlusIcon /> Add version
              </Button>
            }
          />

          {/* Version selector and curriculum builder toolbar */}
          <div className="flex flex-wrap items-end gap-3">
            <FormField
              label="Curriculum version"
              htmlFor="cu-version"
              className="w-full sm:w-[280px] sm:min-w-[220px]"
            >
              <Select
                value={currentVersion?.id ?? ""}
                onValueChange={setSelectedVersionId}
                disabled={!currentVersion}
              >
                <SelectTrigger id="cu-version" className="w-full bg-card">
                  <SelectValue placeholder="No versions" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  avoidCollisions={false}
                >
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {versionLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <Button
              type="button"
              variant="outline"
              disabled={!currentVersion}
              onClick={openEditVersion}
            >
              Edit version
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!currentVersion}
              onClick={() =>
                currentVersion &&
                setDialog({ kind: "del-version", versionId: currentVersion.id })
              }
            >
              Delete version
            </Button>

            <div className="hidden sm:block sm:flex-1" />

            <Button
              type="button"
              variant="outline"
              disabled={!currentVersion}
              onClick={openAddTerm}
            >
              Add term
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!currentVersion}
              onClick={openNewCourse}
            >
              New course
            </Button>
          </div>

          {!currentVersion ? (
            <div className="rounded-md border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
              No curriculum versions yet. Use Add version to create one.
            </div>
          ) : (
            <>
              <StatGrid
                className="[&_.font-heading]:text-[30px]"
                items={[
                  {
                    label: "Required units",
                    value: currentVersion.units,
                    note: "Full degree requirement",
                  },
                  {
                    label: "Enrolled students",
                    value: currentVersion.enrolled,
                    note: "Students on this curriculum",
                  },
                  {
                    label: "Effective from",
                    value: formatDisplayDate(currentVersion.from, {
                      padDay: false,
                    }),
                    note: "Version effectivity",
                  },
                  {
                    label: "Status",
                    value: currentVersion.status,
                    note: "Curriculum lifecycle",
                  },
                ]}
              />

              {currentVersion.terms.length === 0 ? (
                <div className="rounded-md border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
                  This version has no terms yet. Use Add term to start.
                </div>
              ) : (
                <div className="space-y-5">
                  {currentVersion.terms.map((term) => (
                    <Panel
                      key={term.id}
                      title={`Year ${term.year} · ${term.sem}`}
                      description="Positional curriculum term; not a calendar school term."
                      flush
                      action={
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAddSlot(term.id)}
                          >
                            Add course / slot
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditTerm(term)}
                          >
                            Edit term
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setDialog({ kind: "del-term", termId: term.id })
                            }
                          >
                            Delete term
                          </Button>
                        </div>
                      }
                    >
                      <Table responsive>
                        <TableHeader className="bg-secondary">
                          <TableRow>
                            <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                              Course / slot
                            </TableHead>
                            <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                              Required units
                            </TableHead>
                            <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                              Type
                            </TableHead>
                            <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {term.rows.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-6 text-center text-muted-foreground"
                              >
                                No courses in this term yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            term.rows.map((slot) => (
                              <TableRow key={slot.id}>
                                <TableCell
                                  label="Course / slot"
                                  className="font-medium text-foreground"
                                >
                                  <span
                                    className="block max-w-72 truncate"
                                    title={slot.courseOrSlot}
                                  >
                                    {slot.courseOrSlot}
                                  </span>
                                </TableCell>
                                <TableCell
                                  label="Required units"
                                  className="font-mono text-sm"
                                >
                                  {slot.requiredUnits}
                                </TableCell>
                                <TableCell
                                  label="Type"
                                  className="text-muted-foreground"
                                >
                                  {slot.type}
                                </TableCell>
                                <TableCell label="Actions">
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        openEditSlot(term.id, slot)
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        setDialog({
                                          kind: "del-slot",
                                          termId: term.id,
                                          slotId: slot.id,
                                        })
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </Panel>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Curriculum Builder Dialog */}
          <Dialog
            open={!!dialog}
            onOpenChange={(open) => !open && closeDialog()}
          >
            <DialogContent
              className={
                dialog?.kind === "new-course" ? "max-w-[640px]" : "max-w-lg"
              }
            >
              <DialogHeader>
                <DialogTitle>{dialogMeta.title}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleConfirm} className="space-y-4">
                {(dialog?.kind === "add-version" ||
                  dialog?.kind === "edit-version") && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Program" htmlFor="cu-prog">
                      <Select value={vProg} onValueChange={setVProg}>
                        <SelectTrigger id="cu-prog" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.code}>
                              {program.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Academic year" htmlFor="cu-year">
                      <Input
                        id="cu-year"
                        value={vYear}
                        placeholder="2023–2024"
                        onChange={(e) => setVYear(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Required units" htmlFor="cu-units">
                      <Input
                        id="cu-units"
                        value={vUnits}
                        onChange={(e) => setVUnits(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Effective from" htmlFor="cu-from">
                      <Input
                        id="cu-from"
                        type="date"
                        value={vFrom}
                        onChange={(e) => setVFrom(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Status" htmlFor="cu-status">
                      <Select
                        value={vStatus}
                        onValueChange={(val) =>
                          setVStatus(val as CurriculumVersionStatus)
                        }
                      >
                        <SelectTrigger id="cu-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          <SelectItem value="active">active</SelectItem>
                          <SelectItem value="draft">draft</SelectItem>
                          <SelectItem value="retired">retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    {dialog.kind === "add-version" && (
                      <FormField
                        label="Copy courses from (optional)"
                        htmlFor="cu-clone"
                      >
                        <Select
                          value={vCloneFrom || "blank"}
                          onValueChange={(value) =>
                            setVCloneFrom(value === "blank" ? "" : value)
                          }
                        >
                          <SelectTrigger id="cu-clone" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blank">
                              Start with a blank version
                            </SelectItem>
                            {versions.map((source) => (
                              <SelectItem key={source.id} value={source.id}>
                                {versionLabel(source)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    )}
                  </div>
                )}

                {dialog?.kind === "del-version" &&
                  deleteTargetVersion &&
                  !deleteBlockReason && (
                    <p className="text-sm text-foreground">
                      Delete{" "}
                      <strong className="font-semibold">
                        {versionLabel(deleteTargetVersion)}
                      </strong>{" "}
                      and all of its terms? This can’t be undone.
                    </p>
                  )}

                {(dialog?.kind === "add-term" ||
                  dialog?.kind === "edit-term") && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Year level" htmlFor="cu-tyear">
                      <Select value={tYear} onValueChange={setTYear}>
                        <SelectTrigger id="cu-tyear" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          {YEAR_LEVELS.map((y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Term" htmlFor="cu-tsem">
                      <Select
                        value={tSem}
                        onValueChange={(val) =>
                          setTSem(val as CurriculumSemester)
                        }
                      >
                        <SelectTrigger id="cu-tsem" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          {CURRICULUM_SEMESTERS.map((sem) => (
                            <SelectItem key={sem} value={sem}>
                              {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                )}

                {dialog?.kind === "del-term" &&
                  deleteTargetTerm &&
                  !deleteBlockReason && (
                    <p className="text-sm text-foreground">
                      Delete{" "}
                      <strong className="font-semibold">
                        Year {deleteTargetTerm.year} · {deleteTargetTerm.sem}
                      </strong>{" "}
                      and its {deleteTargetTerm.rows.length} course(s)?
                    </p>
                  )}

                {dialog?.kind === "new-course" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Course code" htmlFor="nc-code">
                      <Input
                        id="nc-code"
                        value={ncCode}
                        onChange={(e) => setNcCode(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Course title" htmlFor="nc-title">
                      <Input
                        id="nc-title"
                        value={ncTitle}
                        onChange={(e) => setNcTitle(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Units" htmlFor="nc-units">
                      <Input
                        id="nc-units"
                        value={ncUnits}
                        onChange={(e) => setNcUnits(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Department" htmlFor="nc-department">
                      <Select
                        value={ncDepartmentId}
                        onValueChange={setNcDepartmentId}
                      >
                        <SelectTrigger id="nc-department" className="w-full">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          {departments.map((department) => (
                            <SelectItem
                              key={department.id}
                              value={department.id}
                            >
                              <span
                                className="block max-w-full truncate"
                                title={department.name}
                              >
                                {department.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Term" htmlFor="nc-term">
                      <Select value={ncTerm} onValueChange={setNcTerm}>
                        <SelectTrigger id="nc-term" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          {TERM_OPTIONS.map((tOpt) => (
                            <SelectItem key={tOpt} value={tOpt}>
                              {tOpt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Course type" htmlFor="nc-kind">
                      <Select
                        value={ncKind}
                        onValueChange={(val) =>
                          setNcKind(val as "Non-Elective" | "Elective")
                        }
                      >
                        <SelectTrigger id="nc-kind" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          <SelectItem value="Non-Elective">
                            Non-Elective
                          </SelectItem>
                          <SelectItem value="Elective">Elective</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                )}

                {(dialog?.kind === "add-slot" ||
                  dialog?.kind === "edit-slot") && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Active course"
                      htmlFor="cu-scourse"
                      className="sm:col-span-2"
                    >
                      <Select
                        value={sCourseId || "none"}
                        onValueChange={(value) =>
                          setSCourseId(value === "none" ? "" : value)
                        }
                      >
                        <SelectTrigger id="cu-scourse" className="w-full">
                          <SelectValue placeholder="Select an active course" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          <SelectItem value="none">
                            Select an active course
                          </SelectItem>
                          {activeCourses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.code} — {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Required units" htmlFor="cu-sunits">
                      <Input
                        id="cu-sunits"
                        value={sUnits}
                        onChange={(e) => setSUnits(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Type" htmlFor="cu-stype">
                      <Select
                        value={sType}
                        onValueChange={(val) =>
                          setSType(val as CurriculumSlotType)
                        }
                      >
                        <SelectTrigger id="cu-stype" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          {SLOT_TYPES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                )}

                {dialog?.kind === "del-slot" &&
                  deleteTargetTerm &&
                  deleteTargetSlot &&
                  !deleteBlockReason && (
                    <p className="text-sm text-foreground">
                      Delete{" "}
                      <strong className="font-semibold">
                        {deleteTargetSlot.courseOrSlot}
                      </strong>{" "}
                      from Year {deleteTargetTerm.year} · {deleteTargetTerm.sem}
                      ?
                    </p>
                  )}

                {(formError || deleteBlockReason) && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>
                      {deleteBlockReason ?? formError}
                    </AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={dialogMeta.isDelete ? "destructive" : "default"}
                    disabled={!!deleteBlockReason}
                  >
                    {dialogMeta.confirmLabel}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AccountSkeleton>
  );
}
