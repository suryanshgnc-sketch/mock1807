/* MDCCCVII TESTS — account + settings UI layer. Does not touch CBT state. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const getStore=()=>window.Store;
  const escUI=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function googleUser(){return window.mock1807Auth?.user||null}
  function googleProfile(){
    const u=googleUser(), m=u?.user_metadata||{};
    const fallback=typeof getProfile==='function'?getProfile():{name:'',photo:''};
    const name=m.full_name||m.name||fallback.name||u?.email?.split('@')[0]||'Candidate';
    const photo=m.avatar_url||m.picture||fallback.photo||'';
    return {name,photo,email:u?.email||'',provider:'Google'};
  }
  function syncGoogle(){
    const u=googleUser(); if(!u||typeof Store==='undefined') return googleProfile();
    const p=googleProfile(); Store.set('nta_profile',{name:p.name,photo:p.photo}); return p;
  }
  function avatar(p,cls='md-avatar'){
    return p.photo?`<img class="${cls}" src="${escUI(p.photo)}" alt="${escUI(p.name)}">`:`<span class="${cls} md-avatar-fallback">${escUI((p.name||'C').slice(0,1).toUpperCase())}</span>`;
  }
  function refreshHeader(){
    const chip=$('#profileChip'); if(!chip)return;
    const p=googleProfile();
    chip.innerHTML=`<span class="profile-chip">${p.photo?`<img src="${escUI(p.photo)}" alt="">`:`<span class="md-mini-fallback">${escUI((p.name||'C').slice(0,1).toUpperCase())}</span>`}<span>${escUI(p.name||'Account')}</span></span>`;
  }
  function profileUI(){
    const p=syncGoogle();
    const u=googleUser();
    const provider=u?.app_metadata?.provider||'google';
    modal(`<div class="md-account">
      <div class="md-account-top">${avatar(p)}<div><div class="md-account-name">${escUI(p.name)}</div><div class="md-account-email">${escUI(p.email||'Google account')}</div></div><span class="md-provider">${escUI(provider)}</span></div>
      <div class="md-section"><div class="md-section-title">Account</div>
        <div class="md-row"><div><strong>Profile source</strong><span>Your identity is synced from the signed-in Google account.</span></div><span style="color:#86ff3f;font-size:11px;font-weight:800">SYNCED</span></div>
        <div class="md-row"><div><strong>Leaderboard identity</strong><span>Your Google name and profile photo are used where your account is shown publicly.</span></div><span style="color:#9aa49b;font-size:11px">${p.email?'ACTIVE':'LOCAL'}</span></div>
      </div>
      <div class="md-section"><div class="md-section-title">Candidate</div>
        <div class="md-row"><div><strong>Display name</strong><span>${escUI(p.name)}</span></div><button class="x-btn ghost" type="button" onclick="window.__mdEditCandidate()">Edit</button></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px"><button class="btn w" onclick="closeM()">Close</button></div>
    </div>`);
  }
  window.__mdEditCandidate=function(){
    const p=googleProfile();
    modal(`<div class="md-account"><div class="md-account-top">${avatar(p)}<div><div class="md-account-name">Candidate profile</div><div class="md-account-email">${escUI(p.email||'Local profile')}</div></div></div>
      <div class="md-section"><div class="md-section-title">Display name</div><div class="f"><label>Candidate name<input id="mdCandidateName" maxlength="80" value="${escUI(p.name)}" autocomplete="name"></label></div><p class="mut" style="margin-top:8px">Google remains the account identity. This name controls how you are identified inside tests.</p></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px"><button class="btn w" onclick="window.__mdProfileUI()">Cancel</button><button class="btn g" onclick="window.__mdSaveCandidate()">Save</button></div></div>`);
  };
  window.__mdProfileUI=profileUI;
  window.__mdSaveCandidate=function(){
    const n=$('#mdCandidateName')?.value.trim(); if(!n)return alert('Enter a candidate name.');
    const p=googleProfile(); Store.set('nta_profile',{name:n,photo:p.photo}); closeM(); refreshHeader(); if(typeof home==='function')home();
  };
  window.profileSetup=profileUI;

  function pref(key,def){try{const o=JSON.parse(localStorage.getItem('md_ui_prefs')||'{}');return key in o?o[key]:def}catch(e){return def}}
  function setPref(key,val){try{const o=JSON.parse(localStorage.getItem('md_ui_prefs')||'{}');o[key]=val;localStorage.setItem('md_ui_prefs',JSON.stringify(o))}catch(e){}}
  function settingsUI(){
    const motion=pref('motion',true), confirm=pref('confirmSubmit',true), density=pref('density','comfortable');
    const c=window.cfg||{};
    modal(`<div class="md-account"><div><div class="md-section-title">MDCCCVII / SETTINGS</div><h3 style="margin:0">Test environment</h3><p class="mut" style="margin-top:7px">Controls for your practice environment. Exam rules are applied by the scheduled test when you enter it.</p></div>
      <div class="md-section"><div class="md-section-title">Exam defaults</div>
        <div class="md-row"><div><strong>Correct answer score</strong><span>Local practice default</span></div><input id="s1" type="number" min="0" step="0.5" value="${Number(c.pos??4)}" style="width:110px"></div>
        <div class="md-row"><div><strong>MCQ negative marking</strong><span>Local practice default</span></div><input id="s2" type="number" min="0" step="0.5" value="${Number(c.negA??1)}" style="width:110px"></div>
        <div class="md-row"><div><strong>Numerical negative marking</strong><span>Local practice default</span></div><input id="s3" type="number" min="0" step="0.5" value="${Number(c.negB??1)}" style="width:110px"></div>
        <div class="md-row"><div><strong>Practice duration</strong><span>Used only for local practice tests</span></div><input id="s4" type="number" min="1" value="${Number(c.dur??180)}" style="width:110px"></div>
        <div class="md-row"><div><strong>Questions per subject</strong><span>Local practice default</span></div><input id="s5" type="number" min="6" value="${Number(c.per??25)}" style="width:110px"></div>
        <div class="md-row"><div><strong>Subject order</strong><span>Local practice layout</span></div><select id="s6" style="width:110px">${['PCM','MPC','PMC','CPM','CMP','MCP','P','C','M'].map(o=>`<option ${o===c.order?'selected':''}>${o}</option>`).join('')}</select></div>
      </div>
      <div class="md-section"><div class="md-section-title">Interface</div>
        <div class="md-row"><div><strong>Interface motion</strong><span>Keep transitions subtle and functional.</span></div><button class="md-toggle ${motion?'on':''}" data-pref="motion" aria-label="Toggle interface motion"></button></div>
        <div class="md-row"><div><strong>Confirm before submit</strong><span>Show a confirmation before final submission.</span></div><button class="md-toggle ${confirm?'on':''}" data-pref="confirmSubmit" aria-label="Toggle submit confirmation"></button></div>
        <div class="md-row"><div><strong>Layout density</strong><span>Spacing used across the dashboard.</span></div><select id="mdDensity" style="width:150px"><option value="comfortable" ${density==='comfortable'?'selected':''}>Comfortable</option><option value="compact" ${density==='compact'?'selected':''}>Compact</option></select></div>
      </div>
      <div class="md-section"><div class="md-section-title">Data</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn w" onclick="exportJ()">Export data</button><label class="btn w">Import data<input type="file" accept=".json" hidden onchange="importJ(this.files[0])"></label></div></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:3px"><button class="btn w" onclick="closeM()">Cancel</button><button class="btn g" id="mdSaveSettings">Save settings</button></div>
    </div>`);
    document.querySelectorAll('.md-toggle').forEach(b=>b.onclick=()=>b.classList.toggle('on'));
    $('#mdSaveSettings').onclick=()=>{
      const v=i=>Math.abs(parseFloat($('#s'+i).value))||0;
      if(window.cfg){cfg.pos=v(1);cfg.negA=v(2);cfg.negB=v(3);cfg.dur=v(4)||180;cfg.per=Math.max(6,v(5)|0||25);if(typeof setOrder==='function')setOrder($('#s6').value);if(typeof Store!=='undefined')Store.set('nta_cfg',cfg)}
      setPref('motion',$('[data-pref="motion"]').classList.contains('on'));setPref('confirmSubmit',$('[data-pref="confirmSubmit"]').classList.contains('on'));setPref('density',$('#mdDensity').value);
      document.documentElement.dataset.density=$('#mdDensity').value;closeM();if(typeof home==='function')home();
    };
  }
  window.settings=settingsUI;
  function apply(){
    const d=pref('density','comfortable');document.documentElement.dataset.density=d;refreshHeader();
    if(typeof home==='function')setTimeout(()=>{try{home();}catch(e){}},0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.addEventListener('load',()=>{setTimeout(()=>{syncGoogle();refreshHeader()},250)});
})();
