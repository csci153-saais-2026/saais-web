import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import AdminStudentsPage from "./AdminStudentsPage";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiClient: { GET: getMock },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}));

const student = {
  student_id: "student-1",
  student_number: "24-1-01798",
  full_name: "Alex Student",
  email: "alex.student@vsu.edu.ph",
  avatar_url: null,
  status: "active",
  faculty_id: "faculty-1",
  faculty_name: "Faculty of Computing",
  department_id: "department-1",
  department_name: "Department of Computer Science and Technology",
  program_id: "program-1",
  program_code: "BSCS",
  program_name: "Computer Science",
  curriculum_version_id: "curriculum-1",
  curriculum_label: "BSCS 2024-2025 v1",
  entry_year: 2024,
  year_level: 3,
  gwa: 1.75,
  earned_units: 36,
  required_units: 162,
  standing: "good_standing",
  is_delinquent: false,
  deficiencies_count: 1,
  open_inc_count: 1,
  lapsed_inc_count: 0,
  nearest_inc_deadline: null,
  nearest_inc_days_remaining: null,
  open_flags_count: 1,
  assignment_status: "active",
  adviser_id: null,
  adviser_name: null,
  adviser_assigned_since: null,
  handover_label: null,
  last_activity_at: null,
} as const;

function roster(
  items: Array<Omit<typeof student, "full_name"> & { full_name: string }> = [
    student,
  ],
  totalCount = items.length,
) {
  return {
    total_count: totalCount,
    unassigned_count: 0,
    with_deficiencies_count: 1,
    flagged_count: 1,
    open_inc_students_count: 1,
    standing_counts: {
      good_standing: totalCount,
      warning: 0,
      probation: 0,
      dismissed: 0,
    },
    items,
  };
}

const faculties = [{ id: "faculty-1", name: "Faculty of Computing" }];
const programs = [{ id: "program-1", code: "BSCS", name: "Computer Science" }];

async function openFilterSheet() {
  fireEvent.click(screen.getByRole("button", { name: /Filter students/ }));
  return screen.findByRole("dialog");
}

describe("AdminStudentsPage", () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? roster()
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      }),
    );
  });

  afterEach(cleanup);

  it("loads the bounded roster and renders the directory columns", async () => {
    render(<AdminStudentsPage />);

    expect(await screen.findByText("Alex Student")).toBeTruthy();
    expect(screen.getByText("24-1-01798")).toBeTruthy();
    expect(screen.getByText("BSCS 2024-2025 v1")).toBeTruthy();
    expect(screen.getByText("1.75")).toBeTruthy();
    expect(screen.getByText("All students")).toBeTruthy();
    expect(screen.getByText("1 of 1 shown")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(
      screen.getByRole("button", { name: "Sort by Student no." }),
    ).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: /Standing/ })).toBeNull();
    expect(screen.queryByText("Matching students")).toBeNull();
    expect(screen.queryByText("With deficiencies")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Filter students, 0 active filters",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: /Open flags/i }),
    ).toBeTruthy();
    expect(getMock).toHaveBeenCalledWith(
      "/functions/v1/students",
      expect.objectContaining({
        params: {
          query: expect.objectContaining({
            limit: 20,
            offset: 0,
            sort_by: "full_name",
            sort_dir: "asc",
          }),
        },
      }),
    );
  });

  it("sends search and uses server pagination", async () => {
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? roster([student], 21)
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      }),
    );
    render(<AdminStudentsPage />);

    await screen.findByText("Alex Student");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      {
        target: { value: "alex" },
      },
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              search: "alex",
              limit: 20,
              offset: 0,
            }),
          },
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              search: "alex",
              limit: 20,
              offset: 20,
            }),
          },
        }),
      );
    });
  });

  it("clears a retained query error after that query succeeds on a later visit", async () => {
    let failedQueryAttempts = 0;
    getMock.mockImplementation(
      (
        path: string,
        options?: { params?: { query?: { search?: string } } },
      ) => {
        if (path !== "/functions/v1/students") {
          return Promise.resolve({
            data: path === "/rest/v1/faculty" ? faculties : programs,
            response: new Response(),
          });
        }
        const search = options?.params?.query?.search;
        if (search === "recover") {
          failedQueryAttempts += 1;
          return failedQueryAttempts === 1
            ? Promise.reject(new Error("Roster temporarily unavailable."))
            : Promise.resolve({
                data: roster([{ ...student, full_name: "Recovered Student" }]),
                response: new Response(),
              });
        }
        return Promise.resolve({
          data:
            search === "other"
              ? roster([{ ...student, full_name: "Other Student" }])
              : roster(),
          response: new Response(),
        });
      },
    );
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");

    const search = screen.getByRole("searchbox", { name: "Search students" });
    fireEvent.change(search, { target: { value: "recover" } });
    expect(
      await screen.findByText("Roster temporarily unavailable."),
    ).toBeTruthy();

    fireEvent.change(search, { target: { value: "other" } });
    expect(await screen.findByText("Other Student")).toBeTruthy();
    fireEvent.change(search, { target: { value: "recover" } });

    expect(await screen.findByText("Recovered Student")).toBeTruthy();
    expect(screen.queryByText("Roster temporarily unavailable.")).toBeNull();
  });

  it("does not present absent roster counts as zero", async () => {
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? {
                ...roster(),
                flagged_count: undefined,
                open_inc_students_count: undefined,
              }
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      }),
    );
    render(<AdminStudentsPage />);

    await screen.findByText("Alex Student");
    expect(screen.getAllByText("Open flags")).toHaveLength(1);
    expect(screen.queryByText("Matching students")).toBeNull();
    expect(screen.queryByText("With deficiencies")).toBeNull();
  });

  it("shows the request error and allows retrying", async () => {
    let failFirstRosterRequest = true;
    getMock.mockImplementation((path: string) => {
      if (path === "/functions/v1/students" && failFirstRosterRequest) {
        failFirstRosterRequest = false;
        return Promise.reject(new Error("Roster request failed"));
      }
      return Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? roster()
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      });
    });
    render(<AdminStudentsPage />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Roster request failed",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Alex Student")).toBeTruthy();
  });

  it("shows a loading state while the roster request is pending", () => {
    getMock.mockImplementation(() => new Promise(() => {}));
    render(<AdminStudentsPage />);

    expect(document.querySelector("[skullet-status]")?.textContent).toContain(
      "Loading student roster",
    );
  });

  it("distinguishes an empty roster from an empty filtered result", async () => {
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? roster([], 0)
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      }),
    );
    render(<AdminStudentsPage />);

    expect(
      await screen.findByText("No students are available in the roster."),
    ).toBeTruthy();
  });

  it("shows a no-match state when a search has no results", async () => {
    let matching = true;
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? matching
              ? roster()
              : roster([], 0)
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      }),
    );
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");

    matching = false;
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      {
        target: { value: "nobody" },
      },
    );

    expect(
      await screen.findByText("No students match that search."),
    ).toBeTruthy();
  });

  it("uses the responsive table layout for narrow screens", async () => {
    const { container } = render(<AdminStudentsPage />);

    await screen.findByText("Alex Student");
    expect(
      container.querySelector("table")?.classList.contains("stack-table"),
    ).toBe(true);
    expect(screen.getByText("1 open")).toBeTruthy();
    expect(screen.getByText("(1 INC)")).toBeTruthy();
  });

  it("filters the roster by faculty and program", async () => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");
    await openFilterSheet();

    fireEvent.click(
      screen.getByRole("combobox", { name: "Faculty / college" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Faculty of Computing" }),
    );
    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ faculty_id: "faculty-1" }),
          },
        }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(
      screen.getByRole("button", {
        name: "Filter students, 1 active filter",
      }),
    ).toBeTruthy();

    await openFilterSheet();
    fireEvent.click(screen.getByRole("combobox", { name: "Program" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "BSCS · Computer Science" }),
    );
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              faculty_id: "faculty-1",
              program_id: "program-1",
            }),
          },
        }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(
      screen.getByRole("button", {
        name: "Filter students, 2 active filters",
      }),
    ).toBeTruthy();
  });

  it("filters by academic standing, deficiencies, INC, and open flags", async () => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");
    await openFilterSheet();

    fireEvent.click(
      screen.getByRole("combobox", { name: "Academic standing" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "Warning" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Deficiencies" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Has deficiencies" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Open INC" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Has open INC" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Open flags" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Has open flags" }),
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              standing: "warning",
              has_deficiencies: true,
              has_open_inc: true,
              has_open_flags: true,
            }),
          },
        }),
      );
    });
  });

  it("resets all filters and their active count from the filter sheet", async () => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");
    await openFilterSheet();

    fireEvent.click(
      screen.getByRole("combobox", { name: "Faculty / college" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Faculty of Computing" }),
    );
    fireEvent.click(
      screen.getByRole("combobox", { name: "Academic standing" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "Warning" }));

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.getByRole("combobox", { name: "Faculty / college" }).textContent,
    ).toContain("All faculties");
    expect(
      screen.getByRole("combobox", { name: "Academic standing" }).textContent,
    ).toContain("All standings");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(
      screen.getByRole("button", {
        name: "Filter students, 0 active filters",
      }),
    ).toBeTruthy();
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.not.objectContaining({
              faculty_id: "faculty-1",
            }),
          },
        }),
      );
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.not.objectContaining({ standing: "warning" }),
          },
        }),
      );
    });
  });

  it("sorts the roster by supported table columns", async () => {
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");

    fireEvent.click(
      screen.getByRole("button", { name: "Sort by Student no." }),
    );
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              sort_by: "student_number",
              sort_dir: "asc",
            }),
          },
        }),
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Sort by Student no./ }),
    );
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              sort_by: "student_number",
              sort_dir: "desc",
            }),
          },
        }),
      );
    });
  });

  it("keeps pagination bounded and returns to the previous page", async () => {
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? roster([student], 21)
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      }),
    );
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");
    expect(screen.getByText("Showing 1–1 of 21 students")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Previous" }).hasAttribute("disabled"),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: { query: expect.objectContaining({ limit: 20, offset: 20 }) },
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: { query: expect.objectContaining({ limit: 20, offset: 0 }) },
        }),
      );
    });
  });

  it("resets the page offset when search criteria change", async () => {
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === "/functions/v1/students"
            ? roster([student], 21)
            : path === "/rest/v1/faculty"
              ? faculties
              : programs,
        response: new Response(),
      }),
    );
    render(<AdminStudentsPage />);
    await screen.findByText("Alex Student");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: { query: expect.objectContaining({ offset: 20 }) },
        }),
      );
    });

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      {
        target: { value: "alex" },
      },
    );
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        "/functions/v1/students",
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ search: "alex", offset: 0 }),
          },
        }),
      );
    });
  });
});
