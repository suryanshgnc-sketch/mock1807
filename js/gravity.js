/* Home page physics: gravity-drop headline, throwable symbols (real 2D physics), scroll inertia. Visual only. */
(function(){
'use strict';
var hero=document.querySelector('.x-hero');if(!hero)return;
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches,touch=matchMedia('(hover:none)').matches;
var $=function(s,r){return(r||document).querySelector(s)};
/* 1. Headline letters fall in with bounce */
(function(){
 var h1=$('h1',hero);if(!h1||RM)return;h1.setAttribute('aria-label',h1.textContent);
 var base=document.getElementById('cineIntro')?2.35:.25,n=0;
 [].forEach.call(h1.querySelectorAll('.hl>span'),function(sp){
  var t=sp.textContent;sp.setAttribute('aria-hidden','true');
  sp.innerHTML=t.split(' ').map(function(w){return '<span class="gw">'+w.split('').map(function(c){return '<span class="gl" style="--i:'+(n++)+';--b:'+base+'s">'+c+'</span>'}).join('')+'</span>'}).join(' ');
 });
 h1.addEventListener('pointerover',function(e){var l=e.target;if(l.classList&&l.classList.contains('gl')&&!l.classList.contains('jig')){l.classList.add('jig');setTimeout(function(){l.classList.remove('jig')},900)}});
})();
/* 2. Spotlight follows cursor */
var spot=document.createElement('div');spot.className='gv-spot';hero.insertBefore(spot,hero.firstChild);
if(RM)return;
/* 3. Physics playground */
var cv=document.createElement('canvas');cv.className='gv-cv';cv.setAttribute('aria-hidden','true');hero.insertBefore(cv,hero.firstChild);
var cx=cv.getContext('2d'),W=0,H=0,dpr=Math.min(devicePixelRatio||1,2),G=.5,E=.58,B=[],px=-999,py=-999,pvx=0,pvy=0,grab=null,gon=true,run=false,vis=true;
var COL=['#86ff3f','#5eead4','#a78bfa','#fbbf24','#f472b6'];
var LAB=['F=ma','+4','\u03C0','\u222B','H\u2082O','\u221Ax','#1','JEE','e\u02E3','\u0394v','A','B','C','D','75','\u03A3','\u2212','\u221E','sin','pH'];
function size(){var r=hero.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';cx.setTransform(dpr,0,0,dpr,0,0)}
function add(x,y,i,delay){var r=(touch?20:24)+Math.random()*(touch?10:14);B.push({x:x,y:y,vx:(Math.random()-.5)*3,vy:0,r:r,a:Math.random()*6,va:(Math.random()-.5)*.1,l:LAB[i%LAB.length],c:COL[i%COL.length],in:false,w:delay||0})}
function seed(){B=[];var n=touch?9:18;for(var i=0;i<n;i++)add(80+Math.random()*(W-160),-40-Math.random()*520,i,i*6)}
function step(){
 for(var i=0;i<B.length;i++){var b=B[i];
  if(b.w>0){b.w--;continue}
  if(b===grab){var nx=px,ny=py;b.vx=(nx-b.x)*.5;b.vy=(ny-b.y)*.5;b.x+=b.vx;b.y+=b.vy;continue}
  b.vy+=gon?G:0;b.vx*=.999;b.vy*=.999;
  if(!touch){var dx=b.x-px,dy=b.y-py,d=Math.hypot(dx,dy);if(d<130&&d>1){var f=(130-d)/130*1.4;b.vx+=dx/d*f;b.vy+=dy/d*f}}
  b.x+=b.vx;b.y+=b.vy;b.a+=b.va;b.va*=.995;
  if(b.y>b.r)b.in=true;
  if(b.x<b.r){b.x=b.r;b.vx=-b.vx*E}else if(b.x>W-b.r){b.x=W-b.r;b.vx=-b.vx*E}
  if(b.y>H-b.r-6){b.y=H-b.r-6;b.vy=-b.vy*E;if(Math.abs(b.vy)<1.1)b.vy=0;b.vx*=.97;b.va+=b.vx*.004}
  if(b.in&&b.y<b.r&&(!gon||b.vy<0)){b.y=b.r;b.vy=Math.abs(b.vy)*E}
 }
 for(var i=0;i<B.length;i++)for(var j=i+1;j<B.length;j++){
  var a=B[i],c=B[j];if(a.w>0||c.w>0)continue;
  var dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy),m=a.r+c.r;
  if(d<m&&d>.01){var nx=dx/d,ny=dy/d,o=(m-d)/2,ma=a.r*a.r,mb=c.r*c.r,t=ma+mb;
   if(a!==grab){a.x-=nx*o*(mb/t)*2;a.y-=ny*o*(mb/t)*2}if(c!==grab){c.x+=nx*o*(ma/t)*2;c.y+=ny*o*(ma/t)*2}
   var rv=(c.vx-a.vx)*nx+(c.vy-a.vy)*ny;
   if(rv<0){var jn=-(1+E)*rv/(1/ma+1/mb);a.vx-=jn*nx/ma;a.vy-=jn*ny/ma;c.vx+=jn*nx/mb;c.vy+=jn*ny/mb;a.va-=rv*.01;c.va+=rv*.01}}
 }
}
function draw(){
 cx.clearRect(0,0,W,H);
 for(var i=0;i<B.length;i++){var b=B[i];if(b.w>0)continue;
  cx.save();cx.translate(b.x,b.y);
  cx.shadowColor=b.c;cx.shadowBlur=b===grab?34:16;cx.fillStyle='#0a100c';cx.strokeStyle=b.c;cx.lineWidth=b===grab?2.5:1.6;
  cx.beginPath();cx.arc(0,0,b.r,0,7);cx.fill();cx.stroke();
  cx.shadowBlur=0;cx.rotate(b.a);cx.fillStyle=b.c;cx.font='700 '+Math.round(b.r*(b.l.length>2?.5:.72))+'px "JetBrains Mono",monospace';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(b.l,0,1);
  cx.restore()}
}
function loop(){if(!run)return;if(vis&&!document.hidden){step();draw()}requestAnimationFrame(loop)}
function go(){if(run)return;run=true;requestAnimationFrame(loop)}
size();seed();
new IntersectionObserver(function(e){vis=e[0].isIntersecting;if(vis)go()}).observe(hero);
addEventListener('resize',function(){size();B.forEach(function(b){b.x=Math.min(b.x,W-b.r);b.y=Math.min(b.y,H-b.r)})});
function loc(e){var r=hero.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
hero.addEventListener('pointermove',function(e){var p=loc(e);pvx=p[0]-px;pvy=p[1]-py;px=p[0];py=p[1];hero.style.setProperty('--hx',px+'px');hero.style.setProperty('--hy',py+'px')});
hero.addEventListener('pointerleave',function(){px=py=-999;if(grab)rel()});
function ui(t){return t.closest&&t.closest('a,button,input,textarea,select,.x-con,.x-rank,.x-btn,.gv-hint,.profile-banner')}
hero.addEventListener('pointerdown',function(e){
 if(e.pointerType==='touch'||ui(e.target))return;var p=loc(e),best=null,bd=1e9;
 B.forEach(function(b){if(b.w>0)return;var d=Math.hypot(b.x-p[0],b.y-p[1]);if(d<b.r+8&&d<bd){bd=d;best=b}});
 if(best){grab=best;px=p[0];py=p[1];hero.classList.add('gv-drag');e.preventDefault()}
});
function rel(){if(!grab)return;grab.vx=Math.max(-40,Math.min(40,pvx*1.4));grab.vy=Math.max(-40,Math.min(40,pvy*1.4));grab.va=grab.vx*.02;grab=null;hero.classList.remove('gv-drag')}
addEventListener('pointerup',rel);addEventListener('pointercancel',rel);
hero.addEventListener('dblclick',function(e){if(ui(e.target)||B.length>44)return;var p=loc(e);add(p[0],p[1],B.length,0);B[B.length-1].vy=-6;B[B.length-1].in=true});
/* hint + zero-g */
var hint=document.createElement('div');hint.className='gv-hint';
hint.innerHTML=(touch?'':'<span>Drag &amp; throw \u00B7 double-click adds more</span>')+'<button type="button">Zero-G</button><button type="button" class="rs">Reset</button>';
hero.appendChild(hint);var zb=hint.children[touch?0:1];
zb.onclick=function(){gon=!gon;zb.classList.toggle('on',!gon);zb.textContent=gon?'Zero-G':'Gravity';if(!gon)B.forEach(function(b){b.vx+=(Math.random()-.5)*8;b.vy+=(Math.random()-.5)*8-2})};
hint.lastChild.onclick=function(){gon=true;zb.classList.remove('on');zb.textContent='Zero-G';seed()};
/* 4. Scroll inertia: content blocks lean with scroll velocity */
var T=[].slice.call(document.querySelectorAll('.x-bento,.bt-grid,.x-steps,.x-faq')),vel=0,cur=0,last=scrollY,raf=0;
function il(){var tg=Math.max(-2.2,Math.min(2.2,vel*.05));cur+=(tg-cur)*.14;vel*=.82;
 T.forEach(function(t){t.style.transform=Math.abs(cur)<.01?'':'skewY('+cur.toFixed(3)+'deg)'});
 if(Math.abs(cur)>.01||Math.abs(vel)>.1)raf=requestAnimationFrame(il);else raf=0}
addEventListener('scroll',function(){vel=scrollY-last;last=scrollY;if(!raf)raf=requestAnimationFrame(il)},{passive:true});
})();
