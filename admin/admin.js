'use strict';
const SUPABASE_URL='https://grgxaewilmfyvndkcfim.supabase.co';
const SUPABASE_KEY='sb_publishable_aiJYxr3AYoeZHBXwIoXaaQ_gIfHxV2s';
const {createClient}=window.supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
let session=null,current='overview';
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function show(id){$(id).classList.remove('hidden')};function hide(id){$(id).classList.add('hidden')}
function toast(msg){const t=$('#toast');t.textContent=msg;show('#toast');clearTimeout(window.__toast);window.__toast=setTimeout(()=>hide('#toast'),2500)}
async function requireAdmin(){
  const {data,error}=await db.auth.getSession();
  if(error)throw error; session=data.session;
  if(!session){hide('#loading');show('#login');return false}
  const {data:isAdmin,error:e}=await db.rpc('is_admin');
  if(e)throw e;
  if(!isAdmin){hide('#loading');show('#login');$('#loginError').textContent='This Google account is not an admin.';show('#loginError');return false}
  hide('#loading');hide('#login');show('#app');
  const u=session.user;$('#adminIdentity').textContent=u.email||u.user_metadata?.full_name||'Admin';
  return true;
}
async function signIn(){
  $('#googleBtn').disabled=true;hide('#loginError');
  const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href}});
  if(error){$('#loginError').textContent=error.message;show('#loginError');$('#googleBtn').disabled=false}
}
async function loadOverview(){
  const [p,t,a]=await Promise.all([
    db.from('profiles').select('id',{count:'exact',head:true}),
    db.from('tests').select('id,name,release_at,duration_minutes,total_questions',{count:'exact'}).order('release_at',{ascending:false}),
    db.from('attempts').select('id,test_id,user_id,status,score,max_score,correct_count,incorrect_count,unanswered_count,started_at,submitted_at',{count:'exact'}).order('created_at',{ascending:false})
  ]);
  if(p.error)throw p.error;if(t.error)throw t.error;if(a.error)throw a.error;
  const attempts=a.data||[], submitted=attempts.filter(x=>x.status==='submitted');
  const avg=submitted.length?submitted.reduce((s,x)=>s+Number(x.score||0),0)/submitted.length:0;
  $('#content').innerHTML=`<div class="cards"><div class="card"><div class="label">STUDENTS</div><div class="value">${p.count??0}</div></div><div class="card"><div class="label">TESTS</div><div class="value">${t.count??0}</div></div><div class="card"><div class="label">ATTEMPTS</div><div class="value">${a.count??0}</div></div><div class="card"><div class="label">AVG SUBMITTED SCORE</div><div class="value">${avg.toFixed(1)}</div></div></div>
  <div class="hero"><h2>Backend connected ✓</h2><p class="muted">Your admin account is authenticated through Supabase. The tables below are live data from your project.</p></div>
  <div class="section-head"><h2>Recent tests</h2></div>${testsTable(t.data||[])}
  <div class="section-head"><h2>Recent attempts</h2></div>${attemptsTable(attempts.slice(0,12))}`;
}
function testsTable(rows){if(!rows.length)return '<div class="table-wrap"><div class="empty">No tests have been created yet.</div></div>';return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Release</th><th>Duration</th><th>Questions</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${new Date(x.release_at).toLocaleString()}</td><td>${x.duration_minutes} min</td><td>${x.total_questions}</td><td><span class="pill">${new Date(x.release_at)<=new Date()?'RELEASED':'SCHEDULED'}</span></td></tr>`).join('')}</tbody></table></div>`}
function attemptsTable(rows){if(!rows.length)return '<div class="table-wrap"><div class="empty">No attempts yet.</div></div>';return `<div class="table-wrap"><table><thead><tr><th>User</th><th>Test</th><th>Status</th><th>Score</th><th>Correct</th><th>Started</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.user_id.slice(0,8))}…</td><td>${esc(x.test_id)}</td><td>${esc(x.status)}</td><td>${x.score}/${x.max_score}</td><td>${x.correct_count}</td><td>${new Date(x.started_at).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`}
async function loadTests(){const {data,error}=await db.from('tests').select('id,name,description,release_at,duration_minutes,total_questions,paper_url,created_at').order('release_at',{ascending:false});if(error)throw error;$('#content').innerHTML=`<div class="hero"><h2>Test management</h2><p class="muted">For now this page is read-only. Next step will add Create Test, PDF upload, answer-key upload, edit, release and disable controls.</p></div>${testsTable(data||[])}`}
async function loadStudents(){const {data,error}=await db.from('profiles').select('id,name,photo_url,created_at').order('created_at',{ascending:false});if(error)throw error;$('#content').innerHTML=`<div class="hero"><h2>Students</h2><p class="muted">Profiles currently registered through Google login.</p></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>User ID</th><th>Joined</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td><b>${esc(x.name||'Unnamed')}</b></td><td>${esc(x.id)}</td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">No students.</td></tr>'}</tbody></table></div>`}
async function loadAttempts(){const {data,error}=await db.from('attempts').select('*').order('created_at',{ascending:false});if(error)throw error;$('#content').innerHTML=`<div class="hero"><h2>Attempts</h2><p class="muted">Every test session saved by the student site will appear here once backend attempt saving is wired into the CBT.</p></div>${attemptsTable(data||[])}`}
async function render(){try{if(current==='overview')await loadOverview();else if(current==='tests')await loadTests();else if(current==='students')await loadStudents();else await loadAttempts()}catch(e){$('#content').innerHTML=`<div class="hero"><h2 class="danger">Dashboard error</h2><p class="muted">${esc(e.message||e)}</p></div>`}}
$('.nav')
for(const b of document.querySelectorAll('.nav'))b.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');current=b.dataset.view;$('#viewTitle').textContent=b.textContent;render()});
$('#googleBtn').addEventListener('click',signIn);$('#refresh').addEventListener('click',()=>{toast('Refreshing…');render()});$('#logout').addEventListener('click',async()=>{await db.auth.signOut();location.reload()});
db.auth.onAuthStateChange((_e,s)=>{session=s});
(async()=>{try{if(await requireAdmin())await render()}catch(e){hide('#loading');show('#login');$('#loginError').textContent=e.message||String(e);show('#loginError')}})();
