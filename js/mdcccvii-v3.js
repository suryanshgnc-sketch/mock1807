/* MDCCCVII v3 motion engine — lightweight canvas + interaction layer */
'use strict';
(()=>{
 const canvas=document.getElementById('mdfx'); if(!canvas)return;
 const ctx=canvas.getContext('2d'); const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2),pts=[],mouse={x:w*.5,y:h*.35,tx:w*.5,ty:h*.35};
 function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const n=Math.min(90,Math.floor(w*h/18000));pts=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.16,vy:(Math.random()-.5)*.16,r:Math.random()*1.4+.35,a:Math.random()*.42+.08,p:Math.random()*Math.PI*2}));}
 resize(); addEventListener('resize',resize,{passive:true});
 addEventListener('pointermove',e=>{mouse.tx=e.clientX;mouse.ty=e.clientY},{passive:true});
 function frame(t){
   if(reduce)return; mouse.x+=(mouse.tx-mouse.x)*.045;mouse.y+=(mouse.ty-mouse.y)*.045;
   ctx.clearRect(0,0,w,h);
   for(const p of pts){p.x+=p.vx;p.y+=p.vy;p.p+=.008;if(p.x<-5)p.x=w+5;if(p.x>w+5)p.x=-5;if(p.y<-5)p.y=h+5;if(p.y>h+5)p.y=-5;
     const dx=p.x-mouse.x,dy=p.y-mouse.y,dist=Math.hypot(dx,dy);let alpha=p.a*(dist<240?1.8:.7);ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1+Math.sin(p.p)*.2),0,Math.PI*2);ctx.fillStyle=`rgba(114,255,69,${Math.min(.7,alpha)})`;ctx.fill();
   }
   // sparse proximity connections
   ctx.lineWidth=.45;
   for(let i=0;i<pts.length;i++){for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],dx=a.x-b.x,dy=a.y-b.y,dd=dx*dx+dy*dy;if(dd<12500){ctx.strokeStyle=`rgba(114,255,69,${.045*(1-dd/12500)})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}
   requestAnimationFrame(frame);
 }
 if(!reduce)requestAnimationFrame(frame);

 const c1=document.querySelector('.md-cursor'),c2=document.querySelector('.md-cursor-2');
 if(c1&&c2&&!reduce){addEventListener('pointermove',e=>{c2.style.transform=`translate(${e.clientX-2.5}px,${e.clientY-2.5}px)`;c1.style.transform=`translate(${e.clientX-9}px,${e.clientY-9}px)`},{passive:true});document.addEventListener('pointerover',e=>{if(e.target.closest('a,button,.bt-card,.fc,.legal-card')){c1.style.width='34px';c1.style.height='34px';c1.style.opacity='.7'}},{passive:true});document.addEventListener('pointerout',e=>{if(e.target.closest('a,button,.bt-card,.fc,.legal-card')){c1.style.width='18px';c1.style.height='18px';c1.style.opacity='1'}},{passive:true});}

 // Animated command metrics
 const counters=[...document.querySelectorAll('[data-count]')];
 const animateCount=el=>{const to=Number(el.dataset.count)||0,start=performance.now(),dur=1000;const tick=now=>{const p=Math.min(1,(now-start)/dur),e=1-Math.pow(1-p,3);el.textContent=Math.round(to*e);if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)};
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){animateCount(e.target);io.unobserve(e.target)}}),{threshold:.7});counters.forEach(x=>io.observe(x));

 // Magnetic CTA / button micro-motion
 if(!reduce&&matchMedia('(pointer:fine)').matches){document.querySelectorAll('.cta,.gbtn,.bt-btn').forEach(btn=>{btn.addEventListener('pointermove',e=>{const r=btn.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;btn.style.transform=`translate(${x*5}px,${y*4}px)`},{passive:true});btn.addEventListener('pointerleave',()=>{btn.style.transform=''},{passive:true})});}

 // Scroll reveal for major cards.
 const rev=[...document.querySelectorAll('.sec,.command-main,.command-stats,.legal-card')]; const rio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('md-in');rio.unobserve(e.target)}}),{threshold:.08});rev.forEach(x=>{x.classList.add('md-reveal');rio.observe(x)});
})();
