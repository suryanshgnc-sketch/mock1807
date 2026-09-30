/* Answer-key publisher: themed panel, shown on the Tests view only. Uses the same publish_answer_key RPC as before. */
(function(){
  const mk=()=>{
    const m=document.querySelector('.main');if(!m)return;
    let d=document.getElementById('keyPanel');
    if(!d){
      d=document.createElement('section');d.id='keyPanel';d.className='panel';
      d.innerHTML='<div class="eyebrow">ANSWER KEY</div><h2>Publish answer key &amp; declare results</h2><p>Paste answers in question order (1 2 4 3 … or A B D C …, numerical as numbers). The total must equal the test\'s question count. Re-publishing re-evaluates everyone.</p><div class="row"><select id="kpTest"></select><button id="kpLoad" class="ghost" type="button">Reload tests</button></div><textarea id="kpKey" rows="4" style="width:100%" placeholder="Answer key"></textarea><div class="row"><button id="kpGo" class="primary small" type="button">Publish key &amp; evaluate</button><span id="kpMsg" class="msg"></span></div>';
      m.appendChild(d);
      const sel=d.querySelector('#kpTest'),msg=d.querySelector('#kpMsg');
      const load=async()=>{const {data}=await db.from('tests').select('id,name,total_questions').order('release_at',{ascending:false});sel.innerHTML=(data||[]).map(t=>`<option value="${t.id}">${String(t.name).replace(/</g,'&lt;')} (${t.total_questions} Q)</option>`).join('')};
      d.querySelector('#kpLoad').onclick=load;load();
      d.querySelector('#kpGo').onclick=async()=>{
        if(!confirm('Publish this key and evaluate all submitted attempts?'))return;msg.textContent='Evaluating…';
        const {data,error}=await db.rpc('publish_answer_key',{p_test_id:Number(sel.value),p_key:d.querySelector('#kpKey').value});
        msg.textContent=error?'Error: '+error.message:`Done. ${data} attempts evaluated and ranked.`;
      };
    }
    d.hidden=(typeof current==='undefined')||current!=='tests';
  };
  setInterval(mk,700);
})();
