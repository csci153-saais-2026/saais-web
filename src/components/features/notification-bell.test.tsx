import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NotificationBell } from "./notification-bell";

afterEach(cleanup);

describe("NotificationBell", () => {
  it("keeps the capped unread signal accessible without claiming a numeric total", () => {
    render(
      <MemoryRouter>
        <NotificationBell
          items={[{ id: "1", title: "Unread item", time: "Now", unread: true }]}
          allHref="/notifications"
          showUnreadCount={false}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: "Notifications, unread items" }),
    ).toBeTruthy();
    expect(screen.queryByText("1")).toBeNull();
  });

  it("is keyboard-focusable and exposes its popup semantics", () => {
    render(
      <MemoryRouter>
        <NotificationBell items={[]} allHref="/notifications" />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole("button", { name: "Notifications" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
