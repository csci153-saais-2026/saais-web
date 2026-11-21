import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createSaaisApiClient } from "@/lib/api";
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from "./index";
import { saaisMockServer } from "./node";

const client = () =>
  createSaaisApiClient({
    baseUrl: "https://saais-mock.supabase.co",
    apiKey: "sb_publishable_mock_key",
    mode: "mock",
  });
beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("shared role scenarios", () => {
  it("uses unique identifiers within each shared mock table", () => {
    for (const [name, rows] of Object.entries(getMockDatabase())) {
      const ids = rows.flatMap((row: object) =>
        "id" in row && typeof row.id === "string" ? [row.id] : [],
      );
      expect(new Set(ids).size, `${name} contains duplicate IDs`).toBe(
        ids.length,
      );
    }
  });
  it("gives every mock persona student realistic names and coherent academic relationships", () => {
    const db = getMockDatabase();
    const samples = Array.from(
      { length: 29 },
      (_, i) => MOCK_PERSONAS[`student_sample_${i + 1}`],
    );
    expect(new Set(samples.map((person) => person.fullName)).size).toBe(
      samples.length,
    );
    expect(
      samples.every((person) => !/sample student/i.test(person.fullName)),
    ).toBe(true);
    for (const person of samples) {
      const profile = db.profiles.find((item) => item.id === person.profileId)!;
      const org = db.studentOrganizations.find(
        (item) => item.student_id === person.profileId,
      )!;
      const assignment = db.adviserAssignments.find(
        (item) => item.student_id === person.profileId && !item.end_date,
      )!;
      expect(profile.full_name).toBe(person.fullName);
      expect(assignment.adviser_id).toBe(org.adviser_id);
      expect(
        db.studentCurriculumAssignments.some(
          (item) =>
            item.id === org.student_curriculum_assignment_id &&
            item.student_id === person.profileId,
        ),
      ).toBe(true);
      const attempts = db.attempts.filter(
        (item) => item.student_id === person.profileId,
      );
      for (const attempt of attempts) {
        expect(
          db.courseOfferings.find(
            (item) => item.id === attempt.course_offering_id,
          )?.instructor,
        ).toBe(attempt.instructor);
        expect(
          db.attemptResults.some(
            (item) =>
              item.id === attempt.id && item.recorded_status === attempt.status,
          ),
        ).toBe(true);
      }
      expect(
        db.advisingPlans.some((item) => item.student_id === person.profileId),
      ).toBe(true);
      expect(
        db.auditLogEntries.some((item) => item.student_id === person.profileId),
      ).toBe(true);
    }
    expect(
      new Set(
        db.attemptResults
          .filter((item) =>
            samples.some((person) => person.profileId === item.student_id),
          )
          .map((item) => item.effective_status),
      ),
    ).toEqual(new Set(["currently_enrolled", "passed", "failed", "inc"]));
  });

  it("provides notifications for every active staff role and isolates each account", async () => {
    for (const key of [
      "student",
      "adviser",
      "adviser_secondary",
      "department_head",
      "department_staff",
      "dean",
      "dean_dept_head",
      "admin",
    ] as const) {
      loginAsMockPersona(key);
      const response = await client().GET("/rest/v1/notification");
      expect(response.response.status).toBe(200);
      expect(response.data!.length).toBeGreaterThan(0);
      expect(
        response.data!.every(
          (item) => item.recipient_id === MOCK_PERSONAS[key].profileId,
        ),
      ).toBe(true);
    }
    loginAsMockPersona("dean_dept_head");
    const notifications = (await client().GET("/rest/v1/notification")).data!;
    expect(notifications.some((item) => item.kind === "report")).toBe(true);
    expect(notifications.some((item) => item.kind === "transfer")).toBe(true);
  });

  it("provides a real offering as an eligible sample recommendation", async () => {
    loginAsMockPersona("adviser");
    const student = MOCK_PERSONAS.student_sample_1;
    const result = await client().GET(
      "/functions/v1/students/{student_id}/recommendations",
      {
        params: {
          path: { student_id: student.profileId },
          query: { school_term_id: MOCK_IDS.term2026Sem1Open },
        },
      },
    );
    expect(result.data?.[0]?.course_offering_id).toBe(MOCK_IDS.offeringNstp11);
    expect(
      getMockDatabase().courseOfferings.some(
        (item) => item.id === result.data?.[0]?.course_offering_id,
      ),
    ).toBe(true);
    const wrongTerm = await client().GET(
      "/functions/v1/students/{student_id}/recommendations",
      {
        params: {
          path: { student_id: student.profileId },
          query: { school_term_id: MOCK_IDS.term2025Sem2Closed },
        },
      },
    );
    expect(wrongTerm.data).toEqual([]);
    loginAsMockPersona("adviser_secondary");
    expect(
      (
        await client().GET(
          "/functions/v1/students/{student_id}/recommendations",
          {
            params: {
              path: { student_id: student.profileId },
              query: { school_term_id: MOCK_IDS.term2026Sem1Open },
            },
          },
        )
      ).response.status,
    ).toBe(403);
  });

  it("advances from the second semester to the next existing year and recognizes an unmapped prerequisite pass", async () => {
    const db = getMockDatabase();
    const studentId = MOCK_PERSONAS.student_sample_1.profileId;
    const template = db.attemptResults.find(
      (item) => item.student_id === studentId,
    )!;
    db.curriculumTerms.push({
      id: "41000000-0000-4000-8009-000000000001",
      curriculum_version_id: MOCK_IDS.curriculumBscs2024,
      year_level: 2,
      term_sequence: 1,
    });
    db.curriculumTermCourses.find(
      (slot) => slot.id === MOCK_IDS.slotCsci153,
    )!.curriculum_term_id = "41000000-0000-4000-8009-000000000001";
    template.curriculum_term_course_id = MOCK_IDS.slotCsci102;
    const unmappedPass: (typeof db.attemptResults)[number] = {
      ...template,
      id: "80000000-0000-4000-8009-000000000001",
      course_offering_id: MOCK_IDS.offeringCsci102,
      curriculum_term_course_id: null,
      effective_status: "passed" as const,
      recorded_status: "passed" as const,
      final_grade: 2,
      gwa_grade: 2,
    };
    db.attemptResults.push(unmappedPass);
    loginAsMockPersona("adviser");
    const getRecommendations = () =>
      client().GET("/functions/v1/students/{student_id}/recommendations", {
        params: {
          path: { student_id: studentId },
          query: { school_term_id: MOCK_IDS.term2026Sem1Open },
        },
      });
    const withPass = await getRecommendations();
    expect(
      withPass.data?.some(
        (item) => item.curriculum_term_course_id === MOCK_IDS.slotCsci153,
      ),
    ).toBe(true);
    expect(
      withPass.data?.some(
        (item) => item.curriculum_term_course_id === MOCK_IDS.slotCsci102,
      ),
    ).toBe(false);
    unmappedPass.effective_status = "failed";
    const withoutPass = await getRecommendations();
    expect(
      withoutPass.data?.some(
        (item) => item.curriculum_term_course_id === MOCK_IDS.slotCsci153,
      ),
    ).toBe(false);
  });

  it("does not recommend a passed course whose attempt has no curriculum slot", async () => {
    const db = getMockDatabase();
    const studentId = MOCK_PERSONAS.student_sample_1.profileId;
    const prior = db.attemptResults.find(
      (item) =>
        item.student_id === studentId &&
        item.course_offering_id === MOCK_IDS.offeringCsci101,
    )!;
    prior.curriculum_term_course_id = null;
    prior.effective_status = "passed";
    prior.recorded_status = "passed";
    prior.final_grade = 2;
    const offering = db.courseOfferings.find(
      (item) => item.id === MOCK_IDS.offeringCsci101,
    )!;
    db.courseOfferings.unshift({
      ...offering,
      id: "62000000-0000-4000-8009-000000000002",
    });
    loginAsMockPersona("adviser");
    const response = await client().GET(
      "/functions/v1/students/{student_id}/recommendations",
      {
        params: {
          path: { student_id: studentId },
          query: { school_term_id: MOCK_IDS.term2026Sem1Open },
        },
      },
    );
    expect(
      response.data?.some(
        (item) => item.curriculum_term_course_id === MOCK_IDS.slotCsci101,
      ),
    ).toBe(false);
  });

  it("selects the latest prerequisite attempt by term before recording order", async () => {
    const db = getMockDatabase();
    const studentId = MOCK_PERSONAS.student_sample_1.profileId;
    const template = db.attemptResults.find(
      (item) => item.student_id === studentId,
    )!;
    const oldOffering = db.courseOfferings.find(
      (item) => item.id === MOCK_IDS.offeringCsci102,
    )!;
    const newOffering = {
      ...oldOffering,
      id: "62000000-0000-4000-8009-000000000001",
      school_term_id: MOCK_IDS.term2026Sem1Open,
    };
    db.courseOfferings.push(newOffering);
    db.attemptResults.push({
      ...template,
      id: "80000000-0000-4000-8009-000000000002",
      course_offering_id: newOffering.id,
      effective_status: "inc",
      recorded_status: "inc",
      final_grade: null,
      is_lapsed_inc: false,
      created_at: "2026-08-01T00:00:00Z",
    });
    db.attemptResults.push({
      ...template,
      id: "80000000-0000-4000-8009-000000000003",
      course_offering_id: oldOffering.id,
      effective_status: "failed",
      recorded_status: "failed",
      final_grade: 5,
      is_lapsed_inc: false,
      created_at: "2026-10-01T00:00:00Z",
    });
    loginAsMockPersona("adviser");
    const response = await client().GET(
      "/functions/v1/students/{student_id}/course-offerings",
      {
        params: {
          path: { student_id: studentId },
          query: { school_term_id: MOCK_IDS.term2026Sem1Open },
        },
      },
    );
    const prerequisite = response.data?.find(
      (item) => item.offering.id === MOCK_IDS.offeringCsci153,
    )?.unmet_prerequisites?.[0];
    expect(prerequisite).toMatchObject({
      current_status: "inc",
      latest_attempt_id: "80000000-0000-4000-8009-000000000002",
      latest_final_grade: null,
    });
  });

  it("recommends available courses for the connected reference transcript", async () => {
    loginAsMockPersona("adviser");
    const response = await client().GET(
      "/functions/v1/students/{student_id}/recommendations",
      {
        params: {
          path: { student_id: MOCK_PERSONAS.student_sample_29.profileId },
          query: { school_term_id: MOCK_IDS.term2026Sem1Open },
        },
      },
    );
    expect(response.response.status).toBe(200);
    expect(response.data?.map((item) => item.code)).toContain("CSCI 126");
    const db = getMockDatabase();
    for (const recommendation of response.data ?? []) {
      expect(
        db.courseOfferings.some(
          (offering) =>
            offering.id === recommendation.course_offering_id &&
            offering.school_term_id === MOCK_IDS.term2026Sem1Open,
        ),
      ).toBe(true);
      expect(
        db.attemptResults.some(
          (attempt) =>
            attempt.student_id === MOCK_PERSONAS.student_sample_29.profileId &&
            attempt.curriculum_term_course_id ===
              recommendation.curriculum_term_course_id &&
            ["passed", "currently_enrolled"].includes(attempt.effective_status),
        ),
      ).toBe(false);
    }
  });

  it("only lets the current adviser or admin add a note and notifies that student", async () => {
    const student = MOCK_PERSONAS.student_sample_1;
    const db = getMockDatabase();
    const send = (body: { body_text: string }) =>
      client().POST("/functions/v1/students/{student_id}/notes", {
        params: { path: { student_id: student.profileId } },
        body,
      });
    loginAsMockPersona("adviser_secondary");
    expect((await send({ body_text: "Out of scope" })).response.status).toBe(
      403,
    );
    const beforeNotes = db.advisingNotes.length;
    const beforeNotifications = db.notifications.length;
    loginAsMockPersona("adviser");
    expect((await send({ body_text: "   " })).response.status).toBe(400);
    expect(db.advisingNotes).toHaveLength(beforeNotes);
    expect(db.notifications).toHaveLength(beforeNotifications);
    const created = await send({
      body_text: "Discuss remaining prerequisites.",
    });
    expect(created.response.status).toBe(201);
    expect(created.data?.authored_by).toBe(MOCK_PERSONAS.adviser.profileId);
    expect(db.notifications).toContainEqual(
      expect.objectContaining({
        recipient_id: student.profileId,
        event_type: "advising_note_added",
        entity_id: created.data?.id,
      }),
    );
    loginAsMockPersona("student_sample_1");
    const notes = await client().GET("/rest/v1/advising_note");
    expect(notes.data?.some((note) => note.id === created.data?.id)).toBe(true);
    const assignment = db.adviserAssignments.find(
      (item) =>
        item.student_id === student.profileId &&
        item.adviser_id === MOCK_PERSONAS.adviser.profileId &&
        item.end_date === null,
    )!;
    assignment.end_date = "2026-11-01";
    loginAsMockPersona("adviser");
    expect(
      (await send({ body_text: "Historical adviser cannot write." })).response
        .status,
    ).toBe(403);
    loginAsMockPersona("admin");
    const adminNote = await send({ body_text: "Administrative follow-up." });
    expect(adminNote.response.status).toBe(201);
    expect(adminNote.data?.author_role_label).toBe("Administrator");
  });

  it("does not reveal another adviser's student plans or audit history", async () => {
    loginAsMockPersona("adviser");
    const plans = (await client().GET("/rest/v1/advising_plan")).data!;
    const history = (await client().GET("/rest/v1/audit_log_entry")).data!;
    expect(
      plans.some(
        (item) => item.student_id === MOCK_PERSONAS.student_sample_1.profileId,
      ),
    ).toBe(true);
    expect(
      plans.some(
        (item) => item.student_id === MOCK_PERSONAS.student_sample_2.profileId,
      ),
    ).toBe(false);
    expect(
      history.some(
        (item) => item.student_id === MOCK_PERSONAS.student_sample_1.profileId,
      ),
    ).toBe(true);
    expect(
      history.some(
        (item) => item.student_id === MOCK_PERSONAS.student_sample_2.profileId,
      ),
    ).toBe(false);
  });
  it("reports connected data for department and faculty scopes", async () => {
    const db = getMockDatabase();
    loginAsMockPersona("department_head");
    const report = await client().GET("/functions/v1/reports/department", {
      params: { query: { department_id: MOCK_IDS.deptDcst } },
    });
    const orgs = db.studentOrganizations.filter(
      (item) => item.department_id === MOCK_IDS.deptDcst,
    );
    expect(report.data?.total_students).toBe(orgs.length);
    expect(
      report.data?.adviser_caseloads.some(
        (item) => item.adviser_id === MOCK_IDS.adviserPrimary,
      ),
    ).toBe(true);
    expect(report.data?.bottleneck_courses.length).toBeGreaterThan(0);
    expect(report.data?.at_risk_roster?.length).toBeGreaterThan(0);
    expect(
      report.data?.at_risk_roster?.every(
        (item) => item.deficiencies.length > 0,
      ),
    ).toBe(true);
    expect(
      (
        await client().GET("/functions/v1/reports/department", {
          params: { query: { department_id: MOCK_IDS.deptDabe } },
        })
      ).response.status,
    ).toBe(403);
    loginAsMockPersona("dean");
    const faculty = await client().GET("/functions/v1/reports/faculty", {
      params: { query: { faculty_id: MOCK_IDS.facultyComputing } },
    });
    expect(faculty.data?.total_students).toBe(
      db.studentOrganizations.filter(
        (item) => item.faculty_id === MOCK_IDS.facultyComputing,
      ).length,
    );
    expect(faculty.data?.at_risk_roster?.length).toBeGreaterThan(0);
    expect(
      faculty.data?.department_summaries.some(
        (item) =>
          item.department_id === MOCK_IDS.deptDcst &&
          item.student_count === orgs.length,
      ),
    ).toBe(true);
    expect(
      (
        await client().GET("/functions/v1/reports/faculty", {
          params: { query: { faculty_id: MOCK_IDS.facultyEngineering } },
        })
      ).response.status,
    ).toBe(403);
  });

  it("connects the engineering student to an adviser, curriculum, grades, and a private notification", async () => {
    const db = getMockDatabase();
    const studentId = MOCK_IDS.studentOtherDept;
    const org = db.studentOrganizations.find(
      (item) => item.student_id === studentId,
    )!;
    expect(org.faculty_id).toBe(MOCK_IDS.facultyEngineering);
    expect(org.adviser_id).toBe(MOCK_IDS.adviserEngineering);
    expect(
      db.adviserAssignments.some(
        (item) =>
          item.student_id === studentId &&
          item.adviser_id === org.adviser_id &&
          !item.end_date,
      ),
    ).toBe(true);
    loginAsMockPersona("student_other_dept");
    const summary = await client().GET(
      "/functions/v1/students/{student_id}/academic-summary",
      { params: { path: { student_id: studentId } } },
    );
    expect(summary.data?.student_id).toBe(studentId);
    expect(summary.data?.earned_units).toBe(3);
    const notification = await client().GET("/rest/v1/notification");
    expect(notification.data?.length).toBeGreaterThan(0);
    expect(
      notification.data?.every((item) => item.recipient_id === studentId),
    ).toBe(true);
    loginAsMockPersona("adviser_engineering");
    const roster = await client().GET("/functions/v1/students", {
      params: { query: { assignment_scope: "current" } },
    });
    expect(
      roster.data?.items.some((item) => item.student_id === studentId),
    ).toBe(true);
    expect(
      roster.data?.items.some(
        (item) => item.student_id === MOCK_IDS.studentPrimary,
      ),
    ).toBe(false);
  });
  it("includes the routed checklist curriculum without changing conflicting existing catalog courses", async () => {
    const db = getMockDatabase();
    const version = db.curriculumVersions.find(
      (row) => row.id === MOCK_IDS.curriculumReference,
    )!;
    const terms = db.curriculumTerms.filter(
      (row) => row.curriculum_version_id === version.id,
    );
    const slots = db.curriculumTermCourses.filter((row) =>
      terms.some((term) => term.id === row.curriculum_term_id),
    );
    expect(slots).toHaveLength(52);
    expect(version.total_units).toBe(
      slots.reduce((sum, row) => sum + row.nominal_units, 0),
    );
    expect(
      db.courses.find((row) => row.id === MOCK_IDS.courseCsci102)?.title,
    ).toBe("Computer Programming 1");
    expect(
      db.courses.find((row) => row.id === MOCK_IDS.courseCsci198)?.title,
    ).toBe("Special Topics in Artificial Intelligence");
    expect(new Set(db.courses.map((row) => row.code.toUpperCase())).size).toBe(
      db.courses.length,
    );
    loginAsMockPersona("adviser");
    const student = MOCK_PERSONAS.student_sample_29;
    const result = await client().GET(
      "/functions/v1/students/{student_id}/checklist",
      { params: { path: { student_id: student.profileId } } },
    );
    expect(result.data).toHaveLength(52);
    expect(result.data?.some((row) => row.status === "passed")).toBe(true);
    expect(
      result.data?.some((row) => row.status === "currently_enrolled"),
    ).toBe(true);
  });

  it("returns term offerings and prerequisites from the selected student's records", async () => {
    loginAsMockPersona("adviser");
    const api = client();
    const path = { student_id: MOCK_PERSONAS.student_sample_1.profileId };
    const response = await api.GET(
      "/functions/v1/students/{student_id}/course-offerings",
      {
        params: { path, query: { school_term_id: MOCK_IDS.term2026Sem1Open } },
      },
    );
    expect(
      response.data?.some(
        (row) =>
          row.offering.id === MOCK_IDS.offeringNstp11 &&
          row.group === "program",
      ),
    ).toBe(true);
    const advanced = response.data?.find(
      (row) => row.offering.id === MOCK_IDS.offeringCsci153,
    );
    expect(advanced?.has_unmet_strict_prerequisites).toBe(true);
    expect(advanced?.unmet_prerequisites?.[0]?.latest_attempt_id).toBeNull();
    expect(advanced?.unmet_prerequisites?.[0]?.current_status).toBe(
      "not_taken",
    );
    const closedTerm = await api.GET(
      "/functions/v1/students/{student_id}/course-offerings",
      {
        params: {
          path,
          query: { school_term_id: MOCK_IDS.term2025Sem2Closed },
        },
      },
    );
    expect(
      closedTerm.data?.every(
        (row) => row.offering.school_term_id === MOCK_IDS.term2025Sem2Closed,
      ),
    ).toBe(true);
  });

  it("marks only the signed-in recipient's notifications read", async () => {
    const db = getMockDatabase();
    const adviserNotice = db.notifications.find(
      (row) => row.recipient_id === MOCK_IDS.adviserPrimary && !row.is_read,
    )!;
    const headNotice = db.notifications.find(
      (row) => row.recipient_id === MOCK_IDS.deptHeadDcst && !row.is_read,
    )!;
    loginAsMockPersona("adviser");
    const result = await client().POST(
      "/functions/v1/notifications/mark-read",
      {
        body: {
          notification_ids: [adviserNotice.id, headNotice.id],
          mark_all: false,
          is_read: true,
        },
      },
    );
    expect(result.response.status).toBe(200);
    expect(
      db.notifications.find((item) => item.id === adviserNotice.id)?.is_read,
    ).toBe(true);
    expect(
      db.notifications.find((item) => item.id === headNotice.id)?.is_read,
    ).toBe(false);
    expect(
      db.notifications.find((item) => item.id === adviserNotice.id)?.read_at,
    ).toBeTruthy();
    await client().POST("/functions/v1/notifications/mark-read", {
      body: {
        notification_id: adviserNotice.id,
        mark_all: false,
        is_read: false,
      },
    });
    expect(
      db.notifications.find((item) => item.id === adviserNotice.id)?.read_at,
    ).toBeNull();
    loginAsMockPersona("department_head");
    const visible = await client().GET("/rest/v1/notification");
    expect(visible.data?.some((row) => row.id === adviserNotice.id)).toBe(
      false,
    );
    expect(visible.data?.some((row) => row.id === headNotice.id)).toBe(true);
  });

  it("preserves roles and current adviser relationships for seeded personas", () => {
    const db = getMockDatabase();
    for (const persona of Object.values(MOCK_PERSONAS)) {
      if (!db.profiles.some((profile) => profile.id === persona.profileId))
        continue;
      expect(
        db.roleAssignments
          .filter((assignment) => assignment.profile_id === persona.profileId)
          .map((assignment) => assignment.role)
          .sort(),
      ).toEqual([...persona.roles].sort());
    }
    for (const org of db.studentOrganizations) {
      const current = db.adviserAssignments.filter(
        (item) => item.student_id === org.student_id && item.end_date === null,
      );
      expect(current).toHaveLength(1);
      expect(current[0]?.adviser_id).toBe(org.adviser_id);
    }
  });

  it("keeps the entry-year digit in student numbers independent of current academic progress", async () => {
    const db = getMockDatabase();
    const student = MOCK_PERSONAS.student_sample_10;
    const profile = db.profiles.find((item) => item.id === student.profileId)!;
    expect(profile.student_number).toBe("26-2-10010");
    const before = profile.student_number;
    loginAsMockPersona("adviser_secondary");
    const path = { student_id: student.profileId };
    const result = await client().POST(
      "/functions/v1/students/{student_id}/encode-grades",
      {
        params: { path },
        body: {
          school_term_id: MOCK_IDS.term2026Sem1Open,
          rows: [
            {
              course_offering_id: MOCK_IDS.offeringPhEd11,
              final_grade: 1.5,
              continue_with_prerequisite_override: false,
            },
          ],
        },
      },
    );
    expect(result.response.status).toBe(200);
    expect(
      db.profiles.find((item) => item.id === student.profileId)?.student_number,
    ).toBe(before);
    const roster = await client().GET("/functions/v1/students", {
      params: { query: { assignment_scope: "current" } },
    });
    expect(
      roster.data?.items.find((item) => item.student_id === student.profileId)
        ?.student_number,
    ).toBe(before);
  });

  it("keeps referenced curriculum courses protected from deletion", async () => {
    loginAsMockPersona("department_staff");
    const response = await client().DELETE(
      "/functions/v1/catalog/course/{id}",
      { params: { path: { id: MOCK_IDS.courseCsci198 } } },
    );
    expect(response.response.status).toBe(409);
    expect(
      getMockDatabase().courses.some(
        (course) => course.id === MOCK_IDS.courseCsci198,
      ),
    ).toBe(true);
  });
  it("populates the adviser dashboard deficiency list from assigned records", async () => {
    loginAsMockPersona("adviser");
    const report = await client().GET(
      "/functions/v1/reports/adviser-dashboard",
    );
    const rows = report.data?.advisees_with_deficiencies ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some(
        (row) =>
          row.student_id === MOCK_IDS.studentPrimary &&
          row.deficiencies.some((item) => item.kind === "open_inc"),
      ),
    ).toBe(true);
    expect(
      rows.every((row) =>
        getMockDatabase().adviserAssignments.some(
          (assignment) =>
            assignment.student_id === row.student_id &&
            assignment.adviser_id === MOCK_IDS.adviserPrimary &&
            assignment.end_date === null,
        ),
      ),
    ).toBe(true);
  });
});
