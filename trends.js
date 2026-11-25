/* Weekly scored-vs-usage series. Prefers data/live.json (refreshed every Tuesday by
   GitHub Actions) and falls back to the series saved in the model snapshot. */
(function(root){
 "use strict";
 const finite=x=>typeof x==="number"&&Number.isFinite(x);
 function weekly(p,data){
  const live=data?.live?.players?.[p.id]?.weekly;
  if(Array.isArray(live)&&live.length)return live.map(([week,team,ppr,usage,work,carries])=>({week,team,ppr,usage,work,carries})).sort((a,b)=>a.week-b.week);
  return (data?.weeklyPlayerContext?.players?.[p.id]?.weeklyPoints||[]).filter(r=>Number.isInteger(r.week)).slice().sort((a,b)=>a.week-b.week);
 }
 function through(data){return finite(data?.live?.throughWeek)?data.live.throughWeek:data?.throughWeek;}
 function currentTeam(p,data){const rows=weekly(p,data);return rows.length?rows[rows.length-1].team||p.team:p.team;}
 /* Last six weeks: solid line = scored, dashed = usage. Gaps stay gaps. */
 function spark(p,data,weeks=6){
  const end=through(data),start=Math.max(1,end-weeks+1),rows=weekly(p,data).filter(r=>r.week>=start&&r.week<=end);
  if(!rows.length)return '<span class="spark-empty">No recent games</span>';
  const vals=rows.flatMap(r=>[r.ppr,r.usage]).filter(finite),hi=Math.max(10,...vals),W=88,H=26;
  const x=w=>3+(w-start)*(W-6)/Math.max(1,end-start),y=v=>H-3-(Math.max(0,v)/hi)*(H-6);
  const path=key=>{let d="",prev=null;for(const r of rows){if(!finite(r[key])){prev=null;continue;}d+=`${prev!==null&&r.week===prev+1?"L":"M"}${x(r.week).toFixed(1)} ${y(r[key]).toFixed(1)}`;prev=r.week;}return d;};
  const last=rows[rows.length-1],label=rows.map(r=>`W${r.week} ${finite(r.ppr)?r.ppr.toFixed(1):"–"} scored / ${finite(r.usage)?r.usage.toFixed(1):"–"} usage`).join("; ");
  const dots=rows.filter(r=>finite(r.ppr)).map(r=>`<circle cx="${x(r.week).toFixed(1)}" cy="${y(r.ppr).toFixed(1)}" r="1.8"/>`).join("");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Weeks ${start}–${end}: ${label}"><title>${label}</title><path class="spark-usage" d="${path("usage")}"/><path class="spark-scored" d="${path("ppr")}"/>${dots}</svg><small class="spark-last">W${last.week}: ${finite(last.ppr)?last.ppr.toFixed(1):"–"}</small>`;
 }
 const api={weekly,through,currentTeam,spark};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;root.PublicTrends=api;
})(typeof globalThis!=="undefined"?globalThis:this);
