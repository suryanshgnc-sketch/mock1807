const CACHE='mdcccvii-shell-v21';
const SHELL=['./','./index.html','./css/style.css','./css/theme.css','./css/professional.css','./css/motion.css','./css/mdcccvii.css','./css/mdcccvii-v3.css','./css/polished.css','./css/pro-final.css','./css/brand.css','./css/lite.css?v=1','./css/cinematic.css?v=4','./js/cinematic.js?v=3','./js/cbt-plus.js?v=1','./js/gravity.js?v=1','./js/result-centre.js?v=3','./css/home-hero.css?v=3','./js/home-hero.js?v=2','./js/logout.js?v=1','./css/result-centre.css?v=2','./js/app.js','./js/auth.js','./js/backend-tests.js?v=20','./js/analysis.js','./js/leaderboard.js?v=2','./js/lb-visibility.js?v=1','./css/lb-visibility.css?v=1','./manifest.webmanifest','./assets/favicon.png','./assets/icon-180.png','./assets/icon-512.png','./assets/mdcccvii-logo.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(h=>h||caches.match('./index.html'))));
});
