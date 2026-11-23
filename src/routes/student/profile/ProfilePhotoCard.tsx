import * as React from "react";
import { notify } from "@/lib/notify";
import { Panel } from "@/components/features/panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { studentPhotoFileSchema } from "./student-photo-schema";

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
 * client-side 2 MB JPG/PNG validation, and accessible status feedback.
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
  const [errorMessage, setErrorMessage] = React.useState<string>("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validation = studentPhotoFileSchema.safeParse({
      mime_type: file.type,
      file_size_bytes: file.size,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setErrorMessage(firstIssue?.message ?? "Invalid image file.");
      return;
    }

    setErrorMessage("");
    try {
      await onUpload?.(file);
      notify.success("Photo updated.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not update photo.",
      );
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
      description="Shown in the sidebar and to your adviser. JPG or PNG, up to 2 MB."
      className={cn(className)}
    >
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          aria-label="Profile photo preview"
          className="size-24 shrink-0 rounded-full"
        >
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
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
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className="min-h-11 md:min-h-[38px]"
            >
              Upload photo
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={!avatarUrl || isBusy}
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
            className="sr-only"
            onChange={(e) => void handleFileChange(e)}
          />

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
