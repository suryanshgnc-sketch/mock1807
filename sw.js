const CACHE='mdcccvii-shell-v6';
const SHELL=['./','./index.html','./css/style.css','./css/theme.css','./css/professional.css','./css/motion.css','./css/mdcccvii.css','./css/mdcccvii-v3.css','./css/polished.css','./css/pro-final.css','./css/brand.css','./js/app.js','./js/auth.js','./js/backend-tests.js','./js/analysis.js','./assets/favicon.png','./assets/mdcccvii-logo.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  e.respondWith(caches.match(e.request).then(hit=>{
    if(hit) return hit;
    return fetch(e.request).then(r=>{
      if(r.ok){const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c));}
      return r;
    }).catch(()=>caches.match('./index.html'));
  }));
});
