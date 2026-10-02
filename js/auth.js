/* Step 1 backend connection: Google login via Supabase.
   The publishable key is safe to expose in a browser when RLS is configured.
*/
'use strict';

const SUPABASE_URL = 'https://grgxaewilmfyvndkcfim.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aiJYxr3AYoeZHBXwIoXaaQ_gIfHxV2s';
const SUPABASE_SITE_URL = 'https://suryanshgnc-sketch.github.io/mock1807/';

window.mock1807Auth = {
  client: null,
  user: null
};

(function initAuth(){
  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase library did not load.');
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.mock1807Auth.client = sb;

  const style = document.createElement('style');
  style.textContent = `
    #authGate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:#030504;font-family:Inter,system-ui,sans-serif;overflow:hidden}
    #authGate:before{content:"";position:absolute;inset:-30%;background:radial-gradient(circle at 50% 20%,rgba(114,255,69,.12),transparent 28%),radial-gradient(circle at 15% 80%,rgba(114,255,69,.06),transparent 25%);animation:authDrift 14s ease-in-out infinite alternate;pointer-events:none}
    @keyframes authDrift{to{transform:translate3d(4%,2%,0) scale(1.08)}}
    #authGate[hidden]{display:none}
    .auth-card{position:relative;width:min(480px,100%);padding:44px 38px;border:1px solid rgba(114,255,69,.2);border-radius:24px;background:linear-gradient(145deg,rgba(10,16,11,.96),rgba(3,6,4,.97));box-shadow:0 30px 120px rgba(0,0,0,.65),0 0 70px rgba(114,255,69,.07);text-align:center;overflow:hidden}
    .auth-card:after{content:"";position:absolute;left:-20%;right:-20%;height:1px;top:0;background:linear-gradient(90deg,transparent,#72ff45,transparent);animation:authScan 4s linear infinite}
    @keyframes authScan{to{transform:translateY(460px)}}
    .auth-logo{width:108px;height:108px;margin:0 auto 24px;display:block;border-radius:50%;object-fit:cover;filter:drop-shadow(0 0 28px rgba(114,255,69,.22));animation:authFloat 5s ease-in-out infinite}
    @keyframes authFloat{50%{transform:translateY(-7px) rotate(1deg)}}
    .auth-card h1{margin:0 0 10px;font-size:34px;font-weight:900;letter-spacing:-.05em;color:#f6faf5}
    .auth-card p{margin:0 auto 28px;color:#849084;line-height:1.7;font-size:14px;max-width:360px}
    .auth-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid rgba(114,255,69,.22);border-radius:12px;background:#72ff45;color:#031004;padding:14px 16px;font:900 14px Inter,system-ui,sans-serif;cursor:pointer;transition:transform .2s,box-shadow .2s,filter .2s}
    .auth-google:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 36px rgba(114,255,69,.18);filter:brightness(1.04)}.auth-google:disabled{opacity:.6;cursor:wait}
    .auth-status{min-height:20px;margin-top:14px;color:#91a18f;font-size:13px}
    .auth-legal{margin-top:14px;font-size:11px;color:#586257;line-height:1.6}.auth-legal a{color:#9dff85}
    .auth-priv{list-style:none;margin:20px 0 0;padding:14px 16px;text-align:left;border:1px solid rgba(114,255,69,.14);border-radius:12px;background:rgba(114,255,69,.03);font-size:12px;line-height:1.6;color:#8b988b}.auth-priv li{margin:5px 0}.auth-priv b{color:#d3ecd0}
    .auth-card{max-height:calc(100vh - 32px);overflow:auto}
    .auth-user{margin-top:20px;padding-top:16px;border-top:1px solid rgba(114,255,69,.1);font-size:11px;color:#4f594f}
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.id = 'authGate';
  gate.innerHTML = `
    <div class="auth-card">
      <img class="auth-logo" src="assets/mdcccvii-logo.png" alt="MDCCCVII Tests">
      <div style="font-size:10px;letter-spacing:.28em;font-weight:800;color:#72ff45;margin-bottom:8px">MDCCCVII / TESTS</div>
      <h1>Enter the arena.</h1>
      <p>Sign in to access scheduled tests, preserve your attempts and see declared results and rankings across the series.</p>
      <button class="auth-google" id="googleLogin"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</button>
      <div class="auth-status" id="authStatus"></div>
      <ul class="auth-priv"><li><b>What we store:</b> your Google email and photo, plus your test attempts and scores.</li><li><b>Who sees it:</b> other students see your name (your Gmail ID, unless an admin changes it), photo and scores on the leaderboard.</li><li><b>Cookies:</b> only essential browser storage for login and test progress. No ads, no tracking.</li><li><b>Under 18?</b> Please use this with a parent or guardian's consent.</li></ul>
      <div class="auth-legal">By continuing you agree to our <a href="legal.html#terms" target="_blank" rel="noopener">Terms</a>, <a href="legal.html#privacy" target="_blank" rel="noopener">Privacy Policy</a> and <a href="legal.html#cookies" target="_blank" rel="noopener">Cookies &amp; Storage</a> notice.</div>
      <div class="auth-user">© 2026 MDCCCVII · Developed by suryansh1807</div>
    </div>`;
  document.body.appendChild(gate);

  const status = gate.querySelector('#authStatus');
  const login = gate.querySelector('#googleLogin');

  login.addEventListener('click', async ()=>{
    login.disabled = true;
    status.textContent = 'Redirecting to Google…';
    try {
      const {error} = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: SUPABASE_SITE_URL }
      });
      if(error) throw error;
    } catch(e) {
      console.error(e);
      status.textContent = e?.message || 'Sign-in failed. Please try again.';
      login.disabled = false;
    }
  });

  async function applyUser(user){
    window.mock1807Auth.user = user || null;
    if(!user){ gate.hidden = false; return; }
    try {
      const {data:blocked,error:blockError}=await sb.rpc('is_current_user_blocked');
      if(blockError) console.warn('Could not check account status:',blockError.message);
      if(blocked===true){
        gate.hidden=false;
        status.textContent='This account has been blocked by an administrator.';
        login.disabled=true;
        await sb.auth.signOut();
        return;
      }
    } catch(e){ console.warn('Account status check failed:',e); }
    login.disabled=false;
    gate.hidden = true;

    // Reuse Google name/photo for the existing one-time candidate profile.
    try {
      const p = getProfile();
      const meta = user.user_metadata || {};
      let changed = false;
      // Name is locked to the account email (only an admin can change it in the backend).
      if(user.email && p.name !== user.email){
        p.name = user.email;
        changed = true;
      }
      if(!p.photo){
        p.photo = meta.avatar_url || meta.picture || '';
        changed = !!p.photo || changed;
      }
      if(changed) Store.set(PROFILE_KEY,p);
      if(typeof home === 'function') home();
    } catch(e) {
      console.warn('Could not sync Google profile to local candidate profile.', e);
    }
  }

  sb.auth.onAuthStateChange((_event, session)=>{ applyUser(session?.user || null); });

  sb.auth.getSession().then(({data})=>{
    applyUser(data?.session?.user || null);
  });
})();
