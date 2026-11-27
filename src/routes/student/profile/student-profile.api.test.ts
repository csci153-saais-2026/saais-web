import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";

let api: typeof import("./student-profile.api");
let photoHooks: typeof import("./use-student-photo");
let profileHooks: typeof import("./use-student-profile");

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeAll(async () => {
  saaisMockServer.listen();
  api = await import("./student-profile.api");
  photoHooks = await import("./use-student-photo");
  profileHooks = await import("./use-student-profile");
});

afterEach(() => {
  cleanup();
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});

afterAll(() => {
  saaisMockServer.close();
});

describe("student-profile API helpers and hooks (MSW)", () => {
  it("fetches profile data and updates/deletes profile photo", async () => {
    loginAsMockPersona("student");
    const studentId = MOCK_PERSONAS.student.profileId;

    const data = await api.fetchStudentProfileData(studentId);
    expect(data.profile.id).toBe(MOCK_IDS.studentPrimary);
    expect(data.adviserAssignments.length).toBeGreaterThan(0);
    expect(data.curriculumAssignments.length).toBeGreaterThan(0);

    const updated = await api.updateStudentPhoto(studentId, {
      storage_object_path: `students/${studentId}/avatar.png`,
      avatar_url: "data:image/png;base64,iVBORw0KGgo=",
      mime_type: "image/png",
      file_size_bytes: 128,
    });
    expect(updated.avatar_url).toBe("data:image/png;base64,iVBORw0KGgo=");

    const cleared = await api.deleteStudentPhoto(studentId);
    expect(cleared.avatar_url).toBeNull();
  });

  it("accepts photos up to 5 MiB and rejects larger ones", async () => {
    loginAsMockPersona("student");
    const studentId = MOCK_PERSONAS.student.profileId;
    const upload = (file_size_bytes: number) =>
      api.updateStudentPhoto(studentId, {
        storage_object_path: `students/${studentId}/avatar.png`,
        avatar_url: "data:image/png;base64,iVBORw0KGgo=",
        mime_type: "image/png",
        file_size_bytes,
      });

    await expect(upload(5_242_880)).resolves.toBeTruthy();
    await expect(upload(5_242_881)).rejects.toThrow("5 MiB");
  });

  it("hydrates useStudentProfile and executes photo mutations", async () => {
    loginAsMockPersona("student");
    const wrapper = createQueryWrapper();

    const { result: profileHook } = renderHook(
      () => profileHooks.useStudentProfile(MOCK_IDS.studentPrimary),
      { wrapper },
    );
    const { result: updateHook } = renderHook(
      () => photoHooks.useUpdateStudentPhoto(MOCK_IDS.studentPrimary),
      { wrapper },
    );
    const { result: deleteHook } = renderHook(
      () => photoHooks.useDeleteStudentPhoto(MOCK_IDS.studentPrimary),
      { wrapper },
    );

    await waitFor(() => {
      expect(profileHook.current.isSuccess).toBe(true);
    });

    const updated = await updateHook.current.mutateAsync({
      storage_object_path: `students/${MOCK_IDS.studentPrimary}/avatar.jpg`,
      avatar_url: "data:image/jpeg;base64,/9j/4AAQ",
      mime_type: "image/jpeg",
      file_size_bytes: 256,
    });
    expect(updated.avatar_url).toBe("data:image/jpeg;base64,/9j/4AAQ");

    const cleared = await deleteHook.current.mutateAsync();
    expect(cleared.avatar_url).toBeNull();
  });

  it("resolves program, department, college, and curriculum labels located on page two", async () => {
    loginAsMockPersona("student");
    const studentId = MOCK_PERSONAS.student.profileId;
    const pageTwoProgramId = "00000025-0000-4000-8000-000000000001";
    const pageTwoDepartmentId = "00000025-0000-4000-8000-000000000002";
    const pageTwoFacultyId = "00000025-0000-4000-8000-000000000003";
    const pageTwoVersionId = "00000025-0000-4000-8000-000000000004";
    const total = 25;
    const pageSize = 20;

    function paginate<T>(rows: T[], request: Request) {
      const offset = Number(
        new URL(request.url).searchParams.get("offset") ?? "0",
      );
      const slice = rows.slice(offset, offset + pageSize);
      const end = slice.length > 0 ? offset + slice.length - 1 : 0;
      return HttpResponse.json(slice, {
        headers: {
          "Content-Range":
            slice.length > 0
              ? `${offset}-${end}/${rows.length}`
              : `*/${rows.length}`,
        },
      });
    }

    const programs = Array.from({ length: total }, (_, i) => ({
      id:
        i === 24
          ? pageTwoProgramId
          : `00000001-0000-4000-8000-${String(i).padStart(12, "0")}`,
      code: i === 24 ? "BSDS" : `PROG-${i}`,
      name: i === 24 ? "BS Data Science (Page 2)" : `Program ${i}`,
      nominal_duration: 4,
      status: "active" as const,
      department_id: pageTwoDepartmentId,
    }));
    const departments = Array.from({ length: total }, (_, i) => ({
      id:
        i === 24
          ? pageTwoDepartmentId
          : `00000002-0000-4000-8000-${String(i).padStart(12, "0")}`,
      faculty_id: pageTwoFacultyId,
      name:
        i === 24 ? "Department of Data Science (Page 2)" : `Department ${i}`,
      code: i === 24 ? "DDS" : `D${i}`,
      letterhead_prefix: null,
      letterhead_name: null,
      department_head_name: null,
      dean_name: null,
    }));
    const faculties = Array.from({ length: total }, (_, i) => ({
      id:
        i === 24
          ? pageTwoFacultyId
          : `00000003-0000-4000-8000-${String(i).padStart(12, "0")}`,
      name: i === 24 ? "Faculty of Informatics (Page 2)" : `Faculty ${i}`,
      code: i === 24 ? "FI" : `F${i}`,
      letterhead_prefix: null,
      letterhead_name: null,
      dean_name: null,
    }));
    const versions = Array.from({ length: total }, (_, i) => ({
      id:
        i === 24
          ? pageTwoVersionId
          : `00000004-0000-4000-8000-${String(i).padStart(12, "0")}`,
      program_id: pageTwoProgramId,
      version_label: i === 24 ? "BSDS 2026 (Page 2)" : `VER-${i}`,
      effective_start: "2026-08-01",
      effective_end: null,
      delinquency_threshold: 9,
      total_units: 140,
      status: "active" as const,
      enrolled_student_count: 1,
    }));

    saaisMockServer.use(
      http.get("*/rest/v1/student_organization", () =>
        HttpResponse.json([
          {
            student_id: studentId,
            student_curriculum_assignment_id: "sca-page2",
            curriculum_version_id: pageTwoVersionId,
            program_id: pageTwoProgramId,
            department_id: pageTwoDepartmentId,
            faculty_id: pageTwoFacultyId,
            adviser_id: MOCK_IDS.adviserPrimary,
            entry_year: 2026,
          },
        ]),
      ),
      http.get("*/rest/v1/program", ({ request }) =>
        paginate(programs, request),
      ),
      http.get("*/rest/v1/department", ({ request }) =>
        paginate(departments, request),
      ),
      http.get("*/rest/v1/faculty", ({ request }) =>
        paginate(faculties, request),
      ),
      http.get("*/rest/v1/curriculum_version", ({ request }) =>
        paginate(versions, request),
      ),
    );

    const data = await api.fetchStudentProfileData(studentId);
    expect(data.programName).toBe("BS Data Science (Page 2)");
    expect(data.departmentName).toBe("Department of Data Science (Page 2)");
    expect(data.collegeName).toBe("Faculty of Informatics (Page 2)");
    expect(data.curriculumLabels[pageTwoVersionId]).toBe("BSDS 2026 (Page 2)");
  });
});
