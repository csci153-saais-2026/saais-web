import { waitForLoaded } from "@/test/wait-for-loaded";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import AdminAccountsPage from "./AdminAccountsPage";

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiClient: { GET: getMock, POST: postMock, PATCH: patchMock },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { email: "admin@vsu.edu.ph" } }),
}));

const account = {
  profile: {
    id: "profile-1",
    role: "adviser",
    roles: ["adviser", "department_head"],
    email: "alex@vsu.edu.ph",
    full_name: "Alex Adviser",
    student_number: null,
    status: "active",
    invitation_status: "accepted",
    faculty_id: "faculty-1",
    department_id: "department-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  role_assignments: [
    {
      id: "role-1",
      profile_id: "profile-1",
      role: "adviser",
      faculty_id: "faculty-1",
      department_id: "department-1",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "role-2",
      profile_id: "profile-1",
      role: "department_head",
      faculty_id: "faculty-1",
      department_id: "department-1",
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  student_organization: null,
} as const;
const faculties = [
  { id: "faculty-1", name: "Faculty of Computing" },
  { id: "faculty-2", name: "Faculty of Agriculture" },
];
const departments = [
  {
    id: "department-1",
    name: "Computer Science",
    faculty_id: "faculty-1",
  },
  {
    id: "department-2",
    name: "Agriculture",
    faculty_id: "faculty-2",
  },
];
const programs = [
  {
    id: "program-1",
    code: "CS",
    name: "Computer Science",
    department_id: "department-1",
    status: "active",
  },
];
const curricula = [
  {
    id: "curriculum-1",
    program_id: "program-1",
    version_label: "CS 2026",
    status: "active",
  },
];

function clickAccountAction(accountName: string, action: string) {
  const trigger = screen.getByRole("button", {
    name: `Actions for ${accountName}`,
  });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });
  fireEvent.click(screen.getByRole("menuitem", { name: action }));
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminAccountsPage />
    </QueryClientProvider>,
  );
}

describe("AdminAccountsPage", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    postMock.mockImplementation((path: string) =>
      Promise.resolve({
        data: path.endsWith("resend-invite")
          ? {
              success: true,
              message: "Invitation resent.",
              profile_id: "profile-1",
              invitation_status: "pending",
              invitation_sent_at: "2026-01-02T00:00:00Z",
              invitation_expires_at: "2026-01-09T00:00:00Z",
            }
          : path.endsWith("revoke-invite")
            ? account.profile
            : {
                success: true,
                message: "Invitation dispatched.",
                profile_id: "profile-new",
              },
        response: new Response(),
      }),
    );
    patchMock.mockResolvedValue({
      data: account.profile,
      response: new Response(),
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/accounts"
            ? [account]
            : path === "/rest/v1/faculty"
              ? faculties
              : path === "/rest/v1/department"
                ? departments
                : path === "/rest/v1/program"
                  ? programs
                  : path === "/rest/v1/curriculum_version"
                    ? curricula
                    : [],
        response: new Response(),
      }),
    );
  });

  afterEach(cleanup);

  it("loads a bounded account page with roles, organization, and lifecycle states", async () => {
    renderPage();

    expect(await screen.findByText("Alex Adviser")).toBeTruthy();
    await waitForLoaded();
    expect(screen.getByText("alex@vsu.edu.ph")).toBeTruthy();
    expect(screen.getByText("Faculty of Computing")).toBeTruthy();
    expect(screen.getByText("Computer Science")).toBeTruthy();
    expect(screen.getByText("Adviser")).toBeTruthy();
    expect(screen.getByText("Department Head")).toBeTruthy();
    expect(screen.getByText("Invitation: Accepted")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Actions for Alex Adviser" }),
    ).toBeTruthy();
    expect(getMock).toHaveBeenCalledWith(
      "/functions/v1/accounts",
      expect.objectContaining({
        params: {
          query: { limit: 21, offset: 0 },
        },
      }),
    );
  });

  it("sends search and role filters to the list operation", async () => {
    renderPage();
    await screen.findByText("Alex Adviser");

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search accounts" }),
      {
        target: { value: "alex" },
      },
    );
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/accounts",
        expect.objectContaining({
          params: {
            query: { limit: 21, offset: 0, search: "alex" },
          },
        }),
      );
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Role" }));
    fireEvent.click(await screen.findByRole("option", { name: "Adviser" }));
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/accounts",
        expect.objectContaining({
          params: {
            query: { limit: 21, offset: 0, search: "alex", role: "adviser" },
          },
        }),
      );
    });
  });

  it("shows explicit empty and request error states", async () => {
    getMock.mockImplementation((path: string) =>
      path === "/functions/v1/accounts"
        ? Promise.resolve({ data: [], response: new Response() })
        : Promise.resolve({ data: [], response: new Response() }),
    );
    const { unmount } = renderPage();
    expect(
      await screen.findByText(
        "No accounts match these search and filter values.",
      ),
    ).toBeTruthy();

    unmount();
    getMock.mockImplementation((path: string) =>
      path === "/functions/v1/accounts"
        ? Promise.reject(new Error("Accounts unavailable"))
        : Promise.resolve({ data: [], response: new Response() }),
    );
    renderPage();
    const errors = await screen.findAllByRole("alert");
    expect(
      errors.some((error) =>
        error.textContent?.includes("Accounts unavailable"),
      ),
    ).toBe(true);
  });

  it("requests the next bounded page only when another row exists", async () => {
    const pageRows = Array.from({ length: 21 }, (_, index) => ({
      ...account,
      profile: { ...account.profile, id: `profile-${index}` },
      role_assignments: account.role_assignments.map((assignment) => ({
        ...assignment,
        profile_id: `profile-${index}`,
      })),
    }));
    getMock.mockImplementation(
      (path: string, options?: { params?: { query?: { offset?: number } } }) =>
        Promise.resolve({
          data:
            path === "/functions/v1/accounts"
              ? options?.params?.query?.offset === 20
                ? [pageRows[20]]
                : pageRows
              : path === "/rest/v1/faculty"
                ? faculties
                : departments,
          response: new Response(),
        }),
    );

    renderPage();
    await screen.findAllByText("Alex Adviser");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/accounts",
        expect.objectContaining({
          params: { query: { limit: 21, offset: 20 } },
        }),
      );
    });
  });

  it("submits a valid account invitation and reports success", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "New Administrator" },
    });
    fireEvent.change(screen.getByLabelText("VSU email"), {
      target: { value: "new.admin@vsu.edu.ph" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "System Admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        "/functions/v1/auth/invite",
        expect.objectContaining({
          body: {
            email: "new.admin@vsu.edu.ph",
            full_name: "New Administrator",
            role: "admin",
          },
        }),
      );
    });
    expect(await screen.findByText("Invitation dispatched.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resets selected roles when the invitation dialog closes and reopens", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    const systemAdmin = await screen.findByRole("checkbox", {
      name: "System Admin",
    });
    await waitFor(() =>
      expect(systemAdmin.hasAttribute("disabled")).toBe(false),
    );
    fireEvent.click(systemAdmin);
    await waitFor(() =>
      expect(systemAdmin.getAttribute("aria-checked")).toBe("true"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    expect(
      (
        await screen.findByRole("checkbox", { name: "System Admin" })
      ).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("validates identity fields before sending an invitation", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "System Admin" }),
    );
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "New Administrator" },
    });
    fireEvent.change(screen.getByLabelText("VSU email"), {
      target: { value: "new.admin@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(
      await screen.findByText(
        "Use an institutional email ending in @vsu.edu.ph.",
        undefined,
        { timeout: 5000 },
      ),
    ).toBeTruthy();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("filters student catalogs and resets dependent selections", async () => {
    const agricultureAdviser = {
      ...account,
      profile: {
        ...account.profile,
        id: "profile-2",
        full_name: "Ag Adviser",
        email: "ag.adviser@vsu.edu.ph",
        faculty_id: "faculty-2",
        department_id: "department-2",
      },
      role_assignments: [
        {
          ...account.role_assignments[0],
          id: "role-3",
          profile_id: "profile-2",
          faculty_id: "faculty-2",
          department_id: "department-2",
        },
      ],
    };
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/accounts"
            ? [account, agricultureAdviser]
            : path === "/rest/v1/faculty"
              ? faculties
              : path === "/rest/v1/department"
                ? departments
                : path === "/rest/v1/program"
                  ? [
                      ...programs,
                      {
                        id: "program-2",
                        code: "AG",
                        name: "Agriculture",
                        department_id: "department-2",
                        status: "active",
                      },
                      {
                        id: "program-inactive",
                        code: "OLD",
                        name: "Inactive program",
                        department_id: "department-1",
                        status: "inactive",
                      },
                    ]
                  : path === "/rest/v1/curriculum_version"
                    ? [
                        ...curricula,
                        {
                          id: "curriculum-inactive",
                          program_id: "program-1",
                          version_label: "CS 2024",
                          status: "inactive",
                        },
                      ]
                    : [],
        response: new Response(),
      }),
    );
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    const studentRole = await screen.findByRole("checkbox", {
      name: "Student",
    });
    await waitFor(() =>
      expect(studentRole.hasAttribute("disabled")).toBe(false),
    );
    fireEvent.click(studentRole);
    await waitFor(() =>
      expect(
        screen
          .getByRole("combobox", { name: "Faculty" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Faculty" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Faculty of Computing" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Department" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Computer Science" }),
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Program" }));
    expect(
      await screen.findByRole("option", { name: "CS · Computer Science" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("option", { name: "Inactive program" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("option", { name: "CS · Computer Science" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Curriculum" }));
    expect(await screen.findByRole("option", { name: "CS 2026" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "CS 2024" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "CS 2026" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Initial adviser" }));
    expect(
      await screen.findByRole("option", { name: "Alex Adviser" }),
    ).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Ag Adviser" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "Alex Adviser" }));

    fireEvent.click(screen.getByRole("combobox", { name: "Faculty" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Faculty of Agriculture" }),
    );
    expect(
      screen
        .getByRole("combobox", { name: "Program" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("combobox", { name: "Curriculum" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("combobox", { name: "Initial adviser" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("uses the first checked role as primary and sends remaining role assignments", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "New Department Lead" },
    });
    fireEvent.change(screen.getByLabelText("VSU email"), {
      target: { value: "new.lead@vsu.edu.ph" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "System Admin" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Department Head" }));

    fireEvent.click(screen.getByRole("combobox", { name: "Faculty" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Faculty of Computing" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Department" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Computer Science" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        "/functions/v1/auth/invite",
        expect.objectContaining({
          body: {
            email: "new.lead@vsu.edu.ph",
            full_name: "New Department Lead",
            role: "admin",
            role_assignments: [
              {
                role: "department_head",
                faculty_id: "faculty-1",
                department_id: "department-1",
              },
            ],
          },
        }),
      );
    });
  });

  it("makes Student exclusive and includes required student provisioning fields", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "New Student" },
    });
    fireEvent.change(screen.getByLabelText("VSU email"), {
      target: { value: "new.student@vsu.edu.ph" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "System Admin" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Department Head" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Student" }));

    const adminRole = screen.getByRole("checkbox", { name: "System Admin" });
    const departmentHeadRole = screen.getByRole("checkbox", {
      name: "Department Head",
    });
    expect(adminRole.getAttribute("aria-checked")).toBe("false");
    expect(adminRole.hasAttribute("disabled")).toBe(true);
    expect(departmentHeadRole.getAttribute("aria-checked")).toBe("false");
    expect(departmentHeadRole.hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("combobox", { name: "Faculty" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Faculty of Computing" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Department" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Computer Science" }),
    );
    fireEvent.change(screen.getByLabelText("Student number"), {
      target: { value: "26-1-00001" },
    });
    fireEvent.change(screen.getByLabelText("Entry year (optional)"), {
      target: { value: "2026" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Program" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "CS · Computer Science" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Curriculum" }));
    fireEvent.click(await screen.findByRole("option", { name: "CS 2026" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Initial adviser" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Alex Adviser" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        "/functions/v1/auth/invite",
        expect.objectContaining({
          body: {
            email: "new.student@vsu.edu.ph",
            full_name: "New Student",
            role: "student",
            student_number: "26-1-00001",
            program_id: "program-1",
            curriculum_version_id: "curriculum-1",
            adviser_id: "profile-1",
            entry_year: 2026,
          },
        }),
      );
    });
  });

  it("keeps the provisioning dialog open and reports API failures", async () => {
    postMock.mockRejectedValueOnce(new Error("Duplicate email conflict"));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "Existing Administrator" },
    });
    fireEvent.change(screen.getByLabelText("VSU email"), {
      target: { value: "existing.admin@vsu.edu.ph" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "System Admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Duplicate email conflict",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("keeps an invitation dialog open while submission is pending", async () => {
    let resolveInvite:
      ((value: { data: unknown; response: Response }) => void) | undefined;
    postMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInvite = resolve;
        }),
    );
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "New Administrator" },
    });
    fireEvent.change(screen.getByLabelText("VSU email"), {
      target: { value: "new.admin@vsu.edu.ph" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "System Admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Add account", hidden: true })
        .hasAttribute("disabled"),
    ).toBe(true);

    resolveInvite?.({
      data: { success: true, message: "Invitation dispatched." },
      response: new Response(),
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows an optional department selector for adviser assignments", async () => {
    const adviserOnlyAccount = {
      ...account,
      profile: {
        ...account.profile,
        roles: ["adviser"],
        department_id: null,
      },
      role_assignments: [
        {
          ...account.role_assignments[0],
          department_id: null,
        },
      ],
    };
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/accounts"
            ? [adviserOnlyAccount]
            : path === "/rest/v1/faculty"
              ? faculties
              : departments,
        response: new Response(),
      }),
    );

    renderPage();
    await screen.findByText("Alex Adviser");
    clickAccountAction("Alex Adviser", "Edit");

    expect(screen.getByRole("combobox", { name: "Department" })).toBeTruthy();
  });
});
