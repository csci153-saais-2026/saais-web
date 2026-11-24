import { afterEach, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";
import { getSelectedStudent } from "./advisees.api";

afterEach(() => vi.restoreAllMocks());

it("loads the selected student's photo only after finding the student in the authorized roster", async () => {
  const avatar =
    "/storage/v1/object/authenticated/student-photos/students/stu-1/validated-one.png";
  const get = vi.spyOn(apiClient, "GET").mockImplementation((path: string) => {
    if (path === "/rest/v1/profile")
      return Promise.resolve({
        data: [{ id: "stu-1", student_number: "123", avatar_url: avatar }],
        response: new Response(),
      }) as never;
    return Promise.resolve({
      data: {
        items: [{ student_id: "stu-1", full_name: "Student" }],
        total_count: 1,
      },
      response: new Response(),
    }) as never;
  });
  expect((await getSelectedStudent("stu-1")).avatar_url).toBe(avatar);
  expect(get).toHaveBeenCalledWith("/rest/v1/profile", {
    params: {
      query: {
        id: "eq.stu-1",
        select: "id,student_number,avatar_url",
        limit: 1,
      },
    },
  });
  vi.mocked(apiClient.GET).mockImplementation((path: string) =>
    path === "/rest/v1/profile"
      ? (Promise.resolve({
          data: [{ id: "stu-1", student_number: "123", avatar_url: avatar }],
          response: new Response(),
        }) as never)
      : (Promise.resolve({
          data: { items: [], total_count: 0 },
          response: new Response(),
        }) as never),
  );
  await expect(getSelectedStudent("stu-1")).rejects.toThrow(
    "outside your access scope",
  );
});
