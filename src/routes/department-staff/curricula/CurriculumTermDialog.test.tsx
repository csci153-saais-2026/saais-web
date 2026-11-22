import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StaffScopeContext } from "../shared/use-staff-scope";
import { ApiClientError, normalizeApiError } from "@/lib/api";
import CurriculaPage from "./CurriculaPage";
import {
  createCurriculumTerm,
  listCurricula,
  readCurriculum,
  type CurriculumTerm,
  type CurriculumVersion,
} from "./curricula.api";
import { curriculumTermSchema } from "./curriculum-term.schema";

vi.mock("./curricula.api", () => ({
  listCurricula: vi.fn(),
  readCurriculum: vi.fn(),
  createCurriculumTerm: vi.fn(),
  createCurriculumVersion: vi.fn(),
  updateCurriculumVersion: vi.fn(),
  deleteCurriculumVersion: vi.fn(),
  updateCurriculumTerm: vi.fn(),
  deleteCurriculumTerm: vi.fn(),
}));
const scope = {
  status: "ready" as const,
  departmentIds: ["d1"],
  selectedDepartmentId: "d1",
  departmentId: "d1",
  profileId: "staff",
  canQuery: true as const,
  selectDepartment: vi.fn(),
};
const program = {
  id: "p1",
  code: "BSCS",
  name: "Computer Science",
  department_id: "d1",
  nominal_duration: 4,
  status: "active" as const,
};
const version: CurriculumVersion = {
  id: "v1",
  program_id: "p1",
  version_label: "2027",
  effective_start: "2027-08-01",
  total_units: 162,
  delinquency_threshold: 12,
  status: "draft",
};
const existing: CurriculumTerm = {
  id: "t2",
  curriculum_version_id: "v1",
  year_level: 2,
  term_sequence: 1,
};
const added: CurriculumTerm = {
  id: "t1",
  curriculum_version_id: "v1",
  year_level: 1,
  term_sequence: 1,
};
const listKey = ["staff", "staff", "d1", "curricula", {}];
const detailKey = [
  "staff",
  "staff",
  "d1",
  "curriculum-overview",
  { versionId: "v1" },
];
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <StaffScopeContext.Provider value={scope}>
        <CurriculaPage />
      </StaffScopeContext.Provider>
    </QueryClientProvider>,
  );
  return client;
}
async function open() {
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Add term" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Add term" }));
  await screen.findByRole("dialog", { name: "Add term" });
}
beforeEach(() => {
  vi.mocked(listCurricula).mockResolvedValue({
    programs: [program],
    versions: [version],
  });
  vi.mocked(readCurriculum).mockResolvedValue({
    terms: [existing],
    slots: [],
    courses: [],
  });
  vi.mocked(createCurriculumTerm).mockResolvedValue(added);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

async function chooseOption(label: string, option: string) {
  Element.prototype.scrollIntoView = () => {};
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("Positional term validation", () => {
  it.each([
    { year_level: 0, term_sequence: 1 },
    { year_level: 9, term_sequence: 1 },
    { year_level: 1.5, term_sequence: 1 },
    { year_level: NaN, term_sequence: 1 },
    { year_level: 1, term_sequence: 0 },
    { year_level: 1, term_sequence: 4 },
    { year_level: 1, term_sequence: 1.5 },
  ])("rejects invalid numeric positions %j", (values) => {
    expect(curriculumTermSchema.safeParse(values).success).toBe(false);
  });
  it("accepts the contract boundaries and rejects calendar fields", () => {
    expect(
      curriculumTermSchema.safeParse({ year_level: 8, term_sequence: 3 })
        .success,
    ).toBe(true);
    expect(
      curriculumTermSchema.safeParse({
        year_level: 1,
        term_sequence: 1,
        start_date: "2027-08-01",
      }).success,
    ).toBe(false);
  });
});

describe("Add curriculum term", () => {
  it("adds an empty positional term and refreshes ordered terms while preserving the version", async () => {
    const client = mount();
    await open();
    expect(screen.getByRole("dialog").textContent).toContain("2027");
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [added, existing],
      slots: [],
      courses: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    await screen.findByText("Curriculum term added.");
    expect(createCurriculumTerm).toHaveBeenCalledExactlyOnceWith({
      curriculum_version_id: "v1",
      year_level: 1,
      term_sequence: 1,
      slots: [],
    });
    expect(
      (screen.getByLabelText("Curriculum version") as HTMLSelectElement).value,
    ).toBe("v1");
    const headings = screen
      .getAllByText(/^Year \d · Semester \d$/)
      .map((node) => node.textContent);
    expect(headings).toEqual(["Year 1 · Semester 1", "Year 2 · Semester 1"]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(client.getMutationCache().getAll()[0].options.retry).toBe(false);
    expect(listCurricula).toHaveBeenCalledTimes(2);
  });
  it("creates the first term on a blank version without creating slots", async () => {
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [],
      slots: [],
      courses: [],
    });
    mount();
    await open();
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [added],
      slots: [],
      courses: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    await screen.findByText("Curriculum term added.");
    expect(
      screen.getByText("No requirements are available for this term."),
    ).toBeTruthy();
    expect(vi.mocked(createCurriculumTerm).mock.calls[0][0].slots).toEqual([]);
  });
  it("rejects a duplicate position and retains inputs", async () => {
    mount();
    await open();
    await chooseOption("Year level", "2");
    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    await screen.findByText(
      "This year and term position already exists in the selected curriculum.",
    );
    expect(createCurriculumTerm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("combobox", { name: "Year level" }).textContent,
    ).toContain("2");
  });
  it("does not write on cancellation or invalid position", async () => {
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(createCurriculumTerm).not.toHaveBeenCalled();
  });
  it.each([403, 409, 429, 500])(
    "preserves the form on a %i response without automatic retry",
    async (status) => {
      vi.mocked(createCurriculumTerm).mockRejectedValue(
        new ApiClientError(
          normalizeApiError(
            { message: "Term rejected" },
            new Response(null, { status }),
          ),
        ),
      );
      mount();
      await open();
      await chooseOption("Term", "Midyear");
      fireEvent.click(screen.getByRole("button", { name: "Add term" }));
      await screen.findByRole("alert");
      expect(
        screen.getByRole("combobox", { name: "Term" }).textContent,
      ).toContain("Midyear");
      expect(createCurriculumTerm).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Curriculum term added.")).toBeNull();
    },
  );
  it("rechecks department scope before creating a term", async () => {
    const client = mount();
    await open();
    act(() =>
      client.setQueryData(listKey, {
        programs: [{ ...program, department_id: "foreign" }],
        versions: [version],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add term" }));
    await screen.findByText(
      /This version is no longer available in your authorized department/,
    );
    expect(createCurriculumTerm).not.toHaveBeenCalled();
  });
  it("requires loaded requirements before enabling creation", async () => {
    vi.mocked(readCurriculum).mockRejectedValue(
      new Error("Requirements unavailable"),
    );
    mount();
    await screen.findByText("Requirements unavailable");
    expect(
      (screen.getByRole("button", { name: "Add term" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(createCurriculumTerm).not.toHaveBeenCalled();
  });
  it("blocks repeat submission and keeps cached slots intact while refreshing", async () => {
    let finish!: (term: CurriculumTerm) => void;
    vi.mocked(createCurriculumTerm).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const client = mount();
    await open();
    const submit = screen.getByRole("button", { name: "Add term" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await screen.findByRole("button", { name: "Adding term..." });
    expect(createCurriculumTerm).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    const slots = [
      {
        id: "s1",
        curriculum_term_id: "t2",
        is_elective_slot: true,
        nominal_units: 3,
      },
    ];
    act(() =>
      client.setQueryData(detailKey, { terms: [existing], slots, courses: [] }),
    );
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [added, existing],
      slots,
      courses: [],
    });
    await act(async () => finish(added));
    await screen.findByText("Curriculum term added.");
    expect(
      (client.getQueryData(detailKey) as { slots: unknown[] }).slots,
    ).toEqual(slots);
  });
});
