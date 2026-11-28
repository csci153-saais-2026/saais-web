import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { saaisMockServer } from "@/mocks/node";
import AuditLogPage from "./AuditLogPage";
import type { AuditEvent } from "./audit-types";
import { EMPTY_AUDIT_FILTERS, filterAuditEvents } from "./audit-model";
import { getAuditEvents } from "../shared/dh-api";
import {
  renderDepartmentHead,
  setupDepartmentHeadMockApi,
} from "../test-utils";

setupDepartmentHeadMockApi();

const event = (overrides: Partial<AuditEvent>): AuditEvent => ({
  id: "event",
  timestamp: "2025-08-15T10:00:00+08:00",
  person: "Dr. Elena Reyes",
  action: "View",
  studentName: "Ana Marie Santos",
  studentNumber: "24-1-00124",
  record: "Record",
  details: "Details",
  ...overrides,
});

describe("Audit Log filters", () => {
  const events = [
    event({ id: "a", person: "Dr. Elena Reyes" }),
    event({
      id: "b",
      person: "Prof. Marco Villanueva",
      action: "Change",
      studentName: "Luis Miguel Cruz",
      studentNumber: "23-1-00218",
      timestamp: "2025-08-14T15:00:00+08:00",
    }),
    event({
      id: "c",
      person: "Luis Miguel Cruz",
      action: "Sign-in",
      studentName: "Luis Miguel Cruz",
      studentNumber: "23-1-00218",
      timestamp: "2025-08-13T09:00:00+08:00",
    }),
  ];

  it("combines independent person, student, action and inclusive date filters", () => {
    expect(
      filterAuditEvents(events, {
        person: "  elena  ",
        student: "24-1-00124",
        action: "View",
        from: "2025-08-15",
        to: "2025-08-15",
      }).map((item) => item.id),
    ).toEqual(["a"]);
    expect(
      filterAuditEvents(events, {
        ...EMPTY_AUDIT_FILTERS,
        student: "CRUZ",
      }).map((item) => item.id),
    ).toEqual(["b", "c"]);
    expect(
      filterAuditEvents(events, {
        ...EMPTY_AUDIT_FILTERS,
        action: "Sign-in",
      }).map((item) => item.id),
    ).toEqual(["c"]);
  });

  it("uses Philippine dates for timestamps near UTC midnight", () => {
    const nearMidnight = event({
      id: "timezone",
      timestamp: "2025-08-14T16:30:00Z",
    });
    expect(
      filterAuditEvents([nearMidnight], {
        ...EMPTY_AUDIT_FILTERS,
        from: "2025-08-15",
        to: "2025-08-15",
      }),
    ).toEqual([nearMidnight]);
    expect(
      filterAuditEvents([nearMidnight], {
        ...EMPTY_AUDIT_FILTERS,
        to: "2025-08-14",
      }),
    ).toEqual([]);
  });
});

describe("Audit Log screen", () => {
  async function openPage() {
    const records = await getAuditEvents();
    renderDepartmentHead(<AuditLogPage />);
    await screen.findByText(
      `${records.length} matching ${records.length === 1 ? "event" : "events"} of ${records.length}`,
    );
    return records;
  }

  it("shows the department's audit entries from the API and filters them", async () => {
    const records = await openPage();
    expect(records.length).toBeGreaterThan(0);
    const [first] = records;
    fireEvent.change(screen.getByRole("searchbox", { name: "Person" }), {
      target: { value: first.person },
    });
    expect(screen.getAllByText(first.person).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("searchbox", { name: "Student" }), {
      target: { value: "no such student" },
    });
    expect(screen.getByText("No entries match these filters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText(new RegExp(`of ${records.length}$`))).toBeTruthy();
  });

  it("shows a date-range error and an honest empty state", async () => {
    await openPage();
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2025-08-15" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2025-08-14" },
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "From date must be on or before To date.",
    );
    expect(
      screen.getByText("Choose a valid date range to view events."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2025-08-14" },
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the record, student, action and local date on the shared table", async () => {
    saaisMockServer.use(
      http.get("*/rest/v1/audit_log_entry", () =>
        HttpResponse.json([
          {
            id: "late-event",
            created_at: "2025-08-14T16:30:00Z",
            actor_name: "Dr. Elena Reyes",
            action_category: "update",
            student_name: "Ana Marie Santos",
            student_number: "24-1-00124",
            target_label: "Course checklist",
            details_summary: "Corrected an attempt",
          },
        ]),
      ),
    );
    renderDepartmentHead(<AuditLogPage />);
    const table = within(
      await screen.findByRole("table", { name: "Department audit log" }),
    );
    const cells = table.getAllByRole("cell");
    expect(cells.map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Timestamp",
      "Person",
      "Action",
      "Student",
      "Record",
      "Details",
    ]);
    expect(cells[0].textContent).toMatch(/15 Aug 2025.*12:30\s*AM/);
    expect(cells.slice(1).map((cell) => cell.textContent)).toEqual([
      "Dr. Elena Reyes",
      "Change",
      "24-1-00124 · Ana Marie Santos",
      "Course checklist",
      "Corrected an attempt",
    ]);
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2025-08-15" },
    });
    await screen.findByText("1 matching event of 1");
  });

  it("shows a loading message instead of an empty result while dates change", async () => {
    await openPage();
    let finishRequest!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      finishRequest = resolve;
    });
    saaisMockServer.use(
      http.get("*/rest/v1/audit_log_entry", async () => {
        await responseGate;
        return HttpResponse.json([]);
      }),
    );

    try {
      fireEvent.change(screen.getByLabelText("From date"), {
        target: { value: "2026-10-01" },
      });
      expect(screen.getByRole("status").textContent).toBe(
        "Loading audit entries for this date range…",
      );
      expect(screen.queryByText("No entries match these filters.")).toBeNull();
    } finally {
      finishRequest();
    }
    await screen.findByText("No entries match these filters.");
  });
});
