import { notify } from "@/lib/notify";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  courseCatalogActionError,
  useCourseCatalogAction,
  type CourseCatalogAction,
} from "@/hooks/use-course-catalog-actions";
import type { CatalogCourse } from "./course-catalog.api";

interface CourseCatalogActionsProps {
  course: CatalogCourse;
  departmentLabel: string;
  showDiscontinue?: boolean;
}

export function CourseCatalogActions({
  course,
  departmentLabel,
  showDiscontinue = true,
}: CourseCatalogActionsProps) {
  const [action, setAction] = useState<CourseCatalogAction | null>(null);
  const requestStarted = useRef(false);
  const mutation = useCourseCatalogAction();

  const openConfirmation = (nextAction: CourseCatalogAction) => {
    mutation.reset();
    requestStarted.current = false;
    setAction(nextAction);
  };

  const closeConfirmation = () => {
    if (mutation.isPending) return;
    setAction(null);
    mutation.reset();
  };

  const confirm = async () => {
    if (!action || mutation.isPending || requestStarted.current) return;
    requestStarted.current = true;
    try {
      await mutation.mutateAsync({ course, action });
      notify.success(
        action === "delete"
          ? `${course.code} deleted.`
          : `${course.code} discontinued.`,
      );
      setAction(null);
    } catch {
      // Keep the confirmation open so the user can read the error and decide what to do.
    } finally {
      requestStarted.current = false;
    }
  };

  const isDelete = action === "delete";
  const subject = `${course.code} · ${course.title}`;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showDiscontinue && course.status === "active" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Discontinue ${course.code}`}
            onClick={() => openConfirmation("discontinue")}
          >
            Discontinue
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          aria-label={`Delete ${course.code}`}
          onClick={() => openConfirmation("delete")}
        >
          Delete
        </Button>
      </div>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) closeConfirmation();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDelete ? "Delete record" : "Discontinue catalog course?"}
            </DialogTitle>
            <DialogDescription>
              {isDelete ? (
                <>
                  Delete{" "}
                  <strong>
                    {course.code} — {course.title}
                  </strong>{" "}
                  from the catalog? This can’t be undone.
                </>
              ) : (
                "Confirm the exact course before continuing. This action will not rewrite historical curriculum records."
              )}
            </DialogDescription>
          </DialogHeader>

          {!isDelete && (
            <div className="rounded-md border border-border bg-muted/40 p-4">
              <p className="font-semibold">{subject}</p>
              <p className="text-sm text-muted-foreground">{departmentLabel}</p>
            </div>
          )}

          {!isDelete && (
            <p className="text-sm text-muted-foreground">
              {isDelete
                ? "Deletion is allowed only when no curriculum slots, offerings, prerequisites, or attempts reference this course. If history protects it, the server will block deletion and the course must be discontinued instead."
                : "The course will remain available to historical records and will no longer be active in the catalog."}
            </p>
          )}

          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {courseCatalogActionError(mutation.error, action!)}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeConfirmation}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isDelete ? "destructive" : "default"}
              onClick={() => {
                void confirm();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Working…"
                : isDelete
                  ? "Delete course"
                  : "Discontinue course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
