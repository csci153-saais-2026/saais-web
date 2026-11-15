import { apiClient, unwrapApiResult } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'
import { getRoster } from '../advisees/advisees.api'
export async function getEncodingChoices(){const [students,terms]=await Promise.all([getRoster('current'),apiClient.GET('/rest/v1/school_term',{params:{query:{limit:1000}}}).then(unwrapApiResult)]);return {students,terms}}
export async function getTermOfferings(studentId:string,termId:string){return unwrapApiResult(await apiClient.GET('/functions/v1/students/{student_id}/course-offerings',{params:{path:{student_id:studentId},query:{school_term_id:termId,limit:1000}}}))}
export async function saveTermGrades(studentId:string,termId:string,rows:ApiSchema<'EncodeTermGradeRowInput'>[]){return unwrapApiResult(await apiClient.POST('/functions/v1/students/{student_id}/encode-grades',{params:{path:{student_id:studentId}},body:{school_term_id:termId,rows}}))}
