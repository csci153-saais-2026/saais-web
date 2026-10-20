'use strict';
// Static presentation only: no network requests, storage, or record mutations.
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const dialog=$('#preview-dialog');
const field=(name,value='',type='text')=>`<label><span>${name}</span><input type="${type}" value="${value}"></label>`;
const select=(name,items,attrs='')=>`<label ${attrs}><span>${name}</span><select>${items.map(s=>`<option>${s}</option>`).join('')}</select></label>`;
const form=content=>`<div class="form-grid">${content}</div>`;
const note='<p class="caption">Static design preview. No records are saved, uploaded, or submitted.</p>';
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
 if(!spec)return;
 $('#dialog-title').textContent=spec[0];
 $('#dialog-content').innerHTML=(key==='reassign'?`<div class="notice">${$$('.student-check:checked').length} student(s) selected</div>`:'')+spec[1]+note;
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
