import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import OutsideCreditsPage from "./OutsideCreditsPage"

const INITIAL_COUNT = "Showing 4 sample records of 28 credited subjects"

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

function openDialog() {
  render(<OutsideCreditsPage />)
  fireEvent.click(screen.getByRole("button", { name: "Credit a course" }))
  return within(screen.getByRole("dialog", { name: "Credit an outside course" }))
}

async function select(dialog: ReturnType<typeof within>, label: string, option: RegExp) {
  fireEvent.keyDown(dialog.getByRole("combobox", { name: label }), { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: option }))
}

async function fillCredit(dialog: ReturnType<typeof within>, {
  grade = "1.00",
  code = "CS 205",
  origin = "Western State College",
  slot = /^CC 104/,
  units = "3.25",
} = {}) {
  await select(dialog, "Student", /Ana Marie Santos/)
  await select(dialog, "Destination curriculum slot", slot)
  for (const [label, value] of [
    ["Original course code", code],
    ["Original course name", "Algorithms"],
    ["Units", units],
    ["Grade", grade],
    ["School / degree of origin", origin],
    ["Reason", "Equivalent course outcomes"],
  ]) {
    fireEvent.change(dialog.getByLabelText(label), { target: { value } })
  }
}

function submit(dialog: ReturnType<typeof within>) {
  fireEvent.click(dialog.getByRole("button", { name: "Credit course" }))
}

describe("Outside Credits form", () => {
  it("shows errors for missing details, including the destination and reason", async () => {
    const dialog = openDialog()
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "  " } })
    submit(dialog)

    expect((await dialog.findAllByRole("alert")).map((error) => error.textContent)).toEqual([
      "Choose a student.",
      "Enter the original course code.",
      "Enter the original course name.",
      "Enter positive units in increments of 0.25.",
      "Enter a passing grade from 1.00 to 3.00 with two decimal places.",
      "Enter the school or degree of origin.",
      "Choose a destination curriculum slot.",
      "Enter the reason for crediting the course.",
    ])
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
  })

  it.each(["5.00", "3.01", "1.5"])("rejects grade %s without adding a record", async (grade) => {
    const dialog = openDialog()
    await fillCredit(dialog, { grade })
    submit(dialog)

    expect(await dialog.findByRole("alert")).toHaveProperty("textContent", "Enter a passing grade from 1.00 to 3.00 with two decimal places.")
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
    expect(screen.queryByText("CS 205 · Algorithms")).toBeNull()
  })

  it.each(["0", "-0.25", "1.1"])("rejects invalid units %s", async (units) => {
    const dialog = openDialog()
    await fillCredit(dialog, { units })
    submit(dialog)

    expect(await dialog.findByRole("alert")).toHaveProperty("textContent", "Enter positive units in increments of 0.25.")
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
  })

  it("rejects duplicate normalized source courses and occupied sample slots", async () => {
    const dialog = openDialog()
    await fillCredit(dialog, { code: " cs   101 ", origin: " northern   state college " })
    submit(dialog)
    expect(await dialog.findByText("This student already has credit for this course from this origin.")).toBeTruthy()

    fireEvent.change(dialog.getByLabelText("Original course code"), { target: { value: "CS 205" } })
    await select(dialog, "Destination curriculum slot", /^CC 101/)
    submit(dialog)
    expect(await dialog.findByText("This slot already has an outside credit.")).toBeTruthy()
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
  })

  it.each(["1.00", "3.00"])("adds a valid sample credit at boundary grade %s", async (grade) => {
    const dialog = openDialog()
    await fillCredit(dialog, { grade })
    submit(dialog)

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const row = screen.getByRole("row", { name: /CS 205 · Algorithms/ })
    expect(within(row).getByText(grade)).toBeTruthy()
    expect(within(row).getByText("3.25 units")).toBeTruthy()
    expect(within(row).getByText("Reason: Equivalent course outcomes")).toBeTruthy()
    expect(within(row).getByText("CC 104 · Data Structures and Algorithms")).toBeTruthy()
    expect(screen.getByText("Showing 5 sample records of 29 credited subjects")).toBeTruthy()
  })
})
