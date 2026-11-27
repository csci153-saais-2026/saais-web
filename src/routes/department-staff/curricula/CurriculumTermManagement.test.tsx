import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StaffScopeContext } from "../shared/use-staff-scope";
import { ApiClientError, normalizeApiError } from "@/lib/api";
import CurriculaPage from "./CurriculaPage";
import {
  createCurriculumTerm,
  deleteCurriculumTerm,
  listCurricula,
  readCurriculum,
  updateCurriculumTerm,
  type CurriculumTerm,
  type CurriculumVersion,
} from "./curricula.api";

vi.mock("./curricula.api", () => ({
  listCurricula: vi.fn(),
  readCurriculum: vi.fn(),
  createCurriculumTerm: vi.fn(),
  updateCurriculumTerm: vi.fn(),
  deleteCurriculumTerm: vi.fn(),
  createCurriculumVersion: vi.fn(),
  updateCurriculumVersion: vi.fn(),
  deleteCurriculumVersion: vi.fn(),
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
const term: CurriculumTerm = {
  id: "t1",
  curriculum_version_id: "v1",
  year_level: 1,
  term_sequence: 1,
};
const other: CurriculumTerm = {
  id: "t2",
  curriculum_version_id: "v1",
  year_level: 2,
  term_sequence: 1,
};
const slots = [
  {
    id: "s1",
    curriculum_term_id: "t1",
    is_elective_slot: true,
    slot_label: "Free elective",
    nominal_units: 3,
  },
];
const detailKey = [
  "staff",
  "staff",
  "d1",
  "curriculum-overview",
  { versionId: "v1" },
];
const listKey = ["staff", "staff", "d1", "curricula", {}];
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
async function open(action: "Edit" | "Delete") {
  fireEvent.click(
    await screen.findByRole("button", {
      name: `${action} Year 1 · Semester 1`,
    }),
  );
  await screen.findByRole("dialog", {
    name: action === "Delete" ? "Delete record" : "Edit term",
  });
}
function reject(status: number, message = "History protects this term") {
  return new ApiClientError(
    normalizeApiError({ message }, new Response(null, { status })),
  );
}
beforeEach(() => {
  vi.mocked(listCurricula).mockResolvedValue({
    programs: [program],
    versions: [version],
  });
  vi.mocked(readCurriculum).mockResolvedValue({
    terms: [term, other],
    slots,
    courses: [],
  });
  vi.mocked(updateCurriculumTerm).mockResolvedValue({
    ...term,
    year_level: 3,
    term_sequence: 2,
  });
  vi.mocked(deleteCurriculumTerm).mockResolvedValue(undefined);
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

describe("Manage positional curriculum terms", () => {
  it("prefills and reorders an edited term while preserving slots and the selected version", async () => {
    const client = mount();
    await open("Edit");
    expect(
      screen.getByRole("combobox", { name: "Year level" }).textContent,
    ).toContain("1");
    expect(
      screen.getByRole("combobox", { name: "Term" }).textContent,
    ).toContain("Semester 1");
    await chooseOption("Year level", "3");
    await chooseOption("Term", "Semester 2");
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [other, { ...term, year_level: 3, term_sequence: 2 }],
      slots,
      courses: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Curriculum term updated.");
    expect(updateCurriculumTerm).toHaveBeenCalledExactlyOnceWith("t1", {
      year_level: 3,
      term_sequence: 2,
    });
    expect(
      screen
        .getAllByText(/^Year \d · Semester \d$/)
        .map((node) => node.textContent),
    ).toEqual(["Year 2 · Semester 1", "Year 3 · Semester 2"]);
    expect(
      screen.getByRole("combobox", { name: "Curriculum version" }).textContent,
    ).toContain("2027");
    expect(
      (client.getQueryData(detailKey) as { slots: unknown[] }).slots,
    ).toEqual(slots);
    expect(createCurriculumTerm).not.toHaveBeenCalled();
  });
  it("rejects duplicate and invalid edits without writing or losing form values", async () => {
    mount();
    await open("Edit");
    await chooseOption("Year level", "2");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText(
      "This year and term position already exists in the selected curriculum.",
    );
    expect(
      screen.getByRole("combobox", { name: "Year level" }).textContent,
    ).toContain("2");
    expect(updateCurriculumTerm).not.toHaveBeenCalled();
  });
  it.each(["Edit", "Delete"] as const)(
    "does not mutate when the %s dialog is cancelled",
    async (action) => {
      mount();
      await open(action);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(updateCurriculumTerm).not.toHaveBeenCalled();
      expect(deleteCurriculumTerm).not.toHaveBeenCalled();
    },
  );
  it("names the deletion target and requirements, deleting only after server success", async () => {
    const client = mount();
    await open("Delete");
    expect(screen.getByRole("dialog").textContent).toContain(
      "Year 1 · Semester 1 from 2027",
    );
    expect(screen.getByRole("dialog").textContent).toContain("1 course(s)");
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [other],
      slots: [],
      courses: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("Curriculum term deleted.");
    expect(deleteCurriculumTerm).toHaveBeenCalledExactlyOnceWith("t1");
    expect(screen.queryByText("Year 1 · Semester 1")).toBeNull();
    expect(screen.getByText("Year 2 · Semester 1")).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Curriculum version" }).textContent,
    ).toContain("2027");
    expect(
      (client.getQueryData(detailKey) as { slots: unknown[] }).slots,
    ).toEqual([]);
    expect(updateCurriculumTerm).not.toHaveBeenCalled();
  });
  it.each([
    "Referenced history prevents deletion",
    "Last required term cannot be deleted",
  ])("preserves the term and slots on server conflict: %s", async (message) => {
    vi.mocked(deleteCurriculumTerm).mockRejectedValue(reject(409, message));
    const client = mount();
    await open("Delete");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect((await screen.findByRole("alert")).textContent).toContain(message);
    expect(screen.getByText("Year 1 · Semester 1")).toBeTruthy();
    expect(
      (client.getQueryData(detailKey) as { slots: unknown[] }).slots,
    ).toEqual(slots);
    expect(deleteCurriculumTerm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Curriculum term deleted.")).toBeNull();
  });
  it("shows the no-terms state if the server permits removal of the final term", async () => {
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [term],
      slots: [],
      courses: [],
    });
    mount();
    await open("Delete");
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [],
      slots: [],
      courses: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("Curriculum term deleted.");
    expect(
      screen.getByText("No terms are available for this curriculum version."),
    ).toBeTruthy();
  });
  it.each([403, 409, 429, 500])(
    "keeps edited values after a %i response without retrying automatically",
    async (status) => {
      vi.mocked(updateCurriculumTerm).mockRejectedValue(reject(status));
      mount();
      await open("Edit");
      await chooseOption("Year level", "3");
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await screen.findByRole("alert");
      expect(
        screen.getByRole("combobox", { name: "Year level" }).textContent,
      ).toContain("3");
      expect(updateCurriculumTerm).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Curriculum term updated.")).toBeNull();
    },
  );
  it("blocks a stale term or scope change before any delete request", async () => {
    const client = mount();
    await open("Delete");
    act(() =>
      client.setQueryData(detailKey, {
        terms: [{ ...term, year_level: 3 }, other],
        slots,
        courses: [],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText(/This term changed while the dialog was open/);
    expect(deleteCurriculumTerm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    act(() =>
      client.setQueryData(detailKey, {
        terms: [term, other],
        slots,
        courses: [],
      }),
    );
    await open("Delete");
    act(() =>
      client.setQueryData(listKey, {
        programs: [{ ...program, department_id: "foreign" }],
        versions: [version],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText(
      /This version is no longer available in your authorized department/,
    );
    expect(deleteCurriculumTerm).not.toHaveBeenCalled();
  });
  it("blocks duplicate submissions and closing during deletion", async () => {
    let finish!: () => void;
    vi.mocked(deleteCurriculumTerm).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const client = mount();
    await open("Delete");
    const confirm = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByRole("button", { name: "Deleting term..." });
    expect(deleteCurriculumTerm).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (client.getQueryData(detailKey) as { slots: unknown[] }).slots,
    ).toEqual(slots);
    vi.mocked(readCurriculum).mockResolvedValue({
      terms: [other],
      slots: [],
      courses: [],
    });
    await act(async () => finish());
    await screen.findByText("Curriculum term deleted.");
    expect(
      client
        .getMutationCache()
        .getAll()
        .every((mutation) => mutation.options.retry === false),
    ).toBe(true);
  });
});
