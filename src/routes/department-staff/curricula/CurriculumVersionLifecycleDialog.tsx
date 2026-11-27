import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiClientError } from "@/lib/api";
import type { CurriculumVersion } from "./curricula.api";
import {
  useCurriculumVersionLifecycle,
  type VersionLifecycleAction,
} from "@/hooks/use-curricula";

function actionError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "You do not have permission to perform this action on this version.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isConflict)
      return `The server rejected this action to protect curriculum history or dependencies. ${error.message}`;
    if (error.isRateLimited)
      return "Too many requests. Wait before trying again.";
    if (error.isNetworkError)
      return "The result could not be confirmed. Refresh the version list before trying again.";
  }
  return error instanceof Error
    ? error.message
    : "The action could not be completed.";
}

export function CurriculumVersionLifecycleDialog({
  action,
  version,
  programLabel,
  onClose,
  onCompleted,
  onRetireInstead,
}: {
  action: VersionLifecycleAction;
  version: CurriculumVersion;
  programLabel: string;
  onClose: () => void;
  onCompleted: (action: VersionLifecycleAction, id: string) => void;
  onRetireInstead: () => void;
}) {
  const mutation = useCurriculumVersionLifecycle();
  const submitting = useRef(false);
  const deleting = action === "delete";
  const conflict =
    mutation.error instanceof ApiClientError && mutation.error.isConflict;
  const canRetire = version.status !== "retired" && version.status !== "closed";

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await mutation.mutateAsync({ action, original: version });
      onCompleted(result.action, result.id);
    } catch {
      // Failed actions retain the target and server message for review.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!mutation.isPending}
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {deleting ? "Delete record" : "Retire curriculum version"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {deleting
              ? "Confirm curriculum deletion."
              : "Confirm curriculum retirement."}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-foreground">
          {deleting ? "Delete " : "Retire "}
          <strong>
            {version.version_label.startsWith(`${programLabel} `)
              ? version.version_label
              : `${programLabel} · ${version.version_label}`}
          </strong>
          {deleting
            ? " and all of its terms? This can't be undone."
            : "? Existing student records will be preserved."}
        </p>
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {actionError(mutation.error)}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          {deleting && conflict && canRetire && (
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={onRetireInstead}
            >
              Review retirement instead
            </Button>
          )}
          <Button
            type="button"
            variant={deleting ? "destructive" : "default"}
            disabled={mutation.isPending}
            onClick={() => void confirm()}
          >
            {mutation.isPending
              ? deleting
                ? "Deleting version..."
                : "Retiring version..."
              : deleting
                ? "Delete"
                : "Confirm retirement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
