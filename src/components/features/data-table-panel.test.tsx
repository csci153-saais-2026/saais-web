import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { DataTablePanel } from "./data-table-panel"

afterEach(cleanup)

describe("DataTablePanel headers", () => {
  it("renders interactive header content while retaining responsive labels and slots", () => {
    const select = vi.fn()
    render(<DataTablePanel title="Records" rows={[{ id: "one" }]} rowKey={row => row.id}
      columns={[{ header: "Selection", headerContent: <input type="checkbox" aria-label="Select all records" onChange={select} />, cell: () => "Selected record" }]}
      action={<button>Add record</button>} toolbar={<label>Filter<input aria-label="Filter" /></label>} footer="1 record" />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all records" }))
    expect(select).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("cell", { name: "Selected record" }).getAttribute("data-label")).toBe("Selection")
    expect(screen.getByRole("button", { name: "Add record" })).toBeTruthy()
    expect(screen.getByRole("textbox", { name: "Filter" })).toBeTruthy()
    expect(screen.getByText("1 record")).toBeTruthy()
  })

  it("preserves ordinary text headers and an explicit empty state", () => {
    render(<DataTablePanel title="Records" rows={[]} rowKey={(row: { id: string }) => row.id}
      columns={[{ header: "Name", cell: row => row.id }]} empty="No records yet." />)
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeTruthy()
    expect(screen.getByText("No records yet.")).toBeTruthy()
  })
})
