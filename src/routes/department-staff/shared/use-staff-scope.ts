import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { staffQueryKeys } from "./staff-query-keys";

type StaffScopeUnavailableReason =
  "unauthenticated" | "role-not-assigned" | "department-not-assigned";

type StaffScopeState =
  | {
      status: "loading";
      departmentIds: readonly string[];
      selectedDepartmentId: null;
      canQuery: false;
      selectDepartment: (departmentId: string) => void;
    }
  | {
      status: "unavailable";
      reason: StaffScopeUnavailableReason;
      departmentIds: readonly string[];
      selectedDepartmentId: null;
      canQuery: false;
      selectDepartment: (departmentId: string) => void;
    }
  | {
      status: "select-department";
      departmentIds: readonly string[];
      selectedDepartmentId: null;
      canQuery: false;
      selectDepartment: (departmentId: string) => void;
    }
  | {
      status: "clearing";
      departmentIds: readonly string[];
      departmentId: string;
      selectedDepartmentId: string;
      canQuery: false;
      selectDepartment: (departmentId: string) => void;
    }
  | {
      status: "ready";
      departmentIds: readonly string[];
      departmentId: string;
      selectedDepartmentId: string;
      profileId: string;
      canQuery: true;
      selectDepartment: (departmentId: string) => void;
    };

export const StaffScopeContext = createContext<StaffScopeState | null>(null);

export function useResolvedStaffScope(): StaffScopeState {
  const { user, roles, roleAssignments, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<{
    profileId: string;
    departmentId: string;
  } | null>(null);
  const [clearedScopeKey, setClearedScopeKey] = useState<string | null>();

  const departmentIds = useMemo(
    () =>
      Array.from(
        new Set(
          roleAssignments.flatMap((assignment) =>
            assignment.profile_id === user?.id &&
            assignment.role === "department_staff" &&
            assignment.department_id
              ? [assignment.department_id]
              : [],
          ),
        ),
      ),
    [roleAssignments, user?.id],
  );

  const selectedDepartmentId =
    departmentIds.length === 1
      ? departmentIds[0]
      : selection?.profileId === user?.id &&
          departmentIds.includes(selection.departmentId)
        ? selection.departmentId
        : null;
  const scopeKey =
    user && selectedDepartmentId ? `${user.id}:${selectedDepartmentId}` : null;

  useEffect(() => {
    if (clearedScopeKey === scopeKey) return;

    let cancelled = false;
    void queryClient
      .cancelQueries({ queryKey: staffQueryKeys.all })
      .then(() => {
        if (cancelled) return;
        queryClient.removeQueries({ queryKey: staffQueryKeys.all });
        setClearedScopeKey(scopeKey);
      });

    return () => {
      cancelled = true;
    };
  }, [clearedScopeKey, queryClient, scopeKey]);

  const selectDepartment = (departmentId: string) => {
    if (!user || !departmentIds.includes(departmentId)) return;
    setSelection({ profileId: user.id, departmentId });
  };

  if (isLoading) {
    return {
      status: "loading",
      departmentIds,
      selectedDepartmentId: null,
      canQuery: false,
      selectDepartment,
    };
  }

  if (!user) {
    return {
      status: "unavailable",
      reason: "unauthenticated",
      departmentIds,
      selectedDepartmentId: null,
      canQuery: false,
      selectDepartment,
    };
  }

  if (!roles.includes("department_staff")) {
    return {
      status: "unavailable",
      reason: "role-not-assigned",
      departmentIds,
      selectedDepartmentId: null,
      canQuery: false,
      selectDepartment,
    };
  }

  if (departmentIds.length === 0) {
    return {
      status: "unavailable",
      reason: "department-not-assigned",
      departmentIds,
      selectedDepartmentId: null,
      canQuery: false,
      selectDepartment,
    };
  }

  if (!selectedDepartmentId) {
    return {
      status: "select-department",
      departmentIds,
      selectedDepartmentId: null,
      canQuery: false,
      selectDepartment,
    };
  }

  if (clearedScopeKey !== scopeKey) {
    return {
      status: "clearing",
      departmentIds,
      departmentId: selectedDepartmentId,
      selectedDepartmentId,
      canQuery: false,
      selectDepartment,
    };
  }

  return {
    status: "ready",
    departmentIds,
    departmentId: selectedDepartmentId,
    selectedDepartmentId,
    profileId: user.id,
    canQuery: true,
    selectDepartment,
  };
}

export function useStaffScope(): StaffScopeState {
  const scope = useContext(StaffScopeContext);
  if (!scope) {
    throw new Error("useStaffScope must be used within a <StaffScopeProvider>");
  }
  return scope;
}
