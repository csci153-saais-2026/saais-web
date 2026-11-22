import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
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
});
