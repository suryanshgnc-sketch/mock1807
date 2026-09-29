/* mock1807: tests published from the Admin Portal */
'use strict';
(function(){
  const SUPABASE_URL='https://grgxaewilmfyvndkcfim.supabase.co';
  const SUPABASE_KEY='sb_publishable_aiJYxr3AYoeZHBXwIoXaaQ_gIfHxV2s';
  const BUCKET='test-pdfs';
  const $=s=>document.querySelector(s);
  let sb=null, tests=[], activeAttemptId=null, finishing=false;

  function esc2(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function parts(ms){ms=Math.max(0,ms);return {d:Math.floor(ms/86400000),h:Math.floor(ms%86400000/3600000),m:Math.floor(ms%3600000/60000),s:Math.floor(ms%60000/1000)}}
  function countdown(t){const p=parts(new Date(t.release_at).getTime()-Date.now());return `${p.d}d ${String(p.h).padStart(2,'0')}h ${String(p.m).padStart(2,'0')}m ${String(p.s).padStart(2,'0')}s`}
  function released(t){return new Date(t.release_at).getTime()<=Date.now()}
  function fmtDate(v){return new Date(v).toLocaleString([], {weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
  function style(){
    if(document.getElementById('backendTestStyles'))return;
    const s=document.createElement('style');s.id='backendTestStyles';s.textContent=`
      .backend-tests-section{margin:28px 0}.backend-tests-head{display:flex;justify-content:space-between;align-items:end;gap:18px;margin-bottom:14px}.backend-tests-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}.backend-test-card{position:relative;border:1px solid #2a2d33;background:linear-gradient(180deg,#15181d,#101216);border-radius:18px;padding:20px;overflow:hidden}.backend-test-card:before{content:"";position:absolute;inset:0;background:radial-gradient(500px 160px at 0% 0%,rgba(255,255,255,.055),transparent 65%);pointer-events:none}.backend-test-card h3{margin:7px 0 5px;color:#fff;font-size:20px}.backend-test-meta{color:#9a9da5;font-size:12px;line-height:1.65}.backend-test-count{margin:16px 0;padding:12px;border:1px solid #2a2d33;border-radius:12px;background:#0c0e11}.backend-test-count b{font-size:20px;color:#fff}.backend-test-card.released{border-color:#39423d}.backend-test-card.locked{opacity:.92}.backend-test-status{font-size:10px;font-weight:900;letter-spacing:.12em}.backend-test-status.open{color:#65d391}.backend-test-status.wait{color:#e4bf62}.backend-test-btn{width:100%;margin-top:12px;border:0;border-radius:11px;padding:12px;font-weight:800;cursor:pointer;background:#fff;color:#0a0c0f}.backend-test-btn.locked{background:#1a1d22;color:#9a9da5;border:1px solid #2a2d33}.backend-loading,.backend-empty{border:1px dashed #2a2d33;border-radius:16px;padding:28px;text-align:center;color:#9a9da5}.backend-error{border:1px solid #633039;background:#241417;border-radius:14px;padding:15px;color:#ffabb2}.backend-note{font-size:12px;color:#6f727a;margin-top:10px}@media(max-width:650px){.backend-tests-head{align-items:flex-start;flex-direction:column}}
    `;document.head.appendChild(s);
  }
  function container(){return $('#backendTests')}
  function render(){
    style(); const box=container(); if(!box)return;
    if(!tests.length){box.innerHTML='<div class="backend-empty">No tests have been published yet.<br><span class="backend-note">Create a test from the Admin Portal and it will appear here automatically.</span></div>';return}
    const sorted=[...tests].sort((a,b)=>new Date(a.release_at)-new Date(b.release_at));
    box.innerHTML=sorted.map(t=>{
      const r=released(t), disabled=t.enabled===false;
      const status=disabled?'DISABLED':r?'AVAILABLE':'UPCOMING';
      const btn=disabled?'Disabled':r?'Open Test →':'🔒 Opens in '+countdown(t);
      return `<article class="backend-test-card ${r?'released':'locked'}">
        <div class="backend-test-status ${r?'open':'wait'}">${status}</div>
        <h3>${esc2(t.name)}</h3>
        <div class="backend-test-meta">${esc2(t.description||'No description')}<br>${fmtDate(t.release_at)} · ${Number(t.duration_minutes)||180} min · ${Number(t.total_questions)||0} questions · ${Number(t.total_marks)||0} marks</div>
        <div class="backend-test-count">${r?'<b>Paper released</b><br><span class="backend-test-meta">Question paper · '+(Number(t.total_marks)||0)+' total marks</span>':`<b>${countdown(t.release_at)}</b><br><span class="backend-test-meta">The paper remains locked until release.</span>`}</div>
        <button class="backend-test-btn ${r?'':'locked'}" ${r&&!disabled?'':'disabled'} data-backend-test="${esc2(t.id)}">${btn}</button>
      </article>`;
    }).join('');
    box.querySelectorAll('[data-backend-test]').forEach(b=>b.addEventListener('click',()=>launch(Number(b.dataset.backendTest))));
  }
  async function load(){
    const box=container();if(!box)return;
    if(!sb){box.innerHTML='<div class="backend-error">Supabase could not load. Refresh the page.</div>';return}
    const {data:sessionData}=await sb.auth.getSession();
    if(!sessionData?.session){box.innerHTML='<div class="backend-empty">Sign in with Google to view tests published from the Admin Portal.</div>';return}
    const {data,error}=await sb.from('tests').select('id,name,description,release_at,duration_minutes,total_questions,total_marks,positive_marks,negative_mcq,negative_numerical,paper_url,enabled').eq('enabled',true).order('release_at',{ascending:true});
    if(error){box.innerHTML=`<div class="backend-error">Could not load tests: ${esc2(error.message)}</div>`;return}
    tests=data||[];render();
  }
  async function launch(id){
    const t=tests.find(x=>Number(x.id)===Number(id));if(!t)return;
    if(!released(t)){render();return alert(`This test opens at ${fmtDate(t.release_at)}.`)}
    const p=getProfile();if(!p.name){profileSetup(true);return}
    if(!t.paper_url)return alert('This test does not have a question paper attached yet.');
    try{
      const {data:sign,error}=await sb.storage.from(BUCKET).createSignedUrl(t.paper_url,60*60*8);
      if(error||!sign?.signedUrl)throw error||new Error('Could not open the question paper.');
      const total=Number(t.total_questions)||75;
      if(total%3!==0)throw new Error('This test has '+total+' questions. The current NTA CBT engine requires a total divisible by 3.');
      cfg.per=total/3;cfg.dur=Number(t.duration_minutes)||180;cfg.pos=Number(t.positive_marks??4);cfg.negA=Number(t.negative_mcq??1);cfg.negB=Number(t.negative_numerical??1);setOrder('PCM');window._t=t.name;
      closeM();
      if(pdfUrl)try{URL.revokeObjectURL(pdfUrl)}catch(e){}
      pdfUrl=sign.signedUrl;pdfName=t.name+' · Question Paper.pdf';
      S={id:Date.now(),type:t.name,name:p.name,photo:p.photo,roll:'',cur:0,done:false,mode:'A',key:[],man:[],date:new Date().toLocaleString(),per:cfg.per,order:'PCM',backendTestId:t.id,backendPaperPath:t.paper_url,maxMarks:Number(t.total_marks)||total*cfg.pos,positiveMarks:cfg.pos,negativeMcq:cfg.negA,negativeNumerical:cfg.negB,endAt:Date.now()+cfg.dur*60000,q:Array.from({length:total},()=>({a:'',s:0,t:0}))};
      S.q[0].s=1;begin();
      await createAttempt(t);
    }catch(e){alert(e.message||'Could not open this test.')}
  }
  async function createAttempt(t){
    activeAttemptId=null;
    try{
      const {data:{session}}=await sb.auth.getSession();if(!session)return;
      const {data,error}=await sb.from('attempts').insert({user_id:session.user.id,test_id:t.id,status:'in_progress',max_score:Number(t.total_marks)||((Number(t.total_questions)||0)*Number(t.positive_marks??4))}).select('id').single();
      if(error)throw error;activeAttemptId=data.id;S.backendAttemptId=data.id;saveSess();
    }catch(e){console.warn('Attempt could not be created:',e.message)}
  }
  async function finalizeAttempt(){
    if(!S?.backendAttemptId)return;
    const answers=S.q.map((q,i)=>({attempt_id:S.backendAttemptId,question_no:i+1,response:q.a||null,marked_for_review:q.s>=3,answered_at:q.a?new Date().toISOString():null}));
    try{
      const {error:ae}=await sb.from('answers').upsert(answers,{onConflict:'attempt_id,question_no'});if(ae)throw ae;
      const attempted=S.q.filter(q=>q.a!=='').length;
      const elapsed=Math.max(0,Math.round((cfg.dur*60000-(S.rem||0)*1000)/1000));
      const {error:ue}=await sb.from('attempts').update({status:'submitted',submitted_at:new Date().toISOString(),unanswered_count:S.q.length-attempted,time_taken_seconds:elapsed}).eq('id',S.backendAttemptId);
      if(ue)throw ue;
    }catch(e){console.warn('Could not save submitted attempt:',e.message)}
  }
  function patchFinish(){
    if(window.__backendFinishPatched)return;
    const original=window.finish; if(typeof original!=='function')return;
    window.finish=async function(){if(finishing)return;finishing=true;try{await finalizeAttempt()}finally{original();finishing=false}};
    window.__backendFinishPatched=true;
  }
  function startClock(){render();window.__backendClock&&clearInterval(window.__backendClock);window.__backendClock=setInterval(()=>{if(document.hidden)return;render()},1000)}
  async function resumeBackendTest(saved){
    try{
      const t=tests.find(x=>Number(x.id)===Number(saved.backendTestId));
      if(!t||!t.paper_url)throw new Error('The saved test paper could not be found.');
      const {data:sign,error}=await sb.storage.from(BUCKET).createSignedUrl(t.paper_url,60*60*8);
      if(error||!sign?.signedUrl)throw error||new Error('Could not reopen the question paper.');
      pdfUrl=sign.signedUrl;pdfName=t.name+' · Question Paper.pdf';
      cfg.per=(Number(t.total_questions)||75)/3;cfg.dur=Number(t.duration_minutes)||180;cfg.pos=Number(t.positive_marks??4);cfg.negA=Number(t.negative_mcq??1);cfg.negB=Number(t.negative_numerical??1);setOrder('PCM');
      begin();
    }catch(e){alert(e.message||'Could not reopen the saved test.');}
  }
  window.resumeBackendTest=resumeBackendTest;
  function init(){
    style();
    sb=window.mock1807Auth?.client || (window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null);
    if(!sb){setTimeout(init,200);return}
    const refresh=()=>load().catch(e=>console.error(e));
    const rb=$('#refreshBackendTests');if(rb)rb.addEventListener('click',refresh);
    sb.auth.onAuthStateChange(()=>setTimeout(refresh,0));
    patchFinish();
    load();startClock();
  }
  window.refreshBackendTests=load;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
