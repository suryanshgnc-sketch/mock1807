/* CBT enhancements: shortcuts, timer alerts, progress bar, offline notice. Additive only. */
(function(){
'use strict';
var app=document.getElementById('app');if(!app)return;
var $=function(s){return document.querySelector(s)};
var toastEl=document.createElement('div');toastEl.className='cbt-toast';document.body.appendChild(toastEl);var tt;
function toast(m,c){toastEl.textContent=m;toastEl.className='cbt-toast '+(c||'')+' show';clearTimeout(tt);tt=setTimeout(function(){toastEl.classList.remove('show')},3800)}
var prog=document.createElement('div');prog.className='cbt-prog';prog.innerHTML='<i></i>';document.body.appendChild(prog);
var keys=document.createElement('div');keys.className='cbt-keys';
keys.innerHTML='<div><kbd>A</kbd>-<kbd>D</kbd> or <kbd>1</kbd>-<kbd>4</kbd> choose<br><kbd>S</kbd> save &amp; next<br><kbd>M</kbd> save &amp; mark<br><kbd>R</kbd> mark &amp; next<br><kbd>X</kbd> clear response<br><kbd>&larr;</kbd> <kbd>&rarr;</kbd> previous / next</div><button type="button">&#9000; Shortcuts</button>';
document.body.appendChild(keys);$('.cbt-keys button').onclick=function(){keys.classList.toggle('open')};
function live(){return !app.hidden}
document.addEventListener('keydown',function(e){
 if(!live()||e.ctrlKey||e.metaKey||e.altKey)return;
 var t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
 var dlg=$('#dlg');if(dlg&&!dlg.hidden)return;
 var k=e.key.toLowerCase(),mcq=!!$('.mcq-btn'),ok=true;
 try{
  if(mcq&&k.length===1&&'abcd'.indexOf(k)>-1)setAns(String('abcd'.indexOf(k)+1));
  else if(mcq&&k>='1'&&k<='4')setAns(k);
  else if(k==='arrowright')nav(1);else if(k==='arrowleft')nav(-1);
  else if(k==='s')act('sn');else if(k==='m')act('sm');else if(k==='r')act('mn');else if(k==='x')act('cl');
  else ok=false;
 }catch(_){ok=false}
 if(ok)e.preventDefault();
});
/* timer alerts */
var fired={};
function secs(t){var p=(t||'').trim().split(':').map(Number);if(p.some(isNaN))return null;return p.reduce(function(a,v){return a*60+v},0)}
function watch(){
 var tm=$('#timer');if(!tm)return setTimeout(watch,800);
 new MutationObserver(function(){
  var s=secs(tm.textContent);if(s==null)return;
  document.body.classList.toggle('cbt-crit',live()&&s>0&&s<=60);
  [[600,'10 minutes left','warn'],[300,'5 minutes left. Review your marked questions.','warn'],[60,'Last minute! Your answers are auto-submitted at zero.','bad']].forEach(function(r){
   if(s>r[0])fired[r[0]]=0;else if(!fired[r[0]]&&s>r[0]-20){fired[r[0]]=1;toast(r[1],r[2])}
  });
 }).observe(tm,{childList:true,characterData:true,subtree:true});
}
watch();
/* progress bar */
function pg(){var p=$('#progressText');if(!p)return setTimeout(pg,800);
 var f=function(){var m=(p.textContent||'').match(/(\d+)\s*\/\s*(\d+)/);if(m)prog.firstChild.style.setProperty('--p',(+m[1])/(+m[2]||1))};
 new MutationObserver(f).observe(p,{childList:true,characterData:true,subtree:true});f()}
pg();
addEventListener('offline',function(){if(live())toast('You are offline. Answers are kept on this device and sync when you reconnect.','warn')});
addEventListener('online',function(){if(live())toast('Back online. Syncing your answers.')});
})();
