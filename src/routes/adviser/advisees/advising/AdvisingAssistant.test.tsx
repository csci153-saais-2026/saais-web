import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AdvisingAssistant } from "./AdvisingAssistant";
import {
  askAdvisingAssistant,
  getAdvisingAssistantHistory,
} from "./advising-assistant.api";

vi.mock("./advising-assistant.api", () => ({
  askAdvisingAssistant: vi.fn(),
  getAdvisingAssistantHistory: vi.fn(),
}));
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
    expect(screen.getByText("Verify the official record.")).toBeTruthy();
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
  it("does not send requests without a valid student UUID", () => {
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
    view.rerender(
      <AdvisingAssistant studentId="2023-04412" isMockMode={false} />,
    );
    expect(
      (screen.getByRole("button", { name: "Send" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(askAdvisingAssistant).not.toHaveBeenCalled();
  });
  it("calls the existing API in Supabase mode and displays its verification notice", async () => {
    vi.mocked(getAdvisingAssistantHistory).mockResolvedValue([]);
    vi.mocked(askAdvisingAssistant).mockResolvedValue({
      answer: "Record-grounded answer",
      verification_notice: "Verify this response against the student record.",
      grounded_at: "2026-11-10T09:00:00Z",
      mutates_records: false,
    });
    render(<AdvisingAssistant studentId={student} isMockMode={false} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open advising assistant" }),
    );
    expect(screen.queryByText("Demo preview")).toBeNull();
    expect(
      screen.queryByText(
        "The assistant is not available outside mock mode yet.",
      ),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText("Message the advising assistant"), {
      target: { value: "What is the student's standing?" },
    });
    await waitFor(() =>
      expect(screen.queryByText("Loading earlier messages...")).toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Record-grounded answer")).toBeTruthy();
    expect(
      screen.getByText("Verify this response against the student record."),
    ).toBeTruthy();
    expect(askAdvisingAssistant).toHaveBeenCalledWith(
      student,
      "What is the student's standing?",
      [],
    );
  });
  it("shows the saved conversation in Supabase mode", async () => {
    vi.mocked(getAdvisingAssistantHistory).mockResolvedValue([
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
    ]);
    render(<AdvisingAssistant studentId={student} isMockMode={false} />);
    expect(getAdvisingAssistantHistory).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Open advising assistant" }),
    );
    expect(await screen.findByText("Earlier answer")).toBeTruthy();
    expect(screen.getByText("Earlier question")).toBeTruthy();
    expect(getAdvisingAssistantHistory).toHaveBeenCalledWith(student);
  });
  it("still accepts questions if the saved conversation cannot load", async () => {
    vi.mocked(getAdvisingAssistantHistory).mockRejectedValue(
      new Error("Unavailable"),
    );
    render(<AdvisingAssistant studentId={student} isMockMode={false} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open advising assistant" }),
    );
    expect(
      await screen.findByText("Earlier messages could not be loaded."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message the advising assistant"), {
      target: { value: "Question" },
    });
    expect(
      (screen.getByRole("button", { name: "Send" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
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
