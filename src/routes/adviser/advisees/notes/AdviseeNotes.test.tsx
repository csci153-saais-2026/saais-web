import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ApiSchema } from '@/lib/api'
import Notes from './AdviseeNotes'
import { getNotes, setNoteArchived } from './notes.api'
const auth = vi.hoisted(() => ({ user: { id: 'adviser-one' }, roles: ['adviser'], isMockMode: true }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }))
vi.mock('../../Adviser', () => ({ AdviserPage: ({children}:{children:React.ReactNode}) => <>{children}</> }))
vi.mock('./notes.api', () => ({ getNotes:vi.fn(), setNoteArchived:vi.fn(), addNote:vi.fn() }))
const note = { id:'note-one',student_id:'student-one',authored_by:'adviser-one',author_name:'Adviser',body_text:'A note',is_archived:false,created_at:'2026-01-01T00:00:00Z' } as ApiSchema<'AdvisingNote'>
function page(){return <MemoryRouter initialEntries={['/advisee/student-one/notes']}><Routes><Route path="/advisee/:id/notes" element={<Notes/>}/></Routes></MemoryRouter>}
afterEach(()=>{cleanup();vi.resetAllMocks();auth.user={id:'adviser-one'}})
describe('selected student notes',()=>{
  it('archives the selected note for the selected student',async()=>{
    vi.mocked(getNotes).mockResolvedValue({notes:[note],isCurrent:true}); vi.mocked(setNoteArchived).mockResolvedValue({...note,is_archived:true})
    render(page()); fireEvent.click(await screen.findByRole('button',{name:'Archive'}))
    await waitFor(()=>expect(setNoteArchived).toHaveBeenCalledWith('student-one','note-one',true))
  })
  it('keeps historical notes readable but hides mutations',async()=>{
    vi.mocked(getNotes).mockResolvedValue({notes:[note],isCurrent:false})
    render(page()); expect(await screen.findByText('A note')).toBeTruthy(); expect(screen.queryByRole('button',{name:'Archive'})).toBeNull()
  })
  it('shows the note dialog while keeping mock saves disabled',async()=>{
    vi.mocked(getNotes).mockResolvedValue({notes:[note],isCurrent:true})
    render(page());fireEvent.click(await screen.findByRole('button',{name:'Write a note'}))
    fireEvent.change(screen.getByLabelText('Advising note'),{target:{value:'Draft'}})
    expect((screen.getByRole('button',{name:'Save note'}) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('clears notes when the account changes',async()=>{
    vi.mocked(getNotes).mockResolvedValueOnce({notes:[note],isCurrent:true}).mockImplementation(()=>new Promise(()=>{}))
    const view=render(page()); expect(await screen.findByText('A note')).toBeTruthy(); auth.user={id:'adviser-two'};view.rerender(page());expect(screen.queryByText('A note')).toBeNull()
  })
})
