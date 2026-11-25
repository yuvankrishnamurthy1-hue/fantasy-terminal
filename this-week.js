/* "This week": start/sit and waiver pickups ranked by projected points.
   Projection = the model's per-game estimate x scheduled games (byes count as 0;
   reported Out/IR count as 0). Full PPR. Decision support, not a guarantee. */
(function(root){
 "use strict";
 const M=root.PublicTerminal,T=root.PublicTrends,SL=root.PublicSleeper;
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const f1=x=>M.finite(x)?x.toFixed(1):"—";
 const POS=["QB","RB","WR","TE"];
 const ELIGIBLE={QB:["QB"],RB:["RB"],WR:["WR"],TE:["TE"],FLEX:["RB","WR","TE"],WRRB_FLEX:["WR","RB"],REC_FLEX:["WR","TE"],SUPER_FLEX:["QB","RB","WR","TE"]};
 const SLOT_LABEL={FLEX:"Flex",WRRB_FLEX:"W/R flex",REC_FLEX:"W/T flex",SUPER_FLEX:"Superflex"};
 // Without a league: "likely on waivers" in a 12-team league, by redraft market rank.
 const DEEP={QB:15,RB:36,WR:48,TE:15};
 const ui={pos:"ALL",league:null,teamId:null,status:"",busy:false,choices:null,input:""};

 /* League scoring: the model is full PPR. Shift each pass-catcher by
    (league points per catch - 1) x his expected catches per game. */
 function catchAdjust(p,league){const per=league?.perCatch?.[p.position],exp=p.usageBreakdown?.receptions;return M.finite(per)&&M.finite(exp)?(per-1)*exp:0;}
 function project(p,data,league){
  const a=M.availability(p),raw=p.research?.outlook_ppg,rate=M.finite(raw)?raw+catchAdjust(p,league):raw,team=T.currentTeam(p,data);
  const games=(data.live?.upcoming?.[team]||[]),next=data.live?.nextWeek;
  const thisGame=games.find(g=>g.week===next)||null;
  const usable=M.finite(rate)&&!a.blocked;
  const defense=thisGame?data.scheduleContext?.defenses?.[thisGame.opp]:null,rank=defense?.ranks?.[p.position];
  return {p,team,rate:usable?rate:null,blocked:a.blocked,status:a.status,questionable:a.status==="Questionable",
   games:games.length,total:usable?rate*games.length:null,week:usable?(thisGame?rate:0):null,thisGame,bye:!thisGame&&!!games.length,
   matchup:M.finite(rank)?(rank>=24?"soft":rank<=8?"tough":"neutral"):null,rank};
 }
 function sleeperMap(data){const m=new Map();for(const [id,v] of Object.entries(data.live?.players||{}))if(v.sleeper)m.set(String(v.sleeper),id);return m;}

 function playerCell(x,data){
  const p=x.p,flag=x.blocked?`<span class="tw-flag out">${esc(x.status||"Out")}</span>`:x.questionable?'<span class="tw-flag q">Questionable</span>':"";
  return `<button type="button" class="player-button" data-week-player="${esc(p.id)}">${esc(p.name)}</button><span class="tw-meta">${esc(p.position)} · ${esc(x.team==="LA"?"LAR":x.team)}</span>${flag}`;
 }
 function opponent(x){
  if(!x.thisGame)return x.bye?'<span class="tw-bye">Bye</span>':"—";
  const rk=M.finite(x.rank)?`<small class="tw-matchup ${x.matchup}" title="Rank of points allowed to ${esc(x.p.position)}s: 1 = fewest, 32 = most">${x.matchup} · ${x.rank}/32</small>`:"";
  return `${x.thisGame.home?"vs":"@"} ${esc(x.thisGame.opp==="LA"?"LAR":x.thisGame.opp)}${rk}`;
 }
 function table(rows,data,cols,caption){
  if(!rows.length)return '<p class="tw-empty">No players match.</p>';
  const head={rank:"#",player:"Player",week:`Week ${data.live.nextWeek}`,opp:"Opponent",total:"Next 4 weeks",rate:"Per game",trend:"Last 6 weeks",slot:"Slot"};
  return `<div class="table-wrapper tw-table"><table><caption class="sr-only">${esc(caption)}</caption><thead><tr>${cols.map(c=>`<th scope="col" class="tw-${c}">${head[c]}</th>`).join("")}</tr></thead><tbody>${rows.map((x,i)=>`<tr${x.changed?' class="tw-changed"':""}>${cols.map(c=>{
   if(c==="rank")return `<td class="number">${i+1}</td>`;
   if(c==="player")return `<td class="tw-player">${x.p?playerCell(x,data):`<span class="tw-meta">${esc(x.label)}</span>`}</td>`;
   if(c==="week")return `<td class="number"><strong>${x.p?f1(x.week):"—"}</strong></td>`;
   if(c==="opp")return `<td>${x.p?opponent(x):"—"}</td>`;
   if(c==="total")return `<td class="number"><strong>${x.p?f1(x.total):"—"}</strong><small>${x.p?`${x.games} game${x.games===1?"":"s"}`:""}</small></td>`;
   if(c==="rate")return `<td class="number number-muted">${x.p?f1(x.rate):"—"}</td>`;
   if(c==="trend")return `<td class="tw-trend">${x.p?T.spark(x.p,data):""}</td>`;
   if(c==="slot")return `<td>${esc(x.slotLabel||"")}${x.changed?'<small class="tw-change">change</small>':""}</td>`;
   return "<td></td>";}).join("")}</tr>`).join("")}</tbody></table></div>`;
 }

 /* One position: most projected points. All positions: points above the
    per-game rate of a typical starter (QB12, RB24, WR36, TE12) x games. */
 function order(rows,all){
  if(ui.pos!=="ALL")return rows.slice().sort((a,b)=>b.total-a.total);
  const n={QB:12,RB:24,WR:36,TE:12},repl={};
  for(const pos of POS){const r=all.filter(x=>x.p.position===pos&&M.finite(x.rate)).map(x=>x.rate).sort((a,b)=>b-a);repl[pos]=r[Math.min(n[pos],r.length)-1]||0;}
  const over=x=>x.total-repl[x.p.position]*x.games;
  return rows.slice().sort((a,b)=>over(b)-over(a));
 }
 /* Greedy fill: fixed slots first, then the narrowest flex slots. */
 function lineup(slots,candidates){
  const order=[...slots.keys()].filter(i=>ELIGIBLE[slots[i]]).sort((a,b)=>ELIGIBLE[slots[a]].length-ELIGIBLE[slots[b]].length||a-b);
  const pool=candidates.filter(x=>M.finite(x.week)).sort((a,b)=>b.week-a.week),used=new Set(),filled=[];
  for(const i of order){const pick=pool.find(x=>!used.has(x.p.id)&&ELIGIBLE[slots[i]].includes(x.p.position));if(pick){used.add(pick.p.id);filled.push({...pick,slot:slots[i],slotLabel:SLOT_LABEL[slots[i]]||slots[i],slotIndex:i});}}
  return {starters:filled.sort((a,b)=>a.slotIndex-b.slotIndex),used};
 }

 function leagueSection(data,all){
  const L=ui.league,team=L.teams.find(t=>String(t.rosterId)===String(ui.teamId));
  const map=sleeperMap(data),byId=new Map(all.map(x=>[x.p.id,x]));
  const picker=`<label class="tw-team">Your team <select id="tw-team"><option value="">Choose your team…</option>${L.teams.map(t=>`<option value="${esc(t.rosterId)}"${String(t.rosterId)===String(ui.teamId)?" selected":""}>${esc(t.name)}</option>`).join("")}</select></label>`;
  const pc=L.perCatch,custom=pc&&["RB","WR","TE"].some(k=>pc[k]!==1);
  const scoring=custom?`<p class="tw-basis">Adjusted to your league's ${pc.WR===pc.TE&&pc.WR===pc.RB?`${pc.WR} point${pc.WR===1?"":"s"} per catch`:`catch scoring (RB ${pc.RB}, WR ${pc.WR}, TE ${pc.TE} per catch)`} using each player's expected catches per game. Other scoring differences (passing TDs, yardage bonuses) aren't adjusted.</p>`:"";
  const head=`<div class="tw-league-head"><div><strong>${esc(L.name)}</strong><span>${L.teams.length} teams · ${esc(L.season)} · read-only</span></div>${picker}<button type="button" class="text-button" id="tw-disconnect">Disconnect</button></div>${scoring}`;
  const free=all.filter(x=>{const s=data.live.players[x.p.id]?.sleeper;return s&&!L.rostered.has(String(s))&&!x.blocked&&M.finite(x.total);});
  const waivers=`<h2>Best available in your league</h2><p class="tw-deck">Players on no roster in this league, ranked by projected points over the next four weeks.${ui.pos==="ALL"?" With all positions shown, they're ordered by points above a typical starter at their position, so quarterbacks don't crowd out everyone else.":""}</p>${filterBar()}${table(order(free.filter(x=>ui.pos==="ALL"||x.p.position===ui.pos),all).slice(0,20),data,["rank","player","total","week","opp","trend"],"Free agents ranked by four-week projection")}`;
  if(!team)return head+'<p class="tw-note">Choose your team to see start/sit advice for your roster.</p>'+waivers;
  const mine=team.players.map(s=>({s,id:map.get(String(s))})),covered=mine.filter(m=>m.id&&byId.has(m.id)).map(m=>byId.get(m.id));
  const uncovered=mine.filter(m=>!m.id||!byId.has(m.id)).length;
  const best=lineup(L.slots,covered),current=new Set(team.starters.map(s=>map.get(String(s))).filter(Boolean));
  for(const x of best.starters)x.changed=!current.has(x.p.id);
  const benchOut=[...current].filter(id=>byId.has(id)&&!best.used.has(id)).map(id=>byId.get(id));
  const swaps=best.starters.filter(x=>x.changed);
  const advice=swaps.length?`<div class="tw-advice"><strong>${swaps.length} lineup change${swaps.length===1?"":"s"} to consider</strong><p>Start ${swaps.map(x=>`<b>${esc(x.p.name)}</b> (${f1(x.week)})`).join(", ")}${benchOut.length?` instead of ${benchOut.map(x=>`<b>${esc(x.p.name)}</b> (${f1(x.week)}${x.bye?", bye":x.blocked?`, ${esc(x.status)}`:""})`).join(", ")}`:""}. Check Sunday's injury news before locking it in.</p></div>`:`<div class="tw-advice ok"><strong>Your current lineup matches the projections.</strong><p>Check late injury news before kickoff.</p></div>`;
  const bench=covered.filter(x=>!best.used.has(x.p.id)).sort((a,b)=>(b.week??-1)-(a.week??-1));
  const otherSlots=L.slots.filter(s=>!ELIGIBLE[s]);
  return head+`<h2>Start / sit · Week ${data.live.nextWeek}</h2>${advice}${table(best.starters,data,["slot","player","week","opp","total","trend"],"Suggested starting lineup")}${otherSlots.length||uncovered?`<p class="tw-note">${otherSlots.length?`Set ${[...new Set(otherSlots)].join(", ")} yourself: kickers and defenses aren't in this dataset. `:""}${uncovered?`${uncovered} rostered player${uncovered===1?" isn't":"s aren't"} in this dataset's ${data.players.length}-player pool.`:""}</p>`:""}<details class="tw-bench"><summary>Bench (${bench.length})</summary>${table(bench,data,["player","week","opp","total","trend"],"Bench")}</details>`+waivers;
 }
 function filterBar(){return `<div class="view-tabs tw-pos" role="group" aria-label="Position">${["ALL",...POS].map(p=>`<button type="button" data-tw-pos="${p}" aria-pressed="${ui.pos===p}">${p==="ALL"?"All":p}</button>`).join("")}</div>`;}
 function connectSection(){
  const choices=ui.choices?`<label class="tw-team">Pick a league <select id="tw-league-choice"><option value="">Choose…</option>${ui.choices.map(l=>`<option value="${esc(l.league_id)}">${esc(l.name)} · ${esc(l.total_rosters)} teams</option>`).join("")}</select></label>`:"";
  return `<form class="tw-connect" id="tw-connect"><div><strong>Connect a Sleeper league</strong><p>See start/sit advice for your roster and who's actually available in your league. Your browser talks to Sleeper's public API directly. Nothing goes through this site and nothing is stored here.</p></div><div class="tw-connect-row"><label><span class="sr-only">Sleeper league ID or username</span><input id="tw-input" type="text" inputmode="text" autocomplete="off" placeholder="League ID or Sleeper username" value="${esc(ui.input)}"></label><button type="submit"${ui.busy?" disabled":""}>${ui.busy?"Connecting…":"Connect"}</button></div>${choices}<p class="tw-status" role="status">${esc(ui.status)}</p></form>`;
 }
 function genericSection(data,all){
  const tiers={QB:12,RB:24,WR:30,TE:12};
  const startable=POS.filter(p=>ui.pos==="ALL"||p===ui.pos).map(pos=>{
   const rows=all.filter(x=>x.p.position===pos&&M.finite(x.week)&&x.week>0).sort((a,b)=>b.week-a.week).slice(0,tiers[pos]);
   return `<details class="tw-tier"${ui.pos!=="ALL"||pos==="RB"?" open":""}><summary>${pos} · top ${tiers[pos]} for Week ${data.live.nextWeek}</summary>${table(rows,data,["rank","player","week","opp","total","trend"],`${pos} Week ${data.live.nextWeek} projections`)}</details>`;}).join("");
  const deep=order(all.filter(x=>!x.blocked&&M.finite(x.total)&&!(x.p.market?.redraft?.positionRank<=DEEP[x.p.position])&&(ui.pos==="ALL"||x.p.position===ui.pos)),all).slice(0,20);
  return `<h2>Waiver pickups</h2><p class="tw-deck">Players outside the redraft market's top ${DEEP.RB} RBs, ${DEEP.WR} WRs, ${DEEP.QB} QBs and ${DEEP.TE} TEs (likely free agents in a 12-team league), ranked by projected points over the next four weeks.${ui.pos==="ALL"?" With all positions shown, they're ordered by points above a typical starter at their position.":""} Connect Sleeper for your league's real free agents.</p>${filterBar()}${table(deep,data,["rank","player","total","week","opp","trend"],"Likely waiver players ranked by four-week projection")}<h2>Start / sit rankings</h2><p class="tw-deck">Healthy players ranked by projected points this week. Players on a bye or listed Out are left off.</p>${startable}`;
 }
 function render(data){
  if(!data?.live)return '<p>This week\'s schedule hasn\'t loaded yet. Projections need the weekly results file.</p>';
  const all=data.players.map(p=>project(p,data,ui.league));
  const window=data.live.upcoming&&Object.values(data.live.upcoming)[0];
  const span=window?.length?`Weeks ${data.live.nextWeek}–${data.live.nextWeek+3}`:"the next four weeks";
  return `<p class="tw-basis">Projection = the model's points per game × games scheduled in ${span}. Byes and players listed Out count as zero. ${ui.league?.perCatch&&["RB","WR","TE"].some(k=>ui.league.perCatch[k]!==1)?"Adjusted for your league's catch scoring.":"Full PPR."} The model's per-game estimate uses games through Week ${esc(data.throughWeek)}; results and trends run through Week ${esc(data.live.throughWeek)}. <button type="button" data-open-view="track">How accurate has it been?</button></p>${ui.league?leagueSection(data,all):connectSection()+genericSection(data,all)}`;
 }
 function bind(el,ctx){
  el.querySelectorAll("[data-week-player]").forEach(b=>b.addEventListener("click",()=>ctx.openPlayer(b.dataset.weekPlayer,b)));
  el.querySelectorAll("[data-tw-pos]").forEach(b=>b.addEventListener("click",()=>{ui.pos=b.dataset.twPos;ctx.rerender();el.querySelector(`[data-tw-pos="${ui.pos}"]`)?.focus({preventScroll:true});}));
  el.querySelectorAll("[data-open-view]").forEach(b=>b.addEventListener("click",()=>ctx.showView(b.dataset.openView)));
  el.querySelector("#tw-connect")?.addEventListener("submit",async e=>{
   e.preventDefault();ui.input=el.querySelector("#tw-input").value;ui.busy=true;ui.status="";ui.choices=null;ctx.rerender();
   try{const r=await SL.findLeagues(ui.input,ctx.data().season);if(r.leagues.length===1)await connect(r.leagues[0].league_id,ctx);else{ui.choices=r.leagues;ui.status=`${r.leagues.length} leagues found. Pick one.`;}}
   catch(err){ui.status=err.message||"Couldn't reach Sleeper.";}
   ui.busy=false;ctx.rerender();
  });
  el.querySelector("#tw-league-choice")?.addEventListener("change",async e=>{if(!e.target.value)return;ui.busy=true;ctx.rerender();try{await connect(e.target.value,ctx);}catch(err){ui.status=err.message;}ui.busy=false;ctx.rerender();});
  el.querySelector("#tw-team")?.addEventListener("change",e=>{ui.teamId=e.target.value||null;SL.save({leagueId:ui.league.id,rosterId:ui.teamId});ctx.rerender();el.querySelector("#tw-team")?.focus({preventScroll:true});});
  el.querySelector("#tw-disconnect")?.addEventListener("click",()=>{ui.league=null;ui.teamId=null;ui.choices=null;ui.status="Disconnected. The league ID was removed from this browser.";SL.save(null);ctx.rerender();});
 }
 async function connect(leagueId,ctx){ui.league=await SL.load(leagueId);ui.choices=null;const s=SL.saved();ui.teamId=s?.leagueId===ui.league.id?s.rosterId:null;SL.save({leagueId:ui.league.id,rosterId:ui.teamId});ui.status="";}
 async function restore(ctx){const s=SL.saved();if(!s||ui.league)return;try{ui.league=await SL.load(s.leagueId);ui.teamId=s.rosterId;}catch{ui.status="Couldn't reload your saved Sleeper league. Connect again.";}ctx.rerender();}
 const api={render,bind,restore,project,lineup};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;root.PublicThisWeek=api;
})(typeof globalThis!=="undefined"?globalThis:this);
