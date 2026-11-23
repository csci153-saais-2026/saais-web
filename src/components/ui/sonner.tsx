import { Toaster as Sonner, type ToasterProps } from "sonner";
import { AlertIcon, BellIcon, CheckIcon, XIcon } from "@/components/icons";

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    position="bottom-right"
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
      } as React.CSSProperties
    }
    {...props}
  />
);

export { Toaster };
