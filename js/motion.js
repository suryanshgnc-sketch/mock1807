/* Scroll reveals, staggered cards, animated hero, cursor glow */
(function(){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});
  const watch=()=>document.querySelectorAll('.reveal:not(.in),.bt-card:not(.seen),.fc:not(.seen),.pod:not(.seen)').forEach((el,i)=>{
    if(reduce){el.classList.add('in','seen');return}
    if(!el.classList.contains('reveal')){el.classList.add('seen','reveal');el.style.transitionDelay=(i%6)*70+'ms'}
    io.observe(el)});
  new MutationObserver(watch).observe(document.getElementById('land'),{childList:true,subtree:true});watch();
  const l=document.getElementById('land');
  if(!reduce)l.addEventListener('pointermove',e=>{l.style.setProperty('--gx',e.clientX+'px');l.style.setProperty('--gy',e.clientY+'px')});
})();
/* hero timer + card tilt */
(function(){
  const t=document.getElementById('hvTimer');
  if(t){let s=3*3600-19;setInterval(()=>{s=s<=0?3*3600:s-1;t.textContent=[s/3600|0,s%3600/60|0,s%60].map(v=>String(v).padStart(2,'0')).join(':')},1000)}
  if(matchMedia('(pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.addEventListener('pointermove',e=>{
      const c=e.target.closest&&e.target.closest('.bt-card,.fc');
      document.querySelectorAll('.bt-card.tl,.fc.tl').forEach(x=>{if(x!==c){x.classList.remove('tl');x.style.transform=''}});
      if(!c)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      c.classList.add('tl');c.style.transform=`perspective(800px) rotateY(${x*7}deg) rotateX(${-y*7}deg) translateY(-5px)`});
  }
})();
