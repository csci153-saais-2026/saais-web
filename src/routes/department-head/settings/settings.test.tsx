import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import SettingsPage from "./SettingsPage"
import { PreviewStateProvider } from "../shared/PreviewStateProvider"
import { useDepartmentHeadPreview } from "../shared/preview-state"

afterEach(cleanup)

function SavedState() {
  const { settings } = useDepartmentHeadPreview()
  return <output data-testid="saved-settings">{JSON.stringify(settings)}</output>
}

function renderPage() {
  render(<PreviewStateProvider><SettingsPage /><SavedState /></PreviewStateProvider>)
  return () => JSON.parse(screen.getByTestId("saved-settings").textContent ?? "{}")
}

describe("Department Settings", () => {
  it("rejects unordered thresholds and only saves a valid change", async () => {
    const saved = renderPage()
    fireEvent.change(screen.getByLabelText("Probation from (%)"), { target: { value: "20" } })
    fireEvent.click(screen.getByRole("button", { name: "Save standing rules" }))
    expect(await screen.findByText("Probation must be higher than warning.")).toBeTruthy()
    expect(saved().thresholds).toEqual({ warning: 25, probation: 50, dismissal: 75 })
    fireEvent.change(screen.getByLabelText("Probation from (%)"), { target: { value: "50" } })
    fireEvent.change(screen.getByLabelText("Warning from (%)"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("button", { name: "Save standing rules" }))
    await waitFor(() => expect(saved().thresholds).toEqual({ warning: 10, probation: 50, dismissal: 75 }))
    expect(screen.getByText("Standing rules saved in this preview.")).toBeTruthy()
  })

  it("rejects non-integer and blank percentage values", async () => {
    const saved = renderPage()
    fireEvent.change(screen.getByLabelText("Warning from (%)"), { target: { value: "1.5" } })
    fireEvent.change(screen.getByLabelText("Probation from (%)"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Save standing rules" }))
    expect((await screen.findAllByText("Enter a whole percentage from 0 to 100.")).length).toBe(2)
    expect(saved().thresholds.warning).toBe(25)
  })

  it("validates the sender and saves proposed event choices in local state", async () => {
    const saved = renderPage()
    fireEvent.change(screen.getByLabelText("Sender address"), { target: { value: "test@example.com" } })
    fireEvent.click(screen.getByRole("checkbox", { name: "Grade-encoding closure" }))
    fireEvent.click(screen.getByRole("button", { name: "Save email settings" }))
    expect(await screen.findByText("Use a VSU sender address ending in @vsu.edu.ph.")).toBeTruthy()
    expect(saved().senderEmail).toBe("dcst@vsu.edu.ph")
    fireEvent.change(screen.getByLabelText("Sender address"), { target: { value: "DCST-Notifications@vsu.edu.ph" } })
    fireEvent.click(screen.getByRole("button", { name: "Save email settings" }))
    await waitFor(() => expect(saved().senderEmail).toBe("DCST-Notifications@vsu.edu.ph"))
    expect(saved().notificationTriggers.gradeEncodingClosure).toBe(true)
    expect(screen.getByText("Email settings saved in this preview. No email was sent.")).toBeTruthy()
  })

  it("cancels backup edits without saving and resets the next dialog", async () => {
    const saved = renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Record a completed backup" }))
    fireEvent.change(screen.getByLabelText("Backup reference"), { target: { value: "UNSAVED" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(saved().latestBackup.reference).toBe("DEMO-DCST-20250806")
    fireEvent.click(screen.getByRole("button", { name: "Record a completed backup" }))
    expect((screen.getByLabelText("Backup reference") as HTMLInputElement).value).toBe("")
  })

  it("rejects a future completion, then records completed metadata and clears the overdue warning", async () => {
    const saved = renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Record a completed backup" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Completion date and time (Philippine time)"), { target: { value: "2999-01-01T12:00" } })
    fireEvent.change(within(dialog).getByLabelText("Backup reference"), { target: { value: "DEMO-NEW-BACKUP" } })
    fireEvent.change(within(dialog).getByLabelText("Storage location"), { target: { value: "Institutional storage / DCST / Demonstration" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Save backup record" }))
    expect(await screen.findByText("Completion cannot be in the future.")).toBeTruthy()
    expect(saved().latestBackup.reference).toBe("DEMO-DCST-20250806")
    fireEvent.change(within(dialog).getByLabelText("Completion date and time (Philippine time)"), { target: { value: "2025-08-15T11:00" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Save backup record" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(saved().latestBackup).toEqual({
      completedAt: "2025-08-15T03:00:00.000Z", reference: "DEMO-NEW-BACKUP",
      location: "Institutional storage / DCST / Demonstration", scope: "department_records",
    })
    expect(screen.queryByText("A newer backup record is needed.")).toBeNull()
    expect(screen.getByText("DEMO-NEW-BACKUP", { exact: true })).toBeTruthy()
    expect(screen.getByText("Completed backup record saved in this preview. No backup was created.")).toBeTruthy()
  })
})
