import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { REASON_MAX_LENGTH } from "@/lib/validation/limits";

/** The Continue/Cancel step for rows the server refused with PREREQUISITE_NOT_MET. */
export function PrerequisiteOverrideDialog({
  courses,
  busy,
  onCancel,
  onContinue,
}: {
  courses: string[];
  busy: boolean;
  onCancel: () => void;
  onContinue: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prerequisite not met</DialogTitle>
          <DialogDescription>
            A strict prerequisite was not passed in an earlier term for:{" "}
            {courses.join(", ")}. Nothing has been saved. Continue to record the
            grades with an override, or cancel to edit them.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5">
          Override reason
          <Textarea
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            placeholder="Required. This is written to the audit log."
            disabled={busy}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => onContinue(reason.trim())}
          >
            Continue with override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
