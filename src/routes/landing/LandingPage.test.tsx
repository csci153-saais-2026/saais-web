import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import LandingPage from '@/routes/landing/LandingPage'

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

function activateTab(name: string) {
  const tab = screen.getByRole('tab', { name })
  fireEvent.mouseDown(tab, { button: 0 })
  fireEvent.click(tab)
}

describe('LandingPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the hero headline, checklist preview rows, and links to /login and /docs/openapi', () => {
    renderLandingPage()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Advising that leaves a record.',
      }),
    ).toBeTruthy()

    expect(screen.getByText('CS 101')).toBeTruthy()
    expect(screen.getByText('Introduction to Computing')).toBeTruthy()
    expect(
      screen.getAllByText('Data Structures — retake').length,
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Algorithms')).toBeTruthy()
    expect(screen.getByText('Open elective slot')).toBeTruthy()

    const signInLinks = screen.getAllByRole('link', { name: 'Sign in' })
    expect(signInLinks.some((el) => el.getAttribute('href') === '/login')).toBe(
      true,
    )

    const apiContractLink = screen.getByRole('link', {
      name: /Read the API contract/i,
    })
    expect(apiContractLink.getAttribute('href')).toBe('/docs/openapi')
  })

  it('switches feature tabs (Checklist, Rules engine, Audit trail) and updates the visible panel', () => {
    renderLandingPage()

    expect(
      screen.getByRole('heading', { name: 'The checklist resolves itself.' }),
    ).toBeTruthy()

    activateTab('Rules engine')
    expect(
      screen.getByRole('heading', {
        name: 'Academic rules enforced in the database.',
      }),
    ).toBeTruthy()

    activateTab('Audit trail')
    expect(
      screen.getByRole('heading', {
        name: 'Every override and grade change leaves an immutable entry.',
      }),
    ).toBeTruthy()

    activateTab('Checklist')
    expect(
      screen.getByRole('heading', { name: 'The checklist resolves itself.' }),
    ).toBeTruthy()
  })

  it('clicks workflow steps (Provision through Audit) and updates the step indicator and written fields', () => {
    renderLandingPage()

    expect(screen.getByText('Step 3 of 5')).toBeTruthy()
    expect(screen.getByText('prerequisite_override')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Provision' }))
    expect(screen.getByText('Step 1 of 5')).toBeTruthy()
    expect(screen.getByText('role_assignment')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Advise' }))
    expect(screen.getByText('Step 2 of 5')).toBeTruthy()
    expect(screen.getByText('advising_note')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    expect(screen.getByText('Step 4 of 5')).toBeTruthy()
    expect(screen.getByText('course_equivalency')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
    expect(screen.getByText('Step 5 of 5')).toBeTruthy()
    expect(screen.getByText('audit_log')).toBeTruthy()
  })

  it('opens WalkthroughDialog when Request a walkthrough is clicked and closes it on Escape', () => {
    renderLandingPage()

    expect(screen.queryByRole('dialog')).toBeNull()

    const triggers = screen.getAllByRole('button', {
      name: 'Request a walkthrough',
    })
    fireEvent.click(triggers[0])

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Request a walkthrough' }),
    ).toBeTruthy()

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
