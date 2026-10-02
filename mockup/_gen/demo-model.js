/* Browser-only, fictional SAAIS records. No network writes or real authentication. */
(function () {
  'use strict';
  const today = '2026-09-19';
  const deptFor = code => code.startsWith('CSIT') || code.startsWith('CSci') ? 'd1' : code.startsWith('Math') ? 'd3' : 'd5';
  // Core BSCS (cv1) curriculum courses, in official curriculum-map order. Course number in this
  // array (1-based) doubles as the slot number below (course #7 -> slot 'sl7', etc).
  const coreCourseRows = [
    // Year 1, 1st Sem (ct1)
    ['c1','CSIT 100','Introduction to Computing',2,3,3,'grade_replacement'],
    ['c2','CSIT 101','Fundamentals of Programming',3,3,4,'grade_replacement'],
    ['c3','CSci 180','Pre-calculus for CS',3,0,3,'grade_replacement'],
    ['c4','Comm 11','Purposive Communication',3,0,3,'none'],
    ['c5','Entr 11','Entrepreneurial Mind',3,0,3,'none'],
    ['c6','ITec 11','Living in the IT Era',3,0,3,'none'],
    ['c7','ScSc 11','Understanding the Self',3,0,3,'none'],
    ['c8','PhEd 11','PATHFit 1 - Movement Competency Training',0,0,2,'none'],
    ['c9','NSTP 11','National Service Training Program I',0,0,3,'none'],
    // Year 1, 2nd Sem (ct2)
    ['c10','CSIT 102','Intermediate Programming',2,3,3,'grade_replacement'],
    ['c11','CSci 102','Discrete Structures I',3,0,3,'grade_replacement'],
    ['c12','CSci 121','Computer Organization and Architecture',2,3,3,'grade_replacement'],
    ['c13','CSci 181','Differential Calculus for CS',3,0,3,'grade_replacement'],
    ['c14','Math 11','Mathematics in the Modern World',3,0,3,'none'],
    ['c15','ScSc 12','Readings in Philippine History',3,0,3,'none'],
    ['c16','ScTS 11a','Science, Technology, and Society',3,0,3,'none','discontinued'],
    ['c17','Envi 11','Environmental Science',3,0,3,'none'],
    ['c18','PhEd 12','PATHFit 2 - Exercise-based Fitness Activities',0,0,2,'none'],
    ['c19','NSTP 12','National Service Training Program II',0,0,3,'none'],
    // Year 2, 1st Sem (ct3)
    ['c20','CSIT 103','Data Structures and Algorithms',3,3,4,'grade_replacement'],
    ['c21','CSIT 104','Information Management',2,3,3,'grade_replacement'],
    ['c22','CSIT 105','Applications Development and Emerging Technologies',2,3,3,'grade_replacement'],
    ['c23','CSci 103','Discrete Structures II',3,0,3,'grade_replacement'],
    ['c24','CSci 122','Human Computer Interaction',3,0,3,'grade_replacement'],
    ['c25','CSci 182','Integral Calculus for CS',3,0,3,'grade_replacement'],
    ['c26','ScSc 13','The Contemporary World',3,0,3,'none'],
    ['c27','PhEd 13','PATHFit 3',0,0,2,'none'],
    // Year 2, 2nd Sem (ct4)
    ['c28','CSci 104','Algorithms and Complexity',4,0,4,'grade_replacement'],
    ['c29','CSci 126','Networks and Communications',2,3,3,'grade_replacement'],
    ['c30','CSci 120','Object-oriented Programming',2,3,3,'grade_replacement'],
    ['c31','CSci 154','Quantitative Methods for CS',3,0,3,'grade_replacement'],
    ['c32','CSci 183','Linear Algebra and Matrix Theory',3,0,3,'grade_replacement'],
    ['c33','Humn 11','Art Appreciation',3,0,3,'none'],
    ['c34','ScSc 16','Life and Works of Rizal',3,0,3,'none'],
    ['c35','PhEd 14','PATHFit 4',0,0,2,'none'],
    // Year 3, 1st Sem (ct5)
    ['c36','CSci 107','Automata Theory and Formal Languages',3,0,3,'grade_replacement'],
    ['c37','CSci 123','Operating Systems',2,3,3,'grade_replacement'],
    ['c38','CSci 128','Information Assurance and Security',3,0,3,'grade_replacement'],
    ['c39','CSci 135','Software Engineering I',2,3,3,'grade_replacement'],
    ['c40','CSci 141','Artificial Intelligence',2,3,3,'grade_replacement'],
    ['c41','CSci 198','Research Planning and Manuscript Preparation',3,0,3,'grade_replacement'],
    ['c42','Phlo 11','Ethics',3,0,3,'none'],
    // Year 3, 2nd Sem (ct6)
    ['c43','CSci 200','Undergraduate Thesis I',0,0,2,'none'],
    ['c44','CSci 108','Programming Languages',2,3,3,'grade_replacement'],
    ['c45','CSci 136','Software Engineering II',2,3,3,'grade_replacement'],
    ['c46','CSci 193','Social Issues and Professional Practice',3,0,3,'grade_replacement'],
    ['c47','CSci 171','Computer Science Elective 1',2,3,3,'grade_replacement'],
    // Year 3, Midyear (ct7)
    ['c48','CSci 172','Computer Science Elective 2',2,3,3,'grade_replacement'],
    // Year 4, 1st Sem (ct8)
    ['c49','CSci 173','Computer Science Elective 3',2,3,3,'grade_replacement'],
    ['c50','CSci 199','Undergraduate Seminar',1,0,1,'additional_credit'],
    ['c51','CSci 200','Undergraduate Thesis II',0,0,4,'none'],
    // Year 4, 2nd Sem (ct9)
    ['c52','CSci 200a','Internship / On-the-Job Training / Practicum',0,400,3,'none']
  ];
  // Extra catalog-only courses for the four CS elective tracks (browsable, not wired into curriculum slots).
  const electiveCourseRows = [
    ['c53','CSci E-AI1','Advanced Artificial Intelligence'],
    ['c54','CSci E-AI2','Graphics and Visual Computing'],
    ['c55','CSci E-AI3','Applications of Artificial Intelligence'],
    ['c56','CSci E-DA1','Descriptive Analytics'],
    ['c57','CSci E-DA2','Predictive Analytics'],
    ['c58','CSci E-DA3','Prescriptive Analytics'],
    ['c59','CSci E-SC1','Computational Science 1'],
    ['c60','CSci E-SC2','Computational Science 2'],
    ['c61','CSci E-SC3','Parallel and Distributed Computing'],
    ['c62','CSci E-WA1','Web Systems and Technologies 1'],
    ['c63','CSci E-WA2','Advanced Database Systems'],
    ['c64','CSci E-WA3','Web Systems and Technologies 2']
  ].map(([id,code,title])=>({id,code,title,units:3,repeatable_type:'none',lecture_hours:2,lab_hours:3,department_id:'d1',status:'active'}));
  const ctForIndex = i => i<=9?'ct1':i<=19?'ct2':i<=27?'ct3':i<=35?'ct4':i<=42?'ct5':i<=47?'ct6':i<=48?'ct7':i<=51?'ct8':'ct9';
  const seed = {
    profiles: [
      {id:'s1',full_name:'Maria Isabel Bautista',student_number:'2023-04412',email:'maria.bautista@example.edu.ph',role:'student',status:'active',department_id:'d1'},
      {id:'s2',full_name:'Angelo Cruz',student_number:'2022-01188',email:'angelo.cruz@example.edu.ph',role:'student',status:'active',department_id:'d1'},
      {id:'s3',full_name:'Joshua Lim',student_number:'2023-02940',email:'joshua.lim@example.edu.ph',role:'student',status:'active',department_id:'d1'},
      {id:'s4',full_name:'Andrea Villanueva',student_number:'2024-00871',email:'andrea.villanueva@example.edu.ph',role:'student',status:'active',department_id:'d1'},
      {id:'a1',full_name:'Prof. Ramon Reyes',email:'ramon.reyes@example.edu.ph',role:'adviser',status:'active',department_id:'d1'},
      {id:'a2',full_name:'Prof. Lourdes Mendez',email:'lourdes.mendez@example.edu.ph',role:'adviser',status:'active',department_id:'d1'},
      {id:'u1',full_name:'Teresa Alvarez',email:'teresa.alvarez@example.edu.ph',role:'admin',status:'active',department_id:'d6'}
    ],
    faculties:[{id:'f1',name:'Faculty of Computer Studies'},{id:'f2',name:'Faculty of Arts and Sciences'},{id:'f3',name:'University Administration'}],
    departments:[{id:'d1',faculty_id:'f1',name:'Computer Science'},{id:'d2',faculty_id:'f1',name:'Information Technology'},{id:'d3',faculty_id:'f2',name:'Mathematics and Statistics'},{id:'d4',faculty_id:'f2',name:'Psychology'},{id:'d5',faculty_id:'f2',name:'General Education'},{id:'d6',faculty_id:'f3',name:'Academic Affairs'}],
    programs:[{id:'p1',code:'BSCS',name:'BS Computer Science',faculty_id:'f1',nominal_duration:'4 years',status:'active'},{id:'p2',code:'BSIT',name:'BS Information Technology',faculty_id:'f1',nominal_duration:'4 years',status:'active'}],
    curricula:[{id:'cv1',program_id:'p1',version_label:'2023–2024',effective_start:'2023-06-01',effective_end:'',delinquency_threshold:12,total_units:147,status:'active'},{id:'cv2',program_id:'p2',version_label:'2024–2025',effective_start:'2024-06-01',effective_end:'',delinquency_threshold:12,total_units:156,status:'active'}],
    curriculumTerms:[
      {id:'ct1',curriculum_version_id:'cv1',year_level:1,term_sequence:1},
      {id:'ct2',curriculum_version_id:'cv1',year_level:1,term_sequence:2},
      {id:'ct3',curriculum_version_id:'cv1',year_level:2,term_sequence:1},
      {id:'ct4',curriculum_version_id:'cv1',year_level:2,term_sequence:2},
      {id:'ct5',curriculum_version_id:'cv1',year_level:3,term_sequence:1},
      {id:'ct6',curriculum_version_id:'cv1',year_level:3,term_sequence:2},
      {id:'ct7',curriculum_version_id:'cv1',year_level:3,term_sequence:3},
      {id:'ct8',curriculum_version_id:'cv1',year_level:4,term_sequence:1},
      {id:'ct9',curriculum_version_id:'cv1',year_level:4,term_sequence:2},
      {id:'ct10',curriculum_version_id:'cv2',year_level:1,term_sequence:1}
    ],
    courses:[
      ...coreCourseRows.map(([id,code,title,lecture_hours,lab_hours,units,repeatable_type,status])=>({id,code,title,lecture_hours,lab_hours,units,repeatable_type,department_id:deptFor(code),status:status||'active'})),
      ...electiveCourseRows
    ],
    prerequisites:[
      {id:'pr1',course_id:'c10',prerequisite_course_id:'c2',type:'strict'},
      {id:'pr2',course_id:'c12',prerequisite_course_id:'c1',type:'strict'},
      {id:'pr3',course_id:'c13',prerequisite_course_id:'c3',type:'strict'},
      {id:'pr4',course_id:'c18',prerequisite_course_id:'c8',type:'strict'},
      {id:'pr5',course_id:'c19',prerequisite_course_id:'c9',type:'strict'},
      {id:'pr6',course_id:'c20',prerequisite_course_id:'c10',type:'strict'},
      {id:'pr7',course_id:'c21',prerequisite_course_id:'c10',type:'strict'},
      {id:'pr8',course_id:'c22',prerequisite_course_id:'c10',type:'strict'},
      {id:'pr9',course_id:'c23',prerequisite_course_id:'c11',type:'strict'},
      {id:'pr10',course_id:'c24',prerequisite_course_id:'c1',type:'strict'},
      {id:'pr11',course_id:'c25',prerequisite_course_id:'c13',type:'strict'},
      {id:'pr12',course_id:'c27',prerequisite_course_id:'c8',type:'strict'},
      {id:'pr13',course_id:'c27',prerequisite_course_id:'c18',type:'co_requisite'},
      {id:'pr14',course_id:'c28',prerequisite_course_id:'c20',type:'strict'},
      {id:'pr15',course_id:'c29',prerequisite_course_id:'c1',type:'strict'},
      {id:'pr16',course_id:'c30',prerequisite_course_id:'c22',type:'strict'},
      {id:'pr17',course_id:'c32',prerequisite_course_id:'c13',type:'strict'},
      {id:'pr18',course_id:'c35',prerequisite_course_id:'c8',type:'strict'},
      {id:'pr19',course_id:'c35',prerequisite_course_id:'c18',type:'strict'},
      {id:'pr20',course_id:'c36',prerequisite_course_id:'c23',type:'strict'},
      {id:'pr21',course_id:'c37',prerequisite_course_id:'c12',type:'strict'},
      {id:'pr22',course_id:'c38',prerequisite_course_id:'c29',type:'strict'},
      {id:'pr23',course_id:'c39',prerequisite_course_id:'c22',type:'strict'},
      {id:'pr24',course_id:'c40',prerequisite_course_id:'c28',type:'strict'},
      {id:'pr25',course_id:'c41',prerequisite_course_id:'c31',type:'recommended'},
      {id:'pr26',course_id:'c44',prerequisite_course_id:'c36',type:'strict'},
      {id:'pr27',course_id:'c45',prerequisite_course_id:'c39',type:'strict'},
      {id:'pr28',course_id:'c46',prerequisite_course_id:'c1',type:'strict'},
      {id:'pr29',course_id:'c48',prerequisite_course_id:'c47',type:'strict'},
      {id:'pr30',course_id:'c49',prerequisite_course_id:'c48',type:'strict'}
    ],
    slots:[
      ...coreCourseRows.map(([id],i)=>{
        const n=i+1;
        return {id:'sl'+n,curriculum_term_id:ctForIndex(n),course_id:id,slot_label:'',is_elective_slot:false,nominal_units:coreCourseRows[i][5]};
      }),
      {id:'sl53',curriculum_term_id:'ct10',course_id:'c1',slot_label:'',is_elective_slot:false,nominal_units:3}
    ],
    terms:[{id:'t0',school_year:'2024 - 2025',term_type:'2nd Semester',start_year:2024,end_year:2025,is_locked:true,override_flag:false,override_actor_id:null,override_at:null},{id:'t1',school_year:'2025 - 2026',term_type:'1st Semester',start_year:2025,end_year:2026,is_locked:false,override_flag:false,override_actor_id:null,override_at:null},{id:'t2',school_year:'2025 - 2026',term_type:'2nd Semester',start_year:2025,end_year:2026,is_locked:false,override_flag:false,override_actor_id:null,override_at:null}],
    offerings:[], attempts:[], resolutions:[],
    assignments:[{id:'as0',student_id:'s1',adviser_id:'a2',start_date:'2023-06-01',end_date:'2024-06-12',reason:'Initial assignment'},{id:'as1',student_id:'s1',adviser_id:'a1',start_date:'2024-06-12',end_date:null,reason:'Load rebalancing'},{id:'as2',student_id:'s2',adviser_id:'a1',start_date:'2023-08-05',end_date:null},{id:'as3',student_id:'s3',adviser_id:'a1',start_date:'2024-06-12',end_date:null},{id:'as4',student_id:'s4',adviser_id:'a1',start_date:'2025-06-03',end_date:'2026-08-01'},{id:'as5',student_id:'s4',adviser_id:'a2',start_date:'2026-08-01',end_date:null,reason:'Load rebalancing'}],
    curriculumAssignments:['s1','s2','s3','s4'].map((student_id,i)=>({id:'ca'+i,student_id,curriculum_version_id:'cv1',start_date:'2023-06-01',end_date:null,reason:'Initial assignment'})),
    mappings:[{id:'em1',student_id:'s1',attempt_id:'at27',curriculum_term_course_id:'sl47',units_credited:3,justification:'Computational Science 1 (cross-enrolled elective) approved as equivalent for the CS Elective 1 requirement.',mapped_by:'a1',created_at:'2026-08-14T09:00:00',updated_at:'2026-08-14T09:00:00'}],
    equivalencies:[{id:'eq1',student_id:'s1',attempt_id:'at16',destination_curriculum_term_course_id:'sl16',decision_type:'discontinued_course_equivalency',units_credited:3,justification:'Envi 11 (Environmental Science) accepted as equivalent for the discontinued ScTS 11a (Science, Technology, and Society) requirement under the revised GE framework.',decided_by:'a1',decided_at:'2026-03-02T09:00:00'},{id:'eq2',student_id:'s1',attempt_id:'at28',destination_curriculum_term_course_id:'sl39',decision_type:'transfer_equivalency',units_credited:3,justification:'Prior web application development coursework from previous institution accepted as transfer equivalent for CSci 135 Software Engineering I.',decided_by:'a2',decided_at:'2023-11-20T09:00:00'}],
    notes:[{id:'n1',student_id:'s1',authored_by:'a1',body_text:'Discussed a manageable course load. Review the CSci 102 (Discrete Structures I) completion requirements before the October deadline.',created_at:'2026-09-17T13:30:00'},{id:'n2',student_id:'s1',authored_by:'a1',body_text:'Reviewed the CS Elective 1 mapping and explained how it appears in the curriculum checklist.',created_at:'2026-08-14T09:00:00'}],
    remarks:[{id:'r1',student_id:'s1',attempt_id:'at11',curriculum_term_course_id:'sl11',authored_by:'a1',body_text:'Completion requirements discussed. Follow up with the instructor before 26 October.',created_at:'2026-09-17T13:35:00'},{id:'r2',student_id:'s1',attempt_id:null,curriculum_term_course_id:'sl20',authored_by:'a1',body_text:'Discuss this course after reviewing CSIT 102 progress.',created_at:'2026-09-18T09:00:00'}],
    audit:[{id:'au1',actor_id:'a1',action:'elective_mapping.created',entity_type:'ElectiveMapping',entity_id:'em1',old_value:null,new_value:{attempt_id:'at27',curriculum_term_course_id:'sl47'},reason:'Approved CS Elective 1 equivalent',created_at:'2026-08-14T09:00:00'},{id:'au2',actor_id:'a1',action:'equivalency.approved',entity_type:'EquivalencyDecision',entity_id:'eq1',old_value:null,new_value:{destination_curriculum_term_course_id:'sl16'},created_at:'2026-03-02T09:00:00'},{id:'au3',actor_id:null,action:'gwa.recomputed',entity_type:'Profile',entity_id:'s2',old_value:null,new_value:{is_delinquent:true},created_at:'2026-09-19T02:00:00'},{id:'au4',actor_id:'u1',action:'term.locked',entity_type:'SchoolTerm',entity_id:'t0',old_value:{is_locked:false},new_value:{is_locked:true},created_at:'2026-06-01T09:00:00'}]
  };
  const t2Offered=['c28','c29','c30','c31','c32','c33','c34','c35','c16','c11','c21'];
  ['t0','t1','t2'].forEach(t=>seed.courses.forEach(c=>{if(t!=='t2'||t2Offered.includes(c.id))seed.offerings.push({id:t+'-'+c.id,school_term_id:t,course_id:c.id,is_by_request:c.status==='discontinued'});}));
  const attempts=[
    // s1 - Year 1 (both semesters), all passed except a pending INC in CSci 102.
    ['at1','s1','t0','c1','passed',1.5,'sl1'],
    ['at2','s1','t0','c2','passed',1.75,'sl2'],
    ['at3','s1','t0','c3','passed',2.0,'sl3'],
    ['at4','s1','t0','c4','passed',1.25,'sl4'],
    ['at5','s1','t0','c5','passed',1.5,'sl5'],
    ['at6','s1','t0','c6','passed',1.75,'sl6'],
    ['at7','s1','t0','c7','passed',2.0,'sl7'],
    ['at8','s1','t0','c8','passed',1.0,'sl8'],
    ['at9','s1','t0','c9','passed',1.0,'sl9'],
    ['at10','s1','t0','c10','passed',1.5,'sl10'],
    ['at11','s1','t0','c11','inc',null,'sl11'],
    ['at12','s1','t0','c12','passed',2.0,'sl12'],
    ['at13','s1','t0','c13','passed',1.75,'sl13'],
    ['at14','s1','t0','c14','passed',2.0,'sl14'],
    ['at15','s1','t0','c15','passed',1.5,'sl15'],
    ['at16','s1','t0','c17','passed',1.75,'sl17'],
    ['at17','s1','t0','c18','passed',1.0,'sl18'],
    ['at18','s1','t0','c19','passed',1.0,'sl19'],
    // s1 - currently enrolled in Year 2, 1st Sem (t1, the "current" term).
    ['at19','s1','t1','c20','currently_enrolled',null,'sl20'],
    ['at20','s1','t1','c21','currently_enrolled',null,'sl21'],
    ['at21','s1','t1','c22','currently_enrolled',null,'sl22'],
    ['at22','s1','t1','c23','currently_enrolled',null,'sl23'],
    ['at23','s1','t1','c24','currently_enrolled',null,'sl24'],
    ['at24','s1','t1','c25','currently_enrolled',null,'sl25'],
    ['at25','s1','t1','c26','currently_enrolled',null,'sl26'],
    ['at26','s1','t1','c27','currently_enrolled',null,'sl27'],
    // s1 - extra/unmapped attempts feeding the elective-mapping and transfer-equivalency demos.
    ['at27','s1','t0','c59','passed',1.5,null],
    ['at28','s1','t0','c62','passed',1.75,null],
    // s2 - delinquent: 12 failed units plus a lapsed INC.
    ['at29','s2','t0','c1','passed',2.0,'sl1'],
    ['at30','s2','t1','c2','failed',5.0,'sl2'],
    ['at31','s2','t1','c20','failed',5.0,'sl20'],
    ['at32','s2','t1','c28','failed',5.0,'sl28'],
    ['at33','s2','t1','c21','inc',null,'sl21'],
    // s3 - borderline pending INC (deadline just after today).
    ['at34','s3','t0','c1','passed',1.5,'sl1'],
    ['at35','s3','t0','c11','inc',null,'sl11'],
    // s4 - minimal history.
    ['at36','s4','t0','c1','passed',1.75,'sl1']
  ];
  const incDeadlines={at11:'2026-10-26',at33:'2026-08-01',at35:'2026-09-21'};
  seed.attempts=attempts.map(([id,student_id,t,c,status,final_grade,curriculum_term_course_id])=>({id,student_id,course_offering_id:t+'-'+c,curriculum_term_course_id,status,final_grade,midterm_grade:final_grade,inc_deadline:status==='inc'?incDeadlines[id]:null,prerequisite_override:false,prerequisite_override_reason:'',created_at:t==='t0'?'2025-06-09T09:00:00':'2026-06-08T09:00:00',updated_at:'2026-09-08T09:00:00'}));
  const key='saais-demo-v5';
  let db;try{db=JSON.parse(localStorage.getItem(key))||structuredClone(seed);}catch{db=structuredClone(seed);}
  const find=(table,id)=>db[table].find(x=>x.id===id);
  // Terms carry only start/end years. Order and INC defaults are derived from them and the term type.
  const termOrder={'1st Semester':1,'2nd Semester':2,'Summer':3};
  const termKey=t=>t.start_year*10+(termOrder[t.term_type]||0);
  const termEndDate=t=>{const [m,d]={'1st Semester':[10,31],'2nd Semester':[3,31],'Summer':[7,31]}[t.term_type]||[12,31];return `${t.term_type==='1st Semester'?t.start_year:t.end_year}-${String(m).padStart(2,'0')}-${d}`;};
  const schoolYear=(type,start,end)=>type==='Summer'?`${end-1} - ${end}`:`${start} - ${end}`;
  const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(db));return true;}catch{return false;}};
  const grade=a=>{const r=db.resolutions.find(r=>r.attempt_id===a.id);if(r)return Number(r.completion_grade);if(a.status==='inc')return a.inc_deadline<today?5:null;return ['passed','failed'].includes(a.status)?Number(a.final_grade):null;};
  const course=a=>find('courses',find('offerings',a.course_offering_id)?.course_id);
  const passed=a=>a.status==='passed'||(a.status==='inc'&&db.resolutions.some(r=>r.attempt_id===a.id&&Number(r.completion_grade)<=3));
  const metrics=(student,term)=>{
    const rows=db.attempts.filter(a=>a.student_id===student&&(!term||find('offerings',a.course_offering_id)?.school_term_id===term));
    let counted=[];
    for(const c of db.courses){const list=rows.filter(a=>course(a)?.id===c.id).sort((a,b)=>{const ta=termKey(find('terms',find('offerings',a.course_offering_id).school_term_id));const tb=termKey(find('terms',find('offerings',b.course_offering_id).school_term_id));return (ta-tb)||a.created_at.localeCompare(b.created_at);});const ps=list.filter(passed);if(c.repeatable_type==='additional_credit')counted.push(...ps);else if(ps.length)counted.push(ps.at(-1));else if(list.length)counted.push(list.at(-1));}
    let units=0,weighted=0,earned=0,failed=0;
    counted.forEach(a=>{const g=grade(a),u=Number(course(a).units);if(g!==null){units+=u;weighted+=g*u;}if(passed(a))earned+=u;if(g!==null&&g>3)failed+=u;});
    const ca=db.curriculumAssignments.find(a=>a.student_id===student&&!a.end_date);const cv=find('curricula',ca?.curriculum_version_id);const threshold=Number(cv?.delinquency_threshold||12);
    const delinquent=term?failed>=threshold:db.terms.some(t=>metrics(student,t.id).failed>=threshold);
    return {gwa:units?(weighted/units).toFixed(2):'—',units,earned,failed,delinquent,threshold,total:cv?.total_units||156};
  };
  const audit=(actor,action,entity_type,entity_id,old_value,new_value,reason='')=>db.audit.unshift({id:uid(),actor_id:actor,action,entity_type,entity_id,old_value:old_value?structuredClone(old_value):null,new_value:new_value?structuredClone(new_value):null,reason,created_at:new Date().toISOString()});
  window.SAAIS={get db(){return db;},find,termKey,termEndDate,schoolYear,uid,save,grade,course,passed,metrics,audit,today,reset(){db=structuredClone(seed);save();},seed};
})();
