/* Track record: every frozen weekly call and what happened next.
   Calls come from data.json (saved before kickoff, never edited). Outcomes come
   from the saved grades or, for windows finished since, from data/live.json,
   which grades them the same way (PPR per recorded appearance in the window). */
(function(root){
 "use strict";
 const M=root.PublicTerminal;
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const f1=x=>M.finite(x)?x.toFixed(1):"—",signed=x=>M.finite(x)?`${x>=0?"+":""}${x.toFixed(1)}`:"—";
 const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
 const date=v=>{const d=new Date(v);return Number.isNaN(d.valueOf())?"":d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"America/Los_Angeles"});};

 /* One window per cutoff week, using the current research policy. Older policy
    versions repeat the same calls and are not counted again. */
 function windows(data){
  const all=data.trackRecord||[];if(!all.length)return [];
  const policy=all.slice().sort((a,b)=>Date.parse(b.recordedAt)-Date.parse(a.recordedAt))[0].policyVersion;
  const through=Math.max(data.throughWeek,data.live?.throughWeek||0);
  return all.filter(s=>s.policyVersion===policy).sort((a,b)=>b.throughWeek-a.throughWeek).map(s=>{
   const live=new Map((data.live?.grades?.[`${s.throughWeek}|${s.policyVersion}`]||[]).map(g=>[g.playerId,g]));
   const calls=s.calls.map(c=>{const g=c.status==="graded"?c:live.get(c.playerId);return {...c,actualPpg:g?.actualPpg??null,appearances:g?.appearances??null,improvedByTwo:g?.improvedByTwo??null,source:c.status==="graded"?"saved":g?"live":null};});
   const done=s.lastWeek<=through,graded=calls.filter(c=>c.prospective&&M.finite(c.actualPpg));
   return {...s,calls,done,graded,remaining:Math.max(0,s.lastWeek-through)};
  });
 }
 function stats(calls){
  const n=calls.length;if(!n)return null;
  // Compare all three on the same calls so no method gets an easier sample.
  const same=calls.filter(c=>M.finite(c.currentPpg)&&M.finite(c.usagePpg)&&M.finite(c.outlookPpg));
  const err=key=>mean(same.map(c=>Math.abs(c[key]-c.actualPpg)));
  return {n,improved:calls.filter(c=>c.improvedByTwo).length,declined:calls.filter(c=>c.actualPpg-c.currentPpg<=-2).length,change:mean(calls.map(c=>c.actualPpg-c.currentPpg)),
   errCurrent:err("currentPpg"),errUsage:err("usagePpg"),errModel:err("outlookPpg")};
 }
 function headline(data){
  const w=windows(data),s=stats(w.flatMap(x=>x.graded));
  if(!s)return "";
  return `<strong>Track record so far:</strong> ${s.n} frozen calls graded across ${w.filter(x=>x.graded.length).length} finished windows. ${Math.round(100*s.improved/s.n)}% gained 2+ PPR per game; the average change was ${signed(s.change)}. <button type="button" data-open-view="track">See every call</button>`;
 }
 function scoreboard(s){
  const best=Math.min(s.errCurrent,s.errUsage,s.errModel);
  const cell=(label,v,note)=>`<div class="tr-stat${v===best?" best":""}"><span>${label}</span><strong>${f1(v)}</strong><small>${note}</small></div>`;
  return `<div class="tr-stats"><div class="tr-stat"><span>Calls graded</span><strong>${s.n}</strong><small>prospective only</small></div><div class="tr-stat"><span>Gained 2+ PPR/game</span><strong>${Math.round(100*s.improved/s.n)}%</strong><small>${s.improved} of ${s.n} · ${s.declined} fell 2+</small></div><div class="tr-stat"><span>Average change</span><strong>${signed(s.change)}</strong><small>PPR/game, later vs at the call</small></div></div><h3>Which number predicted later scoring best?</h3><p class="tr-deck">Average miss in PPR per game. Smaller is better; the best one is highlighted.</p><div class="tr-stats">${cell("Same as before",s.errCurrent,"assume no change")}${cell("Usage",s.errUsage,"what the workload implies")}${cell("Model estimate",s.errModel,"the four-week forecast")}</div>`;
 }
 function callTable(w){
  const rows=w.calls.slice().sort((a,b)=>(M.finite(b.actualPpg)?b.actualPpg-b.currentPpg:-99)-(M.finite(a.actualPpg)?a.actualPpg-a.currentPpg:-99));
  return `<div class="table-wrapper"><table class="research-table tr-calls"><caption>Calls frozen ${esc(date(w.recordedAt))} · data through Week ${w.throughWeek} · window Weeks ${w.firstWeek}–${w.lastWeek}</caption><thead><tr><th scope="col">Player</th><th scope="col">At the call</th><th scope="col">Usage</th><th scope="col">Model</th><th scope="col">After</th><th scope="col">Change</th><th scope="col">Result</th></tr></thead><tbody>${rows.map(c=>{
   const ch=M.finite(c.actualPpg)?c.actualPpg-c.currentPpg:null;
   const result=!w.done&&!M.finite(c.actualPpg)?'<span class="tr-chip pending">Pending</span>':c.appearances===0||!M.finite(c.actualPpg)?'<span class="tr-chip none">No games</span>':!c.prospective?'<span class="tr-chip none">Retrospective</span>':c.improvedByTwo?'<span class="tr-chip up">Gained 2+</span>':ch<=-2?'<span class="tr-chip down">Fell 2+</span>':'<span class="tr-chip flat">Within 2</span>';
   return `<tr><th scope="row"><button type="button" class="player-button" data-track-player="${esc(c.playerId)}">${esc(c.name)}</button><small>${esc(c.position)}</small></th><td class="number">${f1(c.currentPpg)}</td><td class="number">${f1(c.usagePpg)}</td><td class="number">${f1(c.outlookPpg)}</td><td class="number">${f1(c.actualPpg)}${M.finite(c.appearances)&&c.appearances>0?`<small>${c.appearances}g</small>`:""}</td><td class="number ${ch>=2?"gap-positive":ch<=-2?"gap-negative":""}">${signed(ch)}</td><td>${result}</td></tr>`;}).join("")}</tbody></table></div>`;
 }
 function render(data){
  const w=windows(data);if(!w.length)return "<p>No calls have been frozen yet.</p>";
  const s=stats(w.flatMap(x=>x.graded)),def=w[0].definition;
  const body=w.map((x,i)=>{const st=stats(x.graded);
   const label=x.done?`${st?st.n:0} graded · ${st?`${Math.round(100*st.improved/st.n)}% gained 2+ · avg ${signed(st.change)}`:"no prospective calls"}`:`in progress · ${x.remaining} week${x.remaining===1?"":"s"} left`;
   return `<details class="tr-window"${i===w.findIndex(y=>y.done)?" open":""}><summary><span>Week ${x.throughWeek} calls · Weeks ${x.firstWeek}–${x.lastWeek}</span><small>${x.calls.length} calls · ${label}</small></summary>${callTable(x)}</details>`;}).join("");
  return `${s?scoreboard(s):"<p>No windows have finished yet.</p>"}<p class="tr-honest"${s?"":" hidden"}>${!s?"":Math.min(s.errModel,s.errUsage)>=s.errCurrent?"<strong>Honest read:</strong> so far, neither usage nor the model beats simply assuming a player keeps scoring what he was scoring. The calls find players who rise on average, but not by as much as their usage suggests.":"<strong>Read with care:</strong> the model estimate has the smallest miss so far, but these windows overlap and repeat players, so they are not independent tests."}</p><h2>Every frozen call</h2><p class="tr-deck">${esc(def)} Results after Week ${esc(data.throughWeek)} are graded automatically each Tuesday from nflverse box scores using the same rule.</p>${body}<p class="tr-deck">Calls are never edited after they're saved. Missed games count as gaps, not zeros. Windows overlap, so the same player can appear in several of them.</p>`;
 }
 const api={windows,stats,headline,render};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;root.PublicTrackRecord=api;
})(typeof globalThis!=="undefined"?globalThis:this);
