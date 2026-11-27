import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from "./index";
import { saaisMockServer } from "./node";

const student = MOCK_IDS.studentPrimary;

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
});
afterAll(() => saaisMockServer.close());

async function put(path: string) {
  const response = await fetch(
    `https://saais-mock.supabase.co/functions/v1/students/${student}/photo`,
    {
      method: "PUT",
      headers: {
        apikey: "test-key",
        Authorization: `Bearer ${MOCK_PERSONAS.student.token}`,
      },
      body: JSON.stringify({
        storage_object_path: path,
        avatar_url: "/student-photos/" + path,
        mime_type: "image/png",
        file_size_bytes: 100,
      }),
    },
  );
  return response.status;
}

describe("mock student photo paths", () => {
  it("accepts a file in the student's own folder", async () => {
    expect(await put(`students/${student}/upload-1.png`)).toBe(200);
  });

  it.each([
    ["another student's folder", "students/someone-else/upload-1.png"],
    ["a different root", `avatars/${student}/upload-1.png`],
    ["no file name", `students/${student}/`],
    ["a nested path", `students/${student}/a/upload-1.png`],
    ["a parent reference", `students/${student}/..`],
    ["unsafe characters", `students/${student}/my photo.png`],
    ["the validated- prefix", `students/${student}/validated-1.png`],
  ])("rejects %s", async (_, path) => {
    expect(await put(path)).toBe(400);
  });
});
