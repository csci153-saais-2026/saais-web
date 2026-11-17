import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StudentDirectoryFilters } from "@/routes/dean/components/StudentDirectoryFilters"

describe("StudentDirectoryFilters", () => {
  afterEach(() => {
    cleanup()
  })

  it("disables Reset filters when no filters are active and calls onReset when filters are set", () => {
    const onReset = vi.fn()
    const onQueryChange = vi.fn()

    const { rerender } = render(
      <StudentDirectoryFilters
        query=""
        onQueryChange={onQueryChange}
        curriculum="all"
        onCurriculumChange={vi.fn()}
        curriculumOptions={["BSCS 2025–present"]}
        adviser="all"
        onAdviserChange={vi.fn()}
        adviserOptions={["Prof. Mara Reyes"]}
        onReset={onReset}
      />,
    )

    const resetButton = screen.getByRole("button", { name: "Reset filters" }) as HTMLButtonElement
    expect(resetButton.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText("Search by student name or ID"), {
      target: { value: "Ana" },
    })
    expect(onQueryChange).toHaveBeenCalledWith("Ana")

    rerender(
      <StudentDirectoryFilters
        query="Ana"
        onQueryChange={onQueryChange}
        curriculum="all"
        onCurriculumChange={vi.fn()}
        curriculumOptions={["BSCS 2025–present"]}
        adviser="all"
        onAdviserChange={vi.fn()}
        adviserOptions={["Prof. Mara Reyes"]}
        onReset={onReset}
      />,
    )

    expect(resetButton.disabled).toBe(false)
    fireEvent.click(resetButton)
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
