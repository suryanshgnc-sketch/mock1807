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
function vResult(){
 var sm=summary(),E=sm.E,max=Number(S.maxMarks||N()*cfg.pos),c=0,w=0,u=0,t=0,attemptedTime=0;
 sm.subs.forEach(function(x){c+=x.c;w+=x.w;u+=x.u;t+=x.t});
 var pct=max>0?Math.max(0,sm.score)/max*100:0,tot=c+w+u||1,attempted=c+w;
 for(var qi=0;qi<N();qi++){if(E[qi].r!=='Unattempted')attemptedTime+=Number(S.q[qi].t||0)}
 var avgAll=N()?Math.round(t/N()):0,avgAttempt=attempted?Math.round(attemptedTime/attempted):0;
 var neg=Math.abs(E.reduce(function(a,e){return a+Math.min(0,Number(e.m)||0)},0));
 var best=sm.subs.slice().sort(function(a,b){return (b.acc-a.acc)||(b.m-a.m)})[0];
 var worst=sm.subs.slice().sort(function(a,b){return (a.acc-b.acc)||(a.m-b.m)})[0];
 var fastest=-1,slowest=-1;
 for(var ti=0;ti<N();ti++){if(E[ti].r!=='Unattempted'){if(fastest<0||S.q[ti].t<S.q[fastest].t)fastest=ti;if(slowest<0||S.q[ti].t>S.q[slowest].t)slowest=ti}}
 var verdict=pct>=75?'Strong performance':pct>=50?'Solid attempt':'Room to improve';
 var subCards=sm.subs.map(function(x,k){
   var mx=Math.max(1,cfg.per*cfg.pos),p=Math.max(0,Math.min(100,x.m/mx*100));
   var label=x.acc>=80?'Strong':x.acc>=60?'Steady':'Needs focus';
   return '<article class="rc-sub" style="--a:'+COL[k%3]+'">'+
    '<div class="rc-sub-top"><div><small>SUBJECT '+String(k+1).padStart(2,'0')+'</small><b>'+esc(x.n)+'</b></div><strong>'+x.acc+'%</strong></div>'+
    '<div class="rc-bar"><i style="--w:'+p+'%"></i></div>'+
    '<div class="rc-sub-f"><span class="g">'+x.c+' correct</span><span class="r">'+x.w+' wrong</span><span>'+x.u+' skipped</span><span>'+mm(x.t)+'</span></div>'+
    '<div class="rc-sub-foot"><span>'+label+'</span><span>'+x.m+' marks</span></div>'+
   '</article>';
 }).join('');
 var pal=SUB.map(function(n,k){
   var s='';
   for(var i=k*cfg.per;i<(k+1)*cfg.per&&i<N();i++){
    var r=E[i].r;
    s+='<button aria-label="Question '+(i+1)+'" class="rc-c '+(r==='Correct'?'ok':r==='Incorrect'?'bad':'na')+'" style="--d:'+((i-k*cfg.per)*12)+'ms" onclick="RCjump('+i+')">'+(i-k*cfg.per+1)+'</button>';
   }
   return '<div class="rc-pal-sec"><div class="rc-pal-title"><span style="color:'+COL[k%3]+'">'+esc(n)+'</span><small>'+sm.subs[k].c+'C · '+sm.subs[k].w+'W · '+sm.subs[k].u+'U</small></div><div class="rc-pal">'+s+'</div></div>';
 }).join('');
 var seg=function(v,cl){return '<i class="'+cl+'" style="--w:'+(v/tot*100)+'%"></i>'};
 var insight=[];
 if(best) insight.push('<b>'+esc(best.n)+'</b> is your strongest section at <b>'+best.acc+'% accuracy</b>.');
 if(worst&&sm.subs.length>1) insight.push('<b>'+esc(worst.n)+'</b> needs the most attention at <b>'+worst.acc+'% accuracy</b>.');
 if(neg) insight.push('You lost <b>'+neg+' marks</b> through negative marking.');
 if(attempted) insight.push('You attempted <b>'+attempted+'/'+N()+'</b> questions with an average of <b>'+fmtT(avgAttempt)+'</b> on attempted questions.');
 var insights=insight.slice(0,3).map(function(x,i){return '<div class="rc-insight"><span class="rc-insight-no">0'+(i+1)+'</span><p>'+x+'</p></div>'}).join('');
 var paceWidth=function(i){return i<0?0:Math.min(100,(S.q[i].t/Math.max(1,avgAll*2))*100)};
 return '<div class="rc-sec-head rc-result-head"><div><span class="rc-eyebrow">PERFORMANCE REPORT</span><h2>Your Result</h2><p>Detailed analysis of your submitted attempt.</p></div><div class="rc-actions">'+
   '<button class="rc-btn" onclick="downloadReport()">Response sheet</button>'+(S.backendTestId?'<button class="rc-btn" onclick="RCsolutions()">Key &amp; solutions</button>':'')+'</div></div>'+
 '<section class="rc-overview">'+
   '<div class="rc-score-block"><div class="rc-ringwrap"><svg viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" fill="none" stroke="#ffffff0d" stroke-width="10"/><circle id="rcArc" cx="65" cy="65" r="54" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(2*Math.PI*54)+'" stroke-dashoffset="'+(2*Math.PI*54)+'" data-to="'+((2*Math.PI*54)*(1-pct/100))+'" transform="rotate(-90 65 65)"></circle>'+DEFS+'</svg><div class="rc-ringtxt"><b data-count="'+sm.score+'">0</b><span>/ '+max+'</span></div></div><div class="rc-score-copy"><span class="rc-status">'+verdict+'</span><h3>'+Math.round(pct)+'<small>%</small></h3><p>'+esc(S.type||'Test')+' · '+esc(S.name||'Student')+'</p></div></div>'+
   '<div class="rc-stat-grid"><div class="rc-stat ok"><span>Correct</span><b data-count="'+c+'">0</b></div><div class="rc-stat bad"><span>Incorrect</span><b data-count="'+w+'">0</b></div><div class="rc-stat na"><span>Unattempted</span><b data-count="'+u+'">0</b></div><div class="rc-stat"><span>Accuracy</span><b data-count="'+sm.acc+'" data-suf="%">0</b></div><div class="rc-stat"><span>Attempt rate</span><b>'+Math.round(attempted/N()*100)+'%</b></div><div class="rc-stat"><span>Avg / question</span><b>'+fmtT(avgAll)+'</b></div></div>'+
 '</section>'+
 '<div class="rc-dist" aria-label="Answer distribution">'+seg(c,'ok')+seg(w,'bad')+seg(u,'na')+'</div>'+
 '<section class="rc-analysis-grid"><div class="rc-analysis-card"><div class="rc-section-label">QUICK READ</div><h3>What your paper says</h3>'+insights+'</div>'+
 '<div class="rc-analysis-card"><div class="rc-section-label">PACE</div><h3>Time discipline</h3><div class="rc-pace"><div><span>Average / all questions</span><b>'+fmtT(avgAll)+'</b></div><div><span>Average / attempted</span><b>'+fmtT(avgAttempt)+'</b></div><div><span>Total time recorded</span><b>'+fmtT(t)+'</b></div></div>'+
 (fastest>=0?'<div class="rc-pace-extremes"><span>Fastest Q'+(fastest+1)+' · '+fmtT(S.q[fastest].t)+'</span><span>Slowest Q'+(slowest+1)+' · '+fmtT(S.q[slowest].t)+'</span></div>':'')+
 '</div></section>'+
 '<section class="rc-section"><div class="rc-section-heading"><div><span class="rc-section-label">SUBJECT ANALYSIS</span><h3>Where you stand</h3></div><span class="rc-section-note">Marks · accuracy · time</span></div><div class="rc-subs">'+subCards+'</div></section>'+
 '<section class="rc-section"><div class="rc-section-heading"><div><span class="rc-section-label">QUESTION MAP</span><h3>Every question at a glance</h3></div><div class="rc-legend"><span class="ok">Correct</span><span class="bad">Incorrect</span><span class="na">Unattempted</span></div></div>'+pal+'</section>'+
 '<section class="rc-section"><div class="rc-section-heading"><div><span class="rc-section-label">REVIEW</span><h3>Question-by-question</h3></div></div><div class="rc-filters">'+[['all','All'],['Correct','Correct'],['Incorrect','Incorrect'],['Unattempted','Unattempted']].map(function(f){return '<button class="'+(RC.filter===f[0]?'on':'')+'" onclick="RCfilter(\''+f[0]+'\')">'+f[1]+'</button>'}).join('')+'</div><div id="rcList" class="rc-list">'+rows(sm)+'</div></section>';
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
