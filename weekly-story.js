/* Latest-game briefing. Display context only: never edits scores or forecasts. */
(function(root){
 "use strict";
 const M=root.PublicTerminal||(typeof require!=="undefined"?require("./model.js"):null);
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=(v,n=1)=>M.finite(v)?M.fmt(v,n):"—";
 const percent=v=>M.finite(v)?`${fmt(v*100,0)}%`:"—";
 const get=(p,data)=>data.weeklyPlayerContext?.players?.[p.id];
 const date=v=>{const d=new Date(v);return v&&!Number.isNaN(d.valueOf())?d.toLocaleString("en-US",{timeZone:"America/Los_Angeles",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"not available";};
 function oneLine(p,data,lens){
  const c=get(p,data);if(c?.status!=="available")return M.oneLine(p,lens);
  const l=c.lastGame;
  if(!l)return `Week ${c.week}: no recorded scoring appearance${c.ownInjury?.status?`; report: ${c.ownInjury.status}`:""}.`;
  const count=(v,one,many)=>`${fmt(v,0)} ${v===1?one:many}`;
  const work=p.position==="RB"?`${count(l.carries,"carry","carries")} + ${count(l.targets,"target","targets")}`:p.position==="QB"?count(l.attempts,"attempt","attempts"):count(l.targets,"target","targets");
  const q=c.quarterback;
  const injury=c.teammates?.find(t=>t.possibleOpening&&t.aheadOnDepthChart);
  const context=q?.backupWithInjuryEvidence?`; ${q.actualName} at QB`:injury?`; ${injury.name} listed ${injury.status}`:M.finite(l.snapShare)?`; ${percent(l.snapShare)} snaps`:"";
  return `W${c.week}: ${work}${context}.`;
 }
 function injuryNotes(p,c){
  const notes=[],q=c.quarterback;
  if(q?.backupWithInjuryEvidence){
   const r=q.usualStatus||{};
   notes.push({title:`${q.actualName} played instead of ${q.usualName}`,text:`${q.actualName} led the passing work with ${q.passers?.[0]?.attempts??"unlinked"} attempts. ${q.usualName} was listed ${r.status}${r.injury?` (${r.injury})`:""} in Week ${r.reportWeek}. A starter's return could change the passing environment; no return date is verified.`});
  }else if(q?.actualName&&p.position!=="QB"){
   const r=q.usualStatus||{},same=q.actualName===q.usualName;
   notes.push({title:`Quarterback: ${q.actualName}`,text:q.changed?`He led the passing attempts rather than ${q.usualName}.${r.status?` ${q.usualName}'s latest saved status is Week ${r.reportWeek} ${r.status}${r.injury?` (${r.injury})`:""}.`:""} These observations do not establish that an injury caused the earlier QB change.`:same&&r.status?`${q.actualName} was listed ${r.status}${r.injury?` (${r.injury})`:""} for Week ${r.reportWeek}, but he recorded ${q.passers?.[0]?.attempts??"unlinked"} attempts in this game. That is not a new report ruling him out next week.`:`${q.passers?.[0]?.completions??"—"} completions on ${q.passers?.[0]?.attempts??"—"} attempts, ${q.passers?.[0]?.yards??"—"} passing yards in Week ${c.week}.`});
  }
  for(const t of c.teammates||[]){
   const workload=p.position==="RB"&&t.position==="RB"?t.priorWork:t.priorTargets;
   const kind=p.position==="RB"&&t.position==="RB"?"carries + targets":"targets";
   let text=`${t.relationship}.`;
   if(M.finite(workload)&&t.priorGames)text+=` He averaged ${fmt(workload)} ${kind} across his previous ${t.priorGames} recorded appearance${t.priorGames===1?"":"s"}.`;
   if(t.recordedAppearance)text+=` He has a scoring appearance in this game, so his workload cannot simply be counted as vacant.`;
   else if(t.possibleOpening)text+=` ${t.newAbsenceThisGame?"He appeared in the previous team game; this absence is new in that comparison.":"This may be an ongoing absence, not a new opening this week."} It can open work, but does not tell us who gets all of it.`;
   else text+=" This is a report to monitor, not a confirmed extra workload.";
   notes.push({title:`${t.name} · Week ${t.reportWeek} ${t.status}${t.injury?` (${t.injury})`:""}`,text});
  }
  return notes;
 }
 function comparison(p,c){
  const l=c.lastGame,b=c.previousThree||{};
  if(!l)return '<p class="week-empty">No scoring line is filled in as zero. Check the report and participation before interpreting the season average.</p>';
  const rows=p.position==="RB"?[["Carries",l.carries,b.carries,false],["Targets",l.targets,b.targets,false]]:p.position==="QB"?[["Pass attempts",l.attempts,b.work,false]]:[["Targets",l.targets,b.targets,false],["Target share",l.targetShare,b.targetShare,true]];
  rows.push(["Offensive snaps",l.snapShare,b.snapShare,true]);
  return `<table class="week-comparison"><caption>Last game versus earlier appearances · not a forecast</caption><thead><tr><th scope="col">Involvement</th><th scope="col">Week ${c.week}</th><th scope="col">Previous ${b.games||0} avg.</th></tr></thead><tbody>${rows.map(([label,v,prior,pct])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(pct?percent(v):fmt(v))}</td><td>${b.games?esc(pct?percent(prior):fmt(prior)):"—"}</td></tr>`).join("")}</tbody></table>`;
 }
 function enhance(base,p,data,lens,icons={}){
  const c=get(p,data);if(c?.status!=="available")return base;
  const sources=data.weeklyPlayerContext.sources||{},l=c.lastGame,notes=injuryNotes(p,c);
  const start=base.indexOf('<div class="panel-story">'),end=base.indexOf('<button type="button" class="panel-watch"');
  if(start<0||end<0)return base;
  const full=base.slice(start,end),blocked=M.availability(p).blocked;
  const risks=[];
  if(c.held)risks.push(`Scoring held through Week ${c.throughWeek}. His team's Week ${data.throughWeek} game is not included.`);
  if(c.byeSinceLastGame)risks.push(`His latest completed team game is Week ${c.week}. The later bye adds no zero-point appearance.`);
  if(c.ownInjury?.status)risks.push(`His own latest saved status: Week ${c.ownInjury.reportWeek} ${c.ownInjury.status}${c.ownInjury.injury?` (${c.ownInjury.injury})`:""}. This is not confirmation of next week's availability.`);
  else if(blocked)risks.push("The saved availability overlay flags him unavailable. Review the dated source before treating his points as usable this week.");
  if(lens==="dynasty"&&M.ageGroup(p)==="veteran")risks.push(`At ${p.ageYears}, current usefulness is not the same as long-term dynasty upside.`);
  const scoring=l?`<p class="week-scoring">${fmt(l.ppr)} <span>PPR points in Week ${c.week}</span>${M.finite(l.usage)?`<span class="week-usage">${fmt(l.usage)} from recorded usage</span>`:""}</p>`:"";
  const scoringChances=l&&p.position!=="QB"?(p.position==="RB"?`${fmt(l.inside5Carries,0)} carries inside the 5 · ${fmt(l.redZoneCarries,0)} red-zone carries`:`${fmt(l.redZoneTargets,0)} red-zone targets · ${fmt(l.deepTargets,0)} targets 20+ yards downfield`):"";
  const price=p.market?.[lens];
  const quickReference=`<dl class="week-reference"><div><dt>Season PPR / game</dt><dd>${fmt(p.ppg)}</dd></div><div><dt>Model estimate</dt><dd>${fmt(p.research?.outlook_ppg)}</dd></div><div><dt>${esc(lens)} market rank</dt><dd>${price?esc(p.position)+fmt(price.positionRank,0):"—"}</dd></div></dl>`;
  return `<div class="panel-topbar"><span>Player summary · ${esc(lens)}</span><button type="button" class="icon-button" id="close-player" aria-label="Close player summary">${icons.close||"Close"}</button></div><div class="panel-body weekly-briefing"><div class="panel-player"><div><h2 id="detail-title">${esc(p.name)}</h2><p>${esc(p.position)} · ${esc(p.team)}${M.finite(p.ageYears)?` · age ${p.ageYears}`:""} · ${esc(p.games)} recorded games</p></div></div>${risks.length?`<div class="week-cautions">${risks.map(r=>`<p>${esc(r)}</p>`).join("")}</div>`:""}<section class="week-lead" aria-labelledby="week-story-title"><h3 id="week-story-title">${esc(c.headline)}</h3><p>${esc(c.summary)}</p>${scoring}${quickReference}</section>${comparison(p,c)}${scoringChances?`<p class="week-chances">Week ${c.week}: ${esc(scoringChances)}. Counted from recorded plays; missing counts are shown as —.</p>`:""}<section class="week-injuries" aria-labelledby="week-injury-title"><h3 id="week-injury-title">Who's affecting his role?</h3>${notes.length?notes.map(n=>`<div class="week-context-item"><h4>${esc(n.title)}</h4><p>${esc(n.text)}</p></div>`).join(""):'<p>No relevant teammate report was linked. That does not prove the team is healthy.</p>'}</section><section class="week-next" aria-labelledby="week-next-title"><h3 id="week-next-title">What to watch next</h3><p>${esc(c.watchNext)}</p></section><details class="week-sources"><summary>Source dates & what we don't know</summary><p>Scoring through Week ${c.throughWeek}; latest team game Week ${c.week}. Comparison: his previous ${c.previousThree.games} recorded appearances on this team${c.previousThree.weeks.length?` (Weeks ${c.previousThree.weeks.join(", ")})`:""}. No missed-game zeroes are added.</p><p>nflverse injury reports: Week ${sources.injuryReportWeek||"unavailable"}, observed ${esc(date(sources.injuryObservedAt))} (${esc(sources.injurySourceStatus||"unavailable")}). Depth chart dated ${esc(date(sources.depthProviderAt))}. A new download is not a new Week ${data.throughWeek+1} report.</p><p>Depth order is a position slot, not a promise of touches. Injuries and QB changes are explanatory context, not a numerical forecast adjustment or a verified return date.</p></details><details class="season-evidence"><summary>Season outlook, market & all supporting data</summary><div class="season-evidence-content">${full}</div></details><button type="button" class="panel-watch" id="panel-watch" aria-pressed="${!!icons.saved}">${icons.star||""}${icons.saved?"Remove from watchlist":"Add to watchlist"}</button><p class="detail-footnote">Standard PPR. This is a research summary, not a buy rating or a promise that the role will last.</p></div>`;
 }
 const api={get,oneLine,injuryNotes,comparison,enhance};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.WeeklyPlayerStories=api;
})(typeof globalThis!=="undefined"?globalThis:this);
