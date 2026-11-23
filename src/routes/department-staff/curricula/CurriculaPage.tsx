import { AccountSkeleton } from "@/components/features/loading-skeletons";
import "../shared/staff-filters.css";
import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { PageHeading } from "@/components/features/page-heading";
import { FormField } from "@/components/features/form-field";
import { Panel } from "@/components/features/panel";
import { StatGrid } from "@/components/features/stat-tile";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api";
import { CurriculumTermPanel } from "./CurriculumTermPanel";
import {
  useCurricula,
  useCurriculum,
  type VersionLifecycleAction,
} from "@/hooks/use-curricula";
import { CurriculumVersionDialog } from "./CurriculumVersionDialog";
import type {
  CurriculumSlot,
  CurriculumTerm,
  CurriculumVersion,
} from "./curricula.api";
import { CurriculumVersionLifecycleDialog } from "./CurriculumVersionLifecycleDialog";
import { CurriculumTermDialog } from "./CurriculumTermDialog";
import { CurriculumTermDeleteDialog } from "./CurriculumTermDeleteDialog";
import { CurriculumSlotDialog } from "./CurriculumSlotDialog";
import { CurriculumSlotDeleteDialog } from "./CurriculumSlotDeleteDialog";

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "Your account is not permitted to view this curriculum.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isNetworkError)
      return "Could not reach the curriculum service. Check your connection and retry.";
  }
  return error instanceof Error
    ? error.message
    : "The curriculum could not be loaded.";
}

export default function CurriculaPage() {
  const catalog = useCurricula();
  const [selection, setSelection] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [editing, setEditing] = useState<CurriculumVersion | null>(null);
  const [updated, setUpdated] = useState(false);
  const [lifecycle, setLifecycle] = useState<{
    action: VersionLifecycleAction;
    version: CurriculumVersion;
  } | null>(null);
  const [lifecycleMessage, setLifecycleMessage] = useState("");
  const [addingTerm, setAddingTerm] = useState<CurriculumVersion | null>(null);
  const [termMessage, setTermMessage] = useState("");
  const [termAction, setTermAction] = useState<{
    action: "edit" | "delete";
    term: CurriculumTerm;
    version: CurriculumVersion;
    requirementCount: number;
  } | null>(null);
  const [addingRequirement, setAddingRequirement] = useState<{
    term: CurriculumTerm;
    version: CurriculumVersion;
  } | null>(null);
  const [slotAction, setSlotAction] = useState<{
    action: "edit" | "delete";
    term: CurriculumTerm;
    version: CurriculumVersion;
    slot: CurriculumSlot;
  } | null>(null);
  const versions = catalog.isError ? [] : (catalog.data?.versions ?? []);
  const version = versions.find((item) => item.id === selection) ?? versions[0];
  const detail = useCurriculum(version?.id);
  const statuses = {
    draft: "draft",
    active: "active",
    retired: "retired",
    teach_out: "teach out",
    closed: "closed",
  };
  return (
    <div className="-mt-6 space-y-6 md:-mt-(--content-pad-top)">
      <PageHeading
        title="Shape the path to graduation."
        subtitle="Versioned requirements keep past and present curricula distinct."
        actions={
          <Button
            type="button"
            disabled={!catalog.isSuccess || !catalog.data.programs.length}
            onClick={() => {
              setCreated(false);
              setUpdated(false);
              setLifecycleMessage("");
              setCreating(true);
            }}
          >
            <PlusIcon className="size-4" />
            Add version
          </Button>
        }
      />
      {created && <p role="status">Curriculum version created.</p>}
      {updated && <p role="status">Curriculum version updated.</p>}
      {lifecycleMessage && <p role="status">{lifecycleMessage}</p>}
      {termMessage && <p role="status">{termMessage}</p>}
      {termAction?.action === "edit" && (
        <CurriculumTermDialog
          key={`edit:${termAction.term.id}`}
          term={termAction.term}
          version={termAction.version}
          onClose={() => setTermAction(null)}
          onUpdated={(id) => {
            setSelection(id);
            setTermAction(null);
            setTermMessage("Curriculum term updated.");
          }}
        />
      )}
      {termAction?.action === "delete" && (
        <CurriculumTermDeleteDialog
          key={termAction.term.id}
          term={termAction.term}
          version={termAction.version}
          requirementCount={termAction.requirementCount}
          onClose={() => setTermAction(null)}
          onDeleted={(id) => {
            setSelection(id);
            setTermAction(null);
            setTermMessage("Curriculum term deleted.");
          }}
        />
      )}
      {slotAction?.action === "edit" && (
        <CurriculumSlotDialog
          key={`edit-slot:${slotAction.slot.id}`}
          slot={slotAction.slot}
          term={slotAction.term}
          version={slotAction.version}
          courseLabel={(() => {
            const course = detail.data?.courses.find(
              (item) => item.id === slotAction.slot.course_id,
            );
            return course ? `${course.code} — ${course.title}` : undefined;
          })()}
          onClose={() => setSlotAction(null)}
          onUpdated={(id) => {
            setSelection(id);
            setSlotAction(null);
            setTermMessage("Curriculum requirement updated.");
          }}
        />
      )}
      {slotAction?.action === "delete" && (
        <CurriculumSlotDeleteDialog
          key={slotAction.slot.id}
          slot={slotAction.slot}
          term={slotAction.term}
          version={slotAction.version}
          displayName={(() => {
            const course = detail.data?.courses.find(
              (item) => item.id === slotAction.slot.course_id,
            );
            return course ? `${course.code} — ${course.title}` : undefined;
          })()}
          onClose={() => setSlotAction(null)}
          onDeleted={(id) => {
            setSelection(id);
            setSlotAction(null);
            setTermMessage("Curriculum requirement deleted.");
          }}
        />
      )}
      {addingRequirement && (
        <CurriculumSlotDialog
          key={addingRequirement.term.id}
          term={addingRequirement.term}
          version={addingRequirement.version}
          onClose={() => setAddingRequirement(null)}
          onCreated={(id) => {
            setSelection(id);
            setAddingRequirement(null);
            setTermMessage("Curriculum requirement added.");
          }}
        />
      )}
      {addingTerm && (
        <CurriculumTermDialog
          key={addingTerm.id}
          version={addingTerm}
          onClose={() => setAddingTerm(null)}
          onAdded={(id) => {
            setSelection(id);
            setAddingTerm(null);
            setTermMessage("Curriculum term added.");
            setCreated(false);
            setUpdated(false);
            setLifecycleMessage("");
          }}
        />
      )}
      {lifecycle && (
        <CurriculumVersionLifecycleDialog
          key={`${lifecycle.action}:${lifecycle.version.id}`}
          action={lifecycle.action}
          version={lifecycle.version}
          programLabel={
            catalog.data?.programs.find(
              (program) => program.id === lifecycle.version.program_id,
            )?.code ?? "Program unavailable"
          }
          onClose={() => setLifecycle(null)}
          onRetireInstead={() =>
            setLifecycle({ ...lifecycle, action: "retire" })
          }
          onCompleted={(action, id) => {
            setSelection(action === "delete" ? "" : id);
            setLifecycle(null);
            setCreated(false);
            setUpdated(false);
            setLifecycleMessage(
              action === "delete"
                ? "Curriculum version deleted."
                : "Curriculum version retired.",
            );
          }}
        />
      )}
      {editing && catalog.data && (
        <CurriculumVersionDialog
          key={editing.id}
          version={editing}
          programs={catalog.data.programs}
          versions={catalog.data.versions}
          onClose={() => setEditing(null)}
          onUpdated={(id) => {
            setSelection(id);
            setEditing(null);
            setUpdated(true);
          }}
        />
      )}
      {creating && catalog.data && (
        <CurriculumVersionDialog
          programs={catalog.data.programs}
          versions={catalog.data.versions}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setSelection(id);
            setCreating(false);
            setCreated(true);
          }}
        />
      )}
      <AccountSkeleton
        id="CurriculaPage-1"
        loading={catalog.isPending}
        label="Loading curriculum versions..."
      >
        {catalog.isError && (
          <Panel title="Curriculum versions">
            <p role="alert">{errorMessage(catalog.error)}</p>
            <Button
              type="button"
              variant="outline"
              disabled={catalog.isFetching}
              onClick={() => void catalog.refetch()}
            >
              Retry versions
            </Button>
          </Panel>
        )}
        {catalog.isSuccess && versions.length === 0 && (
          <Panel title="Curriculum versions">
            <p>No curriculum versions are available for your department.</p>
          </Panel>
        )}
        {version && (
          <>
            <div className="staff-filter-controls department-filter-typography flex flex-wrap items-end gap-3 pb-1">
              <FormField
                label="Curriculum version"
                htmlFor="curriculum-version"
                className="min-w-[220px] flex-[0_1_280px]"
              >
                <select
                  id="curriculum-version"
                  className="min-h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
                  value={version.id}
                  onChange={(event) => setSelection(event.target.value)}
                >
                  {versions.map((item) => {
                    const code =
                      catalog.data?.programs.find(
                        (program) => program.id === item.program_id,
                      )?.code ?? "Program unavailable";
                    const label = item.version_label.startsWith(`${code} `)
                      ? item.version_label.slice(code.length + 1)
                      : item.version_label;
                    return (
                      <option key={item.id} value={item.id}>
                        {code} · {label}
                      </option>
                    );
                  })}
                </select>
              </FormField>
              <Button
                type="button"
                variant="outline"
                disabled={!catalog.isSuccess || catalog.isFetching}
                onClick={() => {
                  setCreated(false);
                  setUpdated(false);
                  setLifecycleMessage("");
                  setEditing(version);
                }}
              >
                Edit version
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!catalog.isSuccess || catalog.isFetching}
                onClick={() => {
                  setCreated(false);
                  setUpdated(false);
                  setLifecycleMessage("");
                  setLifecycle({ action: "delete", version });
                }}
              >
                Delete version
              </Button>
              <div className="min-w-4 flex-1" aria-hidden="true" />
              <Button
                type="button"
                variant="outline"
                disabled={
                  !catalog.isSuccess ||
                  catalog.isFetching ||
                  !detail.isSuccess ||
                  detail.isFetching
                }
                onClick={() => {
                  setTermMessage("");
                  setAddingTerm(version);
                }}
              >
                Add term
              </Button>
            </div>
            <StatGrid
              items={[
                {
                  label: "Required units",
                  value: (
                    <span className="text-[30px]">
                      {version.total_units ?? "Unavailable"}
                    </span>
                  ),
                  note: "Full degree requirement",
                },
                {
                  label: "Enrolled students",
                  value: (
                    <span className="text-[30px]">
                      {version.enrolled_student_count ?? "Unavailable"}
                    </span>
                  ),
                  note: "Students on this curriculum",
                },
                {
                  label: "Effective from",
                  value: (
                    <span className="text-[30px]">
                      {new Intl.DateTimeFormat("en-PH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(
                        new Date(`${version.effective_start}T00:00:00Z`),
                      )}
                    </span>
                  ),
                  note: "Version effectivity",
                },
                {
                  label: "Status",
                  value: (
                    <span className="text-[30px]">
                      {statuses[version.status]}
                    </span>
                  ),
                  note: "Curriculum lifecycle",
                },
              ]}
            />
            <AccountSkeleton
              id="CurriculaPage-2"
              loading={detail.isPending}
              label="Loading curriculum requirements..."
            >
              {detail.isError && (
                <Panel title="Curriculum requirements">
                  <p role="alert">{errorMessage(detail.error)}</p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={detail.isFetching}
                    onClick={() => void detail.refetch()}
                  >
                    Retry requirements
                  </Button>
                </Panel>
              )}
              {detail.isSuccess && (
                <>
                  {detail.data.terms.length === 0 && (
                    <Panel title="Curriculum requirements">
                      <p>No terms are available for this curriculum version.</p>
                    </Panel>
                  )}
                  {detail.data.terms.map((term) => {
                    const slots = detail.data.slots.filter(
                      (slot) => slot.curriculum_term_id === term.id,
                    );
                    function openTermAction(action: "edit" | "delete") {
                      setTermMessage("");
                      setCreated(false);
                      setUpdated(false);
                      setLifecycleMessage("");
                      setTermAction({
                        action,
                        term,
                        version,
                        requirementCount: slots.length,
                      });
                    }
                    return (
                      <CurriculumTermPanel
                        key={term.id}
                        term={term}
                        slots={slots}
                        courses={detail.data.courses}
                        actionsDisabled={
                          !catalog.isSuccess ||
                          catalog.isFetching ||
                          detail.isFetching
                        }
                        onAddRequirement={() => {
                          setTermMessage("");
                          setAddingRequirement({ term, version });
                        }}
                        onEditSlot={(slot) => {
                          setTermMessage("");
                          setSlotAction({
                            action: "edit",
                            term,
                            version,
                            slot,
                          });
                        }}
                        onDeleteSlot={(slot) => {
                          setTermMessage("");
                          setSlotAction({
                            action: "delete",
                            term,
                            version,
                            slot,
                          });
                        }}
                        onEdit={() => openTermAction("edit")}
                        onDelete={() => openTermAction("delete")}
                      />
                    );
                  })}
                </>
              )}
            </AccountSkeleton>
          </>
        )}
      </AccountSkeleton>
    </div>
  );
}
