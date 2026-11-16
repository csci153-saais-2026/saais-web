import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ApiSchema } from '@/lib/api'
import Checklist from './AdviseeChecklist'
import { getChecklist } from './record.api'
const auth=vi.hoisted(()=>({user:{id:'adviser-one'}}))
vi.mock('@/hooks/use-auth',()=>({useAuth:()=>auth}))
vi.mock('../../Adviser',()=>({AdviserPage:({children}:{children:React.ReactNode})=><>{children}</>}))
vi.mock('./record.api',()=>({getChecklist:vi.fn()}))
const row={curriculum_term_course_id:'slot-one',status:'passed',required_units:3,earned_units:3,source_attempt_id:'attempt-one',satisfaction_source:'Direct',attempts:[],grade_fix_history:[{changed_at:'2026-01-01T00:00:00Z',old_grade:5,new_grade:2}]} as ApiSchema<'ChecklistSlotResult'>
const data={results:[row],summary:{student_id:'student-one',gwa:2,earned_units:3,counted_units:9,required_units:100,year_level:2,is_delinquent:false,computed_at:'2026-01-01T00:00:00Z'},slots:[{id:'slot-one',curriculum_term_id:'curriculum-term',course_id:'course-one'}],terms:[{id:'curriculum-term',year_level:1,term_sequence:1}],courses:[{id:'course-one',code:'CS 1',title:'First'}]} as Awaited<ReturnType<typeof getChecklist>>
function page(){return <MemoryRouter initialEntries={['/advisee/student-one/checklist']}><Routes><Route path="/advisee/:id/checklist" element={<Checklist/>}/></Routes></MemoryRouter>}
afterEach(()=>{cleanup();vi.resetAllMocks();auth.user={id:'adviser-one'}})
describe('selected checklist',()=>{
 it('filters and expands or collapses curriculum groups',async()=>{
  vi.mocked(getChecklist).mockResolvedValue(data);render(page());await screen.findByText('Cumulative GWA')
  expect(screen.getByText('Cumulative GWA')).toBeTruthy()
  expect(screen.getByText('Year Standing')).toBeTruthy()
  expect(screen.getByText('2nd year')).toBeTruthy()
  expect(screen.getByText('Counted units')).toBeTruthy()
  expect(screen.getByText('9')).toBeTruthy()
  const term=screen.getByRole('button',{name:/Semester 1/});expect(term.getAttribute('aria-expanded')).toBe('false')
  expect(within(term).getByText('3/3')).toBeTruthy()
  expect(within(term).getByLabelText('Semester GWA unavailable')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Expand All'}));await waitFor(()=>expect(term.getAttribute('aria-expanded')).toBe('true'))
  expect(await screen.findByText('CS 1')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Collapse All'}));await waitFor(()=>expect(term.getAttribute('aria-expanded')).toBe('false'))
  expect(within(term).getByText('3/3')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Show requirements'),{target:{value:'inc'}});expect(screen.getByText('No requirements match this filter.')).toBeTruthy()
 })
 it('shows an unavailable year when the summary has no year level',async()=>{
  vi.mocked(getChecklist).mockResolvedValue({...data,summary:{...data.summary,year_level:undefined}})
  render(page());await screen.findByText('Year Standing')
  expect(screen.queryByText('2nd year')).toBeNull()
 })
 it('shows the selected student’s deficiency subjects from the summary',async()=>{
  vi.mocked(getChecklist).mockResolvedValue({...data,summary:{...data.summary,deficiencies_count:2,deficiencies:[{kind:'open_inc',course_code:'CS 101',course_title:'First'},{kind:'failed',course_code:'CS 102',course_title:'Second'}]}})
  render(page());expect(await screen.findByText('Unresolved INC: CS 101 · Failed: CS 102')).toBeTruthy()
 })
 it('uses checklist statuses when the shared summary omits deficiency details',async()=>{
  vi.mocked(getChecklist).mockResolvedValue({...data,summary:{...data.summary,deficiencies_count:2},results:[{...row,status:'inc'}]})
  render(page());expect(await screen.findByText('Unresolved INC: CS 1 · Additional details unavailable')).toBeTruthy()
 })
 it('uses the visible groups when some terms are individually collapsed',async()=>{
  vi.mocked(getChecklist).mockResolvedValue({...data,results:[row,{...row,curriculum_term_course_id:'slot-two'}],slots:[...data.slots,{...data.slots[0]!,id:'slot-two',curriculum_term_id:'term-two'}],terms:[...data.terms,{...data.terms[0]!,id:'term-two',term_sequence:2}]})
  render(page());const first=await screen.findByRole('button',{name:/Semester 1/});const second=screen.getByRole('button',{name:/Semester 2/})
  fireEvent.click(screen.getByRole('button',{name:'Expand All'}));await waitFor(()=>expect(first.getAttribute('aria-expanded')).toBe('true'))
  fireEvent.click(first);await waitFor(()=>expect(first.getAttribute('aria-expanded')).toBe('false'))
  expect(screen.getByRole('button',{name:'Collapse All'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Collapse All'}));await waitFor(()=>expect(second.getAttribute('aria-expanded')).toBe('false'))
  expect(screen.getByRole('button',{name:'Expand All'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Expand All'}));await waitFor(()=>{expect(first.getAttribute('aria-expanded')).toBe('true');expect(second.getAttribute('aria-expanded')).toBe('true')})
 })
 it('clears data when account changes',async()=>{
  vi.mocked(getChecklist).mockResolvedValueOnce(data).mockImplementation(()=>new Promise(()=>{}));const view=render(page());expect(await screen.findByRole('button',{name:/Semester 1/})).toBeTruthy();auth.user={id:'adviser-two'};view.rerender(page());expect(screen.queryByRole('button',{name:/Semester 1/})).toBeNull()
 })
})
