// Run with node _gen/test-domain.js. No packages or server required.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context={window:{},structuredClone,crypto:require('node:crypto').webcrypto,localStorage:{getItem:()=>null,setItem:()=>{}}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/demo-model.js','utf8'),context);
const m=context.window.SAAIS;
assert.equal(m.find('attempts','at33').status,'inc');assert.equal(m.grade(m.find('attempts','at33')),5);assert.equal(m.metrics('s2','t1').failed,15);assert.equal(m.metrics('s2').delinquent,true);
assert.equal(m.grade(m.find('attempts','at11')),null);
m.db.resolutions.push({id:'resolution-test',attempt_id:'at11',completion_grade:2,resolved_at:'2026-09-19'});assert.equal(m.grade(m.find('attempts','at11')),2);assert.equal(m.find('attempts','at11').status,'inc');
m.reset();const before=m.metrics('s1').earned;m.db.attempts.push({...m.find('attempts','at1'),id:'later-fail',course_offering_id:'t1-c1',status:'failed',final_grade:5,created_at:'2026-09-19'});assert.equal(m.metrics('s1').earned,before);assert.equal(m.metrics('s1').gwa,'1.58');
m.reset();m.db.attempts.push({id:'credit1',student_id:'s1',course_offering_id:'t0-c50',status:'passed',final_grade:1,created_at:'2025-06-01'},{id:'credit2',student_id:'s1',course_offering_id:'t1-c50',status:'passed',final_grade:2,created_at:'2026-06-01'});assert.equal(m.metrics('s1').earned,58);
const gwa=m.metrics('s1').gwa;m.db.equivalencies=[];assert.equal(m.metrics('s1').gwa,gwa);
m.reset();for(const p of m.db.profiles.filter(p=>p.role==='student')){assert.equal(m.db.assignments.filter(a=>a.student_id===p.id&&!a.end_date).length,1);assert.equal(m.db.curriculumAssignments.filter(a=>a.student_id===p.id&&!a.end_date).length,1);}
console.log('Domain checks passed: lapsed INC, unit weighting, delinquency, completion, permanent passed credit, additional credit, equivalency independence, assignment invariants.');
