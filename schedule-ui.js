/* Raw schedule evidence, never an automatic player projection adjustment. */
(function(root){
 'use strict';
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=(x,d=1)=>finite(x)?x.toFixed(d):'Unavailable';
 const team=t=>t==='LAR'?'LA':t,displayTeam=t=>t==='LA'?'LAR':t;
 const positions=['WR','RB','TE','QB'];
 const options={ppr:'PPR allowed to position',rushYards:'Rushing yards allowed',passYards:'Gross passing yards allowed'};
 function normalize(state={}){
  const pos=positions.includes(state.sp)?state.sp:'WR';
  const metric=state.sm==='ppr'||(pos==='RB'&&state.sm==='rushYards')||(pos!=='RB'&&state.sm==='passYards')?state.sm:'ppr';
  const start=Number(state.ps),end=Number(state.pe);
  return {sp:pos,sm:metric||'ppr',sw:['next','regular','playoffs'].includes(state.sw)?state.sw:'next',ss:state.ss==='hard'?'hard':'easy',
   ps:Number.isInteger(start)&&start>=13&&start<=18?start:15,pe:Number.isInteger(end)&&end>=13&&end<=18?Math.max(end,Number.isInteger(start)&&start>=13&&start<=18?start:15):Math.max(17,Number.isInteger(start)&&start>=13&&start<=18?start:15),sq:String(state.sq||'').slice(0,100)};
 }
 function range(context,state){
  const s=normalize(state),first=context.throughWeek+1;
  return s.sw==='next'?[first,Math.min(18,first+3)]:s.sw==='regular'?[first,Math.min(18,s.ps-1)]:[Math.max(first,s.ps),s.pe];
 }
 function validate(context,data){
  if(!context)return null;
  if(context.season!==data.season||!Number.isInteger(context.throughWeek)||context.throughWeek>data.throughWeek||context.throughWeek<0||context.boardThroughWeek!==data.throughWeek||!Array.isArray(context.games)||!context.defenses||!context.league)throw Error('Unverified schedule snapshot');
  const keys=new Set(),teams=new Set();
  for(const g of context.games){
   if(!g.id||keys.has(g.id)||!Number.isInteger(g.week)||g.week<=context.throughWeek||g.week>18||!context.defenses[g.home]||!context.defenses[g.away]||g.home===g.away)throw Error('Invalid schedule identity');
   for(const t of [g.home,g.away]){const key=`${t}:${g.week}`;if(teams.has(key))throw Error('Duplicate scheduled team/week');teams.add(key);}
   keys.add(g.id);
  }
  for(const d of Object.values(context.defenses)){
   if(!Number.isInteger(d.games)||d.games<0||d.games>context.throughWeek)throw Error('Invalid defense sample');
   for(const [key,value] of Object.entries(d.values||{})){const rank=d.ranks?.[key];if((value!=null&&!finite(value))||(rank!=null&&(!Number.isInteger(rank)||rank<1||rank>32)))throw Error('Invalid defense allowance');}
  }
  return context;
 }
 function matchup(context,offense,position,week,metric='ppr'){
  const t=team(offense),g=context.games.find(g=>g.week===week&&(g.home===t||g.away===t));
  if(!g)return {week,bye:context.scheduleComplete===true,unavailable:context.scheduleComplete!==true};
  const opponent=g.home===t?g.away:g.home,d=context.defenses[opponent],key=metric==='ppr'?position:metric;
  return {week,gameId:g.id,date:g.date,opponent,away:g.away===t,allowance:d?.values?.[key]??null,rank:d?.ranks?.[key]??null,games:d?.games??0,smallSample:d?.smallSample===true};
 }
 function evaluate(player,data,state){
  const s=normalize(state),ctx=data.scheduleContext;
  if(!ctx)return {player,matchups:[],score:null,average:null,count:0};
  const [start,end]=range(ctx,s),matchups=[];
  for(let week=start;week<=end;week++)matchups.push(matchup(ctx,player.team,player.position,week,s.sm));
  const games=matchups.filter(m=>!m.bye),key=s.sm==='ppr'?player.position:s.sm,base=ctx.league[key];
  const known=games.length>0&&games.every(m=>finite(m.allowance)&&finite(m.rank))&&finite(base)&&base>0;
  const average=known?games.reduce((sum,m)=>sum+m.allowance,0)/games.length:null;
  return {player,matchups,count:games.length,average,score:known?(average/base-1)*100:null,league:base,
   smallSample:games.some(m=>m.smallSample)};
 }
 function rows(data,state){
  const s=normalize(state),q=s.sq.trim().toLowerCase();
  return data.players.filter(p=>p.position===s.sp&&(!q||`${p.name} ${displayTeam(p.team)}`.toLowerCase().includes(q)))
   .map(p=>evaluate(p,data,s)).sort((a,b)=>{
    if(finite(a.score)!==finite(b.score))return finite(a.score)?-1:1;
    return finite(a.score)&&a.score!==b.score?(s.ss==='hard'?a.score-b.score:b.score-a.score):a.player.name.localeCompare(b.player.name);
   });
 }
 function scoreText(value){return !finite(value)?'Unavailable':Math.abs(value)<.05?'League average':`${fmt(Math.abs(value))}% ${value>0?'more':'fewer'}`;}
 const tone=score=>!finite(score)?'':score>10?'schedule-easy':score< -10?'schedule-hard':'';
 const unit=s=>s.sm==='ppr'?'PPR/game':'yards/game';
 function chip(m){
  if(m.bye||m.unavailable)return `<span class="schedule-matchup schedule-muted">W${m.week}<strong>${m.bye?'Bye':'Unknown'}</strong><small>No game counted</small></span>`;
  return `<span class="schedule-matchup"><span>W${m.week} · ${m.away?'@':'vs'} ${esc(displayTeam(m.opponent))}</span><strong>${finite(m.rank)?`#${m.rank} · ${fmt(m.allowance)}`:'Unavailable'}</strong><small>${m.games} games${m.smallSample?' · small sample':''}</small></span>`;
 }
 function study(data){
  const study=data.scheduleStudy;
  if(!study)return '<p>Schedule research is not available in this snapshot. No forecast adjustment is applied.</p>';
  return `<section class="schedule-study"><h2>Does an easy schedule predict better scoring?</h2><p>Not reliably enough to change our forecasts. Adding position-specific schedule allowances barely changed average errors in the 2024–2025 tests. This page is matchup context, not a buy or breakout rating.</p><details><summary>See the backtest and its limits</summary><p>Trained on earlier seasons from 2021 onward, then evaluated 2024 and 2025 separately. At Weeks 4, 8 and 12, only earlier games built the defense rankings. The target was the following four weeks, per recorded appearance. Missed games were not zero.</p><div class="schedule-research-wrap" tabindex="0" role="region" aria-label="Schedule backtest table"><table class="schedule-research-table"><caption>Average prediction miss in PPR points/game · lower is better</caption><thead><tr><th scope="col">Position</th><th scope="col">Scoring + work</th><th scope="col">Plus schedule</th><th scope="col">Snapshots</th></tr></thead><tbody>${study.metrics.map(m=>`<tr><th scope="row">${esc(m.position)}</th><td>${fmt(m.baselineMAE,3)}</td><td>${fmt(m.scheduleMAE,3)}</td><td>${m.n}</td></tr>`).join('')}</tbody></table></div><p>“Scoring + work” uses past points, expected usage points, work per game and appearances. The fixed comparison adds only the schedule measure; it does not change the live model.</p><p>Every position’s uncertainty range includes no improvement. ${study.metrics.reduce((n,m)=>n+m.noLaterAppearance,0)} eligible snapshots with no later appearance are reported separately, not assigned zero points. Repeated players and shared opponents limit certainty. These seasons have been examined before: this is retrospective research, not a new untouched test. Passing/rushing yard measures were secondary checks, not a more flattering replacement.</p></details></section>`;
 }
 function render(data,state,selected){
  const s=normalize(state),ctx=data.scheduleContext;
  if(!ctx)return '<p>Schedule data is unavailable in this snapshot. Existing player estimates have not been changed.</p>';
  const [start,end]=range(ctx,s),list=rows(data,s),label=s.sw==='next'?'Next four weeks':s.sw==='regular'?'Before fantasy playoffs':'Fantasy playoffs';
  return `<div class="schedule-controls"><label>Position<select id="schedule-position">${positions.map(p=>`<option value="${p}"${p===s.sp?' selected':''}>${p}</option>`).join('')}</select></label><label>Compare defenses by<select id="schedule-metric">${['ppr',s.sp==='RB'?'rushYards':'passYards'].map(m=>`<option value="${m}"${m===s.sm?' selected':''}>${options[m]}</option>`).join('')}</select></label><label>Order<select id="schedule-sort"><option value="easy"${s.ss==='easy'?' selected':''}>Easiest first</option><option value="hard"${s.ss==='hard'?' selected':''}>Hardest first</option></select></label><label class="schedule-search-label">Find a player or team<input type="search" id="schedule-search" value="${esc(s.sq)}" placeholder="Name or team" autocomplete="off"></label></div><div class="schedule-windows" role="group" aria-label="Schedule window">${[['next','Next four weeks'],['regular','Before playoffs'],['playoffs','Fantasy playoffs']].map(([key,label])=>`<button type="button" data-schedule-window="${key}" aria-pressed="${s.sw===key}">${label}</button>`).join('')}</div><p class="schedule-cutoff">${esc(label)} · ${start<=end?`Weeks ${start}–${end}`:'No remaining weeks'} · defense stats through Week ${ctx.throughWeek}, ${ctx.season}. Rank #1 = fewest allowed.</p><details class="schedule-method"><summary>Metric, playoff weeks and limits</summary><p>${s.sm==='ppr'?`All opposing ${s.sp}s combined per defensive game, using standard PPR scoring; not one player’s projection.`:s.sm==='passYards'?'Gross passing yards allowed to all opposing passers. This is not net passing yards or an overall pass-defense grade.':'Rushing yards allowed to all rushers, including QBs. This does not measure RB receiving work; use PPR allowed for that.'} More allowed means an easier matchup by this measure, not a guaranteed scoring increase. Teams can look generous because of opponents, game pace or injuries.</p><p>Window comparison: average opponent allowance versus the game-weighted league average (${fmt(ctx.league[s.sm==='ppr'?s.sp:s.sm])} ${unit(s)}). Byes are excluded; a missing opponent value makes the comparison unavailable. All players on the same team/position share a schedule.</p><div class="schedule-playoffs"><label>Fantasy playoffs start<select id="schedule-playoff-start">${[13,14,15,16,17,18].map(w=>`<option value="${w}"${s.ps===w?' selected':''}>Week ${w}</option>`).join('')}</select></label><label>Fantasy playoffs end<select id="schedule-playoff-end">${[13,14,15,16,17,18].map(w=>`<option value="${w}"${s.pe===w?' selected':''}>Week ${w}</option>`).join('')}</select></label></div><p>Default Weeks 15–17 is editable, not a claim about your league. “Before playoffs” excludes those playoff weeks. These are NFL regular-season games, not NFL postseason games. No individual cornerback, slot/X role, future injury or return date is assumed. Fewer than four defense games is flagged as a small sample.</p><p><a href="${esc(ctx.sourceUrl)}" target="_blank" rel="noopener noreferrer">nflverse statistical definitions</a> · ${esc(ctx.source)}</p></details><p class="schedule-verdict">Historical test: schedule strength did not reliably improve predictions. <button type="button" id="schedule-evidence">View results</button></p><div class="schedule-table-wrap" tabindex="0" role="region" aria-label="Player schedules"><table class="schedule-table"><caption>${list.length} ${s.sp}s · ${options[s.sm]} · ${start<=end?`Weeks ${start}–${end}`:'No remaining games'}</caption><thead><tr><th scope="col">Player</th><th scope="col">Opponents allow<small>versus league average</small></th><th scope="col">Opponent details<small>Week · defense rank · ${unit(s)}</small></th></tr></thead><tbody>${list.map(r=>`<tr><th scope="row"><button type="button" class="player-button" data-schedule-player="${esc(r.player.id)}" aria-controls="player-panel" aria-expanded="${selected===r.player.id}">${esc(r.player.name)}</button><small>${esc(displayTeam(r.player.team))} · ${s.sp}${r.player.availability?.reportedUnavailable||r.player.availability?.seasonEnding?' · reported unavailable':''}</small></th><td class="schedule-comparison ${tone(r.score)}"><strong>${scoreText(r.score)}</strong><small>${fmt(r.average)} ${unit(s)} · ${r.count} game${r.count===1?'':'s'}${r.smallSample?' · small sample':''}</small></td><td><div class="schedule-matchups">${r.matchups.map(chip).join('')||'No remaining games in this window'}</div></td></tr>`).join('')}</tbody></table>${list.length?'':'<p class="schedule-empty">No players match. Try another name or position.</p>'}</div><div id="schedule-study-anchor">${study(data)}</div>`;
 }
 function panel(p,data,state={}){
  if(!data.scheduleContext)return '';
  const s=normalize({...state,sp:p.position}),r=evaluate(p,data,s),[start,end]=range(data.scheduleContext,s);
  const metricLabel=s.sm==='ppr'?`${p.position} PPR allowed`:options[s.sm].toLowerCase();
  const comparison=!finite(r.score)?'A complete matchup comparison is unavailable for this window.':Math.abs(r.score)<.05?`Opponents allow about the league average for ${metricLabel}.`:`Opponents allow <strong>${scoreText(r.score)}</strong> than the league average by ${metricLabel}.`;
  return `<section class="schedule-player"><h2>Upcoming matchups · ${start<=end?`Weeks ${start}–${end}`:'No remaining games'}</h2><p>${comparison} This does not raise or lower his model estimate.${p.availability?.reportedUnavailable||p.availability?.seasonEnding?' He is reported unavailable; these fixtures are not a promise he plays.':''}</p><div class="schedule-matchups">${r.matchups.map(chip).join('')||'No remaining games in this window'}</div><p class="detail-note">Rank #1 = fewest allowed. Stats through Week ${data.scheduleContext.throughWeek}; points are for all opposing ${s.sm==='ppr'?p.position+'s combined':'players'}, not his projected points. ${s.sm==='ppr'?'PPR':'Yards'}/game shown; byes are excluded.</p></section>`;
 }
 const api={normalize,range,validate,matchup,evaluate,rows,render,panel,study,scoreText};
 root.PublicSchedule=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
