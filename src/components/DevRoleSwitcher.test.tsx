import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DevRoleSwitcher } from "./DevRoleSwitcher";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);

describe("DevRoleSwitcher", () => {
  const actions = {
    switchMockPersona: vi.fn(),
    setActiveRole: vi.fn(),
    signOut: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DEV", true);
    mockedUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        fullName: "Test Adviser",
        email: "adviser@vsu.edu.ph",
        status: "active",
      },
      roles: ["adviser", "department_head", "dean"],
      activeRole: "adviser",
      activePersonaKey: "adviser",
      isMockMode: true,
      isAllowedToEnter: true,
      ...actions,
    } as never);
  });

  it("is hidden outside development or mock mode", () => {
    vi.stubEnv("DEV", false);
    const { rerender, container } = render(<DevRoleSwitcher />);
    expect(container.firstChild).toBeNull();

    vi.stubEnv("DEV", true);
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      isMockMode: false,
    } as never);
    rerender(<DevRoleSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the active persona, switches a multi-role portal, selects personas, and logs out", () => {
    render(<DevRoleSwitcher />);
    fireEvent.click(
      screen.getByRole("button", { name: /Dev Persona: Test Adviser/ }),
    );

    const panel = screen.getByRole("complementary", {
      name: "Developer Persona Switcher",
    });
    expect(panel.textContent).toContain("Active User: Test Adviser");
    expect(screen.getByText("Active Role Portal View:")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "DEAN" }));
    expect(actions.setActiveRole).toHaveBeenCalledWith("dean");

    fireEvent.click(
      screen.getByRole("button", { name: /Student Primary \(Active\)/ }),
    );
    expect(actions.switchMockPersona).toHaveBeenCalledWith("student");

    fireEvent.click(screen.getByRole("button", { name: /Log Out/ }));
    expect(actions.switchMockPersona).toHaveBeenCalledWith(null);
    expect(actions.signOut).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(screen.queryByText("Active Role Portal View:")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Dev Persona: Test Adviser/ }),
    ).toBeTruthy();
  });

  it("shows blocked and logged-out mock personas without a role portal selector", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      roles: [],
      activeRole: null,
      activePersonaKey: null,
      isMockMode: true,
      isAllowedToEnter: false,
      ...actions,
    } as never);
    const { rerender } = render(<DevRoleSwitcher />);
    fireEvent.click(
      screen.getByRole("button", { name: /Dev Persona: Logged Out/ }),
    );
    expect(screen.getByText("Active User:")).toBeTruthy();
    expect(screen.queryByText("Active Role Portal View:")).toBeNull();
    expect(screen.getByText("Simulate anonymous guest visitor")).toBeTruthy();

    mockedUseAuth.mockReturnValue({
      user: {
        id: "disabled",
        fullName: "Disabled Account",
        email: "disabled@vsu.edu.ph",
        status: "disabled",
      },
      roles: ["student"],
      activeRole: "student",
      activePersonaKey: "disabled_account",
      isMockMode: true,
      isAllowedToEnter: false,
      ...actions,
    } as never);
    rerender(<DevRoleSwitcher />);
    expect(screen.getByText("(disabled)")).toBeTruthy();
  });
});
