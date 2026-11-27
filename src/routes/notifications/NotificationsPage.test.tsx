import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationBell } from "@/components/features/notification-bell";
import NotificationsPage from "./NotificationsPage";

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiClient: api,
  unwrapApiResult: (result: { data?: unknown; error?: unknown }) => {
    if (result.error) throw result.error;
    return result.data;
  },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

const item = {
  id: "notification-1",
  recipient_id: "account-1",
  kind: "flag",
  event_type: "grade_flag_submitted",
  title: "Grade flag submitted",
  body: "A student submitted a flag.",
  target_route: "/adviser/grade-flags",
  is_read: false,
  created_at: "2026-01-01T00:00:00Z",
};

function SharedShellAndPage() {
  const state = useNotifications(
    "account-1",
    false,
    "adviser",
    "/notifications",
  );
  return (
    <>
      <NotificationBell
        items={state.bellItems}
        allHref={state.allHref}
        onMarkAllRead={state.markAllRead}
        loading={state.loading}
        error={state.error}
      />
      <NotificationsPage />
    </>
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/notifications"]}>
        <Routes>
          <Route path="/notifications" element={<SharedShellAndPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("universal notifications page shared data", () => {
  it("uses the account collection shared with the bell and refreshes both views after a successful read action", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "account-1" },
      roles: ["adviser", "admin"],
      activeRole: "adviser",
    } as unknown as ReturnType<typeof useAuth>);
    api.GET.mockResolvedValueOnce({ data: [item] }).mockResolvedValueOnce({
      data: [{ ...item, is_read: true }],
    });
    api.POST.mockResolvedValue({ data: { updated_count: 1 } });
    renderPage();

    await screen.findByText("Grade flag submitted");
    expect(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    await waitFor(() =>
      expect(screen.getByText("0 unread of 1 notifications.")).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(api.POST).toHaveBeenCalledWith(
      "/functions/v1/notifications/mark-read",
      {
        body: {
          notification_id: "notification-1",
          mark_all: false,
          is_read: true,
        },
      },
    );
  });
});
