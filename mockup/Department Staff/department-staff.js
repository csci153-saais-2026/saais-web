'use strict';
// Dialog and filter interactions. Reassignments, terms, imports and accounts are saved by portal-actions.js.
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const dialog=$('#preview-dialog');
const field=(name,value='',type='text')=>`<label><span>${name}</span><input type="${type}" value="${value}"></label>`;
const select=(name,items,attrs='')=>`<label ${attrs}><span>${name}</span><select>${items.map(s=>`<option>${s}</option>`).join('')}</select></label>`;
const form=content=>`<div class="form-grid">${content}</div>`;
const note='';
const advisers=['Dr. Elena Reyes','Prof. Marco Villanueva','Prof. Patricia Lim'];
const roles=['Department Head','Adviser','Department staff','Dean','Student','Admin'];
const reason=label=>`<label class="wide"><span>${label}</span><textarea placeholder="Enter a reason"></textarea></label>`;
const roleFields=()=>`<fieldset class="account-role-picker"><legend>Roles</legend><div>${roles.map(role=>`<label><input type="checkbox" name="account-role" value="${role}">${role}</label>`).join('')}</div></fieldset>`;
const dialogs={
 provision:['Add account','<p class="account-dialog-intro">Pre-register a VSU account and assign its roles.</p>'+form(field('Full name')+field('VSU email','','email'))+roleFields()+'<p class="field-help">They sign in with Google using this address. Sign-ins from any other address are rejected.</p><p class="account-error" role="alert" hidden></p>','Add account'],
 import:['Import students from spreadsheet','<div class="notice">Required columns: student name, student ID, school email, curriculum, and adviser.</div><label><span>Spreadsheet file</span><input type="file" accept=".xlsx,.xls,.csv"></label><p class="field-help">XLSX, XLS, or CSV · IDs must follow YY-N-NNNNN (example: 24-1-00124).</p><h3 style="margin-top:22px">Validation example</h3><div class="table-wrap"><table><thead><tr><th scope="col">Row</th><th scope="col">Student ID</th><th scope="col">Result</th></tr></thead><tbody><tr><td>2</td><td>24-1-00124</td><td><span class="badge green">Ready</span></td></tr><tr><td>3</td><td>2024-218</td><td><span class="badge red">Invalid ID format</span></td></tr><tr><td>4</td><td>24-1-00124</td><td><span class="badge red">Duplicate ID</span></td></tr></tbody></table></div><p class="caption">Illustrative validation states. The static preview does not read or upload the selected file.</p>','Preview import'],
 reassign:['Reassign selected students',form(select('New adviser',advisers)+field('Effective since','2025-08-15','date')+reason('Reason for reassignment'))+'<p class="caption">The previous adviser and assignment history are retained. The effective date starts the new assignment.</p>','Reassign selected'],
 addTerm:['Add academic term',form(field('Academic year','2025–2026')+select('Semester',['1st semester','2nd semester','Midyear'])+field('Start date','','date')+field('Actual end date','','date')+field('Encoding deadline','','date')+select('Encoding status',['Open','Closed'])),'Add term'],
 closeTerm:['Close grade encoding','<p>Close encoding for <strong>AY 2025–2026 · 1st semester</strong>?</p><div class="notice warning" style="margin-top:20px">Grade entry will close for this term. A backup reminder will be sent to the administrator.</div>'+reason('Closure note'),'Close encoding'],
};
let toastTimer;
function toast(message){const el=$('.toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,5000);}
function esc(s){const el=document.createElement('span');el.textContent=s;return el.innerHTML;}
function openDialog(key,trigger){
 let spec=dialogs[key];const row=trigger.closest('tr');
 if(key==='reassign'&&!$$('.student-check:checked').length){toast('Select at least one student to preview reassignment.');return;}
 if(key==='termDetail'&&row){const cells=[...row.cells].map(c=>esc(c.textContent));spec=['Academic term details',`<dl class="detail-grid">${['Academic year','Semester','Term dates','Encoding deadline','Status'].map((label,i)=>`<div><dt>${label}</dt><dd>${cells[i]}</dd></div>`).join('')}</dl>`,''];}
 if(key.startsWith('cu-'))spec=cuDialog(key,trigger);
 if(key.startsWith('cc-'))spec=ccDialog(key,trigger);
 if(!spec)return;
 $('#dialog-title').textContent=spec[0];
 $('#dialog-content').innerHTML=(key==='reassign'?`<div class="notice">${$$('.student-check:checked').length} student(s) selected</div>`:'')+spec[1]+(/^c[uc]-/.test(key)?'<p class="account-error" role="alert" hidden></p>':note);
 $('#dialog-confirm').textContent=spec[2]||'';$('#dialog-confirm').hidden=!spec[2];
 dialog.dataset.preview=key;
 if(key==='provision'){const inputs=$$('input',dialog);inputs[0].placeholder='e.g. Prof. Jun Bautista';inputs[1].placeholder='name@vsu.edu.ph';}
 dialog.showModal();
}
document.addEventListener('click',e=>{
 const trigger=e.target.closest('[data-dialog]');if(trigger)openDialog(trigger.dataset.dialog,trigger);
 if(e.target.closest('[data-close],.close'))dialog.close();
 if(e.target.closest('[data-reset]')){$('[data-filter="search"]').value='';$$('[data-filter-label] select').forEach(s=>s.selectedIndex=0);filterStudents();}
});
$('#dialog-confirm').addEventListener('click',()=>{
 if((dialog.dataset.preview||'').startsWith('cu-')){if(cuConfirm(dialog.dataset.preview))dialog.close();return;}
 if((dialog.dataset.preview||'').startsWith('cc-')){if(ccConfirm(dialog.dataset.preview))dialog.close();return;}
 if(dialog.dataset.preview==='provision'){
  const name=$('input[type="text"]',dialog),email=$('input[type="email"]',dialog),error=$('.account-error',dialog);
  let message='';
  if(!name.value.trim())message='Enter the account holder’s full name.';
  else if(!/^[^\s@]+@vsu\.edu\.ph$/i.test(email.value.trim()))message='Use a VSU email address ending in @vsu.edu.ph.';
  else if(!$$('input[name="account-role"]:checked',dialog).length)message='Select at least one role.';
  error.textContent=message;error.hidden=!message;if(message)return;
 }
 dialog.close();toast('Preview only. No accounts, records, or academic terms were changed.');
});
function updateSelection(){const label=$('#selection-count');if(!label)return;label.textContent=`${$$('.student-check:checked').length} students selected`;const visible=$$('.student-check').filter(c=>!c.closest('tr').hidden),all=$('#select-all');all.checked=visible.length>0&&visible.every(c=>c.checked);all.indeterminate=visible.some(c=>c.checked)&&!all.checked;}
function filterStudents(){const q=$('[data-filter="search"]').value.toLowerCase().trim(),curr=$('[data-filter-label="curriculum"] select').value,adviser=$('[data-filter-label="adviser"] select').value;let count=0;
 $$('#student-table tbody tr').forEach(row=>{const text=row.textContent.toLowerCase();const student=$('strong',row).textContent.toLowerCase()+' '+$('.mono',row).textContent.toLowerCase();row.hidden=!(student.includes(q)&&(curr==='All curricula'||text.includes(curr.toLowerCase()))&&(adviser==='All advisers'||text.includes(adviser.toLowerCase())));if(!row.hidden)count++;else{const check=$('.student-check',row);if(check)check.checked=false;}});
 $('[data-result-count]').textContent=`${count} sample ${document.body.dataset.page==='Students'?'students':'assignments'}`;
 let empty=$('#student-empty');if(!empty){empty=document.createElement('p');empty.id='student-empty';empty.className='empty';empty.textContent='No students match these filters.';$('#student-table').append(empty);}empty.hidden=count!==0;updateSelection();
}
$$('[data-filter="search"],[data-filter-label] select').forEach(el=>el.addEventListener('input',filterStudents));
$$('.student-check').forEach(el=>el.addEventListener('change',updateSelection));
if($('#select-all'))$('#select-all').addEventListener('change',e=>{$$('.student-check').filter(c=>!c.closest('tr').hidden).forEach(c=>c.checked=e.target.checked);updateSelection();});
function filterOfferings(){const curriculum=$('[data-offering="curriculum"] select').value,year=$('[data-offering="year"] select').selectedIndex;let count=0;$$('#offerings tbody tr').forEach(row=>{row.hidden=curriculum!=='BSCS 2024'||(year>0&&parseInt(row.cells[0].textContent)!==year);if(!row.hidden)count++;});let empty=$('#offerings-empty');if(!empty){empty=document.createElement('p');empty.id='offerings-empty';empty.className='empty';empty.textContent='No opened-subject sample for this selection. Select BSCS 2024 to view the populated design.';$('#offerings').append(empty);}empty.hidden=count!==0;$('#offerings').nextElementSibling.querySelector('span').textContent=`${count} opened subjects · ${count*3} units`;}
$$('[data-offering] select').forEach(el=>el.addEventListener('change',filterOfferings));

/* Curricula: in-memory editing of versions, terms and courses/slots (nothing persists) */
const cuState={cur:0,ctx:null,V:[
 {prog:'BSCS',year:'2023–2024',units:147,enrolled:286,from:'2023-06-01',status:'active',terms:[
  {year:1,sem:'Semester 1',rows:[['CSIT 100 — Introduction to Computing',3,'Required course'],['CSIT 101 — Fundamentals of Programming',4,'Required course'],['CSci 180 — Pre-calculus for CS',3,'Required course'],['Comm 11 — Purposive Communication',3,'Required course'],['Entr 11 — Entrepreneurial Mind',3,'Required course'],['ITec 11 — Living in the IT Era',3,'Required course'],['PE 1 — Physical Fitness',2,'Required course']]},
  {year:1,sem:'Semester 2',rows:[['CSIT 102 — Data Structures',4,'Required course'],['CSci 181 — Discrete Mathematics',3,'Required course'],['Math 11 — Calculus 1',3,'Required course'],['GE elective',3,'GE slot']]}]},
 {prog:'BSCS',year:'2019–2020',units:150,enrolled:142,from:'2019-06-01',status:'retired',terms:[{year:1,sem:'Semester 1',rows:[['CSIT 100 — Introduction to Computing',3,'Required course'],['CSIT 101 — Fundamentals of Programming',4,'Required course']]}]},
 {prog:'BSIT',year:'2023–2024',units:148,enrolled:184,from:'2023-06-01',status:'active',terms:[{year:1,sem:'Semester 1',rows:[['ITec 11 — Living in the IT Era',3,'Required course'],['CSIT 101 — Fundamentals of Programming',4,'Required course']]}]}
]};
const cuKey='saais.curricula';let cuStored=false;
try{const s=JSON.parse(localStorage.getItem(cuKey));if(Array.isArray(s)){cuState.V=s;cuStored=true;}}catch(e){}
const cuSave=()=>{try{localStorage.setItem(cuKey,JSON.stringify(cuState.V));}catch(e){}};
const cuLabel=v=>v.prog+' · '+v.year;
const cuFmt=d=>{if(!d)return '—';const p=d.split('-');return +p[2]+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1]+' '+p[0];};
const cuField=(id,label,value='',type='text')=>`<label><span>${label}</span><input id="${id}" type="${type}" value="${esc(String(value))}"></label>`;
const cuSelect=(id,label,items,value)=>`<label><span>${label}</span><select id="${id}">${items.map(v=>`<option${v===value?' selected':''}>${v}</option>`).join('')}</select></label>`;
function cuRender(){
 const root=$('#cu-terms');if(!root)return;const {V}=cuState,sel=$('#cu-version');
 sel.innerHTML=V.map((v,i)=>`<option value="${i}">${esc(cuLabel(v))}</option>`).join('');
 const none=!V.length;['cu-edit-version','cu-del-version','cu-add-term'].forEach(k=>{const b=$(`[data-dialog="${k}"]`);b.disabled=none;b.style.opacity=none?'.5':'';});
 if(none){$('#cu-stats').innerHTML='';root.innerHTML='<p class="empty">No curriculum versions yet. Use Add version to create one.</p>';return;}
 cuState.cur=Math.min(cuState.cur,V.length-1);sel.value=cuState.cur;const v=V[cuState.cur];
 $('#cu-stats').innerHTML=[['Required units',v.units,'Full degree requirement'],['Enrolled students',v.enrolled,'Students on this curriculum'],['Effective from',cuFmt(v.from),'Version effectivity'],['Status',v.status,'Curriculum lifecycle']].map(([l,n,s])=>`<article class="stat"><span class="label">${l}</span><strong>${esc(String(n))}</strong><small>${s}</small></article>`).join('');
 root.innerHTML=v.terms.length?v.terms.map((t,ti)=>{
  const rows=t.rows.length?t.rows.map((r,ri)=>`<tr><td data-label="Course / slot">${esc(r[0])}</td><td data-label="Required units">${r[1]}</td><td data-label="Type">${esc(r[2])}</td><td data-label="Actions"><div class="row-actions"><button type="button" class="btn" data-dialog="cu-edit-slot" data-t="${ti}" data-r="${ri}">Edit</button><button type="button" class="btn" data-dialog="cu-del-slot" data-t="${ti}" data-r="${ri}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="4" class="empty-row">No courses in this term yet.</td></tr>';
  return `<section class="panel"><header class="panel-head"><div><h2>Year ${t.year} · ${esc(t.sem)}</h2><p>Positional curriculum term; not a calendar school term.</p></div><div class="head-actions"><button type="button" class="btn" data-dialog="cu-add-slot" data-t="${ti}">Add course / slot</button><button type="button" class="btn" data-dialog="cu-edit-term" data-t="${ti}">Edit term</button><button type="button" class="btn" data-dialog="cu-del-term" data-t="${ti}">Delete term</button></div></header><div class="table-wrap"><table class="data cards"><thead><tr><th scope="col">Course / slot</th><th scope="col">Required units</th><th scope="col">Type</th><th scope="col">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
 }).join(''):'<p class="empty">This version has no terms yet. Use Add term to start.</p>';
}
function cuDialog(key,trigger){
 const S=cuState,v=S.V[S.cur],t=+trigger.dataset.t,r=trigger.dataset.r===undefined?null:+trigger.dataset.r;S.ctx={key,t,r};
 const verForm=x=>form(cuSelect('cu-prog','Program',['BSCS','BSIT'],x.prog)+cuField('cu-year','Academic year',x.year)+cuField('cu-units','Required units',x.units)+cuField('cu-from','Effective from',x.from,'date')+cuSelect('cu-status','Status',['active','draft','retired'],x.status));
 const termForm=x=>form(cuSelect('cu-tyear','Year level',['1','2','3','4','5'],String(x.year))+cuSelect('cu-tsem','Term',['Semester 1','Semester 2','Midyear'],x.sem));
 const slotForm=x=>`<div class="form-grid">${cuField('cu-sname','Course / slot',x[0]).replace('<label>','<label class="wide">')}${cuField('cu-sunits','Required units',x[1])}${cuSelect('cu-stype','Type',['Required course','Elective slot','GE slot'],x[2])}</div>`;
 const del=html=>['Delete record',`<p>${html}</p>`,'Delete'];
 switch(key){
  case 'cu-add-version':return ['Add version',verForm({prog:'BSCS',year:'',units:147,from:'',status:'draft'}),'Add version'];
  case 'cu-edit-version':return ['Edit version',verForm(v),'Save changes'];
  case 'cu-del-version':return del(`Delete <strong>${esc(cuLabel(v))}</strong> and all of its terms? This can’t be undone.`);
  case 'cu-add-term':return ['Add term',termForm({year:1,sem:'Semester 1'}),'Add term'];
  case 'cu-edit-term':return ['Edit term',termForm(v.terms[t]),'Save changes'];
  case 'cu-del-term':return del(`Delete <strong>Year ${v.terms[t].year} · ${esc(v.terms[t].sem)}</strong> and its ${v.terms[t].rows.length} course(s)?`);
  case 'cu-add-slot':return ['Add course / slot',slotForm(['',3,'Required course']),'Add'];
  case 'cu-edit-slot':return ['Edit course / slot',slotForm(v.terms[t].rows[r]),'Save changes'];
  case 'cu-del-slot':return del(`Delete <strong>${esc(v.terms[t].rows[r][0])}</strong> from Year ${v.terms[t].year} · ${esc(v.terms[t].sem)}?`);
 }
}
function cuConfirm(key){
 const S=cuState,{t,r}=S.ctx,err=$('.account-error',dialog),fail=m=>{err.textContent=m;err.hidden=false;return false;},val=id=>$('#'+id,dialog).value.trim();
 const done=m=>{cuSave();cuRender();toast(m);return true;};
 if(key==='cu-del-version'){const v=S.V.splice(S.cur,1)[0];S.cur=0;return done(cuLabel(v)+' was deleted.');}
 if(key==='cu-del-term'){S.V[S.cur].terms.splice(t,1);return done('The term was deleted.');}
 if(key==='cu-del-slot'){S.V[S.cur].terms[t].rows.splice(r,1);return done('The course was removed.');}
 if(key==='cu-add-version'||key==='cu-edit-version'){
  const d={prog:val('cu-prog'),year:val('cu-year'),units:+val('cu-units'),from:val('cu-from'),status:val('cu-status')};
  if(!d.year)return fail('Enter the academic year, for example 2023–2024.');
  if(!(d.units>0))return fail('Required units must be a positive number.');
  if(!d.from)return fail('Choose the date this version takes effect.');
  const cur=key==='cu-edit-version'?S.V[S.cur]:null;
  if(S.V.some(v=>v!==cur&&v.prog===d.prog&&v.year===d.year))return fail(d.prog+' · '+d.year+' already exists.');
  if(cur)Object.assign(cur,d);else{d.terms=[];d.enrolled=0;S.V.push(d);S.cur=S.V.length-1;}
  return done(cuLabel(S.V[S.cur])+' was saved.');
 }
 if(key==='cu-add-term'||key==='cu-edit-term'){
  const y=+val('cu-tyear'),s=val('cu-tsem'),terms=S.V[S.cur].terms,cur=key==='cu-edit-term'?terms[t]:null;
  if(terms.some(x=>x!==cur&&x.year===y&&x.sem===s))return fail('Year '+y+' · '+s+' already exists in this version.');
  if(cur){cur.year=y;cur.sem=s;}else terms.push({year:y,sem:s,rows:[]});
  const order=['Semester 1','Semester 2','Midyear'];terms.sort((a,b)=>a.year-b.year||order.indexOf(a.sem)-order.indexOf(b.sem));
  return done('Year '+y+' · '+s+' was saved.');
 }
 const n=val('cu-sname'),u=val('cu-sunits');
 if(!n)return fail('Enter the course or slot name.');
 if(u===''||isNaN(+u)||+u<0)return fail('Required units must be zero or more.');
 const rows=S.V[S.cur].terms[t].rows,row=[n,+u,val('cu-stype')];
 if(key==='cu-edit-slot')rows[r]=row;else rows.push(row);
 return done(n+' was saved.');
}
if($('#cu-version')){$('#cu-version').addEventListener('change',e=>{cuState.cur=+e.target.value;cuRender();});cuRender();}

/* Course catalog: in-memory editing of courses and prerequisites (nothing persists) */
const ccOrg={'Faculty of Computer Studies':['Computer Science','Information Technology'],'Faculty of Arts and Sciences':['Mathematics and Statistics','Psychology','General Education'],'University Administration':['Office of the Registrar']};
const ccRepeat=['none','grade replacement','grade averaging'];
const ccC=(code,title,units,lec,lab,repeat,fac,dep,status='Active')=>({code,title,units,lec,lab,repeat,fac,dep,status,pre:[]});
const ccState={ctx:null,C:[
 ccC('CSIT 100','Introduction to Computing',3,2,3,'grade replacement','Faculty of Computer Studies','Computer Science'),
 ccC('CSIT 101','Fundamentals of Programming',4,3,3,'grade replacement','Faculty of Computer Studies','Computer Science'),
 ccC('CSci 180','Pre-calculus for CS',3,3,0,'grade replacement','Faculty of Computer Studies','Computer Science'),
 ccC('Comm 11','Purposive Communication',3,3,0,'none','Faculty of Arts and Sciences','General Education'),
 ccC('Entr 11','Entrepreneurial Mind',3,3,0,'none','Faculty of Arts and Sciences','General Education'),
 ccC('ITec 11','Living in the IT Era',3,3,0,'none','Faculty of Computer Studies','Information Technology'),
 ccC('ScSc 11','Understanding the Self',3,3,0,'none','Faculty of Arts and Sciences','General Education'),
 ccC('PhEd 11','PATHFit 1 - Movement Competency Training',2,0,0,'none','Faculty of Arts and Sciences','General Education'),
 ccC('CSIT 102','Data Structures',4,3,3,'grade replacement','Faculty of Computer Studies','Computer Science'),
 ccC('Math 11','Calculus 1',3,3,0,'grade averaging','Faculty of Arts and Sciences','Mathematics and Statistics'),
 ccC('CSci 120','Legacy Programming Elective',3,3,0,'none','Faculty of Computer Studies','Computer Science','Inactive')
]};
ccState.C[8].pre=[{code:'CSIT 101',type:'Prerequisite'}];
const ccKey='saais.courseCatalog';try{const stored=JSON.parse(localStorage.getItem(ccKey));if(Array.isArray(stored)&&stored.length)ccState.C=stored;}catch(e){}
const ccSave=()=>{try{localStorage.setItem(ccKey,JSON.stringify(ccState.C));}catch(e){}};
/* New course on a Curricula page: choose the curriculum and term, and the course joins that curriculum and the catalog.
   Added courses are kept in localStorage so the Course Catalogue page shows them too. */
const ncKey='saais.newCourses',ncTerms=[1,2,3,4,5].flatMap(y=>['Semester 1','Semester 2','Midyear'].map(m=>'Year '+y+' · '+m));
const ncLoad=()=>{try{return JSON.parse(localStorage.getItem(ncKey))||[];}catch(e){return [];}};
const ncStore=n=>{try{localStorage.setItem(ncKey,JSON.stringify(ncLoad().concat(n)));}catch(e){}};
function ncFields(){
 if(!$('#cu-version')||!cuState.V.length)return '';
 return cuSelect('cc-ccur','Curriculum',cuState.V.map(cuLabel),cuLabel(cuState.V[cuState.cur]))+cuSelect('cc-cterm','Term',ncTerms,'Year 1 · Semester 1');
}
function ncAttach(n){
 const v=cuState.V.find(x=>cuLabel(x)===n.cur);if(!v)return;
 const m=/^Year (\d) · (.+)$/.exec(n.term),y=+m[1],sem=m[2],name=n.course.code+' — '+n.course.title;
 let t=v.terms.find(x=>x.year===y&&x.sem===sem);
 if(!t){t={year:y,sem,rows:[]};v.terms.push(t);const order=['Semester 1','Semester 2','Midyear'];v.terms.sort((a,b)=>a.year-b.year||order.indexOf(a.sem)-order.indexOf(b.sem));}
 if(!t.rows.some(r=>r[0]===name))t.rows.push([name,n.course.units,n.course.kind==='Elective'?'Elective slot':'Required course']);
}
function ccFilterInit(){
 const f=$('#cc-fac');f.innerHTML=['All faculties',...Object.keys(ccOrg)].map(x=>`<option>${x}</option>`).join('');ccDepOptions();
}
function ccDepOptions(){
 const f=$('#cc-fac').value,deps=f==='All faculties'?Object.values(ccOrg).flat():ccOrg[f],d=$('#cc-dep'),cur=d.value;
 d.innerHTML=['All departments',...deps].map(x=>`<option>${x}</option>`).join('');if(deps.includes(cur))d.value=cur;
}
function ccRender(){
 const body=$('#cc-body');if(!body)return;
 const q=$('#cc-q').value.trim().toLowerCase(),st=$('#cc-status').value,fac=$('#cc-fac').value,dep=$('#cc-dep').value;
 const list=ccState.C.map((c,i)=>[c,i]).filter(([c])=>(!q||(c.code+' '+c.title+' '+c.dep).toLowerCase().includes(q))&&(st==='All records'||c.status===st)&&(fac==='All faculties'||c.fac===fac)&&(dep==='All departments'||c.dep===dep));
 body.innerHTML=list.length?list.map(([c,i])=>`<tr><td data-label="Course"><strong>${esc(c.code)}</strong><small>${esc(c.title)}</small></td><td data-label="Units">${c.units}</td><td data-label="Status"><span class="badge${c.status==='Active'?' green':''}">${c.status}</span></td><td data-label="Actions"><div class="row-actions"><button type="button" class="btn" data-dialog="cc-edit" data-i="${i}">Edit</button><button type="button" class="btn" data-dialog="cc-pre" data-i="${i}">Prerequisites${c.pre.length?' ('+c.pre.length+')':''}</button><button type="button" class="btn" data-dialog="cc-del" data-i="${i}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="4" class="empty-row">No courses match your search.</td></tr>';
 $('#cc-count').textContent=`${list.length} of ${ccState.C.length} courses`;
}
function ccDialog(key,trigger){
 const S=ccState,i=trigger.dataset.i===undefined?null:+trigger.dataset.i,c=i===null?null:S.C[i];S.ctx={key,i};
 if(key==='cc-del')return ['Delete record',`<p>Delete <strong>${esc(c.code)} — ${esc(c.title)}</strong> from the catalog? This can’t be undone.</p>`,'Delete'];
 if(key==='cc-pre'){
  const others=S.C.filter((_,k)=>k!==i);
  return ['Prerequisites · '+c.code,`<p class="account-dialog-intro">Choose the courses a student must take first, or alongside, <strong>${esc(c.code)}</strong>. Different course codes never imply equivalence.</p><div class="cc-pre-list">${others.map(o=>{const p=c.pre.find(x=>x.code===o.code);return `<div class="cc-pre-row"><label><input type="checkbox" name="cc-pre" value="${esc(o.code)}"${p?' checked':''}><span><b>${esc(o.code)}</b> ${esc(o.title)}</span></label><select aria-label="Type for ${esc(o.code)}" data-pre-type="${esc(o.code)}">${['Prerequisite','Co-requisite'].map(t=>`<option${p&&p.type===t?' selected':''}>${t}</option>`).join('')}</select></div>`;}).join('')}</div>`,'Save prerequisites'];
 }
 const x=c||{code:'',title:'',units:3,fac:Object.keys(ccOrg)[0],dep:ccOrg[Object.keys(ccOrg)[0]][0],status:'Active',kind:'Non-Elective'};
 const radio=['Non-Elective','Elective'].map(k=>`<label style="display:inline-flex;align-items:center;gap:8px;margin-right:22px"><input type="radio" name="cc-kind" value="${k}"${(x.kind||'Non-Elective')===k?' checked':''}><span>${k}</span></label>`).join('');
 return [c?'Edit course':'New course',form(cuField('cc-code','Course code',x.code)+cuField('cc-title','Course title',x.title)+cuField('cc-units','Units',x.units)+cuSelect('cc-cfac','Faculty',Object.keys(ccOrg),x.fac)+cuSelect('cc-cdep','Department',ccOrg[x.fac],x.dep)+cuSelect('cc-cstatus','Status',['Active','Inactive'],x.status)+(c?'':ncFields())+`<fieldset class="wide" style="border:0;padding:0;margin:0"><legend style="font-size:13px;font-weight:600;margin-bottom:8px;padding:0">Course type</legend>${radio}</fieldset>`),c?'Save changes':'Add course'];
}
function ccConfirm(key){
 const S=ccState,{i}=S.ctx,err=$('.account-error',dialog),fail=m=>{err.textContent=m;err.hidden=false;return false;},val=id=>$('#'+id,dialog).value.trim();
 const done=m=>{ccSave();ccRender();toast(m);return true;};
 if(key==='cc-del'){const c=S.C.splice(i,1)[0];S.C.forEach(o=>o.pre=o.pre.filter(p=>p.code!==c.code));return done(c.code+' was deleted.');}
 if(key==='cc-pre'){
  S.C[i].pre=$$('input[name="cc-pre"]:checked',dialog).map(b=>({code:b.value,type:$(`[data-pre-type="${b.value}"]`,dialog).value}));
  return done('Prerequisites saved for '+S.C[i].code+'.');
 }
 const d={code:val('cc-code'),title:val('cc-title'),units:val('cc-units'),fac:val('cc-cfac'),dep:val('cc-cdep'),status:val('cc-cstatus'),kind:($('input[name="cc-kind"]:checked',dialog)||{}).value||'Non-Elective'};
 if(!d.code)return fail('Enter the course code, for example CSIT 100.');
 if(!d.title)return fail('Enter the course title.');
 if(d.units===''||isNaN(+d.units)||+d.units<0)return fail('Units must be zero or more.');
 if(S.C.some((c,k)=>k!==i&&c.code.toLowerCase()===d.code.toLowerCase()))return fail(d.code+' already exists. Course codes must be unique.');
 d.units=+d.units;
 if(i===null)S.C.push(Object.assign(d,{pre:[]}));else Object.assign(S.C[i],d);
 const curSel=$('#cc-ccur',dialog);
 if(i===null&&curSel){
  const n={course:d,cur:curSel.value,term:$('#cc-cterm',dialog).value};
  ncAttach(n);ncStore(n);cuSave();cuState.cur=cuState.V.findIndex(x=>cuLabel(x)===n.cur);cuRender();
  return done(d.code+' was added to '+n.cur+', '+n.term+', and the Course Catalogue.');
 }
 return done(d.code+' was saved.');
}
dialog.addEventListener('change',e=>{if(e.target.id==='cc-cfac'){$('#cc-cdep',dialog).innerHTML=ccOrg[e.target.value].map(x=>`<option>${x}</option>`).join('');}});
if($('#cc-body')){
 ccFilterInit();
 ['#cc-q','#cc-status','#cc-dep'].forEach(s=>$(s).addEventListener('input',ccRender));
 $('#cc-fac').addEventListener('change',()=>{ccDepOptions();ccRender();});
 ccRender();
}
ncLoad().forEach(n=>{
 if(!ccState.C.some(c=>c.code.toLowerCase()===n.course.code.toLowerCase()))ccState.C.push(Object.assign({},n.course,{pre:[]}));
 if(!cuStored)ncAttach(n);
});
if($('#cu-version'))cuRender();
if($('#cc-body'))ccRender();
