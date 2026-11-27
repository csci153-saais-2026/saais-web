import type { ReactElement } from "react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import {
  loginAsMockPersona,
  logoutMockPersona,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import { MOCK_PERSONAS } from "@/mocks/personas";

/** Runs the department-head screens against the shared MSW mock API as the department head persona. */
export function setupDepartmentHeadMockApi() {
  beforeAll(() => {
    saaisMockServer.listen();
    if (!HTMLElement.prototype.scrollIntoView)
      HTMLElement.prototype.scrollIntoView = () => {};
  });
  beforeEach(() => {
    resetMockDatabase();
    loginAsMockPersona("department_head");
  });
  afterEach(() => {
    cleanup();
    saaisMockServer.resetHandlers();
    logoutMockPersona();
  });
  afterAll(() => saaisMockServer.close());
}

export function renderDepartmentHead(
  ui: ReactElement,
  route = "/department-head",
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const auth = {
    user: null,
    activeRole: "department_head",
    roleScopes: [
      {
        role: "department_head",
        facultyId: null,
        departmentId: MOCK_PERSONAS.department_head.departmentId,
      },
    ],
  } as unknown as AuthContextValue;
  return render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

export { waitForLoaded } from "@/test/wait-for-loaded";
