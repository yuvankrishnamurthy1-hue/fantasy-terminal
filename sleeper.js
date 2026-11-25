/* Read-only Sleeper connection. Calls Sleeper's public API straight from this
   browser; the league ID and team choice are kept only in this browser's storage.
   Nothing is sent to this site or saved in its repository. */
(function(root){
 "use strict";
 const API="https://api.sleeper.app/v1",KEY="fantasy-terminal-sleeper-v1";
 async function get(path){const r=await fetch(API+path);if(!r.ok)throw Error(`Sleeper returned ${r.status}`);const body=await r.json();if(body==null)throw Error("Not found on Sleeper");return body;}
 function saved(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");return v&&/^\d{6,25}$/.test(v.leagueId)?v:null;}catch{return null;}}
 function save(v){try{v?localStorage.setItem(KEY,JSON.stringify(v)):localStorage.removeItem(KEY);}catch{/* storage optional */}}
 /* A username lists that user's leagues; a numeric value is a league ID. */
 async function findLeagues(input,season){
  const text=String(input||"").trim();
  if(/^\d{6,25}$/.test(text))return {leagues:[await get(`/league/${text}`)]};
  if(!/^[A-Za-z0-9_]{2,40}$/.test(text))throw Error("Enter a Sleeper league ID (digits) or a Sleeper username.");
  const user=await get(`/user/${encodeURIComponent(text)}`);
  const leagues=await get(`/user/${user.user_id}/leagues/nfl/${season}`);
  if(!leagues.length)throw Error(`No ${season} NFL leagues found for that username.`);
  return {leagues,userId:user.user_id};
 }
 async function load(leagueId){
  const [league,rosters,users]=await Promise.all([get(`/league/${leagueId}`),get(`/league/${leagueId}/rosters`),get(`/league/${leagueId}/users`)]);
  if(league.sport&&league.sport!=="nfl")throw Error("That is not an NFL league.");
  const names=Object.fromEntries(users.map(u=>[u.user_id,u.metadata?.team_name||u.display_name||"Unnamed team"]));
  const teams=rosters.map(r=>({rosterId:r.roster_id,ownerId:r.owner_id,name:names[r.owner_id]||`Team ${r.roster_id}`,players:[...new Set([...(r.players||[]),...(r.reserve||[]),...(r.taxi||[])])],starters:(r.starters||[]).filter(x=>x&&x!=="0"),reserve:r.reserve||[]}));
  const sc=league.scoring_settings||{},num=x=>typeof x==="number"?x:0,rec=typeof sc.rec==="number"?sc.rec:null;
  // Points per catch by position, including TE/RB/WR premiums.
  const perCatch=rec==null?null:{RB:rec+num(sc.bonus_rec_rb),WR:rec+num(sc.bonus_rec_wr),TE:rec+num(sc.bonus_rec_te)};
  return {id:league.league_id,name:league.name,season:league.season,slots:(league.roster_positions||[]).filter(s=>!["BN","IR","TAXI"].includes(s)),reception:rec,perCatch,teams,rostered:new Set(teams.flatMap(t=>t.players))};
 }
 const api={findLeagues,load,saved,save};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;root.PublicSleeper=api;
})(typeof globalThis!=="undefined"?globalThis:this);
