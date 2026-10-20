// Generates only the Department Staff static pages. Run: node build-pages.cjs
const fs=require('node:fs');
const path=require('node:path');
const pages=[
  [
    "Students",
    "Students",
    "Find and maintain student records within your department.",
    "users"
  ],
  [
    "AdviserAssignments",
    "Adviser assignments",
    "Assign and reassign advisers to students in your department.",
    "assign"
  ],
  [
    "AcademicTerms",
    "Academic terms",
    "Review open and closed semesters and their encoding periods.",
    "calendar"
  ],
  [
    "Curricula",
    "Curricula",
    "View active department curricula and subjects opened for the current semester.",
    "book"
  ],
  [
    "AccountsRoles",
    "Accounts and roles",
    "Department of Computer Science and Technology",
    "users"
  ]
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
bodies.Students=panel('Department directory','612 enrolled students · BSCS and BSIT · AY 2025–2026, 1st semester',filterBar()+`<div id="student-table">${table(['Student','School email','Curriculum','Year standing','Adviser'],students.map(s=>[person(s),s[2],badge(s[3]),s[5],s[4]]))}</div>`+foot('<span data-result-count>8 sample students</span>'));
bodies.AdviserAssignments=notice('Reassignment takes effect on the selected date. The previous adviser and assignment history remain visible.')+panel('Student–adviser assignments','Select one or more students to reassign together.',filterBar(true)+`<div class="toolbar assignment-actions"><span class="selected-count" id="selection-count">0 students selected</span>${btn('Reassign selected','reassign',true,'assign')}</div><div id="student-table">${table(['<input type="checkbox" aria-label="Select all visible students" id="select-all">','Student','Current adviser','Since','Previous adviser'],students.map((s,i)=>[`<input type="checkbox" class="student-check" aria-label="Select ${s[0]}">`,person(s)+badge(s[3]),s[4],i<3?'05 Aug 2025':'12 Aug 2024',i%2?'Prof. Adrian Tan':'—']))}</div>`+foot('<span data-result-count>8 sample assignments</span>'));
bodies.AcademicTerms=notice('Closing encoding prevents further grade entry for the term. A backup reminder is sent to the administrator; backup records are maintained by the administrator.')+panel('Academic term history','Encoding windows are tracked separately for each semester.',table(['Academic year','Semester','Term dates','Encoding deadline','Status',''],[
 ['<strong>2025–2026</strong>','1st semester','04 Aug – 19 Dec 2025','05 Jan 2026',badge('Open','green'),btn('Close encoding','closeTerm')],
 ['2024–2025','2nd semester','13 Jan – 30 May 2025','13 Jun 2025',badge('Closed'),view('View term','termDetail')],
 ['2024–2025','1st semester','05 Aug – 20 Dec 2024','06 Jan 2025',badge('Closed'),view('View term','termDetail')],
 ['2023–2024','2nd semester','15 Jan – 31 May 2024','14 Jun 2024',badge('Closed'),view('View term','termDetail')]
])+foot('1 open term · 3 closed terms'));
bodies.Curricula=`<div class="version-cards active-curricula">${[['BSCS 2024','BS Computer Science · DCST','Current','green','286','Effective AY 2024–2025'],['BSCS 2021','BS Computer Science · DCST','Older curriculum','','142','Effective AY 2021–2022'],['BSIT 2024','BS Information Technology · DCST','Current','green','184','Effective AY 2024–2025']].map(v=>`<article class="version ${v[2]==='Current'?'current':''}">${badge('Active','green')} ${badge(v[2])}<h2>${v[0]}</h2><p>${v[1]}</p><div class="enrolled">${v[4]} <small>students enrolled</small></div><footer><small>${v[5]}</small></footer></article>`).join('')}</div>`+panel('Opened subjects','AY 2025–2026 · 1st semester · BSCS 2024',`<div class="toolbar">${select('Curriculum',['BSCS 2024','BSCS 2021','BSIT 2024'],'data-offering="curriculum"')}${select('Year standing',['All year levels','1st year','2nd year','3rd year','4th year'],'data-offering="year"')}</div><div id="offerings">${table(['Year','Code / course subject','Units','Category','Pre-requisites','Co-requisites'],[
 ['1st', '<strong class="mono">CC 101</strong><small>Introduction to Computing</small>','3','Professional','None','None'],
 ['1st', '<strong class="mono">CC 102</strong><small>Computer Programming 1</small>','3','Professional','None','CC 102L'],
 ['2nd', '<strong class="mono">CC 104</strong><small>Data Structures and Algorithms</small>','3','Professional','CC 103 · course','CC 104L'],
 ['2nd', '<strong class="mono">CS 211</strong><small>Discrete Structures 2</small>','3','Professional','CS 112 · course','None'],
 ['3rd', '<strong class="mono">CS 311</strong><small>Software Engineering 1</small>','3','Professional','CC 106; 3rd-year standing','CS 311L'],
 ['3rd', '<strong class="mono">CS ELEC 1</strong><small>Intelligent Systems</small>','3','Elective','Professional category · ≥ 18 units','None'],
 ['4th', '<strong class="mono">CS 411</strong><small>Thesis 1</small>','3','Professional','CS 322; 4th-year standing','None']
])}</div>`+foot('7 opened subjects · 21 units'));


const accounts=[
 ['Dr. Andrea Dela Cruz','andrea.delacruz@vsu.edu.ph',['Department Head','Adviser'],'AC'],
 ['Dr. Elena Reyes','elena.reyes@vsu.edu.ph',['Adviser'],'ER'],
 ['Prof. Marco Villanueva','marco.villanueva@vsu.edu.ph',['Adviser'],'MV'],
 ['Ms. Clara Bautista','clara.bautista@vsu.edu.ph',['Department staff'],'CB']
];
const roleTone={'Department Head':'amber','Adviser':'green','Department staff':'blue','Dean':''};
bodies.AccountsRoles=panel('People','',table(['Name','VSU email','Roles'],accounts.map(a=>[
 '<div class="account-person"><span class="account-avatar">'+a[3]+'</span><strong>'+a[0]+'</strong></div>',
 '<span class="mono">'+a[1]+'</span>',
 '<div class="account-roles">'+a[2].map(r=>badge(r,roleTone[r])).join('')+'</div>'
])),'<span class="badge account-total">4 accounts</span>');

const actions={Students:btn('Import spreadsheet','import',true,'download'),AdviserAssignments:'',AcademicTerms:btn('Add a term','addTerm',true,'plus'),Curricula:'',AccountsRoles:btn('Add account','provision',true,'plus')};
const shellIcon=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${({right:'M9 5l7 7-7 7',down:'M6 9l6 6 6-6',logout:'M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M15.5 16.5 20 12l-4.5-4.5M20 12H9'})[kind]}"/></svg>`;
for(const [key,title,desc] of pages){
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Department Staff · SAAIS</title><link rel="stylesheet" href="department-staff.css"><script src="department-staff.js" defer></script><script src="portal-shell.js" defer></script></head><body data-page="${key}"><a class="skip-link" href="#main">Skip to content</a><div class="shell"><button class="nav-backdrop" type="button" aria-label="Close navigation" data-menu-close hidden></button><aside class="sidebar" id="staff-navigation"><button type="button" class="btn mobile-menu drawer-close" data-menu-close>Close navigation</button><a class="brand" href="index.html"><img src="../logo-mark.png" alt=""><span><b>SAAIS</b><small>Department Staff portal</small></span></a><nav aria-label="Department Staff">${pages.map(([k,t,d,i])=>`<a href="${k}.dc.html" class="${k===key?'active':''}" ${k===key?'aria-current="page"':''}>${icon(i)}<span>${t}</span></a>`).join('')}</nav><div class="side-bottom"><button type="button" class="side-link" data-dialog="help">${icon('book')}Help & documentation</button><div class="user-menu"><div class="user-menu-list" id="user-menu-list" hidden><button type="button" data-signout>${shellIcon('logout')}Sign out</button></div><button type="button" class="user-trigger" aria-expanded="false" aria-controls="user-menu-list"><span class="avatar">CB</span><span class="user-name"><b>Ms. Clara Bautista</b><small>Department Staff · DCST</small></span>${shellIcon('down')}</button></div></div></aside><div class="workspace"><header class="topbar"><div class="actions"><button type="button" class="btn mobile-menu" data-menu-open aria-controls="staff-navigation" aria-expanded="false">Menu</button><nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Department workspace</a>${shellIcon('right')}<b aria-current="page">${title}</b></nav></div></header><main id="main"><div class="page-heading"><div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${actions[key]}</div></div>${bodies[key]}<p class="sample-caption">Sample records for presentation · Reference date: 15 August 2025 · Static design</p></main></div></div><dialog id="preview-dialog" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title"></h2><button type="button" class="close" aria-label="Close dialog">×</button></div><div class="dialog-body" id="dialog-content"></div><div class="dialog-foot"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" id="dialog-confirm">Preview action</button></div></dialog><div class="toast" role="status" hidden></div></body></html>`;
 fs.writeFileSync(path.join(__dirname,key+'.dc.html'),html);
}
fs.writeFileSync(path.join(__dirname,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Department Staff · SAAIS</title><meta http-equiv="refresh" content="0;url=Students.dc.html"></head><body><a href="Students.dc.html">Open the Department Staff workspace</a></body></html>');
console.log('Generated 5 Department Staff pages and index.html.');
