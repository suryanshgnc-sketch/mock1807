/* Result Centre: neon results page. Checking unlocks only when the admin has published the answer key. */
(function(){
'use strict';
var RC={sid:null,st:'loading',view:'home',filter:'all',sec:0};
var COL=['#5eead4','#a78bfa','#fbbf24'];
var q=function(s){return document.querySelector(s)};
var L=function(i){return 'ABCD'[+i-1]};
function disp(i,v){v=String(v==null?'':v).trim();if(v==='')return '\u2014';return isNum(i)?v:(L(v)||v)}
function fmtT(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s'}
/* ---- neutralise every manual-check entry point ---- */
['manualSet','manualAll','showKeyPdf','keyPdf','pasteKey','clearKey'].forEach(function(n){window[n]=function(){}});
/* ---- illustrations ---- */
var DEFS='<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c6ffa3"/><stop offset="1" stop-color="#86ff3f"/></linearGradient></defs>';
var ILL={
 lock:'<svg viewBox="0 0 220 200" class="rc-ill">'+DEFS+'<circle class="rc-ring r1" cx="110" cy="100" r="88" fill="none" stroke="#86ff3f44" stroke-dasharray="3 11"/><circle class="rc-ring r2" cx="110" cy="100" r="68" fill="none" stroke="#a78bfa55" stroke-dasharray="18 9"/><path class="rc-shackle" d="M78 94V76a32 32 0 0 1 64 0v18" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round"/><rect x="64" y="92" width="92" height="68" rx="15" fill="#0c130e" stroke="url(#rg)" stroke-width="3"/><circle cx="110" cy="123" r="8" fill="#86ff3f"/><rect x="107" y="127" width="6" height="17" rx="3" fill="#86ff3f"/></svg>',
 shield:'<svg viewBox="0 0 220 200" class="rc-ill">'+DEFS+'<circle class="rc-ring r1" cx="110" cy="100" r="88" fill="none" stroke="#86ff3f44" stroke-dasharray="3 11"/><circle class="rc-ring r2" cx="110" cy="100" r="68" fill="none" stroke="#5eead455" stroke-dasharray="18 9"/><path d="M110 34l48 18v40c0 32-20 54-48 68-28-14-48-36-48-68V52z" fill="#0c130e" stroke="url(#rg)" stroke-width="3.5"/><path class="rc-tick" d="M88 100l16 16 30-34" fill="none" stroke="#86ff3f" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 key:'<svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="#86ff3f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="22" cy="32" r="12"/><path d="M34 32h24M50 32v9M42 32v7"/><circle cx="22" cy="32" r="4" fill="#86ff3f"/></svg>',
 bolt:'<svg viewBox="0 0 64 64" width="54" height="54" fill="none" stroke="#86ff3f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M36 6L14 36h16l-4 22 24-32H34z" fill="#86ff3f22"/></svg>'
};
function bg(){var dust='';for(var i=0;i<22;i++)dust+='<b style="--x:'+((i*37)%100)+'%;--y:'+((i*61)%100)+'%;--s:'+((i%4)+2)+'px;--d:-'+(i*0.73)+'s"></b>';return '<div class="rc-bg"><i></i><i></i><i></i><span></span><div class="rc-dust">'+dust+'</div><div class="rc-vignette"></div></div>'}
function top(sub){return '<header class="rc-top"><button class="rc-back" onclick="goHome()">\u2190 Home</button><div class="rc-id"><small>RESULT CENTRE</small><h1>'+esc(S.name||'Student')+'</h1></div><div class="rc-meta"><b>'+esc(S.type||'Test')+'</b><span>'+esc(S.date||'')+'</span></div>'+(sub||'')+'</header>'}
/* ---- key fetch ---- */
async function fetchKey(){
 if(S.keyFromServer&&S.key&&S.key.length===N()){RC.st='ready';return}
 var c=window.mock1807Auth&&window.mock1807Auth.client;
 if(!c||!S.backendTestId){RC.st='locked';RC.why='practice';return}
 try{
  var r=await c.rpc('get_answer_key',{p_test_id:S.backendTestId});
  if(r.error)throw r.error;
  if(Array.isArray(r.data)&&r.data.length===N()){S.key=r.data.map(function(x){return String(x).trim()});S.keyFromServer=true;RC.st='ready'}
  else{RC.st='locked';RC.why='pending'}
 }catch(e){RC.st='locked';RC.why='pending';RC.err=e&&e.message}
}

/* ---- response sheet (works right after submit, no key needed) + admin solutions PDF ---- */
function subName(i){return String(SUB[sub(i)]||'')}
window.downloadResponses=function(){
 var rows='',att=0;
 for(var i=0;i<S.q.length;i++){var a=S.q[i].a,has=String(a==null?'':a).trim()!=='';if(has)att++;
  rows+='<tr><td>'+(i%cfg.per+1)+'</td><td>'+esc(subName(i))+'</td><td>'+(isNum(i)?'Numerical':'MCQ')+'</td><td><b>'+esc(disp(i,a))+'</b></td><td>'+(has?'Attempted':'Not attempted')+'</td><td>'+fmtT(S.q[i].t||0)+'</td></tr>'}
 var html='<!doctype html><html><head><meta charset="utf-8"><title>Response Sheet - '+esc(S.name||'')+'</title><style>@page{margin:14mm}body{font:12px Arial,sans-serif;color:#111;margin:0}h1{margin:0 0 4px;font-size:20px}.m{display:flex;gap:26px;flex-wrap:wrap;margin:10px 0 16px;padding:10px 0;border-block:2px solid #111}.m div span{display:block;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:.06em}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:5px 7px;text-align:left}th{background:#eee}tr:nth-child(even) td{background:#fafafa}.f{margin-top:12px;color:#666;font-size:10px}</style></head><body><h1>Response Sheet</h1><div class="m"><div><span>Candidate</span>'+esc(S.name||'')+'</div><div><span>Test</span>'+esc(S.type||'')+'</div><div><span>Date</span>'+esc(S.date||'')+'</div><div><span>Attempted</span>'+att+' / '+S.q.length+'</div></div><table><tr><th>Q</th><th>Subject</th><th>Type</th><th>Your answer</th><th>Status</th><th>Time</th></tr>'+rows+'</table><p class="f">MDCCCVII Tests. Independent practice platform, not affiliated with NTA.</p></body></html>';
 var w=window.open('','_blank');
 if(w){w.document.write(html);w.document.close();w.focus();setTimeout(function(){w.print()},400)}
 else{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download='Response-Sheet-'+(S.type||'test')+'.html';document.body.appendChild(a);a.click();a.remove()}
};
window.RCsolutions=async function(){
 var c=window.mock1807Auth&&window.mock1807Auth.client;if(!c||!S.backendTestId)return alert('Solutions are available for scheduled tests only.');
 var w=window.open('','_blank');
 try{var r=await c.storage.from('test-pdfs').createSignedUrl('tests/'+S.backendTestId+'/answer-key.pdf',3600);
  if(r.error||!r.data)throw r.error||new Error('missing');if(w)w.location=r.data.signedUrl;else location.href=r.data.signedUrl}
 catch(e){if(w)w.close();alert('The key / solutions PDF is not available for this test yet.')}
};
function paperBtn(){return S.backendTestId?'<button class="rc-btn" onclick="downloadQuestionPaper()">Download question paper</button>':''}
function pdfBtns(){return paperBtn()+'<button class="rc-btn" onclick="downloadResponses()">Download response sheet</button>'+(S.backendTestId?'<button class="rc-btn" onclick="RCsolutions()">Key &amp; solutions (PDF)</button>':'')}
/* ---- views ---- */
function vLoading(){return '<div class="rc-center">'+ILL.lock+'<h2>Checking the vault\u2026</h2><div class="rc-scan"><i></i></div></div>'}
function vLocked(){
 var p=RC.why==='practice';
 return '<div class="rc-center">'+ILL.lock+'<span class="rc-tag lock">LOCKED</span><h2>'+(p?'Checking is for official tests':'Answer key not released yet')+'</h2><p>'+(p?'Practice sessions have no official key. Take an official mock test to unlock automatic checking.':'Your responses are saved. Checking and the answer key unlock automatically the moment the admin publishes the official key. This page checks by itself, no need to refresh.')+'</p><div class="rc-actions">'+pdfBtns()+'</div><div class="rc-actions" style="margin-top:12px">'+(p?'':'<button class="rc-btn solid" onclick="RCrefresh()">Check again</button>')+'<button class="rc-btn" onclick="goHome()">Back to home</button></div>'+(RC.err&&!p?'<small class="rc-err">'+esc(RC.err)+'</small>':'')+'</div>'
}
function vHome(){
 return '<div class="rc-center">'+ILL.shield+'<span class="rc-tag ok"><i></i>ANSWER KEY PUBLISHED</span><h2>Your paper is ready to check</h2><p>The official key is loaded from the server. Choose how you want to continue.</p></div>'+
 '<div class="rc-cards"><button class="rc-card" onclick="RCview(\'key\')"><div class="rc-cicon">'+ILL.key+'</div><b>View Answer Key</b><small>Browse the official key section by section, with your response beside it.</small><em>Open key \u2192</em></button>'+
 '<button class="rc-card hot" onclick="RCcheck()"><div class="rc-cicon">'+ILL.bolt+'</div><b>Check Automatically</b><small>Instant score, subject analysis and a question-by-question report.</small><em>Evaluate now \u2192</em></button></div>'
}
function tabs(){return '<div class="rc-tabs">'+SUB.map(function(n,k){return '<button class="'+(RC.sec===k?'on':'')+'" style="--a:'+COL[k%3]+'" onclick="RCsec('+k+')">'+esc(n)+'</button>'}).join('')+'</div>'}
function vKey(){
 var per=cfg.per,a=RC.sec*per,h='';
 for(var i=a;i<a+per;i++){var yr=S.q[i].a;h+='<div class="rc-chip'+(isNum(i)?' num':'')+'" style="--d:'+((i-a)*22)+'ms"><span>Q'+(i-a+1)+'</span><b>'+esc(disp(i,S.key[i]))+'</b><small>'+(yr===''?'not attempted':'you: '+esc(disp(i,yr)))+'</small></div>'}
 return '<div class="rc-sec-head"><button class="rc-back" onclick="RCview(\'home\')">\u2190 Back</button><h2>Official Answer Key</h2><span class="rc-actions">'+paperBtn()+(S.backendTestId?'<button class="rc-btn" onclick="RCsolutions()">Solutions (PDF)</button>':'')+'<button class="rc-btn solid" onclick="RCcheck()">Check Automatically</button></span></div>'+tabs()+'<div class="rc-keygrid">'+h+'</div><p class="rc-note">Numerical answers are highlighted. Key shown exactly as published by the admin.</p>'
}
function pct(n,d){return d?Math.max(0,Math.min(100,Math.round(n/d*100))):0}
function resultSignals(sm){
 var E=sm.E, attempted=0,totalTime=0,fast=Infinity,slow=-1,fastI=-1,slowI=-1;
 E.forEach(function(e,i){var tt=Number(S.q[i].t||0);totalTime+=tt;if(e.r!=='Unattempted')attempted++;if(tt>0&&tt<fast){fast=tt;fastI=i}if(tt>slow){slow=tt;slowI=i}});
 var acc=sm.acc,coverage=pct(attempted,N()),pace=attempted?Math.round(totalTime/attempted):0;
 var consistency=0,valid=E.filter(function(e,i){return e.r!=='Unattempted'&&Number(S.q[i].t||0)>0}).map(function(e,i){return Number(S.q[i].t||0)});
 if(valid.length){var mean=valid.reduce(function(a,b){return a+b},0)/valid.length;var variance=valid.reduce(function(a,b){return a+Math.pow(b-mean,2)},0)/valid.length;consistency=Math.max(0,Math.round(100-Math.sqrt(variance)/Math.max(mean,1)*100))}
 return {attempted:attempted,coverage:coverage,pace:pace,consistency:consistency,fast:fast===Infinity?0:fast,slow:Math.max(0,slow),fastI:fastI,slowI:slowI,totalTime:totalTime,acc:acc};
}
function resultQuickRead(sm,sig){
 var out=[];
 if(sm.acc>=80)out.push('Accuracy is strong: most attempted questions converted into marks.');
 else if(sm.acc>=60)out.push('Accuracy is mixed: the next gain is likely from reducing avoidable errors.');
 else if(sig.attempted)out.push('Accuracy is the main signal: review incorrect attempts before increasing attempt volume.');
 if(sig.coverage<60)out.push('Coverage is low; there is room to improve the number of questions you confidently attempt.');
 else if(sig.coverage>=90)out.push('Coverage is high; focus on selection quality and time control.');
 var worst=sm.subs.slice().sort(function(a,b){return a.acc-b.acc})[0];
 if(worst&&worst.c+worst.w)out.push(worst.n+' is currently the weakest accuracy area at '+worst.acc+'%.');
 if(sig.slow>180)out.push('A long time sink is visible: Q'+(sig.slowI+1)+' took '+fmtT(sig.slow)+'.');
 if(sig.pace)out.push('Average time on attempted questions: '+fmtT(sig.pace)+'.');
 return out.slice(0,4);
}
function timeBars(sm){
 var max=0;for(var i=0;i<N();i++)max=Math.max(max,Number(S.q[i].t||0));
 if(!max)return '<div class="rc-empty">Question timing was not captured for this attempt.</div>';
 var h='';for(var j=0;j<N();j++){var t=Number(S.q[j].t||0),r=sm.E[j].r,cl=r==='Correct'?'ok':r==='Incorrect'?'bad':'na';
  h+='<button class="rc-time-row" onclick="RCjump('+j+')"><span>Q'+(j+1)+'</span><i><b class="'+cl+'" style="--w:'+pct(t,max)+'%"></b></i><strong>'+fmtT(t)+'</strong></button>';
 }
 return h;
}
function vResult(){
 var sm=summary(),E=sm.E,max=Number(S.maxMarks||N()*cfg.pos),c=0,w=0,u=0,t=0;
 sm.subs.forEach(function(x){c+=x.c;w+=x.w;u+=x.u;t+=x.t});
 var pctScore=max>0?Math.max(0,sm.score)/max:0,CIRC=2*Math.PI*54,tot=c+w+u||1,sig=resultSignals(sm),ins=resultQuickRead(sm,sig);
 var subs=sm.subs.map(function(x,k){var mx=cfg.per*cfg.pos,p=Math.max(0,x.m)/mx*100;return '<div class="rc-sub" style="--a:'+COL[k%3]+'"><div class="rc-sub-h"><b>'+esc(x.n)+'</b><span data-count="'+x.m+'">0</span></div><div class="rc-bar"><i style="--w:'+p+'%"></i></div><div class="rc-sub-f"><span class="g">'+x.c+' ✓</span><span class="r">'+x.w+' ✕</span><span>'+x.u+' —</span><span>'+x.acc+'% acc</span><span>'+mm(x.t)+'</span></div></div>'}).join('');
 var pal=SUB.map(function(n,k){var s='';for(var i=k*cfg.per;i<(k+1)*cfg.per;i++){var r=E[i].r;s+='<button class="rc-c '+(r==='Correct'?'ok':r==='Incorrect'?'bad':'na')+'" style="--d:'+((i-k*cfg.per)*18)+'ms" onclick="RCjump('+i+')">'+(i-k*cfg.per+1)+'</button>'}return '<div class="rc-pal-sec"><small style="color:'+COL[k%3]+'">'+esc(n)+'</small><div class="rc-pal">'+s+'</div></div>'}).join('');
 var seg=function(v,cl){return '<i class="'+cl+'" style="--w:'+(v/tot*100)+'%"></i>'};
 var dna=[{n:'Accuracy',v:sm.acc},{n:'Coverage',v:sig.coverage},{n:'Pace control',v:sig.pace?Math.max(0,100-Math.min(100,sig.pace/3)):0},{n:'Consistency',v:sig.consistency}];
 var dnaHtml=dna.map(function(x,k){return '<div class="rc-dna"><div><span>'+esc(x.n)+'</span><b>'+Math.round(x.v)+'</b></div><i><b style="--w:'+Math.round(x.v)+'%"></b></i></div>'}).join('');
 var insightHtml=ins.map(function(x){return '<li>'+esc(x)+'</li>'}).join('');
 var subjectFocus=sm.subs.slice().sort(function(a,b){return a.acc-b.acc}).slice(0,2).map(function(x){return '<span><b>'+esc(x.n)+'</b><small>'+x.acc+'% accuracy · '+x.w+' incorrect</small></span>'}).join('');
 return '<div class="rc-sec-head"><button class="rc-back" onclick="RCview(\'home\')">← Back</button><h2>Your Result</h2><span class="rc-actions">'+paperBtn()+'<button class="rc-btn" onclick="RCview(\'key\')">View Answer Key</button>'+(S.backendTestId?'<button class="rc-btn" onclick="RCsolutions()">Solutions (PDF)</button>':'')+'<button class="rc-btn" onclick="downloadReport()">Download response sheet</button></span></div>'+ 
 '<div class="rc-hero"><div class="rc-ringwrap"><svg viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="#ffffff12" stroke-width="10"/><circle id="rcArc" cx="65" cy="65" r="54" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+CIRC+'" stroke-dashoffset="'+CIRC+'" data-to="'+(CIRC*(1-pctScore))+'" transform="rotate(-90 65 65)"></circle>'+DEFS+'</svg><div class="rc-ringtxt"><b data-count="'+sm.score+'">0</b><span>of '+max+'</span></div></div>'+ 
 '<div><div class="rc-hero-copy"><span class="rc-eyebrow">ANALYSIS READY</span><h3>'+esc(S.type||'Test')+'</h3><p>'+esc(S.date||'')+' · '+esc(S.name||'Student')+'</p></div><div class="rc-stats"><div class="s ok"><b data-count="'+c+'">0</b><span>Correct</span></div><div class="s bad"><b data-count="'+w+'">0</b><span>Incorrect</span></div><div class="s na"><b data-count="'+u+'">0</b><span>Unattempted</span></div><div class="s"><b data-count="'+sm.acc+'" data-suf="%">0</b><span>Accuracy</span></div><div class="s wide"><b>'+fmtT(t)+'</b><span>Total time on questions</span></div></div></div></div>'+ 
 '<div class="rc-dist">'+seg(c,'ok')+seg(w,'bad')+seg(u,'na')+'</div>'+ 
 '<section class="rc-analysis-grid"><div class="rc-panel"><div class="rc-panel-head"><span class="rc-kicker">PERFORMANCE DNA</span><b>How this attempt behaved</b></div>'+dnaHtml+'</div><div class="rc-panel"><div class="rc-panel-head"><span class="rc-kicker">QUICK READ</span><b>What happened?</b></div><ul class="rc-insights">'+insightHtml+'</ul></div></section>'+ 
 '<section class="rc-panel rc-panel-focus"><div class="rc-panel-head"><span class="rc-kicker">NEXT MOVE</span><b>Where to focus next</b></div><div class="rc-focus-grid"><div><strong>Accuracy first</strong><span>Revisit the questions marked incorrect before chasing more attempts.</span></div><div><strong>Weakest areas</strong><span>'+subjectFocus+'</span></div><div><strong>Time control</strong><span>'+(sig.slowI>=0?'Q'+(sig.slowI+1)+' was the biggest time sink at '+fmtT(sig.slow)+'.':'Timing data is limited for this attempt.')+'</span></div></div></section>'+ 
 '<h3 class="rc-h3">Subject intelligence</h3><div class="rc-subs">'+subs+'</div>'+ 
 '<h3 class="rc-h3">Time analysis</h3><div class="rc-panel rc-time-panel"><div class="rc-time-head"><span>Fast</span><span>Each bar is one question · click to jump to review</span><span>Slow</span></div><div class="rc-time-list">'+timeBars(sm)+'</div></div>'+ 
 '<h3 class="rc-h3">Question palette</h3><div class="rc-legend"><span class="ok">Correct</span><span class="bad">Incorrect</span><span class="na">Unattempted</span></div>'+pal+ 
 '<h3 class="rc-h3">Question-by-question analysis</h3><div class="rc-analysis-note"><span>YOUR ANSWER</span><span>ANSWER KEY</span><span>STATUS · MARKS · TIME</span></div><div class="rc-filters">'+[['all','All'],['Correct','Correct'],['Incorrect','Incorrect'],['Unattempted','Unattempted']].map(function(f){return '<button class="'+(RC.filter===f[0]?'on':'')+'" onclick="RCfilter(\''+f[0]+'\')">'+f[1]+'</button>'}).join('')+'</div><div id="rcList" class="rc-list">'+rows(sm)+'</div>';
}

function rows(sm){
 var E=sm.E,h='',n=0;
 for(var i=0;i<N();i++){var r=E[i].r;if(RC.filter!=='all'&&RC.filter!==r)continue;
  var cl=r==='Correct'?'ok':r==='Incorrect'?'bad':'na',m=E[i].m;
  h+='<div class="rc-row '+cl+'" id="rq-'+i+'" style="--d:'+Math.min(n++,14)*35+'ms"><span class="qn">'+String(i%cfg.per+1).padStart(2,'0')+'<small style="color:'+COL[sub(i)%3]+'">'+esc(String(SUB[sub(i)]).slice(0,4))+'</small></span><span class="ty">'+(isNum(i)?'NUM':'MCQ')+'</span><span class="a"><small>Your answer</small><b>'+esc(disp(i,S.q[i].a))+'</b></span><span class="a"><small>Correct</small><b>'+esc(disp(i,S.key[i]))+'</b></span><span class="mk">'+(m>0?'+'+m:m)+'</span><span class="tm">'+fmtT(S.q[i].t)+'</span></div>'}
 return h||'<div class="rc-empty">Nothing in this filter.</div>'
}
/* ---- render ---- */
function count(root){
 root.querySelectorAll('[data-count]').forEach(function(el){
  var to=+el.dataset.count,suf=el.dataset.suf||'',t0=performance.now();
  (function f(t){var p=Math.min((t-t0)/1300,1);el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+suf;if(p<1)requestAnimationFrame(f)})(t0)});
 var arc=q('#rcArc');if(arc)requestAnimationFrame(function(){requestAnimationFrame(function(){arc.style.strokeDashoffset=arc.dataset.to})});
 root.querySelectorAll('.rc-bar i,.rc-dist i').forEach(function(b){requestAnimationFrame(function(){b.classList.add('go')})});
}
function bindMotion(){
 var root=q('.rc');if(!root||root.dataset.motionBound)return;root.dataset.motionBound='1';
 var fine=window.matchMedia&&window.matchMedia('(pointer:fine)').matches;
 if(!fine)return;
 root.addEventListener('pointermove',function(e){
  var r=root.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  root.style.setProperty('--mx',(x*100)+'%');root.style.setProperty('--my',(y*100)+'%');
  var hero=q('.rc-hero');if(hero){hero.style.setProperty('--hx',(x*10).toFixed(2)+'px');hero.style.setProperty('--hy',(y*8).toFixed(2)+'px');}
  root.querySelectorAll('.rc-card,.rc-panel,.rc-sub').forEach(function(el){var b=el.getBoundingClientRect(),dx=(e.clientX-(b.left+b.width/2))/b.width,dy=(e.clientY-(b.top+b.height/2))/b.height;if(Math.abs(dx)<.9&&Math.abs(dy)<.9){el.style.setProperty('--rx',(-dy*2.2).toFixed(2)+'deg');el.style.setProperty('--ry',(dx*2.2).toFixed(2)+'deg');el.style.setProperty('--mxp',((dx+.5)*100)+'%');el.style.setProperty('--myp',((dy+.5)*100)+'%');}});
 });
 root.addEventListener('pointerleave',function(){root.querySelectorAll('.rc-card,.rc-panel,.rc-sub').forEach(function(el){el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')})});
}
function draw(){
 var res=q('#res');if(!res)return;
 if(RC.sid!==S.id){RC={sid:S.id,st:'loading',view:'home',filter:'all',sec:0};fetchKey().then(function(){if(RC.st==='ready'&&RC.view==='home')RCcheck();else draw()})}
 clearInterval(RC.poll);if(RC.st==='locked'&&RC.why==='pending'&&!res.hidden)RC.poll=setInterval(function(){if(document.hidden)return;var rr=q('#res');if(!rr||rr.hidden){clearInterval(RC.poll);return}var sid=RC.sid;fetchKey().then(function(){if(RC.sid===sid&&RC.st==='ready'){clearInterval(RC.poll);RCcheck()}})},15000);
 var body=RC.st==='loading'?vLoading():RC.st==='locked'?vLocked():RC.view==='key'?vKey():RC.view==='result'?vResult():vHome();
 res.innerHTML='<div class="rc">'+bg()+top()+'<main class="rc-main">'+body+'</main><div id="dash" hidden></div></div>';
 res.scrollTop=0;window.scrollTo(0,0);count(res);bindMotion();
}
window.goHome=function(){clearInterval(RC.poll);var l=q('#land'),r=q('#res'),a=q('#app');if(r)r.hidden=true;if(a)a.hidden=true;if(l)l.hidden=false;try{home()}catch(e){}try{window.refreshBackendTests&&window.refreshBackendTests()}catch(e){}window.scrollTo(0,0)};
window.drawRes=draw;
window.RCview=function(v){RC.view=v;draw()};
window.RCsec=function(k){RC.sec=k;draw()};
window.RCrefresh=function(){RC.st='loading';draw();fetchKey().then(draw)};
window.RCfilter=function(f){RC.filter=f;var l=q('#rcList');document.querySelectorAll('.rc-filters button').forEach(function(b){b.classList.toggle('on',b.textContent.toLowerCase()===f.toLowerCase()||(f==='all'&&b.textContent==='All'))});if(l)l.innerHTML=rows(summary())};
window.RCjump=function(i){RC.filter='all';var l=q('#rcList');if(l)l.innerHTML=rows(summary());document.querySelectorAll('.rc-filters button').forEach(function(b,k){b.classList.toggle('on',k===0)});var e=document.getElementById('rq-'+i);if(e){e.scrollIntoView({behavior:'smooth',block:'center'});e.classList.add('flash');setTimeout(function(){e.classList.remove('flash')},1400)}};
window.RCcheck=function(){
 if(RC.st!=='ready')return;S.mode='A';RC.view='result';RC.filter='all';draw();
 try{dash()}catch(e){}
 var d=q('#dash');if(d)d.hidden=true;
};
})();
