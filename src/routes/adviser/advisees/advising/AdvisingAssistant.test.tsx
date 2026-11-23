import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AdvisingAssistant } from "./AdvisingAssistant";
import { askAdvisingAssistant } from "./advising-assistant.api";

vi.mock("./advising-assistant.api", () => ({ askAdvisingAssistant: vi.fn() }));
const student = "00000000-0000-4000-8001-000000000001";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("AdvisingAssistant", () => {
  it("calls the API with the selected student and bounded conversation history", async () => {
    vi.mocked(askAdvisingAssistant).mockResolvedValue({
      answer: "Simulated answer",
      verification_notice: "Verify the official record.",
      grounded_at: "2026-11-10T09:00:00Z",
      mutates_records: false,
    });
    render(<AdvisingAssistant studentId={student} isMockMode />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open advising assistant" }),
    );
    expect(screen.getByText("Demo preview")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message the advising assistant"), {
      target: { value: " First question " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Simulated answer")).toBeTruthy();
    expect(screen.getByText("AI can make mistakes.")).toBeTruthy();
    expect(askAdvisingAssistant).toHaveBeenCalledWith(
      student,
      "First question",
      [],
    );
    fireEvent.change(screen.getByLabelText("Message the advising assistant"), {
      target: { value: "Next question" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(askAdvisingAssistant).toHaveBeenLastCalledWith(
        student,
        "Next question",
        [
          { role: "user", content: "First question" },
          { role: "assistant", content: "Simulated answer" },
        ],
      ),
    );
  });
  it("does not send requests without a UUID or outside mock mode", () => {
    const view = render(
      <AdvisingAssistant studentId="2023-04412" isMockMode />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open advising assistant" }),
    );
    expect(
      (screen.getByRole("button", { name: "Send" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    view.rerender(<AdvisingAssistant studentId={student} isMockMode={false} />);
    expect(
      (screen.getByRole("button", { name: "Send" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(askAdvisingAssistant).not.toHaveBeenCalled();
  });
  it("preserves the question and shows an error if the request fails", async () => {
    vi.mocked(askAdvisingAssistant).mockRejectedValue(new Error("Unavailable"));
    render(<AdvisingAssistant studentId={student} isMockMode />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open advising assistant" }),
    );
    fireEvent.change(screen.getByLabelText("Message the advising assistant"), {
      target: { value: "Question" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      (
        screen.getByLabelText(
          "Message the advising assistant",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("Question");
  });
  it("sends on Enter and allows Shift+Enter for a new line", async () => {
    vi.mocked(askAdvisingAssistant).mockResolvedValue({
      answer: "Simulated answer",
      verification_notice: "Verify.",
      grounded_at: "2026-11-10T09:00:00Z",
      mutates_records: false,
    });
    render(<AdvisingAssistant studentId={student} isMockMode />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open advising assistant" }),
    );
    const input = screen.getByLabelText("Message the advising assistant");
    fireEvent.change(input, { target: { value: "Question" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(askAdvisingAssistant).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(askAdvisingAssistant).toHaveBeenCalledWith(
        student,
        "Question",
        [],
      ),
    );
  });
});
