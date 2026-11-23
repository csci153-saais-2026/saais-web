import { useRef, useState, type FormEvent } from "react";
import { CheckIcon } from "@/components/icons";
import { FormField } from "@/components/features/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CLOSING_CTA } from "@/routes/landing/landingData";

export interface WalkthroughDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ValidationErrors {
  name?: string;
  email?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WalkthroughDialog({
  open,
  onOpenChange,
}: WalkthroughDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("");
    setNotes("");
    setErrors({});
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: ValidationErrors = {};
    if (!name.trim()) {
      nextErrors.name = "Enter your name or office.";
    }
    if (!email.trim()) {
      nextErrors.email = "Enter an institutional email address.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (nextErrors.name || nextErrors.email) {
      setErrors(nextErrors);
      if (nextErrors.name) {
        nameRef.current?.focus();
      } else if (nextErrors.email) {
        emailRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-md border border-border bg-card p-6 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Request a walkthrough</DialogTitle>
          <DialogDescription>
            Bring a curriculum version and a de-identified student history to a
            45-minute session with one of your advisers.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-notice-success-border bg-notice-success-bg p-4 text-sm text-notice-success">
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-semibold">Walkthrough details noted</div>
                <p className="mt-1 text-xs leading-relaxed">
                  SAAIS is not deployed to production yet. For direct inquiries,
                  reach the project team at {CLOSING_CTA.contactEmail}.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-lg"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="grid gap-4">
            <FormField
              label="Name"
              htmlFor="walkthrough-name"
              error={errors.name}
            >
              <Input
                ref={nameRef}
                id="walkthrough-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name)
                    setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="[Adviser or department head name]"
                aria-invalid={Boolean(errors.name)}
                className="rounded-sm"
              />
            </FormField>

            <FormField
              label="Institutional email"
              htmlFor="walkthrough-email"
              error={errors.email}
            >
              <Input
                ref={emailRef}
                id="walkthrough-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@[institution].edu.ph"
                aria-invalid={Boolean(errors.email)}
                className="rounded-sm"
              />
            </FormField>

            <FormField
              label="Role or office (optional)"
              htmlFor="walkthrough-role"
            >
              <Input
                id="walkthrough-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Department Head or Adviser"
                className="rounded-sm"
              />
            </FormField>

            <FormField
              label="Curriculum or notes (optional)"
              htmlFor="walkthrough-notes"
            >
              <Textarea
                id="walkthrough-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Which degree program or advising rules you want to inspect."
                className="rounded-sm"
              />
            </FormField>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg">
                Request a walkthrough
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
