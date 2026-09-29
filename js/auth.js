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
    #authGate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
      padding:24px;background:radial-gradient(circle at 50% 15%,rgba(124,156,255,.14),transparent 38%),#080a0d;
      font-family:inherit}
    #authGate[hidden]{display:none}
    .auth-card{width:min(470px,100%);padding:34px;border:1px solid rgba(255,255,255,.10);border-radius:24px;
      background:rgba(20,22,26,.96);box-shadow:0 30px 100px rgba(0,0,0,.55);text-align:center}
    .auth-logo{width:64px;height:64px;margin:0 auto 18px;border-radius:18px;display:grid;place-items:center;
      background:linear-gradient(135deg,#f7941d,#ffb45c);color:#111;font-size:27px;font-weight:900}
    .auth-card h1{margin:0 0 8px;font-size:28px;letter-spacing:-.03em;color:#f3f4f6}
    .auth-card p{margin:0 auto 24px;color:#9a9da5;line-height:1.55;max-width:380px}
    .auth-google{width:100%;border:1px solid #343840;border-radius:13px;background:#fff;color:#15171b;
      padding:13px 16px;font:700 15px inherit;cursor:pointer;transition:.18s}
    .auth-google:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(0,0,0,.25)}
    .auth-status{min-height:20px;margin-top:14px;color:#9a9da5;font-size:13px}
    .auth-user{margin-top:18px;padding-top:16px;border-top:1px solid #2a2d33;font-size:12px;color:#6f727a}
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.id = 'authGate';
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo">1807</div>
      <h1>Welcome to JEE Mock CBT</h1>
      <p>Sign in with Google to save your profile and, in the next step, connect your attempts and scores to the mock1807 backend.</p>
      <button class="auth-google" id="googleLogin">Continue with Google</button>
      <div class="auth-status" id="authStatus"></div>
      <div class="auth-user">Your test PDFs remain exactly where you already keep them: <b>GTM-PDFS/</b></div>
    </div>`;
  document.body.appendChild(gate);

  const status = gate.querySelector('#authStatus');
  const login = gate.querySelector('#googleLogin');

  login.addEventListener('click', async ()=>{
    login.disabled = true;
    status.textContent = 'Opening Google…';
    try {
      const {error} = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: SUPABASE_SITE_URL }
      });
      if(error) throw error;
    } catch(e) {
      console.error(e);
      status.textContent = e?.message || 'Google sign-in failed.';
      login.disabled = false;
    }
  });

  function applyUser(user){
    window.mock1807Auth.user = user || null;
    if(!user){
      gate.hidden = false;
      return;
    }

    gate.hidden = true;

    // Reuse Google name/photo for the existing one-time candidate profile.
    try {
      const p = getProfile();
      const meta = user.user_metadata || {};
      let changed = false;
      if(!p.name){
        p.name = meta.full_name || meta.name || user.email?.split('@')[0] || '';
        changed = !!p.name;
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

  sb.auth.onAuthStateChange((_event, session)=>{
    applyUser(session?.user || null);
  });

  sb.auth.getSession().then(({data})=>{
    applyUser(data?.session?.user || null);
  });
})();
