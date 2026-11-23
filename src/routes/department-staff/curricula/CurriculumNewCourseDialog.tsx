import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/features/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiClientError } from "@/lib/api";
import { useCreateCatalogCourse } from "@/hooks/use-create-catalog-course";
import { useCreateCurriculumSlot, useCreateCurriculumTerm, useCurriculum } from "@/hooks/use-curricula";
import { useStaffDepartmentName } from "@/hooks/use-staff-department-name";
import type { CurriculumVersion } from "./curricula.api";
import { curriculumTermSchema } from "./curriculum-term.schema";
import { curriculumSlotSchema } from "./curriculum-slot.schema";
import { courseSchema } from "../course-catalog/course.schema";

const terms = [1, 2, 3, 4, 5].flatMap((year) => [1, 2, 3].map((term) => ({
  value: `${year}:${term}`,
  label: `Year ${year} · ${["Semester 1", "Semester 2", "Midyear"][term - 1]}`,
  year,
  term,
})));

const newCourseSchema = courseSchema.extend({ term_position: courseSchema.shape.code });
type Values = import("zod").infer<typeof newCourseSchema>;

function message(error: unknown) {
  if (error instanceof ApiClientError && error.isNetworkError) return "The save result could not be confirmed. Refresh the curriculum before retrying.";
  return error instanceof Error ? error.message : "The course could not be added.";
}

export function CurriculumNewCourseDialog({ selectedVersion, onClose, onCreated }: {
  selectedVersion: CurriculumVersion;
  onClose: () => void;
  onCreated: (versionId: string) => void;
}) {
  const [saveError, setSaveError] = useState("");
  const submitting = useRef(false);
  const catalogCourse = useCreateCatalogCourse();
  const createTerm = useCreateCurriculumTerm();
  const createSlot = useCreateCurriculumSlot();
  const department = useStaffDepartmentName();
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(newCourseSchema),
    defaultValues: { code: "", title: "", units: 3, type: "non_elective", category: "major", status: "active", term_position: "1:1" },
  });
  const versionId = selectedVersion.id;
  const detail = useCurriculum(versionId);
  const pending = isSubmitting || catalogCourse.isPending || createTerm.isPending || createSlot.isPending;

  async function submit(values: Values) {
    if (submitting.current) return;
    submitting.current = true;
    setSaveError("");
    try {
      const parsed = courseSchema.parse(values);
      const position = terms.find((term) => term.value === values.term_position) ?? terms[0];
      const catalogEntry = await catalogCourse.mutateAsync(parsed);
      const term = detail.data?.terms.find((item) => item.year_level === position.year && item.term_sequence === position.term);
      const targetTerm = term ?? (await createTerm.mutateAsync({ versionId, values: curriculumTermSchema.parse({ year_level: position.year, term_sequence: position.term }) })).term;
      const slotType = parsed.type === "elective" ? "elective" : "required";
      await createSlot.mutateAsync({ term: targetTerm, values: curriculumSlotSchema.parse({ slot_type: slotType, course_id: catalogEntry.id, slot_label: "", nominal_units: parsed.units }) });
      onCreated(versionId);
    } catch (error) {
      setSaveError(message(error));
    } finally {
      submitting.current = false;
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending}>
      <DialogHeader><DialogTitle>New course</DialogTitle><DialogDescription className="sr-only">Create a catalog course and add it to a curriculum term.</DialogDescription></DialogHeader>
      <form noValidate className="grid gap-4" aria-busy={pending} onSubmit={(event) => { void handleSubmit(submit)(event); }}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <FormField label="Course code" htmlFor="new-curriculum-course-code" error={errors.code?.message}><Input id="new-curriculum-course-code" {...register("code")} /></FormField>
          <FormField label="Course title" htmlFor="new-curriculum-course-title" error={errors.title?.message}><Input id="new-curriculum-course-title" {...register("title")} /></FormField>
          <FormField label="Units" htmlFor="new-curriculum-course-units" error={errors.units?.message}><Input id="new-curriculum-course-units" type="number" min="0.25" step="0.25" {...register("units", { valueAsNumber: true })} /></FormField>
          <FormField label="Department" htmlFor="new-curriculum-course-department"><Input id="new-curriculum-course-department" value={department.data ?? (department.isPending ? "Loading department..." : "Department unavailable")} readOnly /></FormField>
          <FormField label="Term" htmlFor="new-curriculum-course-term"><Controller name="term_position" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange} disabled={pending}><SelectTrigger id="new-curriculum-course-term" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{terms.map((term) => <SelectItem key={term.value} value={term.value}>{term.label}</SelectItem>)}</SelectContent></Select>} /></FormField>
          <FormField label="Course type" htmlFor="new-curriculum-course-type"><Controller name="type" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange} disabled={pending}><SelectTrigger id="new-curriculum-course-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="non_elective">Non-Elective</SelectItem><SelectItem value="elective">Elective</SelectItem></SelectContent></Select>} /></FormField>
        </fieldset>
        {(saveError || detail.isError || department.isError) && <p role="alert" className="text-sm text-destructive">{saveError || (detail.isError ? message(detail.error) : message(department.error))}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || detail.isPending || department.isPending || department.isError}>{pending ? "Adding course..." : "Add course"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
