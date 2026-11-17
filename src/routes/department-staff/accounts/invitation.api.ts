import { listEligibleDepartmentAdvisers, type StudentFilterOption } from '../students/students.api'
import { listCurricula, type CurriculumVersion, type Program } from '../curricula/curricula.api'

export interface DepartmentInvitationOptions {
  programs: Program[]
  curriculumVersions: CurriculumVersion[]
  advisers: StudentFilterOption[]
}

/** Only active program versions and active, department-assigned advisers are eligible for preview. */
export async function listDepartmentInvitationOptions(
  departmentId: string,
  signal?: AbortSignal,
): Promise<DepartmentInvitationOptions> {
  if (!departmentId) throw new Error('Invitation references require an authorized department.')

  const [curricula, studentOptions] = await Promise.all([
    listCurricula(departmentId, signal),
    listEligibleDepartmentAdvisers(departmentId, signal),
  ])
  const programs = curricula.programs.filter(program =>
    program.department_id === departmentId && program.status === 'active',
  )
  const programIds = new Set(programs.map(program => program.id))
  const curriculumVersions = curricula.versions.filter(version =>
    programIds.has(version.program_id) && version.status === 'active',
  )

  return { programs, curriculumVersions, advisers: studentOptions }
}
