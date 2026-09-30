/* MDCCCVII homescreen behaviour */
(()=>{'use strict';const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* nav + scrollspy + steps line + watermark parallax */
const nav=$('#xNav'),links=$$('.x-links a'),spy=links.map(a=>({a,el:$(a.getAttribute('href'))})).filter(x=>x.el),steps=$('.x-steps'),mark=$('.x-mark');let tk=false;
const upd=()=>{if(tk)return;tk=true;requestAnimationFrame(()=>{nav.classList.toggle('sc',scrollY>30);const y=scrollY+innerHeight*.35;let cur=null;spy.forEach(x=>{if(x.el.getBoundingClientRect().top+scrollY<=y)cur=x});links.forEach(a=>a.classList.toggle('act',!!cur&&cur.a===a));
 if(steps){const r=steps.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight*.72-r.top)/(r.height+140)));steps.style.setProperty('--p',p.toFixed(3));$$('li',steps).forEach((li,i)=>li.classList.toggle('on',p>0&&p>=i/3-.02))}
 if(mark&&!reduce)mark.style.transform=`translate(-50%,${Math.min(scrollY,700)*.18}px)`;tk=false})};
addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);upd();
/* reveal + in-view */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add(e.target.classList.contains('bn')?'iv':'in');io.unobserve(e.target)}}),{threshold:.15});$$('.rv,.bn').forEach(x=>io.observe(x));
/* spotlight */
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.bn');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')},{passive:true});
/* count-up */
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target,to=+el.dataset.n,t0=performance.now();const f=n=>{const p=Math.min(1,(n-t0)/1400);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)};reduce?el.textContent=to:requestAnimationFrame(f);cio.unobserve(el)}),{threshold:.6});$$('[data-n]').forEach(b=>cio.observe(b));
/* console: live timer, question cycling, palette fill, rank swaps */
const tm=$('#xTimer');if(tm){let s=3*3600-19;setInterval(()=>{s=s<=0?3*3600:s-1;tm.textContent=[s/3600|0,s%3600/60|0,s%60].map(v=>String(v).padStart(2,'0')).join(':')},1000)}
const cells=$$('.c-pal u'),opts=$$('.c-o'),qn=$('#xQn'),ans=$('#xAns');let n=0,q=14;
const step=()=>{const c=cells[n%cells.length];if(n%cells.length===0)cells.forEach(u=>u.className='');cells.forEach(u=>u.classList.remove('c'));c.className=(Math.random()<.2?'m':'a')+' c';if(ans)ans.textContent=cells.filter(u=>/a|m/.test(u.className)).length;
 opts.forEach(o=>o.classList.remove('on'));setTimeout(()=>opts[(Math.random()*4)|0].classList.add('on'),500);if(qn)qn.textContent=(q=q%75+1);n++};
if(cells.length&&!window.__cineHero){step();if(!reduce)setInterval(step,2200)}
const rk=$('#xRank');if(rk&&!window.__cineHero){const P=[['Aarav K.',296],['Diya M.',288],['You',281],['Kabir S.',274]];let order=[0,1,2,3],cnt=0;
 rk.innerHTML=P.map((p,i)=>`<li data-i="${i}" class="${p[0]==='You'?'me':''}"><b></b><span>${p[0]}</span><em>${p[1]}</em></li>`).join('');
 const lay=()=>order.forEach((pi,pos)=>{const li=rk.children[pi];li.style.transform=`translateY(${pos*30}px)`;li.firstChild.textContent='#'+(pos+1);li.lastChild.textContent=[296,288,281,274][pos]});lay();
 if(!reduce)setInterval(()=>{cnt++;const me=order.indexOf(2);if(cnt%2){if(me>0){[order[me-1],order[me]]=[order[me],order[me-1]]}}else{order=[0,1,2,3]}lay()},2600)}
/* faq: one open */
$$('.x-faq details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)$$('.x-faq details').forEach(o=>{if(o!==d)o.open=false})}));
/* hero stage parallax */
const st=$('.x-stage'),hero=$('.x-hero');if(st&&!reduce&&matchMedia('(pointer:fine)').matches){hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();st.style.transform=`translate(${((e.clientX-r.left)/r.width-.5)*-16}px,${((e.clientY-r.top)/r.height-.5)*-12}px)`});hero.addEventListener('pointerleave',()=>st.style.transform='')}
})();
