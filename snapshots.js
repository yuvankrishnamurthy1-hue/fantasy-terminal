/* Historical cutoff data uses the same board and player panel as the current view. */
(function(root){
 'use strict';
 const normalize=key=>key==='2026-week3'?key:'latest';
 const path=key=>normalize(key)==='latest'?'data.json':'snapshot-2026-week3.json';
 const historical=data=>data?.snapshotKey==='2026-week3';
 function decorate(state,doc){
  const old=historical(state.data);doc.body.classList.toggle('historical-view',old);
  doc.querySelector('#snapshot').value=state.snapshot;
  doc.querySelector('#market-age').hidden=old;
  doc.querySelector('#snapshot-note')?.remove();
  doc.querySelector('.sidebar-section h2').textContent=old?'Week 3 research pool':'Positions';
  doc.querySelector('.sidebar-bottom p').textContent=old?'Week 3 research pool: 188 players. Sort by usage minus scored to compare workload and scoring.':'Public workspace. Private league information stays private.';
  if(!old){doc.querySelector('.board-footnote p').textContent='Gap = usage minus scored, before rounding; gap order follows this number. Positive or negative is not a buy or sell rating. Model spans reflect historical errors, not personal odds.';return;}
  doc.querySelector('.board-footnote p').textContent='Early-season samples are small. Gap = usage minus scored, before rounding; positive or negative is not a buy or sell rating.';
  const note=doc.createElement('p');note.id='snapshot-note';note.className='snapshot-note';
  note.textContent='188-player Week 3 research pool · historical view built later using only data through Week 3. This is not a prediction recorded before Week 4. Historical prices, injury reports and forecasts are not included.';
  doc.querySelector('.context-line').after(note);
  doc.querySelector('#lens-context').textContent='Week 3 · 188-player research pool · standard PPR';
  doc.querySelector('#sidebar-cutoff').textContent='2026 · through Week 3';
  doc.querySelector('#coverage-note').textContent='All 188 original radar candidates are included, not the entire NFL. The dynasty gap screen requires at least three appearances, a 2+ point gap and a non-veteran age. Weekly detail is linked for 10 players; missing detail, prices and injury reports are not zero values or proof of health.';
  doc.querySelector('#coverage-quick').textContent='Week 3 pool coverage & source limits';
 }
 function decoratePanel(player,data,doc){
  if(!historical(data))return;
  const panel=doc.querySelector('#detail-content');
  // A historical price or injury outlook must not be invented to fill a column.
  panel.querySelectorAll('.clear-metrics > div').forEach(e=>{if(/model estimate|market rank/i.test(e.querySelector('dt')?.textContent||''))e.remove();});
  panel.querySelectorAll('.game-health,.outlook-explainer,.week-injuries,.value-evidence,.season-evidence,.wr-rank-panel,.schedule-player-disclosure,.workload-bars').forEach(e=>e.remove());
  const note=doc.createElement('p');note.className='detail-footnote';note.textContent='Historical data through Week 3, shown with the current interface. This is not an original Week 3 screenshot or an archived prospective prediction.';
  panel.querySelector('.panel-body')?.append(note);
 }
 const api={normalize,path,historical,decorate,decoratePanel};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PublicSnapshots=api;
})(typeof globalThis!=='undefined'?globalThis:this);
