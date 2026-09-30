/* Scheduled test series: cards, countdowns and launch */
'use strict';
(function(){
  const SUPABASE_URL='https://grgxaewilmfyvndkcfim.supabase.co';
  const SUPABASE_KEY='sb_publishable_aiJYxr3AYoeZHBXwIoXaaQ_gIfHxV2s';
  const BUCKET='test-pdfs';
  const $=s=>document.querySelector(s);
  let sb=null, tests=[], statusMap={}, activeAttemptId=null, finishing=false, syncTimer=null;

  function esc2(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function parts(ms){ms=Math.max(0,ms);return {d:Math.floor(ms/86400000),h:Math.floor(ms%86400000/3600000),m:Math.floor(ms%3600000/60000),s:Math.floor(ms%60000/1000)}}
  function countdown(t){const p=parts(new Date(t.release_at).getTime()-Date.now());return `${p.d}d ${String(p.h).padStart(2,'0')}h ${String(p.m).padStart(2,'0')}m ${String(p.s).padStart(2,'0')}s`}
  function released(t){return new Date(t.release_at).getTime()<=Date.now()}
  function fmtDate(v){return new Date(v).toLocaleString([], {weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
  async function resolvePaperUrl(path){
    const raw=String(path||'').trim();
    if(!raw) throw new Error('The question paper for this test is not available yet.');
    if(/^https?:\/\//i.test(raw)) return raw;
    const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(raw,60*60*8);
    if(error||!data?.signedUrl) throw (error||new Error('Could not open the question paper.'));
    return data.signedUrl;
  }
  function style(){}
  function container(){return $('#backendTests')}
  function tz(v){return new Date(v).toLocaleString([], {weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'})}
  function tiles(ms){const p=parts(ms);return [['d',p.d,'Days'],['h',p.h,'Hrs'],['m',p.m,'Min'],['s',p.s,'Sec']].map(([k,v,l])=>`<div><b data-u="${k}">${String(v).padStart(2,'0')}</b><small>${l}</small></div>`).join('')}
  function calLink(t){const s=new Date(t.release_at),e=new Date(s.getTime()+(Number(t.duration_minutes)||180)*60000),f=d=>d.toISOString().replace(/[-:]|\.\d{3}/g,'');return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(t.name)+'&dates='+f(s)+'/'+f(e)+'&details='+encodeURIComponent('MDCCCVII Tests - starts at the scheduled time.')}
  function actions(t,r){
    const st=statusMap[t.id]||{};
    const latestId=st.latest_attempt_id;
    const result=latestId?`<button class="bt-btn" data-bt-result="${esc2(t.id)}" data-bt-attempt="${esc2(latestId)}">Analysis / Result</button>`:'';
    const canRetry=st.can_reattempt===true;
    if(latestId){
      const retry=(r&&canRetry)?`<button class="bt-btn alt" data-backend-test="${esc2(t.id)}">Re-attempt</button>`:'';
      return `<div class="bt-dual">${result}${retry}</div>`;
    }
    if(!r)return `<button class="bt-btn" disabled>Locked until start time</button>`;
    return `<button class="bt-btn" data-backend-test="${esc2(t.id)}">${Number(st.attempts_used||0)>0?'Resume test':'Start test'}</button>`;
  }
  function card(t){
    const r=released(t),q=Number(t.total_questions)||0,m=Number(t.total_marks)||0,d=Number(t.duration_minutes)||180,ra=Number(t.reattempt_limit||0);
    return `<article class="bt-card ${r?'is-live':''}">
      <div class="bt-top"><span class="bt-pill ${r?'live':''}">${r?'Live now':'Upcoming'}</span><span class="bt-date">${tz(t.release_at)}</span></div>
      <h3>${esc2(t.name)}</h3>${t.description?`<p class="bt-desc">${esc2(t.description)}</p>`:''}
      <div class="bt-meta"><div><small>Duration</small><b>${d} min</b></div><div><small>Questions</small><b>${q}</b></div><div><small>Marks</small><b>${m}</b></div><div><small>Attempts</small><b>${ra===0?'1':ra+1}</b></div></div>
      ${r?'':`<div class="cd" data-cd="${esc2(t.id)}"><span>Opens in</span><div class="cd-t">${tiles(new Date(t.release_at)-Date.now())}</div></div>`}
      ${actions(t,r)}
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
    box.querySelectorAll('[data-bt-result]').forEach(b=>b.addEventListener('click',()=>openBackendResult(Number(b.dataset.btResult),Number(b.dataset.btAttempt))));
  }
  async function openBackendResult(testId,attemptId){
    if(!testId)return;
    try{
      if(!sb)throw new Error('Please sign in again.');
      const t=tests.find(x=>Number(x.id)===Number(testId));
      let {data,error}=await sb.rpc('get_my_test_analysis',{p_test_id:testId});
      if(error)throw error;
      let rows=(data||[]).slice().sort((a,b)=>Number(a.question_no)-Number(b.question_no));
      let keyPublished=rows.length>0;
      if(!rows.length){
        const fallback=await sb.rpc('get_my_attempt_result',{p_attempt_id:Number(attemptId)});
        if(fallback.error)throw fallback.error;
        rows=(fallback.data||[]).slice().sort((a,b)=>Number(a.question_no)-Number(b.question_no));
        if(!rows.length)throw new Error('Your submitted result could not be loaded yet. Please try again in a moment.');
      }
      const per=Math.floor(Number(rows[0].total_questions||t?.total_questions||75)/3);
      cfg.per=per;
      cfg.dur=Number(rows[0].duration_minutes||t?.duration_minutes||180);
      cfg.pos=Number(rows[0].positive_marks??t?.positive_marks??4);
      cfg.negA=Number(rows[0].negative_mcq??t?.negative_mcq??1);
      cfg.negB=Number(rows[0].negative_numerical??t?.negative_numerical??1);
      setOrder('PCM');
      const prof=getProfile();
      const key=keyPublished?rows.map(x=>String(x.correct_response??'')):[];
      const answers=rows.map(x=>String(x.response??''));
      S={
        id:Date.now(),
        type:rows[0].test_name||t?.name||'Test',
        name:prof.name||'Student',
        photo:prof.photo||'',
        roll:'',
        cur:0,done:true,mode:'A',key,keyFromServer:true,man:[],
        date:rows[0].submitted_at?new Date(rows[0].submitted_at).toLocaleString():new Date().toLocaleString(),
        per,order:'PCM',backendTestId:testId,backendAttemptId:attemptId||Number(rows[0].attempt_id),
        maxMarks:Number(rows[0].max_score??t?.total_marks??(Number(rows[0].total_questions||75)*cfg.pos)),
        positiveMarks:cfg.pos,negativeMcq:cfg.negA,negativeNumerical:cfg.negB,
        q:answers.map((a,i)=>({a,s:a===''?1:2,t:0}))
      };
      if(typeof showRes==='function')showRes();
    }catch(e){
      console.error('Remote result load failed:',e);
      alert(e.message||'Could not load your result. Please try again.');
    }
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
    const {data,error}=await sb.from('tests').select('id,name,description,release_at,duration_minutes,total_questions,total_marks,positive_marks,negative_mcq,negative_numerical,reattempt_limit,leaderboard_enabled,paper_url,enabled,archived').eq('enabled',true).order('release_at',{ascending:true});
    if(error){console.error(error);box.innerHTML=`<div class="bt-error">We could not load the tests. Please try again in a moment.</div>`;return}
    tests=(data||[]).filter(t=>!t.archived);
    statusMap={};
    try{
      const {data:st,error:se}=await sb.rpc('get_my_attempt_status');
      if(se)throw se;
      (st||[]).forEach(x=>{statusMap[x.test_id]=x});
      // keep archived/disabled tests visible if the student already has a result (results are permanent)
      const missing=(st||[]).filter(x=>x.has_submitted&&!tests.some(t=>Number(t.id)===Number(x.test_id))).map(x=>x.test_id);
      if(missing.length){
        const {data:old}=await sb.from('tests').select('id,name,description,release_at,duration_minutes,total_questions,total_marks,positive_marks,negative_mcq,negative_numerical,reattempt_limit,leaderboard_enabled,paper_url,enabled,archived').in('id',missing);
        (old||[]).forEach(t=>tests.push(t));
      }
    }catch(e){console.warn('Attempt status unavailable',e.message)}
    render();
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
      S.q[0].s=1;
      const started=await createAttempt(t);
      if(!started){S=null;return;}
      begin();
    }catch(e){alert(e.message||'Could not open this test.')}
  }
  async function createAttempt(t){
    activeAttemptId=null;
    try{
      const {data,error}=await sb.rpc('start_test_attempt',{p_test_id:Number(t.id)});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(!row?.id)throw new Error('The server did not create an attempt.');
      activeAttemptId=row.id;S.backendAttemptId=row.id;S.backendTestId=Number(t.id);
      S.serverStartedAt=row.started_at;S.serverExpiresAt=row.expires_at;
      S.serverDurationMinutes=Number(row.duration_minutes)||cfg.dur;
      // The server snapshot is authoritative for this attempt.
      cfg.dur=S.serverDurationMinutes;cfg.pos=Number(row.positive_marks);cfg.negA=Number(row.negative_mcq);cfg.negB=Number(row.negative_numerical);
      if(row.total_questions && Number(row.total_questions)!==N()) throw new Error('This test changed after loading. Refresh and try again.');
      saveSess();startAttemptAutosave();return true;
    }catch(e){
      console.warn('Attempt could not be created:',e.message);
      alert(e.message||'You cannot start another attempt for this paper.');
      return false;
    }
  }
  async function syncAttempt(){
    if(!S?.backendAttemptId||S.done||!sb)return;
    setSyncState('saving');
    try{
      const answers=S.q.map((q,i)=>({question_no:i+1,response:q.a||null,marked_for_review:q.s>=3}));
      const {error}=await sb.rpc('save_attempt_answers',{p_attempt_id:S.backendAttemptId,p_answers:answers});
      if(error)throw error;
      saveSess();setSyncState('saved');
    }catch(e){console.warn('Autosave failed:',e.message);setSyncState('offline');}
  }
  function setSyncState(state){
    const a=document.getElementById('saveState'),b=document.getElementById('connectionState');
    if(a){a.className='save-state '+state;a.textContent=state==='saving'?'● SAVING…':state==='offline'?'● NOT SAVED':'● SAVED';}
    if(b){b.className='connection-state '+(state==='offline'?'offline':'online');b.textContent=state==='offline'?'● OFFLINE / RETRYING':'● ONLINE';}
  }
  function startAttemptAutosave(){
    clearInterval(syncTimer);syncTimer=setInterval(()=>syncAttempt(),10000);
    window.addEventListener('online',()=>setSyncState('saved'));window.addEventListener('offline',()=>setSyncState('offline'));
    setSyncState(navigator.onLine?'saved':'offline');
    window.addEventListener('beforeunload',()=>{try{navigator.sendBeacon?.('', '')}catch(e){}} ,{once:false});
  }

  async function finalizeAttempt(){
    if(!S?.backendAttemptId)return false;
    clearInterval(syncTimer);setSyncState('saving');
    try{
      const answers=S.q.map((q,i)=>({question_no:i+1,response:q.a||null,marked_for_review:q.s>=3}));
      const {data,error}=await sb.rpc('submit_test_attempt',{p_attempt_id:S.backendAttemptId,p_answers:answers});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(row?.status && row.status!=='submitted')throw new Error('The server did not confirm submission.');
      S.serverSubmittedAt=row?.submitted_at||new Date().toISOString();
      S.rem=0;saveSess();setSyncState('saved');return true;
    }catch(e){
      console.warn('Could not submit attempt:',e.message);setSyncState('offline');
      alert('Submission was not confirmed by the server. Your answers remain saved locally. Keep this page open and retry Submit.');return false;
    }
  }
  function patchFinish(){
    if(window.__backendFinishPatched)return;
    const original=window.finish; if(typeof original!=='function')return;
    window.finish=async function(){
      if(finishing)return;
      finishing=true;
      try{const ok=await finalizeAttempt();if(ok){original();load().catch(()=>{})}}
      finally{finishing=false}
    };
    window.__backendFinishPatched=true;
  }

  // Count real browser reloads for the active server attempt. This is deliberately
  // client-side only; the existing server submission function remains authoritative.
  function armReloadGuard(){
    if(!S?.backendAttemptId || S.done)return;
    const nav=performance.getEntriesByType?.('navigation')?.[0];
    if(!nav || nav.type!=='reload')return;
    const key='mdcccvii:reloads:'+String(S.backendAttemptId);
    const count=Math.min(99,Number(sessionStorage.getItem(key)||0)+1);
    sessionStorage.setItem(key,String(count));
    const badge=document.getElementById('reloadGuard');
    if(badge){badge.textContent='RELOADS '+count+'/3';badge.dataset.level=count>=3?'danger':count===2?'warn':'ok';}
    if(count>=3){
      setTimeout(()=>{
        if(!S?.done && !finishing && typeof window.finish==='function'){
          alert('Reload limit reached. Your test will now be submitted.');
          window.finish();
        }
      },350);
    }
  }
  function startClock(){render();window.__backendClock&&clearInterval(window.__backendClock);window.__backendClock=setInterval(()=>{if(!document.hidden)tick()},1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()})}
  async function resumeBackendTest(saved){
    try{
      if(!saved.backendAttemptId)throw new Error('No active server attempt was found.');
      const {data,error}=await sb.rpc('get_attempt_resume',{p_attempt_id:saved.backendAttemptId});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(!row?.id)throw new Error('This attempt is no longer resumable.');
      const t=tests.find(x=>Number(x.id)===Number(row.test_id));
      if(!t||!t.paper_url)throw new Error('The saved test paper could not be found.');
      const {data:sign,error:se}=await sb.storage.from(BUCKET).createSignedUrl(t.paper_url,60*60*8);
      if(se||!sign?.signedUrl)throw se||new Error('Could not reopen the question paper.');
      pdfUrl=sign.signedUrl;pdfName=t.name+' · Question Paper.pdf';
      cfg.per=(Number(row.total_questions)||75)/3;cfg.dur=Number(row.duration_minutes)||180;cfg.pos=Number(row.positive_marks);cfg.negA=Number(row.negative_mcq);cfg.negB=Number(row.negative_numerical);setOrder('PCM');
      S.backendAttemptId=row.id;S.serverStartedAt=row.started_at;S.serverExpiresAt=row.expires_at;S.serverDurationMinutes=Number(row.duration_minutes)||cfg.dur;
      S.q=Array.from({length:cfg.per*SUB.length},(_,i)=>({a:'',s:0,t:0}));
      (row.answers||[]).forEach(a=>{const i=Number(a.question_no)-1;if(S.q[i]){S.q[i].a=a.response||'';S.q[i].s=a.marked_for_review?(a.response?4:3):(a.response?2:1);}});
      S.cur=Math.min(Number(saved.cur)||0,S.q.length-1);S.q[S.cur].s=S.q[S.cur].s||1;
      begin();startAttemptAutosave();armReloadGuard();
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

  window.syncBackendNow=syncAttempt; window.refreshBackendTests=load;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
