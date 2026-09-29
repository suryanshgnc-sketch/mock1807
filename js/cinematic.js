/* MDCCCVII cinematic layer: visual only, never touches exam/backend logic */
(function(){
'use strict';
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches,$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h)e.innerHTML=h;return e}
/* Intro reel (once per session) */
function intro(){
 if(RM||sessionStorage.getItem('cineSeen'))return;
 sessionStorage.setItem('cineSeen','1');
 var w=el('div','','');w.id='cineIntro';
 var t=el('div','ci-t');'MDCCCVII'.split('').forEach(function(c,i){var s=el('span','',c);s.style.setProperty('--i',i);t.appendChild(s)});
 w.appendChild(el('div','ci-flare'));w.appendChild(t);
 w.appendChild(el('div','ci-s','SIT THE EXAM  /  EARN THE RANK'));
 var b=el('div','ci-bar','<i></i>');w.appendChild(b);
 document.body.appendChild(w);document.body.style.overflow='hidden';
 setTimeout(function(){w.classList.add('out');document.body.style.overflow=''},2300);
 setTimeout(function(){w.remove()},3500);
}
/* Scroll progress, nav hide/solid, back to top, section spy */
function scroll(){
 var bar=el('div');bar.id='cineProg';document.body.appendChild(bar);
 var top=el('button','','&#8593;');top.id='cineTop';top.setAttribute('aria-label','Back to top');top.onclick=function(){scrollTo({top:0,behavior:'smooth'})};document.body.appendChild(top);
 var nav=$('#xNav'),last=0,tick=false,links=$$('.x-links a'),secs=links.map(function(a){return $(a.getAttribute('href'))});
 function f(){
  var y=scrollY,h=document.documentElement.scrollHeight-innerHeight;
  bar.style.transform='scaleX('+(h>0?y/h:0)+')';
  top.classList.toggle('show',y>700);
  if(nav){nav.classList.toggle('solid',y>40);nav.classList.toggle('hide',y>last&&y>300);}
  last=y;
  secs.forEach(function(s,i){if(!s)return;var r=s.getBoundingClientRect();links[i].classList.toggle('act',r.top<innerHeight*.4&&r.bottom>innerHeight*.4)});
  var m=$('.x-mark');if(m&&!RM)m.style.transform='translate3d(0,'+(y*.25)+'px,0) scale('+(1+y/4000)+')';
  tick=false;
 }
 addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(f)}},{passive:true});f();
}
/* Staggered cinematic reveals */
function reveal(){
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
 function scan(){
  $$('.x-head,.x-steps li,.bn,.bt-card,.x-faq details,.x-band,.f-grid>div,.stats>*,.home-command-deck,.deck-stats>div').forEach(function(n){
   if(n.dataset.ci)return;n.dataset.ci=1;n.classList.add('cine-in');
   var sib=n.parentElement?[].indexOf.call(n.parentElement.children,n):0;n.style.setProperty('--d',Math.min(sib,8)*.08+'s');io.observe(n);
  });
  tilt();
 }
 scan();
 new MutationObserver(function(){clearTimeout(scan.t);scan.t=setTimeout(scan,120)}).observe($('#land')||document.body,{childList:true,subtree:true});
}
/* 3D tilt + spotlight */
function tilt(){
 if(RM||matchMedia('(hover:none)').matches)return;
 $$('.bt-card,.bn,.x-steps li,.x-stage .x-con,.deck-stats>div,.stats>*').forEach(function(c){
  if(c.dataset.tl)return;c.dataset.tl=1;c.classList.add('cine-tilt');
  c.addEventListener('mousemove',function(e){
   var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
   c.classList.add('hot');c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');
   c.style.transform='perspective(900px) rotateY('+((x-.5)*12)+'deg) rotateX('+((.5-y)*12)+'deg) translateZ(8px)';
  });
  c.addEventListener('mouseleave',function(){c.classList.remove('hot');c.style.transform=''});
 });
}
/* Magnetic buttons + ripple */
function buttons(){
 document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('.x-btn,.bt-btn');if(!b||b.disabled)return;
  var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),p=el('span','cine-ripple');
  p.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px';
  b.appendChild(p);setTimeout(function(){p.remove()},650);
 });
 if(RM||matchMedia('(hover:none)').matches)return;
 document.addEventListener('mousemove',function(e){
  $$('.x-btn.solid').forEach(function(b){
   var r=b.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy);
   b.style.transform=d<90?'translate('+dx*.25+'px,'+dy*.35+'px)':'';
  });
 },{passive:true});
}
/* Ambient: aurora, grain, live ticker */
function ambient(){
 var a=el('div','cine-aurora','<i></i><i></i><i></i>');document.body.appendChild(a);
 if(!RM){var g=el('div');g.id='cineGrain';document.body.appendChild(g)}
 var msgs=['Tests are scored on secure servers','Server-side timer. No clock tricks','Live ranking updates as results are declared','Your progress is autosaved during every test','Answer keys never reach your browser'];
 var t=el('div','cine-ticker','<i></i><span></span>');document.body.appendChild(t);var i=0,sp=$('span',t);
 function show(){if(document.hidden)return;sp.textContent=msgs[i++%msgs.length];t.classList.add('show');setTimeout(function(){t.classList.remove('show')},4200)}
 setTimeout(show,6000);setInterval(show,16000);
 var app=$('#app');
 function sync(){document.body.classList.toggle('in-exam',!!app&&!app.hidden)}
 if(app){new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['hidden']});sync()}
}
/* Hero: text scramble on tag + count-up + live mock rank shuffle */
function hero(){
 $$('.x-proof b[data-n]').forEach(function(b){
  var n=+b.dataset.n,io=new IntersectionObserver(function(es){if(!es[0].isIntersecting)return;io.disconnect();
   var s=performance.now();(function f(t){var p=Math.min((t-s)/1600,1);b.textContent=Math.round(n*(1-Math.pow(1-p,4)));if(p<1)requestAnimationFrame(f)})(s)});io.observe(b);
 });
 var tg=$('.x-tag');if(tg&&!RM){
  var txt=tg.lastChild&&tg.lastChild.nodeType===3?tg.lastChild:null;
  if(txt){var orig=txt.nodeValue,ch='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/',f=0;
   var iv=setInterval(function(){f++;txt.nodeValue=orig.split('').map(function(c,i){return c===' '||i<f/1.2?c:ch[Math.random()*ch.length|0]}).join('');if(f>orig.length*1.2){txt.nodeValue=orig;clearInterval(iv)}},35)}
 }
 var m=$('.x-marq>div');if(m&&!RM){var v=0,ly=scrollY;addEventListener('scroll',function(){v=Math.min(Math.abs(scrollY-ly),60);ly=scrollY;m.style.animationDuration=Math.max(6,30-v)+'s'},{passive:true})}
}
function init(){intro();scroll();reveal();buttons();ambient();hero()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
