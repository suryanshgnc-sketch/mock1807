/* Answer-key publisher: paste the key, every submitted attempt is scored instantly. */
(function(){
  const mk=()=>{const m=document.querySelector('.main');if(!m||document.getElementById('keyPanel'))return;
    const d=document.createElement('section');d.id='keyPanel';d.style.cssText='margin:22px 0;padding:20px;border:1px solid #2a2d33;border-radius:14px;background:#12151a';
    d.innerHTML='<h2 style="margin:0 0 6px">Publish answer key &amp; declare results</h2><p style="margin:0 0 12px;color:#9a9da5;font-size:13px">Paste answers in question order (1 2 4 3 … or A B D C …, numerical as numbers). Total must equal the test\'s question count. Re-publishing re-evaluates everyone.</p><select id="kpTest" style="padding:9px;margin-right:8px"></select><button id="kpLoad" class="btn">Reload tests</button><textarea id="kpKey" rows="4" style="width:100%;margin:12px 0;padding:10px;font-family:monospace" placeholder="Answer key"></textarea><button id="kpGo" class="btn">Publish key &amp; evaluate</button> <span id="kpMsg" style="margin-left:10px;font-size:13px"></span>';
    m.appendChild(d);const sel=d.querySelector('#kpTest'),msg=d.querySelector('#kpMsg');
    const load=async()=>{const {data}=await db.from('tests').select('id,name,total_questions').order('release_at',{ascending:false});sel.innerHTML=(data||[]).map(t=>`<option value="${t.id}">${t.name} (${t.total_questions} Q)</option>`).join('')};
    d.querySelector('#kpLoad').onclick=load;load();
    d.querySelector('#kpGo').onclick=async()=>{if(!confirm('Publish this key and evaluate all submitted attempts?'))return;msg.textContent='Evaluating…';
      const {data,error}=await db.rpc('publish_answer_key',{p_test_id:Number(sel.value),p_key:d.querySelector('#kpKey').value});
      msg.textContent=error?'Error: '+error.message:`Done. ${data} attempts evaluated and ranked.`}};
  setInterval(mk,1000);
})();
