import type { ReactNode } from "react"
import { DepartmentToast } from "./dh-ui"
import { useDepartmentToast } from "./dh-utils"
import { ToastContext } from "./notify-context"

export function DepartmentToastProvider({ children }: { children: ReactNode }) {
  const { message, showToast } = useDepartmentToast()
  return (
    <ToastContext value={showToast}>
      {children}
      <DepartmentToast message={message} />
    </ToastContext>
  )
}
