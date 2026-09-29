/* Leaderboard + score sync. Uses get_leaderboard() from LEADERBOARD.sql */
'use strict';
(function(){
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sb=null,tests=[],sel='all';
  const fmtT=s=>{s=Number(s)||0;const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}h ${m}m`:`${m}m`};
  const ini=n=>esc((n||'S').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase());
  const av=r=>r.photo_url?`<img class="lb-av" src="${esc(r.photo_url)}" alt="" referrerpolicy="no-referrer">`:`<span class="lb-av">${ini(r.name)}</span>`;
  const fmtS=v=>Number(v).toFixed(Number(v)%1?1:0);

  function draw(rows){
    const box=$('#lbBody'); if(!box)return;
    if(!rows.length){box.innerHTML='<div class="bt-empty">No ranked attempts yet. Complete a test and check your answers to appear here.</div>';return}
    const top=rows.slice(0,3),me=rows.find(r=>r.is_me);
    const pod=[top[1],top[0],top[2]].filter(Boolean).map(r=>`<div class="pod p${r.rank<=3?r.rank:3}"><span class="pod-rank">${r.rank}</span>${av(r)}<b>${esc(r.name)}${r.is_me?' (You)':''}</b><em>${fmtS(r.score)}<small>/${fmtS(r.max_score)}</small></em></div>`).join('');
    box.innerHTML=`${me?`<div class="lb-me"><div><small>Your rank</small><b>#${me.rank}</b></div><div><small>Score</small><b>${fmtS(me.score)}/${fmtS(me.max_score)}</b></div><div><small>Percentile</small><b>${rows.length>1?Math.round((rows.length-me.rank)/(rows.length-1)*100):100}</b></div><div><small>Ranked students</small><b>${rows.length}</b></div></div>`:''}
    <div class="podium">${pod}</div>
    <div class="lb-table"><div class="lb-row lb-h"><span>Rank</span><span>Student</span><span>Score</span><span>Correct</span><span>Time</span></div>
    ${rows.slice(0,25).map(r=>`<div class="lb-row${r.is_me?' me':''}"><span class="lb-rk">${r.rank}</span><span class="lb-st">${av(r)}${esc(r.name)}${r.is_me?' <i>You</i>':''}</span><span><b>${fmtS(r.score)}</b> / ${fmtS(r.max_score)}</span><span>${r.correct_count}</span><span>${fmtT(r.time_taken_seconds)}</span></div>`).join('')}</div>`;
  }
  async function load(){
    const box=$('#lbBody'); if(!box||!sb)return;
    const {data:{session}}=await sb.auth.getSession();
    if(!session){box.innerHTML='<div class="bt-empty">Sign in to view the leaderboard.</div>';return}
    box.innerHTML='<div class="bt-empty">Loading rankings…</div>';
    const {data,error}=await sb.rpc('get_leaderboard',{p_test_id:sel==='all'?null:Number(sel)});
    if(error){console.error(error);box.innerHTML='<div class="bt-error">Rankings are not available right now.</div>';return}
    draw(data||[]);
  }
  async function loadTests(){
    const {data}=await sb.from('tests').select('id,name,release_at,leaderboard_enabled').eq('enabled',true).eq('leaderboard_enabled',true).order('release_at',{ascending:false});
    tests=(data||[]).filter(t=>new Date(t.release_at)<=Date.now());
    const s=$('#lbSel'); if(!s)return;
    s.innerHTML='<option value="all">Overall</option>'+tests.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
    s.value=sel; s.onchange=()=>{sel=s.value;load()};
  }
  // Save score to the attempt once results are evaluated
  function patchSave(){
    const orig=window.saveHist; if(typeof orig!=='function'||window.__lbPatched)return;
    window.__lbPatched=true;
    window.saveHist=function(){
      orig.apply(this,arguments);
      try{
        if(!S||!S.backendAttemptId||!sb)return;
        const sm=summary(),c=sm.subs.reduce((a,x)=>a+x.c,0),w=sm.subs.reduce((a,x)=>a+x.w,0);
        sb.from('attempts').update({score:sm.score,correct_count:c,incorrect_count:w}).eq('id',S.backendAttemptId).then(({error})=>{if(error)console.warn('Score sync failed',error.message)});
      }catch(e){console.warn(e)}
    };
  }
  async function results(){
    const b=$('#resBody'); if(!b||!sb)return;
    const {data,error}=await sb.rpc('get_my_results');
    if(error||!data||!data.length){b.innerHTML='<div class="bt-empty">Results appear here once the answer key for a test you attempted has been published.</div>';return}
    b.innerHTML=data.map(r=>`<div class="bt-card"><div class="bt-top"><span class="bt-pill live">Result declared</span></div><h3>${esc(r.name)}</h3><div class="res-score">${fmtS(r.score)}<small> / ${fmtS(r.max_score)}</small></div><div class="bt-meta"><div><small>Correct</small><b>${r.correct_count}</b></div><div><small>Incorrect</small><b>${r.incorrect_count}</b></div><div><small>Skipped</small><b>${r.unanswered_count}</b></div></div></div>`).join('');
  }
  function init(){
    sb=window.mock1807Auth?.client; if(!sb){setTimeout(init,200);return}
    const r=$('#lbRefresh'); if(r)r.onclick=load;
    sb.auth.onAuthStateChange(()=>setTimeout(()=>{loadTests().then(load);results()},0));
    loadTests().then(load);results();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
