/* Deeper analysis + gamification. Wraps dash() and home() from app.js. */
const CL={Correct:'#22c55e',Incorrect:'#ef4444',Unattempted:'#cbd5e1','No Key':'#cbd5e1'};
const _dash=dash;
dash=function(){
 _dash();
 const sm=summary(),E=sm.E,per=cfg.per,n=N(),max=n*cfg.pos,T=S.q.reduce((a,q)=>a+q.t,0)||1;
 const c=E.filter(e=>e.r==='Correct').length,w=E.filter(e=>e.r==='Incorrect').length,u=n-c-w;
 if(!c&&!w)return $('#dash').insertAdjacentHTML('afterbegin','<div class="card">Add an answer key (or tick correct answers) and press <b>Evaluate</b> to unlock the full analysis.</div>');
 const neg=-E.reduce((a,e)=>a+Math.min(0,e.m),0),wt=S.q.reduce((a,q,i)=>a+(E[i].r==='Incorrect'?q.t:0),0);
 const rush=E.filter((e,i)=>e.r==='Incorrect'&&S.q[i].t<30).length,stuck=E.filter((e,i)=>e.r==='Incorrect'&&S.q[i].t>180).length;
 const gaveUp=E.filter((e,i)=>e.r==='Unattempted'&&S.q[i].t>60).length;
 const sec=f=>{let a=0,b=0;E.forEach((e,i)=>{if(f(i)){if(e.r==='Correct')a++;else if(e.r==='Incorrect')b++}});return a+b?Math.round(a/(a+b)*100):null};
 const aA=sec(i=>!isNum(i)),aB=sec(i=>isNum(i));
 const mk=E.filter((e,i)=>S.q[i].s>=3&&S.q[i].a!=='');const mkOk=mk.filter(e=>e.r==='Correct').length;
 const best=[...sm.subs].sort((a,b)=>b.m-a.m)[0],worst=[...sm.subs].sort((a,b)=>a.m-b.m)[0];
 const I=[];
 I.push([neg>=max*.1?'b':'w',`You lost <b>${neg}</b> marks to negative marking (${w} wrong answers). ${w?`Skipping your ${Math.min(w,3)} least-sure guesses would have added about ${Math.min(w,3)*(cfg.pos+cfg.negA)} marks.`:''}`]);
 if(rush)I.push(['b',`<b>${rush}</b> wrong answers took under 30s: likely rushed or guessed. Slow down on first read.`]);
 if(stuck)I.push(['w',`<b>${stuck}</b> wrong answers took over 3 minutes each. Set a hard cap (about 2.5 min) and come back later.`]);
 if(gaveUp)I.push(['w',`<b>${gaveUp}</b> questions were skipped after more than 60s of effort. That time bought you nothing.`]);
 I.push(['',`<b>${Math.round(wt/T*100)}%</b> of your time went on questions you got wrong.`]);
 if(aA!==null&&aB!==null)I.push([aA>=aB?'g':'w',`Accuracy: MCQ <b>${aA}%</b> vs Numerical <b>${aB}%</b>.${Math.abs(aA-aB)>=20?` Work on ${aA<aB?'MCQ elimination':'numerical calculation'}.`:''}`]);
 if(mk.length)I.push(['',`Of ${mk.length} answered-and-marked questions, <b>${mkOk}</b> were correct. Your revisits ${mkOk/mk.length>=.6?'pay off':'need more discipline'}.`]);
 if(sm.subs.length>1)I.push(['g',`Strongest: <b>${best.n}</b> (${best.m}). Weakest: <b>${worst.n}</b> (${worst.m}). Add one extra practice session on ${worst.n}.`]);
 const R=34,C=2*Math.PI*R;let off=0;
 const seg=[[c,'#22c55e'],[w,'#ef4444'],[u,'#cbd5e1']].map(([v,col])=>{const l=v/n*C,s=`<circle r="${R}" cx="50" cy="50" fill="none" stroke="${col}" stroke-width="14" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 50 50)"/>`;off+=l;return s}).join('');
 const W=900,H=150,P=24,bw=(W-2*P)/n,mx=Math.max(...S.q.map(q=>q.t),60);
 const bars=S.q.map((q,i)=>{const h=q.t/mx*(H-2*P);return `<rect x="${P+i*bw+1}" y="${H-P-h}" width="${Math.max(bw-2,1)}" height="${h}" fill="${CL[E[i].r]}"><title>Q${i%per+1} ${SUB[sub(i)]}: ${mm(q.t)} · ${E[i].r}</title></rect>`+(i%per===0?`<text x="${P+i*bw}" y="${H-6}" font-size="11" fill="#64748b">${SUB[sub(i)]}</text>`:'')}).join('');
 const rows=E.map((e,i)=>`<tr data-r="${e.r}" data-t="${S.q[i].t}"><td>${i+1}</td><td>${SUB[sub(i)]}</td><td>${isNum(i)?'Num':'MCQ'}</td><td>${esc(S.q[i].a)||'—'}</td><td>${S.mode==='B'?'—':esc(e.c)||'—'}</td><td>${mm(S.q[i].t)}</td><td style="color:${CL[e.r]}"><b>${e.r}</b></td><td>${e.m}</td></tr>`).join('');
 $('#dash').innerHTML=`<div class="card hero2"><svg width="150" viewBox="0 0 100 100">${seg}<text x="50" y="54" text-anchor="middle" font-size="16" font-weight="700">${Math.max(0,Math.round(sm.score/max*100))}%</text></svg>
  <div><div class="big">${sm.score}<small style="font-size:18px;color:#64748b"> / ${max}</small></div><p style="margin:4px 0 12px;color:#64748b">${esc(S.type||'Test')} · ${esc(S.name)}</p>
  <div class="kp4"><div><b>${sm.acc}%</b><span>Accuracy</span></div><div><b>${Math.round((c+w)/n*100)}%</b><span>Attempt rate</span></div><div><b>${neg}</b><span>Marks lost to negatives</span></div><div><b>${mm(Math.round(T/n))}</b><span>Avg time / question</span></div></div></div></div>
 <div class="card"><h3 style="margin-top:0">Key insights</h3><ul class="ins">${I.map(x=>`<li class="${x[0]}">${x[1]}</li>`).join('')}</ul></div>
 <div class="card"><h3 style="margin-top:0">Subject breakdown</h3><table><tr><th>Subject</th><th>Split</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Marks</th><th>Time</th><th>Accuracy</th></tr>
 ${sm.subs.map(x=>`<tr><td>${x.n}</td><td><div class="sb"><i style="width:${x.c/per*100}%;background:#22c55e"></i><i style="width:${x.w/per*100}%;background:#ef4444"></i></div></td><td>${x.c}</td><td>${x.w}</td><td>${x.u}</td><td><b>${x.m}</b></td><td>${mm(x.t)}</td><td>${x.acc}%</td></tr>`).join('')}</table></div>
 <div class="card"><h3 style="margin-top:0">Time per question <small style="color:#64748b">(green correct · red wrong · grey skipped)</small></h3><svg viewBox="0 0 ${W} ${H}" width="100%">${bars}<line x1="${P}" x2="${W-P}" y1="${H-P}" y2="${H-P}" stroke="#cbd5e1"/></svg></div>
 <div class="card"><h3 style="margin-top:0">Question review</h3><div class="flt">${[['all','All'],['Incorrect','Wrong'],['Unattempted','Skipped'],['slow','Slow (&gt;2.5 min)']].map((f,i)=>`<button class="${i?'':'on'}" data-f="${f[0]}">${f[1]}</button>`).join('')}</div>
 <div style="overflow-x:auto"><table id="rv"><tr><th>Q</th><th>Subject</th><th>Type</th><th>Yours</th><th>Key</th><th>Time</th><th>Result</th><th>Marks</th></tr>${rows}</table></div></div>`;
 $('#dash').querySelector('.flt').onclick=e=>{const f=e.target.dataset.f;if(!f)return;[...e.currentTarget.children].forEach(b=>b.classList.toggle('on',b===e.target));
  document.querySelectorAll('#rv tr[data-r]').forEach(r=>r.hidden=!(f==='all'||r.dataset.r===f||(f==='slow'&&+r.dataset.t>150)))};
};
/* ---- Gamification: XP, level, streak, badges (derived from saved history) ---- */
const _home=home;
home=function(){
 _home();
 const h=Store.get('nta_hist',[]);if(!$('#gam')&&$('#stats'))$('#stats').insertAdjacentHTML('beforebegin','<div id="gam" class="gl"></div>');
 const cor=h.reduce((a,x)=>a+x.subs.reduce((b,u)=>b+u.c,0),0),xp=h.length*50+cor*3,lv=1+Math.floor(Math.sqrt(xp/100)),lo=(lv-1)**2*100,hi=lv**2*100;
 const days=[...new Set(h.map(x=>new Date(x.id).toDateString()))].map(d=>new Date(d).getTime()).sort((a,b)=>b-a);
 let st=0,cur=new Date().setHours(0,0,0,0);if(days[0]<cur-864e5)cur=-1;
 if(cur>0&&days[0]===cur-864e5)cur-=864e5;
 for(const d of days){if(d===cur){st++;cur-=864e5}else if(d<cur)break}
 const p=x=>x.max?x.score/x.max*100:0,B=[['First test',h.length>=1],['5 tests',h.length>=5],['10 tests',h.length>=10],['Scored 60%+',h.some(x=>p(x)>=60)],['Scored 80%+',h.some(x=>p(x)>=80)],['3-day streak',st>=3],['Improving x3',h.length>=3&&p(h[0])>p(h[1])&&p(h[1])>p(h[2])]];
 $('#gam').innerHTML=`<div class="lv"><b>Level ${lv}</b><span class="mut">${xp} XP · ${hi-xp} to next · 🔥 ${st}-day streak</span></div><div class="xp"><i style="width:${(xp-lo)/(hi-lo)*100}%"></i></div><div>${B.map(b=>`<span class="bdg ${b[1]?'on':''}">${b[1]?'✓ ':''}${b[0]}</span>`).join('')}</div><div class="mut" style="font-size:12px">XP: 50 per test + 3 per correct answer.</div>`;
};
home();
