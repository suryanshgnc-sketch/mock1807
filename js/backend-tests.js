/* Scheduled test series: cards, countdowns and launch */
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
  function style(){}
  function container(){return $('#backendTests')}
  function render(){
    const box=container(); if(!box)return;
    if(!tests.length){box.innerHTML='<div class="bt-empty"><b style="color:#e6ebf5">No tests scheduled yet</b><br>New tests will appear here as soon as they are announced.</div>';return}
    const sorted=[...tests].sort((a,b)=>(released(b)-released(a))||(new Date(a.release_at)-new Date(b.release_at)));
    box.innerHTML=sorted.map(t=>{
      const r=released(t), q=Number(t.total_questions)||0, m=Number(t.total_marks)||0, d=Number(t.duration_minutes)||180;
      return `<article class="bt-card">
        <div class="bt-top"><span class="bt-pill ${r?'live':''}">${r?'Available':'Upcoming'}</span><span class="bt-date">${fmtDate(t.release_at)}</span></div>
        <h3>${esc2(t.name)}</h3>
        ${t.description?`<p class="bt-desc">${esc2(t.description)}</p>`:''}
        <div class="bt-meta"><div><small>Duration</small><b>${d} min</b></div><div><small>Questions</small><b>${q}</b></div><div><small>Marks</small><b>${m}</b></div></div>
        ${r?'':`<div class="bt-count">Opens in<b>${countdown(t)}</b></div>`}
        <button class="bt-btn" ${r?'':'disabled'} data-backend-test="${esc2(t.id)}">${r?'Start test':'Not yet available'}</button>
      </article>`;
    }).join('');
    box.querySelectorAll('[data-backend-test]').forEach(b=>b.addEventListener('click',()=>launch(Number(b.dataset.backendTest))));
  }
  async function load(){
    const box=container();if(!box)return;
    if(!sb){box.innerHTML='<div class="bt-error">Unable to connect right now. Please refresh the page.</div>';return}
    const {data:sessionData}=await sb.auth.getSession();
    if(!sessionData?.session){box.innerHTML='<div class="bt-empty">Sign in to view your upcoming tests.</div>';return}
    const {data,error}=await sb.from('tests').select('id,name,description,release_at,duration_minutes,total_questions,total_marks,positive_marks,negative_mcq,negative_numerical,paper_url,enabled').eq('enabled',true).order('release_at',{ascending:true});
    if(error){console.error(error);box.innerHTML=`<div class="bt-error">We could not load the tests. Please try again in a moment.</div>`;return}
    tests=data||[];render();
  }
  async function launch(id){
    const t=tests.find(x=>Number(x.id)===Number(id));if(!t)return;
    if(!released(t)){render();return alert(`This test opens at ${fmtDate(t.release_at)}.`)}
    const p=getProfile();if(!p.name){profileSetup(true);return}
    if(!t.paper_url)return alert('The question paper for this test is not available yet. Please check back shortly.');
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
