import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { Table, TableBody, TableCell, TableRow } from "./table"

afterEach(cleanup)

function renderTable(responsive: boolean) {
  const { container } = render(
    <Table responsive={responsive}>
      <TableBody>
        <TableRow>
          <TableCell label="Course">IT 101</TableCell>
          <TableCell label="Status">Passed</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
  return {
    table: container.querySelector("table")!,
    cells: Array.from(container.querySelectorAll("td")),
  }
}

// Below 768px a responsive table stacks into cards; data-label supplies each cell's caption.
describe("Table / TableCell", () => {
  it("renders each label as data-label when responsive", () => {
    const { table, cells } = renderTable(true)
    expect(table.classList.contains("stack-table")).toBe(true)
    expect(cells[0].getAttribute("data-label")).toBe("Course")
    expect(cells[1].getAttribute("data-label")).toBe("Status")
  })

  it("omits data-label on a cell without a label", () => {
    const { cells } = renderTable(true)
    expect(cells[2].hasAttribute("data-label")).toBe(false)
  })

  it("does not stack when responsive is off", () => {
    const { table } = renderTable(false)
    expect(table.classList.contains("stack-table")).toBe(false)
  })
})
