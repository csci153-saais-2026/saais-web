import type { ApiSchema } from "@/lib/api/types";
import { MOCK_IDS, MOCK_PERSONAS } from "./personas";
import { REFERENCE_CURRICULUM } from "./reference-curriculum";

export interface MockDatabaseState {
  faculties: ApiSchema<"Faculty">[];
  departments: ApiSchema<"Department">[];
  programs: ApiSchema<"Program">[];
  curriculumVersions: ApiSchema<"CurriculumVersion">[];
  curriculumTerms: ApiSchema<"CurriculumTerm">[];
  curriculumTermCourses: ApiSchema<"CurriculumTermCourse">[];
  courses: ApiSchema<"Course">[];
  prerequisites: ApiSchema<"Prerequisite">[];
  curriculumPairEquivalences: ApiSchema<"CurriculumPairEquivalence">[];
  schoolTerms: ApiSchema<"SchoolTerm">[];
  departmentTermEncodings: ApiSchema<"DepartmentTermEncodingClosure">[];
  courseOfferings: ApiSchema<"CourseOffering">[];
  profiles: ApiSchema<"Profile">[];
  roleAssignments: ApiSchema<"RoleAssignment">[];
  studentOrganizations: ApiSchema<"StudentOrganization">[];
  adviserAssignments: ApiSchema<"AdviserAssignment">[];
  studentCurriculumAssignments: ApiSchema<"StudentCurriculumAssignment">[];
  attempts: ApiSchema<"Attempt">[];
  attemptResults: ApiSchema<"AttemptResult">[];
  incResolutions: ApiSchema<"INCResolution">[];
  electiveMappings: ApiSchema<"ElectiveMapping">[];
  equivalencyDecisions: ApiSchema<"EquivalencyDecision">[];
  outsideCredits: ApiSchema<"OutsideCredit">[];
  curriculumTransferRequests: ApiSchema<"CurriculumTransferRequest">[];
  advisingPlans: ApiSchema<"AdvisingPlan">[];
  advisingPlanItems: ApiSchema<"AdvisingPlanItem">[];
  advisingNotes: ApiSchema<"AdvisingNote">[];
  attemptRemarks: ApiSchema<"AttemptRemark">[];
  gradeFlags: ApiSchema<"GradeFlag">[];
  notifications: ApiSchema<"Notification">[];
  systemSettings: ApiSchema<"SystemSettings">[];
  auditLogEntries: ApiSchema<"AuditLogEntry">[];
}

function buildInitialMockDatabase(): MockDatabaseState {
  const db: MockDatabaseState = {
    faculties: [
      {
        id: MOCK_IDS.facultyComputing,
        code: "FoC",
        name: "Faculty of Computing",
        letterhead_prefix: "Office of the Dean",
        letterhead_name: "Faculty of Computing",
        dean_name: MOCK_PERSONAS.dean.fullName,
      },
      {
        id: MOCK_IDS.facultyEngineering,
        code: "FET",
        name: "Faculty of Engineering and Technology",
        letterhead_prefix: "Office of the Dean",
        letterhead_name: "Faculty of Engineering and Technology",
        dean_name: null,
      },
      {
        id: "10000000-0000-4000-8000-000000000003",
        code: "FAS",
        name: "Faculty of Arts and Sciences",
        letterhead_prefix: "Office of the Dean",
        letterhead_name: "Faculty of Arts and Sciences",
        dean_name: null,
      },
    ],
    departments: [
      {
        id: MOCK_IDS.deptDcst,
        faculty_id: MOCK_IDS.facultyComputing,
        code: "DCST",
        name: "Department of Computer Science and Technology",
        letterhead_prefix: "Office of the Department Head",
        letterhead_name: "Department of Computer Science and Technology",
        department_head_name: MOCK_PERSONAS.department_head.fullName,
        dean_name: MOCK_PERSONAS.dean.fullName,
      },
      {
        id: MOCK_IDS.deptDabe,
        faculty_id: MOCK_IDS.facultyEngineering,
        code: "DABE",
        name: "Department of Agricultural and Biosystems Engineering",
        letterhead_prefix: "Office of the Department Head",
        letterhead_name:
          "Department of Agricultural and Biosystems Engineering",
        department_head_name: null,
        dean_name: null,
      },
      {
        id: "20000000-0000-4000-8000-000000000003",
        faculty_id: MOCK_IDS.facultyComputing,
        code: "DIS",
        name: "Department of Information Systems",
        letterhead_prefix: "Office of the Department Head",
        letterhead_name: "Department of Information Systems",
        department_head_name: null,
        dean_name: MOCK_PERSONAS.dean.fullName,
      },
    ],
    programs: [
      {
        id: MOCK_IDS.programBscs,
        department_id: MOCK_IDS.deptDcst,
        code: "BSCS",
        name: "Bachelor of Science in Computer Science",
        nominal_duration: 4,
        status: "active",
      },
      {
        id: MOCK_IDS.programBsit,
        department_id: MOCK_IDS.deptDcst,
        code: "BSIT",
        name: "Bachelor of Science in Information Technology",
        nominal_duration: 4,
        status: "active",
      },
    ],
    curriculumVersions: [
      {
        id: MOCK_IDS.curriculumBscs2024,
        program_id: MOCK_IDS.programBscs,
        version_label: "BSCS 2024-2025 v1",
        effective_start: "2024-08-01",
        effective_end: null,
        delinquency_threshold: 24,
        total_units: 162,
        status: "active",
        enrolled_student_count: 2,
      },
      {
        id: MOCK_IDS.curriculumBscs2020,
        program_id: MOCK_IDS.programBscs,
        version_label: "BSCS 2020-2021 v1",
        effective_start: "2020-08-01",
        effective_end: "2024-07-31",
        delinquency_threshold: 24,
        total_units: 162,
        status: "teach_out",
        enrolled_student_count: 0,
      },
      {
        id: MOCK_IDS.curriculumBscsDraft,
        program_id: MOCK_IDS.programBscs,
        version_label: "BSCS 2027-2028 v1",
        effective_start: "2027-08-01",
        effective_end: null,
        delinquency_threshold: 24,
        total_units: 162,
        status: "draft",
        enrolled_student_count: 0,
      },
    ],
    curriculumTerms: [
      {
        id: MOCK_IDS.curriculumTerm1Y1S,
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        year_level: 1,
        term_sequence: 1,
      },
      {
        id: MOCK_IDS.curriculumTerm1Y2S,
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        year_level: 1,
        term_sequence: 2,
      },
      {
        id: MOCK_IDS.curriculumTerm3Y1S,
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        year_level: 3,
        term_sequence: 1,
      },
      {
        id: "41000000-0000-4000-8000-000000000004",
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        year_level: 4,
        term_sequence: 2,
      },
    ],
    curriculumTermCourses: [
      {
        id: MOCK_IDS.slotCsci101,
        curriculum_term_id: MOCK_IDS.curriculumTerm1Y1S,
        course_id: MOCK_IDS.courseCsci101,
        is_elective_slot: false,
        slot_type: "required",
        slot_label: null,
        nominal_units: 3,
      },
      {
        id: MOCK_IDS.slotCsci102,
        curriculum_term_id: MOCK_IDS.curriculumTerm1Y2S,
        course_id: MOCK_IDS.courseCsci102,
        is_elective_slot: false,
        slot_type: "required",
        slot_label: null,
        nominal_units: 3,
      },
      {
        id: MOCK_IDS.slotCsci153,
        curriculum_term_id: MOCK_IDS.curriculumTerm3Y1S,
        course_id: MOCK_IDS.courseCsci153,
        is_elective_slot: false,
        slot_type: "required",
        slot_label: null,
        nominal_units: 3,
      },
      {
        id: MOCK_IDS.slotFreeElective1,
        curriculum_term_id: MOCK_IDS.curriculumTerm3Y1S,
        course_id: null,
        is_elective_slot: true,
        slot_type: "elective",
        slot_label: "CS Elective 1",
        nominal_units: 3,
      },
      {
        id: MOCK_IDS.slotPe1,
        curriculum_term_id: MOCK_IDS.curriculumTerm1Y1S,
        course_id: MOCK_IDS.coursePhEd11,
        is_elective_slot: false,
        slot_type: "pe",
        slot_label: null,
        nominal_units: 2,
      },
      {
        id: MOCK_IDS.slotNstp1,
        curriculum_term_id: MOCK_IDS.curriculumTerm1Y1S,
        course_id: MOCK_IDS.courseNstp11,
        is_elective_slot: false,
        slot_type: "nstp",
        slot_label: null,
        nominal_units: 3,
      },
    ],
    courses: [
      {
        id: MOCK_IDS.courseCsci101,
        department_id: MOCK_IDS.deptDcst,
        code: "CSCI 101",
        title: "Introduction to Computing",
        category: "major",
        units: 3,
        is_elective: false,
        status: "active",
        repeatable_type: "none",
      },
      {
        id: MOCK_IDS.courseCsci102,
        department_id: MOCK_IDS.deptDcst,
        code: "CSCI 102",
        title: "Computer Programming 1",
        category: "major",
        units: 3,
        is_elective: false,
        status: "active",
        repeatable_type: "none",
      },
      {
        id: MOCK_IDS.courseCsci153,
        department_id: MOCK_IDS.deptDcst,
        code: "CSCI 153",
        title: "Software Engineering",
        category: "major",
        units: 3,
        is_elective: false,
        status: "active",
        repeatable_type: "none",
      },
      {
        id: MOCK_IDS.courseCsci198,
        department_id: MOCK_IDS.deptDcst,
        code: "CSCI 198",
        title: "Special Topics in Artificial Intelligence",
        category: "elective",
        units: 3,
        is_elective: true,
        status: "active",
        repeatable_type: "none",
      },
      {
        id: MOCK_IDS.coursePhEd11,
        department_id: MOCK_IDS.deptDcst,
        code: "PHED 11",
        title: "Physical Fitness and Gymnastics",
        category: "pe",
        units: 2,
        is_elective: false,
        status: "active",
        repeatable_type: "none",
      },
      {
        id: MOCK_IDS.courseNstp11,
        department_id: MOCK_IDS.deptDcst,
        code: "NSTP 11",
        title: "National Service Training Program 1",
        category: "nstp",
        units: 3,
        is_elective: false,
        status: "active",
        repeatable_type: "none",
      },
    ],
    prerequisites: [
      {
        id: MOCK_IDS.prereqCsci102Requires101,
        course_id: MOCK_IDS.courseCsci102,
        prerequisite_course_id: MOCK_IDS.courseCsci101,
        type: "strict",
      },
      {
        id: MOCK_IDS.prereqCsci153Requires102,
        course_id: MOCK_IDS.courseCsci153,
        prerequisite_course_id: MOCK_IDS.courseCsci102,
        type: "strict",
      },
    ],
    curriculumPairEquivalences: [
      {
        id: MOCK_IDS.pairEquiv1,
        from_curriculum_version_id: MOCK_IDS.curriculumBscs2020,
        to_curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        source_course_id: MOCK_IDS.courseCsci101,
        target_course_id: MOCK_IDS.courseCsci101,
        note: "Direct equivalent introductory computing course",
        created_by: MOCK_IDS.deptHeadDcst,
        created_at: "2026-08-01T08:00:00Z",
      },
    ],
    schoolTerms: [
      {
        id: MOCK_IDS.term2025Sem2Closed,
        start_year: 2025,
        end_year: 2026,
        term_type: "2nd Semester",
        school_year: "2025 - 2026",
        is_locked: true,
        override_flag: false,
        override_actor_id: null,
        override_at: null,
        starts_on: "2026-01-15",
        ends_on: "2026-05-30",
        encoding_deadline: "2026-06-15",
        closed_by: MOCK_IDS.systemAdmin,
        closed_at: "2026-06-16T00:00:00Z",
        closure_note: "End of 2nd Semester AY 2025-2026",
        default_inc_deadline: "2027-05-30",
        chronological_key: 20252,
      },
      {
        id: MOCK_IDS.term2026Sem1Open,
        start_year: 2026,
        end_year: 2027,
        term_type: "1st Semester",
        school_year: "2026 - 2027",
        is_locked: false,
        override_flag: false,
        override_actor_id: null,
        override_at: null,
        starts_on: "2026-08-10",
        ends_on: "2026-12-18",
        encoding_deadline: "2027-01-05",
        closed_by: null,
        closed_at: null,
        closure_note: null,
        default_inc_deadline: "2027-12-18",
        chronological_key: 20261,
      },
    ],
    departmentTermEncodings: [
      {
        id: MOCK_IDS.deptEncodingDcstOpen,
        school_term_id: MOCK_IDS.term2026Sem1Open,
        department_id: MOCK_IDS.deptDcst,
        is_closed: false,
        closed_by: null,
        closed_at: null,
        closure_note: null,
      },
    ],
    courseOfferings: [
      {
        id: MOCK_IDS.offeringCsci102,
        school_term_id: MOCK_IDS.term2025Sem2Closed,
        course_id: MOCK_IDS.courseCsci102,
        section: "A",
        schedule: "MWF 09:00-10:00",
        instructor: MOCK_PERSONAS.adviser.fullName,
        is_by_request: false,
      },
      {
        id: MOCK_IDS.offeringCsci153,
        school_term_id: MOCK_IDS.term2026Sem1Open,
        course_id: MOCK_IDS.courseCsci153,
        section: "A",
        schedule: "TTh 10:00-11:30",
        instructor: MOCK_PERSONAS.department_head.fullName,
        is_by_request: false,
      },
      {
        id: MOCK_IDS.offeringCsci198,
        school_term_id: MOCK_IDS.term2026Sem1Open,
        course_id: MOCK_IDS.courseCsci198,
        section: "E1",
        schedule: "MWF 14:00-15:00",
        instructor: MOCK_PERSONAS.adviser_secondary.fullName,
        is_by_request: false,
      },
      {
        id: MOCK_IDS.offeringPhEd11,
        school_term_id: MOCK_IDS.term2026Sem1Open,
        course_id: MOCK_IDS.coursePhEd11,
        section: "P3",
        schedule: "Sat 07:00-09:00",
        instructor: MOCK_PERSONAS.adviser_secondary.fullName,
        is_by_request: false,
      },
    ],
    profiles: [
      {
        id: MOCK_IDS.studentPrimary,
        role: "student",
        roles: ["student"],
        email: MOCK_PERSONAS.student.email,
        full_name: MOCK_PERSONAS.student.fullName,
        student_number: "24-1-01798",
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-08-01T08:00:00Z",
        invitation_expires_at: "2026-08-08T08:00:00Z",
        created_at: "2026-08-01T08:00:00Z",
        updated_at: "2026-08-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: null,
      },
      {
        id: MOCK_IDS.studentSecondary,
        role: "student",
        roles: ["student"],
        email: MOCK_PERSONAS.student_secondary.email,
        full_name: MOCK_PERSONAS.student_secondary.fullName,
        student_number: "23-1-02121",
        status: "invited",
        invitation_status: "pending",
        invitation_sent_at: "2026-10-01T08:00:00Z",
        invitation_expires_at: "2026-12-31T23:59:59Z",
        created_at: "2026-10-01T08:00:00Z",
        updated_at: "2026-10-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: null,
      },
      {
        id: MOCK_IDS.studentOtherDept,
        role: "student",
        roles: ["student"],
        email: MOCK_PERSONAS.student_other_dept.email,
        full_name: MOCK_PERSONAS.student_other_dept.fullName,
        student_number: "24-1-01926",
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-08-01T08:00:00Z",
        invitation_expires_at: "2026-08-08T08:00:00Z",
        created_at: "2026-08-01T08:00:00Z",
        updated_at: "2026-08-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyEngineering,
        department_id: MOCK_IDS.deptDabe,
        avatar_url: null,
        consultation_hours: null,
      },
      {
        id: MOCK_IDS.adviserPrimary,
        role: "adviser",
        roles: ["adviser"],
        email: MOCK_PERSONAS.adviser.email,
        full_name: MOCK_PERSONAS.adviser.fullName,
        student_number: null,
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-07-01T08:00:00Z",
        invitation_expires_at: "2026-07-08T08:00:00Z",
        created_at: "2026-07-01T08:00:00Z",
        updated_at: "2026-07-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: "Tue & Thu, 13:00–16:00",
      },
      {
        id: MOCK_IDS.adviserSecondary,
        role: "adviser",
        roles: ["adviser"],
        email: MOCK_PERSONAS.adviser_secondary.email,
        full_name: MOCK_PERSONAS.adviser_secondary.fullName,
        student_number: null,
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-07-01T08:00:00Z",
        invitation_expires_at: "2026-07-08T08:00:00Z",
        created_at: "2026-07-01T08:00:00Z",
        updated_at: "2026-07-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: "Mon & Wed, 09:00–12:00",
      },
      {
        id: MOCK_IDS.deptHeadDcst,
        role: "department_head",
        roles: ["department_head", "adviser"],
        email: MOCK_PERSONAS.department_head.email,
        full_name: MOCK_PERSONAS.department_head.fullName,
        student_number: null,
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-07-01T08:00:00Z",
        invitation_expires_at: "2026-07-08T08:00:00Z",
        created_at: "2026-07-01T08:00:00Z",
        updated_at: "2026-07-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: "MWF, 10:00–12:00",
      },
      {
        id: MOCK_IDS.deptStaffDcst,
        role: "department_staff",
        roles: ["department_staff"],
        email: MOCK_PERSONAS.department_staff.email,
        full_name: MOCK_PERSONAS.department_staff.fullName,
        student_number: null,
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-07-01T08:00:00Z",
        invitation_expires_at: "2026-07-08T08:00:00Z",
        created_at: "2026-07-01T08:00:00Z",
        updated_at: "2026-07-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: null,
      },
      {
        id: MOCK_IDS.deanComputing,
        role: "dean",
        roles: ["dean", "adviser"],
        email: MOCK_PERSONAS.dean.email,
        full_name: MOCK_PERSONAS.dean.fullName,
        student_number: null,
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-07-01T08:00:00Z",
        invitation_expires_at: "2026-07-08T08:00:00Z",
        created_at: "2026-07-01T08:00:00Z",
        updated_at: "2026-07-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: "Wed, 14:00–17:00",
      },
      {
        id: MOCK_IDS.deanDeptHeadComputing,
        role: "dean",
        roles: ["dean", "department_head", "adviser"],
        email: MOCK_PERSONAS.dean_dept_head.email,
        full_name: MOCK_PERSONAS.dean_dept_head.fullName,
        student_number: null,
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-07-01T08:00:00Z",
        invitation_expires_at: "2026-07-08T08:00:00Z",
        created_at: "2026-07-01T08:00:00Z",
        updated_at: "2026-07-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: "Fri, 13:00–16:00",
      },
      {
        id: MOCK_IDS.systemAdmin,
        role: "admin",
        roles: ["admin", "adviser"],
        email: MOCK_PERSONAS.admin.email,
        full_name: MOCK_PERSONAS.admin.fullName,
        student_number: null,
        status: "active",
        invitation_status: "accepted",
        invitation_sent_at: "2026-07-01T08:00:00Z",
        invitation_expires_at: "2026-07-08T08:00:00Z",
        created_at: "2026-07-01T08:00:00Z",
        updated_at: "2026-07-01T08:00:00Z",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        avatar_url: null,
        consultation_hours: "Mon & Fri, 14:00–16:00",
      },
    ],
    roleAssignments: [
      {
        id: "92000000-0000-4000-8000-000000000001",
        profile_id: MOCK_IDS.studentPrimary,
        role: "student",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        created_at: "2026-08-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000002",
        profile_id: MOCK_IDS.adviserPrimary,
        role: "adviser",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000003",
        profile_id: MOCK_IDS.deptHeadDcst,
        role: "department_head",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000004",
        profile_id: MOCK_IDS.deptStaffDcst,
        role: "department_staff",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000005",
        profile_id: MOCK_IDS.deanComputing,
        role: "dean",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: null,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000006",
        profile_id: MOCK_IDS.systemAdmin,
        role: "admin",
        faculty_id: null,
        department_id: null,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000007",
        profile_id: MOCK_IDS.systemAdmin,
        role: "adviser",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000008",
        profile_id: MOCK_IDS.adviserSecondary,
        role: "adviser",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000009",
        profile_id: MOCK_IDS.deanDeptHeadComputing,
        role: "dean",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: null,
        created_at: "2026-07-01T08:00:00Z",
      },
      {
        id: "92000000-0000-4000-8000-000000000010",
        profile_id: MOCK_IDS.deanDeptHeadComputing,
        role: "department_head",
        faculty_id: MOCK_IDS.facultyComputing,
        department_id: MOCK_IDS.deptDcst,
        created_at: "2026-07-01T08:00:00Z",
      },
      ...[MOCK_IDS.deptHeadDcst, MOCK_IDS.deanDeptHeadComputing].map(
        (profile_id, index) => ({
          id: "92000000-0000-4000-8000-0000000000" + (11 + index),
          profile_id,
          role: "adviser" as const,
          faculty_id: MOCK_IDS.facultyComputing,
          department_id: MOCK_IDS.deptDcst,
          created_at: "2026-07-01T08:00:00Z",
        }),
      ),
    ],
    studentOrganizations: [
      {
        student_id: MOCK_IDS.studentPrimary,
        student_curriculum_assignment_id: MOCK_IDS.studentCurrAssignment1,
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        program_id: MOCK_IDS.programBscs,
        department_id: MOCK_IDS.deptDcst,
        faculty_id: MOCK_IDS.facultyComputing,
        adviser_id: MOCK_IDS.adviserPrimary,
        entry_year: 2024,
      },
      {
        student_id: MOCK_IDS.studentSecondary,
        student_curriculum_assignment_id: MOCK_IDS.studentCurrAssignment2,
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        program_id: MOCK_IDS.programBscs,
        department_id: MOCK_IDS.deptDcst,
        faculty_id: MOCK_IDS.facultyComputing,
        adviser_id: null,
        entry_year: 2024,
      },
    ],
    adviserAssignments: [
      {
        id: MOCK_IDS.adviserAssignment1,
        adviser_id: MOCK_IDS.adviserPrimary,
        adviser_name: MOCK_PERSONAS.adviser.fullName,
        adviser_email: MOCK_PERSONAS.adviser.email,
        adviser_faculty_name: "Faculty of Computing",
        adviser_consultation_hours: "Tue & Thu, 13:00–16:00",
        student_id: MOCK_IDS.studentPrimary,
        start_date: "2024-08-01",
        end_date: null,
        handed_over_to_adviser_id: null,
        handed_over_to_name: null,
        handover_label: null,
        created_at: "2024-08-01T08:00:00Z",
      },
    ],
    studentCurriculumAssignments: [
      {
        id: MOCK_IDS.studentCurrAssignment1,
        student_id: MOCK_IDS.studentPrimary,
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        start_date: "2024-08-01",
        end_date: null,
        change_note: "Initial BSCS curriculum assignment",
        created_at: "2024-08-01T08:00:00Z",
      },
      {
        id: MOCK_IDS.studentCurrAssignment2,
        student_id: MOCK_IDS.studentSecondary,
        curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        start_date: "2024-08-01",
        end_date: null,
        change_note: "Initial BSCS curriculum assignment",
        created_at: "2024-08-01T08:00:00Z",
      },
    ],
    attempts: [
      {
        id: MOCK_IDS.attemptCsci102Inc,
        student_id: MOCK_IDS.studentPrimary,
        course_offering_id: MOCK_IDS.offeringCsci102,
        curriculum_term_course_id: MOCK_IDS.slotCsci102,
        status: "inc",
        midterm_status: "graded",
        midterm_grade: 2.0,
        final_grade: null,
        inc_deadline: "2027-05-30",
        instructor: "Prof. Maria Clara Santos",
        prerequisite_override: false,
        prerequisite_grade_override: false,
        units_attempted: 3,
        created_by: MOCK_IDS.adviserPrimary,
        updated_by: MOCK_IDS.adviserPrimary,
        revision: 1,
        created_at: "2026-05-20T08:00:00Z",
        updated_at: "2026-05-20T08:00:00Z",
      },
      {
        id: MOCK_IDS.attemptCsci153Open,
        student_id: MOCK_IDS.studentPrimary,
        course_offering_id: MOCK_IDS.offeringCsci153,
        curriculum_term_course_id: MOCK_IDS.slotCsci153,
        status: "currently_enrolled",
        midterm_status: "graded",
        midterm_grade: 1.75,
        final_grade: null,
        inc_deadline: null,
        instructor: "Dr. Jose Rizalino Gomez",
        prerequisite_override: true,
        prerequisite_grade_override: false,
        units_attempted: 3,
        created_by: MOCK_IDS.adviserPrimary,
        updated_by: MOCK_IDS.adviserPrimary,
        revision: 1,
        created_at: "2026-08-15T08:00:00Z",
        updated_at: "2026-08-15T08:00:00Z",
      },
      {
        // INC already completed in an editable term: target of INC completion corrections.
        id: MOCK_IDS.attemptPhEd11IncResolved,
        student_id: MOCK_IDS.studentPrimary,
        course_offering_id: MOCK_IDS.offeringPhEd11,
        curriculum_term_course_id: MOCK_IDS.slotPe1,
        status: "inc",
        midterm_status: "graded",
        midterm_grade: 2.0,
        final_grade: null,
        inc_deadline: "2027-12-18",
        instructor: MOCK_PERSONAS.adviser_secondary.fullName,
        prerequisite_override: false,
        prerequisite_grade_override: false,
        units_attempted: 2,
        created_by: MOCK_IDS.adviserPrimary,
        updated_by: MOCK_IDS.adviserPrimary,
        revision: 1,
        created_at: "2026-08-15T08:00:00Z",
        updated_at: "2026-08-15T08:00:00Z",
      },
    ],
    attemptResults: [
      {
        id: MOCK_IDS.attemptCsci102Inc,
        student_id: MOCK_IDS.studentPrimary,
        course_offering_id: MOCK_IDS.offeringCsci102,
        curriculum_term_course_id: MOCK_IDS.slotCsci102,
        recorded_status: "inc",
        midterm_status: "graded",
        midterm_grade: 2.0,
        final_grade: null,
        inc_deadline: "2027-05-30",
        instructor: "Prof. Maria Clara Santos",
        prerequisite_override: false,
        prerequisite_grade_override: false,
        grade_fix_history: [],
        units_attempted: 3,
        revision: 1,
        created_at: "2026-05-20T08:00:00Z",
        updated_at: "2026-05-20T08:00:00Z",
        completion_grade: null,
        resolved_at: null,
        effective_status: "inc",
        gwa_grade: null,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: false,
      },
      {
        id: MOCK_IDS.attemptCsci153Open,
        student_id: MOCK_IDS.studentPrimary,
        course_offering_id: MOCK_IDS.offeringCsci153,
        curriculum_term_course_id: MOCK_IDS.slotCsci153,
        recorded_status: "currently_enrolled",
        midterm_status: "graded",
        midterm_grade: 1.75,
        final_grade: null,
        inc_deadline: null,
        instructor: "Dr. Jose Rizalino Gomez",
        prerequisite_override: true,
        prerequisite_grade_override: false,
        grade_fix_history: [],
        units_attempted: 3,
        revision: 1,
        created_at: "2026-08-15T08:00:00Z",
        updated_at: "2026-08-15T08:00:00Z",
        completion_grade: null,
        resolved_at: null,
        effective_status: "currently_enrolled",
        gwa_grade: null,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: false,
      },
      {
        id: MOCK_IDS.attemptPhEd11IncResolved,
        student_id: MOCK_IDS.studentPrimary,
        course_offering_id: MOCK_IDS.offeringPhEd11,
        curriculum_term_course_id: MOCK_IDS.slotPe1,
        recorded_status: "inc",
        midterm_status: "graded",
        midterm_grade: 2.0,
        final_grade: null,
        inc_deadline: "2027-12-18",
        instructor: MOCK_PERSONAS.adviser_secondary.fullName,
        prerequisite_override: false,
        prerequisite_grade_override: false,
        grade_fix_history: [],
        units_attempted: 2,
        revision: 1,
        created_at: "2026-08-15T08:00:00Z",
        updated_at: "2026-08-15T08:00:00Z",
        completion_grade: 2.0,
        resolved_at: "2026-11-10T09:00:00Z",
        effective_status: "passed",
        gwa_grade: 2.0,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: true,
      },
    ],
    incResolutions: [
      {
        id: MOCK_IDS.incResolutionPhEd11,
        student_id: MOCK_IDS.studentPrimary,
        attempt_id: MOCK_IDS.attemptPhEd11IncResolved,
        completion_grade: 2.0,
        resolved_by: MOCK_IDS.adviserPrimary,
        resolved_at: "2026-11-10T09:00:00Z",
        updated_by: MOCK_IDS.adviserPrimary,
        updated_at: "2026-11-10T09:00:00Z",
        effective_status: "passed",
      },
    ],
    electiveMappings: [
      {
        id: MOCK_IDS.electiveMapping1,
        attempt_id: MOCK_IDS.attemptCsci153Open,
        curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
        mapped_by: MOCK_IDS.adviserPrimary,
        units_credited: 3,
        created_at: "2026-08-20T08:00:00Z",
        updated_at: "2026-08-20T08:00:00Z",
        student_id: MOCK_IDS.studentPrimary,
        revoked_at: null,
      },
    ],
    equivalencyDecisions: [
      {
        id: MOCK_IDS.equivalencyDecision1,
        attempt_id: MOCK_IDS.attemptCsci102Inc,
        destination_curriculum_term_course_id: MOCK_IDS.slotCsci102,
        decision_type: "transfer_equivalency",
        decided_by: MOCK_IDS.deptHeadDcst,
        decided_at: "2026-08-20T08:00:00Z",
        units_credited: 3,
        student_id: MOCK_IDS.studentPrimary,
        updated_at: "2026-08-20T08:00:00Z",
        revoked_at: null,
      },
    ],
    outsideCredits: [
      {
        id: MOCK_IDS.outsideCredit1,
        student_id: MOCK_IDS.studentPrimary,
        entry_type: "transferee",
        origin_school: "University of the Philippines Cebu",
        original_course_code: "CMSC 11",
        original_course_title: "Introduction to Computer Science",
        units: 3,
        grade: "1.50",
        destination_curriculum_term_course_id: MOCK_IDS.slotCsci101,
        units_credited: 3,
        decided_by: MOCK_IDS.deptHeadDcst,
        decided_at: "2026-08-10T08:00:00Z",
        revoked_at: null,
        updated_at: "2026-08-10T08:00:00Z",
      },
    ],
    curriculumTransferRequests: [
      {
        id: MOCK_IDS.transferRequest1,
        student_id: MOCK_IDS.studentPrimary,
        from_curriculum_version_id: MOCK_IDS.curriculumBscs2020,
        to_curriculum_version_id: MOCK_IDS.curriculumBscs2024,
        endorsed_by: MOCK_IDS.adviserPrimary,
        endorsement_note: "Endorsed transition to 2024 BSCS curriculum.",
        status: "pending",
        decided_by: null,
        decided_at: null,
        decision_note: null,
        carried_units: 36,
        created_at: "2026-09-01T08:00:00Z",
        updated_at: "2026-09-01T08:00:00Z",
      },
    ],
    advisingPlans: [
      {
        id: MOCK_IDS.advisingPlan1,
        student_id: MOCK_IDS.studentPrimary,
        school_term_id: MOCK_IDS.term2026Sem1Open,
        student_curriculum_assignment_id: MOCK_IDS.studentCurrAssignment1,
        created_by: MOCK_IDS.adviserPrimary,
        updated_by: MOCK_IDS.adviserPrimary,
        created_at: "2026-08-12T08:00:00Z",
        updated_at: "2026-08-12T08:00:00Z",
        revision: 1,
      },
    ],
    advisingPlanItems: [
      {
        id: MOCK_IDS.advisingPlanItem1,
        advising_plan_id: MOCK_IDS.advisingPlan1,
        student_id: MOCK_IDS.studentPrimary,
        school_term_id: MOCK_IDS.term2026Sem1Open,
        course_offering_id: MOCK_IDS.offeringCsci153,
        curriculum_term_course_id: MOCK_IDS.slotCsci153,
        display_order: 1,
        created_at: "2026-08-12T08:00:00Z",
      },
    ],
    advisingNotes: [
      {
        id: MOCK_IDS.advisingNote1,
        student_id: MOCK_IDS.studentPrimary,
        authored_by: MOCK_IDS.adviserPrimary,
        author_name: MOCK_PERSONAS.adviser.fullName,
        author_role_label: "Adviser",
        body_text:
          "Student advised to complete CSCI 102 INC requirements before midterms.",
        is_archived: false,
        archived_at: null,
        archived_by: null,
        created_at: "2026-08-12T09:00:00Z",
      },
    ],
    attemptRemarks: [
      {
        id: MOCK_IDS.attemptRemark1,
        student_id: MOCK_IDS.studentPrimary,
        authored_by: MOCK_IDS.adviserPrimary,
        body_text: "Missing final laboratory project submission.",
        created_at: "2026-05-20T08:05:00Z",
        attempt_id: MOCK_IDS.attemptCsci102Inc,
        curriculum_term_course_id: MOCK_IDS.slotCsci102,
      },
    ],
    gradeFlags: [
      {
        id: MOCK_IDS.gradeFlag1,
        student_id: MOCK_IDS.studentPrimary,
        attempt_id: MOCK_IDS.attemptCsci153Open,
        reported_stage: "midterm",
        reported_grade_text: "1.50",
        issue_type: "wrong_grade",
        details: "Class card shows 1.50 for midterm exam computation.",
        status: "open",
        resolution_action: null,
        corrected_grade: null,
        corrected_status: null,
        resolution_note: null,
        resolved_by: null,
        resolved_at: null,
        created_at: "2026-10-10T08:00:00Z",
        updated_at: "2026-10-10T08:00:00Z",
      },
    ],
    notifications: [
      {
        id: MOCK_IDS.notification1,
        recipient_id: MOCK_IDS.studentPrimary,
        kind: "note",
        event_type: "advising_note_added",
        title: "New advising note from Prof. Maria Clara Santos",
        body: "Your adviser added a note regarding your 1st Semester 2026-2027 advising plan.",
        target_route: "/student/dashboard",
        target_student_id: MOCK_IDS.studentPrimary,
        actor_id: MOCK_IDS.adviserPrimary,
        entity_type: "advising_note",
        entity_id: MOCK_IDS.advisingNote1,
        dedupe_key: null,
        email_delivery_status: "sent",
        is_read: false,
        read_at: null,
        created_at: "2026-08-12T09:00:00Z",
      },
    ],
    systemSettings: [
      {
        id: "93000000-0000-4000-8000-000000000001",
        department_id: MOCK_IDS.deptDcst,
        warning_pct: 25,
        probation_pct: 50,
        dismissal_pct: 75,
        sender_email: "saais-noreply@vsu.edu.ph",
        last_backup_at: "2026-10-15T06:00:00Z",
        last_backup_by: MOCK_IDS.systemAdmin,
        last_backup_reference: "BKP-2026-10-15-001",
        last_backup_location: "vsu-saais-backups/2026-10-15.dump",
        last_backup_scope: "institution_wide",
        updated_at: "2026-10-15T06:00:00Z",
      },
      {
        id: "93000000-0000-4000-8000-000000000002",
        department_id: null,
        warning_pct: 25,
        probation_pct: 50,
        dismissal_pct: 75,
        sender_email: "saais-noreply@vsu.edu.ph",
        last_backup_at: "2026-11-10T09:00:00Z",
        last_backup_by: MOCK_IDS.systemAdmin,
        last_backup_reference: "BKP-2026-11-10-001",
        last_backup_location: "vsu-saais-backups/2026-11-10.dump",
        last_backup_scope: "institution_wide",
        updated_at: "2026-11-10T09:00:00Z",
      },
    ],
    auditLogEntries: [
      {
        id: MOCK_IDS.auditLog1,
        actor_id: MOCK_IDS.adviserPrimary,
        actor_name: MOCK_PERSONAS.adviser.fullName,
        actor_role: "adviser",
        student_id: MOCK_IDS.studentPrimary,
        student_name: MOCK_PERSONAS.student.fullName,
        student_number: "24-1-01798",
        target_label: `24-1-01798 · ${MOCK_PERSONAS.student.fullName}`,
        action: "advising_plan_saved",
        action_category: "plan_save",
        entity_type: "advising_plan",
        entity_id: MOCK_IDS.advisingPlan1,
        details_summary:
          "Saved advising plan (1 course, 3 units) for 1st Semester 2026-2027.",
        old_value: null,
        new_value: null,
        reason: null,
        created_at: "2026-08-12T08:00:00Z",
      },
      {
        id: MOCK_IDS.auditLog2,
        actor_id: MOCK_IDS.deptHeadDcst,
        actor_name: MOCK_PERSONAS.department_head.fullName,
        actor_role: "department_head",
        student_id: null,
        student_name: null,
        student_number: null,
        target_label: "DCST · Department Report",
        action: "report_viewed",
        action_category: "view",
        entity_type: "department_report",
        entity_id: MOCK_IDS.deptDcst,
        details_summary: "Viewed DCST department cohort analytics report.",
        old_value: null,
        new_value: null,
        reason: null,
        created_at: "2026-10-01T10:00:00Z",
      },
    ],
  };
  const engineeringAdviser = MOCK_PERSONAS.adviser_engineering;
  db.profiles.push({
    id: engineeringAdviser.profileId,
    role: "adviser",
    roles: ["adviser"],
    email: engineeringAdviser.email,
    full_name: engineeringAdviser.fullName,
    student_number: null,
    status: "active",
    invitation_status: "accepted",
    faculty_id: MOCK_IDS.facultyEngineering,
    department_id: MOCK_IDS.deptDabe,
    created_at: "2026-07-01T08:00:00Z",
    updated_at: "2026-07-01T08:00:00Z",
  });
  db.roleAssignments.push({
    id: "92000000-0000-4000-8002-000000000001",
    profile_id: engineeringAdviser.profileId,
    role: "adviser",
    faculty_id: MOCK_IDS.facultyEngineering,
    department_id: MOCK_IDS.deptDabe,
    created_at: "2026-07-01T08:00:00Z",
  });
  db.programs.push({
    id: MOCK_IDS.programBsabe,
    department_id: MOCK_IDS.deptDabe,
    code: "BSABE",
    name: "Bachelor of Science in Agricultural and Biosystems Engineering",
    nominal_duration: 4,
    status: "active",
  });
  db.curriculumVersions.push({
    id: MOCK_IDS.curriculumBsabe,
    program_id: MOCK_IDS.programBsabe,
    version_label: "BSABE 2024-2025 v1",
    effective_start: "2024-08-01",
    effective_end: null,
    delinquency_threshold: 24,
    total_units: 160,
    status: "active",
    enrolled_student_count: 1,
  });
  const engineeringAssignment = "71000000-0000-4000-8002-000000000001";
  db.studentCurriculumAssignments.push({
    id: engineeringAssignment,
    student_id: MOCK_IDS.studentOtherDept,
    curriculum_version_id: MOCK_IDS.curriculumBsabe,
    start_date: "2024-08-01",
    end_date: null,
    change_note: "Initial curriculum assignment",
    created_at: "2024-08-01T08:00:00Z",
  });
  db.studentOrganizations.push({
    student_id: MOCK_IDS.studentOtherDept,
    student_curriculum_assignment_id: engineeringAssignment,
    curriculum_version_id: MOCK_IDS.curriculumBsabe,
    program_id: MOCK_IDS.programBsabe,
    department_id: MOCK_IDS.deptDabe,
    faculty_id: MOCK_IDS.facultyEngineering,
    adviser_id: engineeringAdviser.profileId,
    entry_year: 2024,
  });
  db.adviserAssignments.push({
    id: "70000000-0000-4000-8002-000000000001",
    student_id: MOCK_IDS.studentOtherDept,
    adviser_id: engineeringAdviser.profileId,
    adviser_name: engineeringAdviser.fullName,
    adviser_email: engineeringAdviser.email,
    start_date: "2024-08-01",
    end_date: null,
    created_at: "2024-08-01T08:00:00Z",
  });
  db.studentOrganizations.find(
    (item) => item.student_id === MOCK_IDS.studentSecondary,
  )!.adviser_id = MOCK_IDS.adviserSecondary;
  db.adviserAssignments.push({
    id: "70000000-0000-4000-8002-000000000002",
    student_id: MOCK_IDS.studentSecondary,
    adviser_id: MOCK_IDS.adviserSecondary,
    adviser_name: MOCK_PERSONAS.adviser_secondary.fullName,
    adviser_email: MOCK_PERSONAS.adviser_secondary.email,
    start_date: "2024-08-01",
    end_date: null,
    created_at: "2024-08-01T08:00:00Z",
  });
  const engineeringTerm = "41000000-0000-4000-8002-000000000001";
  const engineeringSlot = "42000000-0000-4000-8002-000000000001";
  const engineeringCourse = "50000000-0000-4000-8002-000000000001";
  const engineeringOffering = "62000000-0000-4000-8002-000000000001";
  const engineeringAttempt = "80000000-0000-4000-8006-000000000001";
  db.curriculumTerms.push({
    id: engineeringTerm,
    curriculum_version_id: MOCK_IDS.curriculumBsabe,
    year_level: 1,
    term_sequence: 1,
  });
  db.courses.push({
    id: engineeringCourse,
    department_id: MOCK_IDS.deptDabe,
    code: "ABE 101",
    title: "Introduction to Biosystems Engineering",
    category: "major",
    units: 3,
    is_elective: false,
    status: "active",
    repeatable_type: "none",
  });
  db.curriculumTermCourses.push({
    id: engineeringSlot,
    curriculum_term_id: engineeringTerm,
    course_id: engineeringCourse,
    is_elective_slot: false,
    slot_type: "required",
    slot_label: null,
    nominal_units: 3,
  });
  db.courseOfferings.push({
    id: engineeringOffering,
    school_term_id: MOCK_IDS.term2026Sem1Open,
    course_id: engineeringCourse,
    section: "A",
    schedule: "MWF 10:00-11:00",
    instructor: engineeringAdviser.fullName,
    is_by_request: false,
  });
  const engineeringAttemptCommon = {
    id: engineeringAttempt,
    student_id: MOCK_IDS.studentOtherDept,
    course_offering_id: engineeringOffering,
    curriculum_term_course_id: engineeringSlot,
    midterm_status: "graded" as const,
    midterm_grade: 2,
    final_grade: 1.75,
    inc_deadline: null,
    instructor: engineeringAdviser.fullName,
    prerequisite_override: false,
    prerequisite_grade_override: false,
    units_attempted: 3,
    revision: 1,
    created_at: "2026-08-15T08:00:00Z",
    updated_at: "2026-11-10T08:00:00Z",
  };
  db.attempts.push({
    ...engineeringAttemptCommon,
    status: "passed",
    created_by: engineeringAdviser.profileId,
    updated_by: engineeringAdviser.profileId,
  });
  db.attemptResults.push({
    ...engineeringAttemptCommon,
    recorded_status: "passed",
    effective_status: "passed",
    grade_fix_history: [],
    completion_grade: null,
    resolved_at: null,
    gwa_grade: 1.75,
    is_lapsed_inc: false,
    is_repeated: false,
    counts_toward_cumulative_gwa: true,
  });
  const engineeringNoteId = "87000000-0000-4000-8002-000000000001";
  db.advisingNotes.push({
    id: engineeringNoteId,
    student_id: MOCK_IDS.studentOtherDept,
    authored_by: engineeringAdviser.profileId,
    author_name: engineeringAdviser.fullName,
    author_role_label: "Adviser",
    body_text: "Review your course progress before the next advising meeting.",
    is_archived: false,
    archived_at: null,
    archived_by: null,
    created_at: "2026-11-10T08:00:00Z",
  });
  db.notifications.push({
    id: "90000000-0000-4000-8003-000000000001",
    recipient_id: MOCK_IDS.studentOtherDept,
    kind: "note",
    event_type: "advising_note_added",
    title: "New advising note",
    body: "Your adviser added a note to your record.",
    target_route: "/student/dashboard",
    target_student_id: MOCK_IDS.studentOtherDept,
    actor_id: engineeringAdviser.profileId,
    entity_type: "advising_note",
    entity_id: engineeringNoteId,
    dedupe_key: null,
    email_delivery_status: "sent",
    is_read: false,
    read_at: null,
    created_at: "2026-11-10T08:00:00Z",
  });
  db.notifications.push({
    id: "90000000-0000-4000-8003-000000000002",
    recipient_id: engineeringAdviser.profileId,
    kind: "person",
    event_type: "adviser_assigned",
    title: "A student was assigned to you",
    body: `${MOCK_PERSONAS.student_other_dept.fullName} is on your advising list.`,
    target_route: "/adviser/advisees",
    target_student_id: MOCK_IDS.studentOtherDept,
    actor_id: null,
    entity_type: "adviser_assignment",
    entity_id: "70000000-0000-4000-8002-000000000001",
    dedupe_key: null,
    email_delivery_status: "sent",
    is_read: false,
    read_at: null,
    created_at: "2026-11-10T08:00:00Z",
  });
  db.courseOfferings.push({
    id: MOCK_IDS.offeringCsci101,
    school_term_id: MOCK_IDS.term2026Sem1Open,
    course_id: MOCK_IDS.courseCsci101,
    section: "S1",
    schedule: "MWF 08:00-09:00",
    instructor: MOCK_PERSONAS.adviser.fullName,
    is_by_request: false,
  });
  db.courseOfferings.push({
    id: MOCK_IDS.offeringNstp11,
    school_term_id: MOCK_IDS.term2026Sem1Open,
    course_id: MOCK_IDS.courseNstp11,
    section: "N1",
    schedule: "Sat 10:00-12:00",
    instructor: MOCK_PERSONAS.adviser.fullName,
    is_by_request: false,
  });
  for (let index = 0; index < 29; index += 1) {
    const serial = index + 1;
    const suffix = String(serial).padStart(12, "0");
    const persona = MOCK_PERSONAS[`student_sample_${serial}`]!;
    const adviser =
      index === 28
        ? MOCK_PERSONAS.adviser
        : index < 24
          ? index % 2 === 0
            ? MOCK_PERSONAS.adviser
            : MOCK_PERSONAS.adviser_secondary
          : [
              MOCK_PERSONAS.department_head,
              MOCK_PERSONAS.dean,
              MOCK_PERSONAS.dean_dept_head,
              MOCK_PERSONAS.admin,
            ][index - 24]!;
    // Sample 23 can request a transfer to the active 2024 curriculum.
    const curriculumVersionId =
      serial === 23 ? MOCK_IDS.curriculumBscs2020 : MOCK_IDS.curriculumBscs2024;
    const curriculumAssignmentId = `71000000-0000-4000-8001-${suffix}`;
    const studentNumber = `26-${serial === 10 ? 2 : 1}-${String(10001 + index)}`;
    db.profiles.push({
      id: persona.profileId,
      role: "student",
      roles: ["student"],
      email: persona.email,
      full_name: persona.fullName,
      student_number: studentNumber,
      status: "active",
      invitation_status: "accepted",
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      created_at: "2026-08-01T08:00:00Z",
      updated_at: "2026-08-01T08:00:00Z",
    });
    db.roleAssignments.push({
      id: `92000000-0000-4000-8001-${suffix}`,
      profile_id: persona.profileId,
      role: "student",
      faculty_id: MOCK_IDS.facultyComputing,
      department_id: MOCK_IDS.deptDcst,
      created_at: "2026-08-01T08:00:00Z",
    });
    db.studentCurriculumAssignments.push({
      id: curriculumAssignmentId,
      student_id: persona.profileId,
      curriculum_version_id: curriculumVersionId,
      start_date: "2026-08-01",
      end_date: null,
      change_note: "Initial curriculum assignment",
      created_at: "2026-08-01T08:00:00Z",
    });
    db.studentOrganizations.push({
      student_id: persona.profileId,
      student_curriculum_assignment_id: curriculumAssignmentId,
      curriculum_version_id: curriculumVersionId,
      program_id: MOCK_IDS.programBscs,
      department_id: MOCK_IDS.deptDcst,
      faculty_id: MOCK_IDS.facultyComputing,
      adviser_id: adviser.profileId,
      entry_year: 2026,
    });
    db.adviserAssignments.push({
      id: `70000000-0000-4000-8001-${suffix}`,
      student_id: persona.profileId,
      adviser_id: adviser.profileId,
      adviser_name: adviser.fullName,
      adviser_email: adviser.email,
      start_date: "2026-08-01",
      end_date: null,
      created_at: "2026-08-01T08:00:00Z",
    });
    const noteId = `87000000-0000-4000-8001-${suffix}`;
    const archived = index % 3 === 0;
    db.advisingNotes.push({
      id: noteId,
      student_id: persona.profileId,
      authored_by: adviser.profileId,
      author_name: adviser.fullName,
      author_role_label: "Adviser",
      body_text: "Discuss your first-semester progress with your adviser.",
      is_archived: archived,
      archived_at: archived ? "2026-10-01T08:00:00Z" : null,
      archived_by: archived ? adviser.profileId : null,
      created_at: "2026-09-01T08:00:00Z",
    });
    db.notifications.push({
      id: `90000000-0000-4000-8001-${suffix}`,
      recipient_id: persona.profileId,
      kind: "note",
      event_type: "advising_note_added",
      title: "New advising note",
      body: "Your adviser added a note to your record.",
      target_route: "/student/dashboard",
      target_student_id: persona.profileId,
      actor_id: adviser.profileId,
      entity_type: "advising_note",
      entity_id: noteId,
      dedupe_key: null,
      email_delivery_status: "sent",
      is_read: false,
      read_at: null,
      created_at: "2026-09-01T08:00:00Z",
    });
    for (const [courseIndex, offeringId] of [
      MOCK_IDS.offeringCsci101,
      MOCK_IDS.offeringPhEd11,
    ].entries()) {
      const offering = db.courseOfferings.find(
        (item) => item.id === offeringId,
      )!;
      const attemptId = `80000000-0000-4000-800${courseIndex + 2}-${suffix}`;
      const scenario =
        index < 4 || courseIndex === 1
          ? "currently_enrolled"
          : ["passed", "failed", "inc", "currently_enrolled"][index % 4]!;
      const finalGrade =
        scenario === "passed"
          ? [1.25, 1.75, 2.25, 2.75][Math.floor(index / 4) % 4]!
          : scenario === "failed"
            ? 5
            : null;
      const common = {
        id: attemptId,
        student_id: persona.profileId,
        course_offering_id: offeringId,
        curriculum_term_course_id:
          courseIndex === 0 ? MOCK_IDS.slotCsci101 : MOCK_IDS.slotPe1,
        midterm_status:
          scenario === "currently_enrolled" ? null : ("graded" as const),
        midterm_grade: scenario === "currently_enrolled" ? null : 2.25,
        final_grade: finalGrade,
        inc_deadline: scenario === "inc" ? "2027-12-18" : null,
        instructor: offering.instructor ?? null,
        prerequisite_override: false,
        prerequisite_grade_override: false,
        units_attempted: courseIndex === 0 ? 3 : 2,
        revision: 1,
        created_at: "2026-08-15T08:00:00Z",
        updated_at: "2026-08-15T08:00:00Z",
      };
      db.attempts.push({
        ...common,
        status: scenario as ApiSchema<"AttemptStatus">,
        created_by: adviser.profileId,
        updated_by: adviser.profileId,
      });
      db.attemptResults.push({
        ...common,
        recorded_status: scenario as ApiSchema<"AttemptStatus">,
        effective_status: scenario as ApiSchema<"AttemptStatus">,
        grade_fix_history: [],
        completion_grade: null,
        resolved_at: null,
        gwa_grade: finalGrade,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: finalGrade !== null,
      });
    }
    const planId = `86000000-0000-4000-8001-${suffix}`;
    db.advisingPlans.push({
      id: planId,
      student_id: persona.profileId,
      school_term_id: MOCK_IDS.term2026Sem1Open,
      student_curriculum_assignment_id: curriculumAssignmentId,
      created_by: adviser.profileId,
      updated_by: adviser.profileId,
      created_at: "2026-09-01T08:00:00Z",
      updated_at: "2026-09-01T08:00:00Z",
      revision: 1,
    });
    db.advisingPlanItems.push({
      id: `86100000-0000-4000-8001-${suffix}`,
      advising_plan_id: planId,
      student_id: persona.profileId,
      school_term_id: MOCK_IDS.term2026Sem1Open,
      course_offering_id: MOCK_IDS.offeringPhEd11,
      curriculum_term_course_id: MOCK_IDS.slotPe1,
      display_order: 1,
      created_at: "2026-09-01T08:00:00Z",
    });
    db.auditLogEntries.push({
      id: `91000000-0000-4000-8001-${suffix}`,
      actor_id: adviser.profileId,
      actor_name: adviser.fullName,
      actor_role: "adviser",
      student_id: persona.profileId,
      student_name: persona.fullName,
      student_number: studentNumber,
      target_label: `${studentNumber} · ${persona.fullName}`,
      action: "advising_plan_saved",
      action_category: "plan_save",
      entity_type: "advising_plan",
      entity_id: planId,
      details_summary: "Saved a first-semester advising plan.",
      old_value: null,
      new_value: null,
      reason: null,
      created_at: "2026-09-01T08:00:00Z",
    });
  }
  for (const serial of [5, 6, 9]) {
    const student = MOCK_PERSONAS[`student_sample_${serial}`]!;
    const attemptId = `80000000-0000-4000-8002-${String(serial).padStart(12, "0")}`;
    db.gradeFlags.push({
      id: `89000000-0000-4000-8001-${String(serial).padStart(12, "0")}`,
      student_id: student.profileId,
      attempt_id: attemptId,
      reported_stage: "midterm",
      reported_grade_text: "2.00",
      issue_type: "wrong_grade",
      details:
        "Please review the posted midterm grade against the class record.",
      status: "open",
      resolution_action: null,
      corrected_grade: null,
      corrected_status: null,
      resolution_note: null,
      resolved_by: null,
      resolved_at: null,
      created_at: "2026-10-10T08:00:00Z",
      updated_at: "2026-10-10T08:00:00Z",
    });
  }
  db.outsideCredits.push({
    id: "84000000-0000-4000-8001-000000000010",
    student_id: MOCK_PERSONAS.student_sample_10.profileId,
    entry_type: "transferee",
    origin_school: "Eastern Visayas College",
    original_course_code: "NSTP 101",
    original_course_title: "National Service Training Program I",
    units: 3,
    grade: "1.75",
    destination_curriculum_term_course_id: MOCK_IDS.slotNstp1,
    units_credited: 3,
    decided_by: MOCK_IDS.deptHeadDcst,
    decided_at: "2026-08-10T08:00:00Z",
    revoked_at: null,
    updated_at: "2026-08-10T08:00:00Z",
  });
  db.curriculumTransferRequests.push({
    id: "85000000-0000-4000-8001-000000000007",
    student_id: MOCK_PERSONAS.student_sample_7.profileId,
    from_curriculum_version_id: MOCK_IDS.curriculumBscs2024,
    to_curriculum_version_id: MOCK_IDS.curriculumBsabe,
    endorsed_by: MOCK_IDS.adviserPrimary,
    endorsement_note: "Endorsed for review by the destination department.",
    status: "pending",
    decided_by: null,
    decided_at: null,
    decision_note: null,
    carried_units: 0,
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  });
  // A separate full checklist scenario preserves the existing catalog's titles for shared course codes.
  db.curriculumVersions.push({
    id: MOCK_IDS.curriculumReference,
    program_id: MOCK_IDS.programBscs,
    version_label: "BSCS reference 2025 v1",
    effective_start: "2025-08-01",
    effective_end: null,
    delinquency_threshold: 24,
    total_units: REFERENCE_CURRICULUM.reduce(
      (sum, item) => sum + item.units,
      0,
    ),
    status: "active",
    enrolled_student_count: 1,
  });
  const referenceTerms = new Map<string, string>();
  REFERENCE_CURRICULUM.forEach((item, index) => {
    const termKey = `${item.year}-${item.term}`;
    if (!referenceTerms.has(termKey)) {
      const termId = `41000000-0000-4000-8004-${String(referenceTerms.size + 1).padStart(12, "0")}`;
      referenceTerms.set(termKey, termId);
      db.curriculumTerms.push({
        id: termId,
        curriculum_version_id: MOCK_IDS.curriculumReference,
        year_level: item.year,
        term_sequence: item.term,
      });
    }
    let course = db.courses.find(
      (entry) => entry.code.toUpperCase() === item.code,
    );
    if (!item.elective && !course) {
      const category: ApiSchema<"CourseCategory"> = item.code.startsWith(
        "PHED ",
      )
        ? "pe"
        : item.code.startsWith("NSTP ")
          ? "nstp"
          : /^(CSCI|CSIT) /.test(item.code)
            ? "major"
            : "ge";
      course = {
        id: `50000000-0000-4000-8004-${String(index + 1).padStart(12, "0")}`,
        department_id: MOCK_IDS.deptDcst,
        code: item.code,
        title: item.title,
        category,
        units: item.units,
        is_elective: false,
        status: "active",
        repeatable_type: "none",
      };
      db.courses.push(course);
    }
    const slotId = `42000000-0000-4000-8004-${String(index + 1).padStart(12, "0")}`;
    db.curriculumTermCourses.push({
      id: slotId,
      curriculum_term_id: referenceTerms.get(termKey)!,
      course_id: item.elective ? null : course!.id,
      is_elective_slot: item.elective,
      slot_type: item.elective
        ? "elective"
        : item.code.startsWith("PHED ")
          ? "pe"
          : item.code.startsWith("NSTP ")
            ? "nstp"
            : "required",
      slot_label: item.elective ? item.code : null,
      nominal_units: item.units,
    });
  });
  // These offerings populate the next eligible curriculum term in the reference advising scenario.
  ["CSCI 126", "CSCI 154", "CSCI 183", "HUMN 11"].forEach((code, index) => {
    const course = db.courses.find((item) => item.code === code)!;
    db.courseOfferings.push({
      id: `62000000-0000-4000-8006-${String(index + 1).padStart(12, "0")}`,
      school_term_id: MOCK_IDS.term2026Sem1Open,
      course_id: course.id,
      section: "R1",
      schedule: "Schedule available from department",
      instructor: MOCK_PERSONAS.adviser.fullName,
      is_by_request: false,
    });
  });
  const referenceStudent = MOCK_PERSONAS.student_sample_29;
  const org = db.studentOrganizations.find(
    (item) => item.student_id === referenceStudent.profileId,
  )!;
  const assignment = db.studentCurriculumAssignments.find(
    (item) =>
      item.student_id === referenceStudent.profileId && item.end_date === null,
  )!;
  org.curriculum_version_id = MOCK_IDS.curriculumReference;
  assignment.curriculum_version_id = MOCK_IDS.curriculumReference;
  const referenceId = referenceStudent.profileId;
  const referenceProfile = db.profiles.find((item) => item.id === referenceId)!;
  referenceProfile.student_number = "25-1-10029";
  org.entry_year = 2025;
  assignment.start_date = "2025-08-01";
  const initialAdviser = db.adviserAssignments.find(
    (item) => item.student_id === referenceId && item.end_date === null,
  )!;
  initialAdviser.start_date = "2025-08-01";
  const referenceAudit = db.auditLogEntries.find(
    (item) => item.student_id === referenceId,
  )!;
  db.auditLogEntries[db.auditLogEntries.indexOf(referenceAudit)] = {
    ...referenceAudit,
    student_number: referenceProfile.student_number,
    target_label: `${referenceProfile.student_number} · ${referenceStudent.fullName}`,
  };
  db.attempts = db.attempts.filter((item) => item.student_id !== referenceId);
  db.attemptResults = db.attemptResults.filter(
    (item) => item.student_id !== referenceId,
  );
  const firstTermId = "60000000-0000-4000-8004-000000000001";
  db.schoolTerms.push({
    id: firstTermId,
    start_year: 2025,
    end_year: 2026,
    term_type: "1st Semester",
    school_year: "2025 - 2026",
    is_locked: true,
    override_flag: false,
    override_actor_id: null,
    override_at: null,
    starts_on: "2025-08-04",
    ends_on: "2025-12-19",
    encoding_deadline: "2026-01-05",
    closed_by: MOCK_IDS.systemAdmin,
    closed_at: "2026-01-05T09:00:00Z",
    closure_note: null,
    default_inc_deadline: "2026-12-19",
    chronological_key: 20251,
  });
  const priorGrades: Record<string, number> = {
    "CSIT 100": 1.5,
    "CSIT 101": 1.75,
    "CSCI 180": 2,
    "COMM 11": 1.25,
    "ENTR 11": 1.5,
    "ITEC 11": 1.75,
    "SCSC 11": 2,
    "PHED 11": 1,
    "NSTP 11": 1,
    "CSIT 102": 1.5,
    "CSCI 121": 2,
    "CSCI 181": 1.75,
    "MATH 11": 2,
    "SCSC 12": 1.5,
    "PHED 12": 1,
    "NSTP 12": 1,
  };
  const currentCourses = new Set([
    "CSIT 103",
    "CSIT 104",
    "CSIT 105",
    "CSCI 103",
    "CSCI 122",
    "CSCI 182",
    "SCSC 13",
    "PHED 13",
  ]);
  let currentPlanOffering = "";
  let currentPlanSlot = "";
  REFERENCE_CURRICULUM.forEach((item, index) => {
    const grade = priorGrades[item.code];
    const incomplete = item.code === "CSCI 102";
    const enrolled = currentCourses.has(item.code);
    if (grade === undefined && !incomplete && !enrolled) return;
    const slot = db.curriculumTermCourses.find(
      (row) =>
        row.id ===
        `42000000-0000-4000-8004-${String(index + 1).padStart(12, "0")}`,
    )!;
    const course = db.courses.find((row) => row.id === slot.course_id)!;
    const termId =
      item.year === 1 && item.term === 1
        ? firstTermId
        : item.year === 1
          ? MOCK_IDS.term2025Sem2Closed
          : MOCK_IDS.term2026Sem1Open;
    const offeringId = `62000000-0000-4000-8005-${String(index + 1).padStart(12, "0")}`;
    const attemptId = `80000000-0000-4000-8005-${String(index + 1).padStart(12, "0")}`;
    const status: ApiSchema<"AttemptStatus"> = enrolled
      ? "currently_enrolled"
      : incomplete
        ? "inc"
        : "passed";
    const createdAt =
      termId === firstTermId
        ? "2025-08-15T08:00:00Z"
        : termId === MOCK_IDS.term2025Sem2Closed
          ? "2026-01-15T08:00:00Z"
          : "2026-08-15T08:00:00Z";
    db.courseOfferings.push({
      id: offeringId,
      school_term_id: termId,
      course_id: course.id,
      section: "R1",
      schedule: "Schedule available from department",
      instructor: MOCK_PERSONAS.adviser.fullName,
      is_by_request: false,
    });
    const common = {
      id: attemptId,
      student_id: referenceId,
      course_offering_id: offeringId,
      curriculum_term_course_id: slot.id,
      midterm_status: "graded" as const,
      midterm_grade: grade ?? 2,
      final_grade: grade ?? null,
      inc_deadline: incomplete ? "2027-05-30" : null,
      instructor: MOCK_PERSONAS.adviser.fullName,
      prerequisite_override: incomplete,
      prerequisite_grade_override: false,
      units_attempted: slot.nominal_units,
      revision: 1,
      created_at: createdAt,
      updated_at: createdAt,
    };
    db.attempts.push({
      ...common,
      status,
      created_by: MOCK_IDS.adviserPrimary,
      updated_by: MOCK_IDS.adviserPrimary,
    });
    db.attemptResults.push({
      ...common,
      recorded_status: status,
      effective_status: status,
      grade_fix_history: [],
      completion_grade: null,
      resolved_at: null,
      gwa_grade: grade ?? null,
      is_lapsed_inc: false,
      is_repeated: false,
      counts_toward_cumulative_gwa: grade !== undefined,
    });
    if (incomplete) {
      db.auditLogEntries.push({
        id: "91000000-0000-4000-8004-000000000001",
        actor_id: MOCK_IDS.adviserPrimary,
        actor_name: MOCK_PERSONAS.adviser.fullName,
        actor_role: "adviser",
        student_id: referenceId,
        student_name: MOCK_PERSONAS.student_sample_29.fullName,
        student_number: "25-1-10029",
        target_label: `25-1-10029 · ${MOCK_PERSONAS.student_sample_29.fullName}`,
        action: "prerequisite_override_recorded",
        action_category: "override",
        entity_type: "attempt",
        entity_id: attemptId,
        details_summary: "Recorded an approved prerequisite override.",
        old_value: null,
        new_value: null,
        reason:
          "Department approved entry after reviewing the student's prior preparation.",
        created_at: createdAt,
      });
    }
    if (item.code === "CSIT 103") {
      currentPlanOffering = offeringId;
      currentPlanSlot = slot.id;
    }
  });
  for (const item of db.advisingPlanItems.filter(
    (row) => row.student_id === referenceId,
  )) {
    item.course_offering_id = currentPlanOffering;
    item.curriculum_term_course_id = currentPlanSlot;
  }
  let missingRoleIndex = 0;
  for (const persona of Object.values(MOCK_PERSONAS)) {
    if (!db.profiles.some((profile) => profile.id === persona.profileId))
      continue;
    for (const scope of persona.roleScopes) {
      if (
        db.roleAssignments.some(
          (assignment) =>
            assignment.profile_id === persona.profileId &&
            assignment.role === scope.role,
        )
      )
        continue;
      missingRoleIndex += 1;
      db.roleAssignments.push({
        id: `92000000-0000-4000-8003-${String(missingRoleIndex).padStart(12, "0")}`,
        profile_id: persona.profileId,
        role: scope.role,
        faculty_id:
          scope.scope_type === "institution" ? null : persona.facultyId,
        department_id:
          scope.scope_type === "department" ? scope.scope_id : null,
        created_at: "2026-07-01T08:00:00Z",
      });
    }
  }
  // Sample student 4 has 26 failed units in one term, above this curriculum's 24-unit threshold.
  const delinquentStudent = MOCK_PERSONAS.student_sample_4!;
  const initialAttempts = db.attempts.filter(
    (a) => a.student_id === delinquentStudent.profileId,
  );
  for (const attempt of initialAttempts) {
    attempt.status = "failed";
    attempt.final_grade = 5;
    const result = db.attemptResults.find((a) => a.id === attempt.id)!;
    Object.assign(result, {
      recorded_status: "failed",
      effective_status: "failed",
      final_grade: 5,
      gwa_grade: 5,
      counts_toward_cumulative_gwa: true,
    });
  }
  const extraCourseIds: string[] = [
    MOCK_IDS.courseCsci102,
    MOCK_IDS.courseCsci153,
    MOCK_IDS.courseCsci198,
    MOCK_IDS.courseNstp11,
  ];
  for (let index = 1; index <= 3; index += 1) {
    const id = `44000000-0000-4000-8004-${String(index).padStart(12, "0")}`;
    db.courses.push({
      id,
      department_id: MOCK_IDS.deptDcst,
      code: `MATH ${120 + index}`,
      title: `Mathematics ${index}`,
      category: "major",
      units: 3,
      is_elective: false,
      status: "active",
      repeatable_type: "none",
    });
    extraCourseIds.push(id);
  }
  for (const [index, courseId] of extraCourseIds.entries()) {
    const suffix = String(index + 1).padStart(12, "0");
    const offeringId = `66000000-0000-4000-8004-${suffix}`;
    const course = db.courses.find((c) => c.id === courseId)!;
    db.courseOfferings.push({
      id: offeringId,
      course_id: courseId,
      school_term_id: MOCK_IDS.term2026Sem1Open,
      section: "D",
      instructor: MOCK_PERSONAS.adviser_secondary.fullName,
      is_by_request: false,
    });
    const common = {
      id: `80000000-0000-4000-8004-${suffix}`,
      student_id: delinquentStudent.profileId,
      course_offering_id: offeringId,
      curriculum_term_course_id:
        db.curriculumTermCourses.find((s) => s.course_id === courseId)?.id ??
        null,
      midterm_status: null,
      midterm_grade: null,
      final_grade: 5,
      inc_deadline: null,
      instructor: MOCK_PERSONAS.adviser_secondary.fullName,
      prerequisite_override:
        courseId === MOCK_IDS.courseCsci102 ||
        courseId === MOCK_IDS.courseCsci153,
      prerequisite_grade_override: false,
      units_attempted: course.units,
      revision: 1,
      created_at: "2026-08-15T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    };
    db.attempts.push({
      ...common,
      status: "failed",
      created_by: MOCK_IDS.adviserSecondary,
      updated_by: MOCK_IDS.adviserSecondary,
    });
    db.attemptResults.push({
      ...common,
      recorded_status: "failed",
      effective_status: "failed",
      completion_grade: null,
      resolved_at: null,
      gwa_grade: 5,
      is_lapsed_inc: false,
      is_repeated: false,
      counts_toward_cumulative_gwa: true,
    });
  }
  db.curriculumVersions = db.curriculumVersions.map((curriculum) => ({
    ...curriculum,
    enrolled_student_count: db.studentCurriculumAssignments.filter(
      (assignment) =>
        assignment.curriculum_version_id === curriculum.id &&
        assignment.end_date === null,
    ).length,
  }));
  // Shared, recipient-owned notifications mirror the role workflows in the prototype.
  const roleNotifications: Array<
    Omit<ApiSchema<"Notification">, "id" | "is_read" | "read_at" | "created_at">
  > = [
    {
      recipient_id: MOCK_IDS.adviserPrimary,
      kind: "flag",
      event_type: "grade_flag_submitted",
      title: "An advisee reported a grade",
      body: `${MOCK_PERSONAS.student.fullName} submitted a grade question.`,
      target_route: "/adviser/grade-flags",
      target_student_id: MOCK_IDS.studentPrimary,
      actor_id: MOCK_IDS.studentPrimary,
      entity_type: "grade_flag",
      entity_id: MOCK_IDS.gradeFlag1,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.adviserPrimary,
      kind: "alert",
      event_type: "inc_deadline_approaching",
      title: "INC completion reminder",
      body: `${MOCK_PERSONAS.student.fullName} has an incomplete course requiring follow-up.`,
      target_route: `/adviser/advisee/${MOCK_IDS.studentPrimary}/grades`,
      target_student_id: MOCK_IDS.studentPrimary,
      actor_id: null,
      entity_type: "attempt",
      entity_id: MOCK_IDS.attemptCsci102Inc,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.adviserSecondary,
      kind: "person",
      event_type: "adviser_assigned",
      title: "A student was assigned to you",
      body: `${MOCK_PERSONAS.student_sample_2.fullName} is on your advising list.`,
      target_route: "/adviser/advisees",
      target_student_id: MOCK_PERSONAS.student_sample_2.profileId,
      actor_id: MOCK_IDS.deptHeadDcst,
      entity_type: "adviser_assignment",
      entity_id: "70000000-0000-4000-8001-000000000002",
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.deptHeadDcst,
      kind: "transfer",
      event_type: "curriculum_transfer_endorsed",
      title: "Curriculum transfer awaiting review",
      body: `An adviser endorsed a request for ${MOCK_PERSONAS.student.fullName}.`,
      target_route: "/department-head/curriculum-transfers",
      target_student_id: MOCK_IDS.studentPrimary,
      actor_id: MOCK_IDS.adviserPrimary,
      entity_type: "curriculum_transfer_request",
      entity_id: MOCK_IDS.transferRequest1,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.deptHeadDcst,
      kind: "alert",
      event_type: "encoding_deadline_approaching",
      title: "Grade encoding deadline approaching",
      body: "Review the current term's department encoding schedule.",
      target_route: "/department-head/academic-terms",
      target_student_id: null,
      actor_id: null,
      entity_type: "school_term",
      entity_id: MOCK_IDS.term2026Sem1Open,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.deptStaffDcst,
      kind: "person",
      event_type: "adviser_assigned",
      title: "Adviser assignment recorded",
      body: `An adviser assignment was recorded for ${MOCK_PERSONAS.student_sample_1.fullName}.`,
      target_route: "/department-staff/adviser-assignments",
      target_student_id: MOCK_PERSONAS.student_sample_1.profileId,
      actor_id: MOCK_IDS.deptHeadDcst,
      entity_type: "adviser_assignment",
      entity_id: "70000000-0000-4000-8001-000000000001",
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.deptStaffDcst,
      kind: "report",
      event_type: "catalog_updated",
      title: "Course catalog updated",
      body: "Review the shared CSCI 101 course record.",
      target_route: "/department-staff/course-catalog",
      target_student_id: null,
      actor_id: MOCK_IDS.deptHeadDcst,
      entity_type: "course",
      entity_id: MOCK_IDS.courseCsci101,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.deanComputing,
      kind: "report",
      event_type: "report_snapshot_ready",
      title: "Faculty report available",
      body: "The Faculty of Computing report is available for review.",
      target_route: "/dean/reports",
      target_student_id: null,
      actor_id: null,
      entity_type: "faculty",
      entity_id: MOCK_IDS.facultyComputing,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.deanDeptHeadComputing,
      kind: "transfer",
      event_type: "curriculum_transfer_endorsed",
      title: "Curriculum transfer awaiting review",
      body: `An adviser endorsed a request for ${MOCK_PERSONAS.student.fullName}.`,
      target_route: "/department-head/curriculum-transfers",
      target_student_id: MOCK_IDS.studentPrimary,
      actor_id: MOCK_IDS.adviserPrimary,
      entity_type: "curriculum_transfer_request",
      entity_id: MOCK_IDS.transferRequest1,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.deanDeptHeadComputing,
      kind: "report",
      event_type: "report_snapshot_ready",
      title: "Faculty report available",
      body: "The Faculty of Computing report is available for review.",
      target_route: "/dean/reports",
      target_student_id: null,
      actor_id: null,
      entity_type: "faculty",
      entity_id: MOCK_IDS.facultyComputing,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.systemAdmin,
      kind: "person",
      event_type: "invitation_accepted",
      title: "Student invitation accepted",
      body: `${MOCK_PERSONAS.student_sample_1.fullName} accepted their invitation.`,
      target_route: "/admin/accounts",
      target_student_id: MOCK_PERSONAS.student_sample_1.profileId,
      actor_id: MOCK_PERSONAS.student_sample_1.profileId,
      entity_type: "profile",
      entity_id: MOCK_PERSONAS.student_sample_1.profileId,
      dedupe_key: null,
      email_delivery_status: "sent",
    },
    {
      recipient_id: MOCK_IDS.systemAdmin,
      kind: "alert",
      event_type: "backup_overdue_reminder",
      title: "Backup needs review",
      body: "Check the most recent backup reference in system settings.",
      target_route: "/admin/settings",
      target_student_id: null,
      actor_id: null,
      entity_type: "system_settings",
      entity_id: "93000000-0000-4000-8000-000000000001",
      dedupe_key: null,
      email_delivery_status: "sent",
    },
  ];
  roleNotifications.forEach((notification, index) => {
    const isRead = index % 3 === 1;
    db.notifications.push({
      ...notification,
      id: `90000000-0000-4000-8002-${String(index + 1).padStart(12, "0")}`,
      is_read: isRead,
      read_at: isRead ? "2026-11-10T10:00:00Z" : null,
      created_at: "2026-11-09T09:00:00Z",
    });
  });
  return db;
}

let mockDb: MockDatabaseState = buildInitialMockDatabase();

export function getMockDatabase(): MockDatabaseState {
  return mockDb;
}

export function resetMockDatabase(): MockDatabaseState {
  mockDb = buildInitialMockDatabase();
  return mockDb;
}
