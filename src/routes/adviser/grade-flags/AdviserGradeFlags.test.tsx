import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ApiClientError, type ApiSchema } from '@/lib/api'
import Flags from './AdviserGradeFlags'
import { getFlags, resolveFlag } from './grade-flags.api'
const auth=vi.hoisted(()=>({user:{id:'adviser-one'},isMockMode:false}))
vi.mock('@/hooks/use-auth',()=>({useAuth:()=>auth}))
vi.mock('../Adviser',()=>({AdviserPage:({children}:{children:React.ReactNode})=><>{children}</>}))
vi.mock('./grade-flags.api',()=>({getFlags:vi.fn(),resolveFlag:vi.fn()}))
const data={flags:[{id:'flag-one',student_id:'student-one',attempt_id:'attempt-one',reported_stage:'midterm',reported_grade_text:'2.5',details:'One comment',created_at:'2026-01-01T00:00:00Z'},{id:'flag-two',student_id:'student-two',attempt_id:'attempt-two',reported_stage:'final',reported_grade_text:'3',details:'Two comment',created_at:'2026-01-02T00:00:00Z'}],roster:[{student_id:'student-one',full_name:'First Student',student_number:'01'},{student_id:'student-two',full_name:'Second Student',student_number:'02'}],attempts:[{id:'attempt-one',student_id:'student-one',course_offering_id:'offering-one',revision:1},{id:'attempt-two',student_id:'student-two',course_offering_id:'offering-two',revision:7}],offerings:[{id:'offering-one',course_id:'course-one'},{id:'offering-two',course_id:'course-two'}],courses:[{id:'course-one',code:'CS 1',title:'First'},{id:'course-two',code:'CS 2',title:'Second'}]} as unknown as Awaited<ReturnType<typeof getFlags>>
afterEach(()=>{cleanup();vi.resetAllMocks();auth.user={id:'adviser-one'}})
describe('grade flag identity',()=>{
 it('uses the selected flag, student, course and revision',async()=>{
  vi.mocked(getFlags).mockResolvedValue(data);vi.mocked(resolveFlag).mockResolvedValue({} as ApiSchema<'GradeFlag'>)
  render(<MemoryRouter><Flags/></MemoryRouter>);const buttons=await screen.findAllByRole('button',{name:'Review flag'});fireEvent.click(buttons[1]!)
  expect(screen.getByText(/Second Student · CS 2 · Second/)).toBeTruthy();expect(within(screen.getByRole('dialog')).getByText('Two comment')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Action'),{target:{value:'reject'}});fireEvent.change(screen.getByLabelText('Reply / reason'),{target:{value:'Reviewed'}});fireEvent.click(screen.getByLabelText('I reviewed the current grade'));fireEvent.click(screen.getByRole('button',{name:'Submit resolution'}))
  await waitFor(()=>expect(resolveFlag).toHaveBeenCalledWith('flag-two',{resolution_action:'reject',resolution_note:'Reviewed',expected_revision:7}))
 })
 it('does not retain flags when switching accounts',async()=>{
  vi.mocked(getFlags).mockResolvedValueOnce(data).mockImplementation(()=>new Promise(()=>{}));const view=render(<MemoryRouter><Flags/></MemoryRouter>);expect(await screen.findByText('First Student')).toBeTruthy();auth.user={id:'adviser-two'};view.rerender(<MemoryRouter><Flags/></MemoryRouter>);expect(screen.queryByText('First Student')).toBeNull()
 })
 it('requires reviewing the refreshed grade after a stale response, including after a failed reload',async()=>{
  const refreshed={...data,attempts:data.attempts.map(a=>a.id==='attempt-one'?{...a,revision:2,midterm_grade:1.75}:a)}
  vi.mocked(getFlags).mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('Reload failed')).mockResolvedValue(refreshed)
  vi.mocked(resolveFlag).mockRejectedValueOnce(new ApiClientError({status:409,code:'STALE_ATTEMPT',message:'Stale',details:null,hint:null,retryAfterSeconds:null,isAuthError:false,isForbidden:false,isNotFound:false,isConflict:true,isRateLimited:false,isNetworkError:false})).mockResolvedValueOnce({} as ApiSchema<'GradeFlag'>)
  render(<MemoryRouter><Flags/></MemoryRouter>);fireEvent.click((await screen.findAllByRole('button',{name:'Review flag'}))[0]!)
  fireEvent.change(screen.getByLabelText('Action'),{target:{value:'reject'}});fireEvent.change(screen.getByLabelText('Reply / reason'),{target:{value:'Reviewed'}});fireEvent.click(screen.getByLabelText('I reviewed the current grade'));fireEvent.click(screen.getByRole('button',{name:'Submit resolution'}))
  expect(await within(screen.getByRole('dialog')).findByText('Reload failed')).toBeTruthy()
  expect((screen.getByRole('button',{name:'Submit resolution'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'Retry loading grade'}))
  expect(await screen.findByText('Current midterm grade: 1.75')).toBeTruthy()
  expect((screen.getByLabelText('I reviewed the current grade') as HTMLInputElement).checked).toBe(false)
  expect((screen.getByRole('button',{name:'Submit resolution'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByLabelText('I reviewed the current grade'));fireEvent.click(screen.getByRole('button',{name:'Submit resolution'}))
  await waitFor(()=>expect(resolveFlag).toHaveBeenLastCalledWith('flag-one',{resolution_action:'reject',resolution_note:'Reviewed',expected_revision:2}))
 })

})
