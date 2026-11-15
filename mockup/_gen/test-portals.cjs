// Integration checks for source workflows, shared navigation, and presentation routing.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const registry={window:{}};vm.runInNewContext(read('prototype-routes.js'),registry);
const manifest=registry.window.SAAIS_PORTALS;
const failures=[];
function documentFor(file,query=''){
 const console=new VirtualConsole();
 // jsdom does not implement the native CSS nesting used by the marketing page.
 console.on('jsdomError',e=>{if(e.type!=='css parsing')failures.push(`${file}: ${e.message}`);});
 const dom=new JSDOM(read(file),{url:'http://localhost/mockup/'+file+query,runScripts:'outside-only',virtualConsole:console});
 const w=dom.window;
 w.structuredClone=structuredClone;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 return dom;
}
function execute(dom,file){
 const scripts=[...dom.window.document.querySelectorAll('script')];
 for(const script of [...scripts.filter(s=>!s.defer),...scripts.filter(s=>s.defer)]){
  const ref=script.getAttribute('src');const code=ref?read(path.join(path.dirname(file),ref)):script.textContent;
  new vm.Script(code);dom.window.eval(code);
 }
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
}
for(const [route,screen]of Object.entries(manifest.routes)){
 const dom=documentFor(screen.file,'?prototype=1'),w=dom.window,d=w.document;
 for(const link of [...d.querySelectorAll('link[rel="stylesheet"]')]){
  const style=d.createElement('style');style.textContent=read(path.join(path.dirname(screen.file),link.getAttribute('href'))).replace(/@import\s+url\([^)]*\)\s*;/g,'');link.replaceWith(style);
 }
 execute(dom,screen.file);
 const sidebar=d.querySelector('.portal-sidebar');assert.ok(sidebar,route+' sidebar');
 assert.ok(d.querySelector('.portal-main'),route+' content');assert.ok(d.querySelector('.portal-topbar'),route+' header');
 assert.equal(w.getComputedStyle(sidebar).width,'250px',route+' sidebar measurement');
 const navigation=sidebar.querySelector(':scope > nav'),footer=sidebar.querySelector(':scope > .portal-sidebar-footer');
 assert.ok(footer,route+' fixed account area');
 assert.equal(w.getComputedStyle(sidebar).overflow,'hidden',route+' sidebar does not scroll');
 assert.equal(w.getComputedStyle(navigation).overflowY,'auto',route+' navigation scrolls');
 assert.equal(w.getComputedStyle(navigation).minHeight,'0',route+' navigation can shrink');
 assert.equal(w.getComputedStyle(footer).flexShrink,'0',route+' footer retains its height');
 const bell=d.querySelector('.portal-notification-toggle'),notifications=d.querySelector('.portal-notification-popover');
 const originalUrl=w.location.href;
 assert.equal(bell.tagName,'BUTTON',route+' notification button');assert.ok(notifications.hidden,route+' notifications initially hidden');
 bell.click();assert.equal(notifications.hidden,false,route+' notification popover opens');assert.equal(bell.getAttribute('aria-expanded'),'true',route+' notification expanded');
 assert.equal(w.location.href,originalUrl,route+' notifications do not navigate');
 bell.click();assert.ok(notifications.hidden,route+' notification toggle closes');
 bell.click();d.body.click();assert.ok(notifications.hidden,route+' outside click dismisses notifications');
 bell.click();bell.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(notifications.hidden,route+' Escape dismisses notifications');
 const menu=d.querySelector('.portal-menu-open');
 assert.equal(w.getComputedStyle(menu).display,'none',route+' desktop menu hidden');
 assert.equal(w.getComputedStyle(d.querySelector('.portal-menu-close')).display,'none',route+' desktop drawer close hidden');
 if(screen.role==='student'){
  assert.ok(d.querySelector('[data-portal-header-start] > nav[aria-label="Breadcrumb"]'),route+' left breadcrumb group');
  assert.ok(d.querySelector('.student-topbar > .student-header-notification svg'),route+' notification alignment');
  assert.equal(menu.parentElement,d.querySelector('[data-portal-header-start]'),route+' mobile menu stays with breadcrumb');
 }
 menu.click();assert.equal(menu.getAttribute('aria-expanded'),'true',route+' open drawer');
 assert.equal(sidebar.nextElementSibling.inert,true,route+' modal background');
 d.querySelector('.portal-menu-close').click();assert.equal(menu.getAttribute('aria-expanded'),'false',route+' close drawer');
 assert.equal(sidebar.nextElementSibling.inert,false,route+' release background');
 for(const section of sidebar.querySelectorAll('details')){const state=section.open;section.querySelector('summary').click();assert.notEqual(section.open,state,route+' toggle role');section.querySelector('summary').click();}
 for(const a of sidebar.querySelectorAll('nav a')){const href=a.getAttribute('href');if(href&&!href.startsWith('#'))assert.ok(fs.existsSync(path.resolve(root,path.dirname(screen.file),href.split(/[?#]/)[0])),route+' link '+href);}
 if(screen.role.startsWith('dean-'))assert.ok(sidebar.querySelector('a').textContent.includes('Dean portal'),route+' Dean branding');
 if(screen.role==='department-staff'||screen.role.startsWith('dean-')){
  const account=sidebar.querySelector('.adviser-account'),trigger=account.querySelector('[aria-haspopup="menu"]'),popup=account.querySelector('[role=menu]');
  const items=[...popup.querySelectorAll('[role=menuitem]')];
  assert.deepEqual(items.map(item=>item.textContent.trim()),['Change password','Sign out'],route+' Adviser account options');
  assert.ok(popup.querySelector('.account-menu-divider'),route+' account divider');
  assert.ok(items[0].querySelector('svg rect'),route+' password lock icon');
  assert.ok(fs.existsSync(path.resolve(root,path.dirname(screen.file),items[0].getAttribute('href'))),route+' password destination');
  assert.ok(popup.hidden,route+' menu initially closed');trigger.click();assert.equal(popup.hidden,false,route+' account opens');
  assert.equal(trigger.getAttribute('aria-expanded'),'true',route+' expanded state');
  account.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(popup.hidden,true,route+' Escape closes account');
  trigger.click();d.body.click();assert.equal(popup.hidden,true,route+' outside click closes account');
 }
 dom.window.close();
}
const dom=documentFor('prototype.html'),w=dom.window,d=w.document;execute(dom,'prototype.html');
for(const role of manifest.roles){
 d.querySelector(`[data-role="${role.id}"]`).click();w.SAAISDemo.render();
 assert.ok(decodeURIComponent(d.querySelector('#portal-frame').src).includes(manifest.routes[role.home].file),role.id+' entry point');
}
for(const route of Object.keys(manifest.routes)){w.location.hash='#/'+route;w.SAAISDemo.render();assert.equal(d.querySelector('#portal-frame').hidden,false,route+' presentation');}
w.location.hash='#/dean-dh/dean/reports?student=sample';w.SAAISDemo.render();
assert.ok(d.querySelector('#portal-frame').src.includes('student=sample'),'query preserved');
for(const role of manifest.roles){
 const url=new URL(role.folder+'/index.html',w.location.href);
 w.dispatchEvent(new w.MessageEvent('message',{source:d.querySelector('#portal-frame').contentWindow,origin:w.location.origin,data:{type:'saais:open',url:url.href}}));
 assert.equal(w.location.hash,'#/'+role.home,role.id+' brand entry point');
}
w.dispatchEvent(new w.MessageEvent('message',{source:d.querySelector('#portal-frame').contentWindow,origin:w.location.origin,data:{type:'saais:open',url:'http://localhost/mockup/Login.dc.html'}}));
assert.equal(w.location.hash,'#/login','sign-out returns to presentation sign-in');
d.querySelector('#proto-map').click();assert.equal(d.querySelector('#proto-sitemap').open,true,'screen map opens');d.querySelector('[data-map-close]').click();
w.location.hash='#/login';w.SAAISDemo.render();assert.ok(d.querySelector('#product-view form'),'sign-in retained');
w.location.hash='#/';w.SAAISDemo.render();assert.ok(d.querySelector('.view.active[data-route=""]'),'landing retained');
dom.window.close();
assert.deepEqual(failures,[]);
console.log(`Passed: ${Object.keys(manifest.routes).length} source screens, ${manifest.roles.length} roles, drawers, role groups, links, branding, route queries, screen map, sign-in, and landing.`);
