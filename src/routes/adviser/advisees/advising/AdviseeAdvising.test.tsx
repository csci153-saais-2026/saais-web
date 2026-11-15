import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ApiSchema } from '@/lib/api'
import Advising from './AdviseeAdvising'
import { getAdvisingData, getAdvisingTerms, saveAdvisingPlan } from './advising.api'
import { getNotes } from '../notes/notes.api'
const auth=vi.hoisted(()=>({user:{id:'adviser-one'},roles:['adviser'],isMockMode:false}))
vi.mock('@/hooks/use-auth',()=>({useAuth:()=>auth}))
vi.mock('../../Adviser',()=>({AdviserPage:({children}:{children:React.ReactNode})=><>{children}</>}))
vi.mock('./AdvisingAssistant',()=>({AdvisingAssistant:()=> <p>Assistant</p>}))
vi.mock('./advising.api',()=>({getAdvisingData:vi.fn(),getAdvisingTerms:vi.fn(),saveAdvisingPlan:vi.fn()}))
vi.mock('../notes/notes.api',()=>({getNotes:vi.fn(async()=>({notes:[],isCurrent:true})),addNote:vi.fn()}))
const data={plan:null,items:[],recommendations:{items:[{course_offering_id:'offering-two',curriculum_term_course_id:'slot-two',code:'CS 2',title:'Programming',units:3,why:'Required',badges:[]}],excluded:'0'},offerings:[],courses:[],canEdit:true,assignmentId:'assignment-two'} as Awaited<ReturnType<typeof getAdvisingData>>
function page(){return <MemoryRouter initialEntries={['/advisee/student-two/advising']}><Routes><Route path="/advisee/:id/advising" element={<Advising/>}/></Routes></MemoryRouter>}
afterEach(()=>{cleanup();vi.clearAllMocks();auth.user={id:'adviser-one'};auth.isMockMode=false})
describe('term advising identity',()=>{
 it('saves the selected recommendation for the selected student and term',async()=>{
  vi.mocked(getAdvisingTerms).mockResolvedValue([{id:'term-two',school_year:'2026',term_type:'1st Semester'}] as ApiSchema<'SchoolTerm'>[]);vi.mocked(getAdvisingData).mockResolvedValue(data);vi.mocked(saveAdvisingPlan).mockResolvedValue({} as ApiSchema<'AdvisingPlanResponse'>)
  render(page());fireEvent.change(await screen.findByLabelText('School term'),{target:{value:'term-two'}});fireEvent.click(await screen.findByRole('checkbox',{name:/CS 2/}));fireEvent.click(screen.getByRole('button',{name:'Add selected to plan'}))
  await waitFor(()=>expect(saveAdvisingPlan).toHaveBeenCalledWith('student-two','term-two',null,'assignment-two',[{course_offering_id:'offering-two',curriculum_term_course_id:'slot-two'}]))
 })
 it('clears the plan while another account loads',async()=>{
  vi.mocked(getAdvisingTerms).mockResolvedValue([{id:'term-two',school_year:'2026',term_type:'1st Semester'}] as ApiSchema<'SchoolTerm'>[]);vi.mocked(getAdvisingData).mockResolvedValueOnce(data).mockImplementation(()=>new Promise(()=>{}))
  const view=render(page());fireEvent.change(await screen.findByLabelText('School term'),{target:{value:'term-two'}});expect(await screen.findByText(/CS 2/)).toBeTruthy();auth.user={id:'adviser-two'};view.rerender(page());expect(screen.queryByText(/CS 2/)).toBeNull()
 })
 it('uses the selected student for notes and keeps past advisees read-only',async()=>{
  vi.mocked(getAdvisingTerms).mockResolvedValue([])
  vi.mocked(getNotes).mockResolvedValueOnce({isCurrent:false,notes:[{id:'note-two',student_id:'student-two',body_text:'Student two note',author_name:'Adviser',is_archived:false,created_at:'2026-01-01T00:00:00Z'}] as ApiSchema<'AdvisingNote'>[]})
  render(page())
  expect(await screen.findByText('Student two note')).toBeTruthy()
  expect(getNotes).toHaveBeenCalledWith('student-two')
  expect(screen.queryByRole('button',{name:'Save note'})).toBeNull()
  expect(screen.getByRole('link',{name:'View all notes'}).getAttribute('href')).toBe('/adviser/advisee/student-two/notes')
 })
 it('shows the mockup controls without offering an unsupported mock save',async()=>{
  auth.isMockMode=true
  vi.mocked(getAdvisingTerms).mockResolvedValue([{id:'term-two',school_year:'2026',term_type:'1st Semester'}] as ApiSchema<'SchoolTerm'>[])
  vi.mocked(getNotes).mockResolvedValueOnce({isCurrent:true,notes:[]})
  render(page())
  expect((await screen.findByRole('button',{name:'Add selected to plan'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(await screen.findByLabelText('Write an advising note'),{target:{value:'Draft note'}})
  expect((screen.getByRole('button',{name:'Save note'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
  expect((screen.getByLabelText('Write an advising note') as HTMLTextAreaElement).value).toBe('')
 })
})
