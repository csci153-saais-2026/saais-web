import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AdviserPage } from './Adviser'
afterEach(cleanup)
it('does not show sample data for a non-UUID student route', () => {
  render(<MemoryRouter initialEntries={['/adviser/advisee/2023-04412/checklist']}><Routes><Route path="/adviser/advisee/:id/checklist" element={<AdviserPage title="Checklist" tab="checklist"><p>Old fixed record</p></AdviserPage>} /></Routes></MemoryRouter>)
  expect(screen.getByRole('alert').textContent).toContain('invalid')
  expect(screen.queryByText('Old fixed record')).toBeNull()
  expect(screen.queryByText('Maria Isabel Bautista')).toBeNull()
})
