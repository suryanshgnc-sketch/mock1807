/* MDCCCVII homescreen interactions */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
$$('.viz-pal u').forEach((u,i)=>u.style.setProperty('--i',i));
/* nav: shrink on scroll + scrollspy */
const nav=$('.hn');const links=$$('.nav-links a');
const spy=links.map(a=>({a,el:$(a.getAttribute('href'))})).filter(x=>x.el);
let t=false;const upd=()=>{if(t)return;t=true;requestAnimationFrame(()=>{
 nav&&nav.classList.toggle('scrolled',scrollY>30);
 const y=scrollY+innerHeight*.35;let cur=null;spy.forEach(x=>{if(x.el.getBoundingClientRect().top+scrollY<=y)cur=x});
 links.forEach(a=>a.classList.toggle('act',!!cur&&cur.a===a));
 /* steps progress line */
 const st=$('.steps');if(st){const r=st.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight*.75-r.top)/(r.height+120)));st.style.setProperty('--p',p.toFixed(3));
  $$('li',st).forEach((li,i)=>li.classList.toggle('on',p>=i/3-.02&&p>0))}
 t=false})};
addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);upd();
/* bento: spotlight + in-view triggers */
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.bn');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')},{passive:true});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-v');io.unobserve(e.target)}}),{threshold:.35});$$('.bn').forEach(b=>io.observe(b));
/* hero stat count-up (+ suffix) */
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.style.setProperty('--x',1);e.target.classList.add('cnt');cio.unobserve(e.target)}}),{threshold:.6});
$$('.h-stats b').forEach(b=>{cio.observe(b);setTimeout(()=>b.style.setProperty('--sfx',1),1600)});
const st=document.createElement('style');st.textContent='.h-stats b.cnt:after{opacity:1;transition:opacity .4s 1.1s}';document.head.appendChild(st);
/* hero mockup parallax */
const hv=$('.hv');if(hv&&!reduce&&matchMedia('(pointer:fine)').matches){const h=$('.hero');
 h.addEventListener('pointermove',e=>{const r=h.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;hv.style.transform=`translate(${x*-14}px,${y*-10}px)`});
 h.addEventListener('pointerleave',()=>hv.style.transform='')}
/* faq: one open at a time */
$$('.faq details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)$$('.faq details').forEach(o=>{if(o!==d)o.open=false})}));
})();
