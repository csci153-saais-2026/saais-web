import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { StatusBadge, statusLabels, type Status } from "./status-badge"

afterEach(cleanup)

const statuses = Object.keys(statusLabels) as Status[]
const flagStatuses: Status[] = ["delinquent", "flagged"]

function renderBadge(status: Status, children?: string) {
  const { container } = render(<StatusBadge status={status}>{children}</StatusBadge>)
  const badge = container.querySelector<HTMLElement>('[data-slot="status-badge"]')!
  const marks = badge.querySelectorAll('[data-slot="status-mark"]')
  return { badge, marks }
}

// Status must never be conveyed by color alone: every badge needs a text label and a mark.
describe("StatusBadge", () => {
  it.each(statuses)("%s shows its label and exactly one leading mark", (status) => {
    const { badge, marks } = renderBadge(status)
    expect(badge.dataset.status).toBe(status)
    expect(badge.textContent).toBe(statusLabels[status])
    expect(marks).toHaveLength(1)
    expect(badge.firstElementChild).toBe(marks[0])
  })

  it.each(flagStatuses)("%s uses the flag icon", (status) => {
    const { marks } = renderBadge(status)
    expect(marks[0].getAttribute("data-mark")).toBe("flag")
    expect(marks[0].tagName.toLowerCase()).toBe("svg")
  })

  it.each(statuses.filter((s) => !flagStatuses.includes(s)))("%s uses the dot", (status) => {
    const { badge, marks } = renderBadge(status)
    expect(marks[0].getAttribute("data-mark")).toBe("dot")
    expect(badge.querySelector("svg")).toBeNull()
  })

  it("keeps the mark when children replace the label", () => {
    const { badge, marks } = renderBadge("delinquent", "Delinquent (2 terms)")
    expect(badge.textContent).toBe("Delinquent (2 terms)")
    expect(marks[0].getAttribute("data-mark")).toBe("flag")
  })

  it("falls back to Not taken without a status", () => {
    const { container } = render(<StatusBadge />)
    const badge = container.querySelector<HTMLElement>('[data-slot="status-badge"]')!
    expect(badge.dataset.status).toBe("not-taken")
    expect(badge.textContent).toBe("Not taken")
  })
})
