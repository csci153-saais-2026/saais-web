import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StaffScopeContext } from "../shared/use-staff-scope";
import { ApiClientError, normalizeApiError } from "@/lib/api";
import { staffQueryKeys } from "../shared/staff-query-keys";
import {
  deleteCurriculumSlot,
  listCurriculumCourses,
  updateCurriculumSlot,
  type Course,
  type CurriculumSlot,
  type CurriculumTerm,
  type CurriculumVersion,
} from "./curricula.api";
import { CurriculumSlotDeleteDialog } from "./CurriculumSlotDeleteDialog";
import { CurriculumSlotDialog } from "./CurriculumSlotDialog";

vi.mock("./curricula.api", () => ({
  createCurriculumSlot: vi.fn(),
  deleteCurriculumSlot: vi.fn(),
  listCurriculumCourses: vi.fn(),
  updateCurriculumSlot: vi.fn(),
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
const slot: CurriculumSlot = {
  id: "slot",
  curriculum_term_id: "term",
  course_id: course.id,
  is_elective_slot: false,
  slot_type: "required",
  slot_label: null,
  nominal_units: 3,
};
const detail = { terms: [term], slots: [slot], courses: [course] };
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

function mount(
  options: {
    action?: "edit" | "delete";
    original?: CurriculumSlot;
    courseChoices?: Course[];
  } = {},
) {
  const original = options.original ?? slot;
  const action = options.action ?? "edit";
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(catalogKey, { programs: [program], versions: [version] });
  client.setQueryData(detailKey, { ...detail, slots: [original] });
  client.setQueryData(coursesKey, options.courseChoices ?? [course]);
  const onComplete = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <StaffScopeContext.Provider value={scope}>
        {action === "edit" ? (
          <CurriculumSlotDialog
            term={term}
            version={version}
            slot={original}
            onClose={vi.fn()}
            onUpdated={onComplete}
          />
        ) : (
          <CurriculumSlotDeleteDialog
            term={term}
            version={version}
            slot={original}
            onClose={vi.fn()}
            onDeleted={onComplete}
          />
        )}
      </StaffScopeContext.Provider>
    </QueryClientProvider>,
  );
  return { client, onComplete };
}

function conflict(message: string, status = 409) {
  return new ApiClientError(
    normalizeApiError({ message }, new Response(null, { status })),
  );
}

beforeEach(() => {
  vi.mocked(listCurriculumCourses).mockResolvedValue([course]);
  vi.mocked(updateCurriculumSlot).mockImplementation(async (id, body) => ({
    ...slot,
    ...body,
    id,
    curriculum_term_id: term.id,
  }));
  vi.mocked(deleteCurriculumSlot).mockResolvedValue(undefined);
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

describe("Manage curriculum requirements", () => {
  it("edits an existing fixed-course requirement and refreshes its scoped cache", async () => {
    const { client, onComplete } = mount();
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "3.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(() => expect(updateCurriculumSlot).toHaveBeenCalledOnce());
    expect(updateCurriculumSlot).toHaveBeenCalledWith("slot", {
      course_id: course.id,
      is_elective_slot: false,
      slot_type: "required",
      slot_label: null,
      nominal_units: 3.5,
    });
    expect(onComplete).toHaveBeenCalledWith("version");
    expect(
      (client.getQueryData(detailKey) as typeof detail).slots[0]?.nominal_units,
    ).toBe(3.5);
  });

  it("converts a flexible elective into a named GE requirement without a course reference", async () => {
    const flexible: CurriculumSlot = {
      id: "slot",
      curriculum_term_id: "term",
      course_id: null,
      is_elective_slot: true,
      slot_type: "elective",
      slot_label: "Open elective",
      nominal_units: 3,
    };
    mount({ original: flexible });
    await chooseOption("Type", "GE slot");
    fireEvent.change(screen.getByLabelText("Course / slot"), {
      target: { value: "Humanities GE" },
    });
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "2.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(() => expect(updateCurriculumSlot).toHaveBeenCalledOnce());
    expect(updateCurriculumSlot).toHaveBeenCalledWith("slot", {
      course_id: null,
      is_elective_slot: false,
      slot_type: "ge",
      slot_label: "Humanities GE",
      nominal_units: 2.5,
    });
  });

  it("allows retaining an existing course reference when it is absent from active choices", async () => {
    mount({ courseChoices: [] });
    expect(
      screen.getByRole("option", {
        name: "Current course reference unavailable or inactive",
      }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "3.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(() => expect(updateCurriculumSlot).toHaveBeenCalledOnce());
    expect(updateCurriculumSlot).toHaveBeenCalledWith(
      "slot",
      expect.objectContaining({ course_id: course.id, nominal_units: 3.25 }),
    );
  });

  it("rejects invalid units before sending an edit", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Required units"), {
      target: { value: "1.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Use quarter-unit increments (for example, 3.25).");
    expect(updateCurriculumSlot).not.toHaveBeenCalled();
  });

  it("blocks a stale slot snapshot before updating", async () => {
    const { client } = mount();
    client.setQueryData(detailKey, {
      ...detail,
      slots: [{ ...slot, nominal_units: 4 }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText(
      "This requirement changed while the dialog was open. Close it and review the refreshed requirement.",
    );
    expect(updateCurriculumSlot).not.toHaveBeenCalled();
  });

  it("blocks an out-of-scope curriculum before sending a delete", async () => {
    const { client } = mount({ action: "delete" });
    client.setQueryData(catalogKey, {
      programs: [{ ...program, department_id: "other" }],
      versions: [version],
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText(
      "This version is no longer available in your authorized department. Refresh the list.",
    );
    expect(deleteCurriculumSlot).not.toHaveBeenCalled();
  });

  it("removes the slot from cache only after server deletion succeeds", async () => {
    const { client, onComplete } = mount({ action: "delete" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await vi.waitFor(() => expect(deleteCurriculumSlot).toHaveBeenCalledOnce());
    expect(deleteCurriculumSlot).toHaveBeenCalledWith("slot");
    expect(onComplete).toHaveBeenCalledWith("version");
    expect((client.getQueryData(detailKey) as typeof detail).slots).toEqual([]);
  });

  it("keeps the requirement and reports protected history after a conflict", async () => {
    vi.mocked(deleteCurriculumSlot).mockRejectedValue(
      conflict("Attempt history protects this requirement."),
    );
    const { client, onComplete } = mount({ action: "delete" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText(/Attempt history protects this requirement/);
    expect((client.getQueryData(detailKey) as typeof detail).slots).toEqual([
      slot,
    ]);
    expect(deleteCurriculumSlot).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it.each([403, 409, 429, 500])(
    "preserves edit values and does not retry on HTTP %i",
    async (status) => {
      vi.mocked(updateCurriculumSlot).mockRejectedValue(
        conflict("The requirement changed.", status),
      );
      mount();
      fireEvent.change(screen.getByLabelText("Required units"), {
        target: { value: "2.5" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await screen.findByRole("alert");
      expect(
        (screen.getByLabelText("Required units") as HTMLInputElement).value,
      ).toBe("2.5");
      expect(updateCurriculumSlot).toHaveBeenCalledOnce();
    },
  );
});
