/* Updated role pages share one presentation address and browser history. */
(() => {
 const manifest=window.SAAIS_PORTALS,frame=document.querySelector('#portal-frame'),map=document.querySelector('#proto-sitemap');
 const fileRoutes=new Map(Object.entries(manifest.routes).map(([route,value])=>[decodeURIComponent(new URL(value.file,location.href).pathname),route]));
 for(const role of manifest.roles)fileRoutes.set(decodeURIComponent(new URL(role.folder+'/index.html',location.href).pathname),role.home);
 const publicRoute=pathname=>/\/(Login|Docs|Main)\.dc\.html$/.test(pathname)?pathname.includes('Login')?'login':pathname.includes('Docs')?'docs':'':null;
 const go=route=>{location.hash='#/'+route;};
 function show(raw){
  const [path,query='']=raw.split('?'),route=manifest.aliases[path]||path,screen=manifest.routes[route];if(!screen)return false;
  document.querySelectorAll('.view').forEach(v=>{v.hidden=true;v.classList.remove('active');});
  const product=document.querySelector('#product-view');if(product)product.hidden=true;
  const url=new URL(screen.file,location.href);url.search=query;url.searchParams.set('prototype','1');
  const localHash=url.searchParams.get('_view');url.searchParams.delete('_view');if(localHash)url.hash=localHash;
  let actual;try{actual=frame.contentWindow?.location.href;}catch{}
  if(frame.getAttribute('src')!==url.href&&actual!==url.href)frame.src=url.href;
  frame.hidden=false;frame.title=screen.title;document.title=screen.title+' | SAAIS';
  document.querySelectorAll('#proto-bar [data-role]').forEach(b=>b.classList.toggle('active',b.dataset.role===screen.role));
  if(route!==path)history.replaceState(null,'','#/'+route+(query?'?'+query:''));
  return true;
 }
 window.PortalPrototype={show,hide(){frame.hidden=true;}};
 // Table rows and workflow buttons can navigate without anchors.
 frame.addEventListener('load',()=>{
  let url;try{url=new URL(frame.contentWindow.location.href);}catch{return;}
  const pathname=decodeURIComponent(url.pathname),publicScreen=publicRoute(pathname);
  if(publicScreen!==null){go(publicScreen);return;}
  const route=fileRoutes.get(pathname);if(!route)return;
  url.searchParams.delete('prototype');if(url.hash)url.searchParams.set('_view',url.hash.slice(1));
  const target=route+(url.search?'?'+url.searchParams.toString():'');
  if(location.hash!=='#/'+target)history.replaceState(null,'','#/'+target);
  show(target);
 });
 document.addEventListener('click',event=>{
  const bar=event.target.closest('#proto-bar'),jump=event.target.closest('[data-goto]');
  if(!bar&&!jump&&!event.target.closest('#proto-sitemap'))return;
  event.preventDefault();event.stopImmediatePropagation();
  const role=event.target.closest('[data-role]');if(role){go(manifest.roles.find(r=>r.id===role.dataset.role).home);return;}
  if(jump){map.close();go(jump.dataset.goto);return;}
  if(event.target.closest('#proto-home'))go('');
  if(event.target.closest('#proto-map'))map.showModal();
  if(event.target===map||event.target.closest('[data-map-close]'))map.close();
 },true);
 window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='saais:open')return;
  const url=new URL(event.data.url,location.href);if(url.origin!==location.origin)return;
  const path=decodeURIComponent(url.pathname),route=fileRoutes.get(path);
  if(route){url.searchParams.delete('prototype');if(url.hash)url.searchParams.set('_view',url.hash.slice(1));go(route+(url.search?'?'+url.searchParams.toString():''));}
  else {const publicScreen=publicRoute(path);if(publicScreen!==null)go(publicScreen);}
 });
})();
