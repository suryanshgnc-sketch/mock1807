/* Log out button: signs out of Supabase, clears local session state, returns to the sign-in gate */
(function(){
var b=document.getElementById('logoutBtn');if(!b)return;
function sync(){var u=window.mock1807Auth&&window.mock1807Auth.user;b.hidden=!u}
sync();setInterval(sync,1500);
b.addEventListener('click',async function(){
 if(!confirm('Log out of MDCCCVII Tests on this device?'))return;
 try{var s=localStorage.getItem('nta_sess');if(s&&!JSON.parse(s).done&&!confirm('A test is in progress on this device. Logging out will not submit it. Log out anyway?'))return}catch(e){}
 b.disabled=true;b.textContent='Logging out…';
 try{await window.mock1807Auth.client.auth.signOut()}catch(e){console.warn(e)}
 try{Object.keys(localStorage).filter(function(k){return /^sb-.*-auth-token$/.test(k)}).forEach(function(k){localStorage.removeItem(k)})}catch(e){}
 location.reload();
});
})();
