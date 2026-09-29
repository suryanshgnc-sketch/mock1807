/* MDCCCVII pro-fx: preloader, progress, word reveal, spotlight, scrollspy, consent, back-to-top */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* preloader */
const load=document.createElement('div');load.id='pf-load';load.setAttribute('aria-hidden','true');
load.innerHTML='<div class="pf-l"><img src="assets/mdcccvii-logo.png" alt=""><b>MDCCCVII</b><div class="pf-bar"><i></i></div></div>';
document.body.prepend(load);
const hide=()=>setTimeout(()=>{load.classList.add('done');setTimeout(()=>load.remove(),700)},reduce?0:450);
document.readyState==='complete'?hide():addEventListener('load',hide);setTimeout(hide,3500);

/* progress + back to top */
const bar=document.createElement('div');bar.id='pf-progress';document.body.appendChild(bar);
const top=document.createElement('button');top.id='pf-top';top.setAttribute('aria-label','Back to top');
top.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
top.onclick=()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'});document.body.appendChild(top);
let tick=false;const onScroll=()=>{if(tick)return;tick=true;requestAnimationFrame(()=>{const h=document.documentElement,m=h.scrollHeight-innerHeight;
 bar.style.transform=`scaleX(${m>0?Math.min(1,scrollY/m):0})`;top.classList.toggle('on',scrollY>700);tick=false})};
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* skip link */
const main=$('main');if(main){main.id=main.id||'main';const s=document.createElement('a');s.className='skip';s.href='#'+main.id;s.textContent='Skip to content';document.body.prepend(s)}

/* hero headline word reveal (keeps <em> styling) */
const h1=null;
if(h1&&!reduce){let i=0;const wrap=n=>{$$(':scope',n);[...n.childNodes].forEach(c=>{
 if(c.nodeType===3){const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;
  if(/^\s+$/.test(t)){f.append(' ');return}const w=document.createElement('span');w.className='w';const p=document.createElement('span');p.style.setProperty('--i',i++);p.textContent=t;w.appendChild(p);f.appendChild(w)});c.replaceWith(f)}
 else if(c.nodeType===1&&c.tagName!=='BR')wrap(c)})};wrap(h1)}

/* spotlight */
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.bt-card,.fc,.legal-card,.command-stats>div');
 if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')},{passive:true});

/* legal scrollspy */
const toc=$$('.lg-toc a');if(toc.length){const secs=toc.map(a=>$(a.getAttribute('href'))).filter(Boolean);
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)toc.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-20% 0px -70% 0px'});secs.forEach(s=>io.observe(s))}

/* notice (we only use essential storage, so this is informational, not a tracking-consent wall) */
try{if(!localStorage.getItem('md_notice_v1')){const c=document.createElement('div');c.id='pf-consent';c.setAttribute('role','dialog');c.setAttribute('aria-label','Storage notice');
 c.innerHTML='<p>We use only essential browser storage (login session, test progress, preferences). No ads, no tracking cookies. See our <a href="legal.html#cookies">Cookies &amp; Storage</a> and <a href="legal.html#privacy">Privacy Policy</a>.</p><button>Got it</button>';
 document.body.appendChild(c);setTimeout(()=>c.classList.add('on'),1800);$('button',c).onclick=()=>{localStorage.setItem('md_notice_v1','1');c.classList.remove('on');setTimeout(()=>c.remove(),800)}}}catch(_){}
})();
