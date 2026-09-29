/* Admin motion: staggered entrances + count-up numbers */
(function(){
  const c=document.getElementById('content');if(!c)return;
  const count=el=>{const raw=el.textContent.trim(),n=parseFloat(raw.replace(/,/g,''));if(!isFinite(n)||el.dataset.done||!/^[\d,.]+$/.test(raw))return;el.dataset.done=1;
    const t0=performance.now(),d=900;const f=t=>{const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);el.textContent=Math.round(n*e).toLocaleString();if(p<1)requestAnimationFrame(f);else el.textContent=raw};requestAnimationFrame(f)};
  let busy=false;
  new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{
    c.querySelectorAll('.card,.table-wrap,.hero,.section-head').forEach((el,i)=>{if(!el.classList.contains('stg')){el.classList.add('stg');el.style.setProperty('--i',i)}});
    c.querySelectorAll('.card .value').forEach(count);busy=false})}).observe(c,{childList:true,subtree:true});
})();
