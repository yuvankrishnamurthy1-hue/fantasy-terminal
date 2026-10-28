/* Matched WR ordering only. Never refits forecasts or edits published records. */
(function(root){
 "use strict";
 const M=root.PublicTerminal||(typeof require!=="undefined"?require('./model.js'):null);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function reason(p,data,lens){
  if(p.position!=='WR')return 'WR comparison only';
  if(M.cutoffFor(data,p)!==data.throughWeek)return `Held at Week ${M.cutoffFor(data,p)}`;
  if(M.availability(p).blocked)return 'Reported unavailable';
  if(!(p.games>=3)||!M.finite(p.research?.outlook_ppg))return 'No usable Model estimate';
  if(!M.finite(p.market?.[lens]?.positionRank)||p.market[lens].positionRank<1)return 'No matched market rank';
  return null;
 }
 function build(data,lens){
  const pool=data.players.filter(p=>!reason(p,data,lens)),players={};
  for(const p of pool){
   const outlookRank=1+pool.filter(q=>q.research.outlook_ppg>p.research.outlook_ppg).length;
   const marketRank=1+pool.filter(q=>q.market[lens].positionRank<p.market[lens].positionRank).length;
   players[p.id]={outlookRank,marketRank,sourceRank:p.market[lens].positionRank,gap:marketRank-outlookRank};
  }
  return {players,count:pool.length,lens,cutoff:data.throughWeek};
 }
 const places=n=>n===0?'Same rank':`${Math.abs(n)} place${Math.abs(n)===1?'':'s'} ${n>0?'higher':'lower'} in model`;
 const tone=n=>'number-muted';
 function cell(p,index,data){
  const r=index.players[p.id];
  if(!r)return `<span class="number-muted">—</span><small class="wr-rank-missing">${esc(reason(p,data,index.lens))}</small>`;
  return `<span class="wr-rank-pair"><span><b>WR${r.outlookRank}</b><small>Model estimate</small></span><span><b>WR${r.marketRank}</b><small>Market</small></span></span><small class="wr-rank-difference ${tone(r.gap)}">${places(r.gap)}</small>`;
 }
 function mobile(p,index){
  const r=index.players[p.id];
  return r?`<p class="wr-rank-mobile">Model estimate <strong>WR${r.outlookRank}</strong> · market <strong>WR${r.marketRank}</strong> <span class="${tone(r.gap)}">(${places(r.gap)})</span></p>`:'';
 }
 function sort(rows,index,mode){
  if(!['rankgap','rankdown'].includes(mode))return rows;
  return rows.slice().sort((a,b)=>{
   const x=index.players[a.id],y=index.players[b.id];
   if(!x||!y)return x?-1:y?1:a.name.localeCompare(b.name);
   return (mode==='rankdown'?x.gap-y.gap:y.gap-x.gap)||x.outlookRank-y.outlookRank||a.name.localeCompare(b.name);
  });
 }
 function legend(index){
  return `<summary>WR rank comparison · same ${index.count} matched receivers</summary><p>Model estimate ranks the next four weeks per game if playing. Market ranks the same receivers using the selected ${esc(index.lens)} price source. A positive difference means Model estimate ranks him higher, not proven trade value. Original full-source market ranks remain in each row and player summary.</p><p>Missing forecasts/prices, reported unavailable players and held earlier-cutoff players are not ranked. Ranks are computed before search, filters, watchlists and pagination, so they do not change when you narrow the list. Ties share a rank; forecast sorting uses unrounded numbers.</p>`;
 }
 function panel(p,index,data){
  if(p.position!=='WR')return '';
  const r=index.players[p.id];
  if(!r)return `<section class="wr-rank-panel"><h3>Model estimate rank versus market</h3><p>No matched WR comparison: ${esc(reason(p,data,index.lens))}. His saved points, source price and earlier forecast remain unchanged.</p></section>`;
  const direction=r.gap>0?`Model estimate ranks him ${r.gap} place${r.gap===1?'':'s'} higher than market in this group.`:r.gap<0?`Model estimate ranks him ${-r.gap} place${r.gap===-1?'':'s'} lower than market in this group.`:'Model estimate and market give him the same rank in this group.';
  return `<section class="wr-rank-panel"><h3>Model estimate rank versus market</h3><dl><div><dt>Model estimate rank</dt><dd>WR${r.outlookRank}</dd></div><div><dt>${esc(index.lens)} market rank</dt><dd>WR${r.marketRank}</dd></div></dl><p>${direction} Both ranks use the same ${index.count} matched receivers with football through Week ${index.cutoff}.</p><p>${index.lens==='dynasty'?'Different time horizons: an older WR can rank well for the next four weeks but deserve a lower dynasty price. This is not a remaining-career valuation or an automatic buy.':'The market is a dated rest-of-season reference; Model estimate covers four weeks. A difference is a research lead, not proof the player is cheap.'}</p><details><summary>Original market rank & comparison rules</summary><p>The full source ranks him WR${r.sourceRank}${p.market[index.lens].date?` as of ${esc(p.market[index.lens].date)}`:''}. In our smaller matched set, he is WR${r.marketRank}. Those are different comparison groups, not a changed price.</p><p>Difference = matched market rank minus matched Model estimate rank. Missing prices and forecasts are not zeroes. Reported unavailable and held earlier-cutoff players stay on the board but leave this comparison. Search, filters and pagination do not recalculate the ranks. Ties share ranks; calculations use the unrounded forecast.</p></details></section>`;
 }
 function install(doc){
  doc.querySelector('#table-wrapper').insertAdjacentHTML('beforebegin','<details id="wr-rank-legend" class="wr-rank-legend" hidden></details>');
 }
 const api={reason,build,cell,mobile,sort,legend,panel,install};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.PublicWRRanks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
