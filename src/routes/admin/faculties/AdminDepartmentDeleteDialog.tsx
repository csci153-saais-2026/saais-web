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
import { ApiClientError, type ApiSchema } from "@/lib/api";

type Department = ApiSchema<"Department">;

export function AdminDepartmentDeleteDialog({
  department,
  facultyName,
  onOpenChange,
  onConfirm,
}: {
  department: Department;
  facultyName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(department.id);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof ApiClientError && requestError.isConflict
          ? "This department cannot be deleted while programs, courses, role assignments, or student records still reference it. No related records were deleted."
          : requestError instanceof Error
            ? requestError.message
            : "The department could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {department.name}?</DialogTitle>
          <DialogDescription>
            This permanently removes the department only when no programs,
            courses, role assignments, or student records depend on it. It is
            currently under {facultyName}. Related records are never deleted
            automatically.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting ? "Deleting…" : "Delete department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
