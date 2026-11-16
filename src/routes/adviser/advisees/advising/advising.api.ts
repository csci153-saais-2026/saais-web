import { apiClient, postgrestFilter, unwrapApiResult } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'
import { getRoster, getSelectedStudent } from '../advisees.api'
export async function getAdvisingTerms(){return unwrapApiResult(await apiClient.GET('/rest/v1/school_term',{params:{query:{limit:1000}}}))}
export async function getAdvisingData(studentId:string,termId:string){
  await getSelectedStudent(studentId)
  const [plans,items,current,recommendations,assignments]=await Promise.all([
    apiClient.GET('/rest/v1/advising_plan',{params:{query:{student_id:postgrestFilter.eq(studentId),school_term_id:postgrestFilter.eq(termId),select:'id,student_id,school_term_id,student_curriculum_assignment_id,created_by,updated_by,created_at,updated_at,revision',limit:100}}}).then(unwrapApiResult),
    apiClient.GET('/rest/v1/advising_plan_item',{params:{query:{student_id:postgrestFilter.eq(studentId),school_term_id:postgrestFilter.eq(termId),select:'id,advising_plan_id,student_id,school_term_id,course_offering_id,curriculum_term_course_id,display_order,created_at',order:'display_order.asc',limit:1000}}}).then(unwrapApiResult),
    getRoster('current'),
    apiClient.GET('/functions/v1/students/{student_id}/recommendations',{params:{path:{student_id:studentId},query:{school_term_id:termId,limit:1000}}}).then(result=>({items:unwrapApiResult(result),excluded:result.response.headers.get('X-Excluded-Count')})),
    apiClient.GET('/rest/v1/student_curriculum_assignment',{params:{query:{student_id:postgrestFilter.eq(studentId),select:'id,student_id,curriculum_version_id,start_date,end_date,change_note,created_at',limit:1000}}}).then(unwrapApiResult),
  ])
  if(plans.some(p=>p.student_id.toLowerCase()!==studentId.toLowerCase()||p.school_term_id.toLowerCase()!==termId.toLowerCase())||items.some(i=>i.student_id.toLowerCase()!==studentId.toLowerCase()||i.school_term_id.toLowerCase()!==termId.toLowerCase()||i.advising_plan_id.toLowerCase()!==plans[0]?.id.toLowerCase())||plans.length>1)throw new Error('The advising plan response did not match the selected student and term.')
  const assignment=assignments.find(a=>a.student_id.toLowerCase()===studentId.toLowerCase() && a.end_date==null)
  const offerings:ApiSchema<'CourseOffering'>[]=[];const courses:ApiSchema<'Course'>[]=[]
  const batches=(ids:string[])=>{const unique=[...new Set(ids)];return Array.from({length:Math.ceil(unique.length/50)},(_,i)=>unique.slice(i*50,i*50+50))}
  for(const ids of batches(items.map(item=>item.course_offering_id))) offerings.push(...unwrapApiResult(await apiClient.GET('/rest/v1/course_offering',{params:{query:{id:postgrestFilter.inList(ids),limit:100}}})))
  for(const ids of batches(offerings.map(offering=>offering.course_id))) courses.push(...unwrapApiResult(await apiClient.GET('/rest/v1/course',{params:{query:{id:postgrestFilter.inList(ids),limit:100}}})))
  return {plan:plans[0]??null,items,recommendations,offerings,courses,canEdit:current.some(s=>s.student_id.toLowerCase()===studentId.toLowerCase()),assignmentId:assignment?.id ?? null}
}
export async function saveAdvisingPlan(studentId:string,termId:string,revision:number|null,assignmentId:string,items:{course_offering_id:string;curriculum_term_course_id?:string|null}[]){return unwrapApiResult(await apiClient.PUT('/functions/v1/students/{student_id}/plans/{school_term_id}',{params:{path:{student_id:studentId,school_term_id:termId}},body:{expected_revision:revision,expected_curriculum_assignment_id:assignmentId,items}}))}
