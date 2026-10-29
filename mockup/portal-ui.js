/* Shared shell behavior. Each role retains its existing page interactions. */
(() => {
 /* Demo data: open any page with ?reset-demo to clear everything saved in this browser (saais-* keys), then reload without the flag. */
 try {
   if (/[?&]reset-demo(?:[=&]|$)/.test(location.search)) {
     Object.keys(localStorage).filter(function (k) { return /^saais[-.]/.test(k); }).forEach(function (k) { localStorage.removeItem(k); });
     location.replace(location.pathname + location.search.replace(/[?&]reset-demo(=[^&]*)?/, '').replace(/^&/, '?') + location.hash);
   }
 } catch (e) {}
 /* Signing out (any link to the login page) ends the prototype session, including "Keep me signed in". */
 document.addEventListener('click', e => {
  if (!e.target.closest('a[href$="Login.dc.html"]')) return;
  try { sessionStorage.removeItem('saais-session'); localStorage.removeItem('saais-session-keep'); } catch (_) {}
 }, true);
 /* Notifications: shared sample data and read state. The bell popover shows the latest few; Notifications.html lists them all.
    Read state persists per browser (saais-notifications-v1). In production these come from the notifications service. */
 const NOTIF_BASE = (document.currentScript && document.currentScript.src) || location.href;
 const NOTIF_DATA = {
  student: [
   ['st1', 'Your adviser added an advising note', 'Prof. Ramon Reyes wrote a note about your 2nd Semester plan.', '2 hours ago', 'Student/StudentDashboard.html', 'note'],
   ['st2', 'Grade flag resolved', 'Your flag on CSci 102 was reviewed and the grade was corrected.', 'Yesterday', 'Student/StudentGrades.html', 'grade'],
   ['st3', 'Midterm grades posted', 'Midterm grades for 1st Semester 2026-2027 are now in your record.', '3 days ago', 'Student/StudentGrades.html', 'grade'],
   ['st4', 'INC deadline reminder', 'Your INC in CSci 102 must be completed within 30 days.', '5 days ago', 'Student/StudentGrades.html', 'alert']
  ],
  adviser: [
   ['ad1', 'New grade flag from an advisee', 'Maria Isabel Bautista flagged her grade in CSci 102.', '1 hour ago', 'Adviser/AdviserGradeFlags.dc.html', 'flag'],
   ['ad2', 'Grade import saved', '22 rows were saved from grades-2026-1st-sem.json. 2 rows were rejected.', 'Yesterday', 'Adviser/AdviserImportGrades.dc.html', 'import'],
   ['ad3', 'INC deadline in 14 days', 'Ben Lopez has a pending INC in CSci 22.', '2 days ago', 'Adviser/AdviserEncodeGrades.dc.html', 'alert'],
   ['ad4', 'Advisee added to your list', 'Dino Castillo was assigned to you by the Department Head.', '6 days ago', 'Adviser/AdviserAdvisees.dc.html', 'person']
  ],
  head: [
   ['hd1', 'Curriculum transfer awaiting review', 'An adviser endorsed a request to move a student to BSCS 2025-present.', '3 hours ago', 'Department Head/CurriculumTransfers.dc.html', 'transfer'],
   ['hd2', 'Students without an adviser', '2 students in your department have no active adviser.', 'Yesterday', 'Department Head/AdviserAssignments.dc.html', 'person'],
   ['hd3', 'Grade encoding period closes soon', 'The 1st Semester encoding period closes in 7 days.', '4 days ago', 'Department Head/AcademicTerms.dc.html', 'alert']
  ],
  dean: [
   ['dn1', 'Faculty report ready', 'The 1st Semester faculty report is ready for review.', '2 hours ago', 'dean:Reports', 'report'],
   ['dn2', 'Department report updated', 'DCST updated its department report.', '2 days ago', 'dean:Reports', 'report']
  ],
  admin: [
   ['am1', 'Invitation accepted', 'A newly provisioned adviser set their password.', '1 hour ago', 'SystemAdmin/AdminAccountsRoles.dc.html', 'person'],
   ['am2', 'Invitation expiring', '3 invitations expire in 2 days.', 'Yesterday', 'SystemAdmin/AdminAccountsRoles.dc.html', 'alert']
  ],
  staff: [
   ['sf1', 'Adviser reassignment pending', '4 students are waiting for an adviser.', '5 hours ago', 'Department Staff/AdviserAssignments.dc.html', 'person'],
   ['sf2', 'Course catalog change logged', 'A course was added to the catalog.', '3 days ago', 'Department Staff/CourseCatalog.dc.html', 'report']
  ]
 };
 /* 'dean:Name' resolves to the Dean folder the user is in (DeanDH files are DHDean*, DeanAdviser files Dean*). */
 const notifPath = h => /^dean:/.test(h) ? (/\/Dean\/DeanDH\//.test(decodeURIComponent(location.pathname)) ? 'Dean/DeanDH/DHDean' : 'Dean/DeanAdviser/Dean') + h.slice(5) + '.dc.html' : h;
 const NOTIF_KEY = 'saais-notifications-v1';
 const notifRole = () => {
  const p = decodeURIComponent(location.pathname), q = /[?&]role=([a-z]+)/.exec(location.search);
  if (q && NOTIF_DATA[q[1]]) return q[1];
  return /\/Student\//.test(p) ? 'student' : /\/Department Staff\//.test(p) ? 'staff' : /\/Department Head\//.test(p) ? 'head' : /\/Dean\//.test(p) ? 'dean' : /\/SystemAdmin\//.test(p) ? 'admin' : 'adviser';
 };
 const notifRead = () => { try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; } catch (_) { return {}; } };
 const notifWrite = r => { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(r)); } catch (_) {} };
 window.SAAIS_NOTIFS = {
  role: notifRole,
  list: role => (NOTIF_DATA[role || notifRole()] || []).map(n => ({ id: n[0], title: n[1], body: n[2], when: n[3], href: n[4] ? new URL(notifPath(n[4]), new URL('./', NOTIF_BASE)).href : '', kind: n[5], read: !!notifRead()[n[0]] })),
  unread() { return this.list().filter(n => !n.read).length; },
  markRead(id) { const r = notifRead(); r[id] = 1; notifWrite(r); window.dispatchEvent(new Event('saais-notifications')); },
  markAll() { const r = notifRead(); this.list().forEach(n => { r[n.id] = 1; }); notifWrite(r); window.dispatchEvent(new Event('saais-notifications')); },
  /* The Notifications page lives in the signed-in portal, so the link goes to that portal's own copy. */
  allUrl() {
   const p = decodeURIComponent(location.pathname);
   const file = /\/Student\//.test(p) ? 'Student/StudentNotifications.html' : /\/Department Staff\//.test(p) ? 'Department Staff/Notifications.dc.html' : /\/Department Head\//.test(p) ? 'Department Head/Notifications.dc.html' :
    /\/Dean\/DeanDH\//.test(p) ? 'Dean/DeanDH/DHAdviserNotifications.dc.html' : /\/Dean\/DeanAdviser\//.test(p) ? 'Dean/DeanAdviser/DeanAdviserNotifications.dc.html' :
    /\/SystemAdmin\//.test(p) ? 'SystemAdmin/AdminNotifications.dc.html' : 'Adviser/AdviserNotifications.dc.html';
   return new URL(file, new URL('./', NOTIF_BASE)).href;
  }
 };
 function init() {
  const sidebar=document.querySelector('aside');
  if(!sidebar || document.body.classList.contains('portal-page')) return;
  document.body.classList.add('portal-page'); sidebar.classList.add('portal-sidebar');
  sidebar.id ||= 'portal-navigation';
  const navigation=sidebar.querySelector(':scope > nav');
  if(navigation){
   const after=navigation.nextElementSibling;
   if(after?.classList.contains('side-bottom')&&after===sidebar.lastElementChild){
    after.classList.add('portal-sidebar-footer');
   }else{
    const footer=document.createElement('div');footer.className='portal-sidebar-footer';
    while(navigation.nextElementSibling){
     const item=navigation.nextElementSibling;
     if(item.classList.contains('sidebar-spacer')||(item.style.flexGrow==='1'&&!item.textContent.trim()))item.remove();
     else footer.append(item);
    }
    sidebar.append(footer);
   }
  }
  const workspace=sidebar.nextElementSibling;
  const header=workspace?.querySelector('header');
  const main=workspace?.querySelector('main');
  header?.classList.add('portal-topbar'); main?.classList.add('portal-main');
  if(header){
   const bell=[...header.querySelectorAll('svg')].find(svg=>svg.innerHTML.includes('M18 15'));
   const notifications=bell?.parentElement||document.createElement('div');
   notifications.classList.add('portal-notifications');notifications.removeAttribute('aria-hidden');
   const toggle=document.createElement('button');toggle.type='button';toggle.className='portal-notification-toggle';
   toggle.setAttribute('aria-label','Notifications');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','portal-notifications');
   toggle.innerHTML=bell?.outerHTML||'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15V10a6 6 0 10-12 0v5l-1.8 3h15.6z"/><path d="M9.8 21h4.4"/></svg>';
   toggle.querySelector('svg').setAttribute('aria-hidden','true');
   const popover=document.createElement('section');popover.id='portal-notifications';popover.className='portal-notification-popover';popover.hidden=true;
   popover.setAttribute('aria-labelledby','portal-notifications-title');
   const N=window.SAAIS_NOTIFS,badge=document.createElement('span');badge.className='portal-notification-badge';badge.hidden=true;toggle.append(badge);
   const render=()=>{
    const all=N.list(),unread=all.filter(n=>!n.read).length,esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    badge.textContent=unread>9?'9+':String(unread);badge.hidden=!unread;
    toggle.setAttribute('aria-label','Notifications'+(unread?', '+unread+' unread':''));
    popover.innerHTML='<div class="portal-notification-head"><h2 id="portal-notifications-title">Notifications</h2>'+(unread?'<button type="button" data-mark-all>Mark all as read</button>':'')+'</div>'+
     (all.length?'<ul class="portal-notification-list">'+all.slice(0,4).map(n=>'<li><a class="portal-notification-item'+(n.read?'':' is-unread')+'" href="'+esc(n.href||N.allUrl())+'" data-id="'+esc(n.id)+'"><span class="portal-notification-dot" aria-hidden="true"></span><span><strong>'+esc(n.title)+'</strong><small>'+esc(n.when)+'</small></span></a></li>').join('')+'</ul>':'<p>No new notifications.</p>')+
     '<a class="portal-notification-all" href="'+esc(N.allUrl())+'">See all notifications</a>';
   };
   render();window.addEventListener('saais-notifications',render);
   notifications.replaceChildren(toggle,popover);if(!notifications.parentElement)header.append(notifications);
   const setNotifications=open=>{if(open)render();popover.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
   popover.addEventListener('click',event=>{
    if(event.target.closest('[data-mark-all]')){N.markAll();render();return;}
    const item=event.target.closest('.portal-notification-item');if(item)N.markRead(item.dataset.id);
   });
   toggle.addEventListener('click',()=>setNotifications(popover.hidden));
   document.addEventListener('click',event=>{if(!notifications.contains(event.target))setNotifications(false);});
   document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popover.hidden){setNotifications(false);toggle.focus();}});
   notifications.addEventListener('focusout',event=>{if(!notifications.contains(event.relatedTarget))setNotifications(false);});
  }
  const heading=main?.querySelector('h1')?.parentElement?.parentElement;
  if(heading&&heading!==main)heading.classList.add('portal-heading');
  const open=document.createElement('button'),close=document.createElement('button'),backdrop=document.createElement('button');
  for(const button of [open,close,backdrop]) button.type='button';
  open.className='portal-menu-open'; open.textContent='Menu'; open.setAttribute('aria-controls',sidebar.id); open.setAttribute('aria-expanded','false');
  close.className='portal-menu-close'; close.textContent='Close navigation';
  backdrop.className='portal-backdrop'; backdrop.hidden=true; backdrop.setAttribute('aria-label','Close navigation');
  (header?.querySelector('[data-portal-header-start]')||header)?.prepend(open);sidebar.prepend(close);document.body.append(backdrop);
  const setOpen=value=>{
   sidebar.classList.toggle('portal-open',value);open.setAttribute('aria-expanded',String(value));backdrop.hidden=!value;
   if(workspace) workspace.inert=value;
   document.body.style.overflow=value?'hidden':'';
   if(value) close.focus(); else if(sidebar.contains(document.activeElement)||document.activeElement===backdrop) open.focus();
  };
  open.addEventListener('click',()=>setOpen(true));close.addEventListener('click',()=>setOpen(false));backdrop.addEventListener('click',()=>setOpen(false));
  sidebar.addEventListener('click',e=>{if(e.target.closest('a')&&sidebar.classList.contains('portal-open'))setOpen(false);});
  document.addEventListener('keydown',e=>{
   if(!sidebar.classList.contains('portal-open')||document.querySelector('dialog[open]'))return;
   if(e.key==='Escape')setOpen(false);
   if(e.key==='Tab'){
    const items=[...sidebar.querySelectorAll('a[href],button,summary')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  });
  matchMedia('(max-width:768px)').addEventListener('change',()=>setOpen(false));
  const staffAccount=sidebar.querySelector('.user-menu.adviser-account');
  if(staffAccount){
   const trigger=staffAccount.querySelector('.user-trigger'),popup=staffAccount.querySelector('[role=menu]');
   staffAccount.addEventListener('keydown',e=>{
    const items=[...popup.querySelectorAll('[role=menuitem]')];
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
     e.preventDefault();e.stopPropagation();if(popup.hidden)trigger.click();
     const index=items.indexOf(document.activeElement);
     items[e.key==='Home'?0:e.key==='End'?items.length-1:index<0?(e.key==='ArrowUp'?items.length-1:0):(index+(e.key==='ArrowUp'?-1:1)+items.length)%items.length]?.focus();
    }else if(e.key==='Escape'&&!popup.hidden){e.preventDefault();e.stopPropagation();trigger.click();trigger.focus();}
   });
   staffAccount.addEventListener('focusout',e=>{if(!staffAccount.contains(e.relatedTarget)&&!popup.hidden)trigger.click();});
  }
  const labelTable=table=>{
   table.classList.add('portal-table');const headings=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim()||'Actions');
   table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>{cell.dataset.label ||= headings[i]||'Actions';}));
  };
  // A node added later may be a table, a container of tables, or a row/cell inside an existing table.
  const tables=root=>{
   const found=new Set(root.querySelectorAll('table')),owner=root.closest?.('table');
   if(owner)found.add(owner);
   found.forEach(labelTable);
  };
  tables(document);new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)tables(node);}).observe(document.body,{childList:true,subtree:true});
 }
 // Unit-weighted GWA beside each curriculum-checklist semester heading (graded courses only).
 function termGwa(){
  document.querySelectorAll('section[data-term-panel]').forEach(panel=>{
   const header=panel.querySelector('header');
   if(!header||header.querySelector('[data-term-gwa]'))return;
   let points=0,units=0,passed=0,total=0;
   panel.querySelectorAll('tbody tr').forEach(row=>{
    const cells=row.children,req=cells[1]?.textContent.match(/\d+(?:\.\d+)?\s*\/\s*(\d+(?:\.\d+)?)/);
    if(req){total+=+req[1];if(cells[2]?.textContent.trim()==='Passed')passed+=+req[1];}
    const grade=cells[3]?.textContent.match(/grade\s+(\d+(?:\.\d+)?)/),unit=cells[1]?.textContent.match(/\d+(?:\.\d+)?\s*\/\s*(\d+(?:\.\d+)?)/);
    if(!grade||!unit)return;
    points+=+grade[1]*+unit[1];units+=+unit[1];
   });
   const num=n=>String(+n.toFixed(2));
   const wrap=document.createElement('div');wrap.style.cssText='margin-left:auto;display:flex;align-items:center;gap:22px;flex-shrink:0';
   const stat=(label,value)=>'<div style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.2"><small style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8C8A76">'+label+'</small><b style="font:700 18px Syne,sans-serif;color:#2F4A12">'+value+'</b></div>';
   const gwa=document.createElement('div');gwa.setAttribute('data-term-gwa','');
   gwa.style.cssText='display:flex;flex-direction:column;align-items:flex-end;line-height:1.2;flex-shrink:0';
   gwa.innerHTML='<small style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8C8A76">Semester GWA</small><b style="font:700 18px Syne,sans-serif;color:#2F4A12">'+(units?(points/units).toFixed(2):'—')+'</b>';
   wrap.innerHTML=stat('Passed units',num(passed)+'/'+num(total))+stat('Total units',num(total));wrap.appendChild(gwa);header.insertBefore(wrap,header.querySelector('button'));
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',termGwa);else termGwa();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 // The prototype embeds these exact role files. Links update its address and history.
 if(window.parent!==window && (new URLSearchParams(location.search).has('prototype')||window.frameElement?.id==='portal-frame')){
  window.addEventListener('hashchange',()=>window.parent.postMessage({type:'saais:open',url:location.href},(location.origin==='null'||location.protocol==='file:')?'*':location.origin));
  document.addEventListener('click',event=>{
   const a=event.target.closest('a[href]');if(!a||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||a.download||a.target==='_blank')return;
   const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||/^(mailto:|tel:)/.test(raw))return;
   const url=new URL(a.href);if(url.origin!==location.origin)return;
   event.preventDefault();event.stopImmediatePropagation();url.searchParams.delete('prototype');window.parent.postMessage({type:'saais:open',url:url.href},(location.origin==='null'||location.protocol==='file:')?'*':location.origin);
  },true);
 }
})();
