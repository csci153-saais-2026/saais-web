import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ApiSchema } from "@/lib/api";
import {
  commitStudentImport,
  previewStudentImport,
} from "./student-import.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: "http://localhost:3000",
      mode: "mock",
      getAccessToken: async () => "student-import-test",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const row: ApiSchema<"StudentBatchImportRowInput"> = {
  row_number: 2,
  student_number: "24-1-00001",
  full_name: "Ari Lee",
  email: "ari@example.edu.ph",
  program_id: "11111111-1111-4111-8111-111111111111",
  curriculum_version_id: "22222222-2222-4222-8222-222222222222",
  adviser_id: "33333333-3333-4333-8333-333333333333",
};

describe("previewStudentImport", () => {
  it("sends one scoped-operation preview payload and never a commit payload", async () => {
    let requests = 0;
    server.use(
      http.post("*/functions/v1/students/import", async ({ request }) => {
        requests += 1;
        expect(await request.json()).toEqual({
          mode: "preview",
          rows: [row],
        });
        return HttpResponse.json({
          mode: "preview",
          valid_count: 1,
          warning_count: 0,
          error_count: 0,
          imported_count: 0,
          results: [
            {
              row_number: 2,
              student_number: row.student_number,
              email: row.email,
              outcome: "valid",
              message: "Validated successfully.",
            },
          ],
        });
      }),
    );

    await expect(previewStudentImport([row])).resolves.toMatchObject({
      mode: "preview",
      valid_count: 1,
      imported_count: 0,
    });
    expect(requests).toBe(1);
  });

  it("rejects commit-shaped or mismatched preview responses", async () => {
    server.use(
      http.post("*/functions/v1/students/import", () =>
        HttpResponse.json({
          mode: "commit",
          valid_count: 1,
          warning_count: 0,
          error_count: 0,
          imported_count: 1,
          results: [
            {
              row_number: row.row_number,
              student_number: row.student_number,
              email: row.email,
              outcome: "imported",
            },
          ],
        }),
      ),
    );

    await expect(previewStudentImport([row])).rejects.toThrow(
      "invalid response",
    );
  });

  it("rejects preview rows with mismatched identities or outcome counts", async () => {
    server.use(
      http.post("*/functions/v1/students/import", () =>
        HttpResponse.json({
          mode: "preview",
          valid_count: 1,
          warning_count: 0,
          error_count: 0,
          imported_count: 0,
          results: [
            {
              row_number: row.row_number,
              student_number: "24-1-00002",
              email: row.email,
              outcome: "valid",
              message: "Validated successfully.",
            },
          ],
        }),
      ),
    );
    await expect(previewStudentImport([row])).rejects.toThrow(
      "invalid row results",
    );

    server.use(
      http.post("*/functions/v1/students/import", () =>
        HttpResponse.json({
          mode: "preview",
          valid_count: 0,
          warning_count: 0,
          error_count: 0,
          imported_count: 0,
          results: [
            {
              row_number: row.row_number,
              student_number: row.student_number,
              email: row.email,
              outcome: "valid",
              message: "Validated successfully.",
            },
          ],
        }),
      ),
    );
    await expect(previewStudentImport([row])).rejects.toThrow(
      "inconsistent outcome counts",
    );
  });

  it("preserves server permission errors", async () => {
    server.use(
      http.post("*/functions/v1/students/import", () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
      ),
    );

    await expect(previewStudentImport([row])).rejects.toMatchObject({
      isForbidden: true,
    });
  });
});

describe("commitStudentImport", () => {
  it("sends the explicit commit operation and validates its per-row result", async () => {
    let requests = 0;
    server.use(
      http.post("*/functions/v1/students/import", async ({ request }) => {
        requests += 1;
        expect(await request.json()).toEqual({ mode: "commit", rows: [row] });
        return HttpResponse.json({
          mode: "commit",
          valid_count: 1,
          warning_count: 0,
          error_count: 0,
          imported_count: 1,
          results: [
            {
              row_number: row.row_number,
              student_number: row.student_number,
              email: row.email,
              outcome: "imported",
              message: "Imported successfully.",
            },
          ],
        });
      }),
    );

    await expect(commitStudentImport([row])).resolves.toMatchObject({
      mode: "commit",
      imported_count: 1,
    });
    expect(requests).toBe(1);
  });

  it("rejects a commit response with mismatched rows or outcome counts", async () => {
    server.use(
      http.post("*/functions/v1/students/import", () =>
        HttpResponse.json({
          mode: "commit",
          valid_count: 1,
          warning_count: 0,
          error_count: 0,
          imported_count: 0,
          results: [
            {
              row_number: row.row_number,
              student_number: "24-1-00002",
              email: row.email,
              outcome: "error",
              message: "A different row was returned.",
            },
          ],
        }),
      ),
    );

    await expect(commitStudentImport([row])).rejects.toThrow(
      "invalid row results",
    );
  });
});
