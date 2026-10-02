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
const PROFILE_KEY='nta_profile';
function getProfile(){return Store.get(PROFILE_KEY,{name:'',photo:''})}
function profileSetup(force=false){
 const u=window.mock1807Auth?.user||null, m=u?.user_metadata||{}, p=getProfile();
 const name=u?.email||p.name||'Candidate';
 const email=u?.email||''; const photo=m.avatar_url||m.picture||p.photo||'';
 const initials=String(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'M';
 modal(`<div class="account-shell account-modern">
   <div class="account-cover"><span>MDCCCVII / ACCOUNT</span><button class="account-close" onclick="closeM()" aria-label="Close">×</button></div>
   <div class="account-top account-profile-head">
     ${photo?`<img class="account-avatar" src="${esc(photo)}" alt="Profile photo">`:`<div class="account-avatar account-avatar-fallback">${esc(initials)}</div>`}
     <div class="account-ident"><div class="account-name">${esc(name)}</div><div class="account-email">${esc(email||'Signed-in account')}</div><span class="account-badge">${u?'Google account':'Local profile'}</span></div>
   </div>
   <div class="account-rows">
    <div class="account-row"><span class="row-icon">@</span><div><b>Email</b><small>${esc(email||'Not available')}</small></div></div>
    <div class="account-row"><span class="row-icon">✓</span><div><b>Candidate identity</b><small>This name is used on your test results and leaderboard.</small></div></div>
    <div class="account-row"><span class="row-icon">↗</span><div><b>Profile source</b><small>${u?'Synced from your signed-in Google account':'Stored locally on this device'}</small></div></div>
   </div>
   <div class="account-actions account-bottom"><button class="btn w" onclick="closeM();settings()">Settings</button><button class="btn g" onclick="closeM()">Done</button></div>
 </div>`);
}
function previewProfilePhoto(f){
 if(!f)return;
 const r=new FileReader();r.onload=()=>$('#photoPreview').innerHTML=`<img src="${r.result}" alt="Candidate photo">`;r.readAsDataURL(f);
}
function saveProfile(){
 return; /* names are locked: set by admin / equal to the account email */
 const name=$('#profileName').value.trim();
 if(!name)return alert('Please enter your name.');
 const p=getProfile();p.name=name;
 const f=$('#profilePhoto').files[0];
 const done=()=>{Store.set(PROFILE_KEY,p);closeM();home();};
 if(f){const r=new FileReader();r.onload=()=>{p.photo=r.result;done()};r.readAsDataURL(f)}else done();
}
let cfg={pos:4,negA:1,negB:1,dur:180,per:25,order:'PCM',fo:'PCM',...Store.get('nta_cfg',{})};
setOrder(cfg.order);let S=null,timerId=null,pdfUrl=null,pdfZoom=100,pdfName='Uploaded Paper';

/* ---------- Helpers ---------- */
const N=()=>cfg.per*SUB.length,sub=i=>Math.floor(i/cfg.per),isNum=i=>i%cfg.per>=cfg.per-5;
const saveSess=()=>{if(!S)return;if(!S.done)S.rem=Math.round((S.endAt-Date.now())/1000);Store.set('nta_sess',S)};
setInterval(saveSess,5000);addEventListener('beforeunload',e=>{saveSess();if(S&&!S.done){e.preventDefault();e.returnValue='Your test is still in progress. Are you sure you want to leave?';}});
addEventListener('keydown',e=>{if(!S||S.done)return;if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();nav(1)}else if(e.key==='ArrowLeft'){e.preventDefault();nav(-1)}else if(e.key.toLowerCase()==='m'){e.preventDefault();act('mr')}else if(e.key.toLowerCase()==='c'){e.preventDefault();act('cl')}});


/* ---------- Modal / Settings ---------- */
function modal(h){$('#dbox').innerHTML=h;$('#dlg').className='modal'+(S?'':' dk');$('#dlg').hidden=false}
function closeM(){$('#dlg').hidden=true}
function settings(){
 const theme=Store.get('md_theme','dark');
 modal(`<div class="settings-modern">
  <div class="settings-head"><div class="kicker">MDCCCVII / CONTROL CENTER</div><div class="settings-title-row"><div><h2>Settings</h2><p>Fine-tune your test workspace without touching your saved attempts.</p></div><button class="account-close" onclick="closeM()" aria-label="Close">×</button></div></div>
  <div class="settings-body">
   <div class="settings-section"><div class="settings-section-title"><span>01</span><div><b>Test experience</b><small>Scoring and exam defaults used by the local test engine.</small></div></div>
    <div class="settings-grid settings-grid-compact">
     <div class="settings-card"><label>Correct answer<input id="s1" type="number" min="0" step="0.5" value="${cfg.pos}"><small>Marks awarded</small></div>
     <div class="settings-card"><label>MCQ negative marking<input id="s2" type="number" min="0" step="0.5" value="${cfg.negA}"><small>Marks deducted</small></div>
     <div class="settings-card"><label>Numerical negative marking<input id="s3" type="number" min="0" step="0.5" value="${cfg.negB}"><small>Marks deducted</small></div>
     <div class="settings-card"><label>Duration · minutes<input id="s4" type="number" min="1" value="${cfg.dur}"><small>Default local duration</small></div>
     <div class="settings-card"><label>Questions / subject<input id="s5" type="number" min="6" value="${cfg.per}"><small>Used for custom/local tests</small></div>
     <div class="settings-card"><label>Subject order<select id="s6">${['PCM','MPC','PMC','CPM','CMP','MCP','P','C','M'].map(o=>`<option ${o===cfg.order?'selected':''}>${o}</option>`).join('')}</select><small>Physics · Chemistry · Mathematics</small></div>
    </div>
   </div>
   <div class="settings-section"><div class="settings-section-title"><span>02</span><div><b>Interface</b><small>Display preferences for the MDCCCVII workspace.</small></div></div>
    <div class="settings-preferences">
      <div class="pref-row"><div><b>Exam &amp; admin theme</b><small>Applies to the exam screen and the admin panel on this device.</small></div><button type="button" class="btn w" id="themeSwitch" onclick="toggleTheme()">${document.documentElement.dataset.theme==='light'?'☀ Light':'☾ Dark'}</button></div>
      <div class="pref-row"><div><b>Motion effects</b><small>Use subtle transitions and dashboard animations.</small></div><span class="toggle on"><i></i></span></div>
      <div class="pref-row"><div><b>Autosave</b><small>Your local session is periodically saved automatically.</small></div><span class="toggle on"><i></i></span></div>
    </div>
   </div>
   <div class="settings-section"><div class="settings-section-title"><span>03</span><div><b>Data & account</b><small>Move your local data between browsers or devices.</small></div></div>
    <div class="settings-data"><button class="btn w" onclick="exportJ()">Export data</button><label class="btn w">Import data<input type="file" accept=".json" hidden onchange="importJ(this.files[0])"></label><button class="btn w" onclick="profileSetup();">View profile</button></div>
   </div>
  </div>
  <div class="settings-footer"><span>Changes to scoring defaults do not modify submitted backend results.</span><div><button class="btn w" onclick="closeM()">Cancel</button><button class="btn g" onclick="saveCfg()">Save changes</button></div></div>
 </div>`);
}
function toggleTheme(){const n=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=n;Store.set('md_theme',n);const b=document.getElementById('themeSwitch');if(b)b.textContent=n==='light'?'☀ Light':'☾ Dark'}
function saveCfg(){
 const v=i=>Math.abs(parseFloat($('#s'+i).value))||0;
 cfg.pos=v(1);cfg.negA=v(2);cfg.negB=v(3);
 if(!(S&&!S.done)){cfg.dur=v(4)||180;cfg.per=Math.max(6,v(5)|0||25);setOrder($('#s6').value);if(S)S.order=cfg.order}
 Store.set('nta_cfg',cfg);closeM();if(S&&!S.done)render();
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
const KEYIDB={
 db:()=>new Promise((res,rej)=>{const r=indexedDB.open('nta_mock_keys',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=rej}),
 async set(v){try{(await this.db()).transaction('f','readwrite').objectStore('f').put(v,'key')}catch(e){}},
 async get(){try{const d=await this.db();return await new Promise(r=>{const q=d.transaction('f').objectStore('f').get('key');q.onsuccess=()=>r(q.result);q.onerror=()=>r()})}catch(e){}}
};
let keyPdfUrl=null,keyPdfName='Answer Key PDF';
async function restoreKeyPdf(){const r=await KEYIDB.get();if(r&&r.blob){keyPdfUrl=URL.createObjectURL(r.blob);keyPdfName=r.name}}
function showKeyPdf(f){if(!f)return;if(keyPdfUrl)URL.revokeObjectURL(keyPdfUrl);keyPdfUrl=URL.createObjectURL(f);keyPdfName=f.name;KEYIDB.set({blob:f,name:f.name});drawRes()}
function manualSet(i,v){S.man=S.man||[];S.man[i]=v;S.q[i].manual=v;drawRes();dash()}
function manualAll(v){S.man=S.man||[];S.q.forEach((q,i)=>{if(q.a!=='')S.man[i]=v});drawRes();dash()}
function jumpResult(i){const el=document.getElementById('resp-'+i);if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}
function loadPdf(f){if(!f)return;IDB.set({blob:f,name:f.name});if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=URL.createObjectURL(f);pdfName=f.name;pdfView()}
function pdfView(){
 if(!pdfUrl)return;
 const page=Math.max(1,Number($('#pg')?.value||1));
 $('#zl').textContent=pdfZoom+'%';
 const pn=$('#paperName');if(pn)pn.textContent=pdfName||'Question Paper';
 $('#pdf').innerHTML=`<iframe class="pdf-frame" src="${pdfUrl}#page=${page}&zoom=${pdfZoom}" title="Question paper"></iframe><div class="pdf-fallback">Paper not showing? <button type="button" onclick="pdfView()">Reload</button><button type="button" onclick="openPaper()">Open in new tab</button></div>`;
}
function zoom(d){pdfZoom=Math.min(300,Math.max(50,pdfZoom+d));pdfView()}
function fitPaper(){pdfZoom=100;pdfView()}
function openPaper(){if(!pdfUrl)return alert('Question paper is not loaded yet.');window.open(pdfUrl,'_blank','noopener')}


/* ---------- Test lifecycle ---------- */
function start(){
 const p=getProfile(), testName=$('#testName').value.trim();
 if(!p.name)return profileSetup(true);
 if(!testName)return alert('Please enter a test name.');
 if($('#lf').files[0])loadPdf($('#lf').files[0]);
 closeM();
 S={id:Date.now(),type:testName,name:p.name,photo:p.photo,roll:'',cur:0,done:false,mode:'A',key:[],man:[],date:new Date().toLocaleString(),
  per:cfg.per,order:cfg.order,endAt:Date.now()+cfg.dur*60000,q:Array.from({length:N()},()=>({a:'',s:0,t:0}))};
 S.q[0].s=1;begin();
}
function resume(){
 S=Store.get('nta_sess');if(!S)return;
 cfg.per=S.per;cfg.pos=Number(S.positiveMarks??cfg.pos);cfg.negA=Number(S.negativeMcq??cfg.negA);cfg.negB=Number(S.negativeNumerical??cfg.negB);setOrder(S.order||'PCM');
 if(S.done)return showRes();
 if(!S.serverExpiresAt) S.endAt=Date.now()+S.rem*1000;
 if(S.backendTestId && typeof window.resumeBackendTest==='function') window.resumeBackendTest(S);
 else begin();
}
function begin(){
 // For server-backed CBT attempts, the backend expiry timestamp is authoritative.
 if(S && S.serverExpiresAt){const __exp=Date.parse(S.serverExpiresAt);if(Number.isFinite(__exp))S.endAt=__exp;}
 $('#land').hidden=true;$('#res').hidden=true;$('#app').hidden=false;
 $('#cn').textContent=S.name;$('#cr').textContent=S.roll||'—'; const av=$('#candidatePhoto'); if(av)av.src=S.photo||'';
 clearInterval(timerId);timerId=setInterval(tick,1000);tick();render();if(pdfUrl)pdfView();else restorePdf();
 try{document.documentElement.requestFullscreen()}catch(e){}
}
function tick(){
 if(!S||S.done)return;
 const rem=Math.max(0,Math.round((S.endAt-Date.now())/1000)),t=$('#timer');
 if(t){t.textContent=fmt(rem);t.className=rem<300?'rd':rem<1800?'or':'';}
 S.rem=rem;
 if(S.q[S.cur])S.q[S.cur].t++;
 if(rem%5===0)saveSess();
 if(rem<=0){finish()}
}
function go(i){
 const q=S.q[S.cur];if(q.a!==''&&q.s<2)q.s=2;saveSess();
 S.cur=i;if(S.q[i].s===0)S.q[i].s=1;render();
}
function act(a){
 const q=S.q[S.cur],has=q.a!=='';
 if(a==='cl'){q.a='';q.s=1;return render()}
 q.s=a==='sn'?(has?2:1):(has?4:3);
 if(S.cur<N()-1)go(S.cur+1);else render();
}
function nav(d){const i=S.cur+d;if(i>=0&&i<N())go(i)}
let __syncDebounce=0;function setAns(v){S.q[S.cur].a=v;if(S.q[S.cur].s<2)S.q[S.cur].s=2;saveSess();renderPal();updateResponseState();if(window.syncBackendNow){clearTimeout(__syncDebounce);__syncDebounce=setTimeout(()=>window.syncBackendNow(),650)}}

/* ---------- Renderers ---------- */
function render(){
 const i=S.cur,q=S.q[i],s=sub(i),per=cfg.per,nA=per-5,answered=S.q.filter(x=>x.a!=='').length;
 $('#tabs').innerHTML=SUB.map((n,k)=>`<button class="tab ${k===s?'on':''}" onclick="go(${k*per})">${n}</button>`).join('');
 $('#badge').textContent=isNum(i)?`SECTION B · NUMERICAL ${nA+1}–${per}`:`SECTION A · MCQ 1–${nA}`;
 $('#sn').textContent=SUB[s];
 const local=i%per+1,total=N();
 const qh=$('#qh');if(qh)qh.textContent=`Question No. ${local}`;
 const qc=$('#qCounter');if(qc)qc.textContent=String(local).padStart(2,'0');
 const qt=$('#qTotal');if(qt)qt.textContent=total;
 const pt=$('#progressText');if(pt)pt.textContent=`${answered} / ${total} answered`;
 const pb=$('#progressBar');if(pb)pb.style.width=(answered/Math.max(1,total)*100)+'%';
 const lt=$('#liveTestName');if(lt)lt.textContent=S.type||'LIVE TEST';
 const pn=$('#paperName');if(pn)pn.textContent=pdfName||'Question Paper';
 if(isNum(i)){
  $('#qbody').innerHTML=`<div class="response-prompt"><strong>Numerical response</strong><br>Enter the value exactly as required by the question paper. Use the keypad or your keyboard.</div><div class="nta-num-wrap">
    <div class="num-label">Your answer</div>
    <input id="ans" class="nta-num-input" value="${esc(q.a)}" inputmode="decimal" autocomplete="off" aria-label="Numerical answer" placeholder="Enter numerical value">
    <div class="nta-keypad">${['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>`<button type="button" onclick="key('${k==='⌫'?'B':k}')">${k}</button>`).join('')}<button type="button" class="clear-key" onclick="key('C')">Clear response</button></div>
    <div class="response-note">Marking: +${cfg.pos} for correct · −${cfg.negB} for incorrect.</div>
  </div>`;
  const ai=$('#ans');ai.oninput=()=>{const v=ai.value.replace(/[^0-9.]/g,'').replace(/(\..*)\./g,'$1').slice(0,12);ai.value=v;setAns(v)};
 }else{
  $('#qbody').innerHTML=`<div class="response-prompt"><strong>Choose one answer.</strong><br>Use the question paper on the left to read the question and options.</div><div class="mcq-grid">${['A','B','C','D'].map((letter,idx)=>{const v=idx+1;return `<button type="button" class="mcq-btn ${q.a==v?'selected':''}" onclick="setAns('${v}')"><span class="mcq-letter">${letter}</span> ${q.a==v?'Selected':'Select option '+letter}</button>`}).join('')}</div><div class="response-note">Marking: +${cfg.pos} for correct · −${cfg.negA} for incorrect.</div>`;
 }
 renderPal();
}
function updateResponseState(){
 const q=S?.q?.[S.cur];if(!q)return;
 const btns=document.querySelectorAll('.mcq-btn');btns.forEach((b,i)=>{const selected=q.a===String(i+1);b.classList.toggle('selected',selected);b.querySelector('.mcq-letter')?.classList.toggle('selected',selected);b.lastChild.textContent=selected?'Selected':'Select option '+['A','B','C','D'][i]});
 const pt=$('#progressText');if(pt)pt.textContent=`${S.q.filter(x=>x.a!=='').length} / ${N()} answered`;const pb=$('#progressBar');if(pb)pb.style.width=(S.q.filter(x=>x.a!=='').length/Math.max(1,N())*100)+'%';
}
function key(k){
 const q=S.q[S.cur];let v=q.a||'';
 if(k==='B')v=v.slice(0,-1);
 else if(k==='C')v='';
 else if(k==='.') { if(!v.includes('.')) v=(v||'0')+'.'; }
 else v+=k;
 v=v.slice(0,12);
 setAns(v);
 const el=$('#ans');if(el)el.value=v;
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
  if(S.mode==='B'){if(S.man[i]===undefined)return{r:'No Key',m:0,c:''};ok=S.man[i]===true;}
  else{if(k==='')return{r:'No Key',m:0,c:''};
   const kk=isNum(i)?k:({A:'1',B:'2',C:'3',D:'4'}[k.toUpperCase()]||k);ok=isNum(i)?(Number.isFinite(parseFloat(q.a))&&Number.isFinite(parseFloat(kk))&&Math.abs(parseFloat(q.a)-parseFloat(kk))<1e-9):(q.a===kk)}
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
 h.unshift({id:S.id,name:S.name,roll:S.roll,date:S.date,score:sm.score,max:Number(S.maxMarks||N()*cfg.pos),
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
  const q=S.q[i],v=S.key[i]||'',m=S.man&&S.man[i];
  const pre=i%per===0?`<div class="subject-divider">${SUB[sub(i)]}</div>`:'';
  if(S.mode==='B') g+=pre+`<div class="resp-row ${q.a===''?'muted':''}" id="resp-${i}"><b>Q${i%per+1}</b><span>Your answer: <strong>${q.a===''?'—':esc(q.a)}</strong></span><span class="manual-state ${m===true?'ok':m===false?'bad':''}">${m===true?'Correct':m===false?'Incorrect':'Not checked'}</span><button class="mini ${m===true?'sel':''}" onclick="manualSet(${i},true)" ${q.a===''?'disabled':''}>✓ Correct</button><button class="mini ${m===false?'sel bad':''}" onclick="manualSet(${i},false)" ${q.a===''?'disabled':''}>✕ Wrong</button></div>`;
  else {
   const ev=v?evaluate()[i]:null;
   const status=ev?.r||'Awaiting key';
   const cls=status==='Correct'?'ok':status==='Incorrect'?'bad':status==='No Key'?'pending':'';
   g+=pre+`<div class="match-row" id="resp-${i}"><span class="qno">${String(i%per+1).padStart(2,'0')}</span><span class="qtype">${isNum(i)?'NUM':'MCQ'}</span><span><small>Your answer</small><strong>${q.a===''?'—':esc(q.a)}</strong></span><span><small>Answer key</small><strong>${v?esc(v):'—'}</strong></span><span class="match-status ${cls}">${status==='Correct'?'✓ Correct':status==='Incorrect'?'✕ Incorrect':'• '+status}</span></div>`;
  }
 }
 const loaded=S.key.length===N();
 const keyText=S.key.join(',');
 $('#res').innerHTML=`<div class="results-shell">
 <div class="result-top"><div><span class="pill">POST-TEST WORKSPACE</span><h1>Response Sheet &amp; Evaluation</h1><p class="mut">${esc(S.name)} · ${esc(S.type||'Test')} · ${esc(S.date)}</p></div><button class="btn w" onclick="goHome()">Home</button></div>
 <div class="check-choice">
  <button class="check-card ${S.mode==='A'?'active':''}" onclick="S.mode='A';drawRes()"><span>⚡</span><b>Automatic Checking</b><small>Paste one comma-separated key. A/B/C/D and 1/2/3/4 are both accepted.</small></button>
  <button class="check-card ${S.mode==='B'?'active':''}" onclick="S.mode='B';drawRes()"><span>▣</span><b>Manual Checking</b><small>Upload the answer-key PDF and verify responses beside it.</small></button>
 </div>
 ${S.mode==='A'?`<div class="check-panel"><div class="key-panel-head"><div><h3>Automatic answer-key entry</h3><p class="mut">Enter exactly ${N()} answers, separated by commas. Spaces are optional. Example: <b>1,1,2,3,3,4,...,3.43</b></p></div><span class="key-count ${loaded?'ready':''}">${S.key.length}/${N()} loaded</span></div>
 <textarea id="paste" rows="3" spellcheck="false" autocomplete="off" placeholder="1,1,2,3,3,4,1,2,3,4,...,3.43">${esc(keyText)}</textarea>
 <div class="key-actions"><button class="btn g" onclick="pasteKey()">${loaded?'Refresh Matching':'Apply Answer Key'}</button><button class="btn w" onclick="clearKey()">Clear Key</button><span id="keyMessage" class="mut"></span></div></div>
 <div class="match-table"><div class="match-head"><span>Q</span><span>Type</span><span>Your response</span><span>Official key</span><span>Match</span></div>${g}</div>`:
 `<div class="manual-workspace"><section class="manual-responses"><div class="verify-head"><b>Your Responses</b><span>Mark each attempted answer</span></div><div class="manual-list">${g}</div></section>
 <section class="manual-key"><div class="verify-head"><b>Official Answer Key</b><label class="btn o">Upload Answer-Key PDF<input type="file" accept="application/pdf" hidden onchange="showKeyPdf(this.files[0])"></label></div>
 ${keyPdfUrl?`<embed class="key-frame" type="application/pdf" src="${keyPdfUrl}#page=1&zoom=page-width">`:`<div class="pdf-empty"><b>No answer-key PDF uploaded</b><br>Upload the official answer-key PDF to view it here.</div>`}</section></div>
 <div class="manual-toolbar"><button class="btn w" onclick="manualAll(true)">Mark all attempted correct</button><button class="btn r" onclick="manualAll(false)">Mark all attempted wrong</button></div>`}
 <div class="result-actions"><button class="btn g" onclick="dash()">Evaluate &amp; Analyse</button><button class="btn" onclick="downloadReport()">Download Response Sheet (PDF)</button></div><div id="dash"></div></div>`;
 if(S.key.length||S.mode==='B')dash();
}
function clearKey(){S.key=[];drawRes()}
function downloadReport(){dash();const w=window.open('','_blank');if(!w)return print();w.document.write(`<html><head><title>JEE Response Sheet</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #aaa;padding:5px}th{background:#eee}.head{display:flex;justify-content:space-between}</style></head><body>${$('#report').innerHTML}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300)}
function pasteKey(){applyKey($('#paste').value)}
function dash(){
 saveSess();saveHist();if(Store.get('nta_tok',''))cloud('push',true);
 const sm=summary(),max=Number(S.maxMarks||N()*cfg.pos);
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
 $('#report').insertAdjacentHTML('beforeend','<p style="font-size:11px;color:#888">Generated with MDCCCVII Tests</p>');
}

/* ---------- Answer-key PDF import ---------- */
function normalizeKeyToken(token){
 const x=String(token||'').trim().toUpperCase();
 return ({A:'1',B:'2',C:'3',D:'4'})[x]||x;
}
function parseKey(t){
 const raw=String(t||'').trim();
 if(!raw)return {k:[],n:0,error:'Answer key is empty.'};
 const tokens=raw.split(',').map(x=>x.trim()).filter(x=>x!=='');
 if(tokens.length!==N())return {k:tokens,n:tokens.length,error:`Expected exactly ${N()} comma-separated answers, but found ${tokens.length}.`};
 const k=tokens.map(normalizeKeyToken);
 const bad=[];
 k.forEach((x,i)=>{
   if(!x)return bad.push(i+1);
   if(!isNum(i)&&!['1','2','3','4'].includes(x))bad.push(i+1);
   if(isNum(i)&&!/^[-+]?\d+(?:\.\d+)?$/.test(x))bad.push(i+1);
 });
 return {k,n:k.length,error:bad.length?`Invalid answer format at question(s): ${bad.join(', ')}.`:''};
}
function applyKey(t){
 const r=parseKey(t),msg=$('#keyMessage');
 if(r.error){if(msg){msg.textContent=r.error;msg.style.color='#c62828'}return false}
 S.key=r.k;
 if(msg){msg.textContent=`✓ ${r.n} answers loaded. Ready to evaluate.`;msg.style.color='#197a3b'}
 drawRes();return true;
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
  if(keyPdfUrl)URL.revokeObjectURL(keyPdfUrl);keyPdfUrl=URL.createObjectURL(f);keyPdfName=f.name;KEYIDB.set({blob:f,name:f.name});
  await loadPdfJs();
  const d=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;let t='';
  for(let p=1;p<=d.numPages;p++){
   t+=(await (await d.getPage(p)).getTextContent()).items.map(x=>x.str).join(' ')+' ';
  }
  applyKey(t);
 }catch(e){drawRes();alert('PDF loaded for side-by-side checking, but automatic text extraction failed. You can still verify it manually on the right.')}
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

/* ---------- Scheduled tests are rendered by js/backend-tests.js ---------- */
/* ---------- Landing / History ---------- */
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
 const p=getProfile();
 const pb=$('#profileBanner'),profileChipEl=$('#profileChip');
 if(profileChipEl){const u=window.mock1807Auth?.user,m=u?.user_metadata||{},nm=u?.email||p.name||'';const ph=m.avatar_url||m.picture||p.photo||'';const ini=esc(String(nm).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'M');profileChipEl.innerHTML=nm?`<span class="profile-chip">${ph?`<img src="${esc(ph)}" alt="">`:`<span class="profile-fallback">${ini}</span>`}</span>`:'';}
 if(pb)pb.innerHTML=p.name?`<div class="profile-mini">${p.photo?`<img src="${p.photo}" alt="">`:'<span class="avatar-fallback">N</span>'}<div><b>${esc(p.name)}</b><span>Candidate profile saved · reused automatically in every test</span></div><button class="gbtn" onclick="profileSetup()">Edit</button></div>`:`<div class="profile-mini"><span class="avatar-fallback">?</span><div><b>Set up your candidate profile</b><span>Your name is asked once and reused for every test.</span></div><button class="pbtn" onclick="profileSetup()">Set up</button></div>`;
 const ss=Store.get('nta_sess'),rb=$('#resumeBox');rb.hidden=!(ss&&!ss.done);
 if(!rb.hidden)rb.innerHTML=`<span>⏱ <b>Test in progress:</b> ${esc(ss.type||'Test')} – ${esc(ss.name)}</span><button class="pbtn" onclick="resume()">Resume</button><button class="gbtn" onclick="localStorage.removeItem('nta_sess');home()">Discard</button>`;
 const h=Store.get('nta_hist',[]),pc=x=>Math.max(0,Math.round(x.score/x.max*100)),SJ={};
 h.forEach(x=>x.subs.forEach(u=>{const a=SJ[u.n]=SJ[u.n]||{c:0,w:0};a.c+=u.c;a.w+=u.w}));
 const tot=Object.values(SJ).reduce((a,u)=>({c:a.c+u.c,w:a.w+u.w}),{c:0,w:0}),acc=tot.c+tot.w?Math.round(tot.c/(tot.c+tot.w)*100):0;
 const S4=[['Tests taken',h.length,''],['Best score',h.length?Math.max(...h.map(pc)):0,'%'],['Average score',h.length?Math.round(h.reduce((a,x)=>a+pc(x),0)/h.length):0,'%'],['Attempt accuracy',acc,'%']];
 $('#stats').innerHTML=S4.map((a,i)=>`<div class="gl st rv" style="--i:${i+1}"><b data-c="${a[1]}" data-s="${a[2]}">0${a[2]}</b><span>${a[0]}</span></div>`).join('');
 // trend chart + subject accuracy
 if(!h.length)$('#anl').innerHTML='<div class="empty" style="grid-column:1/-1">Your performance analytics will appear here after your first test.</div>';
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
  <div><button class="gbtn" onclick="openH(${x.id})">Analysis →</button> <button class="xb" title="Delete" onclick="delH(${x.id})">✕</button></div></div>`}).join(''):'<div class="empty">No attempts yet. Your results will appear here after you complete a test.</div>';
 document.querySelectorAll('[data-c]').forEach(el=>count(el,+el.dataset.c,el.dataset.s));
 IDB.get().then(r=>{$('#paperInfo').innerHTML=r?`Saved paper: <b>${esc(r.name)}</b> · <a href="#" onclick="IDB.del().then(home);return false" style="color:#9db3ff">remove</a>`:''});
}
$('#land').addEventListener('mousemove',e=>{const c=e.target.closest&&e.target.closest('.tcard,.gl');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}});
home();