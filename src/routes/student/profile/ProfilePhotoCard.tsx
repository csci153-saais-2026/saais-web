import * as React from "react";
import { notify } from "@/lib/notify";
import { Panel } from "@/components/features/panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudentPhotoUrl } from "@/hooks/use-student-photo-url";
import { studentPhotoFileSchema } from "./student-photo-schema";
import { validateStudentPhotoImage } from "./student-photo-image";

export interface ProfilePhotoCardProps {
  readonly initials: string;
  readonly avatarUrl?: string | null;
  readonly fullName?: string | null;
  readonly onUpload?: (file: File) => Promise<void> | void;
  readonly onRemove?: () => Promise<void> | void;
  readonly isBusy?: boolean;
  readonly className?: string;
}

/**
 * Student Profile photo card with 96px circular avatar/initials,
 * client-side JPG/PNG validation, and accessible status feedback.
 */
export function ProfilePhotoCard({
  initials,
  avatarUrl,
  fullName,
  onUpload,
  onRemove,
  isBusy = false,
  className,
}: ProfilePhotoCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const displayUrl = useStudentPhotoUrl(avatarUrl);
  const [errorMessage, setErrorMessage] = React.useState<string>("");
  const [isValidating, setIsValidating] = React.useState(false);
  const mounted = React.useRef(true);
  const validationId = React.useRef(0);

  React.useEffect(() => {
    mounted.current = true;
    const sequence = validationId;
    return () => {
      mounted.current = false;
      sequence.current++;
    };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const currentId = ++validationId.current;

    const validation = studentPhotoFileSchema.safeParse({
      mime_type: file.type,
      file_size_bytes: file.size,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setErrorMessage(firstIssue?.message ?? "Invalid image file.");
      setIsValidating(false);
      return;
    }

    setErrorMessage("");
    setIsValidating(true);
    try {
      try {
        await validateStudentPhotoImage(file);
      } catch (err) {
        if (mounted.current && currentId === validationId.current) {
          setErrorMessage(
            err instanceof Error && err.message.includes("16 megapixels")
              ? err.message
              : "Invalid image file.",
          );
        }
        return;
      }
      if (!mounted.current || currentId !== validationId.current) return;
      await onUpload?.(file);
      if (mounted.current && currentId === validationId.current)
        notify.success("Photo updated.");
    } catch (err) {
      if (mounted.current && currentId === validationId.current) {
        setErrorMessage(
          err instanceof Error ? err.message : "Could not update photo.",
        );
      }
    } finally {
      if (mounted.current && currentId === validationId.current)
        setIsValidating(false);
    }
  }

  async function handleRemove() {
    if (!avatarUrl) return;
    setErrorMessage("");
    try {
      await onRemove?.();
      notify.success("Photo removed.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not remove photo.",
      );
    }
  }

  return (
    <Panel
      title="Profile photo"
      description="Shown in the sidebar and to your adviser. JPG or PNG, up to 5 MB."
      className={cn(className)}
    >
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          aria-label="Profile photo preview"
          className="size-24 shrink-0 rounded-full"
        >
          {displayUrl ? (
            <AvatarImage
              src={displayUrl}
              alt={fullName ? `${fullName} profile photo` : "Profile photo"}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-primary text-display-l font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2.5">
            <Button
              type="button"
              disabled={isBusy || isValidating}
              onClick={() => inputRef.current?.click()}
              className="min-h-11 md:min-h-[38px]"
            >
              Upload photo
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={!avatarUrl || isBusy || isValidating}
              onClick={() => void handleRemove()}
              className="min-h-11 md:min-h-[38px]"
            >
              Remove photo
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            aria-label="Upload profile photo"
            disabled={isBusy || isValidating}
            className="sr-only"
            onChange={(e) => void handleFileChange(e)}
          />

          {isValidating && (
            <p role="status" className="mt-2.5 text-cell">
              Checking and uploading photo…
            </p>
          )}

          {errorMessage && (
            <p role="alert" className="mt-2.5 text-cell text-destructive">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
