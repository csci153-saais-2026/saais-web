// Generates only the Department Head static mockups. Run: node build-pages.cjs
const fs = require('node:fs');
const path = require('node:path');
const pages = [
 ['CurriculumTransfers','Curriculum transfers','Review adviser-endorsed requests to move students to another curriculum.','transfer'],
 ['Curricula','Curricula','Manage curriculum versions and review subjects opened for the semester.','book'],
 ['Equivalence','Equivalence','Define one-to-one course equivalencies between curriculum versions.','link'],
 ['OutsideCredits','Outside credits','Review credited subjects for shiftees and transferees in your department.','credit'],
 ['Students','Students','Find and review students across the Department of Computer Science and Technology.','users'],
 ['AdviserAssignments','Adviser assignments','Keep every student connected to an adviser in your department.','assign'],
 ['AcademicTerms','Academic terms','Review semester dates and manage the grade encoding period.','calendar'],
 ['DepartmentReports','Department reports','A semester snapshot of student progress across your department.','chart'],
 ['AuditLog','Audit log','Review record views, changes, and sign-ins within your department.','log'],
 ['Settings','Settings','Configure department standing rules, email, and backup records.','settings']
];
const shapes={transfer:'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16',link:'m10 13 4-4M8 15l-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 5l-4 4a4 4 0 0 1-6 0',credit:'M4 4h16v16H4zM8 9h8m-8 4h4m2 3 2 2 4-4',users:'M15 21v-3a5 5 0 0 0-10 0v3M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 3a4 4 0 0 1 0 7m3 11v-3a5 5 0 0 0-2-4',assign:'M4 4h10v6H4zM4 14h10v6H4zM17 8l4 4-4 4m-3-4h7',calendar:'M4 5h16v16H4zM8 2v6m8-6v6M4 11h16',chart:'M4 3v18h18M9 17v-5m5 5V7m5 10V4',log:'M6 3h12v18H6zM9 7h6m-6 5h6m-6 5h4',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3H6l-4-5 3-3V6z',plus:'M12 5v14M5 12h14',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',search:'M21 21l-6-6M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',arrow:'M4 12h16m-6-6 6 6-6 6'};
Object.assign(shapes,{book:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13',assign:'M4 8h13l-3.5-3.5M20 16H7l3.5 3.5',calendar:'M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4',users:'M12.6 8a3.6 3.6 0 1 1-7.2 0 3.6 3.6 0 0 1 7.2 0M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.6 3.6 0 0 1 0 5.6M17.5 20a6.6 6.6 0 0 0-2.2-4.9'});
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${shapes[n]||shapes.book}"/></svg>`;
const badge=(t,c='')=>`<span class="badge ${c}">${t}</span>`;
const btn=(t,action='',primary=false,i='')=>`<button type="button" class="btn ${primary?'primary':''}" ${action?`data-dialog="${action}"`:''}>${i?icon(i):''}${t}</button>`;
const view=(t,a)=>`<button class="text-btn" type="button" data-dialog="${a}">${t}</button>`;
const table=(heads,rows)=>`<div class="table-wrap"><table class="data cards"><thead><tr>${heads.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td data-label="${heads[i].includes('<input')?'Select':heads[i]||'Actions'}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const panel=(title,sub,body,action='')=>`<section class="panel"><header class="panel-head"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${action}</header>${body}</section>`;
const foot=(t)=>`<div class="table-foot"><span>${t}</span><span>DCST department scope</span></div>`;
const field=(label,value='',type='text',extra='')=>`<label ${extra}><span>${label}</span><input type="${type}" value="${value}" ${type==='number'?'min="0" max="100" step="1"':''}></label>`;
const select=(label,items,extra='')=>`<label ${extra}><span>${label}</span><select>${items.map(v=>`<option>${v}</option>`).join('')}</select></label>`;
const notice=(t,w=false)=>`<div class="notice ${w?'warning':''}">${t}</div>`;
const stats=items=>`<div class="stats">${items.map(([l,n,s])=>`<article class="stat"><span class="label">${l}</span><strong>${n}</strong><small>${s}</small></article>`).join('')}</div>`;
const students=[
 ['Ana Marie Santos','24-1-00124','ana.santos@school.edu.ph','BSCS 2024','Dr. Elena Reyes','2nd year','1.50'],
 ['Luis Miguel Cruz','23-1-00218','luis.cruz@school.edu.ph','BSCS 2021','Prof. Marco Villanueva','3rd year','1.75'],
 ['Sofia Isabel Garcia','24-1-00316','sofia.garcia@school.edu.ph','BSIT 2024','Prof. Patricia Lim','2nd year','1.25'],
 ['Gabriel Mendoza','22-1-00145','gabriel.mendoza@school.edu.ph','BSCS 2021','Dr. Elena Reyes','4th year','2.00'],
 ['Isabella Ramos','25-1-00087','isabella.ramos@school.edu.ph','BSCS 2024','Prof. Marco Villanueva','1st year','1.75'],
 ['Daniel Flores','23-1-00256','daniel.flores@school.edu.ph','BSIT 2024','Prof. Patricia Lim','3rd year','2.25'],
 ['Camille Torres','24-1-00192','camille.torres@school.edu.ph','BSCS 2024','Dr. Elena Reyes','2nd year','1.75'],
 ['Rafael Navarro','24-1-00204','rafael.navarro@school.edu.ph','BSCS 2024','Prof. Marco Villanueva','2nd year','2.00']
];
const person=s=>`<strong>${s[0]}</strong><small class="mono">${s[1]}</small>`;
const filterBar=(assignment=false)=>`<div class="toolbar"><label><span>Search students</span><input type="search" data-filter="search" placeholder="Search by student name or ID"></label>${select('Curriculum',['All curricula','BSCS 2024','BSCS 2021','BSIT 2024'],'data-filter-label="curriculum"')}${select('Adviser',['All advisers','Dr. Elena Reyes','Prof. Marco Villanueva','Prof. Patricia Lim'],'data-filter-label="adviser"')}${assignment?'':`<button class="text-btn" data-reset type="button">Reset filters</button>`}</div>`;
const bodies={};
bodies.CurriculumTransfers=stats([['Pending review','3','Requests endorsed by advisers'],['Approved this semester','12','AY 2025–2026 · 1st semester'],['Rejected this semester','2','Decisions include a reason']])+`<div class="tabs"><a class="active" href="CurriculumTransfers.dc.html">Pending review (3)</a><a href="CurriculumTransfers.dc.html?history=1">Decision history (14)</a></div>`+panel('Transfer requests','Review the student record and adviser’s reason before making a decision.',table(['Student','Current curriculum','Requested curriculum','Adviser','Submitted',''],[
 [person(students[1]),'BSCS 2021','BSCS 2024','Prof. Marco Villanueva','14 Aug 2025',view('Review request →','transfer')],
 [person(students[3]),'BSCS 2018','BSCS 2021','Dr. Elena Reyes','13 Aug 2025',view('Review request →','transfer2')],
 [person(students[5]),'BSIT 2021','BSIT 2024','Prof. Patricia Lim','12 Aug 2025',view('Review request →','transfer3')]
])+foot('3 requests awaiting a decision'))+notice('Requests originate from the student’s adviser. Approved transfers use the equivalencies defined for the curriculum pair.');
bodies.Curricula=`<div class="version-cards">${[['BSCS 2024','BS Computer Science · DCST','Current','green','286','Effective AY 2024–2025'],['BSCS 2021','BS Computer Science · DCST','Older curriculum','','142','Effective AY 2021–2022'],['BSIT 2024','BS Information Technology · DCST','Current','green','184','Effective AY 2024–2025']].map((v,i)=>`<article class="version ${i!==1?'current':''}">${badge(v[2],v[3])}<h2>${v[0]}</h2><p>${v[1]}</p><div class="enrolled">${v[4]} <small>students enrolled</small></div><footer><small>${v[5]}</small>${view('Rename','rename')}</footer></article>`).join('')}</div>`+panel('Opened subjects','AY 2025–2026 · 1st semester · BSCS 2024',`<div class="toolbar">${select('Curriculum',['BSCS 2024','BSCS 2021','BSIT 2024'],'data-offering="curriculum"')}${select('Year standing',['All year levels','1st year','2nd year','3rd year','4th year'],'data-offering="year"')}</div><div id="offerings">${table(['Year','Code / course subject','Units','Category','Pre-requisites','Co-requisites'],[
 ['1st', '<strong class="mono">CC 101</strong><small>Introduction to Computing</small>','3','Professional','None','None'],
 ['1st', '<strong class="mono">CC 102</strong><small>Computer Programming 1</small>','3','Professional','None','CC 102L'],
 ['2nd', '<strong class="mono">CC 104</strong><small>Data Structures and Algorithms</small>','3','Professional','CC 103 · course','CC 104L'],
 ['2nd', '<strong class="mono">CS 211</strong><small>Discrete Structures 2</small>','3','Professional','CS 112 · course','None'],
 ['3rd', '<strong class="mono">CS 311</strong><small>Software Engineering 1</small>','3','Professional','CC 106; 3rd-year standing','CS 311L'],
 ['3rd', '<strong class="mono">CS ELEC 1</strong><small>Intelligent Systems</small>','3','Elective','Professional category · ≥ 18 units','None'],
 ['4th', '<strong class="mono">CS 411</strong><small>Thesis 1</small>','3','Professional','CS 322; 4th-year standing','None']
])}</div>`+foot('7 opened subjects · 21 units'));
bodies.Equivalence=notice('Equivalencies apply to a curriculum pair, one course to one course. A credited course satisfies its mapped requirement; credit is counted once.')+panel('Curriculum equivalencies','Different codes and titles, the same credited requirement.',`<div class="toolbar">${select('From curriculum',['BSCS 2021','BSIT 2021'],'data-equivalence="from"')}${select('To curriculum',['BSCS 2024','BSIT 2024'],'data-equivalence="to"')}</div><div id="equivalence-table">${table(['Old course subject','Units','Equivalent course subject','Units','Curriculum pair',''],[
 ['<strong class="mono">CS 101</strong><small>Fundamentals of Computing</small>','3','<strong class="mono">CC 101</strong><small>Introduction to Computing</small>','3','BSCS 2021 → 2024',badge('Equivalent','green')],
 ['<strong class="mono">CS 102</strong><small>Programming Fundamentals</small>','3','<strong class="mono">CC 102</strong><small>Computer Programming 1</small>','3','BSCS 2021 → 2024',badge('Equivalent','green')],
 ['<strong class="mono">CS 203</strong><small>Data Structures</small>','3','<strong class="mono">CC 104</strong><small>Data Structures and Algorithms</small>','3','BSCS 2021 → 2024',badge('Equivalent','green')],
 ['<strong class="mono">CS 301</strong><small>Database Management Systems</small>','3','<strong class="mono">CC 105</strong><small>Information Management</small>','3','BSCS 2021 → 2024',badge('Equivalent','green')]
])}</div>`+foot('4 course equivalencies'));
bodies.OutsideCredits=stats([['Credited subjects','28','AY 2025–2026 · 1st semester'],['Students with outside credits','9','6 transferees · 3 shiftees'],['Units recognized','84','Across BSCS and BSIT curricula']])+panel('Outside credit records','Recognized subjects from another school or degree program.',table(['Student','Original course / units','School / origin','Grade','Equivalent subject / units',''],[
 [person(students[0]),'<strong>CS 101 · Computing Fundamentals</strong><small>3 units</small>','Northern State College', '1.50','<strong>CC 101 · Introduction to Computing</strong><small>3 units · BSCS 2024</small>',badge('Transferee','blue')],
 [person(students[2]),'<strong>IT 102 · Introductory Programming</strong><small>3 units</small>','Central Polytechnic College','1.75','<strong>CC 102 · Computer Programming 1</strong><small>3 units · BSIT 2024</small>',badge('Transferee','blue')],
 [person(students[4]),'<strong>MATH 101 · College Mathematics</strong><small>3 units</small>','Same institution · BS Mathematics','1.50','<strong>GE 4 · Mathematics in the Modern World</strong><small>3 units · BSCS 2024</small>',badge('Shiftee')],
 [person(students[6]),'<strong>ENG 101 · Communication Skills</strong><small>3 units</small>','East Valley University','1.25','<strong>GE 1 · Purposive Communication</strong><small>3 units · BSCS 2024</small>',badge('Transferee','blue')]
])+foot('Showing 4 sample records of 28 credited subjects'));
bodies.Students=panel('Department directory','612 enrolled students · BSCS and BSIT · AY 2025–2026, 1st semester',filterBar()+`<div id="student-table">${table(['Student','School email','Curriculum','Year standing','Adviser'],students.map(s=>[person(s),s[2],badge(s[3]),s[5],s[4]]))}</div>`+foot('<span data-result-count>8 sample students</span>'));
bodies.AdviserAssignments=notice('Reassignment takes effect on the selected date. The previous adviser and assignment history remain visible.')+panel('Student–adviser assignments','Select one or more students to reassign together.',filterBar(true)+`<div class="toolbar assignment-actions"><span class="selected-count" id="selection-count">0 students selected</span>${btn('Reassign selected','reassign',true,'assign')}</div><div id="student-table">${table(['<input type="checkbox" aria-label="Select all visible students" id="select-all">','Student','Current adviser','Since','Previous adviser'],students.map((s,i)=>[`<input type="checkbox" class="student-check" aria-label="Select ${s[0]}">`,person(s)+badge(s[3]),s[4],i<3?'05 Aug 2025':'12 Aug 2024',i%2?'Prof. Adrian Tan':'—']))}</div>`+foot('<span data-result-count>8 sample assignments</span>'));
bodies.AcademicTerms=notice('Closing encoding prevents further grade entry for the term. A backup reminder is sent to the administrator; the Department Head can record a completed backup in Settings.')+panel('Academic term history','Encoding windows are tracked separately for each semester.',table(['Academic year','Semester','Term dates','Encoding deadline','Status',''],[
 ['<strong>2025–2026</strong>','1st semester','04 Aug – 19 Dec 2025','05 Jan 2026',badge('Open','green'),btn('Close encoding','closeTerm')],
 ['2024–2025','2nd semester','13 Jan – 30 May 2025','13 Jun 2025',badge('Closed'),view('View term','termDetail')],
 ['2024–2025','1st semester','05 Aug – 20 Dec 2024','06 Jan 2025',badge('Closed'),view('View term','termDetail')],
 ['2023–2024','2nd semester','15 Jan – 31 May 2024','14 Jun 2024',badge('Closed'),view('View term','termDetail')]
])+foot('1 open term · 3 closed terms'));
bodies.DepartmentReports=`<div class="toolbar" style="padding:0 0 22px;border:0">${select('Academic term',['AY 2025–2026 · 1st semester','AY 2024–2025 · 2nd semester'],'data-report-term')}${select('Degree program',['All department programs','BS Computer Science','BS Information Technology'],'data-report-program')}</div><div id="report-content">`+stats([['Currently enrolled','612','BSCS 428 · BSIT 184'],['Mean GWA','1.87','Weighted by completed academic units'],['Students with deficiencies','47','7.7% of enrolled students']])+`<div class="split">`+panel('Final grade distribution','AY 2025–2026 · 1st semester',`<div class="panel-body"><div class="bars">${[['1.00–1.50',32,960],['1.75–2.25',41,1230],['2.50–3.00',19,570],['5.00',5,150],['INC / DR / NA',3,90]].map(([l,p,n])=>`<div class="bar"><div class="bar-label"><span>${l}</span><span><b>${p}%</b> <span class="muted">· ${n.toLocaleString()} grades</span></span></div><div class="track"><div class="fill" style="width:${p}%"></div></div></div>`).join('')}</div><p class="caption">3,000 course grade records · Percentages sum to 100%.<br>INC, DR, and NA are excluded from the mean GWA.</p></div>`)+panel('Department summary','Enrollment by active curriculum',`<div class="panel-body">${[['BSCS 2024','286 students','Current'],['BSCS 2021','142 students','Older'],['BSIT 2024','184 students','Current']].map(v=>`<div style="padding:15px 0;border-bottom:1px solid var(--line)"><div class="actions" style="justify-content:space-between"><strong>${v[0]}</strong>${badge(v[2],v[2]==='Current'?'green':'')}</div><p class="muted" style="margin-top:7px;font-size:13px">${v[1]}</p></div>`).join('')}<p class="caption">Figures are fictional design examples for this department.</p></div>`)+`</div>`+panel('GWA by batch and curriculum','Entry year, study range, and academic performance for each cohort.',table(['Entry year','Study range','Curriculum','Students','Mean GWA',''],[
 ['2025','2025–2029','BSCS 2024','108','1.92',view('View students →','batch2025')],
 ['2024','2024–2028','BSCS 2024','96','1.75',view('View students →','batch2024')],
 ['2023','2023–2027','BSCS 2021','82','1.89',view('View students →','batch2023')],
 ['2022','2022–2026','BSCS 2021','60','2.04',view('View students →','batch2022')]
])+foot('BSCS cohort preview · Report views are included in the audit log'))+`</div>`;
bodies.AuditLog='<div class="portal-audit">'+panel('Department activity','Record views are logged alongside changes and sign-ins.',`<div class="toolbar"><label for="aud-person"><span>Person</span><input id="aud-person" type="search" placeholder="Search person name"></label><label for="aud-student"><span>Student</span><input id="aud-student" type="search" placeholder="Search student name or ID"></label><label for="aud-action"><span>Action</span><select id="aud-action"><option value="">All actions</option><option>View</option><option>Change</option><option>Sign-in</option></select></label><label for="aud-from"><span>From date</span><input id="aud-from" type="date"></label><label for="aud-to"><span>To date</span><input id="aud-to" type="date"></label></div><div id="audit-table">${table(['Timestamp','Person','Action','Student / record','Details'],[
 ['15 Aug 2025<br><small>10:42 AM</small>','Ana Marie Santos',badge('View','blue'),'24-1-00124 · Own record','Viewed curriculum checklist'],
 ['15 Aug 2025<br><small>10:35 AM</small>','Luis Miguel Cruz',badge('Sign-in'),'23-1-00218 · Student portal','Successful school email sign-in'],
 ['15 Aug 2025<br><small>10:20 AM</small>','Dr. Elena Reyes',badge('View','blue'),'24-1-00124 · Ana Marie Santos','Viewed student academic record'],
 ['14 Aug 2025<br><small>03:16 PM</small>','Prof. Marco Villanueva',badge('Change','green'),'23-1-00218 · Luis Miguel Cruz','Submitted curriculum transfer request'],
 ['14 Aug 2025<br><small>02:08 PM</small>','Dr. Andrea Dela Cruz',badge('View','blue'),'BSCS · Batch 2024','Viewed batch student GWA report'],
 ['13 Aug 2025<br><small>11:40 AM</small>','Sofia Isabel Garcia',badge('Change','green'),'24-1-00316 · Own profile','Updated contact information'],
 ['13 Aug 2025<br><small>09:12 AM</small>','Dr. Andrea Dela Cruz',badge('Change','green'),'DCST · Adviser assignments','Reassigned 3 students to Dr. Elena Reyes']
])}</div>`+foot('<span id="audit-count">7 sample events</span>'))+'</div>';
bodies.Settings=fs.readFileSync(path.join(__dirname,'settings-layout.html'),'utf8');
const actions={CurriculumTransfers:'',Curricula:btn('New version','newVersion',true,'plus'),Equivalence:btn('Add course equivalence','equivalence',true,'plus'),OutsideCredits:btn('Credit a course','credit',true,'plus'),Students:btn('Import spreadsheet','import',true,'download'),AdviserAssignments:'',AcademicTerms:'<button class="btn" type="button" data-export-pdf>'+icon('download')+' Export PDF</button>'+btn('Add a term','addTerm',true,'plus'),DepartmentReports:'<button class="btn" type="button" data-export-pdf>'+icon('download')+' Export PDF</button>',AuditLog:'',Settings:''};
const shellIcon=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${({right:'M9 5l7 7-7 7',down:'M6 9l6 6 6-6',logout:'M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M15.5 16.5 20 12l-4.5-4.5M20 12H9'})[kind]}"/></svg>`;
Object.assign(shapes, {
 dashboard:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
 encode:'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
 upload:'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
 flag:'M5.5 21V3.5M5.5 4.5h12l-2.4 4 2.4 4h-12'
});
const adviserPages = [
 ['AdviserDashboard','Dashboard','dashboard'],
 ['AdviserAdvisees','Advisees','users'],
 ['AdviserEncodeGrades','Encode grades','encode'],
 ['AdviserImportGrades','Import grades','upload'],
 ['AdviserGradeFlags','Grade flags','flag']
];
const roleSection = (title, links, open) => `<details class="role-nav-section" ${open ? "open" : ""}><summary class="role-nav-label">${title}</summary><div class="role-nav-links">${links}</div></details>`;
const departmentLinks = key => pages.map(([k,t,d,i]) => `<a class="role-link ${k===key?'active':''}" href="${k}.dc.html" ${k===key?'aria-current="page"':''}>${icon(i)}<span>${t}</span></a>`).join('');
const adviserLinks = () => adviserPages.map(([k,t,i]) => `<a class="role-link" href="${k}.dc.html">${icon(i)}<span>${t}</span></a>`).join('');
for(const [key,title,desc] of pages){
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Department Head · SAAIS</title><link rel="stylesheet" href="department-head.css"><link rel="stylesheet" href="department-navigation.css"><script src="pdf-export.js" defer></script><script src="department-head.js" defer></script><script src="portal-shell.js" defer></script><link rel="stylesheet" href="audit-settings.css"><script src="audit-settings.js" defer></script></head><body data-page="${key}"><a class="skip-link" href="#main">Skip to content</a><div class="shell"><button class="nav-backdrop" type="button" aria-label="Close navigation" data-menu-close hidden></button><aside class="sidebar" id="head-navigation"><button type="button" class="btn mobile-menu drawer-close" data-menu-close>Close navigation</button><a class="brand" href="index.html"><img src="../logo-mark.png" alt=""><span><b>SAAIS</b><small>Department Head portal</small></span></a><nav class="role-navigation" aria-label="Department Head workspace">${roleSection("Adviser", adviserLinks(), false)}${roleSection("Department Head", departmentLinks(key), true)}</nav><div class="side-bottom"><button type="button" class="side-link" data-dialog="help">${icon('book')}Help & documentation</button><div class="user-menu"><div class="user-menu-list" id="user-menu-list" hidden><a href="Settings.dc.html">${icon('settings')}Settings</a><button type="button" data-signout>${shellIcon('logout')}Sign out</button></div><button type="button" class="user-trigger" aria-expanded="false" aria-controls="user-menu-list"><span class="avatar">AC</span><span class="user-name"><b>Dr. Andrea Dela Cruz</b><small>Department Head · DCST</small></span>${shellIcon('down')}</button></div></div></aside><div class="workspace"><header class="topbar"><div class="actions"><button type="button" class="btn mobile-menu" data-menu-open aria-controls="head-navigation" aria-expanded="false">Menu</button><nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Department workspace</a>${shellIcon('right')}<b aria-current="page">${title}</b></nav></div></header><main id="main"><div class="page-heading"><div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${actions[key]}</div></div>${bodies[key]}<p class="sample-caption">Sample records for presentation · Reference date: 15 August 2025 · Static design</p></main></div></div><dialog id="preview-dialog" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title"></h2><button type="button" class="close" aria-label="Close dialog">×</button></div><div class="dialog-body" id="dialog-content"></div><div class="dialog-foot"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" id="dialog-confirm">Preview action</button></div></dialog><div class="toast" role="status" hidden></div></body></html>`;
 fs.writeFileSync(path.join(__dirname,key+'.dc.html'),html);
}
fs.writeFileSync(path.join(__dirname,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Department Head · SAAIS</title><meta http-equiv="refresh" content="0;url=AdviserDashboard.dc.html"></head><body><a href="AdviserDashboard.dc.html">Open the Department Head workspace</a></body></html>');
// Keep adviser workflows and detail screens inside this folder.
// support.js is omitted because it redirects into the separate adviser portal.
const adviserSource = path.join(__dirname, '../Adviser');
const adviserFiles = fs.readdirSync(adviserSource).filter(file => file.endsWith('.dc.html'));
for (const file of adviserFiles) {
 let html = fs.readFileSync(path.join(adviserSource, file), 'utf8');
 html = html.replace('<script src="../support.js"></script>', '<link rel="stylesheet" href="department-navigation.css"><script src="adviser-navigation.js" defer></script>');
 html = html.replace(/<aside style=/, '<aside class="head-adviser-sidebar" id="head-navigation" style=');
 html = html.replace(/<nav aria-label="Academic adviser"([^>]*)>([\s\S]*?)<\/nav>/, (_, attrs, links) =>
  '<nav class="role-navigation" aria-label="Department Head workspace"' + attrs + '>' + roleSection('Adviser', links, true) + roleSection('Department Head', departmentLinks(''), false) + '</nav>');
 html = html.replaceAll('Adviser portal', 'Department Head portal')
  .replaceAll('Prof. Ramon Reyes', 'Dr. Andrea Dela Cruz')
  .replaceAll('Faculty of Computer Studies', 'Department Head \u00b7 DCST')
  .replaceAll('>RR<', '>AC<');
 fs.writeFileSync(path.join(__dirname, file), html);
}
console.log('Generated 10 Department Head pages, ' + adviserFiles.length + ' adviser screens, and index.html.');
