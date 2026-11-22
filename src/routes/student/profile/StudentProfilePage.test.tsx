import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { apiClient, type ApiSchema } from "@/lib/api";
import { StudentProfilePage, StudentProfileView } from "./StudentProfilePage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockProfile: ApiSchema<"Profile"> = {
  id: "stu-1",
  role: "student",
  email: "maria.bautista@example.edu.ph",
  full_name: "Maria Isabel Bautista",
  student_number: "23-1-04412",
  status: "active",
  created_at: "2024-08-01T08:00:00Z",
  updated_at: "2024-08-01T08:00:00Z",
  avatar_url: null,
};

describe("StudentProfileView", () => {
  it("renders read-only profile fields and opens AssignmentHistoryDialog & CurriculumHistoryDialog", () => {
    render(
      <MemoryRouter>
        <StudentProfileView
          profile={mockProfile}
          programName="BS Computer Science"
          departmentName="Department of Computer Science and Technology"
          collegeName="Faculty of Computing"
          adviserAssignments={[
            {
              id: "aa-1",
              adviser_id: "adv-1",
              adviser_name: "Prof. Ramon Reyes",
              student_id: "stu-1",
              start_date: "2024-06-12",
              end_date: null,
              created_at: "2024-06-12T08:00:00Z",
            },
          ]}
          curriculumAssignments={[
            {
              id: "ca-1",
              student_id: "stu-1",
              curriculum_version_id: "cv-1",
              start_date: "2024-08-01",
              end_date: null,
              change_note: "Initial assignment",
              created_at: "2024-08-01T08:00:00Z",
            },
          ]}
          curriculumLabels={{ "cv-1": "BSCS 2024-2025 v1" }}
        />
      </MemoryRouter>,
    );

    const fullNameInput = screen.getByLabelText(
      "Full name",
    ) as HTMLInputElement;
    const studentNoInput = screen.getByLabelText(
      "Student number",
    ) as HTMLInputElement;
    expect(fullNameInput.disabled).toBe(true);
    expect(fullNameInput.value).toBe("Maria Isabel Bautista");
    expect(studentNoInput.disabled).toBe(true);
    expect(studentNoInput.value).toBe("23-1-04412");
    expect((screen.getByLabelText("Program") as HTMLInputElement).value).toBe(
      "BS Computer Science",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "View assignment history" }),
    );
    expect(screen.getByText("Assignment history")).toBeTruthy();
    expect(screen.getByText("Present")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    fireEvent.click(
      screen.getByRole("button", { name: "View curriculum history" }),
    );
    expect(screen.getByText("Curriculum history")).toBeTruthy();
    expect(screen.getAllByText("Current").length).toBeGreaterThanOrEqual(2);
  });

  it("validates photo type and 2 MB limit, accepts valid photo, and removes photo", async () => {
    const onUploadPhoto = vi.fn().mockResolvedValue(undefined);
    const onRemovePhoto = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <MemoryRouter>
        <StudentProfileView
          profile={mockProfile}
          onUploadPhoto={onUploadPhoto}
          onRemovePhoto={onRemovePhoto}
        />
      </MemoryRouter>,
    );

    const removeBtn = screen.getByRole("button", { name: "Remove photo" });
    expect((removeBtn as HTMLButtonElement).disabled).toBe(true);

    const fileInput = screen.getByLabelText(
      "Upload profile photo",
    ) as HTMLInputElement;

    const badTypeFile = new File(["gif"], "avatar.gif", { type: "image/gif" });
    fireEvent.change(fileInput, { target: { files: [badTypeFile] } });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "Choose a JPG or PNG image.",
    );
    expect(onUploadPhoto).not.toHaveBeenCalled();

    const oversizedFile = new File(
      [new Uint8Array(2 * 1024 * 1024 + 1)],
      "big.png",
      { type: "image/png" },
    );
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
    expect(screen.getByRole("alert").textContent).toBe(
      "That image is over 2 MB. Choose a smaller one.",
    );
    expect(onUploadPhoto).not.toHaveBeenCalled();

    const validFile = new File(["png"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    await waitFor(() => {
      expect(onUploadPhoto).toHaveBeenCalledWith(validFile);
    });
    expect(screen.getByRole("status").textContent).toBe("Photo updated.");

    rerender(
      <MemoryRouter>
        <StudentProfileView
          profile={{ ...mockProfile, avatar_url: "data:image/png;base64,AAA" }}
          onUploadPhoto={onUploadPhoto}
          onRemovePhoto={onRemovePhoto}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    await waitFor(() => {
      expect(onRemovePhoto).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("status").textContent).toBe("Photo removed.");
  });
});

describe("StudentProfilePage", () => {
  it("shows Loading... while pending, Try again on error, and recovers on retry", async () => {
    let callCount = 0;
    vi.spyOn(apiClient, "GET").mockImplementation((path: string) => {
      if (path === "/rest/v1/profile") {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(new Error("Network error")) as never;
        }
        return Promise.resolve({
          data: [mockProfile],
          response: new Response(),
        }) as never;
      }
      return Promise.resolve({
        data: [],
        response: new Response(),
      }) as never;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentProfilePage studentId="stu-1" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("status").textContent).toBe("Loading...");

    const retryBtn = await screen.findByRole("button", { name: "Try again" });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Your student profile.")).toBeTruthy();
    });
  });

  it("removes profile photo via useDeleteStudentPhoto and invalidates profile query", async () => {
    const profileWithAvatar: ApiSchema<"Profile"> = {
      ...mockProfile,
      avatar_url: "https://example.com/avatar.jpg",
    };

    vi.spyOn(apiClient, "GET").mockImplementation((path: string) => {
      if (path === "/rest/v1/profile") {
        return Promise.resolve({
          data: [profileWithAvatar],
          response: new Response(),
        }) as never;
      }
      return Promise.resolve({
        data: [],
        response: new Response(),
      }) as never;
    });

    const deleteSpy = vi.spyOn(apiClient, "DELETE").mockResolvedValue({
      data: { ...profileWithAvatar, avatar_url: null },
      response: new Response(),
    } as never);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentProfilePage studentId="stu-1" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const removeBtn = await screen.findByRole("button", {
      name: "Remove photo",
    });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(
        "/functions/v1/students/{student_id}/photo",
        {
          params: { path: { student_id: "stu-1" } },
        },
      );
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["student", "stu-1", "profile"],
      });
    });
  });
});
