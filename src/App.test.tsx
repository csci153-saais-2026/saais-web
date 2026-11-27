import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App public route loading", () => {
  it("shows a neutral loader, not a page skeleton, while the landing page loads", () => {
    window.history.pushState({}, "", "/");
    const { container } = render(<App />);

    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Loading…");
    expect(status.querySelector(".animate-spin")).toBeTruthy();
    expect(container.querySelectorAll('[role="status"] > div')).toHaveLength(1);
    expect(container.querySelector(".p-6")).toBeNull();
  });
});
