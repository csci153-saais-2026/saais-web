// Adviser account-menu format, retaining each portal's existing event bindings.
export function accountMenu(html,role){
 const dean=role.id.startsWith('dean-');
 const password=dean?(role.id==='dean-dh'?'DHAdviserChangePassword.dc.html':'DeanAdviserChangePassword.dc.html'):'ChangePassword.dc.html';
 const login=dean?'../../Login.dc.html':'../Login.dc.html';
 const icon=content=>`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
 const lock=icon('<rect x="4.5" y="10" width="15" height="10.5" rx="1.6"/><path d="M8 10V7a4 4 0 018 0v3"/>');
 const logout=icon('<path d="M9 21H5a1 1 0 01-1-1V4a1 1 0 011-1h4"/><path d="M15.5 16.5L20 12l-4.5-4.5M20 12H9"/>');
 const addClass=(attrs,name)=>attrs.replace(/class="([^"]*)"/,(_,classes)=>`class="${[...new Set([...classes.split(' '),name])].join(' ')}"`);
 html=html.replace(/<div class="(user-menu|dean-profile)(?: adviser-account)?">/,'<div class="$1 adviser-account">');
 html=html.replace(/<div([^>]*class="(?:user-menu-list|dean-profile-popup)[^"]*"[^>]*)>[\s\S]*?<\/div>/,(_,attrs)=>{
  attrs=addClass(attrs,'adviser-account-popup').replace(/ role="menu"/g,'');
  const signout=dean?`<button type="button" role="menuitem" class="account-signout" data-dean-signout>${logout}<span>Sign out</span></button>`:`<a role="menuitem" class="account-signout" href="${login}" data-signout>${logout}<span>Sign out</span></a>`;
  return `<div${attrs} role="menu"><a role="menuitem" href="${password}">${lock}<span>Change password</span></a><hr class="account-menu-divider">${signout}</div>`;
 });
 html=html.replace(/<button([^>]*class="(?:user-trigger|dean-profile-trigger)[^"]*"[^>]*)>/,(_,attrs)=>`<button${addClass(attrs,'adviser-account-trigger').replace(/ aria-haspopup="menu"/g,'')} aria-haspopup="menu">`);
 return html;
}
