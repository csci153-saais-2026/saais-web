import { toast } from "sonner";

/** App-wide confirmation toasts. Requires `<Toaster />` (mounted in `App`). */
export const notify = Object.assign(
  (message: string) => toast.success(message),
  {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
  },
);
