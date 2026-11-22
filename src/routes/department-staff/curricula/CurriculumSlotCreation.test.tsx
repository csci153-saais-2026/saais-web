import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StaffScopeContext } from "../shared/use-staff-scope";
import { ApiClientError, normalizeApiError } from "@/lib/api";
import { staffQueryKeys } from "../shared/staff-query-keys";
import {
  createCurriculumSlot,
  listCurriculumCourses,
  type Course,
  type CurriculumSlot,
  type CurriculumTerm,
  type CurriculumVersion,
} from "./curricula.api";
import { CurriculumSlotDialog } from "./CurriculumSlotDialog";

vi.mock("./curricula.api", () => ({
  createCurriculumSlot: vi.fn(),
  listCurriculumCourses: vi.fn(),
  createCurriculumTerm: vi.fn(),
  createCurriculumVersion: vi.fn(),
  deleteCurriculumTerm: vi.fn(),
  deleteCurriculumVersion: vi.fn(),
  listCurricula: vi.fn(),
  readCurriculum: vi.fn(),
  updateCurriculumTerm: vi.fn(),
  updateCurriculumVersion: vi.fn(),
}));

const scope = {
  status: "ready" as const,
  departmentIds: ["department"],
  selectedDepartmentId: "department",
  departmentId: "department",
  profileId: "staff",
  canQuery: true as const,
  selectDepartment: vi.fn(),
};
const program = {
  id: "program",
  code: "CS",
  name: "Computer Science",
  department_id: "department",
  nominal_duration: 4,
  status: "active" as const,
};
const version: CurriculumVersion = {
  id: "version",
  program_id: "program",
  version_label: "2027",
  effective_start: "2027-08-01",
  total_units: 0,
  delinquency_threshold: 0,
  status: "draft",
};
const term: CurriculumTerm = {
  id: "term",
  curriculum_version_id: "version",
  year_level: 1,
  term_sequence: 1,
};
const course: Course = {
  id: "11111111-1111-4111-8111-111111111111",
  department_id: "department",
  code: "CS 101",
  title: "Computing",
  units: 3,
  status: "active",
  repeatable_type: "none",
};
const detail = {
  terms: [term],
  slots: [] as CurriculumSlot[],
  courses: [] as Course[],
};
const catalogKey = staffQueryKeys.resource("staff", "department", "curricula");
const detailKey = staffQueryKeys.resource(
  "staff",
  "department",
  "curriculum-overview",
  { versionId: "version" },
);
const coursesKey = staffQueryKeys.resource(
  "staff",
  "department",
  "curriculum-course-options",
);

function mount(courseChoices: Course[] = [course]) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(catalogKey, { programs: [program], versions: [version] });
  client.setQueryData(detailKey, detail);
  client.setQueryData(coursesKey, courseChoices);
  const onCreated = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <StaffScopeContext.Provider value={scope}>
        <CurriculumSlotDialog
          term={term}
          version={version}
          onClose={vi.fn()}
          onCreated={onCreated}
        />
      </StaffScopeContext.Provider>
    </QueryClientProvider>,
  );
  return { client, onCreated };
}

function conflict(message: string) {
  return new ApiClientError(
    normalizeApiError({ message }, new Response(null, { status: 409 })),
  );
}

beforeEach(() => {
  vi.mocked(listCurriculumCourses).mockResolvedValue([course]);
  vi.mocked(createCurriculumSlot).mockImplementation(async (body) => ({
    ...body,
    id: "new-slot",
  }));
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

describe("Add curriculum requirement", () => {
  it("adds a named required slot without a course reference", async () => {
    const { onCreated } = mount();
    fireEvent.change(screen.getByLabelText("Course / slot"), {
      target: { value: "Core requirement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(createCurriculumSlot).toHaveBeenCalledOnce());
    expect(createCurriculumSlot).toHaveBeenCalledWith({
      curriculum_term_id: "term",
      course_id: null,
      is_elective_slot: false,
      slot_type: "required",
      slot_label: "Core requirement",
      nominal_units: 3,
    });
    expect(onCreated).toHaveBeenCalledWith("version");
  });
  it("submits a fixed required course and preserves its nominal units in the cache", async () => {
    const { client, onCreated } = mount();
    fireEvent.change(screen.getByLabelText("Active course (optional)"), {
      target: { value: course.id },
    });
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "3.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(createCurriculumSlot).toHaveBeenCalledOnce());
    expect(createCurriculumSlot).toHaveBeenCalledWith({
      curriculum_term_id: "term",
      course_id: course.id,
      is_elective_slot: false,
      slot_type: "required",
      slot_label: null,
      nominal_units: 3.25,
    });
    expect(onCreated).toHaveBeenCalledWith("version");
    expect(
      (client.getQueryData(detailKey) as typeof detail).slots,
    ).toMatchObject([{ id: "new-slot", nominal_units: 3.25 }]);
    expect(
      (client.getQueryData(detailKey) as typeof detail).courses,
    ).toContainEqual(course);
  });

  it("submits a flexible elective without a course reference and retains its label and units", async () => {
    const { onCreated } = mount();
    await chooseOption("Type", "Elective slot");
    fireEvent.change(screen.getByLabelText("Course / slot"), {
      target: { value: "Technical elective" },
    });
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "0.75" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(createCurriculumSlot).toHaveBeenCalledOnce());
    expect(createCurriculumSlot).toHaveBeenCalledWith({
      curriculum_term_id: "term",
      course_id: null,
      is_elective_slot: true,
      slot_type: "elective",
      slot_label: "Technical elective",
      nominal_units: 0.75,
    });
    expect(onCreated).toHaveBeenCalledWith("version");
  });

  it("blocks missing fixed-course references and invalid quarter-unit values before writing", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Enter a course or slot name, or select a course.");
    expect(createCurriculumSlot).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Active course (optional)"), {
      target: { value: course.id },
    });
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "1.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Use quarter-unit increments (for example, 3.25).");
    expect(createCurriculumSlot).not.toHaveBeenCalled();
  });

  it("blocks a stale course reference from another department", async () => {
    const foreignId = "22222222-2222-4222-8222-222222222222";
    mount([{ ...course, id: foreignId, department_id: "foreign-department" }]);
    fireEvent.change(screen.getByLabelText("Active course (optional)"), {
      target: { value: foreignId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText(
      "Select an active course from your department catalog and retry.",
    );
    expect(createCurriculumSlot).not.toHaveBeenCalled();
  });

  it("blocks a version whose program is outside the active department scope", async () => {
    const { client } = mount();
    client.setQueryData(catalogKey, {
      programs: [{ ...program, department_id: "foreign-department" }],
      versions: [version],
    });
    fireEvent.change(screen.getByLabelText("Active course (optional)"), {
      target: { value: course.id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText(
      "This version is no longer available in your authorized department. Refresh the list.",
    );
    expect(createCurriculumSlot).not.toHaveBeenCalled();
  });

  it("keeps values and does not retry after a server conflict", async () => {
    vi.mocked(createCurriculumSlot).mockRejectedValue(
      conflict("Referenced curriculum history prevents this change."),
    );
    const { onCreated } = mount();
    fireEvent.change(screen.getByLabelText("Active course (optional)"), {
      target: { value: course.id },
    });
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "2.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText(
      /Referenced curriculum history prevents this change/,
    );
    expect(
      (screen.getByLabelText("Required units") as HTMLInputElement).value,
    ).toBe("2.5");
    expect(createCurriculumSlot).toHaveBeenCalledOnce();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
