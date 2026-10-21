// DesignSystem.dc.html is the authority. Run through build-prototype.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accountMenu } from './account-menu.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const roles=[
 {id:'student',label:'Student',folder:'Student',prefix:'Student',home:'student/dashboard'},
 {id:'adviser',label:'Adviser',folder:'Adviser',prefix:'Adviser',home:'adviser/dashboard'},
 {id:'department-head',label:'Department Head',folder:'Department Head',prefix:'',home:'department-head/adviser/dashboard'},
 {id:'department-staff',label:'Department Staff',folder:'Department Staff',prefix:'',home:'department-staff/students'},
 {id:'system-admin',label:'System Admin',folder:'SystemAdmin',prefix:'Admin',home:'system-admin/students'},
 {id:'dean-adviser',label:'Dean Adviser',folder:'Dean/DeanAdviser',prefix:'Dean',home:'dean-adviser/adviser/dashboard'},
 {id:'dean-dh',label:'Dean DH',folder:'Dean/DeanDH',prefix:'DH',home:'dean-dh/adviser/dashboard'}
];
const kebab=text=>text.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();
function screenKey(role,file){
 let name=file.replace(/(?:\.dc)?\.html$/,'');
 if(role.id==='student')return name==='Student'?'workspace':kebab(name.replace(/^Student/,''));
 if(role.id==='adviser')return name==='Adviser'?'workspace':name.startsWith('Advisee')?'advisees/'+kebab(name.slice(7)):kebab(name.replace(/^Adviser/,''));
 if(role.id==='system-admin')return ({SystemAdmin:'workspace',AdminStudentDirectory:'students',AdminAccountsRoles:'accounts',AdminFacultyDepartments:'faculty-departments',AdminPrograms:'programs',AdminAuditLog:'audit-log',AdminSettings:'settings',AdminChangePassword:'change-password'})[name];
 if(role.prefix)name=name.slice(role.prefix.length);
 if(name==='Adviser')return 'adviser/workspace';
 if(name.startsWith('Advisee'))return 'adviser/advisees/'+kebab(name.slice(7));
 if(name.startsWith('Adviser')&&name!=='AdviserAssignments')return 'adviser/'+kebab(name.slice(7));
 if(name.startsWith('Dean'))return 'dean/'+kebab(name.slice(4));
 return kebab(name);
}
const routes={};
for(const role of roles){
 for(const file of fs.readdirSync(path.join(ROOT,role.folder)).filter(f=>f.endsWith('.html')&&!['index.html','settings-layout.html'].includes(f))){
  const source=role.folder+'/'+file,relative='../'.repeat(role.folder.split('/').length);
  let html=read(source);
  if(role.id==='department-staff'||role.id.startsWith('dean-'))html=accountMenu(html,role);
  html=html.replace(/<link[^>]*href="(?:\.\.\/)+portal-ui\.css"[^>]*>\s*/g,'').replace(/<script[^>]*src="(?:\.\.\/)+portal-ui\.js"[^>]*><\/script>\s*/g,'');
  html=html.replace('</head>',`<link rel="stylesheet" href="${relative}portal-ui.css"><script src="${relative}portal-ui.js" defer></script></head>`);
  fs.writeFileSync(path.join(ROOT,source),html);
  const key=screenKey(role,file);if(!key)throw Error('No route for '+source);
  const title=(html.match(/<title>(.*?)<\/title>/s)?.[1]||key).replaceAll('&amp;','&');
  routes[role.id+'/'+key]={file:source,title,role:role.id};
 }
}
const aliases={
 'student/enrollment-history':'student/history','student/settings':'student/change-password',
 'adviser/advisees/detail':'adviser/advisees/checklist','adviser/enrollment/new':'adviser/encode-grades','adviser/advisees/record-grades':'adviser/encode-grades',
 'admin/dashboard':'system-admin/students','admin/accounts':'system-admin/accounts','admin/audit-log':'system-admin/audit-log','admin/settings':'system-admin/settings'
};
for(const role of roles)if(!routes[role.home])throw Error('Missing home '+role.home);
fs.writeFileSync(path.join(ROOT,'prototype-routes.js'),'window.SAAIS_PORTALS='+JSON.stringify({roles,routes,aliases},null,2)+';\n');
const styles=[],sections=[];
for(const [slug,file]of [['','Main.dc.html'],['design-system','DesignSystem.dc.html']]){
 const html=read(file);let css=html.match(/<helmet>\s*<style>([\s\S]*?)<\/style>\s*<\/helmet>/)?.[1]||'';
 css=css.replace(/@import\s+url\([^)]*\)\s*;/g,'').replace(/\bbody\s*\{/,'& {');
 const content=html.match(/<x-dc>([\s\S]*?)<\/x-dc>/)?.[1]?.replace(/<helmet>[\s\S]*?<\/helmet>/g,'')||'';
 styles.push(`.view[data-route="${slug}"] {${css}}`);sections.push(`<section class="view" data-route="${slug}" hidden>${content}</section>`);
}
let product=read('_gen/product.js');
product=product.replace('route=slug;const restricted=', 'route=slug;if(window.PortalPrototype?.show(slug))return;window.PortalPrototype?.hide();const restricted=');
if(!product.includes('PortalPrototype?.show'))throw Error('Public runtime route hook missing');
const map=roles.map(role=>`<section><h2>${role.label}</h2>${Object.entries(routes).filter(([,r])=>r.role===role.id).map(([slug,r])=>`<button type="button" data-goto="${slug}">${r.title.split(/[\u00b7|]/)[0].trim()}</button>`).join('')}</section>`).join('');
const chrome=`
html,body{margin:0;background:#FBF8EF}.view[hidden],[hidden]{display:none!important}
#portal-frame{display:block;width:100%;height:100vh;height:100dvh;border:0;background:#FBF8EF}
#proto-bar{position:fixed;bottom:12px;right:12px;z-index:9999;display:flex;gap:4px;max-width:calc(100vw - 24px);overflow:auto;padding:6px;background:#1D2F0A;border:1px solid #2F4A12;border-radius:8px;font:600 12px 'IBM Plex Sans','Segoe UI',sans-serif}
#proto-bar button{flex-shrink:0;border:0;border-radius:8px;padding:9px 12px;background:transparent;color:#FBF8EF;cursor:pointer}#proto-bar button.active{background:#FBF8EF;color:#1D2F0A}
#proto-sitemap{width:min(1000px,calc(100% - 32px));max-height:85vh;overflow:auto;border:1px solid #E1DBC6;border-radius:6px;background:#FBF8EF;padding:24px;font:15px/1.55 'IBM Plex Sans','Segoe UI',sans-serif}#proto-sitemap::backdrop{background:rgba(22,32,12,.55)}#proto-sitemap .map-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}#proto-sitemap h2{font:600 16px/1.4 'IBM Plex Sans',sans-serif}#proto-sitemap button{display:block;text-align:left;border:1px solid #E1DBC6;border-radius:8px;background:#FFF;padding:9px 12px;margin:4px 0;cursor:pointer}#proto-sitemap [data-map-close]{margin-left:auto}
@media(max-width:768px){#proto-bar button{min-height:44px}}@media print{#proto-bar,#proto-sitemap{display:none!important}}
`;
const out=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SAAIS prototype</title><style>@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;450;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');${styles.join('\n')}${read('_gen/product.css')}${chrome}</style></head><body>${sections.join('\n')}<iframe id="portal-frame" title="SAAIS role portal" hidden></iframe><div id="proto-bar" aria-label="Prototype role switch"><button id="proto-home" type="button">Home</button>${roles.map(r=>`<button type="button" data-role="${r.id}">${r.label}</button>`).join('')}<button id="proto-map" type="button">All screens</button></div><dialog id="proto-sitemap" aria-label="All prototype screens"><button type="button" data-map-close>Close</button><div class="map-grid">${map}</div></dialog><script src="prototype-routes.js"></script><script src="prototype-navigation.js"></script><script>${read('_gen/demo-model.js')}</script><script>${read('_gen/landing-interactions.js')}</script><script>${product}</script></body></html>`;
fs.writeFileSync(path.join(ROOT,'prototype.html'),out);
console.log(`Synced ${Object.keys(routes).length} screens across ${roles.length} roles into prototype.html.`);
