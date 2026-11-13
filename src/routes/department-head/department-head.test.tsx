import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import CurriculumTransfersPage from "./CurriculumTransfersPage"
import CurriculaPage from "./CurriculaPage"
import EquivalencePage from "./EquivalencePage"
import OutsideCreditsPage from "./OutsideCreditsPage"
import AcademicTermsPage from "./AcademicTermsPage"

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(cleanup)

describe("Department Head Frontend Suite", () => {
  describe("Screen 1: Curriculum Transfers", () => {
    it("renders stat metrics and pending requests", () => {
      render(
        <MemoryRouter>
          <CurriculumTransfersPage />
        </MemoryRouter>
      )

      expect(screen.getByText("Pending review")).toBeDefined()
      expect(screen.getByText("Approved this semester")).toBeDefined()
      expect(screen.getByText("Transfer requests")).toBeDefined()
      expect(screen.getByText("Luis Miguel Cruz")).toBeDefined()
      expect(screen.getByText("23-1-00218")).toBeDefined()
    })

    it("supports ?history=1 tab selection and review dialog validation", () => {
      render(
        <MemoryRouter initialEntries={["/department-head/curriculum-transfers?history=1"]}>
          <CurriculumTransfersPage />
        </MemoryRouter>
      )

      expect(screen.getByText("Transfer decision history")).toBeDefined()
      expect(screen.getByText("Maria Lopez")).toBeDefined()

      const pendingTab = screen.getByRole("tab", { name: /Pending review/i })
      fireEvent.mouseDown(pendingTab, { button: 0 })
      fireEvent.click(pendingTab)
      const reviewButtons = screen.getAllByRole("button", { name: /Review request →/i })
      fireEvent.click(reviewButtons[0])

      expect(screen.getByRole("heading", { name: "Review curriculum transfer" })).toBeDefined()
      fireEvent.click(screen.getByRole("button", { name: /Reject request/i }))
      expect(screen.getByText(/Add a decision reason to reject/i)).toBeDefined()
    })
  })

  describe("Screen 2: Curricula Builder", () => {
    it("renders version selector, 4-stat summary, and positional term panels", () => {
      render(
        <MemoryRouter>
          <CurriculaPage />
        </MemoryRouter>
      )

      expect(screen.getByRole("heading", { name: "Shape the path to graduation." })).toBeDefined()
      expect(screen.getAllByText("Required units")).toHaveLength(3)
      expect(screen.getByText("Enrolled students")).toBeDefined()
      expect(screen.getByText("Effective from")).toBeDefined()
      expect(screen.getByText("1 Jun 2023")).toBeDefined()
      expect(screen.getByText("Status")).toBeDefined()
      expect(screen.getByText("Year 1 · Semester 1")).toBeDefined()
      expect(screen.getByText("Year 1 · Semester 2")).toBeDefined()
      expect(screen.getByText("CSIT 100 — Introduction to Computing")).toBeDefined()
      expect(screen.getByText("GE elective")).toBeDefined()
    })

    it("opens Add version and New course dialogs", () => {
      render(
        <MemoryRouter>
          <CurriculaPage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByRole("button", { name: /Add version/i }))
      expect(screen.getByRole("heading", { name: "Add version" })).toBeDefined()
      expect(screen.getByLabelText(/Academic year/i)).toBeDefined()

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
      fireEvent.click(screen.getByRole("button", { name: /New course/i }))
      expect(screen.getByRole("heading", { name: "New course" })).toBeDefined()
      expect(screen.getByLabelText(/Course code/i)).toBeDefined()
    })
  })

  describe("Screen 3: Course Equivalence", () => {
    it("renders policy alert and course equivalencies table", () => {
      render(
        <MemoryRouter>
          <EquivalencePage />
        </MemoryRouter>
      )

      expect(screen.getByText(/Equivalencies apply to a curriculum pair/i)).toBeDefined()
      expect(screen.getAllByText("CS 101").length).toBeGreaterThan(0)
      expect(screen.getAllByText("CC 101").length).toBeGreaterThan(0)
      expect(screen.getAllByText("BSCS 2021 → 2024").length).toBeGreaterThan(0)
    })

    it("opens Add course equivalence modal", () => {
      render(
        <MemoryRouter>
          <EquivalencePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByRole("button", { name: /Add course equivalence/i }))
      expect(screen.getByRole("heading", { name: "Add course equivalence" })).toBeDefined()
      expect(screen.getByLabelText(/Old course subject/i)).toBeDefined()
      expect(screen.getByLabelText(/Equivalent course subject/i)).toBeDefined()
    })
  })

  describe("Screen 4: Outside Credits", () => {
    it("renders outside credit metrics, student entries, and sample footer count", () => {
      render(
        <MemoryRouter>
          <OutsideCreditsPage />
        </MemoryRouter>
      )

      expect(screen.getByText("Credited subjects")).toBeDefined()
      expect(screen.getByText("Students with outside credits")).toBeDefined()
      expect(screen.getByText("Ana Marie Santos")).toBeDefined()
      expect(screen.getByText("Northern State College")).toBeDefined()
      expect(screen.getByText("Showing 4 sample records of 28 credited subjects")).toBeDefined()
    })

    it("opens Credit a course modal", () => {
      render(
        <MemoryRouter>
          <OutsideCreditsPage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByRole("button", { name: /Credit a course/i }))
      expect(screen.getByRole("heading", { name: "Credit an outside course" })).toBeDefined()
      expect(screen.getByLabelText(/Original course code/i)).toBeDefined()
    })
  })

  describe("Screen 5: Academic Terms", () => {
    it("renders advisory banner, terms schedule, and term counts without extra stat cards", () => {
      render(
        <MemoryRouter>
          <AcademicTermsPage />
        </MemoryRouter>
      )

      expect(screen.getByText(/Closing encoding prevents further grade entry/i)).toBeDefined()
      expect(screen.queryByText("Active term")).toBeNull()
      expect(screen.getAllByText("2025–2026").length).toBeGreaterThan(0)
      expect(screen.getByText("04 Aug – 19 Dec 2025")).toBeDefined()
      expect(screen.getByText("1 open term · 3 closed terms")).toBeDefined()
      expect(screen.getByRole("button", { name: /Close encoding/i })).toBeDefined()
    })

    it("opens Close grade encoding confirmation dialog", () => {
      render(
        <MemoryRouter>
          <AcademicTermsPage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByRole("button", { name: /Close encoding/i }))
      expect(screen.getByRole("heading", { name: "Close grade encoding" })).toBeDefined()
      expect(screen.getByText(/New grade entries will be closed for this term/i)).toBeDefined()
    })
  })
})
