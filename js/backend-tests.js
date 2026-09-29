/* Scheduled test series: cards, countdowns and launch */
'use strict';
(function(){
  const SUPABASE_URL='https://grgxaewilmfyvndkcfim.supabase.co';
  const SUPABASE_KEY='sb_publishable_aiJYxr3AYoeZHBXwIoXaaQ_gIfHxV2s';
  const BUCKET='test-pdfs';
  const $=s=>document.querySelector(s);
  let sb=null, tests=[], activeAttemptId=null, finishing=false, syncTimer=null;

  function esc2(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function parts(ms){ms=Math.max(0,ms);return {d:Math.floor(ms/86400000),h:Math.floor(ms%86400000/3600000),m:Math.floor(ms%3600000/60000),s:Math.floor(ms%60000/1000)}}
  function countdown(t){const p=parts(new Date(t.release_at).getTime()-Date.now());return `${p.d}d ${String(p.h).padStart(2,'0')}h ${String(p.m).padStart(2,'0')}m ${String(p.s).padStart(2,'0')}s`}
  function released(t){return new Date(t.release_at).getTime()<=Date.now()}
  function fmtDate(v){return new Date(v).toLocaleString([], {weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
  function style(){}
  function container(){return $('#backendTests')}
  function tz(v){return new Date(v).toLocaleString([], {weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'})}
  function tiles(ms){const p=parts(ms);return [['d',p.d,'Days'],['h',p.h,'Hrs'],['m',p.m,'Min'],['s',p.s,'Sec']].map(([k,v,l])=>`<div><b data-u="${k}">${String(v).padStart(2,'0')}</b><small>${l}</small></div>`).join('')}
  function calLink(t){const s=new Date(t.release_at),e=new Date(s.getTime()+(Number(t.duration_minutes)||180)*60000),f=d=>d.toISOString().replace(/[-:]|\.\d{3}/g,'');return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(t.name)+'&dates='+f(s)+'/'+f(e)+'&details='+encodeURIComponent('MDCCCVII Tests - starts at the scheduled time.')}
  function card(t){
    const r=released(t),q=Number(t.total_questions)||0,m=Number(t.total_marks)||0,d=Number(t.duration_minutes)||180;
    return `<article class="bt-card ${r?'is-live':''}">
      <div class="bt-top"><span class="bt-pill ${r?'live':''}">${r?'Live now':'Upcoming'}</span><span class="bt-date">${tz(t.release_at)}</span></div>
      <h3>${esc2(t.name)}</h3>${t.description?`<p class="bt-desc">${esc2(t.description)}</p>`:''}
      <div class="bt-meta"><div><small>Duration</small><b>${d} min</b></div><div><small>Questions</small><b>${q}</b></div><div><small>Marks</small><b>${m}</b></div></div>
      ${r?'':`<div class="cd" data-cd="${esc2(t.id)}"><span>Opens in</span><div class="cd-t">${tiles(new Date(t.release_at)-Date.now())}</div></div>`}
      <button class="bt-btn" ${r?'':'disabled'} data-backend-test="${esc2(t.id)}">${r?'Start test':'Locked until start time'}</button>
      ${r?'':`<a class="bt-cal" href="${calLink(t)}" target="_blank" rel="noopener">+ Add to calendar</a>`}
    </article>`}
  function render(){
    const box=container(); if(!box)return;
    if(!tests.length){box.innerHTML='<div class="bt-empty"><b>No tests scheduled yet</b><br>New tests appear here the moment they are announced. If you were told a test is live and nothing shows, refresh, or contact support.</div>';return}
    const up=tests.filter(t=>!released(t)).sort((a,b)=>new Date(a.release_at)-new Date(b.release_at));
    const live=tests.filter(released).sort((a,b)=>new Date(b.release_at)-new Date(a.release_at));
    const nx=up[0];
    const feat=nx?`<article class="nt"><div><span class="bt-pill">Next up</span><h3>${esc2(nx.name)}</h3><p>${tz(nx.release_at)} · ${Number(nx.duration_minutes)||180} min · ${Number(nx.total_questions)||0} questions · ${Number(nx.total_marks)||0} marks</p><a class="bt-cal" href="${calLink(nx)}" target="_blank" rel="noopener">+ Add to calendar</a></div><div class="cd" data-cd="${esc2(nx.id)}"><span>Opens in</span><div class="cd-t big">${tiles(new Date(nx.release_at)-Date.now())}</div></div></article>`:'';
    box.innerHTML=feat+live.map(card).join('')+up.slice(1).map(card).join('');
    box.querySelectorAll('[data-backend-test]').forEach(b=>b.addEventListener('click',()=>launch(Number(b.dataset.backendTest))));
  }
  function tick(){
    const box=container();if(!box)return;let flip=false;
    box.querySelectorAll('[data-cd]').forEach(el=>{const t=tests.find(x=>String(x.id)===el.dataset.cd);if(!t)return;const ms=new Date(t.release_at)-Date.now();if(ms<=0){flip=true;return}
      const p=parts(ms);['d','h','m','s'].forEach(k=>{const n=el.querySelector('[data-u="'+k+'"]'),v=String(p[k]).padStart(2,'0');if(n&&n.textContent!==v)n.textContent=v})});
    if(flip)render()}
  async function load(){
    const box=container();if(!box)return;
    if(!sb){box.innerHTML='<div class="bt-error">Unable to connect right now. Please refresh the page.</div>';return}
    const {data:sessionData}=await sb.auth.getSession();
    if(!sessionData?.session){box.innerHTML='<div class="bt-empty">Please sign in to see scheduled tests.</div>';return}
    const {data,error}=await sb.from('tests').select('id,name,description,release_at,duration_minutes,total_questions,total_marks,positive_marks,negative_mcq,negative_numerical,paper_url,enabled').eq('enabled',true).order('release_at',{ascending:true});
    if(error){console.error(error);box.innerHTML=`<div class="bt-error">We could not load the tests. Please try again in a moment.</div>`;return}
    tests=data||[];render();
  }
  async function launch(id){
    const t=tests.find(x=>Number(x.id)===Number(id));if(!t)return;
    if(!released(t)){render();return alert(`This test opens at ${fmtDate(t.release_at)}.`)}
    const p=getProfile();if(!p.name){profileSetup(true);return}
    try{
      const {data:blocked,error:be}=await sb.rpc('is_current_user_blocked');
      if(!be && blocked===true){alert('Your student account is currently blocked by the administrator. You cannot start a new test.');return;}
    }catch(e){console.warn('Block status check unavailable:',e.message)}
    if(!t.paper_url)return alert('The question paper for this test is not available yet. Please check back shortly.');
    try{
      const {data:sign,error}=await sb.storage.from(BUCKET).createSignedUrl(t.paper_url,60*60*8);
      if(error||!sign?.signedUrl){console.error('Paper access failed:',error);throw new Error('Could not open the question paper. This is usually a paper-access permission on our side, not your device. Please refresh and try again, or contact support.')}
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
      if(error)throw error;activeAttemptId=data.id;S.backendAttemptId=data.id;saveSess();startAttemptAutosave();
    }catch(e){console.warn('Attempt could not be created:',e.message)}
  }
  async function syncAttempt(){
    if(!S?.backendAttemptId||S.done||!sb)return;
    try{
      const answers=S.q.map((q,i)=>({attempt_id:S.backendAttemptId,question_no:i+1,response:q.a||null,marked_for_review:q.s>=3,answered_at:q.a?new Date().toISOString():null}));
      const {error}=await sb.from('answers').upsert(answers,{onConflict:'attempt_id,question_no'});
      if(error)throw error;
      saveSess();
    }catch(e){console.warn('Autosave failed:',e.message)}
  }
  function startAttemptAutosave(){
    clearInterval(syncTimer);syncTimer=setInterval(()=>syncAttempt(),10000);
    window.addEventListener('beforeunload',()=>{try{navigator.sendBeacon?.('', '')}catch(e){}} ,{once:false});
  }

  async function finalizeAttempt(){
    if(!S?.backendAttemptId)return;
    clearInterval(syncTimer);
    const answers=S.q.map((q,i)=>({attempt_id:S.backendAttemptId,question_no:i+1,response:q.a||null,marked_for_review:q.s>=3,answered_at:q.a?new Date().toISOString():null}));
    try{
      let ae=null;
      for(let attempt=0;attempt<3;attempt++){
        const r=await sb.from('answers').upsert(answers,{onConflict:'attempt_id,question_no'});ae=r.error;if(!ae)break;
        await new Promise(r=>setTimeout(r,350*(attempt+1)));
      }
      if(ae)throw ae;
      const attempted=S.q.filter(q=>q.a!=='').length;
      const elapsed=Math.max(0,Math.round((cfg.dur*60000-(S.rem||0)*1000)/1000));
      const {error:ue}=await sb.from('attempts').update({status:'submitted',submitted_at:new Date().toISOString(),unanswered_count:S.q.length-attempted,time_taken_seconds:elapsed}).eq('id',S.backendAttemptId);
      if(ue)throw ue;
    }catch(e){console.warn('Could not save submitted attempt:',e.message);alert('Your answers are saved on this device, but the server could not confirm the submission. Keep this page open and contact the administrator before closing it.')}
  }
  function patchFinish(){
    if(window.__backendFinishPatched)return;
    const original=window.finish; if(typeof original!=='function')return;
    window.finish=async function(){if(finishing)return;finishing=true;try{await finalizeAttempt()}finally{original();finishing=false}};
    window.__backendFinishPatched=true;
  }
  function startClock(){render();window.__backendClock&&clearInterval(window.__backendClock);window.__backendClock=setInterval(()=>{if(!document.hidden)tick()},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()})}
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
    load().then(updateHomeDeck).catch(()=>{});startClock();
  }
  function updateHomeDeck(){
    const next=(tests||[]).filter(t=>t.enabled!==false && new Date(t.release_at)>new Date()).sort((a,b)=>new Date(a.release_at)-new Date(b.release_at))[0];
    const n=document.getElementById('deckNext'),m=document.getElementById('deckNextMeta');
    if(n){n.textContent=next?next.name:'No upcoming test';m.textContent=next?`${new Date(next.release_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})} · ${next.duration_minutes} min`:'Create/schedule one from Admin';}
    const u=window.mock1807Auth?.user,st=document.getElementById('deckStudent'),sm=document.getElementById('deckStudentMeta');
    if(st){st.textContent=u?.user_metadata?.full_name||u?.user_metadata?.name||'Signed in';sm.textContent=u?.email?'Synced to '+u.email:'Your attempts stay synced';}
  }

  window.refreshBackendTests=load;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
