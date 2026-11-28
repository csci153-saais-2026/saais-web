import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from "./index";
import { saaisMockServer } from "./node";

const student = MOCK_IDS.studentPrimary;
const name = "upload-00000000-0000-4000-8000-000000000001.png";

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
  it("accepts a UUID staging name in the student's own folder", async () => {
    expect(await put(`students/${student}/${name}`)).toBe(200);
  });

  it.each([
    [
      "another student's folder",
      `students/${MOCK_IDS.studentSecondary}/${name}`,
    ],
    ["a different root", `avatars/${student}/${name}`],
    ["no file name", `students/${student}/`],
    ["a nested path", `students/${student}/a/${name}`],
    ["a parent reference", `students/${student}/..`],
    ["unsafe characters", `students/${student}/my photo.png`],
    ["the validated- prefix", `students/${student}/validated-1.png`],
    ["a reusable name", `students/${student}/avatar.png`],
    ["a non-UUID upload name", `students/${student}/upload-1.png`],
    [
      "the wrong extension",
      `students/${student}/${name.replace(".png", ".jpg")}`,
    ],
  ])("rejects %s", async (_, path) => {
    expect(await put(path)).toBe(400);
  });
});
