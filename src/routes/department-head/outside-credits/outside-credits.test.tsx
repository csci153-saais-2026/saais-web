import { describe, expect, it } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { delay, http, HttpResponse } from "msw"
import { saaisMockServer } from "@/mocks/node"
import OutsideCreditsPage from "./OutsideCreditsPage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()

const INITIAL_COUNT = "1 credited subject"

async function openDialog() {
  renderDepartmentHead(<OutsideCreditsPage />)
  await screen.findByText(INITIAL_COUNT)
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
  slot = /^CSCI 153/,
  units = "3",
} = {}) {
  await select(dialog, "Student", /Sta\. Agata/)
  await select(dialog, "Equivalent course", slot)
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
  it("prevents repeated submission and retains entered values after an API rejection", async () => {
    let writes = 0
    saaisMockServer.use(http.post("*/functions/v1/students/:id/outside-credits", async () => {
      writes++
      await delay(250)
      return HttpResponse.json({ code: "CONFLICT", message: "Credit was rejected by the API." }, { status: 409 })
    }))
    const dialog = await openDialog()
    await fillCredit(dialog)
    submit(dialog)
    expect(await dialog.findByRole("button", { name: "Saving…" })).toHaveProperty("disabled", true)
    fireEvent.click(dialog.getByRole("button", { name: "Saving…" }))
    expect(await dialog.findByText("Credit was rejected by the API.")).toBeTruthy()
    expect(dialog.getByLabelText("Original course code")).toHaveProperty("value", "CS 205")
    expect(writes).toBe(1)
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
  })
  it("shows errors for missing details, including the destination and reason", async () => {
    const dialog = await openDialog()
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "  " } })
    submit(dialog)

    expect((await dialog.findAllByRole("alert")).map((error) => error.textContent)).toEqual([
      "Choose a student.",
      "Enter the original course code.",
      "Enter the original course name.",
      "Enter units as a whole number of 1 or more.",
      "Enter a passing grade from 1.00 to 3.00 with two decimal places.",
      "Enter the school or degree of origin.",
      "Choose an equivalent course.",
      "Enter the reason for crediting the course.",
    ])
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
  })

  it.each(["5.00", "3.01", "1.5"])("rejects grade %s without adding a record", async (grade) => {
    const dialog = await openDialog()
    await fillCredit(dialog, { grade })
    submit(dialog)

    expect(await dialog.findByRole("alert")).toHaveProperty("textContent", "Enter a passing grade from 1.00 to 3.00 with two decimal places.")
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
    expect(screen.queryByText("CS 205 · Algorithms")).toBeNull()
  })

  it.each(["0", "-1", "1.5"])("rejects invalid units %s", async (units) => {
    const dialog = await openDialog()
    await fillCredit(dialog, { units })
    submit(dialog)

    expect(await dialog.findByRole("alert")).toHaveProperty("textContent", "Enter units as a whole number of 1 or more.")
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
  })

  it("rejects duplicate normalized source courses and occupied slots", async () => {
    const dialog = await openDialog()
    await fillCredit(dialog, { code: " cmsc   11 ", origin: " university  of the philippines  cebu " })
    submit(dialog)
    expect(await dialog.findByText("This student already has credit for this course from this origin.")).toBeTruthy()

    fireEvent.change(dialog.getByLabelText("Original course code"), { target: { value: "CS 205" } })
    await select(dialog, "Equivalent course", /^CSCI 101/)
    submit(dialog)
    expect(await dialog.findByText("This slot already has an outside credit.")).toBeTruthy()
    expect(screen.getByText(INITIAL_COUNT)).toBeTruthy()
  })

  it.each(["1.00", "3.00"])("adds a valid credit at boundary grade %s", async (grade) => {
    const dialog = await openDialog()
    await fillCredit(dialog, { grade })
    submit(dialog)

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const row = await screen.findByRole("row", { name: /CS 205 · Algorithms/ })
    expect(within(row).getByText(grade)).toBeTruthy()
    expect(within(row).getByText("3 units")).toBeTruthy()
    expect(within(row).getByText(/^CSCI 153 · /)).toBeTruthy()
    expect(await screen.findByText("2 credited subjects")).toBeTruthy()
  })
})
