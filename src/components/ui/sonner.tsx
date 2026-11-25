import { Toaster as Sonner, type ToasterProps } from "sonner";
import { AlertIcon, BellIcon, CheckIcon, XIcon } from "@/components/icons";

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    position="top-right"
    richColors
    className="toaster group"
    icons={{
      success: <CheckIcon className="size-4" />,
      info: <BellIcon className="size-4" />,
      warning: <AlertIcon className="size-4" />,
      error: <XIcon className="size-4" />,
    }}
    style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
        "--success-bg": "var(--notice-success-bg)",
        "--success-text": "var(--notice-success)",
        "--success-border": "var(--notice-success-border)",
        "--error-bg": "var(--notice-danger-bg)",
        "--error-text": "var(--notice-danger)",
        "--error-border": "var(--notice-danger-border)",
        // richColors would otherwise tint info toasts blue.
        "--info-bg": "var(--popover)",
        "--info-text": "var(--popover-foreground)",
        "--info-border": "var(--border)",
      } as React.CSSProperties
    }
    {...props}
  />
);

export { Toaster };
