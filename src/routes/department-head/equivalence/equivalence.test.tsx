import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import EquivalencePage from "./EquivalencePage"

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

async function chooseOption(trigger: HTMLElement, name: string | RegExp) {
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name }))
}

function openAddDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Add course equivalence" }))
  return within(screen.getByRole("dialog", { name: "Add course equivalence" }))
}

describe("Curriculum-pair equivalence", () => {
  it("filters same-year destinations by program and permits a separate mapping in each pair", async () => {
    render(<EquivalencePage />)
    expect(screen.getByText("4 course equivalencies")).toBeTruthy()

    await chooseOption(screen.getByRole("combobox", { name: "To curriculum" }), "BSIT 2024")
    expect(screen.getByText("0 course equivalencies")).toBeTruthy()
    expect(screen.queryByText("CS 101")).toBeNull()

    const dialog = openAddDialog()
    fireEvent.click(dialog.getByRole("button", { name: "Add equivalence" }))
    expect(await screen.findByText("BSCS 2021 → BSIT 2024")).toBeTruthy()
    expect(screen.getByText("1 course equivalencies")).toBeTruthy()

    await chooseOption(screen.getByRole("combobox", { name: "To curriculum" }), "BSCS 2024")
    expect(screen.getByText("4 course equivalencies")).toBeTruthy()
    expect(screen.queryByText("BSCS 2021 → BSIT 2024")).toBeNull()
  })

  it.each([
    ["duplicate", "", ""],
    ["source conflict", "", "CC 102"],
    ["destination conflict", "CS 102", ""],
  ])("rejects a %s without changing the pair", async (_scenario, source, destination) => {
    render(<EquivalencePage />)
    await chooseOption(screen.getByRole("combobox", { name: "To curriculum" }), "BSIT 2024")
    fireEvent.click(openAddDialog().getByRole("button", { name: "Add equivalence" }))
    expect(await screen.findByText("1 course equivalencies")).toBeTruthy()

    const dialog = openAddDialog()
    if (source) {
      await chooseOption(dialog.getByRole("combobox", { name: "Old course subject" }), new RegExp(source))
    }
    if (destination) {
      await chooseOption(dialog.getByRole("combobox", { name: "Equivalent course subject" }), new RegExp(destination))
    }
    fireEvent.click(dialog.getByRole("button", { name: "Add equivalence" }))
    expect(dialog.getByRole("alert").textContent).toContain("already mapped in this curriculum pair")

    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }))
    expect(screen.getByText("1 course equivalencies")).toBeTruthy()
  })
})
