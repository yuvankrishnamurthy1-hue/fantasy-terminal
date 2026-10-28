/* Separate past scoring, verified early exits and usable current availability. */
(function(root){
 'use strict';
 const M=root.PublicTerminal||(typeof require!=='undefined'?require('./model.js'):null);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const point=x=>M.finite(x)?x.toFixed(1):'Unavailable';
 function panel(p){
  const h=p.gameHealth,a=M.availability(p);
  let html='<section class="game-health"><h3>Scoring and availability</h3>';
  if(a.blocked)html+=`<p class="caution"><strong>${esc(a.status)}.</strong> ${esc(a.returnEstimate||'No return date is verified.')} Past production is not usable lineup production while he is out. His dynasty-stash value is a separate question.</p>`;
  else html+=`<p>Current availability: ${esc(a.label)}. A missing injury report is not proof of health.</p>`;
  if(a.sourceUrl)html+=`<p><a href="${esc(a.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(a.source)} · report dated ${esc(a.sourcePublishedDate)}</a></p>`;
  if(!h||!h.recordedGames)return html+'<p>No linked scoring-game comparison. Nothing is filled in as zero.</p></section>';
  if(h.excludedWeeks.length){
   html+=`<dl><dt>All recorded appearances · ${h.recordedGames} games</dt><dd>${point(h.recordedPpg)} PPR/game</dd><dt>Without verified early exits · ${h.comparisonGames} games</dt><dd>${point(h.comparisonPpg)} PPR/game</dd><dt>Usage without those same exits</dt><dd>${point(h.comparisonUsagePpg)} points/game</dd></dl><p>Leaves out Week${h.excludedWeeks.length===1?'':'s'} ${h.excludedWeeks.join(', ')} only in this comparison. <strong>This is not a new prediction or an estimate of fully healthy production.</strong> Other poor games and role losses stay in; late injury exits may also remain.</p>`;
  }else html+='<p>No verified early exit was removed from this comparison. That does not mean every game was healthy or unrestricted.</p>';
  if(h.reviewedGames.length)html+=`<details><summary>Verified game explanations and sources</summary>${h.reviewedGames.map(r=>`<p><strong>Week ${r.week} · ${point(r.ppr)} PPR · ${point(r.snapShare)}% snaps.</strong> ${esc(r.reason)} ${r.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} · ${esc(s.publishedDate)}</a>`).join(' ')}</p>`).join('')}</details>`;
  return html+'<p class="detail-note">Targeted source review, not a complete injury archive. Original scores, usage and saved model estimates are unchanged. Missed games are not zeroes.</p></section>';
 }
 function study(data){
  const s=data.gameHealthStudy;if(!s)return '';
  const rows=s.metrics.filter(r=>r.season===2025&&r.subset==='all');
  return `<h2>Did verified early-exit handling improve forecasts?</h2><p>${esc(s.decision)}</p><div class="table-wrapper"><table class="research-table"><caption>2025 fixed-model sensitivity · average PPR/game miss; smaller is better</caption><thead><tr><th scope="col">Position</th><th scope="col">Unchanged model</th><th scope="col">Additional injury context</th><th scope="col">Windows</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.position)}</th><td>${point(r.baselineMae)}</td><td>${point(r.candidateMae)}</td><td>${r.observations}</td></tr>`).join('')}</tbody></table></div><p>${esc(s.method)}</p><p>${esc(s.limitations)}</p>`;
 }
 const api={panel,study};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PublicGameHealth=api;
})(typeof globalThis!=='undefined'?globalThis:this);
