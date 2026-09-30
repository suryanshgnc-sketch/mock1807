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
function bg(){return '<div class="rc-bg"><i></i><i></i><i></i><span></span></div>'}
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
function pdfBtns(){return '<button class="rc-btn" onclick="downloadResponses()">Download response sheet</button>'+(S.backendTestId?'<button class="rc-btn" onclick="RCsolutions()">Key &amp; solutions (PDF)</button>':'')}
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
 return '<div class="rc-sec-head"><button class="rc-back" onclick="RCview(\'home\')">\u2190 Back</button><h2>Official Answer Key</h2><span class="rc-actions">'+(S.backendTestId?'<button class="rc-btn" onclick="RCsolutions()">Solutions (PDF)</button>':'')+'<button class="rc-btn solid" onclick="RCcheck()">Check Automatically</button></span></div>'+tabs()+'<div class="rc-keygrid">'+h+'</div><p class="rc-note">Numerical answers are highlighted. Key shown exactly as published by the admin.</p>'
}
function pct0(v){return Math.max(0,Math.min(100,Math.round(Number(v)||0)))}
function perfLabel(v){v=Number(v)||0;return v>=85?'EXCELLENT':v>=70?'STRONG':v>=50?'STABLE':'NEEDS FOCUS'}
function insightLine(sm,c,w,u,t){
 var attempts=c+w,acc=attempts?Math.round(c/attempts*100):0,attempt=pct0((attempts/(c+w+u||1))*100),avg=attempts?t/attempts:0;
 var best=sm.subs.slice().sort(function(a,b){return (b.acc||0)-(a.acc||0)})[0],weak=sm.subs.slice().sort(function(a,b){return (a.acc||0)-(b.acc||0)})[0];
 var parts=[];
 if(acc>=85)parts.push('Precision is a clear strength');else if(acc<60)parts.push('Accuracy is the first area to tighten');else parts.push('Accuracy is holding at a workable level');
 if(avg>150)parts.push('time pressure is visible in your average question time');else if(avg<45&&attempt>85)parts.push('your pace is aggressive');else parts.push('your pacing is reasonably controlled');
 if(best&&weak&&best.n!==weak.n)parts.push(esc(best.n)+' leads while '+esc(weak.n)+' needs the most attention');
 return parts.join('. ')+'.';
}
function vResult(){
 var sm=summary(),E=sm.E,max=Number(S.maxMarks||N()*cfg.pos),c=0,w=0,u=0,t=0;
 sm.subs.forEach(function(x){c+=x.c;w+=x.w;u+=x.u;t+=x.t});
 var pct=max>0?Math.max(0,sm.score)/max*100:0,attempts=c+w,attemptRate=pct0(attempts/(N()||1)*100),accuracy=attempts?Math.round(c/attempts*100):0,avg=attempts?t/attempts:0;
 var CIRC=2*Math.PI*54,tot=c+w+u||1;
 var bestTime=null,worstTime=null;
 E.forEach(function(x,i){var tt=Number(S.q[i].t)||0;if(tt>0&&(!worstTime||tt>worstTime.t))worstTime={i:i,t:tt};if(tt>0&&(!bestTime||tt<bestTime.t))bestTime={i:i,t:tt}});
 var subjectMax=cfg.per*cfg.pos;
 var subs=sm.subs.map(function(x,k){var p=subjectMax?Math.max(0,x.m)/subjectMax*100:0;return '<article class="rc-sub rc-reveal" style="--a:'+COL[k%3]+';--delay:'+(k*80)+'ms"><div class="rc-sub-top"><span class="rc-sub-index">0'+(k+1)+'</span><span class="rc-sub-state">'+perfLabel(x.acc)+'</span></div><div class="rc-sub-h"><b>'+esc(x.n)+'</b><span data-count="'+x.m+'">0</span><small>/ '+subjectMax+'</small></div><div class="rc-bar"><i style="--w:'+p+'%"></i></div><div class="rc-sub-f"><span class="g">'+x.c+' correct</span><span class="r">'+x.w+' wrong</span><span>'+x.u+' skipped</span><span>'+x.acc+'% accuracy</span><span>'+mm(x.t)+'</span></div></article>'}).join('');
 var pal=SUB.map(function(n,k){var s='';for(var i=k*cfg.per;i<(k+1)*cfg.per;i++){var r=E[i].r;s+='<button class="rc-c '+(r==='Correct'?'ok':r==='Incorrect'?'bad':'na')+'" style="--d:'+((i-k*cfg.per)*18)+'ms" onclick="RCjump('+i+')">'+(i-k*cfg.per+1)+'</button>'}return '<div class="rc-pal-sec"><div class="rc-pal-head"><small style="color:'+COL[k%3]+'">'+esc(n)+'</small><span>'+sm.subs[k].c+' correct · '+sm.subs[k].w+' wrong · '+sm.subs[k].u+' skipped</span></div><div class="rc-pal">'+s+'</div></div>'}).join('');
 var dna=[['Precision',accuracy,'How often attempted questions were correct'],['Coverage',attemptRate,'How much of the paper you attempted'],['Pace',avg<=60?90:avg<=90?76:avg<=150?58:38,'Relative time efficiency'],['Consistency',sm.subs.length?Math.max(0,100-Math.min(100,Math.abs((Math.max.apply(null,sm.subs.map(function(x){return x.acc}))||0)-(Math.min.apply(null,sm.subs.map(function(x){return x.acc}))||0)))):0,'Balance across subjects']];
 var dnaHtml=dna.map(function(d,k){return '<div class="rc-dna-row" style="--delay:'+(k*90)+'ms"><div><b>'+d[0]+'</b><small>'+d[2]+'</small></div><span><i style="--w:'+pct0(d[1])+'%"></i></span><strong>'+pct0(d[1])+'%</strong></div>'}).join('');
 var timeRows=E.map(function(x,i){return {i:i,t:Number(S.q[i].t)||0,r:x.r}}).filter(function(x){return x.t>0}).sort(function(a,b){return b.t-a.t}).slice(0,8);
 var maxTime=timeRows.length?timeRows[0].t:1;
 var timeHtml=timeRows.map(function(x,k){return '<button class="rc-time-row" onclick="RCjump('+x.i+')" style="--delay:'+(k*55)+'ms"><span>Q'+(x.i%cfg.per+1)+'</span><div><i style="--w:'+Math.max(8,x.t/maxTime*100)+'%"></i></div><b>'+fmtT(x.t)+'</b><em class="'+(x.r==='Correct'?'ok':x.r==='Incorrect'?'bad':'na')+'">'+(x.r==='Correct'?'CORRECT':x.r==='Incorrect'?'WRONG':'SKIPPED')+'</em></button>'}).join('');
 var best=sm.subs.slice().sort(function(a,b){return b.acc-a.acc})[0],weak=sm.subs.slice().sort(function(a,b){return a.acc-b.acc})[0];
 var focus=weak?'<b>'+esc(weak.n)+'</b> is your clearest improvement area at <strong>'+weak.acc+'% accuracy</strong>.': 'Use this report to identify your next focus area.';
 return '<div class="rc-result-head rc-reveal"><div><span class="rc-eyebrow">POST-TEST INTELLIGENCE</span><h2>Here is how you performed.</h2><p>Every answer, second and decision has been distilled into one performance report.</p></div><span class="rc-actions">'+(S.backendTestId?'<button class="rc-btn" onclick="RCsolutions()">Solutions PDF</button>':'')+'<button class="rc-btn" onclick="downloadReport()">Response sheet</button></span></div>'+
 '<section class="rc-hero rc-reveal"><div class="rc-hero-grid"><div class="rc-score-orb"><div class="rc-orb-grid"></div><svg viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="#ffffff12" stroke-width="10"/><circle id="rcArc" cx="65" cy="65" r="54" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+CIRC+'" stroke-dashoffset="'+CIRC+'" data-to="'+(CIRC*(1-Math.min(1,pct/100)))+'" transform="rotate(-90 65 65)"/></svg><div class="rc-ringtxt"><b data-count="'+sm.score+'">0</b><span>of '+max+'</span></div></div><div class="rc-hero-copy"><span class="rc-status">RESULT GENERATED <i></i></span><div class="rc-big-pct"><b data-count="'+Math.round(pct)+'" data-suf="%">0</b><span>overall score</span></div><p>'+insightLine(sm,c,w,u,t)+'</p><div class="rc-hero-meta"><span><b>'+fmtT(t)+'</b> time</span><span><b>'+attemptRate+'%</b> attempted</span><span><b>'+accuracy+'%</b> accuracy</span></div></div></div></section>'+
 '<section class="rc-kpi-grid">'+[['CORRECT',c,'ok'],['INCORRECT',w,'bad'],['UNATTEMPTED',u,'na'],['ACCURACY',accuracy+'%',''],['ATTEMPT RATE',attemptRate+'%',''],['AVG / QUESTION',fmtT(avg),'time']].map(function(x,k){return '<div class="rc-kpi rc-reveal" style="--delay:'+(k*55)+'ms"><span>'+x[0]+'</span><b class="'+x[2]+'">'+x[1]+'</b></div>'}).join('')+'</section>'+
 '<section class="rc-analysis-grid"><article class="rc-panel rc-reveal"><div class="rc-panel-head"><div><span class="rc-eyebrow">PERFORMANCE DNA</span><h3>What shaped this score?</h3></div><span class="rc-mini-dot"></span></div><div class="rc-dna">'+dnaHtml+'</div></article><article class="rc-panel rc-reveal"><div class="rc-panel-head"><div><span class="rc-eyebrow">QUICK READ</span><h3>The useful stuff</h3></div></div><div class="rc-insights"><div><span>01</span><p><b>Strongest area</b>'+ (best?esc(best.n)+' · '+best.acc+'% accuracy':'Not enough data')+'</p></div><div><span>02</span><p><b>Priority area</b>'+focus+'</p></div><div><span>03</span><p><b>Time signal</b>'+ (worstTime?'Q'+(worstTime.i%cfg.per+1)+' took '+fmtT(worstTime.t)+'. '+(bestTime?'Your fastest recorded question was Q'+(bestTime.i%cfg.per+1)+' at '+fmtT(bestTime.t)+'.':''):'No question-time data available.')+'</p></div></div></article></section>'+
 '<section class="rc-panel rc-reveal"><div class="rc-panel-head"><div><span class="rc-eyebrow">SUBJECT INTELLIGENCE</span><h3>Where the marks came from</h3></div><span class="rc-panel-note">'+SUB.length+' sections</span></div><div class="rc-subs">'+subs+'</div></section>'+
 '<section class="rc-analysis-grid"><article class="rc-panel rc-reveal"><div class="rc-panel-head"><div><span class="rc-eyebrow">TIME ANALYSIS</span><h3>Where your minutes went</h3></div><span class="rc-panel-note">slowest first</span></div><div class="rc-time">'+(timeHtml||'<div class="rc-empty">Question timing is not available for this attempt.</div>')+'</div></article><article class="rc-panel rc-reveal"><div class="rc-panel-head"><div><span class="rc-eyebrow">ATTEMPT PROFILE</span><h3>Decision pattern</h3></div></div><div class="rc-profile"><div class="rc-profile-ring"><b>'+attemptRate+'%</b><span>paper covered</span></div><div class="rc-profile-copy"><p><b>'+c+'</b> correct from <b>'+attempts+'</b> attempted.</p><p><b>'+w+'</b> incorrect answers contributed to negative marking.</p><p><b>'+u+'</b> questions were left untouched.</p></div></div></article></section>'+
 '<section class="rc-panel rc-reveal"><div class="rc-panel-head"><div><span class="rc-eyebrow">QUESTION JOURNEY</span><h3>Every question, mapped</h3></div><div class="rc-legend"><span class="ok">Correct</span><span class="bad">Incorrect</span><span class="na">Unattempted</span></div></div>'+pal+'</section>'+
 '<section class="rc-panel rc-reveal"><div class="rc-panel-head"><div><span class="rc-eyebrow">DETAILED REVIEW</span><h3>Question-by-question</h3></div></div><div class="rc-filters">'+[['all','All'],['Correct','Correct'],['Incorrect','Incorrect'],['Unattempted','Unattempted']].map(function(f){return '<button class="'+(RC.filter===f[0]?'on':'')+'" onclick="RCfilter(\''+f[0]+'\')">'+f[1]+'</button>'}).join('')+'</div><div id="rcList" class="rc-list">'+rows(sm)+'</div></section>'+
 '<section class="rc-next rc-reveal"><div><span class="rc-eyebrow">NEXT MOVE</span><h3>Turn this attempt into your next improvement.</h3><p>'+focus+' Review the incorrect questions before starting another paper.</p></div><div class="rc-next-mark"><span>FOCUS</span><b>'+ (weak?esc(weak.n).toUpperCase():'REVIEW') +'</b></div></section>';
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
function draw(){
 var res=q('#res');if(!res)return;
 if(RC.sid!==S.id){RC={sid:S.id,st:'loading',view:'home',filter:'all',sec:0};fetchKey().then(function(){if(RC.st==='ready'&&RC.view==='home')RCcheck();else draw()})}
 clearInterval(RC.poll);if(RC.st==='locked'&&RC.why==='pending'&&!res.hidden)RC.poll=setInterval(function(){if(document.hidden)return;var rr=q('#res');if(!rr||rr.hidden){clearInterval(RC.poll);return}var sid=RC.sid;fetchKey().then(function(){if(RC.sid===sid&&RC.st==='ready'){clearInterval(RC.poll);RCcheck()}})},15000);
 var body=RC.st==='loading'?vLoading():RC.st==='locked'?vLocked():RC.view==='key'?vKey():RC.view==='result'?vResult():vHome();
 res.innerHTML='<div class="rc">'+bg()+top()+'<main class="rc-main">'+body+'</main><div id="dash" hidden></div></div>';
 res.scrollTop=0;window.scrollTo(0,0);count(res);
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
