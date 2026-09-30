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

/* v2: scroll-scrubbed trailer + confetti on results */
function trailer(){
 var host=$('.x-marq');if(!host||$('.cine-trailer'))return;
 var L=[['SIT THE EXAM','<em>180</em> minutes.'],['ONE CLOCK','<em>75</em> questions.'],['LIVE RANKING','<em>300</em> marks.'],['EARN THE RANK','One <em>score</em>.']];
 var sec=el('section','cine-trailer');sec.setAttribute('aria-label','Trailer');
 var in_=el('div','ct-in'),ws=L.map(function(l){var w=el('div','ct-w','<small>'+l[0]+'</small>'+l[1]);in_.appendChild(w);return w});
 in_.appendChild(el('div','ct-bar','<i></i>'));sec.appendChild(in_);host.parentNode.insertBefore(sec,host.nextSibling);
 var tick=false,cur=-1;
 function f(){tick=false;var r=sec.getBoundingClientRect(),p=Math.max(0,Math.min(1,-r.top/(r.height-innerHeight)));
  sec.style.setProperty('--p',p);in_.style.setProperty('--h',170+p*140);$('.ct-bar',sec).style.setProperty('--p',p);
  var i=Math.min(ws.length-1,Math.floor(p*ws.length));if(i===cur)return;cur=i;
  ws.forEach(function(w,k){w.classList.toggle('on',k===i);w.classList.toggle('past',k<i)})}
 addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(f)}},{passive:true});f();
}
function confetti(){
 if(RM)return;var res=$('#res');if(!res)return;
 function burst(){
  var c=el('canvas','cine-confetti');c.width=innerWidth;c.height=innerHeight;document.body.appendChild(c);
  var x=c.getContext('2d'),cols=['#5eead4','#a78bfa','#f472b6','#fbbf24','#fff'],P=[];
  for(var i=0;i<150;i++)P.push({x:innerWidth/2,y:innerHeight*.35,vx:(Math.random()-.5)*16,vy:-Math.random()*15-3,s:Math.random()*7+4,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[i%5]});
  var t0=performance.now();(function f(t){x.clearRect(0,0,c.width,c.height);var a=1-(t-t0)/3200;
   P.forEach(function(p){p.vy+=.35;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.globalAlpha=Math.max(a,0);x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()});
   if(a>0)requestAnimationFrame(f);else c.remove()})(t0);
 }
 var was=res.hidden;new MutationObserver(function(){if(was&&!res.hidden&&res.textContent.trim())burst();was=res.hidden}).observe(res,{attributes:true,attributeFilter:['hidden']});
}

/* v3: live hero console director (scripted demo: cursor, typing, palette, live ranking) */
function heroConsole(){
 var con=$('.x-con');if(!con)return;
 var cells=$$('.c-pal u',con),opts=$$('.c-o',con),qn=$('#xQn'),ans=$('#xAns'),qp=$('.c-q p',con),save=$('.c-foot em',con),rk=$('#xRank');
 if(!cells.length||!rk)return;
 var B=[['A particle moves on the x-axis with v = 3t\u00B2 \u2212 6t. Its displacement in the first 3 s is:',['0 m','3 m','6 m','9 m'],0],
  ['The number of sigma bonds in ethene (C\u2082H\u2084) is:',['3','4','5','6'],2],
  ['The value of \u222B\u2080\u00B9 2x dx is:',['0','1','2','4'],1],
  ['The SI unit of magnetic flux is:',['Tesla','Weber','Henry','Gauss'],1],
  ['The pH of a 0.01 M HCl solution is:',['1','2','3','12'],1]];
 var names=['Aarav K.','Diya M.','Kabir S.','You'],sc,order=[0,1,2,3];
 rk.innerHTML=names.map(function(n){return '<li class="'+(n==='You'?'me':'')+'"><b></b><span>'+n+'</span><em></em></li>'}).join('');
 function reset(){sc=[236,228,221,214]}
 function lay(flash){order=[0,1,2,3].sort(function(a,b){return sc[b]-sc[a]});order.forEach(function(pi,pos){var li=rk.children[pi];li.style.transform='translateY('+pos*30+'px)';li.firstChild.textContent='#'+(pos+1);li.lastChild.textContent=sc[pi]});
  if(flash){var me=rk.children[3];me.classList.remove('flash');void me.offsetWidth;me.classList.add('flash')}}
 reset();lay();
 var cur=el('div','cine-cur','<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#000" stroke-width="1.2"/></svg>');con.appendChild(cur);
 function to(t){var a=con.getBoundingClientRect(),r=t.getBoundingClientRect();cur.style.transform='translate('+(r.left-a.left+r.width*.6)+'px,'+(r.top-a.top+r.height*.55)+'px)'}
 function rip(t){var r=t.getBoundingClientRect(),p=el('span','cine-ripple');p.style.cssText='width:60px;height:60px;left:'+(r.width*.5-30)+'px;top:'+(r.height*.5-30)+'px';t.appendChild(p);setTimeout(function(){p.remove()},650)}
 function sl(ms){return new Promise(function(r){setTimeout(r,ms)})}
 var vis=true;new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(con);
 function type(t){return new Promise(function(res){var i=0;qp.textContent='';(function f(){qp.textContent=t.slice(0,i+=3);if(i<t.length)setTimeout(f,14);else{qp.textContent=t;res()}})()})}
 function floatGain(txt,cls){var g=el('span','gain '+cls,txt);rk.children[3].appendChild(g);setTimeout(function(){g.remove()},1200)}
 function paint(){cells.forEach(function(u,k){u.className=(st[k]||'')})}
 var st=[],n=0;
 async function run(){
  for(;;){
   if(!vis||document.hidden){await sl(600);continue}
   var i=n%30;if(i===0){for(var k=cells.length-1;k>=0;k--){st[k]='';}paint();reset();lay();if(ans)ans.textContent=0}
   var q=B[n%B.length];
   cells.forEach(function(u){u.classList.remove('c')});cells[i].classList.add('c');
   if(qn)qn.textContent=i+1;opts.forEach(function(o,k){o.classList.remove('on');o.lastChild.innerHTML='&#8202;'+'ABCD'[k]+' &nbsp;'+q[1][k]});
   await type(q[0]);await sl(500);
   var pick=Math.random()<.72?q[2]:(q[2]+1+(Math.random()*3|0))%4,marked=Math.random()<.2;
   to(opts[pick]);await sl(750);rip(opts[pick]);opts.forEach(function(o){o.classList.remove('on')});opts[pick].classList.add('on');await sl(450);
   to(save);await sl(700);save.classList.add('press');rip(save);await sl(160);save.classList.remove('press');
   st[i]=marked?'m':'a';paint();cells[i].classList.add('c');
   var done=st.filter(Boolean).length;if(ans)ans.textContent=done;
   var right=pick===q[2],d=right?4:-1;sc[3]+=d;[0,1,2].forEach(function(k){sc[k]+=Math.random()<.5?4:0});
   floatGain((d>0?'+':'')+d,right?'up':'dn');lay(right);
   n++;await sl(700);
  }
 }
 if(RM){cells.slice(0,12).forEach(function(u,k){u.className=k===7?'m':'a'});return}
 run();
}
function init(){intro();scroll();reveal();buttons();ambient();hero();trailer();confetti();heroConsole()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
