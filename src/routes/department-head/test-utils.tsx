import type { ReactElement } from "react"
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { loginAsMockPersona, logoutMockPersona, resetMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import { DepartmentToastProvider } from "./shared/DepartmentToastProvider"

/** Runs the department-head screens against the shared MSW mock API as the department head persona. */
export function setupDepartmentHeadMockApi() {
  beforeAll(() => {
    saaisMockServer.listen()
    if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {}
  })
  beforeEach(() => {
    resetMockDatabase()
    loginAsMockPersona("department_head")
  })
  afterEach(() => {
    cleanup()
    saaisMockServer.resetHandlers()
    logoutMockPersona()
  })
  afterAll(() => saaisMockServer.close())
}

export function renderDepartmentHead(ui: ReactElement, route = "/department-head") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <DepartmentToastProvider>{ui}</DepartmentToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
