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
    #authGate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b1220;font-family:Inter,system-ui,sans-serif}
    #authGate[hidden]{display:none}
    .auth-card{width:min(440px,100%);padding:40px 36px;border:1px solid #22304d;border-radius:20px;background:#111a2e;box-shadow:0 24px 80px rgba(0,0,0,.45);text-align:center}
    .auth-logo{width:52px;height:52px;margin:0 auto 22px;display:block}
    .auth-card h1{margin:0 0 10px;font-size:26px;font-weight:700;letter-spacing:-.02em;color:#fff}
    .auth-card p{margin:0 auto 26px;color:#8b97b1;line-height:1.6;font-size:14.5px;max-width:340px}
    .auth-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;border:0;border-radius:10px;background:#fff;color:#1f2430;padding:13px 16px;font:600 15px Inter,system-ui,sans-serif;cursor:pointer;transition:filter .15s}
    .auth-google:hover:not(:disabled){filter:brightness(.94)}.auth-google:disabled{opacity:.6;cursor:wait}
    .auth-status{min-height:20px;margin-top:14px;color:#8b97b1;font-size:13px}
    .auth-user{margin-top:20px;padding-top:16px;border-top:1px solid #22304d;font-size:12px;color:#66728d}
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.id = 'authGate';
  gate.innerHTML = `
    <div class="auth-card">
      <svg class="auth-logo" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="27" fill="#f7941d"/><path d="M9 29l13 14L47 11" stroke="#2e9e4a" stroke-width="10" fill="none"/></svg>
      <h1>Welcome to JEE Mock CBT</h1>
      <p>Sign in to access your scheduled tests, save your attempts and track your performance over time.</p>
      <button class="auth-google" id="googleLogin"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</button>
      <div class="auth-status" id="authStatus"></div>
      <div class="auth-user">Independent practice platform · Not affiliated with NTA</div>
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
