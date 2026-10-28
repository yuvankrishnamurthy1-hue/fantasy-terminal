/* Observed workload screen only. Never edits points, forecasts, prices or calls. */
(function(root){
 'use strict';
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Fixed descriptive rules, not fitted weights or personal breakout odds.
 const rules={RB:{minimum:8,increase:2,relative:.20},WR:{minimum:3,increase:1,relative:.25},TE:{minimum:2,increase:1,relative:.25}};
 const point=x=>finite(x)?x.toFixed(1):'Unavailable';
 const pct=x=>finite(x)?`${Math.round(x*100)}%`:'Unavailable';
 const weeks=values=>values.map(w=>`W${w}`).join(', ');
 function evaluate(p,data){
  const rule=rules[p.position],a=p.roleResearch?.roleAlert;
  const unavailable=reason=>({qualifies:false,reason});
  if(!rule)return unavailable('This workload screen supports RB, WR and TE, not QB.');
  if(p.availability?.reportedUnavailable||p.availability?.seasonEnding)return unavailable('Reported unavailable; inspect All players or Injury opportunities.');
  if(!a||!['growing','no_sustained_increase'].includes(a.status))return unavailable('Needs five usable same-team appearances, without an injury-recovery or stale-sample flag.');
  const base=a.baselineWeeks,recent=a.recentWeeks;
  if(!Array.isArray(base)||base.length!==3||!Array.isArray(recent)||recent.length!==2)return unavailable('Needs three earlier and two recent appearances.');
  if([...base,...recent].some(w=>!Number.isInteger(w)||w<1)||new Set([...base,...recent]).size!==5||Math.max(...base)>=Math.min(...recent))return unavailable('The comparison weeks are not a valid ordered sample.');
  const cutoff=data?.refreshCoverage?.teamCutoffs?.[p.team]??data?.throughWeek??Math.max(...recent);
  if(Math.max(...recent)>cutoff||Math.max(...recent)<cutoff-1||Math.max(...recent)-Math.min(...recent)>2)return unavailable('The recent sample does not match this player’s football cutoff.');
  const b=a.work?.baseline,r=a.work?.recent;
  if(!finite(b)||!finite(r)||b<0||r<0)return unavailable('Comparable workload is missing; missing is not zero.');
  const delta=r-b,relative=b>0?delta/b:null;
  const supports=[['snap','snap share',.08],['share',p.position==='RB'?'backfield work share':'target share',.05]].filter(([key,,threshold])=>{
   const x=a[key];return finite(x?.baseline)&&finite(x?.recent)&&x.baseline>=0&&x.baseline<=1&&x.recent>=0&&x.recent<=1&&x.recent-x.baseline>=threshold-1e-9;
  });
  if(r<rule.minimum||delta<rule.increase-1e-9||(b>0&&relative<rule.relative-1e-9)||!supports.length)return unavailable('The workload increase or supporting snap/share increase is below this rule.');
  const c=data?.weeklyPlayerContext?.players?.[p.id],last=c?.status==='available'&&c.week===Math.max(...recent)?c.lastGame:null;
  const latest=finite(last?.work)?last.work:null;
  return {qualifies:true,baseline:b,recent:r,delta,relative,baselineWeeks:[...base],recentWeeks:[...recent],
   workLabel:p.position==='RB'?'Carries + targets':'Targets',support:supports.map(([key,label])=>({key,label,baseline:a[key].baseline,recent:a[key].recent})),
   latest,latestWeek:latest===null?null:c.week,mixed:latest!==null&&latest<b,
   latestConfirmed:latest!==null&&latest>=b,cutoff};
 }
 function oneLine(p,data){
  const g=evaluate(p,data);if(!g.qualifies)return '';
  return `${g.workLabel}: ${point(g.baseline)} to ${point(g.recent)}/game (+${point(g.delta)}).${g.mixed?` W${g.latestWeek}: ${point(g.latest)}, below the earlier average.`:' Recent two versus earlier three appearances.'}`;
 }
 function panel(p,data){
  const g=evaluate(p,data);if(!g.qualifies)return '';
  const row=(label,b,r)=>`<tr><th scope="row">${esc(label)}</th><td>${esc(b)}</td><td>${esc(r)}</td></tr>`;
  return `<section class="growing-opportunity" aria-label="Growing opportunity evidence"><h3>${g.mixed?'More work on average, but an uneven finish':'Growing opportunity'}</h3><p>${esc(oneLine(p,data))}</p><table class="growth-comparison"><caption>Recorded work, not projected points</caption><thead><tr><th scope="col">Involvement</th><th scope="col">${esc(weeks(g.baselineWeeks))} avg.</th><th scope="col">${esc(weeks(g.recentWeeks))} avg.</th></tr></thead><tbody>${row(g.workLabel,point(g.baseline),point(g.recent))}${g.support.map(s=>row(s.label,pct(s.baseline),pct(s.recent))).join('')}</tbody></table><p>${g.mixed?'The latest game is below his earlier workload average. The two-game average is up, but growth is not steady.':g.latestConfirmed?'The latest game also has at least as much work as the earlier average. This does not establish that the increase will last.':'The two-game average is higher. A linked latest-game comparison is unavailable; do not assume both games increased.'}</p><details><summary>Why he appears · rules and limits</summary>${method()}<p>Age, health, competition and price still matter. This is not a dynasty-career rating, a buy recommendation or a prediction that he breaks out. The scoring forecast and market price are unchanged.</p></details></section>`;
 }
 function method(){return '<p>Compare the latest two recorded appearances with the previous three on the same team. RBs need at least 2 more carries plus targets per game and 20% growth, reaching 8 per game. WR/TE need at least 1 more target per game and 25% growth, reaching 3 for WR or 2 for TE. A zero baseline requires the absolute increase and minimum workload; it is not an infinite percentage increase.</p><p>Also require snap share to rise by at least 8 percentage points or workload share by 5. A move from 50% to 58% is 8 percentage points. RB workload share counts carries plus targets among team RBs; WR/TE use target share. These are descriptive cutoffs, not historically optimized weights or tested breakout probabilities. A two-game average can hide one big game.</p><p>No low-scoring, positive-gap, market-price or top-scorer exclusion is applied. Reported-unavailable players, unsupported QBs, stale samples, team-change comparisons and flagged injury-recovery samples stay out. A missing report is not proof of health. Missing or missed appearances are not zeroes.</p>';}
 const api={rules,evaluate,oneLine,panel,method};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PublicGrowingOpportunity=api;
})(typeof globalThis!=='undefined'?globalThis:this);
