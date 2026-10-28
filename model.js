/* Public evidence helpers. Descriptive filters, never new player forecasts. */
(function(root){
  "use strict";
  const finite=x=>typeof x==="number"&&Number.isFinite(x);
  const fmt=(x,d=1)=>finite(x)?x.toFixed(d):"Unavailable";
  const limits={WR:30,RB:28,TE:30,QB:35};
  const gap=p=>finite(p.research?.gap)?p.research.gap:finite(p.ppg)&&finite(p.usagePpg)?p.usagePpg-p.ppg:null;
  const screenGap=p=>finite(p.research?.shrunk_gap)?p.research.shrunk_gap:finite(gap(p))&&finite(p.games)?gap(p)*p.games/(p.games+4):null;
  function oneLine(p,lens="dynasty"){
    const a=availability(p),r=p.research,f=p.facts||{};
    if(a.blocked)return `${a.label}; past usage is not an available start.`;
    if(p.games<3)return `${p.games} recorded games; too little evidence for the new outlook.`;
    if(p.roleResearch?.roleAlert?.rising){const a=p.roleResearch.roleAlert;return `${p.position==='RB'?'Carries + targets':'Targets'} ${fmt(a.work?.baseline)} → ${fmt(a.work?.recent)}/game; ${a.pointsLagging?'points lagging.':'two-game role increase, not a buy rating.'}`;}
    if(finite(r?.td_gap)&&r.td_gap>=1.5)return `TD scoring trails opportunities by ${fmt(r.td_gap)} points/game; not automatically luck.`;
    if(p.position==="RB"&&finite(f.inside5Carries)&&f.inside5Carries>=3)return `${fmt(p.touchesPerGame)} touches/game; ${f.inside5Carries} carries inside the five.`;
    if(finite(f.deepTargets)&&finite(f.deepCatches)&&f.deepTargets>=6&&f.deepCatches/f.deepTargets<.4)return `${f.deepCatches} catches on ${f.deepTargets} deep targets; check the missed connections.`;
    if(finite(f.redZoneTargets)&&f.redZoneTargets>=5)return `${f.redZoneTargets} red-zone targets; ${finite(f.receivingTDs)?f.receivingTDs:"unlinked"} receiving TDs.`;
    if(r?.partial_count)return `Week ${r.partial_weeks.join(", ")} flagged for injury-report / low-snap sensitivity.`;
    if(lens==="dynasty"&&ageGroup(p)==="veteran")return `Age ${p.ageYears}: contender points and multi-year dynasty value are different.`;
    if(finite(p.targetShare))return `${fmt(p.targetShare*100,0)}% target share; ${fmt(p.targetsPerGame)} targets/game.`;
    return describe(p,lens).text;
  }
  function availability(p,now=Date.now()){
    const a=p.availability||{},review=Date.parse(a.reviewAfter);
    const fresh=a.sourceStatus==="ok"&&Number.isFinite(review)&&now<=review;
    return {...a,blocked:a.reportedUnavailable===true||a.seasonEnding===true,fresh,
      label:(a.status||"Unverified")+(a.status&&a.status!=="Unverified"&&!fresh?" · needs recheck":"")};
  }
  // Re-export time alone is not a data change worth interrupting a reader for.
  const sameSnapshot=(a,b)=>JSON.stringify({...a,builtAt:undefined})===JSON.stringify({...b,builtAt:undefined});
  function ageGroup(p){return !finite(p.ageYears)?"unknown":p.ageYears>=limits[p.position]?"veteran":"development";}
  function validate(data){
    if(!data||!Number.isInteger(data.season)||!Number.isInteger(data.throughWeek)||data.throughWeek<1||data.throughWeek>18||!Array.isArray(data.players)||!data.players.length||data.privacy?.privateLeagueDataIncluded!==false)throw Error("Invalid public snapshot");
    const ids=new Set();
    for(const p of data.players){
      if(!p.id||typeof p.name!=="string"||!Object.hasOwn(limits,p.position)||ids.has(p.id))throw Error("Invalid player identity");
      for(const key of ["ppg","usagePpg","games","ageYears","footballScore","dynastyPreviewScore","roleStability","confidence"])if(p[key]!=null&&!finite(p[key]))throw Error("Invalid numeric field");
      if(p.gameHealth){for(const key of ['recordedGames','recordedPpg','recordedUsagePpg','comparisonGames','comparisonPpg','comparisonUsagePpg'])if(p.gameHealth[key]!=null&&!finite(p.gameHealth[key]))throw Error('Invalid injury comparison');if(p.gameHealth.comparisonGames>p.gameHealth.recordedGames)throw Error('Invalid comparison sample');}
      ids.add(p.id);
    }
    if(data.tradeWatch?.status==='available'){
      if(data.tradeWatch.season!==data.season||data.tradeWatch.throughWeek!==data.throughWeek)throw Error('Mismatched trade context');
      for(const c of data.tradeWatch.candidates){const p=data.players.find(p=>p.id===c.playerId);if(!p||p.team!==c.team||c.tradeProbability!=null||c.projectedPpg!=null)throw Error('Invalid trade scenario');}
      for(const e of data.tradeWatch.announcedMoves||[]){
        if(e.numericAdjustment!=null||e.footballThroughWeek!==data.throughWeek||!Array.isArray(e.affectedPlayers))throw Error('Invalid announced transaction');
        for(const a of e.affectedPlayers){const p=data.players.find(p=>p.id===a.id);if(!p||p.team!==a.team||p.position!==a.position||(['G','C','T','OT','OG','OL'].includes(e.position)&&!['RB','QB'].includes(a.position)))throw Error('Invalid transaction player');}
      }
    }
    if(data.injuryOpportunities?.status==='available'){
      const s=data.injuryOpportunities;
      if(s.season!==data.season||s.throughWeek!==data.throughWeek||!Array.isArray(s.cases))throw Error('Mismatched injury opportunities');
      for(const c of s.cases){
        const absent=data.players.find(p=>p.id===c.id);
        if(!absent||absent.team!==c.team||!availability(absent).blocked)throw Error('Invalid absence identity');
        for(const b of c.beneficiaries){
          const p=data.players.find(p=>p.id===b.id);
          if(!p||p.team!==c.team||p.id===c.id||availability(p).blocked)throw Error('Invalid beneficiary');
          for(const v of [b.targetAllocation,b.carryAllocation])if(v!=null&&(!Array.isArray(v)||v.length!==3||v.some(x=>!finite(x)||x<0)))throw Error('Invalid allocation');
        }
        for(const [metric,reserve,reference] of [['targetAllocation','targetReserve','referenceTargets'],['carryAllocation','carryReserve','referenceCarries']])if(c[reserve]!=null){
          if(!finite(c[reference])||c[reference]<0||!Array.isArray(c[reserve])||c[reserve].length!==3)throw Error('Invalid opportunity pool');
          for(let i=0;i<3;i++){const sum=c.beneficiaries.reduce((v,b)=>v+(b[metric]?.[i]||0),0)+c[reserve][i];if(!finite(sum)||Math.abs(sum-c[reference])>1e-6)throw Error('Opportunity pool does not balance');}
        }
      }
    }
    return data;
  }
  function filter(players,state,data){
    const search=(state.query||"").toLowerCase().trim(),saved=new Set(state.watchlist||[]);
    const rows=players.filter(p=>{
      if(state.view==="watchlist"&&!saved.has(p.id))return false;
      if(state.position!=="ALL"&&p.position!==state.position)return false;
      if(search&&!`${p.name} ${p.team}`.toLowerCase().includes(search))return false;
      if(state.group==="veteran"&&ageGroup(p)!=="veteran")return false;
      if(state.group==="role"&&(!p.roleResearch?.roleAlert?.rising||availability(p).blocked))return false;
      if(state.group==="growing"&&!(root.PublicGrowingOpportunity||(typeof require!=='undefined'?require('./growing-opportunity.js'):null))?.evaluate(p,data).qualifies)return false;
      if(state.group==="development"&&ageGroup(p)!=="development")return false;
      if(state.group==="gap"&&availability(p).blocked)return false;
      if(state.group==='excess'&&(!(gap(p)<=-2)||!(p.games>=3)||availability(p).blocked))return false;
      if(state.group==='unexplained'&&(!(p.efficiencyContext?.unexplainedGap>=2)||!(p.efficiencyContext?.historyGames>=16)||!(p.games>=3)||availability(p).blocked))return false;
      if(state.group==='cheaper'&&!(root.PublicValueEvidence||(typeof require!=='undefined'?require('./value-evidence-ui.js'):null))?.fresh(p,state.lens).current)return false;
      if(state.group==="cheaper"&&(state.lens!=="redraft"||availability(p).blocked||!finite(p.research?.outlook_ppg)||p.research?.marketScreenAllowed!==true||!(p.research?.redraftRankGap>=8)||!(p.games>=3)))return false;
      if(state.group==="gap"&&(!(gap(p)>=2)||!(p.games>=3)||(state.lens==="dynasty"&&ageGroup(p)!=="development")))return false;
      return true;
    });
    const value=p=>state.sort==='excess'?(finite(gap(p))?-gap(p):null):state.sort==='unexplained'?p.efficiencyContext?.unexplainedGap:state.sort==="growth"?(root.PublicGrowingOpportunity||(typeof require!=='undefined'?require('./growing-opportunity.js'):null))?.evaluate(p,data).delta:state.sort==="gap"?gap(p):state.sort==="rawgap"?gap(p):state.sort==="outlook"?(availability(p).blocked?null:p.research?.outlook_ppg):state.sort==="market"?p.market?.[state.lens]?.score:state.sort==="marketgap"?(state.lens==="redraft"?p.research?.redraftRankGap:null):state.sort==="usage"?p.usagePpg:state.sort==="football"?p.footballScore:state.sort==="age"?p.ageYears:p.ppg;
    return rows.sort((a,b)=>{
      if(state.sort==="name")return a.name.localeCompare(b.name);
      const av=value(a),bv=value(b);
      if(!finite(av)||!finite(bv))return finite(av)?-1:finite(bv)?1:a.name.localeCompare(b.name);
      return (state.sort==="age"?av-bv:bv-av)||a.name.localeCompare(b.name);
    });
  }
  function describe(p,lens="dynasty"){
    const f=p.facts||{},sample=p.sampleContext||{},difference=gap(p),cautions=[];
    let title="Start with the recorded role",text=`${fmt(p.ppg)} PPR points per recorded appearance. Scoring alone does not explain the opportunity behind it.`;
    if(finite(p.games)&&p.games<3){title="The sample is the story";text=`Only ${fmt(p.games,0)} recorded appearance${p.games===1?"":"s"}. ${fmt(p.ppg)} PPR per game is not enough to establish a dependable role${finite(p.snapPct)?`; he played ${fmt(100*p.snapPct,0)}% of offensive snaps`:""}.`;}
    else if(p.position==="RB"&&p.rbContingencyCurrentFlag===true){title="Check whether this workload lasts";text=`${fmt(p.touchesPerGame)} touches per recorded game, with a teammate-absence workload flag in the saved context. That role could change when the missing player returns; no return date is assumed.`;}
    else if(p.position==="QB"&&finite(p.attemptsPerGame)){title="Passing volume and rushing access";text=`${fmt(p.attemptsPerGame)} pass attempts and ${fmt(p.rushYardsPerGame)} rushing yards per recorded game. His ${fmt(p.usagePpg)} usage-based points combine passing and rushing opportunities—not a guaranteed next-start projection.`;}
    else if(sample.lateBlowoutTargets>=3&&sample.lateBlowoutTargets/Math.max(1,sample.targetedPlays)>=.35){title="Check the game situation";text=`${sample.lateBlowoutTargets} of ${sample.targetedPlays} targeted plays came in the fourth quarter with a lead or deficit of at least 21 points. Those chances may not repeat in a normal game.`;}
    else if(f.deepTargets>=6&&finite(f.deepCatches)&&f.deepCatches/f.deepTargets<.4){title="The downfield chances haven't connected";text=`${f.deepTargets} throws traveled at least 20 yards downfield; ${f.deepCatches} were caught. There are big-play chances here, but this does not tell us whether the receiver, quarterback or coverage caused the misses.`;}
    else if(f.redZoneTargets>=8){title="A real role near the end zone";text=`${f.redZoneTargets} targets came inside the opponent's 20-yard line${finite(f.inside10Targets)?`, including ${f.inside10Targets} inside the 10`:""}. ${finite(f.receivingTDs)?`His season receiving-touchdown total is ${f.receivingTDs}. `:""}The scoring chances matter; future touchdowns are not owed.`;}
    else if(p.targetShare>=.25){title="He's earning a large share of the offense";text=`${fmt(p.targetsPerGame)} targets per game and an average ${fmt(p.targetShare*100,0)}% weekly target share. That is repeated involvement, not just a touchdown-driven box score.`;}
    else if(p.touchesPerGame>=18){title="The workload is worth watching";text=`${fmt(p.touchesPerGame)} touches per recorded game${finite(p.snapPct)?` and ${fmt(100*p.snapPct,0)}% offensive snap share`:""}. The key question is whether that workload lasts—not simply whether last week's points repeat.`;}
    else if(finite(p.snapPct)&&p.snapPct<.35){title="The role is still limited";text=`He played ${fmt(100*p.snapPct,0)}% of offensive snaps. A quiet scoring average may reflect limited access rather than hidden breakout value.`;}
    else if(difference>=2){title="The workload is ahead of the scoring";text=`${fmt(p.ppg)} actual PPR per game against ${fmt(p.usagePpg)} from recorded opportunities. That ${fmt(difference)}-point gap is worth investigating, not a promise of more points next week.`;}
    else if(difference<=-2){title="Scoring is running ahead of opportunity";text=`His ${fmt(p.ppg)} PPR per game is ${fmt(-difference)} above the usage estimate. Touchdowns or big plays may explain it; better players can also outperform an average-player opportunity estimate.`;}
    else if(finite(p.targetsPerGame)){title="What his receiving role looks like";text=`${fmt(p.targetsPerGame)} targets per game${finite(p.snapPct)?` on ${fmt(100*p.snapPct,0)}% offensive snap share`:""}. Repeated targets matter more than interpreting one hot or cold game.`;}
    if(finite(p.games)&&p.games<4)cautions.push(`Only ${fmt(p.games,0)} recorded appearances. A single unusual game can move the average substantially.`);
    if(lens==="dynasty"&&ageGroup(p)==="veteran")cautions.unshift(`At ${p.ageYears}, he may help a contender now. That is not the same as a long-term dynasty breakout or proof the market underprices him.`);
    if(ageGroup(p)==="unknown")cautions.push("Verified age is unavailable. No youth advantage or remaining-career estimate is assumed.");
    if(p.position==="QB"&&p.qbCurrentName&&p.qbCurrentName!==p.name)cautions.push(`The saved current-team QB is ${p.qbCurrentName}, not this player. His scoring sample does not confirm a current starting job.`);
    if(difference>=2&&f.redZoneTargets===0&&(!finite(f.redZoneCarries)||f.redZoneCarries===0))cautions.push("No red-zone targets or carries were recorded. Low touchdowns are not automatically bad luck.");
    const a=availability(p);
    if(a.blocked){title=a.seasonEnding?"Not a this-season rebound candidate":"Availability comes before the usage gap";text=`${a.label}${a.reportWeek?` in the Week ${a.reportWeek} source`:""}. His past averages still describe his past work, but do not imply he can play now. ${a.returnEstimate||"Return timing is unverified."}`;cautions.unshift("Excluded from the immediate scoring-below-usage screen. Still inspectable here for injury-stash and longer-term research; no dynasty score or past PPG was zeroed.");}
    else if(a.status==="Questionable")cautions.unshift("Listed questionable. Check the latest report before using him; a return or full workload is not guaranteed.");
    else cautions.push("Current availability is unverified here. No linked injury report does not mean healthy.");
    if(!cautions.length)cautions.push("This describes past work. Health, teammates and playing time can change the next opportunity.");
    return {title,text,cautions,ageGroup:ageGroup(p),difference};
  }
  function cutoffFor(data,p){return data.refreshCoverage?.teamCutoffs?.[p.team]??data.throughWeek;}
  function cutoffLabel(data){const c=data.refreshCoverage;return c?.status==="partial"?`${data.season} · Week ${data.throughWeek} ${c.reason==="source_delay"?"source delay":"partial"} · ${c.preservedTeams.join(" / ")} still Week ${c.preservedTeamCutoff}`:`${data.season} · through Week ${data.throughWeek}`;}
  const api={finite,fmt,gap,screenGap,oneLine,sameSnapshot,ageGroup,validate,filter,describe,availability,limits,cutoffFor,cutoffLabel};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.PublicTerminal=api;
})(typeof globalThis!=="undefined"?globalThis:this);
