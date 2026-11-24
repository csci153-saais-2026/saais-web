import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ApiSchema } from "@/lib/api";
import Encode from "./AdviserEncodeGrades";
import {
  getElectiveSlots,
  getEncodingChoices,
  getTermOfferings,
  saveTermGrades,
} from "./encode.api";
import { completeInc, getGrades } from "../advisees/checklist/record.api";

const auth = vi.hoisted(() => ({
  user: { id: "adviser-one" },
  isMockMode: true,
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => auth }));
vi.mock("../Adviser", () => ({
  AdviserPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./encode.api", () => ({
  getElectiveSlots: vi.fn(),
  getEncodingChoices: vi.fn(),
  getTermOfferings: vi.fn(),
  saveTermGrades: vi.fn(),
}));
vi.mock("../advisees/checklist/record.api", () => ({
  getGrades: vi.fn(),
  completeInc: vi.fn(),
}));
const attempt = {
  id: "attempt-one",
  student_id: "student-one",
  course_offering_id: "offering-one",
  recorded_status: "inc",
  effective_status: "inc",
  inc_deadline: "2027-05-30",
  midterm_status: "graded",
  midterm_grade: 2,
  final_grade: null,
  completion_grade: null,
  revision: 1,
  units_attempted: 3,
  is_lapsed_inc: false,
  is_repeated: false,
  counts_toward_cumulative_gwa: false,
  gwa_grade: null,
} as ApiSchema<"AttemptResult">;
const data = {
  terms: [
    {
      school_term_id: "term-one",
      school_year: "2026",
      term_type: "1st Semester",
      chronological_key: 1,
      gwa: null,
      attempts: [attempt],
    },
  ],
  offerings: [{ id: "offering-one", course_id: "course-one" }],
  courses: [{ id: "course-one", code: "CS 1", title: "Computing" }],
  canEdit: true,
} as unknown as Awaited<ReturnType<typeof getGrades>>;
const choices = {
  students: [
    {
      student_id: "student-one",
      full_name: "Student One",
      student_number: "01",
    },
    {
      student_id: "student-two",
      full_name: "Student Two",
      student_number: "02",
    },
  ],
  terms: [{ id: "term-one", school_year: "2026", term_type: "1st Semester" }],
} as Awaited<ReturnType<typeof getEncodingChoices>>;
beforeEach(() => {
  vi.mocked(getElectiveSlots).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  auth.user = { id: "adviser-one" };
  auth.isMockMode = true;
});
describe("encoding workspace identity", () => {

  it("does not offer deletion for a saved course", async () => {
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue(data);
    vi.mocked(getTermOfferings).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    expect(
      await screen.findByRole("group", { name: "Edit CS 1 · Computing" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove CS 1" })).toBeNull();
  });
  it("shows a draft message when an unsaved course is removed", async () => {
    const offering = {
      offering: { id: "offering-two", course_id: "course-two" },
      code: "CS 2",
      title: "Next course",
      direct_curriculum_slot_id: "slot-two",
      has_unmet_strict_prerequisites: false,
    } as Awaited<ReturnType<typeof getTermOfferings>>[number];
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue(data);
    vi.mocked(getTermOfferings).mockResolvedValue([offering]);
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Add course" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("radio", { name: /CS 2/ }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Add course",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove CS 2" }));
    expect(
      await screen.findByText("CS 2 removed from the draft."),
    ).toBeTruthy();
  });
  it("preselects only a student in the current adviser roster", async () => {
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    const view = render(
      <MemoryRouter
        initialEntries={["/adviser/encode-grades?student=student-two"]}
      >
        <Encode />
      </MemoryRouter>,
    );
    expect(
      ((await screen.findByLabelText("Advisee")) as HTMLSelectElement).value,
    ).toBe("student-two");
    view.unmount();
    render(
      <MemoryRouter
        initialEntries={["/adviser/encode-grades?student=outside-scope"]}
      >
        <Encode />
      </MemoryRouter>,
    );
    expect(
      ((await screen.findByLabelText("Advisee")) as HTMLSelectElement).value,
    ).toBe("");
    expect(getGrades).not.toHaveBeenCalled();
  });
  it("loads attempts and submits the selected student and INC attempt", async () => {
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue(data);
    vi.mocked(getTermOfferings).mockResolvedValue([]);
    vi.mocked(completeInc).mockResolvedValue({} as ApiSchema<"INCResolution">);
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    expect((await screen.findAllByText(/CS 1/)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Resolve INC" }));
    expect(screen.queryByRole("option", { name: "3.25" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Completion grade"), {
      target: { value: "2.25" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Completed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolve INC" }));
    await waitFor(() =>
      expect(completeInc).toHaveBeenCalledWith(
        "student-one",
        attempt,
        2.25,
        "Completed",
      ),
    );
    await waitFor(() => expect(getTermOfferings).toHaveBeenCalledTimes(2));
  });
  it("clears prior attempts when switching students or accounts", async () => {
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getTermOfferings).mockResolvedValue([]);
    vi.mocked(getGrades)
      .mockResolvedValueOnce(data)
      .mockImplementation(() => new Promise(() => {}));
    const view = render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    expect((await screen.findAllByText(/CS 1/)).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Advisee"), {
      target: { value: "student-two" },
    });
    expect(screen.queryByText("Completion grade")).toBeNull();
    expect(document.querySelector("[skullet-status]")?.textContent).toContain(
      "Loading",
    );
    auth.user = { id: "adviser-two" };
    view.rerender(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    expect(screen.queryByText("CS 1 · Computing")).toBeNull();
  });
  it("saves edits to an existing attempt with the single Save grades button", async () => {
    auth.isMockMode = false;
    const old = {
      ...attempt,
      recorded_status: "currently_enrolled",
      effective_status: "currently_enrolled",
      midterm_grade: 2,
      final_grade: null,
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue({
      ...data,
      terms: data.terms.map((t) => ({ ...t, attempts: [old] })),
    });
    vi.mocked(getTermOfferings).mockResolvedValue([]);
    vi.mocked(saveTermGrades).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    fireEvent.change(await screen.findByLabelText("New final grade"), {
      target: { value: "2.25" },
    });
    expect(saveTermGrades).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save grades" }));
    await waitFor(() =>
      expect(saveTermGrades).toHaveBeenCalledWith("student-one", "term-one", [
        {
          attempt_id: "attempt-one",
          course_offering_id: "offering-one",
          final_grade: 2.25,
          remark: "Passed",
          continue_with_prerequisite_override: false,
        },
      ]),
    );
  });
  it("never sends an existing final grade as a silent overwrite", async () => {
    auth.isMockMode = false;
    const old = {
      ...attempt,
      recorded_status: "passed",
      effective_status: "passed",
      final_grade: 2.5,
    } as ApiSchema<"AttemptResult">;
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue({
      ...data,
      terms: data.terms.map((t) => ({ ...t, attempts: [old] })),
    });
    vi.mocked(getTermOfferings).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    expect(await screen.findByText(/Previously recorded grades/)).toBeTruthy();
    expect(screen.queryByLabelText("New final grade")).toBeNull();
    expect(saveTermGrades).not.toHaveBeenCalled();
  });
  it("retains draft rows and checks refreshed eligibility after another grade is saved", async () => {
    const offering = {
      offering: { id: "offering-two" },
      code: "CS 2",
      title: "Next course",
      direct_curriculum_slot_id: "slot-two",
      has_unmet_strict_prerequisites: false,
    } as Awaited<ReturnType<typeof getTermOfferings>>[number];
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue(data);
    vi.mocked(getTermOfferings)
      .mockResolvedValueOnce([offering])
      .mockResolvedValueOnce([]);
    vi.mocked(completeInc).mockResolvedValue({} as ApiSchema<"INCResolution">);
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Add course" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("radio", { name: /CS 2/ }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Add course",
      }),
    );
    fireEvent.change(screen.getByLabelText("Final for CS 2"), {
      target: { value: "2.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolve INC" }));
    fireEvent.change(screen.getByLabelText("Completion grade"), {
      target: { value: "2.25" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Completed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolve INC" }));
    await waitFor(() => expect(getTermOfferings).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Course unavailable")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Save grades" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("sets the final and remark from midterm DR and derives remarks from final results", async () => {
    const offering = {
      offering: { id: "offering-two", course_id: "course-two" },
      code: "CS 2",
      title: "Next course",
      direct_curriculum_slot_id: "slot-two",
      has_unmet_strict_prerequisites: false,
    } as Awaited<ReturnType<typeof getTermOfferings>>[number];
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue(data);
    vi.mocked(getTermOfferings).mockResolvedValue([offering]);
    vi.mocked(saveTermGrades).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Add course" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("radio", { name: /CS 2/ }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Add course",
      }),
    );
    const mid = screen.getByLabelText("Midterm for CS 2") as HTMLSelectElement;
    const final = screen.getByLabelText("Final for CS 2") as HTMLSelectElement;
    const remark = screen.getByLabelText("Status for CS 2");
    expect(within(mid).getByRole("option", { name: "4.75" })).toBeTruthy();
    expect(within(final).queryByRole("option", { name: "4.75" })).toBeNull();
    fireEvent.change(mid, { target: { value: "dr" } });
    expect(final.value).toBe("dr");
    expect(final.disabled).toBe(true);
    expect(remark.textContent).toBe("Dropped");
    fireEvent.change(mid, { target: { value: "4.75" } });
    expect(final.disabled).toBe(false);
    expect(final.value).toBe("");
    fireEvent.change(final, { target: { value: "5.00" } });
    expect(remark.textContent).toBe("Failed");
    fireEvent.change(final, { target: { value: "2.25" } });
    expect(remark.textContent).toBe("Passed");
    fireEvent.change(final, { target: { value: "inc" } });
    expect(remark.textContent).toBe("INC");
    fireEvent.change(mid, { target: { value: "dr" } });
    fireEvent.click(screen.getByRole("button", { name: "Save grades" }));
    await waitFor(() =>
      expect(saveTermGrades).toHaveBeenCalledWith("student-one", "term-one", [
        expect.objectContaining({
          course_offering_id: "offering-two",
          midterm_status: "dr",
          midterm_grade: null,
          final_grade: null,
          status: "dr",
          remark: "DR",
        }),
      ]),
    );
  });

  it("locks drafts while the save is pending", async () => {
    const offerings = [
      {
        offering: { id: "offering-two", course_id: "course-two" },
        code: "CS 2",
        title: "Second course",
        direct_curriculum_slot_id: "slot-two",
        has_unmet_strict_prerequisites: false,
      },
      {
        offering: { id: "offering-three", course_id: "course-three" },
        code: "CS 3",
        title: "Third course",
        direct_curriculum_slot_id: "slot-three",
        has_unmet_strict_prerequisites: false,
      },
    ] as Awaited<ReturnType<typeof getTermOfferings>>;
    let finishSave!: () => void;
    vi.mocked(getEncodingChoices).mockResolvedValue(choices);
    vi.mocked(getGrades).mockResolvedValue(data);
    vi.mocked(getTermOfferings).mockResolvedValue(offerings);
    vi.mocked(saveTermGrades).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = () => resolve([]);
        }),
    );
    render(
      <MemoryRouter>
        <Encode />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Advisee"), {
      target: { value: "student-one" },
    });
    fireEvent.change(screen.getByLabelText("Term"), {
      target: { value: "term-one" },
    });

    const addCourse = async (code: string) => {
      fireEvent.click(
        await screen.findByRole("button", { name: "Add course" }),
      );
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("radio", {
          name: (name) => name.includes(code),
        }),
      );
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Add course",
        }),
      );
    };
    await addCourse("CS 2");
    fireEvent.change(screen.getByLabelText("Final for CS 2"), {
      target: { value: "2.25" },
    });
    await addCourse("CS 3");
    fireEvent.change(screen.getByLabelText("Final for CS 3"), {
      target: { value: "2.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save grades" }));

    expect(
      (screen.getByLabelText("Instructor for CS 2") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Midterm for CS 2") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Final for CS 2") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Remove CS 2" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    finishSave();
    expect(await screen.findByText("Grades saved.")).toBeTruthy();
  });
});
