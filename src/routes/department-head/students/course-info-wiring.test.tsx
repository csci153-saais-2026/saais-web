import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { MOCK_PERSONAS } from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import { getChecklist } from "@/routes/adviser/advisees/checklist/record.api";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";
import StudentsPage from "./StudentsPage";

setupDepartmentHeadMockApi();

it("shows the selected checklist result's attempt and grade-correction history", async () => {
  const student = MOCK_PERSONAS.student;
  const { results, slots, courses } = await getChecklist(student.profileId);
  const result = results.find((entry) => entry.attempts?.length)!;
  const slot = slots.find(
    (entry) => entry.id === result.curriculum_term_course_id,
  )!;
  const course = courses.find((entry) => entry.id === slot.course_id)!;
  saaisMockServer.use(
    http.get(`*/functions/v1/students/${student.profileId}/checklist`, () =>
      HttpResponse.json(
        results.map((entry) =>
          entry === result
            ? {
                ...entry,
                grade_fix_history: [
                  {
                    changed_at: "2026-03-03T10:00:00Z",
                    actor_name: "Prof. Test",
                    old_grade: 2.25,
                    new_grade: 1.75,
                  },
                ],
              }
            : entry,
        ),
      ),
    ),
  );

  renderDepartmentHead(<StudentsPage />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: `View ${student.fullName} checklist`,
    }),
  );
  const record = await screen.findByRole("dialog", {
    name: `${student.fullName} · Student record`,
  });
  const row = (await within(record).findByText(course.code)).closest("tr")!;
  const trigger = within(row).getByRole("button", { name: "Course info" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = within(
    await screen.findByRole("dialog", {
      name: `${course.code} · ${course.title}`,
    }),
  );
  expect(dialog.getByText(/units?.*Year.*Semester/)).toBeTruthy();
  expect(dialog.getAllByRole("row")).toHaveLength(result.attempts!.length + 1);
  expect(
    dialog.getAllByText(result.attempts![0].term_label).length,
  ).toBeGreaterThan(0);
  expect(
    dialog.getByText(/03 Mar 2026.*Prof\. Test.*2\.25 → 1\.75/),
  ).toBeTruthy();
  const close = dialog.getByRole("button", { name: "Close" });
  await waitFor(() => expect(document.activeElement).toBe(close));
  fireEvent.keyDown(close, { key: "Escape" });
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(screen.getByRole("dialog")).toBe(record);
});
