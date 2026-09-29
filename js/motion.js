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
