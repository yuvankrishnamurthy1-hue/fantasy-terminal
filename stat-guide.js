/* Display-only definitions. Never changes source rows, forecasts or sorting. */
(function(root){
 "use strict";
 const M=root.PublicTerminal||(typeof require!=="undefined"?require("./model.js"):null);
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const point=x=>M.finite(x)?Number(x.toFixed(1)).toFixed(1):"—";
 function signed(x){if(!M.finite(x))return "—";const v=Number(x.toFixed(1));return `${v>0?"+":""}${v.toFixed(1)}`;}
 function gapClass(x){return !M.finite(x)||Number(x.toFixed(1))===0?"number-muted":x>0?"gap-positive":"gap-negative";}
 function windowFor(p,data){
  const cutoff=M.cutoffFor(data,p);
  return Number.isInteger(cutoff)&&cutoff<18?{cutoff,first:cutoff+1,last:Math.min(18,cutoff+4)}:null;
 }
 function metrics(p,data,lens){
  const price=p.market?.[lens],w=windowFor(p,data),forecast=M.availability(p).blocked?null:p.research?.outlook_ppg;
  const cell=(label,value,note)=>`<div><dt>${label}</dt><dd>${value}<span>${note}</span></dd></div>`;
  return `<dl class="week-reference clear-metrics">${cell("Scored so far",point(p.ppg),"PPR points / game")}${cell("From past usage",point(p.usagePpg),"PPR points / game · not a forecast")}${cell("Model estimate",point(forecast),M.availability(p).blocked?'Unavailable · see injury status':w?`PPR / game if playing · W${w.first}–${w.last}`:"Forecast window unavailable")}${cell('Market rank',price?`${esc(p.position)}${M.fmt(price.positionRank,0)}`:"—",`${esc(lens)} · within position, not points`)}</dl>`;
 }
 function outlook(p,data){
  const value=p.research?.outlook_ppg,w=windowFor(p,data),band=p.research?.error_band_80;
  if(M.availability(p).blocked)return '<div class="outlook-explainer"><p><strong>No usable current model estimate while reported unavailable.</strong> His saved scoring model is retained for audit, not presented as points you can use in a lineup. Check the dated availability report above.</p></div>';
  if(!M.finite(value))return '<div class="outlook-explainer"><p><strong>Model estimate unavailable.</strong> No forecast is filled in as zero. The research estimate needs at least three recorded appearances and a usable source match.</p></div>';
  const window=w?`Weeks ${w.first}–${w.last}`:"the saved forecast window";
  const difference=M.finite(p.ppg)?Number((value-p.ppg).toFixed(1)):null;
  const compare=difference===null?"":difference===0?" That is about the same as his scoring average so far.":` That is about ${point(Math.abs(difference))} ${difference>0?"more":"fewer"} points per game than his scoring average so far.`;
  const isUsage=p.research?.outlook_method==="raw_usage";
  const method=isUsage?"This position's published method currently uses its past usage estimate directly; there is no extra learned adjustment to that number.":"It combines football inputs kept by this position's historical tests, such as scoring and workload. Different positions keep different ingredients. The saved weights—not a new manual opinion—produce this estimate.";
  const error=Array.isArray(band)&&band.length===2&&band.every(M.finite)?`<p><strong>Past-error reference: ${point(band[0])}–${point(band[1])} PPR/game.</strong> This uses the size of 80% of the model's historical errors at his position. It is not an 80% chance that this player lands in that range.</p>`:"";
  return `<div class="outlook-explainer"><p><strong>What ${point(value)} means:</strong> about ${point(value)} PPR points per game during ${window}, counting only games he plays.${compare}</p><details><summary>How the Model estimate works & what it leaves out</summary><p>${method} It is football-only: market price does not set the forecast.</p><p>Not a four-week total, a 0–100 score, a single-game promise or a dynasty career value. Missed games are not added as zeroes. This number alone does not predict health; check his own status and the teammate/QB notes separately. Those newer notes do not automatically change the saved forecast.</p>${error}${w?`<p>Based on football through Week ${w.cutoff}. The window is four NFL week numbers, not necessarily four games; byes can leave fewer games.</p>`:""}</details></div>`;
 }
 function boardGuide(){
  return `<div class="numbers-guide"><p class="numbers-key">Points use PPR. <strong>Model estimate = estimated points per game over the next four weeks, if he plays.</strong></p><details id="stat-guide"><summary>What do these numbers mean?</summary><dl class="stat-definitions"><div><dt>Scored</dt><dd>His actual average this season per recorded appearance. Missed games are not zeroes.</dd></div><div><dt>Usage</dt><dd>The points his past opportunities would typically produce. Targets, carries and pass attempts matter differently by position. This describes past work—not next week's score.</dd></div><div><dt>Usage gap</dt><dd>Past usage minus actual scoring, before rounding; gap order follows this number. Positive: fewer points than his work suggests. Negative: more. It is not Model estimate minus Scored, a market discount or guaranteed improvement.</dd></div><div id="stat-outlook" tabindex="-1"><dt>Model estimate</dt><dd>The model's PPR-per-game estimate for the next four NFL weeks, only in games he plays. For example, 16.0 means roughly 16 points per appearance—not 16 total or a 16/100 rating. Byes and missed games do not become zeroes. It is not a dynasty career forecast.</dd></div><div><dt>Market rank</dt><dd>His place within his position in the dated price source for your chosen lens. WR11 means the source's 11th-ranked receiver—not 11 points or $11. It is not a guaranteed trade price.</dd></div><div><dt>Missing values</dt><dd>A dash means unavailable, never zero. A positive gap alone does not make someone undervalued.</dd></div></dl></details></div>`;
 }
 function install(doc){
  const header=(selector,top,bottom)=>{const th=doc.querySelector(selector);th.innerHTML=`<span>${top}</span><small>${bottom}</small>`;};
  header('th.age-col','Market rank','within position');
  header('thead th:nth-child(4)','Scored','pts/game');
  header('th.usage-col','Usage','pts/game');
  header('th.gap-col','<button type="button" class="stat-header-help gap-header-help" aria-expanded="false" aria-controls="stat-guide">Usage gap · help</button>','usage − scored');
  header('th.games-col','<button type="button" class="stat-header-help" aria-expanded="false" aria-controls="stat-guide">Model estimate <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 11v5m0-9v.1"/></svg></button>','4 weeks · pts/game');
  doc.querySelector('th.gap-col').removeAttribute('title');
  doc.querySelector('#table-wrapper').insertAdjacentHTML('beforebegin',boardGuide());
  const gapDefinition=doc.querySelector('#stat-guide .stat-definitions > div:nth-child(3)');gapDefinition.id='stat-gap';gapDefinition.tabIndex=-1;
  gapDefinition.querySelector('dd').textContent='Usage gap = Usage minus Scored, before rounding. The gap sort follows this displayed number. Positive means scoring below past usage; negative means scoring above it. Neither is a buy/sell rating or a measure of talent. Check the games played because small samples can exaggerate the gap. The screen requires a gap of 2+ and 3+ appearances, and excludes reported-unavailable players. The cautious sample-reduced comparison remains in the player calculations; it no longer sets this order.';
  doc.querySelector('#stat-guide').insertAdjacentHTML('beforeend','<p><strong>Model span:</strong> an error-size reference from historical tests, not a personal probability or expert consensus. It can miss established stars or role changes. Exact model/market ranks remain available in WR summaries; different time horizons are not a trade recommendation.</p>');
  const guide=doc.querySelector('#stat-guide'),buttons=[...doc.querySelectorAll('.stat-header-help')];
  buttons.forEach(button=>button.addEventListener('click',()=>{const outer=doc.querySelector('.board-help');if(outer)outer.open=true;guide.open=true;const target=doc.querySelector(button.classList.contains('gap-header-help')?'#stat-gap':'#stat-outlook');target.focus();target.scrollIntoView({block:'nearest'});}));
  guide.addEventListener('toggle',()=>buttons.forEach(button=>button.setAttribute('aria-expanded',String(guide.open))));
 }
 const api={point,signed,gapClass,windowFor,metrics,outlook,boardGuide,install};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.PublicStatGuide=api;
})(typeof globalThis!=="undefined"?globalThis:this);
