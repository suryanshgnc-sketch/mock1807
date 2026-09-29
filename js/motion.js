/* Hero: score stamp counts up as the sheet is marked */
(function(){const n=document.getElementById('stampN');if(!n||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const to=142,t0=performance.now()+4000,f=t=>{const p=Math.max(0,Math.min(1,(t-t0)/700));n.textContent=Math.round(to*p);if(p<1)requestAnimationFrame(f)};n.textContent='0';requestAnimationFrame(f)})();
