import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import CurriculumTransfersPage from "./CurriculumTransfersPage"
import CurriculaPage from "./CurriculaPage"
import EquivalencePage from "./EquivalencePage"
import OutsideCreditsPage from "./OutsideCreditsPage"
import AcademicTermsPage from "./AcademicTermsPage"
import { PartnerPlaceholderPage } from "./PartnerPlaceholderPage"
import { DepartmentHeadLayout } from "./DepartmentHeadLayout"

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
  describe("DepartmentHeadLayout & Navigation Shell", () => {
    it("renders dual-role navigation headers and user identity", () => {
      render(
        <MemoryRouter initialEntries={["/department-head/curriculum-transfers"]}>
          <Routes>
            <Route path="/department-head" element={<DepartmentHeadLayout />}>
              <Route path="curriculum-transfers" element={<div>Transfers Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText("Dr. Andrea Dela Cruz")).toBeDefined()
      expect(screen.getByText("Department Head · DCST")).toBeDefined()
      expect(screen.getByText("Adviser")).toBeDefined()
      expect(screen.getByText("Department Head")).toBeDefined()
      expect(screen.getAllByText("Curriculum transfers").length).toBeGreaterThan(0)
    })
  })

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

    it("opens review dialog for a transfer request", () => {
      render(
        <MemoryRouter>
          <CurriculumTransfersPage />
        </MemoryRouter>
      )

      const reviewButtons = screen.getAllByRole("button", { name: /Review request →/i })
      fireEvent.click(reviewButtons[0])

      expect(screen.getByRole("heading", { name: "Review curriculum transfer" })).toBeDefined()
      expect(screen.getAllByText("Current curriculum").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Requested curriculum").length).toBeGreaterThan(0)
      expect(screen.getByRole("button", { name: /Approve request/i })).toBeDefined()
      expect(screen.getByRole("button", { name: /Reject request/i })).toBeDefined()
    })
  })

  describe("Screen 2: Curricula & Opened Subjects", () => {
    it("renders curriculum version cards and opened subjects", () => {
      render(
        <MemoryRouter>
          <CurriculaPage />
        </MemoryRouter>
      )

      expect(screen.getAllByText("BSCS 2024").length).toBeGreaterThan(0)
      expect(screen.getAllByText("BSCS 2021").length).toBeGreaterThan(0)
      expect(screen.getAllByText("BSIT 2024").length).toBeGreaterThan(0)
      expect(screen.getByText("Opened subjects")).toBeDefined()
      expect(screen.getByText("CC 101")).toBeDefined()
      expect(screen.getByText("Introduction to Computing")).toBeDefined()
    })

    it("opens New version dialog", () => {
      render(
        <MemoryRouter>
          <CurriculaPage />
        </MemoryRouter>
      )

      const addBtn = screen.getByRole("button", { name: /New version/i })
      fireEvent.click(addBtn)

      expect(screen.getByRole("heading", { name: "New version of curriculum" })).toBeDefined()
      expect(screen.getByLabelText(/Version name/i)).toBeDefined()
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

      const addBtn = screen.getByRole("button", { name: /Add course equivalence/i })
      fireEvent.click(addBtn)

      expect(screen.getByRole("heading", { name: "Add course equivalence" })).toBeDefined()
      expect(screen.getByLabelText(/Old course subject/i)).toBeDefined()
      expect(screen.getByLabelText(/Equivalent course subject/i)).toBeDefined()
    })
  })

  describe("Screen 4: Outside Credits", () => {
    it("renders outside credit metrics and student entries", () => {
      render(
        <MemoryRouter>
          <OutsideCreditsPage />
        </MemoryRouter>
      )

      expect(screen.getByText("Credited subjects")).toBeDefined()
      expect(screen.getByText("Students with outside credits")).toBeDefined()
      expect(screen.getByText("Ana Marie Santos")).toBeDefined()
      expect(screen.getByText("Northern State College")).toBeDefined()
      expect(screen.getByText("Sofia Isabel Garcia")).toBeDefined()
    })

    it("opens Credit a course modal", () => {
      render(
        <MemoryRouter>
          <OutsideCreditsPage />
        </MemoryRouter>
      )

      const creditBtn = screen.getByRole("button", { name: /Credit a course/i })
      fireEvent.click(creditBtn)

      expect(screen.getByRole("heading", { name: "Credit an outside course" })).toBeDefined()
      expect(screen.getByLabelText(/Original course code/i)).toBeDefined()
    })
  })

  describe("Screen 5: Academic Terms", () => {
    it("renders active term metrics and terms schedule", () => {
      render(
        <MemoryRouter>
          <AcademicTermsPage />
        </MemoryRouter>
      )

      expect(screen.getByText("Active term")).toBeDefined()
      expect(screen.getByText("Grade encoding")).toBeDefined()
      expect(screen.getAllByText("2025–2026").length).toBeGreaterThan(0)
      expect(screen.getByRole("button", { name: /Close encoding/i })).toBeDefined()
    })

    it("opens Close grade encoding confirmation dialog", () => {
      render(
        <MemoryRouter>
          <AcademicTermsPage />
        </MemoryRouter>
      )

      const closeBtn = screen.getByRole("button", { name: /Close encoding/i })
      fireEvent.click(closeBtn)

      expect(screen.getByRole("heading", { name: "Close grade encoding" })).toBeDefined()
      expect(screen.getByText(/New grade entries will be closed for this term/i)).toBeDefined()
    })
  })

  describe("Partner Placeholder Page", () => {
    it("renders isolation notice and citation of work split", () => {
      render(
        <PartnerPlaceholderPage
          title="Students Directory"
          subtitle="Department student directory."
          screenNumber={6}
        />
      )

      expect(screen.getByText("Students Directory")).toBeDefined()
      expect(screen.getByText(/Assigned to Partner \(Developer 2 — Matt\)/i)).toBeDefined()
      expect(screen.getByText("DEPARTMENT_HEAD_WORK_SPLIT.md")).toBeDefined()
    })
  })
})
