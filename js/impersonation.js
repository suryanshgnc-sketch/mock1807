/* Shows a "viewing as student" bar when an admin used "Log in as student". */
'use strict';
(function(){
  const KEY='md_admin_return';
  let saved=null;
  try{saved=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch(e){}
  if(!saved)return;
  function bar(email){
    if(document.getElementById('impBar'))return;
    const st=document.createElement('style');
    st.textContent='#impBar{position:fixed;top:0;left:0;right:0;z-index:100000;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;padding:8px 14px;background:#ffb020;color:#1a1200;font:700 13px Inter,system-ui,sans-serif;box-shadow:0 2px 14px rgba(0,0,0,.4)}#impBar button{border:0;border-radius:8px;padding:6px 14px;background:#1a1200;color:#ffd77a;font:800 12px inherit;cursor:pointer}body.imp-on{padding-top:44px}';
    document.head.appendChild(st);
    const d=document.createElement('div');d.id='impBar';
    const t=document.createElement('span');t.textContent='ADMIN VIEW — you are logged in as '+email+'. Anything you do here is recorded on this student\u2019s account.';
    const b=document.createElement('button');b.textContent='Return to admin';
    b.addEventListener('click',back);
    d.append(t,b);document.body.prepend(d);document.body.classList.add('imp-on');
  }
  async function back(){
    const sb=window.mock1807Auth&&window.mock1807Auth.client;
    sessionStorage.removeItem(KEY);
    try{
      if(!sb)throw new Error('no client');
      const {error}=await sb.auth.setSession({access_token:saved.access_token,refresh_token:saved.refresh_token});
      if(error)throw error;
    }catch(e){try{await sb.auth.signOut({scope:'local'})}catch(_){}}
    location.href='admin/';
  }
  function init(){
    const sb=window.mock1807Auth&&window.mock1807Auth.client;
    if(!sb){setTimeout(init,150);return}
    sb.auth.getSession().then(({data})=>{
      const u=data&&data.session&&data.session.user;
      if(!u)return;
      if(u.id===saved.admin_id){sessionStorage.removeItem(KEY);return} // back to being the admin
      bar(u.email||'a student');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
