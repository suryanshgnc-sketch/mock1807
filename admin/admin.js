'use strict';
const SUPABASE_URL='https://grgxaewilmfyvndkcfim.supabase.co';
const SUPABASE_KEY='sb_publishable_aiJYxr3AYoeZHBXwIoXaaQ_gIfHxV2s';
const BUCKET='test-pdfs';
const {createClient}=window.supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
let session=null,current='overview', testsCache=[];
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function show(id){$(id).classList.remove('hidden')}; function hide(id){$(id).classList.add('hidden')}
function toast(msg){$('#toast').textContent=msg;show('#toast');clearTimeout(window.__toast);window.__toast=setTimeout(()=>hide('#toast'),2800)}
function formatDate(v){return v?new Date(v).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—'}
function statusFor(t){if(t.enabled===false)return ['DISABLED','disabled'];return new Date(t.release_at)<=new Date()?['RELEASED','released']:['SCHEDULED','scheduled']}
async function requireAdmin(){
  const {data,error}=await db.auth.getSession(); if(error)throw error; session=data.session;
  if(!session){hide('#loading');show('#login');return false}
  const {data:isAdmin,error:e}=await db.rpc('is_admin'); if(e)throw e;
  if(!isAdmin){hide('#loading');show('#login');$('#loginError').textContent='This Google account is not an admin.';show('#loginError');return false}
  hide('#loading');hide('#login');show('#app');
  const u=session.user; $('#adminIdentity').textContent=u.email||u.user_metadata?.full_name||'Admin'; return true;
}
async function signIn(){ $('#googleBtn').disabled=true;hide('#loginError'); const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href}}); if(error){$('#loginError').textContent=error.message;show('#loginError');$('#googleBtn').disabled=false} }
async function loadOverview(){
  const [p,t,a]=await Promise.all([
    db.from('profiles').select('id',{count:'exact',head:true}),
    db.from('tests').select('id,name,release_at,duration_minutes,total_questions,total_marks,positive_marks,negative_mcq,negative_numerical,paper_url,enabled',{count:'exact'}).order('release_at',{ascending:false}),
    db.from('attempts').select('id,test_id,user_id,status,score,max_score,correct_count,incorrect_count,unanswered_count,started_at,submitted_at',{count:'exact'}).order('created_at',{ascending:false})
  ]);
  if(p.error)throw p.error;if(t.error)throw t.error;if(a.error)throw a.error;
  testsCache=t.data||[];const attempts=a.data||[],submitted=attempts.filter(x=>x.status==='submitted');const avg=submitted.length?submitted.reduce((s,x)=>s+Number(x.score||0),0)/submitted.length:0;
  $('#content').innerHTML=`<div class="cards"><div class="card"><div class="label">STUDENTS</div><div class="value">${p.count??0}</div></div><div class="card"><div class="label">TESTS</div><div class="value">${t.count??0}</div></div><div class="card"><div class="label">ATTEMPTS</div><div class="value">${a.count??0}</div></div><div class="card"><div class="label">AVG SUBMITTED SCORE</div><div class="value">${avg.toFixed(1)}</div></div></div>
  <div class="hero"><div><div class="eyebrow">LIVE BACKEND</div><h2>Control center connected ✓</h2><p class="muted">Create a test once, choose its exact release time, and attach its question paper and answer-key PDFs.</p></div><button class="primary" onclick="openCreateModal()">+ Create Test</button></div>
  <div class="section-head"><h2>Recent tests</h2><button class="ghost" onclick="setView('tests')">View all →</button></div>${testsTable(t.data||[])}
  <div class="section-head"><h2>Recent attempts</h2></div>${attemptsTable(attempts.slice(0,12))}`;
}
function testsTable(rows){if(!rows.length)return '<div class="table-wrap"><div class="empty">No tests yet. Create your first test above.</div></div>';return `<div class="table-wrap"><table><thead><tr><th>Test</th><th>Release</th><th>Duration</th><th>Questions</th><th>Marks</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>{const [s,c]=statusFor(x);return `<tr><td><b>${esc(x.name)}</b><small>${esc(x.description||'')}</small></td><td>${formatDate(x.release_at)}</td><td>${x.duration_minutes} min</td><td>${x.total_questions}</td><td>${x.total_marks ?? '—'}</td><td><span class="pill ${c}">${s}</span></td><td><button class="mini js-toggle" data-id="${x.id}" data-enabled="${x.enabled!==false}">${x.enabled===false?'Enable':'Disable'}</button> <button class="mini danger-btn js-delete" data-id="${x.id}" data-name="${esc(x.name)}">Delete</button></td></tr>`}).join('')}</tbody></table></div>`}
function attemptsTable(rows){if(!rows.length)return '<div class="table-wrap"><div class="empty">No attempts yet.</div></div>';return `<div class="table-wrap"><table><thead><tr><th>User</th><th>Test</th><th>Status</th><th>Score</th><th>Correct</th><th>Started</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.user_id?.slice(0,8)||'')}…</td><td>${esc(testName(x.test_id))}</td><td>${esc(x.status)}</td><td>${x.score}/${x.max_score}</td><td>${x.correct_count}</td><td>${formatDate(x.started_at)}</td></tr>`).join('')}</tbody></table></div>`}
function testName(id){const t=testsCache.find(x=>String(x.id)===String(id));return t?.name||String(id)}
async function loadTests(){const {data,error}=await db.from('tests').select('id,name,description,release_at,duration_minutes,total_questions,total_marks,positive_marks,negative_mcq,negative_numerical,paper_url,enabled,created_at').order('release_at',{ascending:false});if(error)throw error;testsCache=data||[];$('#content').innerHTML=`<div class="hero"><div><div class="eyebrow">TEST MANAGEMENT</div><h2>Tests & schedules</h2><p class="muted">Upload PDFs, set exact release times, disable tests, or remove them.</p></div><button class="primary" onclick="openCreateModal()">+ New Test</button></div>${testsTable(data||[])}`}
async function loadStudents(){const {data,error}=await db.from('profiles').select('id,name,photo_url,created_at').order('created_at',{ascending:false});if(error)throw error;$('#content').innerHTML=`<div class="hero"><div><div class="eyebrow">STUDENT DIRECTORY</div><h2>Students</h2><p class="muted">Profiles registered through Google login.</p></div></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>User ID</th><th>Joined</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td><b>${esc(x.name||'Unnamed')}</b></td><td>${esc(x.id)}</td><td>${formatDate(x.created_at)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">No students.</td></tr>'}</tbody></table></div>`}
async function loadAttempts(){const {data,error}=await db.from('attempts').select('*').order('created_at',{ascending:false});if(error)throw error;$('#content').innerHTML=`<div class="hero"><div><div class="eyebrow">ATTEMPT LOG</div><h2>Attempts & scores</h2><p class="muted">Saved sessions will appear here when the student CBT is wired to create and submit attempts.</p></div></div>${attemptsTable(data||[])}`}
async function render(){try{if(current==='overview')await loadOverview();else if(current==='tests')await loadTests();else if(current==='students')await loadStudents();else await loadAttempts();wireDynamicButtons()}catch(e){$('#content').innerHTML=`<div class="hero"><h2 class="danger">Dashboard error</h2><p class="muted">${esc(e.message||e)}</p></div>`}}
function setView(v){current=v;document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v));const btn=document.querySelector(`.nav[data-view="${v}"]`);$('#viewTitle').textContent=btn?.textContent||v;render()}
function openCreateModal(){ $('#modal').classList.remove('hidden');$('#modal').setAttribute('aria-hidden','false'); $('#formError').classList.add('hidden'); const d=new Date(Date.now()+3600000);d.setSeconds(0,0);$('#testForm').release.value=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
function closeModal(){ $('#modal').classList.add('hidden');$('#modal').setAttribute('aria-hidden','true');$('#testForm').reset();hide('#uploadProgress');}
async function uploadPdf(file,path){const {error}=await db.storage.from(BUCKET).upload(path,file,{contentType:'application/pdf',upsert:true});if(error)throw error;return path}
async function createTest(e){e.preventDefault();const f=new FormData(e.target);const name=String(f.get('name')||'').trim(),releaseLocal=f.get('release'),paper=f.get('paper'),key=f.get('key');if(!paper||!key)throw new Error('Please select both PDF files.');
  const questions=Number(f.get('questions')), totalMarks=Number(f.get('totalMarks')), positive=Number(f.get('positive')), negativeA=Number(f.get('negativeA')), negativeB=Number(f.get('negativeB'));
  if(!Number.isFinite(questions)||questions<1)throw new Error('Enter a valid question count.');
  if(questions%3!==0)throw new Error('Total questions must be divisible by 3 for the current PCM CBT layout.');
  if(!Number.isFinite(totalMarks)||totalMarks<=0)throw new Error('Enter valid total marks.');
  if(!Number.isFinite(positive)||positive<0||!Number.isFinite(negativeA)||negativeA<0||!Number.isFinite(negativeB)||negativeB<0)throw new Error('Enter valid marking values.');
  $('#createTestBtn').disabled=true;show('#uploadProgress');$('#uploadProgress span').textContent='Creating test…';$('.progress-bar').style.width='15%';
  const releaseAt=new Date(releaseLocal);if(Number.isNaN(releaseAt.getTime()))throw new Error('Invalid release date/time.');
  const {data:test,error}=await db.from('tests').insert({name,description:String(f.get('description')||'').trim(),release_at:releaseAt.toISOString(),duration_minutes:Number(f.get('duration')),total_questions:questions,total_marks:totalMarks,positive_marks:positive,negative_mcq:negativeA,negative_numerical:negativeB,enabled:true}).select('id').single();if(error)throw error;
  try{const base=`tests/${test.id}`;$('.progress-bar').style.width='35%';$('#uploadProgress span').textContent='Uploading question paper…';const paperPath=await uploadPdf(paper,`${base}/question-paper.pdf`);$('.progress-bar').style.width='65%';$('#uploadProgress span').textContent='Uploading answer key…';const keyPath=await uploadPdf(key,`${base}/answer-key.pdf`);$('.progress-bar').style.width='85%';const {error:ue}=await db.from('tests').update({paper_url:paperPath}).eq('id',test.id);if(ue)throw ue;const {error:ke}=await db.from('test_answer_keys').upsert({test_id:test.id,answer_key:{storage_path:keyPath,filename:key.name,mime:'application/pdf'}},{onConflict:'test_id'});if(ke)throw ke;$('.progress-bar').style.width='100%';toast('Test created and scheduled ✓');closeModal();setView('tests');}
  catch(err){await db.from('tests').delete().eq('id',test.id);throw err}
}
async function toggleTest(id,wasEnabled){const {error}=await db.from('tests').update({enabled:!wasEnabled}).eq('id',id);if(error)throw error;toast(wasEnabled?'Test disabled':'Test enabled');render()}
async function deleteTest(id,name){if(!confirm(`Delete “${name}”? This removes the test and its answer key. Student attempts linked to it will also be removed.`))return;const {error}=await db.from('tests').delete().eq('id',id);if(error){toast(error.message);return}await db.storage.from(BUCKET).remove([`tests/${id}/question-paper.pdf`,`tests/${id}/answer-key.pdf`]);toast('Test deleted');render()}
window.openCreateModal=openCreateModal;
window.toggleTest=toggleTest;
window.deleteTest=deleteTest;
window.setView=setView;

function wireDynamicButtons(){
  document.querySelectorAll('.js-toggle').forEach(btn=>btn.addEventListener('click',async()=>{
    btn.disabled=true;
    try{await toggleTest(Number(btn.dataset.id),btn.dataset.enabled==='true');}
    catch(e){toast(e.message||String(e));btn.disabled=false;}
  }));
  document.querySelectorAll('.js-delete').forEach(btn=>btn.addEventListener('click',async()=>{
    await deleteTest(Number(btn.dataset.id),btn.dataset.name||'this test');
  }));
}

async function safeOpenCreateModal(){
  const modal=document.getElementById('modal');
  if(!modal){toast('Test builder could not load. Please refresh.');return;}
  openCreateModal();
}

document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.getElementById('googleBtn').addEventListener('click',signIn);
document.getElementById('refresh').addEventListener('click',()=>{toast('Refreshing…');render()});
document.getElementById('newTestTop').addEventListener('click',safeOpenCreateModal);
document.getElementById('logout').addEventListener('click',async()=>{await db.auth.signOut();location.reload()});
document.getElementById('testForm').addEventListener('submit',async e=>{
  try{hide('#formError');await createTest(e)}
  catch(err){document.getElementById('formError').textContent=err.message||String(err);show('#formError');document.getElementById('createTestBtn').disabled=false;hide('#uploadProgress')}
});
document.querySelectorAll('[data-close-modal]').forEach(x=>x.addEventListener('click',closeModal));

db.auth.onAuthStateChange((_e,s)=>{session=s});

(async()=>{
  try{if(await requireAdmin())await render()}
  catch(e){hide('#loading');show('#login');document.getElementById('loginError').textContent=e.message||String(e);show('#loginError')}
})();
