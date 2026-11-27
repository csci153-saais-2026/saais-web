import type { ReactNode } from "react";
import { StaffScopeContext, useResolvedStaffScope } from "./use-staff-scope";

export function StaffScopeProvider({ children }: { children: ReactNode }) {
  const scope = useResolvedStaffScope();

  return (
    <StaffScopeContext.Provider value={scope}>
      {children}
    </StaffScopeContext.Provider>
  );
}
