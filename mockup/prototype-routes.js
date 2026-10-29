window.SAAIS_PORTALS={
  "roles": [
    {
      "id": "student",
      "label": "Student",
      "folder": "Student",
      "prefix": "Student",
      "home": "student/dashboard"
    },
    {
      "id": "adviser",
      "label": "Adviser",
      "folder": "Adviser",
      "prefix": "Adviser",
      "home": "adviser/dashboard"
    },
    {
      "id": "department-head",
      "label": "Department Head",
      "folder": "Department Head",
      "prefix": "",
      "home": "department-head/adviser/dashboard"
    },
    {
      "id": "department-staff",
      "label": "Department Staff",
      "folder": "Department Staff",
      "prefix": "",
      "home": "department-staff/students"
    },
    {
      "id": "system-admin",
      "label": "System Admin",
      "folder": "SystemAdmin",
      "prefix": "Admin",
      "home": "system-admin/students"
    },
    {
      "id": "dean-adviser",
      "label": "Dean Adviser",
      "folder": "Dean/DeanAdviser",
      "prefix": "Dean",
      "home": "dean-adviser/adviser/dashboard"
    },
    {
      "id": "dean-dh",
      "label": "Dean DH",
      "folder": "Dean/DeanDH",
      "prefix": "DH",
      "home": "dean-dh/adviser/dashboard"
    }
  ],
  "routes": {
    "student/notifications": {
      "file": "Student/StudentNotifications.html",
      "title": "Notifications · SAAIS",
      "role": "student"
    },
    "adviser/notifications": {
      "file": "Adviser/AdviserNotifications.dc.html",
      "title": "Notifications · SAAIS",
      "role": "adviser"
    },
    "department-head/notifications": {
      "file": "Department Head/Notifications.dc.html",
      "title": "Notifications · SAAIS",
      "role": "department-head"
    },
    "department-staff/notifications": {
      "file": "Department Staff/Notifications.dc.html",
      "title": "Notifications · SAAIS",
      "role": "department-staff"
    },
    "system-admin/notifications": {
      "file": "SystemAdmin/AdminNotifications.dc.html",
      "title": "Notifications · SAAIS",
      "role": "system-admin"
    },
    "dean-adviser/notifications": {
      "file": "Dean/DeanAdviser/DeanAdviserNotifications.dc.html",
      "title": "Notifications · SAAIS",
      "role": "dean-adviser"
    },
    "dean-dh/notifications": {
      "file": "Dean/DeanDH/DHAdviserNotifications.dc.html",
      "title": "Notifications · SAAIS",
      "role": "dean-dh"
    },
    "student/workspace": {
      "file": "Student/Student.html",
      "title": "Student portal · SAAIS",
      "role": "student"
    },
    "student/change-password": {
      "file": "Student/StudentChangePassword.html",
      "title": "Change password · SAAIS",
      "role": "student"
    },
    "student/checklist": {
      "file": "Student/StudentChecklist.html",
      "title": "Curriculum checklist · SAAIS",
      "role": "student"
    },
    "student/dashboard": {
      "file": "Student/StudentDashboard.html",
      "title": "Dashboard · SAAIS",
      "role": "student"
    },
    "student/grades": {
      "file": "Student/StudentGrades.html",
      "title": "Grades · SAAIS",
      "role": "student"
    },
    "student/history": {
      "file": "Student/StudentHistory.html",
      "title": "Enrollment history · SAAIS",
      "role": "student"
    },
    "student/profile": {
      "file": "Student/StudentProfile.html",
      "title": "My profile · SAAIS",
      "role": "student"
    },
    "adviser/advisees/advising": {
      "file": "Adviser/AdviseeAdvising.dc.html",
      "title": "Advising · SAAIS",
      "role": "adviser"
    },
    "adviser/advisees/checklist": {
      "file": "Adviser/AdviseeChecklist.dc.html",
      "title": "Student checklist · SAAIS",
      "role": "adviser"
    },
    "adviser/advisees/curriculum": {
      "file": "Adviser/AdviseeCurriculum.dc.html",
      "title": "Student curriculum · SAAIS",
      "role": "adviser"
    },
    "adviser/advisees/grades": {
      "file": "Adviser/AdviseeGrades.dc.html",
      "title": "Student grades · SAAIS",
      "role": "adviser"
    },
    "adviser/advisees/history": {
      "file": "Adviser/AdviseeHistory.dc.html",
      "title": "Student history · SAAIS",
      "role": "adviser"
    },
    "adviser/advisees/notes": {
      "file": "Adviser/AdviseeNotes.dc.html",
      "title": "Student notes · SAAIS",
      "role": "adviser"
    },
    "adviser/workspace": {
      "file": "Adviser/Adviser.dc.html",
      "title": "Academic adviser · SAAIS",
      "role": "adviser"
    },
    "adviser/advisees": {
      "file": "Adviser/AdviserAdvisees.dc.html",
      "title": "Advisees · SAAIS",
      "role": "adviser"
    },
    "adviser/change-password": {
      "file": "Adviser/AdviserChangePassword.dc.html",
      "title": "Change password · SAAIS",
      "role": "adviser"
    },
    "adviser/dashboard": {
      "file": "Adviser/AdviserDashboard.dc.html",
      "title": "Dashboard · SAAIS",
      "role": "adviser"
    },
    "adviser/encode-grades": {
      "file": "Adviser/AdviserEncodeGrades.dc.html",
      "title": "Encode grades · SAAIS",
      "role": "adviser"
    },
    "adviser/grade-flags": {
      "file": "Adviser/AdviserGradeFlags.dc.html",
      "title": "Grade flags · SAAIS",
      "role": "adviser"
    },
    "adviser/import-grades": {
      "file": "Adviser/AdviserImportGrades.dc.html",
      "title": "Import grades · SAAIS",
      "role": "adviser"
    },
    "department-head/academic-terms": {
      "file": "Department Head/AcademicTerms.dc.html",
      "title": "Academic terms · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/advisees/advising": {
      "file": "Department Head/AdviseeAdvising.dc.html",
      "title": "Advising · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/advisees/checklist": {
      "file": "Department Head/AdviseeChecklist.dc.html",
      "title": "Student checklist · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/advisees/curriculum": {
      "file": "Department Head/AdviseeCurriculum.dc.html",
      "title": "Student curriculum · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/advisees/grades": {
      "file": "Department Head/AdviseeGrades.dc.html",
      "title": "Student grades · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/advisees/history": {
      "file": "Department Head/AdviseeHistory.dc.html",
      "title": "Student history · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/advisees/notes": {
      "file": "Department Head/AdviseeNotes.dc.html",
      "title": "Student notes · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/workspace": {
      "file": "Department Head/Adviser.dc.html",
      "title": "Academic adviser · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/advisees": {
      "file": "Department Head/AdviserAdvisees.dc.html",
      "title": "Advisees · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser-assignments": {
      "file": "Department Head/AdviserAssignments.dc.html",
      "title": "Adviser assignments · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/change-password": {
      "file": "Department Head/AdviserChangePassword.dc.html",
      "title": "Change password · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/dashboard": {
      "file": "Department Head/AdviserDashboard.dc.html",
      "title": "Dashboard · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/encode-grades": {
      "file": "Department Head/AdviserEncodeGrades.dc.html",
      "title": "Encode grades · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/grade-flags": {
      "file": "Department Head/AdviserGradeFlags.dc.html",
      "title": "Grade flags · SAAIS",
      "role": "department-head"
    },
    "department-head/adviser/import-grades": {
      "file": "Department Head/AdviserImportGrades.dc.html",
      "title": "Import grades · SAAIS",
      "role": "department-head"
    },
    "department-head/audit-log": {
      "file": "Department Head/AuditLog.dc.html",
      "title": "Audit log · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/curricula": {
      "file": "Department Head/Curricula.dc.html",
      "title": "Curricula · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/curriculum-transfers": {
      "file": "Department Head/CurriculumTransfers.dc.html",
      "title": "Curriculum transfers · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/department-reports": {
      "file": "Department Head/DepartmentReports.dc.html",
      "title": "Department reports · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/equivalence": {
      "file": "Department Head/Equivalence.dc.html",
      "title": "Equivalence · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/outside-credits": {
      "file": "Department Head/OutsideCredits.dc.html",
      "title": "Outside credits · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/settings": {
      "file": "Department Head/Settings.dc.html",
      "title": "Settings · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-head/students": {
      "file": "Department Head/Students.dc.html",
      "title": "Students · Department Head · SAAIS",
      "role": "department-head"
    },
    "department-staff/academic-terms": {
      "file": "Department Staff/AcademicTerms.dc.html",
      "title": "Academic terms · Department Staff · SAAIS",
      "role": "department-staff"
    },
    "department-staff/accounts-roles": {
      "file": "Department Staff/AccountsRoles.dc.html",
      "title": "Accounts and roles · Department Staff · SAAIS",
      "role": "department-staff"
    },
    "department-staff/adviser-assignments": {
      "file": "Department Staff/AdviserAssignments.dc.html",
      "title": "Adviser assignments · Department Staff · SAAIS",
      "role": "department-staff"
    },
    "department-staff/change-password": {
      "file": "Department Staff/ChangePassword.dc.html",
      "title": "Change password | Department Staff | SAAIS",
      "role": "department-staff"
    },
    "department-staff/course-catalog": {
      "file": "Department Staff/CourseCatalog.dc.html",
      "title": "Course catalog · Department Staff · SAAIS",
      "role": "department-staff"
    },
    "department-staff/curricula": {
      "file": "Department Staff/Curricula.dc.html",
      "title": "Curricula · Department Staff · SAAIS",
      "role": "department-staff"
    },
    "department-staff/students": {
      "file": "Department Staff/Students.dc.html",
      "title": "Students · Department Staff · SAAIS",
      "role": "department-staff"
    },
    "system-admin/accounts": {
      "file": "SystemAdmin/AdminAccountsRoles.dc.html",
      "title": "Accounts and roles · SAAIS",
      "role": "system-admin"
    },
    "system-admin/audit-log": {
      "file": "SystemAdmin/AdminAuditLog.dc.html",
      "title": "Audit log · SAAIS",
      "role": "system-admin"
    },
    "system-admin/change-password": {
      "file": "SystemAdmin/AdminChangePassword.dc.html",
      "title": "Change password · SAAIS",
      "role": "system-admin"
    },
    "system-admin/faculty-departments": {
      "file": "SystemAdmin/AdminFacultyDepartments.dc.html",
      "title": "Faculty & departments · SAAIS",
      "role": "system-admin"
    },
    "system-admin/programs": {
      "file": "SystemAdmin/AdminPrograms.dc.html",
      "title": "Programs · SAAIS",
      "role": "system-admin"
    },
    "system-admin/settings": {
      "file": "SystemAdmin/AdminSettings.dc.html",
      "title": "Settings · SAAIS",
      "role": "system-admin"
    },
    "system-admin/students": {
      "file": "SystemAdmin/AdminStudentDirectory.dc.html",
      "title": "Student directory · SAAIS",
      "role": "system-admin"
    },
    "system-admin/workspace": {
      "file": "SystemAdmin/SystemAdmin.dc.html",
      "title": "System administrator · SAAIS",
      "role": "system-admin"
    },
    "dean-adviser/adviser/advisees/advising": {
      "file": "Dean/DeanAdviser/DeanAdviseeAdvising.dc.html",
      "title": "Advising · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/advisees/checklist": {
      "file": "Dean/DeanAdviser/DeanAdviseeChecklist.dc.html",
      "title": "Student checklist · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/advisees/curriculum": {
      "file": "Dean/DeanAdviser/DeanAdviseeCurriculum.dc.html",
      "title": "Student curriculum · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/advisees/grades": {
      "file": "Dean/DeanAdviser/DeanAdviseeGrades.dc.html",
      "title": "Student grades · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/advisees/history": {
      "file": "Dean/DeanAdviser/DeanAdviseeHistory.dc.html",
      "title": "Student history · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/advisees/notes": {
      "file": "Dean/DeanAdviser/DeanAdviseeNotes.dc.html",
      "title": "Student notes · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/workspace": {
      "file": "Dean/DeanAdviser/DeanAdviser.dc.html",
      "title": "Academic adviser · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/advisees": {
      "file": "Dean/DeanAdviser/DeanAdviserAdvisees.dc.html",
      "title": "Advisees · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/change-password": {
      "file": "Dean/DeanAdviser/DeanAdviserChangePassword.dc.html",
      "title": "Change password · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/dashboard": {
      "file": "Dean/DeanAdviser/DeanAdviserDashboard.dc.html",
      "title": "Dashboard · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/encode-grades": {
      "file": "Dean/DeanAdviser/DeanAdviserEncodeGrades.dc.html",
      "title": "Encode grades · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/grade-flags": {
      "file": "Dean/DeanAdviser/DeanAdviserGradeFlags.dc.html",
      "title": "Grade flags · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/adviser/import-grades": {
      "file": "Dean/DeanAdviser/DeanAdviserImportGrades.dc.html",
      "title": "Import grades · SAAIS",
      "role": "dean-adviser"
    },
    "dean-adviser/audit": {
      "file": "Dean/DeanAdviser/DeanAudit.dc.html",
      "title": "SAAIS — Audit log",
      "role": "dean-adviser"
    },
    "dean-adviser/reports": {
      "file": "Dean/DeanAdviser/DeanReports.dc.html",
      "title": "SAAIS — Reports",
      "role": "dean-adviser"
    },
    "dean-adviser/students": {
      "file": "Dean/DeanAdviser/DeanStudents.dc.html",
      "title": "SAAIS — Students",
      "role": "dean-adviser"
    },
    "dean-dh/academic-terms": {
      "file": "Dean/DeanDH/DHAcademicTerms.dc.html",
      "title": "Academic terms · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/advisees/advising": {
      "file": "Dean/DeanDH/DHAdviseeAdvising.dc.html",
      "title": "Advising · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/advisees/checklist": {
      "file": "Dean/DeanDH/DHAdviseeChecklist.dc.html",
      "title": "Student checklist · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/advisees/curriculum": {
      "file": "Dean/DeanDH/DHAdviseeCurriculum.dc.html",
      "title": "Student curriculum · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/advisees/grades": {
      "file": "Dean/DeanDH/DHAdviseeGrades.dc.html",
      "title": "Student grades · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/advisees/history": {
      "file": "Dean/DeanDH/DHAdviseeHistory.dc.html",
      "title": "Student history · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/advisees/notes": {
      "file": "Dean/DeanDH/DHAdviseeNotes.dc.html",
      "title": "Student notes · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/workspace": {
      "file": "Dean/DeanDH/DHAdviser.dc.html",
      "title": "Academic adviser · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/advisees": {
      "file": "Dean/DeanDH/DHAdviserAdvisees.dc.html",
      "title": "Advisees · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser-assignments": {
      "file": "Dean/DeanDH/DHAdviserAssignments.dc.html",
      "title": "Adviser assignments · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/change-password": {
      "file": "Dean/DeanDH/DHAdviserChangePassword.dc.html",
      "title": "Change password · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/dashboard": {
      "file": "Dean/DeanDH/DHAdviserDashboard.dc.html",
      "title": "Dashboard · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/encode-grades": {
      "file": "Dean/DeanDH/DHAdviserEncodeGrades.dc.html",
      "title": "Encode grades · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/grade-flags": {
      "file": "Dean/DeanDH/DHAdviserGradeFlags.dc.html",
      "title": "Grade flags · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/adviser/import-grades": {
      "file": "Dean/DeanDH/DHAdviserImportGrades.dc.html",
      "title": "Import grades · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/audit-log": {
      "file": "Dean/DeanDH/DHAuditLog.dc.html",
      "title": "Audit log · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/curricula": {
      "file": "Dean/DeanDH/DHCurricula.dc.html",
      "title": "Curricula · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/curriculum-transfers": {
      "file": "Dean/DeanDH/DHCurriculumTransfers.dc.html",
      "title": "Curriculum transfers · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/dean/audit": {
      "file": "Dean/DeanDH/DHDeanAudit.dc.html",
      "title": "SAAIS — Audit log",
      "role": "dean-dh"
    },
    "dean-dh/dean/reports": {
      "file": "Dean/DeanDH/DHDeanReports.dc.html",
      "title": "SAAIS — Reports",
      "role": "dean-dh"
    },
    "dean-dh/dean/students": {
      "file": "Dean/DeanDH/DHDeanStudents.dc.html",
      "title": "SAAIS — Students",
      "role": "dean-dh"
    },
    "dean-dh/department-reports": {
      "file": "Dean/DeanDH/DHDepartmentReports.dc.html",
      "title": "Department reports · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/equivalence": {
      "file": "Dean/DeanDH/DHEquivalence.dc.html",
      "title": "Equivalence · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/outside-credits": {
      "file": "Dean/DeanDH/DHOutsideCredits.dc.html",
      "title": "Outside credits · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/settings": {
      "file": "Dean/DeanDH/DHSettings.dc.html",
      "title": "Settings · Dean · SAAIS",
      "role": "dean-dh"
    },
    "dean-dh/students": {
      "file": "Dean/DeanDH/DHStudents.dc.html",
      "title": "Students · Dean · SAAIS",
      "role": "dean-dh"
    }
  },
  "aliases": {
    "student/enrollment-history": "student/history",
    "student/settings": "student/change-password",
    "adviser/advisees/detail": "adviser/advisees/checklist",
    "adviser/enrollment/new": "adviser/encode-grades",
    "adviser/advisees/record-grades": "adviser/encode-grades",
    "admin/dashboard": "system-admin/students",
    "admin/accounts": "system-admin/accounts",
    "admin/audit-log": "system-admin/audit-log",
    "admin/settings": "system-admin/settings",
    "admin/programs": "system-admin/programs",
    "admin/faculties": "system-admin/faculty-departments",
    "admin/curricula": "department-staff/curricula",
    "admin/courses": "department-staff/course-catalog",
    "admin/course-offerings": "department-staff/academic-terms",
    "adviser/enrollment": "adviser/encode-grades",
    "adviser/reassignment": "department-staff/adviser-assignments"
  }
};
