/* Display-only chart and comparisons. Never modifies forecasts or source rows. */
(function(root){
 "use strict";
 const M=root.PublicTerminal||(typeof require!=="undefined"?require('./model.js'):null);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const point=x=>M.finite(x)?x.toFixed(1):'—';
 const signed=x=>M.finite(x)?`${Number(x.toFixed(1))>0?'+':''}${Number(x.toFixed(1)).toFixed(1)}`:'—';
 const team=x=>x==='LA'?'LAR':x;
 function gapCell(p){
  const raw=M.finite(p.ppg)&&M.finite(p.usagePpg)?p.usagePpg-p.ppg:null,adjusted=M.screenGap(p);
  const small=M.finite(p.games)&&p.games<4;
  return `<strong>${signed(raw)}</strong><small${small?' class="small-sample"':''}>${esc(p.games)} games${small?' · small sample':''}</small>`;
 }
 function outlookCell(p){
  const r=p.research||{},band=r.error_band_80;
  if(M.availability(p).blocked)return '<span>Unavailable</span><small>Check injury status</small>';
  return `<span>${point(r.outlook_ppg)}</span><small>${Array.isArray(band)&&band.length===2&&band.every(M.finite)?`typical range ${point(band[0])}–${point(band[1])}`:'Typical range unavailable'}</small>`;
 }
 function series(p,data){
  const cutoff=M.cutoffFor(data,p),rows=data.weeklyPlayerContext?.players?.[p.id]?.weeklyPoints||[];
  return rows.filter(r=>Number.isInteger(r.week)&&r.week>=1&&r.week<=cutoff).slice().sort((a,b)=>a.week-b.week);
 }
 function chart(p,data){
  const rows=series(p,data);
  if(!rows.length)return '<section class="player-chart"><h3>Weekly points versus usage</h3><p>No verified weekly series is linked. Missing games are not zeroes.</p></section>';
  const cutoff=M.cutoffFor(data,p),values=rows.flatMap(r=>[r.ppr,r.usage]).filter(M.finite),peak=Math.max(5,...values),step=peak>25?10:5,low=Math.floor(Math.min(0,...values)/step)*step,high=Math.ceil(peak/step)*step,span=high-low||1;
  const x=w=>38+(w-1)*334/Math.max(1,cutoff-1),y=v=>150-(v-low)*126/span;
  const dots=(key,cls)=>rows.filter(r=>M.finite(r[key])).map(r=>`<circle class="${cls}" cx="${x(r.week).toFixed(1)}" cy="${y(r[key]).toFixed(1)}" r="4"><title>Week ${r.week}: ${point(r[key])} ${key==='ppr'?'scored':'usage'} points</title></circle>`).join('');
  // Join only adjacent weeks with data. Never bridge a missing/bye week as zero.
  const segments=(key,cls)=>rows.slice(1).map((r,i)=>{const a=rows[i];return r.week===a.week+1&&M.finite(a[key])&&M.finite(r[key])?`<line class="${cls}" x1="${x(a.week).toFixed(1)}" y1="${y(a[key]).toFixed(1)}" x2="${x(r.week).toFixed(1)}" y2="${y(r[key]).toFixed(1)}"/>`:'';}).join('');
  const ticks=Array.from({length:Math.round(span/step)+1},(_,i)=>low+i*step).map(v=>`<line class="chart-grid" x1="38" x2="378" y1="${y(v)}" y2="${y(v)}"/><text x="29" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('');
  return `<section class="player-chart"><h3>Weekly points versus usage</h3><p class="chart-key"><span class="scored-key">Solid · scored</span><span class="usage-key">Dashed · usage</span> PPR points per appearance</p><svg class="weekly-chart" viewBox="0 0 400 180" role="img" aria-label="Weekly scored and usage points through Week ${cutoff}. Exact values in the table below.">${ticks}${segments('ppr','chart-scored')}${segments('usage','chart-usage')}${dots('ppr','chart-scored')}${dots('usage','chart-usage')}${Array.from({length:cutoff},(_,i)=>`<text x="${x(i+1)}" y="172" text-anchor="middle">W${i+1}</text>`).join('')}</svg><details><summary>Exact weekly numbers & missing games</summary><table class="chart-values"><caption>Recorded appearances only · through Week ${cutoff}</caption><thead><tr><th scope="col">Week</th><th scope="col">Scored</th><th scope="col">Usage</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">W${r.week} · ${esc(team(r.team))}</th><td>${point(r.ppr)}</td><td>${point(r.usage)}</td></tr>`).join('')}</tbody></table><p>Unrecorded weeks are gaps, not zeroes. Usage describes past opportunities, not a prediction. Values may use different source coverage from season aggregates.</p></details></section>`;
 }
 function percentile(value,pool){
  const valid=pool.filter(M.finite);if(!M.finite(value)||valid.length<5)return null;
  return {pct:Math.round(100*(valid.filter(x=>x<value).length+valid.filter(x=>x===value).length/2)/valid.length),n:valid.length,rank:1+valid.filter(x=>x>value).length};
 }
 function bars(p,data){
  const cutoff=M.cutoffFor(data,p),pool=data.players.filter(q=>q.position===p.position&&q.games>=3&&M.cutoffFor(data,q)===cutoff);
  const specs=[['Usage points',q=>q.usagePpg,false],['Snap share',q=>q.snapPct,true],...(p.position==='RB'?[['Touches/game',q=>q.touchesPerGame,false]]:p.position==='QB'?[['Pass attempts/game',q=>q.attemptsPerGame,false]]:[['Target share',q=>q.targetShare,true]])];
  return `<section class="workload-bars"><h3>Workload compared with other ${esc(p.position)}s</h3><p>Higher means more work, not better talent. Same position and cutoff; 3+ appearances.</p>${specs.map(([label,get,pct])=>{const value=get(p),rank=percentile(value,pool.map(get));return `<div class="workload-bar"><div><span>${label} · ${M.finite(value)?pct?`${Math.round(100*value)}%`:point(value):'—'}</span><span>${rank?`${rank.rank===1?'Highest':`#${rank.rank}`} of ${rank.n} ${esc(p.position)}s${pool.filter(q=>get(q)===value).length>1?' (tied)':''}`:'Not enough comparable data'}</span></div>${rank?`<div class="bar-track" aria-hidden="true"><span style="width:${rank.pct}%"></span></div>`:''}</div>`;}).join('')}<p>These include reported-unavailable players with recorded work; they are not current availability or breakout odds.</p></section>`;
 }
 const api={team,gapCell,outlookCell,series,chart,percentile,bars};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PublicWorkspace=api;
})(typeof globalThis!=='undefined'?globalThis:this);
