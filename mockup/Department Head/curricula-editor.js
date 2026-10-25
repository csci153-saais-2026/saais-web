'use strict';
// Curricula editor (mirrors Department Staff > Curricula). In-memory only: nothing persists.
(function(){
const $=(s,root=document)=>root.querySelector(s);
const dialog=$('#preview-dialog');
const form=content=>`<div class="form-grid">${content}</div>`;
let toastTimer;
function toast(message){const el=$('.toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,5000);}
function esc(s){const el=document.createElement('span');el.textContent=s;return el.innerHTML;}
/* Curricula: in-memory editing of versions, terms and courses/slots (nothing persists) */
const cuState={cur:0,ctx:null,V:[
 {prog:'BSCS',year:'2023–2024',units:147,thr:12,from:'2023-06-01',status:'active',terms:[
  {year:1,sem:'Semester 1',rows:[['CSIT 100 — Introduction to Computing',3,'Required course'],['CSIT 101 — Fundamentals of Programming',4,'Required course'],['CSci 180 — Pre-calculus for CS',3,'Required course'],['Comm 11 — Purposive Communication',3,'Required course'],['Entr 11 — Entrepreneurial Mind',3,'Required course'],['ITec 11 — Living in the IT Era',3,'Required course'],['PE 1 — Physical Fitness',2,'Required course']]},
  {year:1,sem:'Semester 2',rows:[['CSIT 102 — Data Structures',4,'Required course'],['CSci 181 — Discrete Mathematics',3,'Required course'],['Math 11 — Calculus 1',3,'Required course'],['GE elective',3,'GE slot']]}]},
 {prog:'BSCS',year:'2019–2020',units:150,thr:12,from:'2019-06-01',status:'retired',terms:[{year:1,sem:'Semester 1',rows:[['CSIT 100 — Introduction to Computing',3,'Required course'],['CSIT 101 — Fundamentals of Programming',4,'Required course']]}]},
 {prog:'BSIT',year:'2023–2024',units:148,thr:12,from:'2023-06-01',status:'active',terms:[{year:1,sem:'Semester 1',rows:[['ITec 11 — Living in the IT Era',3,'Required course'],['CSIT 101 — Fundamentals of Programming',4,'Required course']]}]}
]};
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
 $('#cu-stats').innerHTML=[['Required units',v.units,'Full degree requirement'],['Delinquency threshold',v.thr,'Failed units per term'],['Effective from',cuFmt(v.from),'Version effectivity'],['Status',v.status,'Curriculum lifecycle']].map(([l,n,s])=>`<article class="stat"><span class="label">${l}</span><strong>${esc(String(n))}</strong><small>${s}</small></article>`).join('');
 root.innerHTML=v.terms.length?v.terms.map((t,ti)=>{
  const rows=t.rows.length?t.rows.map((r,ri)=>`<tr><td data-label="Course / slot">${esc(r[0])}</td><td data-label="Required units">${r[1]}</td><td data-label="Type">${esc(r[2])}</td><td data-label="Actions"><div class="row-actions"><button type="button" class="btn" data-dialog="cu-edit-slot" data-t="${ti}" data-r="${ri}">Edit</button><button type="button" class="btn" data-dialog="cu-del-slot" data-t="${ti}" data-r="${ri}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="4" class="empty-row">No courses in this term yet.</td></tr>';
  return `<section class="panel"><header class="panel-head"><div><h2>Year ${t.year} · ${esc(t.sem)}</h2><p>Positional curriculum term; not a calendar school term.</p></div><div class="head-actions"><button type="button" class="btn" data-dialog="cu-add-slot" data-t="${ti}">Add course / slot</button><button type="button" class="btn" data-dialog="cu-edit-term" data-t="${ti}">Edit term</button><button type="button" class="btn" data-dialog="cu-del-term" data-t="${ti}">Delete term</button></div></header><div class="table-wrap"><table class="data cards"><thead><tr><th scope="col">Course / slot</th><th scope="col">Required units</th><th scope="col">Type</th><th scope="col">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
 }).join(''):'<p class="empty">This version has no terms yet. Use Add term to start.</p>';
}
function cuDialog(key,trigger){
 const S=cuState,v=S.V[S.cur],t=+trigger.dataset.t,r=trigger.dataset.r===undefined?null:+trigger.dataset.r;S.ctx={key,t,r};
 const verForm=x=>form(cuSelect('cu-prog','Program',['BSCS','BSIT'],x.prog)+cuField('cu-year','Academic year',x.year)+cuField('cu-units','Required units',x.units)+cuField('cu-thr','Delinquency threshold (failed units per term)',x.thr)+cuField('cu-from','Effective from',x.from,'date')+cuSelect('cu-status','Status',['active','draft','retired'],x.status));
 const termForm=x=>form(cuSelect('cu-tyear','Year level',['1','2','3','4','5'],String(x.year))+cuSelect('cu-tsem','Term',['Semester 1','Semester 2','Midyear'],x.sem));
 const slotForm=x=>`<div class="form-grid">${cuField('cu-sname','Course / slot',x[0]).replace('<label>','<label class="wide">')}${cuField('cu-sunits','Required units',x[1])}${cuSelect('cu-stype','Type',['Required course','Elective slot','GE slot'],x[2])}</div>`;
 const del=html=>['Delete record',`<p>${html}</p>`,'Delete'];
 switch(key){
  case 'cu-add-version':return ['Add version',verForm({prog:'BSCS',year:'',units:147,thr:12,from:'',status:'draft'}),'Add version'];
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
 const done=m=>{cuRender();toast(m);return true;};
 if(key==='cu-del-version'){const v=S.V.splice(S.cur,1)[0];S.cur=0;return done(cuLabel(v)+' was deleted.');}
 if(key==='cu-del-term'){S.V[S.cur].terms.splice(t,1);return done('The term was deleted.');}
 if(key==='cu-del-slot'){S.V[S.cur].terms[t].rows.splice(r,1);return done('The course was removed.');}
 if(key==='cu-add-version'||key==='cu-edit-version'){
  const d={prog:val('cu-prog'),year:val('cu-year'),units:+val('cu-units'),thr:+val('cu-thr'),from:val('cu-from'),status:val('cu-status')};
  if(!d.year)return fail('Enter the academic year, for example 2023–2024.');
  if(!(d.units>0)||!(d.thr>0))return fail('Required units and the delinquency threshold must be positive numbers.');
  if(!d.from)return fail('Choose the date this version takes effect.');
  const cur=key==='cu-edit-version'?S.V[S.cur]:null;
  if(S.V.some(v=>v!==cur&&v.prog===d.prog&&v.year===d.year))return fail(d.prog+' · '+d.year+' already exists.');
  if(cur)Object.assign(cur,d);else{d.terms=[];S.V.push(d);S.cur=S.V.length-1;}
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
function openCu(trigger){
 const key=trigger.dataset.dialog,spec=cuDialog(key,trigger);if(!spec)return;
 $('#dialog-title').textContent=spec[0];
 $('#dialog-content').innerHTML=spec[1]+'<p class="account-error" role="alert" hidden></p>';
 $('#dialog-confirm').textContent=spec[2];$('#dialog-confirm').hidden=false;
 const old=$('[data-reject]',dialog);if(old)old.remove();
 dialog.dataset.preview=key;dialog.showModal();
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-dialog^="cu-"]');if(t&&!t.disabled)openCu(t);});
// Capture on the dialog so the shared preview-only confirm handler never runs for cu- dialogs.
dialog.addEventListener('click',e=>{
 const key=dialog.dataset.preview||'';
 if(key.startsWith('cu-')&&e.target.closest('#dialog-confirm')){e.stopPropagation();if(cuConfirm(key))dialog.close();}
},true);
})();
