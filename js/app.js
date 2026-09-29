/* Core: storage, exam engine, evaluation, PDF viewer, cloud sync, home. */
'use strict';
const $=s=>document.querySelector(s);let SUB=[];const setOrder=o=>{cfg.order=o;if(o.length===3)cfg.fo=o;SUB=o.split('').map(x=>({P:'Physics',C:'Chemistry',M:'Mathematics'}[x]))};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{s=Math.max(0,s);return [s/3600|0,(s%3600)/60|0,s%60].map(x=>String(x).padStart(2,'0')).join(':')};
const mm=s=>Math.floor(s/60)+'m '+s%60+'s';

/* ---------- Storage ---------- */
const MEM={};
const Store={
 get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?(k in MEM?JSON.parse(MEM[k]):d):JSON.parse(v)}catch(e){return k in MEM?JSON.parse(MEM[k]):d}},
 set:(k,v)=>{MEM[k]=JSON.stringify(v);try{localStorage.setItem(k,MEM[k])}catch(e){}},
};
let cfg={pos:4,negA:1,negB:1,dur:180,per:25,order:'PCM',fo:'PCM',...Store.get('nta_cfg',{})};
setOrder(cfg.order);let S=null,timerId=null,pdfUrl=null,pdfZoom=100,pdfName='Uploaded Paper';

/* ---------- Helpers ---------- */
const N=()=>cfg.per*SUB.length,sub=i=>Math.floor(i/cfg.per),isNum=i=>i%cfg.per>=cfg.per-5;
const saveSess=()=>{if(!S)return;if(!S.done)S.rem=Math.round((S.endAt-Date.now())/1000);Store.set('nta_sess',S)};
setInterval(saveSess,5000);addEventListener('beforeunload',saveSess);

/* ---------- Modal / Settings ---------- */
function modal(h){$('#dbox').innerHTML=h;$('#dlg').className='modal'+(S?'':' dk');$('#dlg').hidden=false}
function closeM(){$('#dlg').hidden=true}
function settings(){
 const lock=S&&!S.done?'disabled':'';
 modal(`<h3>Settings</h3><div class="f">
 <label>Correct answer score<input id="s1" type="number" value="${cfg.pos}"></label>
 <label>Negative marking – Section A (MCQ)<input id="s2" type="number" value="${cfg.negA}"></label>
 <label>Negative marking – Section B (Numerical)<input id="s3" type="number" value="${cfg.negB}"></label>
 <label>Duration (minutes)<input id="s4" type="number" value="${cfg.dur}" ${lock}></label>
 <label>Questions per subject (5 numerical + rest MCQ)<input id="s5" type="number" min="6" value="${cfg.per}" ${lock}></label>
 <label>Subject order in paper (P=Physics C=Chemistry M=Maths)<select id="s6" ${lock}>${['PCM','MPC','PMC','CPM','CMP','MCP','P','C','M'].map(o=>`<option ${o===cfg.order?'selected':''}>${o}</option>`).join('')}</select></label>
 <hr><b>Cloud sync (private GitHub Gist)</b>
 <input id="s7" type="password" placeholder="GitHub token with 'gist' scope" value="${esc(Store.get('nta_tok',''))}">
 <button class="btn" onclick="cloud('push')">Push ☁</button> <button class="btn" onclick="cloud('pull')">Pull ☁</button>
 <button class="btn w" onclick="exportJ()">Export JSON</button> <label class="btn w">Import JSON<input type="file" accept=".json" hidden onchange="importJ(this.files[0])"></label></div>
 <button class="btn g" onclick="saveCfg()">Save</button> <button class="btn w" onclick="closeM()">Cancel</button>`);
}
function saveCfg(){
 const v=i=>Math.abs(parseFloat($('#s'+i).value))||0;
 cfg.pos=v(1);cfg.negA=v(2);cfg.negB=v(3);
 if(!(S&&!S.done)){cfg.dur=v(4)||180;cfg.per=Math.max(6,v(5)|0||25);setOrder($('#s6').value);if(S)S.order=cfg.order}
 Store.set('nta_tok',$('#s7').value.trim());Store.set('nta_cfg',cfg);closeM();if(S&&!S.done)render();
 if(window._cu){window._cu=0;pick({n:'Custom',custom:2})}
}

/* ---------- PDF ---------- */
const IDB={
 db:()=>new Promise((res,rej)=>{const r=indexedDB.open('nta_mock',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=rej}),
 async set(v){try{(await this.db()).transaction('f','readwrite').objectStore('f').put(v,'pdf')}catch(e){}},
 async del(){try{(await this.db()).transaction('f','readwrite').objectStore('f').delete('pdf')}catch(e){}},
 async get(){try{const d=await this.db();return await new Promise(r=>{const q=d.transaction('f').objectStore('f').get('pdf');q.onsuccess=()=>r(q.result);q.onerror=()=>r()})}catch(e){}}
};
async function restorePdf(){const r=await IDB.get();if(r&&r.blob){pdfUrl=URL.createObjectURL(r.blob);pdfName=r.name;pdfView()}}
function loadPdf(f){if(!f)return;IDB.set({blob:f,name:f.name});if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(f);pdfName=f.name;pdfView()}
function pdfView(){
 if(!pdfUrl)return;$('#zl').textContent=pdfZoom+'%';
 $('#pdf').innerHTML=`<embed type="application/pdf" src="${pdfUrl}#page=${$('#pg').value||1}&zoom=${pdfZoom}">`;
}
function zoom(d){pdfZoom=Math.min(300,Math.max(50,pdfZoom+d));$('#zl').textContent=pdfZoom+'%';pdfView()}

/* ---------- Test lifecycle ---------- */
function start(){
 const name=$('#ln').value.trim(),roll=$('#lr').value.trim();
 if(!name||!roll)return alert('Please enter Student Name and Roll No.');
 if($('#lf').files[0])loadPdf($('#lf').files[0]);
 Store.set('nta_who',{n:name,r:roll});closeM();
 S={id:Date.now(),type:window._t||'Test',name,roll,cur:0,done:false,mode:'A',key:[],man:[],date:new Date().toLocaleString(),
  per:cfg.per,order:cfg.order,endAt:Date.now()+cfg.dur*60000,q:Array.from({length:N()},()=>({a:'',s:0,t:0}))};
 S.q[0].s=1;begin();
}
function resume(){
 S=Store.get('nta_sess');if(!S)return;
 cfg.per=S.per;setOrder(S.order||'PCM');
 if(S.done)return showRes();
 S.endAt=Date.now()+S.rem*1000;begin();
}
function begin(){
 $('#land').hidden=true;$('#res').hidden=true;$('#app').hidden=false;
 $('#cn').textContent=S.name;$('#cr').textContent=S.roll;
 clearInterval(timerId);timerId=setInterval(tick,1000);tick();render();if(!pdfUrl)restorePdf();
 try{document.documentElement.requestFullscreen()}catch(e){}
}
function tick(){
 const rem=Math.round((S.endAt-Date.now())/1000),t=$('#timer');
 t.textContent=fmt(rem);t.className=rem<300?'rd':rem<1800?'or':'';
 S.q[S.cur].t++;
 if(rem<=0){finish()}
}
function go(i){
 const q=S.q[S.cur];if(q.a!==''&&q.s<2)q.s=2;
 S.cur=i;if(S.q[i].s===0)S.q[i].s=1;render();
}
function act(a){
 const q=S.q[S.cur],has=q.a!=='';
 if(a==='cl'){q.a='';q.s=1;return render()}
 q.s=a==='sn'?(has?2:1):(has?4:3);
 if(S.cur<N()-1)go(S.cur+1);else render();
}
function nav(d){const i=S.cur+d;if(i>=0&&i<N())go(i)}
function setAns(v){S.q[S.cur].a=v;if(S.q[S.cur].s<2)S.q[S.cur].s=2;renderPal()}

/* ---------- Renderers ---------- */
function render(){
 const i=S.cur,q=S.q[i],s=sub(i),per=cfg.per,nA=per-5;
 $('#tabs').innerHTML=SUB.map((n,k)=>`<button class="tab ${k===s?'on':''}" onclick="go(${k*per})">${n}</button>`).join('');
 $('#badge').textContent=isNum(i)?`Section B (Numerical ${nA+1}–${per})`:`Section A (MCQ 1–${nA})`;
 $('#sn').textContent=SUB[s];$('#qh').innerHTML='Question No. '+(i%per+1)+`<span style="float:right;font-size:12px">Marks: +${cfg.pos} / -${isNum(i)?cfg.negB:cfg.negA}</span>`;
 if(isNum(i)){
  $('#qbody').innerHTML=`<input id="ans" value="${esc(q.a)}" readonly inputmode="none" placeholder="Use the on-screen keypad">
  <div class="kp">${[7,8,9,4,5,6,1,2,3,0,'.','-'].map(k=>`<button class="btn w" onclick="key('${k}')">${k}</button>`).join('')}
  <button class="btn w" onclick="key('B')">⌫</button><button class="btn w" onclick="key('C')">Clear</button></div>`;
 }else{
  $('#qbody').innerHTML=[1,2,3,4].map(o=>`<label class="opt"><input type="radio" name="o" ${q.a==o?'checked':''} onchange="setAns('${o}')"> <b>${'ABCD'[o-1]}.</b> Option (${o})</label>`).join('');
 }
 renderPal();
}
function key(k){
 const q=S.q[S.cur];let v=q.a;
 if(k==='B')v=v.slice(0,-1);else if(k==='C')v='';
 else if(k==='-')v=v.startsWith('-')?v.slice(1):'-'+v;
 else if(k==='.'){if(!v.includes('.'))v+='.'}else v+=k;
 setAns(v);$('#ans').value=v;
}
function renderPal(){
 const per=cfg.per,s=sub(S.cur),cnt=[0,0,0,0,0];
 S.q.forEach(q=>cnt[q.s]++);
 const L=['Not Visited','Not Answered','Answered','Marked for Review','Answered & Marked for Review (will be considered for evaluation)'];
 $('#leg').innerHTML=L.map((n,k)=>`<div><span class="pal st${k}" style="margin:0 6px 0 0;cursor:default;flex:none">${cnt[k]}</span>${n}</div>`).join('');
 let h='';for(let j=s*per;j<(s+1)*per;j++)h+=`<button class="pal st${S.q[j].s} ${j===S.cur?'cur':''}" onclick="go(${j})">${String(j%per+1).padStart(2,'0')}</button>`;
 $('#grid').innerHTML=h;
}

/* ---------- Submit ---------- */
function confirmSubmit(){
 const att=S.q.filter(q=>q.a!=='').length,mk=S.q.filter(q=>q.s>=3).length;
 modal(`<h3>Submit Test?</h3><table><tr><th>Total</th><th>Attempted</th><th>Unattempted</th><th>Marked for Review</th></tr>
 <tr><td>${N()}</td><td>${att}</td><td>${N()-att}</td><td>${mk}</td></tr></table><p>You cannot change answers after submitting.</p>
 <button class="btn r" onclick="finish()">Yes, Submit</button> <button class="btn w" onclick="closeM()">Cancel</button>`);
}
function finish(){
 clearInterval(timerId);closeM();S.done=true;S.rem=0;saveSess();saveHist();showRes();
}

/* ---------- Evaluation Engine ---------- */
function evaluate(){
 return S.q.map((q,i)=>{
  if(q.a==='')return{r:'Unattempted',m:0,c:''};
  let ok;const k=(S.key[i]||'').trim();
  if(S.mode==='B')ok=!!S.man[i];
  else{if(k==='')return{r:'No Key',m:0,c:''};
   const kk=isNum(i)?k:({A:'1',B:'2',C:'3',D:'4'}[k.toUpperCase()]||k);ok=q.a===kk||(isNum(i)?Math.abs(parseFloat(q.a)-parseFloat(kk))<0.01:(kk.length>1&&kk.includes(q.a)))}
  return ok?{r:'Correct',m:cfg.pos,c:k}:{r:'Incorrect',m:-(isNum(i)?cfg.negB:cfg.negA),c:k};
 });
}
function summary(){
 const E=evaluate(),per=cfg.per;
 const subs=SUB.map((n,k)=>{
  let c=0,w=0,u=0,m=0,t=0;
  for(let i=k*per;i<(k+1)*per;i++){const r=E[i].r;if(r==='Correct')c++;else if(r==='Incorrect')w++;else u++;m+=E[i].m;t+=S.q[i].t}
  return{n,c,w,u,m,t,acc:c+w?Math.round(c/(c+w)*100):0};
 });
 const tot=subs.reduce((a,x)=>({c:a.c+x.c,w:a.w+x.w,m:a.m+x.m}),{c:0,w:0,m:0});
 return{E,subs,score:tot.m,acc:tot.c+tot.w?Math.round(tot.c/(tot.c+tot.w)*100):0};
}
function saveHist(){
 const sm=summary(),h=Store.get('nta_hist',[]).filter(x=>x.id!==S.id);
 h.unshift({id:S.id,name:S.name,roll:S.roll,date:S.date,score:sm.score,max:N()*cfg.pos,
  subs:sm.subs.map(x=>({n:x.n,m:x.m,c:x.c,w:x.w,u:x.u})),resp:S.q.map(q=>q.a),type:S.type||'Test',s:S});
 Store.set('nta_hist',h.slice(0,30));
}

/* ---------- Results Workspace ---------- */
function showRes(){
 $('#land').hidden=true;$('#app').hidden=true;$('#res').hidden=false;drawRes();
}
function drawRes(){
 const per=cfg.per;let g='';
 for(let i=0;i<N();i++){
  const pre=i%per===0?`<div style="grid-column:1/-1;font-weight:bold;color:#337ab7">${SUB[sub(i)]}</div>`:'';
  g+=pre+(S.mode==='B'?`<label>${i+1} <input type="checkbox" ${S.man[i]?'checked':''} onchange="S.man[${i}]=this.checked" ${S.q[i].a===''?'disabled':''}> ✓</label>`
   :`<label>${i+1}<input type="text" value="${esc(S.key[i]||'')}" oninput="S.key[${i}]=this.value"></label>`);
 }
 $('#res').innerHTML=`<div class="card"><h2 style="margin-top:0">Results &amp; Evaluation – ${esc(S.name)}</h2>
 <p><b>Evaluation mode:</b> <select onchange="S.mode=this.value;drawRes()"><option value="A" ${S.mode==='A'?'selected':''}>A – Auto-match with answer key</option>
 <option value="B" ${S.mode==='B'?'selected':''}>B – Manual self-check</option></select></p>
 ${S.mode==='A'?`<textarea id="paste" rows="3" style="width:100%" placeholder="Paste key text (Q-number/answer pairs, or a plain list 1,4,2,3...)"></textarea>
 <button class="btn w" onclick="pasteKey()">Apply Pasted Key</button> <label class="btn o">Import Key from PDF<input type="file" accept="application/pdf" hidden onchange="keyPdf(this.files[0])"></label>`:'<p>Tick every attempted question you got correct.</p>'}
 <div class="kg" style="margin:10px 0">${g}</div>
 <button class="btn g" onclick="dash()">Evaluate</button> <button class="btn" onclick="dash();print()">Download Response Sheet (PDF)</button>
 <button class="btn w" onclick="location.reload()">Home</button></div><div id="dash"></div>`;
 if(S.key.length||S.mode==='B')dash();
}
function pasteKey(){applyKey($('#paste').value)}
function dash(){
 saveSess();saveHist();if(Store.get('nta_tok',''))cloud('push',true);
 const sm=summary(),max=N()*cfg.pos;
 const errs=sm.E.map((e,i)=>({e,i})).filter(x=>x.e.r==='Incorrect');
 $('#dash').innerHTML=`<div class="card"><h3 style="margin-top:0">Score: ${sm.score} / ${max} &nbsp; Accuracy: ${sm.acc}%</h3>
 <table><tr><th>Subject</th><th>Correct (+${cfg.pos})</th><th>Incorrect</th><th>Unattempted</th><th>Net Marks</th><th>Time</th><th>Accuracy</th></tr>
 ${sm.subs.map(x=>`<tr><td>${x.n}</td><td>${x.c}</td><td>${x.w}</td><td>${x.u}</td><td>${x.m}</td><td>${mm(x.t)}</td><td>${x.acc}%</td></tr>`).join('')}</table></div>
 <div class="card"><h3 style="margin-top:0">Error Analysis (negative marks)</h3>${errs.length?`<table><tr><th>Q</th><th>Subject</th><th>Your Answer</th><th>Correct Answer</th><th>Marks</th></tr>
 ${errs.map(({e,i})=>`<tr><td>${i+1}</td><td>${SUB[sub(i)]}</td><td>${esc(S.q[i].a)}</td><td>${S.mode==='B'?'—':esc(e.c)}</td><td>${e.m}</td></tr>`).join('')}</table>`:'None.'}</div>`;
 $('#report').innerHTML=`<h2>JEE (Main) Mock Examination – ${esc(S.type||'')} Response Sheet</h2>
 <p><b>Student:</b> ${esc(S.name)} &nbsp; <b>Roll:</b> ${esc(S.roll)} &nbsp; <b>Date:</b> ${esc(S.date)} &nbsp; <b>Paper:</b> ${esc(pdfName)}</p>
 <p><b>Final Score: ${sm.score} / ${max}</b> &nbsp; Accuracy: ${sm.acc}%</p>
 <table><tr><th>Q.No</th><th>Subject</th><th>Chosen</th><th>Correct</th><th>Time</th><th>Status</th><th>Marks</th></tr>
 ${sm.E.map((e,i)=>`<tr><td>${i+1}</td><td>${SUB[sub(i)]}</td><td>${esc(S.q[i].a)||'—'}</td><td>${S.mode==='B'?'—':esc(e.c)||'—'}</td><td>${mm(S.q[i].t)}</td><td>${e.r}</td><td>${e.m}</td></tr>`).join('')}</table>`;
 $('#report').insertAdjacentHTML('beforeend','<p style="font-size:11px;color:#888">Generated with JEE Mock CBT · suryansh1807</p>');
}

/* ---------- Answer-key PDF import ---------- */
function parseKey(t){
 const tk=t.split(/[\s,;|:]+/).filter(Boolean),n=N();
 if(tk.length<=n+2)return{k:tk.slice(0,n),n:tk.length};
 let best=[],bc=0;
 for(let s0=0;s0<tk.length;s0++){
  if(tk[s0]!=='1')continue;
  const k=[];let q=1,p=s0;
  while(q<=n&&p<tk.length){if(tk[p]===String(q)&&p+1<tk.length){k[q-1]=tk[p+1];p+=2;q++}else p++}
  if(q-1>bc){bc=q-1;best=k}if(bc>=n)break;
 }
 return{k:best,n:bc};
}
function applyKey(t){
 const r=parseKey(t);if(!r.n)return alert('No answer key found in that text.');
 S.key=Array.from({length:N()},(_,i)=>r.k[i]||'');
 const u=t.toUpperCase(),W={P:'PHYSICS',C:'CHEMISTRY',M:'MATHEMATICS'};
 const ix=['P','C','M'].map(c=>[c,u.indexOf(W[c])]).filter(x=>x[1]>=0).sort((a,b)=>a[1]-b[1]);
 if(ix.length===3&&SUB.length===3){setOrder(ix.map(x=>x[0]).join(''));S.order=cfg.order;Store.set('nta_cfg',cfg)}
 drawRes();dash();
 if(r.n<N())alert('Read '+r.n+' of '+N()+' answers – check the grid and fill any gaps.');
}
async function loadPdfJs(){
 if(window.pdfjsLib)return;
 const B='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
 await new Promise((ok,no)=>{const e=document.createElement('script');e.src=B+'pdf.min.js';e.onload=ok;e.onerror=no;document.head.appendChild(e)});
 const w=await (await fetch(B+'pdf.worker.min.js')).text();
 pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'text/javascript'}));
}
async function keyPdf(f){
 if(!f)return;
 try{
  await loadPdfJs();
  const d=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;let t='';
  for(let p=1;p<=Math.min(d.numPages,3);p++){
   t+=(await (await d.getPage(p)).getTextContent()).items.map(x=>x.str).join(' ')+' ';
   if(parseKey(t).n>=N())break;
  }
  applyKey(t);
 }catch(e){alert('Could not read the PDF (pdf.js needs internet once). Copy the key text from the PDF and paste it instead.')}
}
/* ---------- Cloud sync (GitHub Gist) + JSON backup ---------- */
const dump=()=>({cfg:Store.get('nta_cfg',{}),hist:Store.get('nta_hist',[]),sess:Store.get('nta_sess')});
function load(d){
 if(d.cfg)Store.set('nta_cfg',d.cfg);
 const m=new Map([...Store.get('nta_hist',[]),...(d.hist||[])].map(x=>[x.id,x]));
 Store.set('nta_hist',[...m.values()].sort((a,b)=>b.id-a.id));
 if(d.sess)Store.set('nta_sess',d.sess);
 location.reload();
}
function exportJ(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(dump())],{type:'application/json'}));a.download='jee_mock_backup.json';a.click()}
async function importJ(f){if(f)try{load(JSON.parse(await f.text()))}catch(e){alert('Invalid backup file')}}
async function cloud(dir,quiet){
 const tk=($('#s7')&&$('#s7').value.trim())||Store.get('nta_tok','');
 const say=m=>quiet||alert(m);
 if(!tk)return say('Add a GitHub token (gist scope) in Settings first.');
 Store.set('nta_tok',tk);
 const H={Authorization:'Bearer '+tk,Accept:'application/vnd.github+json'},G='https://api.github.com/gists';
 let id=Store.get('nta_gid','');
 try{
  if(dir==='push'){
   const r=await fetch(id?G+'/'+id:G,{method:id?'PATCH':'POST',headers:H,body:JSON.stringify({description:'JEE mock backup',public:false,files:{'nta_backup.json':{content:JSON.stringify(dump())}}})});
   const j=await r.json();if(!r.ok)throw j;Store.set('nta_gid',j.id);say('Pushed ✔  Gist ID (enter it on other devices when pulling): '+j.id);
  }else{
   id=prompt('Gist ID',id);if(!id)return;Store.set('nta_gid',id);
   const r=await fetch(G+'/'+id,{headers:H}),j=await r.json();if(!r.ok)throw j;
   load(JSON.parse(j.files['nta_backup.json'].content));
  }
 }catch(e){say('Cloud sync failed: '+(e.message||'check token / Gist ID'))}
}
addEventListener('keydown',e=>{
 if(S&&!S.done&&!$('#app').hidden&&$('#dlg').hidden&&!e.ctrlKey&&!e.metaKey&&!/^F\d+$/.test(e.key))e.preventDefault();
},true);
/* ---------- Landing / History ---------- */
const TYPES=[
 {n:'Full Mock',d:'Phy + Chem + Maths · 75 Q · 3 hrs',per:25,dur:180},
 {n:'Physics',d:'Single subject · 25 Q · 60 min',per:25,dur:60,o:'P'},
 {n:'Chemistry',d:'Single subject · 25 Q · 60 min',per:25,dur:60,o:'C'},
 {n:'Mathematics',d:'Single subject · 25 Q · 60 min',per:25,dur:60,o:'M'},
 {n:'Custom',d:'Set questions, time & order',custom:1}];
function pick(t){
 if(t.custom===1){window._cu=1;return settings()}
 if(!t.custom){cfg.per=t.per;cfg.dur=t.dur;setOrder(t.o||cfg.fo||'PCM')}
 window._t=t.n;const w=Store.get('nta_who',{n:'',r:''});
 Promise.race([IDB.get(),new Promise(r=>setTimeout(r,700))]).then(r=>modal(`<h3>${esc(t.n)} Test</h3><p class="mut">${SUB.join(' · ')} · ${N()} questions · ${cfg.dur} min</p><div class="f">
 <label>Student Name<input id="ln" value="${esc(w.n)}"></label><label>Roll No. / Test ID<input id="lr" value="${esc(w.r)}"></label>
 <label>Question paper (PDF)<input id="lf" type="file" accept="application/pdf"></label>
 ${r?`<small>Saved in this browser: <b>${esc(r.name)}</b> (used automatically – pick a file to replace it)</small>`:''}</div>
 <p><button class="btn g" onclick="start()">Start Test</button> <button class="btn w" onclick="closeM()">Cancel</button></p>`));
}
function openH(id){
 const r=Store.get('nta_hist',[]).find(x=>x.id===id);
 if(!r||!r.s)return alert('This older entry has no stored responses.');
 S=r.s;cfg.per=S.per;setOrder(S.order||'PCM');showRes();
}
function delH(id){if(confirm('Delete this test?')){Store.set('nta_hist',Store.get('nta_hist',[]).filter(x=>x.id!==id));home()}}
function count(el,to,suf){
 if(typeof requestAnimationFrame==='undefined'){el.textContent=to+suf;return}
 const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/900);el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+suf;if(p<1)requestAnimationFrame(f)})(t0);
}
function home(){
 const BD=['FULL','PHY','CHEM','MATH','⚙'],HU=[228,200,150,28,320];
 $('#types').innerHTML=TYPES.map((t,i)=>`<button class="tcard rv" style="--i:${i+2};--h:${HU[i]}" onclick="pick(TYPES[${i}])"><em class="bd">${BD[i]}</em><b>${t.n}</b><span>${t.d}</span><i class="go">Start →</i></button>`).join('');
 const ss=Store.get('nta_sess'),rb=$('#resumeBox');rb.hidden=!(ss&&!ss.done);
 if(!rb.hidden)rb.innerHTML=`<span>⏱ <b>Test in progress:</b> ${esc(ss.type||'Test')} – ${esc(ss.name)}</span><button class="pbtn" onclick="resume()">Resume</button><button class="gbtn" onclick="localStorage.removeItem('nta_sess');home()">Discard</button>`;
 const h=Store.get('nta_hist',[]),pc=x=>Math.max(0,Math.round(x.score/x.max*100)),SJ={};
 h.forEach(x=>x.subs.forEach(u=>{const a=SJ[u.n]=SJ[u.n]||{c:0,w:0};a.c+=u.c;a.w+=u.w}));
 const tot=Object.values(SJ).reduce((a,u)=>({c:a.c+u.c,w:a.w+u.w}),{c:0,w:0}),acc=tot.c+tot.w?Math.round(tot.c/(tot.c+tot.w)*100):0;
 const S4=[['Tests taken',h.length,''],['Best score',h.length?Math.max(...h.map(pc)):0,'%'],['Average score',h.length?Math.round(h.reduce((a,x)=>a+pc(x),0)/h.length):0,'%'],['Attempt accuracy',acc,'%']];
 $('#stats').innerHTML=S4.map((a,i)=>`<div class="gl st rv" style="--i:${i+1}"><b data-c="${a[1]}" data-s="${a[2]}">0${a[2]}</b><span>${a[0]}</span></div>`).join('');
 // trend chart + subject accuracy
 if(!h.length)$('#anl').innerHTML='<div class="empty" style="grid-column:1/-1">Your analytics appear here after your first test.</div>';
 else{
  const L=h.slice(0,10).reverse(),W=560,H=190,P=28,n=L.length,X=i=>P+(n>1?i*(W-2*P)/(n-1):(W-2*P)/2),Y=v=>H-P-v/100*(H-2*P);
  const pts=L.map((x,i)=>[X(i),Y(pc(x))]),d=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');
  const last=pc(h[0]),dl=h[1]?last-pc(h[1]):null;
  const sj=Object.entries(SJ).map(([k,u])=>[k,u.c+u.w?Math.round(u.c/(u.c+u.w)*100):0]).sort((a,b)=>b[1]-a[1]);
  $('#anl').innerHTML=`<div class="gl rv" style="--i:2"><h3>Score trend</h3><div class="mut">Last test ${last}%${dl===null?'':` · <span class="${dl>=0?'up':'dn'}">${dl>=0?'▲':'▼'} ${Math.abs(dl)} pts vs previous</span>`}</div>
   <svg class="tr" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c9cff" stop-opacity=".4"/><stop offset="1" stop-color="#7c9cff" stop-opacity="0"/></linearGradient>
   <linearGradient id="gl" x1="0" x2="1"><stop offset="0" stop-color="#6d8bff"/><stop offset="1" stop-color="#ff9a5a"/></linearGradient></defs>
   ${[0,50,100].map(v=>`<line x1="${P}" x2="${W-P}" y1="${Y(v)}" y2="${Y(v)}"/><text x="2" y="${Y(v)+4}">${v}</text>`).join('')}
   ${n>1?`<path class="ar" fill="url(#ga)" d="${d} L${pts[n-1][0]} ${H-P} L${pts[0][0]} ${H-P}Z"/><path class="ln" pathLength="1" d="${d}"/>`:''}
   ${pts.map((q,i)=>`<circle cx="${q[0]}" cy="${q[1]}" r="4.5"/><text x="${q[0]-9}" y="${q[1]-10}">${pc(L[i])}</text>`).join('')}</svg></div>
   <div class="gl rv" style="--i:3"><h3>Subject accuracy</h3><div class="mut">Correct ÷ attempted, all tests</div>
   ${sj.map(a=>`<div class="bar"><span>${a[0]}</span><i style="--w:${a[1]}%"></i><em>${a[1]}%</em></div>`).join('')}
   ${sj.length>1?`<div class="mut">Focus next on <b style="color:#fff">${sj[sj.length-1][0]}</b>.</div>`:''}</div>`;
 }
 $('#hist').innerHTML=h.length?h.map((x,i)=>{const p=pc(x),d=h[i+1]?p-pc(h[i+1]):null;
  return `<div class="gl trow rv" style="--i:${i+1}"><div class="ring" style="--p:${p}"><b>${p}%</b></div>
  <div class="tm"><b>${esc(x.type||'Test')}</b> <span class="mut">· ${esc(x.name)} · ${esc(x.date)}</span><div>${x.subs.map(u=>`<span class="chip">${u.n.slice(0,3)} ${u.m}</span>`).join('')}</div></div>
  <div class="sc">${x.score}/${x.max}${d===null?'':`<small class="${d>=0?'up':'dn'}">${d>=0?'▲':'▼'} ${Math.abs(d)}</small>`}</div>
  <div><button class="gbtn" onclick="openH(${x.id})">Analysis →</button> <button class="xb" title="Delete" onclick="delH(${x.id})">✕</button></div></div>`}).join(''):'<div class="empty">No tests yet – start one above.</div>';
 document.querySelectorAll('[data-c]').forEach(el=>count(el,+el.dataset.c,el.dataset.s));
 IDB.get().then(r=>{$('#paperInfo').innerHTML=r?`Saved paper: <b>${esc(r.name)}</b> · <a href="#" onclick="IDB.del().then(home);return false" style="color:#9db3ff">remove</a>`:''});
}
$('#land').addEventListener('mousemove',e=>{const c=e.target.closest&&e.target.closest('.tcard,.gl');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}});
home();