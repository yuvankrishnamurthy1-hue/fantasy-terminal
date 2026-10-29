"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],M=PublicTerminal;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iconPaths={search:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.5 4.5"/>',players:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16M9 9v11"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',research:'<path d="M4 20h16M7 16v-5m5 5V5m5 11V9"/>',about:'<circle cx="12" cy="12" r="8"/><path d="M12 11v5m0-9v.1"/>',database:'<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v13c0 4 14 4 14 0V5M5 11c0 4 14 4 14 0"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',menu:'<path d="M5 6h14M5 12h14M5 18h14"/>',refresh:'<path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6"/>',info:'<circle cx="12" cy="12" r="8"/><path d="M12 11v5m0-9v.1"/>',external:'<path d="M14 4h6v6m0-6L10 14M10 5H5v14h14v-5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.info}</svg>`;
function hydrateIcons(scope=document){scope.querySelectorAll("[data-icon]").forEach(e=>{e.innerHTML=icon(e.dataset.icon);});}
const W=globalThis.WeeklyPlayerStories,S=globalThis.PublicStatGuide,R=globalThis.PublicWRRanks,G=globalThis.PublicGrowingOpportunity,V=globalThis.PublicValueEvidence;
hydrateIcons();
let PAGE_SIZE=25;
for(const [value,label] of [["outlook","Model estimate · pts/game ↓"],["market","Market rank · best first"],["marketgap","Redraft market gap ↓"],["rawgap","Raw usage gap ↓"]]){const option=document.createElement("option");option.value=value;option.textContent=label;$("#sort").append(option);}
$('#sort option[value="gap"]').textContent="Conservative gap ↓";
$('#sort option[value="ppg"]').textContent="Scored · pts/game ↓";
$('#sort option[value="usage"]').textContent="Usage · past points/game ↓";
S.install(document);
R.install(document);
for(const [value,label] of [["rankgap","WR Model estimate above market"],["rankdown","WR Model estimate below market"]]){const o=document.createElement("option");o.value=value;o.textContent=label;$("#sort").append(o);}
const cheaperButton=document.createElement("button");cheaperButton.type="button";cheaperButton.dataset.group="cheaper";cheaperButton.textContent="Cheaper vs outlook";cheaperButton.setAttribute("aria-pressed","false");$(".view-tabs").append(cheaperButton);
const roleButton=document.createElement("button");roleButton.type="button";roleButton.dataset.group="role";roleButton.textContent="Role changes";roleButton.setAttribute("aria-pressed","false");$(".view-tabs").append(roleButton);
const growingButton=document.createElement('button');growingButton.type='button';growingButton.dataset.group='growing';growingButton.textContent='Increased opportunities';growingButton.setAttribute('aria-pressed','false');$('.view-tabs').append(growingButton);
const growthSort=new Option('Extra work per game','growth');$('#sort').append(growthSort);
// Keep all existing research controls, but put specialist choices behind one disclosure.
const U=globalThis.PublicWorkspace;
const help=document.createElement('details');help.className='board-help';help.innerHTML='<summary>Sources & detailed definitions</summary>';
help.insertAdjacentHTML('beforeend',`<details><summary>Growing opportunity · what qualifies?</summary>${G.method()}</details>`);
for(const selector of ['.coverage-disclosure','.numbers-guide','#wr-rank-legend'])help.append($(selector));
$('#table-wrapper').before(help);
const advanced=document.createElement('details');advanced.className='advanced-controls';advanced.innerHTML='<summary>More controls</summary><div class="advanced-body"><div class="advanced-groups" role="group" aria-label="More evidence groups"></div><label>More sort orders <select id="advanced-sort"><option value="">Choose…</option></select></label><label><input type="checkbox" data-column="age-col" checked> Market column</label><label><input type="checkbox" data-column="games-col" checked> Model estimate column</label><label><input type="checkbox" data-column="role-col"> Role column</label></div>';
$('.board-footnote p').textContent='Gap = usage minus scored, before rounding; gap order follows this number. Positive or negative is not a buy or sell rating. Model spans reflect historical errors, not personal odds.';
const disclosures=document.createElement('div');disclosures.className='board-disclosures';$('#table-wrapper').before(disclosures);disclosures.append(help,advanced);
for(const key of ['development','veteran','cheaper','role'])$('.advanced-groups').append($(`[data-group="${key}"]`));
for(const [key,label] of [['excess','Scoring above usage'],['unexplained','Gap after past patterns']]){const b=document.createElement('button');b.type='button';b.dataset.group=key;b.textContent=label;b.setAttribute('aria-pressed','false');$('.advanced-groups').append(b);const o=new Option(label,key);$('#sort').append(o);}
const marketAge=document.createElement('div');marketAge.id='market-age';$('.context-line').after(marketAge);
$('#board-evidence').innerHTML='Tested across 2021–2025: 220 flagged player-seasons rose from 9.1 to 10.7 points/game, below the 12.4 suggested by usage. This does not prove their trade value rose. <button type="button" data-open-view="research">Read the test and its limits</button>';
const primarySorts=['market','gap','ppg','usage','outlook'];
for(const option of [...$('#sort').options])if(!primarySorts.includes(option.value))$('#advanced-sort').append(option);
const sortLabels={market:'Market rank',gap:'Usage gap',ppg:'Points scored',usage:'Usage points',outlook:'Model estimate',rawgap:'Usage gap · same order',marketgap:'Redraft price difference',rankgap:'WR model higher than market',rankdown:'WR model lower than market',football:'Football score',age:'Youngest first',name:'Name A–Z',growth:'Work increase',excess:'Scoring above usage',unexplained:'Gap after past patterns'};
for(const option of [...$('#sort').options,...$('#advanced-sort').options])if(sortLabels[option.value])option.textContent=sortLabels[option.value];
const syncColumns=()=>$$('[data-column]').forEach(input=>$$("#table-wrapper ."+input.dataset.column).forEach(cell=>cell.classList.toggle('optional-hidden',!input.checked)));
$$('[data-column]').forEach(input=>input.addEventListener('change',syncColumns));
$('#advanced-sort').addEventListener('change',e=>{if(e.target.value){state.sort=e.target.value;state.page=1;closePlayer();}});
const state={snapshot:"latest",data:null,view:"players",position:"WR",lens:"dynasty",group:"all",sort:"market",query:"",page:1,selected:null,tradeSelected:null,injurySelected:null,injuryPosition:'ALL',watchlist:[]};
state.schedule=PublicSchedule.normalize();
let checking=false,returnTarget=null,lastAvailabilityReview=Date.now(),lastCheckAt=0;
try{const saved=JSON.parse(localStorage.getItem("fantasy-public-watchlist-v1")||"[]");if(Array.isArray(saved))state.watchlist=saved.filter(x=>typeof x==="string").slice(0,500);}catch{/* Browser storage is optional. */}
function restore(){const p=new URLSearchParams(location.search);state.snapshot=PublicSnapshots.normalize(p.get("snapshot"));for(const [key,allowed] of Object.entries({view:["players","watchlist","trades","injuries","schedule","research","about"],position:["ALL","WR","RB","TE","QB"],lens:["redraft","dynasty"],group:["all","gap","development","veteran","cheaper","role","growing","excess","unexplained"],sort:["ppg","gap","rawgap","outlook","market","marketgap","rankgap","rankdown","usage","football","age","name","growth","excess","unexplained"]}))if(allowed.includes(p.get(key)))state[key]=p.get(key);state.query=p.get("q")||"";state.page=Math.max(1,Number(p.get("page"))||1);state.selected=p.get("player");state.tradeSelected=p.get('trade');state.injurySelected=p.get('injury');state.injuryPosition=['RB','WR','TE'].includes(p.get('ip'))?p.get('ip'):'ALL';$('#trade-search').value=p.get('tq')||'';$('#trade-level').value=['all','reported','analysis'].includes(p.get('evidence'))?p.get('evidence'):'all';$('#injury-search').value=p.get('iq')||'';state.schedule=PublicSchedule.normalize(Object.fromEntries(['sp','sm','sw','ss','ps','pe','sq'].map(k=>[k,p.get(k)])));if((state.lens==="redraft"&&["development","veteran"].includes(state.group))||(state.lens==="dynasty"&&state.group==="cheaper"))state.group="all";}
function writeUrl(push=false){const u=new URL(location.href);if(state.snapshot!=="latest")u.searchParams.set("snapshot",state.snapshot);else u.searchParams.delete("snapshot");for(const key of ["view","position","lens","group","sort"])u.searchParams.set(key,state[key]);for(const [key,value] of [["q",state.query],["page",state.page===1?null:state.page],["player",state.selected],['trade',state.tradeSelected],['injury',state.injurySelected],['ip',state.injuryPosition==='ALL'?null:state.injuryPosition],['tq',$('#trade-search').value],['evidence',$('#trade-level').value==='all'?null:$('#trade-level').value],['iq',$('#injury-search').value]])value?u.searchParams.set(key,value):u.searchParams.delete(key);for(const [key,value] of Object.entries(state.schedule))value?u.searchParams.set(key,value):u.searchParams.delete(key);if(u.href!==location.href)history[push?"pushState":"replaceState"]({},"",u);}
function initials(p){return p.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("");}
function avatar(p){return `<span class="avatar ${p.position}" aria-hidden="true"><span>${esc(initials(p))}</span><span class="avatar-position">${esc(p.position)}</span></span>`;}
function display(x,d=1){return M.finite(x)?M.fmt(x,d):"—";}
function role(p){const a=M.availability(p);if(a.blocked||a.status==="Questionable")return a.label;if(p.position==="RB"&&M.finite(p.touchesPerGame))return `${M.fmt(p.touchesPerGame)} touches / game`;if(M.finite(p.targetShare))return `${M.fmt(p.targetShare*100,0)}% target share`;if(M.finite(p.snapPct))return `${M.fmt(p.snapPct*100,0)}% snap share`;return "Role not linked";}
function groupNote(){if(state.group==="gap")return `Players scoring 2+ points below their position's recorded usage with 3+ appearances.${state.lens==="dynasty"?" Veterans and unknown ages stay out of this research group.":" This is a rebound screen, not a buy rating."}`;if(state.group==="veteran")return "Veteran rentals: potential points now, not developmental dynasty breakouts.";if(state.group==="development")return "Verified non-veterans. Younger age alone does not establish talent or future value.";if(state.sort==="football")return "Saved football scores compare evidence within position—not future points or remaining-career dynasty value.";return state.lens==="dynasty"?"Current PPR sorts this season's scoring—not remaining-career dynasty value.":"Redraft focuses on this season. Past averages and usage are not next-week projections.";}
function preserveScenarioList(container,scroll,attribute,id){const list=$(container+' .scenario-list');if(!list)return;list.scrollTop=scroll;const button=id?list.querySelector(`[${attribute}="${id}"]`):null;if(button&&list.getClientRects().length){const item=button.getBoundingClientRect(),box=list.getBoundingClientRect();if(item.top<box.top)list.scrollTop-=box.top-item.top;else if(item.bottom>box.bottom)list.scrollTop+=item.bottom-box.bottom;}}
function render(){
 PAGE_SIZE=state.snapshot==='2026-week3'?10:25;
 const board=["players","watchlist"].includes(state.view),names={players:"Players",watchlist:"Watchlist",trades:"NFL trade block",injuries:"Injury opportunities",schedule:"Schedule",research:"Research",about:"About Fantasy Terminal"};
 document.body.classList.toggle('growing-screen',board&&state.group==='growing');
 $('#trade-view').hidden=state.view!=='trades';
 $('#injury-view').hidden=state.view!=='injuries';
 $('#schedule-view').hidden=state.view!=='schedule';
 $("#board-view").hidden=!board;$("#research-view").hidden=state.view!=="research";$("#about-view").hidden=state.view!=="about";$("#crumb-view").textContent=names[state.view];document.title=`${names[state.view]} · Fantasy Terminal`;
 $$("[data-view]").forEach(b=>{const active=b.dataset.view===state.view;b.classList.toggle("active",active);active?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current");});
 if(!state.data)return;
 if(state.view==='schedule')renderSchedule();
 if(state.view==='trades'){
  const listScroll=$('#trade-content .scenario-list')?.scrollTop||0;
  $('#trade-content').innerHTML=PublicTradeWatch.render(state.data,$('#trade-search').value,$('#trade-level').value,Date.now(),state.tradeSelected);
  preserveScenarioList('#trade-content',listScroll,'data-trade-select',state.tradeSelected);
  $$('#trade-content [data-trade-select]').forEach(b=>b.addEventListener('click',()=>{state.tradeSelected=b.dataset.tradeSelect;render();document.querySelector(`[data-trade-select="${state.tradeSelected}"]`)?.focus({preventScroll:true});}));
  $$('#trade-content [data-trade-player]').forEach(b=>b.addEventListener('click',()=>togglePlayer(b.dataset.tradePlayer,b)));
  $('#trade-picker')?.addEventListener('change',e=>{state.tradeSelected=e.target.value;render();$('#trade-picker').focus({preventScroll:true});});
 }
 if(state.view==='injuries'){
  const listScroll=$('#injury-content .scenario-list')?.scrollTop||0;
  $('#injury-position').value=state.injuryPosition;
  for(const option of $('#injury-position').options){const count=PublicInjuryOpportunities.filter(state.data,'',option.value).length;option.textContent=({ALL:'All positions',RB:'Running backs',WR:'Wide receivers',TE:'Tight ends'})[option.value]+` (${count})`;}
  $('#injury-content').innerHTML=PublicInjuryOpportunities.render(state.data,$('#injury-search').value,state.injurySelected,Date.now(),state.injuryPosition);
  preserveScenarioList('#injury-content',listScroll,'data-injury-select',state.injurySelected);
  $$('#injury-content [data-injury-select]').forEach(b=>b.addEventListener('click',()=>{state.injurySelected=b.dataset.injurySelect;render();document.querySelector(`[data-injury-select="${state.injurySelected}"]`)?.focus({preventScroll:true});}));
  $$('#injury-content [data-opportunity-player]').forEach(b=>b.addEventListener('click',()=>togglePlayer(b.dataset.opportunityPlayer,b)));
  $('#injury-picker')?.addEventListener('change',e=>{state.injurySelected=e.target.value;render();$('#injury-picker').focus({preventScroll:true});});
 }
 $("#total-count").textContent=state.data.players.length;$("#watch-count").textContent=state.watchlist.filter(id=>state.data.players.some(p=>p.id===id)).length;
 for(const pos of ["WR","RB","TE","QB"])$("#count-"+pos).textContent=state.data.players.filter(p=>p.position===pos).length;
 $$("[data-position]").forEach(b=>{if(b.dataset.position===state.position&&board)b.setAttribute("aria-current","true");else b.removeAttribute("aria-current");});
 $("#board-title").textContent=state.view==="players"?"Workload ahead of scoring":names[state.view]||"Players";$("#board-description").textContent=state.view==="watchlist"?"Saved on this browser. A shortlist, not an endorsement.":"Find players whose workload and scoring tell different stories.";
 $('#board-evidence').hidden=state.view!=='players';
 $('#market-age').innerHTML=V.marketLine(state.data,state.lens);
 $("#search").value=state.query;$("#position").value=state.position;
 $('#sort option[data-custom]')?.remove();
 if(!primarySorts.includes(state.sort)){const option=new Option(sortLabels[state.sort],state.sort);option.dataset.custom='true';$('#sort').append(option);}
 $("#sort").value=state.sort;$('#advanced-sort').value=primarySorts.includes(state.sort)?'':state.sort;
 $$("[data-lens]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lens===state.lens)));
 $$("[data-group]").forEach(b=>{b.setAttribute("aria-pressed",String(b.dataset.group===state.group));b.hidden=state.lens==="redraft"&&["development","veteran"].includes(b.dataset.group);});
 cheaperButton.hidden=state.lens!=="redraft";
 $('#advanced-sort option[value="marketgap"]').disabled=state.lens!=="redraft";
 if(state.lens!=="redraft"&&state.sort==="marketgap"){state.sort="market";$("#sort").value="market";}
 const wrRanks=R.build(state.data,state.lens);
 document.body.classList.toggle("wr-ranking",board&&state.position==="WR");
 $("th.age-col").innerHTML="<span>Market rank</span><small>within position</small>";
 $("#wr-rank-legend").hidden=state.position!=="WR";
 $("#wr-rank-legend").innerHTML=R.legend(wrRanks);
 for(const value of ["rankgap","rankdown"])$(`#advanced-sort option[value="${value}"]`).disabled=state.position!=="WR";
 if(state.position!=="WR"&&["rankgap","rankdown"].includes(state.sort)){state.sort="market";$("#sort").value="market";}
 const rows=R.sort(M.filter(state.data.players,state,state.data),wrRanks,state.sort),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));state.page=Math.max(1,Math.min(state.page,pages));
 $("#tab-total").textContent=state.data.players.filter(p=>state.position==="ALL"||p.position===state.position).length;
 $("#result-count").textContent=`${rows.length} player${rows.length===1?"":"s"}`;$("#lens-context").textContent=groupNote();
 if(state.group==="cheaper")$("#lens-context").textContent="Market ranks these players at least eight places lower than the model estimate in the same matched set. Rest-of-season price versus four-week forecast: research leads, not proven profitable trades.";
 if(state.group==="role")$("#lens-context").textContent="Involvement increased in both recent games on at least two measures. Research observations—not buy ratings or proven breakout predictions. Veteran role growth is not multi-year dynasty upside.";
 if(state.group==="gap")$("#lens-context").textContent+=" Reported Out, Doubtful and reserve/injured players are excluded; inspect them under All players. Unverified availability is not a clean bill of health.";
 if(state.group==="all"&&state.sort==="market")$("#lens-context").textContent=state.lens==="dynasty"?"Dynasty market ranks consider future seasons. Model estimate is only a short-term scoring estimate.":"Redraft market ranks are a dated rest-of-season reference. Model estimate covers the next four weeks, if playing.";
 if(state.group==="all"&&state.sort==="outlook")$("#lens-context").textContent="Sorted by estimated PPR points per game over the next four weeks, only in games he plays, not a four-week total or dynasty career ranking.";
 if(["rankgap","rankdown"].includes(state.sort))$("#lens-context").textContent="Sorted by the difference between matched WR ranks. Positive = Model estimate ranks him higher. Short-term scoring versus a longer-term price—not proven trade value.";
 // The board gives one sentence; definitions, exclusions and formulas stay in help.
 const contextByGroup={all:state.lens==='dynasty'?'Dynasty prices consider future seasons; the model estimates the next four weeks.':'Redraft · this season.',gap:'More usage than points · not an automatic buy.',growing:'Latest two versus earlier three appearances: more work with snap/share support. Not breakout odds.',role:'Work grew in two games · not breakout odds.',development:'Younger players · age alone is not talent.',veteran:'Veteran rentals · points now, not long-term upside.',cheaper:'Four-week model versus dated price · research only.'};
 $('#lens-context').textContent=contextByGroup[state.group];
 if(state.sort==='gap')$('#lens-context').textContent='Sorted by usage minus scored. Check games played before trusting a large gap.';
 if(state.sort==='rawgap')$('#lens-context').textContent+=' Sorted by usage minus scored.';
 if(state.sort==='outlook')$('#lens-context').textContent+=' Model estimate only; uncertain, not expert consensus.';
 if(state.group==='excess')$('#lens-context').textContent='Scoring runs 2+ PPR/game above usage. Sell-side research, not an instruction to sell.';
 if(state.group==='unexplained')$('#lens-context').textContent='A 2+ PPR/game shortfall remains after the past-pattern adjustment, with 16+ historical games. Not proven bad luck.';
 if(state.sort==='growth')$('#lens-context').textContent=state.group==='growing'?'Recent 2 vs earlier 3 appearances · sorted by extra work/game. Not breakout odds.':'Sorted by extra work/game among players meeting the Growing opportunity rule; other players follow.';
 const pool=M.filter(state.data.players,{...state,group:"all"},state.data);
 const usageCount=pool.filter(p=>M.finite(p.usagePpg)).length;
 $("#coverage-quick").textContent=`Data coverage · ${usageCount}/${pool.length} with usage · source dates & limits`;
 $("#coverage-note").textContent=`Usage: ${usageCount}/${pool.length}. ${state.lens} market: ${pool.filter(p=>p.market?.[state.lens]).length}/${pool.length}. New outlook: ${pool.filter(p=>M.finite(p.research?.outlook_ppg)).length}/${pool.length}. ADP and price dates appear in each summary; missing is not zero. Full current routes run are not available for republication.`;
 const availability=state.data.availabilityContext;
 if(availability?.observedAt)$("#coverage-note").textContent+=` Availability is a separate Week ${availability.reportWeek} report / Week ${availability.rosterWeek} roster overlay, observed ${new Date(availability.observedAt).toLocaleDateString("en-US",{timeZone:"America/Los_Angeles"})}. It does not move the football cutoff or guarantee a return date.`;
 $("#player-rows").innerHTML=rows.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE).map((p,i)=>{
  const g=M.screenGap(p),saved=state.watchlist.includes(p.id),age=M.ageGroup(p),a=M.availability(p),price=p.market?.[state.lens],meta=a.blocked||a.status==="Questionable"?a.label:state.lens==="dynasty"&&age==="veteran"?"Veteran rental":age==="unknown"?"Age unverified":p.position;
  const reason=state.group==='growing'?G.oneLine(p,state.data):W.oneLine(p,state.data,state.lens);
  return `<tr><td class="index-col">${(state.page-1)*PAGE_SIZE+i+1}</td><td class="player-cell"><div class="player-name">${avatar(p)}<div><button type="button" class="player-button" data-player="${p.id}" aria-expanded="${state.selected===p.id}" aria-controls="player-panel">${esc(p.name)}</button><div class="player-meta"><span>${esc(U.team(p.team)||"Team unavailable")} · ${esc(p.position)}</span><span>${display(p.games,0)}g${price?` · market ${p.position}${display(price.positionRank,0)}`:''}${a.blocked?` · ${esc(a.label)}`:''}</span></div><p class="player-reason" title="${esc(reason)}">${esc(reason)}</p></div></div></td><td class="number age-col">${price?`${p.position}${display(price.positionRank,0)}`:"—"}</td><td class="number">${display(p.ppg)}</td><td class="number usage-col number-muted">${display(p.usagePpg)}</td><td class="number gap-col ${S.gapClass(M.gap(p))}">${U.gapCell(p)}</td><td class="number games-col number-muted">${U.outlookCell(p)}</td><td class="role-col role-copy">${esc(role(p))}</td><td class="watch-col"><button type="button" class="watch-button" data-watch="${p.id}" aria-label="${saved?"Remove":"Add"} ${esc(p.name)} ${saved?"from":"to"} watchlist" aria-pressed="${saved}">${icon("star")}</button></td></tr>`;
 }).join("");
 $$('#player-rows .player-cell').forEach((cell,i)=>{const p=rows[(state.page-1)*PAGE_SIZE+i];cell.querySelector('.player-meta').insertAdjacentHTML('afterend',`<p class="model-phone">Model estimate: ${U.outlookCell(p)}</p>`);});
 if(state.group==='unexplained')$$('#player-rows .player-cell').forEach((cell,i)=>{const p=rows[(state.page-1)*PAGE_SIZE+i];cell.querySelector('.player-meta').insertAdjacentHTML('afterend',`<p class="value-history-rank">After past patterns: +${display(p.efficiencyContext.unexplainedGap)} PPR/game · sort value</p>`);});
 if(state.group==='growing')$$('#player-rows .player-cell').forEach((cell,i)=>{const p=rows[(state.page-1)*PAGE_SIZE+i],g=G.evaluate(p,state.data);cell.querySelector('.player-meta').insertAdjacentHTML('afterend',`<p class="growth-phone">${p.position==='RB'?'Carries + targets':'Targets'}/game<br>${display(g.baseline)} to ${display(g.recent)} (+${display(g.delta)})${g.mixed?`<br>Latest: ${display(g.latest)} · lower`:''}</p>`);});
 $("#empty").hidden=rows.length>0;$("#empty-title").textContent=state.view==="watchlist"&&!state.watchlist.length?"Your watchlist is empty":"No players match";$("#empty-copy").textContent=state.view==="watchlist"&&!state.watchlist.length?"Use the star beside a player to save him here. Nothing is shared with other visitors.":"Try another name, position or evidence group. Missing usage does not mean zero opportunity.";
 const emptyWatch=state.view==='watchlist'&&!state.watchlist.some(id=>state.data.players.some(p=>p.id===id));
 document.body.classList.toggle('empty-watchlist',emptyWatch);
 $('#table-wrapper table').hidden=emptyWatch;
 $('#clear-filters').textContent=emptyWatch?'Browse players':'Reset filters';
 if(emptyWatch){$('#empty-title').textContent='Your watchlist is empty';$('#empty-copy').textContent='Browse players and save someone from his player panel. This list stays in your browser.';}
 $("#previous").disabled=state.page<=1;$("#next").disabled=state.page>=pages;$("#page").textContent=`${state.page} / ${pages}`;$("#page-description").textContent=rows.length?`${(state.page-1)*PAGE_SIZE+1}–${Math.min(state.page*PAGE_SIZE,rows.length)} of ${rows.length}`:"No matching players";
 if(!rows.length&&state.group==="gap"){
  $("#empty-title").textContent=pool.length&&!usageCount?"Usage data unavailable":"No players meet this screen";
  $("#empty-copy").textContent=pool.length&&!usageCount?"The saved snapshot has no linked usage estimates for these players. This is not evidence that nobody is underperforming.":`This screen needs a 2+ point usage gap and at least three appearances${state.lens==="dynasty"?", plus a verified non-veteran age":""}. Check All players to inspect the rest.`;
 }
 $("#table-wrapper").setAttribute("aria-busy","false");
 syncColumns();document.body.classList.add('ready');
 $$("[data-player]").forEach(b=>b.addEventListener("click",()=>togglePlayer(b.dataset.player,b)));
 $$("[data-watch]").forEach(b=>b.addEventListener("click",()=>toggleWatch(b.dataset.watch)));
 $("#sidebar-cutoff").textContent=M.cutoffLabel(state.data);
 $("#snapshot-status").textContent=`${M.cutoffLabel(state.data)} · standard PPR`;
 if(state.data.refreshCoverage?.status==="partial")$("#coverage-note").textContent+=state.data.refreshCoverage.reason==="source_delay"?` ${state.data.refreshCoverage.note}`:` Week ${state.data.throughWeek} includes finished games only. SF and Washington player entries are unchanged through Week ${state.data.refreshCoverage.preservedTeamCutoff}; no unfinished game is counted as zero.`;
 document.querySelectorAll(".document-view .table-wrapper").forEach(wrapper=>{wrapper.tabIndex=0;wrapper.setAttribute("role","region");wrapper.setAttribute("aria-label",wrapper.querySelector("caption")?.textContent||"Scrollable research table");});
 if(!rows.length&&state.group==="cheaper"&&state.position==="QB"){document.getElementById("empty-title").textContent="QB price-gap screen not supported";document.getElementById("empty-copy").textContent="The dated market-only benchmark predicted QB scoring better. We do not turn disagreement into a buy recommendation; use All players to inspect the numbers.";}
 if(!rows.length&&state.group==="role"){document.getElementById("empty-title").textContent=state.position==="QB"?"QB role-change rule not supported":"No sustained role increases meet this rule";document.getElementById("empty-copy").textContent="This narrow screen needs five appearances and two recent games with repeated increases. Missing data, team changes and injury-recovery samples require review. All players still have their available evidence; an empty screen does not mean nobody can break out.";}
 if(!rows.length&&state.group==='growing'){$('#empty-title').textContent=state.position==='QB'?'Growing opportunity supports RB, WR and TE':'No players meet this workload rule';$('#empty-copy').textContent='Needs five comparable appearances, more work in the latest two-game average and supporting snap/share growth. Missing data is not evidence that a player cannot improve. Try All players.';}
 PublicSnapshots.decorate(state,document);
 writeUrl();
}
function showView(view){if(state.snapshot!=="latest"&&!["players","watchlist"].includes(view)){switchSnapshot("latest",view);return;}closePlayer(false);state.view=view;state.page=1;closeMenu();writeUrl(true);render();$("#content").focus({preventScroll:true});}
function renderSchedule(){
 const active=document.activeElement,focusId=active?.id,selection=active?.id==='schedule-search'?active.selectionStart:null,windowFocus=active?.dataset.scheduleWindow;
 const methodOpen=$('#schedule-content .schedule-method')?.open,studyOpen=$('#schedule-content .schedule-study details')?.open;
 $('#schedule-content').innerHTML=PublicSchedule.render(state.data,state.schedule,state.selected);
 $('#schedule-content .schedule-method')?.insertAdjacentHTML('beforeend','<p>Defensive PPR allowances exclude return touchdowns. Actual player fantasy scores elsewhere still include them.</p>');
 if(state.schedule.sm==='ppr')$('#schedule-content .schedule-cutoff')?.append(document.createTextNode(` PPR totals are for all opposing ${state.schedule.sp}s combined, not one player.`));
 if(methodOpen)$('#schedule-content .schedule-method').open=true;
 if(studyOpen)$('#schedule-content .schedule-study details').open=true;
 const update=(key,value)=>{state.schedule=PublicSchedule.normalize({...state.schedule,[key]:value});if(state.selected)closePlayer();else render();};
 for(const [id,key] of [['schedule-position','sp'],['schedule-metric','sm'],['schedule-sort','ss'],['schedule-playoff-start','ps'],['schedule-playoff-end','pe']])$('#'+id)?.addEventListener('change',e=>update(key,e.target.value));
 $('#schedule-search')?.addEventListener('input',e=>update('sq',e.target.value));
 $$('#schedule-content [data-schedule-window]').forEach(b=>b.addEventListener('click',()=>update('sw',b.dataset.scheduleWindow)));
 $$('#schedule-content [data-schedule-player]').forEach(b=>b.addEventListener('click',()=>togglePlayer(b.dataset.schedulePlayer,b)));
 $('#schedule-evidence')?.addEventListener('click',()=>{const summary=$('#schedule-study-anchor summary');if(summary){summary.parentElement.open=true;summary.focus();summary.scrollIntoView({block:'start',behavior:'instant'});}});
 const replacement=focusId?.startsWith('schedule-')?document.getElementById(focusId):windowFocus?document.querySelector(`[data-schedule-window="${windowFocus}"]`):null;
 if(replacement&&!active?.isConnected){replacement.focus({preventScroll:true});if(selection!=null)replacement.setSelectionRange(selection,selection);}
}
function closeMenu(){ $(".shell").classList.remove("nav-open");$("#menu-toggle").setAttribute("aria-expanded","false");}
function toggleWatch(id){if(!state.data.players.some(p=>p.id===id))return;state.watchlist=state.watchlist.includes(id)?state.watchlist.filter(x=>x!==id):[...state.watchlist,id];try{localStorage.setItem("fantasy-public-watchlist-v1",JSON.stringify(state.watchlist));}catch{$("#refresh-status").textContent="Watchlist works here, but this browser can't save it.";}const focus=document.activeElement?.dataset.watch;render();if(state.selected)renderPlayer();if(focus)document.querySelector(`[data-watch="${focus}"]`)?.focus({preventScroll:true});}
function rowFact(label,value){return `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`;}
function renderPlayer(){
 const p=state.data.players.find(p=>p.id===state.selected);if(!p){closePlayer(false);return;}
 const panel=$("#player-panel"),same=panel.dataset.renderedPlayer===p.id,scroll=same?panel.scrollTop:0;
 const expanded=same?$$('#detail-content details[open] summary').map(e=>e.textContent):[];
 const playerIcons={saved:state.watchlist.includes(p.id),close:icon("close"),star:icon("star")};
 const completeEvidence=PublicEvidence.enhancePlayer(PublicPlayerDetails.render(p,state.data,state.lens,playerIcons),p,state.data,state.lens);
 $("#detail-content").innerHTML=W.enhance(completeEvidence,p,state.data,state.lens,playerIcons).replace(/ · LA(?= ·|<)/g,' · LAR').replace(/against LA:/g,'against LAR:');
 const growthAnchor=$('.weekly-briefing .week-lead')||$('#detail-content .panel-story');
 growthAnchor?.insertAdjacentHTML('beforebegin',G.panel(p,state.data));
 $('#detail-content .season-evidence')?.insertAdjacentHTML('beforebegin',V.panel(p,state.data,state.lens));
 if(state.view==='schedule')growthAnchor?.insertAdjacentHTML('beforebegin',PublicSchedule.panel(p,state.data,state.schedule));
 else $('#detail-content .season-evidence')?.insertAdjacentHTML('beforebegin',`<details class="schedule-player-disclosure"><summary>Upcoming schedule · matchup context</summary>${PublicSchedule.panel(p,state.data)}</details>`);
 const weeklyHeader=$('.weekly-briefing .panel-player');
 if(weeklyHeader)weeklyHeader.insertAdjacentHTML("afterbegin",avatar(p));
 const weeklyNumbers=$('.weekly-briefing .week-reference');
 if(weeklyNumbers)weeklyNumbers.outerHTML=S.metrics(p,state.data,state.lens)+PublicGameHealth.panel(p)+U.chart(p,state.data)+S.outlook(p,state.data);
 else $('#detail-content .panel-story')?.insertAdjacentHTML('afterend',PublicGameHealth.panel(p));
 $('#detail-content .weekly-briefing')?.insertAdjacentHTML('afterend',PublicInjuryOpportunities.playerContext(p,state.data));
 $('#detail-content .weekly-briefing')?.insertAdjacentHTML('afterend',PublicTradeWatch.playerContext(p,state.data));
 // Four immediately visible sections carry the story; calculations remain optional.
 $('#detail-content .season-evidence > summary')?.replaceChildren(document.createTextNode('All season data and model calculations'));
 const rankAnchor=$(".outlook-explainer");
 if(rankAnchor){rankAnchor.insertAdjacentHTML('afterend',U.bars(p,state.data));if(p.position==='WR')rankAnchor.insertAdjacentHTML('afterend',`<details class="wr-rank-panel"><summary>Model rank versus market · experimental</summary>${R.panel(p,R.build(state.data,state.lens),state.data)}</details>`);}
 $$('#detail-content details summary').forEach(e=>{if(expanded.includes(e.textContent))e.parentElement.open=true;});
 PublicSnapshots.decoratePanel(p,state.data,document);
 panel.dataset.renderedPlayer=p.id;panel.scrollTop=scroll;
 $("#close-player").addEventListener("click",()=>closePlayer(true));
 $("#panel-watch").addEventListener("click",()=>{toggleWatch(p.id);$("#panel-watch").focus({preventScroll:true});});
}
function togglePlayer(id,trigger){if(state.selected===id){closePlayer(true);return;}const dialog=$("#player-panel");if(dialog.open)dialog.close();returnTarget=trigger;state.selected=id;render();renderPlayer();document.body.classList.add("panel-open");if(matchMedia("(min-width:1180px)").matches)dialog.show();else dialog.showModal();$("#close-player").focus({preventScroll:true});}
function closePlayer(focus=false){const id=state.selected;state.selected=null;$("#player-panel").close();document.body.classList.remove("panel-open");if(state.data)render();if(focus)(document.querySelector(state.view==='schedule'?`[data-schedule-player="${id}"]`:state.view==='trades'?`[data-trade-player="${id}"]`:state.view==='injuries'?`[data-opportunity-player="${id}"]`:`[data-player="${id}"]`)||(returnTarget?.isConnected?returnTarget:null)||$("#search"))?.focus({preventScroll:true});}
function renderResearch(){const d=state.data;$("#research-rows").innerHTML=d.historical.rbComparison.map(r=>`<tr><td>${esc(r.method)}</td><td>${M.fmt(r.rankingRelationship,3)}</td><td>${Number(r.rows).toLocaleString()}</td></tr>`).join("");$("#research-coverage").textContent=`The saved receiver archive contains ${d.historical.wrSnapshots.toLocaleString()} player/cutoff observations across ${d.historical.seasons.join(", ")}. That is research coverage, not successful predictions or unique players.`;const date=d.footballUpdatedAt?new Date(d.footballUpdatedAt):null;$("#about-freshness").textContent=`Published coverage: ${M.cutoffLabel(d)}.${date&&!Number.isNaN(date.valueOf())?` The underlying football file was generated ${date.toLocaleDateString("en-US",{timeZone:"America/Los_Angeles",month:"long",day:"numeric",year:"numeric"})}.`:""} The site checks for a newer published snapshot when you return and every five minutes while visible.`;}
async function loadData(manual=false){
 if(checking||(!manual&&Date.now()-lastCheckAt<60000))return;checking=true;lastCheckAt=Date.now();$("#refresh").disabled=true;$("#snapshot").disabled=true;if(manual)$("#refresh-status").textContent="Checking published data…";
 try{
  const response=await fetch(PublicSnapshots.path(state.snapshot),{cache:'no-cache'});if(!response.ok)throw Error("Download failed");
  const data=M.validate(await response.json());
  PublicSchedule.validate(data.scheduleContext,data);
  if(state.data&&state.data.snapshotKey===data.snapshotKey&&(data.season<state.data.season||(data.season===state.data.season&&data.throughWeek<state.data.throughWeek)))throw Error("Older snapshot rejected");
  const initial=!state.data,changed=!initial&&!M.sameSnapshot(state.data,data);
  const reviewChanged=!initial&&state.data.players.some(p=>{const expiry=Date.parse(p.availability?.reviewAfter);return expiry>=lastAvailabilityReview&&expiry<Date.now();});
  const priceExpired=!initial&&state.data.players.some(p=>['redraft','dynasty'].some(l=>{const expiry=Date.parse(p.market?.[l]?.date)+72*3600e3;return expiry>=lastAvailabilityReview&&expiry<Date.now();}));
  lastAvailabilityReview=Date.now();
  state.data=data;$("#data-error").hidden=true;
  $("#new-research").innerHTML=V.study(data)+PublicSchedule.study(data)+PublicGameHealth.study(data)+PublicEvidence.rolesStudy(data)+PublicEvidence.study(data)+PublicEvidence.benchmark(data)+PublicEvidence.tracker(data);
  if(initial||changed||reviewChanged||priceExpired){
   const active=document.activeElement,focusId=active?.id,playerId=active?.dataset.player,watchId=active?.dataset.watch,scenarioKey=['tradeSelect','tradePlayer','injurySelect','opportunityPlayer','schedulePlayer'].find(k=>active?.dataset[k]),scenarioId=scenarioKey?active.dataset[scenarioKey]:null,summaryText=active?.tagName==="SUMMARY"?active.textContent:null;
   const panelScroll=$("#player-panel").scrollTop;
   renderResearch();render();if(state.selected&&$("#player-panel").open)renderPlayer();
   $("#player-panel").scrollTop=panelScroll;
   // Keep the same keyboard task after the newer snapshot replaces its nodes.
   if(active&&!active.isConnected){
    const replacement=focusId?document.getElementById(focusId):playerId?document.querySelector(`[data-player="${CSS.escape(playerId)}"]`):watchId?document.querySelector(`[data-watch="${CSS.escape(watchId)}"]`):scenarioKey?document.querySelector(`[data-${scenarioKey.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}="${CSS.escape(scenarioId)}"]`):summaryText?$$("#detail-content summary").find(e=>e.textContent===summaryText):null;
    (replacement?.getClientRects().length?replacement:$("#player-panel").open?$("#close-player"):$("#search")).focus({preventScroll:true});
   }
  }
  $("#refresh-status").textContent=changed?"New published snapshot loaded":manual?"Checked · latest published snapshot":"Completed-week snapshots";
 }
 catch(error){$("#data-error").hidden=false;$("#data-error").textContent=state.data?"The update couldn't be verified. Keeping the last loaded data and its original cutoff.":"The player data couldn't load. Check your connection, then use the refresh button. Research and project information remain available.";$("#refresh-status").textContent="Update unavailable";if(!state.data){$("#player-rows").innerHTML="";$("#table-wrapper").setAttribute("aria-busy","false");$("#snapshot-status").textContent="Data unavailable · no cutoff assumed";}}
 finally{checking=false;$("#refresh").disabled=false;$("#snapshot").disabled=false;}
}
$$("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$$("[data-open-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.openView)));
$$("[data-position]").forEach(b=>b.addEventListener("click",()=>{state.position=b.dataset.position;state.query="";state.group="all";showView("players");}));
$$("[data-lens]").forEach(b=>b.addEventListener("click",()=>{closePlayer();state.lens=b.dataset.lens;if((state.lens==="redraft"&&["development","veteran"].includes(state.group))||(state.lens==="dynasty"&&state.group==="cheaper"))state.group="all";render();}));
$$("[data-group]").forEach(b=>b.addEventListener("click",()=>{closePlayer();state.group=b.dataset.group;state.page=1;if(state.sort==='growth'&&state.group!=='growing')state.sort='market';if(state.group==='growing')state.sort='growth';if(state.group==="gap")state.sort="gap";if(state.group==="cheaper")state.sort="marketgap";render();}));
$$('[data-group]').forEach(b=>b.addEventListener('click',()=>{if(['excess','unexplained'].includes(b.dataset.group))state.sort=b.dataset.group;else if(['excess','unexplained'].includes(state.sort))state.sort=b.dataset.group==='gap'?'gap':b.dataset.group==='cheaper'?'marketgap':b.dataset.group==='growing'?'growth':'market';render();}));
$("#search").addEventListener("input",e=>{state.query=e.target.value;state.page=1;closePlayer();});
for(const key of ["position","sort"])$("#"+key).addEventListener("change",e=>{state[key]=e.target.value;state.page=1;closePlayer();});
$("#previous").addEventListener("click",()=>{state.page--;closePlayer();});$("#next").addEventListener("click",()=>{state.page++;closePlayer();});
$("#clear-filters").addEventListener("click",()=>{state.query="";state.group="all";state.position="ALL";state.page=1;if(state.view==="watchlist"&&!state.watchlist.length)state.view="players";render();});
$("#refresh").addEventListener("click",()=>loadData(true));$("#data-info").addEventListener("click",()=>showView("about"));
$('#trade-search').addEventListener('input',()=>render());$('#trade-level').addEventListener('change',()=>render());
$('#injury-search').addEventListener('input',()=>render());
$('#injury-position').addEventListener('change',e=>{state.injuryPosition=e.target.value;state.injurySelected=null;render();});
$("#search-shortcut").addEventListener("click",()=>{showView("players");$("#search").focus();});
$("#menu-toggle").addEventListener("click",()=>{const open=$(".shell").classList.toggle("nav-open");$("#menu-toggle").setAttribute("aria-expanded",String(open));});
$("#player-panel").addEventListener("cancel",e=>{e.preventDefault();closePlayer(true);});
$("#player-panel").addEventListener("click",e=>{if(e.target===$("#player-panel")){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientY<r.top||e.clientX>r.right||e.clientY>r.bottom)closePlayer(true);}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("#player-panel").open)closePlayer(true);else closeMenu();}if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$("#player-panel").open){e.preventDefault();showView("players");$("#search").focus();}});
matchMedia("(min-width:1180px)").addEventListener("change",()=>{if(!$("#player-panel").open)return;const id=state.selected,trigger=returnTarget;closePlayer();togglePlayer(id,trigger);});
addEventListener("popstate",()=>{$("#player-panel").close();document.body.classList.remove("panel-open");state.selected=null;const prior=state.snapshot;restore();const id=state.selected;state.selected=null;if(prior!==state.snapshot){state.data=null;lastCheckAt=0;loadData(true).then(()=>{if(id&&state.data?.players.some(p=>p.id===id))togglePlayer(id,$("#search"));});}else{render();if(id&&state.data?.players.some(p=>p.id===id))togglePlayer(id,$("#search"));}});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadData(false);});
setInterval(()=>{if(document.visibilityState==="visible")loadData(false);},300000);
restore();if(!['players','watchlist'].includes(state.view))state.snapshot='latest';const initialPlayer=state.selected;state.selected=null;loadData(false).then(()=>{if(initialPlayer&&state.data?.players.some(p=>p.id===initialPlayer))togglePlayer(initialPlayer,$("#search"));});

async function switchSnapshot(key,view='players'){
 if(checking)return;
 closePlayer(false);state.snapshot=PublicSnapshots.normalize(key);state.view=view;state.data=null;state.query='';state.page=1;state.selected=null;
 if(state.snapshot!=='latest'){state.position='ALL';state.group='gap';state.sort='gap';state.lens='dynasty';}
 lastCheckAt=0;writeUrl(true);await loadData(true);
}
$('#snapshot').addEventListener('change',e=>switchSnapshot(e.target.value));
