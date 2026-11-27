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

type Faculty = ApiSchema<"Faculty">;

export function AdminFacultyDeleteDialog({
  faculty,
  departmentCount,
  onOpenChange,
  onConfirm,
}: {
  faculty: Faculty;
  departmentCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(faculty.id);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof ApiClientError && requestError.isConflict
          ? "This faculty cannot be deleted while departments, role assignments, or historical academic records still reference it. No related records were deleted."
          : requestError instanceof Error
            ? requestError.message
            : "The faculty could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {faculty.name}?</DialogTitle>
          <DialogDescription>
            This permanently removes the faculty only when no departments, role
            assignments, or historical academic records depend on it. It
            currently has {departmentCount} department
            {departmentCount === 1 ? "" : "s"}. Related records are never
            deleted automatically.
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
            {deleting ? "Deleting…" : "Delete faculty"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
