import { createContext, useContext } from "react";

export const ToastContext = createContext<((message: string) => void) | null>(
  null,
);

/** Shows a short confirmation toast. Must be used inside `DepartmentToastProvider`. */
export function useNotify() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useNotify needs DepartmentToastProvider.");
  return notify;
}
