import { renderHook } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import { useDepartmentHeadQueryKey } from "./use-dh-query-key";

function scopedAuth(userId: string, departmentId: string): AuthContextValue {
  return {
    user: {
      id: userId,
      departmentId,
      facultyId: "faculty-a",
    },
    activeRole: "department_head",
    roleScopes: [
      {
        role: "department_head",
        departmentId,
        facultyId: "faculty-a",
      },
    ],
  } as unknown as AuthContextValue;
}

function keyFor(auth: AuthContextValue) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
  );
  return renderHook(
    () => useDepartmentHeadQueryKey(["department-head", "students"]),
    { wrapper },
  ).result.current;
}

describe("department-head query scope keys", () => {
  it("separates cached records by account and department", () => {
    const departmentA = keyFor(scopedAuth("head-a", "dept-a"));
    const otherAccount = keyFor(scopedAuth("head-b", "dept-a"));
    const otherDepartment = keyFor(scopedAuth("head-a", "dept-b"));

    expect(otherAccount).not.toEqual(departmentA);
    expect(otherDepartment).not.toEqual(departmentA);
  });
});
