import { waitForLoaded } from "@/test/wait-for-loaded";
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
import * as photoApi from "./student-profile.api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

  it("validates photo type and 5 MiB limit, accepts valid photo, and removes photo", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
    );
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
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "big.png",
      { type: "image/png" },
    );
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
    expect(screen.getByRole("alert").textContent).toBe(
      "That image is over 5 MB. Choose a smaller one.",
    );
    expect(onUploadPhoto).not.toHaveBeenCalled();

    const validFile = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
      "avatar.png",
      { type: "image/png" },
    );
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    await waitFor(() => {
      expect(onUploadPhoto).toHaveBeenCalledWith(validFile);
    });
    expect(await screen.findByText("Photo updated.")).toBeTruthy();

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
    expect(await screen.findByText("Photo removed.")).toBeTruthy();
  });
});

describe("StudentProfilePage", () => {
  it("updates and removes the photo and refreshes sidebar data", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 2, height: 2, close: vi.fn() }),
    );
    const upload = vi
      .spyOn(photoApi, "uploadStudentPhotoObject")
      .mockResolvedValue({
        storagePath: "students/stu-1/upload-one.png",
        avatarUrl: "/student-photos/students/stu-1/upload-one.png",
      });
    const cleanupStaging = vi
      .spyOn(photoApi, "removeStudentPhotoStagingObject")
      .mockResolvedValue(undefined);
    let current = mockProfile;
    vi.spyOn(apiClient, "GET").mockImplementation(
      (path: string) =>
        Promise.resolve({
          data: path === "/rest/v1/profile" ? [current] : [],
          response: new Response(),
        }) as never,
    );
    const put = vi.spyOn(apiClient, "PUT").mockImplementation(() => {
      current = {
        ...mockProfile,
        avatar_url:
          "/storage/v1/object/authenticated/student-photos/students/stu-1/validated-one.png",
      };
      return Promise.resolve({
        data: current,
        response: new Response(),
      }) as never;
    });
    vi.spyOn(apiClient, "DELETE").mockImplementation(() => {
      current = mockProfile;
      return Promise.resolve({
        data: current,
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
    await screen.findByLabelText("Upload profile photo");
    await waitForLoaded();
    const input = screen.getByLabelText("Upload profile photo");
    const file = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "photo.png",
      { type: "image/png" },
    );
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith("stu-1", file, "image/png");
    await waitFor(() =>
      expect(cleanupStaging).toHaveBeenCalledWith(
        "students/stu-1/upload-one.png",
      ),
    );
    expect(queryClient.getQueryData(["sidebar-student-photo", "stu-1"])).toBe(
      current.avatar_url,
    );
    const remove = screen.getByRole("button", {
      name: "Remove photo",
    }) as HTMLButtonElement;
    await waitFor(() => expect(remove.disabled).toBe(false));
    fireEvent.click(remove);
    await waitFor(() =>
      expect(
        queryClient.getQueryData(["sidebar-student-photo", "stu-1"]),
      ).toBeNull(),
    );
  });
  it("removes the staging upload when saving the photo fails", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 2, height: 2, close: vi.fn() }),
    );
    vi.spyOn(photoApi, "uploadStudentPhotoObject").mockResolvedValue({
      storagePath: "students/stu-1/upload-one.png",
      avatarUrl: "/student-photos/students/stu-1/upload-one.png",
    });
    const cleanupStaging = vi
      .spyOn(photoApi, "removeStudentPhotoStagingObject")
      .mockResolvedValue(undefined);
    vi.spyOn(apiClient, "GET").mockImplementation(
      (path: string) =>
        Promise.resolve({
          data: path === "/rest/v1/profile" ? [mockProfile] : [],
          response: new Response(),
        }) as never,
    );
    vi.spyOn(apiClient, "PUT").mockRejectedValue(new Error("Save failed"));
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter>
          <StudentProfilePage studentId="stu-1" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByLabelText("Upload profile photo");
    await waitForLoaded();
    fireEvent.change(screen.getByLabelText("Upload profile photo"), {
      target: {
        files: [
          new File(
            [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
            "photo.png",
            { type: "image/png" },
          ),
        ],
      },
    });
    await waitFor(() =>
      expect(cleanupStaging).toHaveBeenCalledWith(
        "students/stu-1/upload-one.png",
      ),
    );
  });
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

    expect(document.querySelector("[skullet-status]")?.textContent).toBe(
      "Loading...",
    );

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
