import { describe, expect, it } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import EquivalencePage from "./EquivalencePage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()

async function chooseOption(trigger: HTMLElement, name: string | RegExp) {
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name }))
}

async function openAddDialog() {
  renderDepartmentHead(<EquivalencePage />)
  await screen.findByText("1 course equivalencies")
  fireEvent.click(screen.getByRole("button", { name: "Add course equivalence" }))
  return within(screen.getByRole("dialog", { name: "Add course equivalence" }))
}

describe("Curriculum-pair equivalence", () => {
  it("adds a one-to-one mapping to the selected pair through the API", async () => {
    const dialog = await openAddDialog()
    await chooseOption(dialog.getByRole("combobox", { name: "Old course subject" }), /CSCI 102/)
    await chooseOption(dialog.getByRole("combobox", { name: "Equivalent course subject" }), /CSCI 153/)
    fireEvent.click(dialog.getByRole("button", { name: "Add equivalence" }))
    expect(await screen.findByText("Added equivalence for CSCI 102 → CSCI 153.")).toBeTruthy()
    await waitFor(() => expect(screen.getByText("2 course equivalencies")).toBeTruthy())
  })

  it.each([
    ["source conflict", /CSCI 101/, /CSCI 153/],
    ["destination conflict", /CSCI 102/, /CSCI 101/],
  ])("rejects a %s without changing the pair", async (_scenario, source, destination) => {
    const dialog = await openAddDialog()
    await chooseOption(dialog.getByRole("combobox", { name: "Old course subject" }), source)
    await chooseOption(dialog.getByRole("combobox", { name: "Equivalent course subject" }), destination)
    fireEvent.click(dialog.getByRole("button", { name: "Add equivalence" }))
    expect(dialog.getByRole("alert").textContent).toContain("already mapped in this curriculum pair")
    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByText("1 course equivalencies")).toBeTruthy()
  })

  it("shows an empty state for a pair without mappings", async () => {
    renderDepartmentHead(<EquivalencePage />)
    await screen.findByText("1 course equivalencies")
    await chooseOption(screen.getByRole("combobox", { name: "To curriculum" }), "BSCS 2027-2028 v1")
    expect(screen.getByText("0 course equivalencies")).toBeTruthy()
    expect(screen.getByText("No equivalencies recorded for this pair.")).toBeTruthy()
  })
})
