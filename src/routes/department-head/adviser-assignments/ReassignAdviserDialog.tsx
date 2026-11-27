import { useState } from "react";
import { FormField } from "@/components/features/form-field";
import { AlertIcon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { REASON_MAX_LENGTH } from "@/lib/validation/limits";
import type { DepartmentAdviser } from "../shared/dh-api";
import { todayInManila } from "../shared/dh-utils";
import type { ReassignmentInput } from "./assignment-model";

type Props = {
  studentIds: string[];
  advisers: DepartmentAdviser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: ReassignmentInput) => Promise<void>;
};

/** Mount a fresh dialog for each selection so cancelled form values cannot leak to another group. */
export function ReassignAdviserDialog({
  studentIds,
  advisers,
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [adviserId, setAdviserId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayInManila);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const future = effectiveDate > todayInManila();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onConfirm({ studentIds, adviserId, effectiveDate, reason });
      onOpenChange(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The reassignment could not be applied.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-170">
        <DialogHeader>
          <DialogTitle>Reassign selected students</DialogTitle>
          <DialogDescription className="sr-only">
            Choose a new adviser for the selected students.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="advisory">
          <AlertIcon />
          <AlertDescription>
            {studentIds.length} selected student
            {studentIds.length === 1 ? "" : "s"}
          </AlertDescription>
        </Alert>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormField label="New adviser" htmlFor="reassignment-adviser">
            <Select value={adviserId} onValueChange={setAdviserId}>
              <SelectTrigger id="reassignment-adviser" className="w-full">
                <SelectValue placeholder="Choose an adviser" />
              </SelectTrigger>
              <SelectContent>
                {advisers.map((adviser) => (
                  <SelectItem key={adviser.id} value={adviser.id}>
                    {adviser.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Effective since"
            htmlFor="reassignment-date"
            hint={
              future
                ? "A future date schedules the change and keeps the current adviser displayed."
                : "The date cannot precede any selected student's current assignment."
            }
          >
            <Input
              id="reassignment-date"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </FormField>
          <FormField
            label="Reason for reassignment"
            htmlFor="reassignment-reason"
          >
            <Textarea
              id="reassignment-reason"
              maxLength={REASON_MAX_LENGTH}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the adviser change."
              rows={3}
            />
          </FormField>
          <p className="text-xs text-muted-foreground">
            The previous adviser and original assignment date remain in the
            student’s assignment history.
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              {future ? "Schedule reassignment" : "Apply reassignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
