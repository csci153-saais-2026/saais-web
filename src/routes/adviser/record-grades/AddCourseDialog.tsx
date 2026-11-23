import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { getTermOfferings } from "./encode.api";

type Offering = Awaited<ReturnType<typeof getTermOfferings>>[number];
type ElectiveSlot = { id: string; label: string; used: boolean };
type Pick = { kind: "course" | "slot"; id: string };

export function AddCourseDialog({
  offerings,
  electiveSlots,
  unavailable,
  disabled,
  onAdd,
}: {
  offerings: Offering[];
  electiveSlots: ElectiveSlot[];
  unavailable: string[];
  disabled?: boolean;
  onAdd: (offeringId: string, slotId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<Pick | null>(null);
  const [electiveChoice, setElectiveChoice] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState("");
  const query = search.toLowerCase().trim();
  const matches = (item: Offering) =>
    `${item.code} ${item.title}`.toLowerCase().includes(query);
  const required = offerings.filter(
    (item) => item.direct_curriculum_slot_id && matches(item),
  );
  const electives = offerings.filter(
    (item) =>
      !item.direct_curriculum_slot_id &&
      item.is_elective &&
      !unavailable.includes(item.offering.id),
  );
  const slots = electiveSlots
    .map((slot, index) => ({ ...slot, name: `Elective ${index + 1}` }))
    .filter(
      (slot) =>
        !query ||
        `${slot.name} ${electives.map((item) => `${item.code} ${item.title}`).join(" ")}`
          .toLowerCase()
          .includes(query),
    );
  const reset = () => {
    setPick(null);
    setElectiveChoice({});
    setSearch("");
    setError("");
  };
  const chooseElective = (slotId: string, offeringId: string) => {
    setError("");
    setElectiveChoice({ [slotId]: offeringId });
    if (offeringId) setPick({ kind: "slot", id: slotId });
  };
  function submit() {
    if (!pick) return setError("Select a course to add.");
    if (pick.kind === "course") onAdd(pick.id);
    else {
      const offering = electiveChoice[pick.id];
      if (!offering)
        return setError(
          `Choose an elective course for ${slots.find((slot) => slot.id === pick.id)?.name ?? "the slot"}.`,
        );
      onAdd(offering, pick.id);
    }
    reset();
    setOpen(false);
  }
  const rowClass =
    "flex items-center justify-between gap-3 rounded-md border border-border p-3 has-[:disabled]:bg-muted/60 has-[:disabled]:text-muted-foreground";
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <span aria-hidden="true">+</span> Add course
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle>Add course</DialogTitle>
          <DialogDescription>
            Choose a course to add to the selected advisee and term. Electives
            are picked by slot.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5">
          <label>
            <span className="sr-only">Search courses</span>
            <input
              className="w-full rounded-md border border-border p-3"
              placeholder="Search courses by code or title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {required.length > 0 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider">
                Required courses
              </legend>
              {required.map((item) => (
                <label
                  key={item.offering.id}
                  className={`${rowClass} justify-start`}
                >
                  <input
                    type="radio"
                    name="add-course"
                    value={item.offering.id}
                    checked={
                      pick?.kind === "course" && pick.id === item.offering.id
                    }
                    disabled={unavailable.includes(item.offering.id)}
                    onChange={() => {
                      setError("");
                      setElectiveChoice({});
                      setPick({ kind: "course", id: item.offering.id });
                    }}
                  />
                  <strong className="shrink-0">{item.code}</strong>
                  <span className="min-w-0 truncate" title={item.title}>
                    {item.title}
                  </span>
                  {unavailable.includes(item.offering.id) && (
                    <span className="text-muted-foreground">Already added</span>
                  )}
                </label>
              ))}
            </fieldset>
          )}
          {slots.length > 0 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider">
                Electives
              </legend>
              {slots.map((slot) => (
                <div key={slot.id} className={rowClass}>
                  <label className="flex min-w-0 items-center gap-3">
                    <input
                      type="radio"
                      name="add-course"
                      value={slot.id}
                      checked={pick?.kind === "slot" && pick.id === slot.id}
                      disabled={slot.used}
                      onChange={() => {
                        setError("");
                        setPick({ kind: "slot", id: slot.id });
                        setElectiveChoice((old) =>
                          old[slot.id] ? { [slot.id]: old[slot.id] } : {},
                        );
                      }}
                    />
                    <strong className="min-w-0 truncate" title={slot.name}>
                      {slot.name}
                    </strong>
                    {slot.used && (
                      <span className="shrink-0">already added</span>
                    )}
                  </label>
                  <select
                    aria-label={`Elective course for ${slot.name}`}
                    className="w-full max-w-[55%] rounded-md border border-border bg-background p-2 disabled:opacity-60 sm:min-w-[320px]"
                    disabled={slot.used}
                    value={electiveChoice[slot.id] ?? ""}
                    onChange={(event) =>
                      chooseElective(slot.id, event.target.value)
                    }
                  >
                    <option value="">Select elective course</option>
                    {electives.map((item) => (
                      <option key={item.offering.id} value={item.offering.id}>
                        {item.code} {item.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </fieldset>
          )}
          {!required.length && !slots.length && (
            <p>No courses match your search.</p>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add course</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
