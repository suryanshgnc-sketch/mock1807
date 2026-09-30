/* MDCCCVII home hero v2: visual only */
(function(){'use strict';
var h=document.querySelector('.hx');if(!h)return;
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches,$=function(s){return h.querySelector(s)},$$=function(s){return[].slice.call(h.querySelectorAll(s))};
/* count-up */
$$('.hx-stats b[data-n]').forEach(function(b){var n=+b.dataset.n,s=performance.now()+900;(function f(t){var p=Math.max(0,Math.min((t-s)/1600,1));b.textContent=Math.round(n*(1-Math.pow(1-p,4)));if(p<1)requestAnimationFrame(f)})(s)});
/* mouse parallax */
var st=$('.hx-stage');
if(st&&!RM&&!matchMedia('(hover:none)').matches)h.addEventListener('mousemove',function(e){var r=h.getBoundingClientRect();st.style.setProperty('--px',((e.clientX-r.left)/r.width-.5).toFixed(3));st.style.setProperty('--py',((e.clientY-r.top)/r.height-.5).toFixed(3))});
/* palette fill + option select */
var cells=$$('.hx-pal u'),opts=$$('.c1 .opts i'),k=0,live=true;
new IntersectionObserver(function(e){live=e[0].isIntersecting}).observe(h);
var pal_el=$('.hx-pal'),seq=[1,2,0,3,1,0,2,3];
function pal(){if(!live)return;
 if(k>=cells.length){pal_el.classList.add('fade');setTimeout(function(){cells.forEach(function(u){u.className=''});pal_el.classList.remove('fade');k=0},650);k=cells.length+1;return}
 if(k>cells.length)return;
 cells[k].className=(k%5===4)?'m':'a';opts.forEach(function(o){o.classList.remove('on')});opts[seq[k%seq.length]].classList.add('on');k++}
/* timer */
var tm=$('.c1 .tm'),sec=10781;function clk(){if(!live)return;sec--;tm.textContent=[sec/3600|0,sec/60%60|0,sec%60].map(function(v){return String(v).padStart(2,'0')}).join(':')}
/* rank reshuffle */
var shN=0,rk=$('.hx-rk'),nm=['Aarav K.','Diya M.','Kabir S.','You'],sc=[236,231,226,219];
rk.innerHTML=nm.map(function(n){return'<li class="'+(n==='You'?'me':'')+'"><b></b><span>'+n+'</span><em></em></li>'}).join('');
function lay(){[0,1,2,3].sort(function(a,b){return sc[b]-sc[a]}).forEach(function(i,p){var l=rk.children[i];l.style.transform='translateY('+p*31+'px)';l.firstChild.textContent='#'+(p+1);l.lastChild.textContent=sc[i]})}
function shuf(){if(!live)return;sc[3]+=4;sc[(shN++)%3]+=2;if(sc[3]>262){sc=[236,231,226,219]}lay()}
lay();
if(!RM){setInterval(pal,1300);setInterval(clk,1000);setInterval(shuf,4200)}else{cells.slice(0,14).forEach(function(u){u.className='a'})}
/* particles */
var cv=$('#hxCv');if(!cv||RM)return;var x=cv.getContext('2d'),W,H,P=[];
function rs(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;P=Array.from({length:Math.min(70,W/18|0)},function(){return{x:Math.random()*W,y:Math.random()*H,v:.15+Math.random()*.5,r:.6+Math.random()*1.6}})}
rs();addEventListener('resize',rs);
(function f(){if(live){x.clearRect(0,0,W,H);P.forEach(function(p,i){p.y-=p.v;if(p.y<0){p.y=H;p.x=Math.random()*W}x.fillStyle='rgba(134,255,63,'+(.25+p.r/4)+')';x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill();for(var j=i+1;j<P.length;j++){var q=P[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<90){x.strokeStyle='rgba(134,255,63,'+(.12*(1-d/90))+')';x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke()}}})}requestAnimationFrame(f)})();
})();
