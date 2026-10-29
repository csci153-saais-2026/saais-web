/* Standalone artboards open their corresponding interactive product screen. */
document.addEventListener('DOMContentLoaded',()=>{
 const file=decodeURIComponent(location.pathname).split('/').pop();
 const routes={'Main.dc.html':'','Login.dc.html':'login','Invite.dc.html':'invite','Docs.dc.html':'docs','StudentDashboard.dc.html':'student/dashboard','StudentChecklist.dc.html':'student/checklist','StudentGrades.dc.html':'student/grades','StudentHistory.dc.html':'student/history','StudentProfile.dc.html':'student/profile','AdviserDashboard.dc.html':'adviser/dashboard','AdviserAdvisees.dc.html':'adviser/advisees','AdviseeDetail.dc.html':'adviser/advisees/detail','AdviseeChecklist.dc.html':'adviser/advisees/checklist','AdviseeNotes.dc.html':'adviser/advisees/notes','RecordAttempt.dc.html':'adviser/enrollment/new','AdviserReassign.dc.html':'adviser/reassignment','AdminDashboard.dc.html':'admin/dashboard','AdminAccounts.dc.html':'admin/accounts','AdminPrograms.dc.html':'admin/programs','AdminCurricula.dc.html':'admin/curricula','AdminCourses.dc.html':'admin/courses','AdminOfferings.dc.html':'admin/course-offerings','AdminAudit.dc.html':'admin/audit-log','MobileStudentHome.dc.html':'student/dashboard','MobileChecklist.dc.html':'student/checklist','MobileAdvisees.dc.html':'adviser/advisees'};
 if(!(file in routes))return;
 const slug=routes[file],role=slug.split('/')[0];
 if(['student','adviser','admin'].includes(role))try{sessionStorage.setItem('saais-session',JSON.stringify({session:'local-demo',profile:{student:'s1',adviser:'a1',admin:'u1'}[role],role,status:'active'}));}catch{}
 const nested=/\/(Student|Adviser|Admin)\//.test(location.pathname);
 location.replace((nested?'../':'')+'prototype.html#/'+slug);
});
