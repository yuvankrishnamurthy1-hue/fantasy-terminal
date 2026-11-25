"""Build the public site's derived data files from data.json plus fresh nflverse results.

Runs in GitHub Actions every Tuesday (and whenever data.json changes). It never
touches the model fields in data.json: those keep their own football cutoff.
Everything here is public data, so the script needs no secrets.

Outputs
  data/summary.json         Small board file the page loads first.
  data/players/<id>.json    Full evidence for one player, loaded when opened.
  data/live.json            Weekly results through the latest completed week,
                            upcoming opponents, Sleeper ID links and grades for
                            frozen calls whose window has finished.

Usage
  python pipeline/build_site_data.py              # split + live refresh
  python pipeline/build_site_data.py --split-only # no network access
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
import unicodedata
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data.json"
OUT = ROOT / "data"
GAMES_CSV = "https://github.com/nflverse/nfldata/raw/master/data/games.csv"

# Fields only the player panel reads. They move to data/players/<id>.json.
DETAIL_ONLY = (
    "gameHealth", "weeklySnaps", "injuryHistory",
    "components", "marketFreshness", "coverage",
)


def dump(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------- split
def compact_context(ctx: dict) -> dict:
    """Keep only what the board, injury view and growth screen read."""
    if not isinstance(ctx, dict):
        return ctx
    out = {k: ctx.get(k) for k in ("status", "week", "lastGame", "weeklyPoints") if k in ctx}
    if ctx.get("ownInjury"):
        out["ownInjury"] = {"status": ctx["ownInjury"].get("status")}
    q = ctx.get("quarterback")
    if q:
        out["quarterback"] = {"actualName": q.get("actualName"),
                              "backupWithInjuryEvidence": q.get("backupWithInjuryEvidence")}
    mates = [t for t in ctx.get("teammates") or [] if t.get("possibleOpening") and t.get("aheadOnDepthChart")]
    if mates:
        out["teammates"] = [{k: t.get(k) for k in ("name", "status", "possibleOpening", "aheadOnDepthChart")} for t in mates]
    return out


def split(data: dict, version: str) -> dict:
    players_dir = OUT / "players"
    if players_dir.exists():
        for old in players_dir.glob("*.json"):
            old.unlink()
    weekly = (data.get("weeklyPlayerContext") or {}).get("players") or {}
    summary_players = []
    for p in data["players"]:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", p["id"]):
            raise ValueError(f"Unsafe player id: {p['id']!r}")
        dump(players_dir / f"{p['id']}.json", {"version": version, "player": p, "weekly": weekly.get(p["id"])})
        slim = {k: v for k, v in p.items() if k not in DETAIL_ONLY}
        if isinstance(slim.get("roleResearch"), dict):
            slim["roleResearch"] = {k: v for k, v in slim["roleResearch"].items() if k != "comparables"}
        summary_players.append(slim)
    summary = {**data, "players": summary_players, "detailVersion": version}
    if data.get("weeklyPlayerContext"):
        summary["weeklyPlayerContext"] = {
            **{k: v for k, v in data["weeklyPlayerContext"].items() if k != "players"},
            "players": {pid: compact_context(c) for pid, c in weekly.items()},
        }
    dump(OUT / "summary.json", summary)
    return summary


# ---------------------------------------------------------------- live layer
def norm(name: str) -> str:
    name = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode().lower()
    name = re.sub(r"[^a-z ]", "", name)
    return " ".join(w for w in name.split() if w not in {"jr", "sr", "ii", "iii", "iv", "v"})


def load_games() -> list[dict]:
    req = urllib.request.Request(GAMES_CSV, headers={"User-Agent": "fantasy-terminal-site-build"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return list(csv.DictReader(io.StringIO(r.read().decode("utf-8"))))


def completed_week(games: list[dict], season: int) -> int:
    weeks = defaultdict(lambda: [0, 0])
    for g in games:
        if int(g["season"]) == season and g["game_type"] == "REG":
            w = weeks[int(g["week"])]
            w[0] += 1
            w[1] += bool(g["home_score"] and g["away_score"])
    done = [wk for wk, (n, scored) in weeks.items() if n and n == scored]
    return max(done) if done else 0


def live(data: dict) -> dict:
    import nflreadpy as nfl
    import polars as pl

    season = data["season"]
    games = load_games()
    through = completed_week(games, season)
    stats = nfl.load_player_stats(season).filter(pl.col("season_type") == "REG")
    stats = stats.filter(pl.col("week") <= through)
    opp = nfl.load_ff_opportunity(season).with_columns(pl.col("week").cast(pl.Int64))
    usage = {(r["player_id"], int(r["week"])): r["total_fantasy_points_exp"]
             for r in opp.select("player_id", "week", "total_fantasy_points_exp").to_dicts()}
    ids = nfl.load_ff_playerids().select("gsis_id", "sleeper_id")
    sleeper = {r["gsis_id"]: str(r["sleeper_id"]) for r in ids.to_dicts() if r["gsis_id"] and r["sleeper_id"]}

    rows_by_gsis = defaultdict(list)
    by_name = defaultdict(set)
    for r in stats.select("player_id", "player_display_name", "position", "week", "team",
                          "fantasy_points_ppr", "targets", "carries", "attempts").to_dicts():
        rows_by_gsis[r["player_id"]].append(r)
        by_name[(norm(r["player_display_name"]), r["position"])].add(r["player_id"])

    old_weekly = (data.get("weeklyPlayerContext") or {}).get("players") or {}
    players, unmatched, mismatched = {}, [], []
    for p in data["players"]:
        cands = by_name.get((norm(p["name"]), p["position"]), set())
        known = {w["week"]: w.get("ppr") for w in (old_weekly.get(p["id"]) or {}).get("weeklyPoints") or []}

        def agreement(gsis):
            rows = {r["week"]: r["fantasy_points_ppr"] for r in rows_by_gsis[gsis]}
            shared = [w for w in known if w in rows and known[w] is not None]
            return sum(abs(rows[w] - known[w]) < 0.05 for w in shared), len(shared)

        if not cands:
            unmatched.append(p["name"])
            continue
        gsis = max(cands, key=lambda g: (agreement(g)[0], any(r["team"] == p["team"] for r in rows_by_gsis[g])))
        hits, shared = agreement(gsis)
        if shared and hits < shared:
            mismatched.append(f"{p['name']} {hits}/{shared}")
        weekly = []
        for r in sorted(rows_by_gsis[gsis], key=lambda r: r["week"]):
            u = usage.get((gsis, r["week"]))
            weekly.append([r["week"], r["team"], round(r["fantasy_points_ppr"] or 0, 2),
                           None if u is None else round(u, 2),
                           r["attempts"] if p["position"] == "QB" else r["targets"],
                           r["carries"]])
        players[p["id"]] = {"sleeper": sleeper.get(gsis), "weekly": weekly}

    upcoming = defaultdict(list)
    for g in games:
        if int(g["season"]) != season or g["game_type"] != "REG":
            continue
        wk = int(g["week"])
        if through < wk <= through + 4:
            upcoming[g["home_team"]].append({"week": wk, "opp": g["away_team"], "home": True, "day": g["gameday"]})
            upcoming[g["away_team"]].append({"week": wk, "opp": g["home_team"], "home": False, "day": g["gameday"]})

    grades = grade_calls(data, players, through)
    return {
        "season": season,
        "throughWeek": through,
        "nextWeek": through + 1,
        "builtAt": datetime.now(timezone.utc).isoformat(),
        "source": "nflverse player stats (PPR) and ffopportunity expected points; nflverse/nfldata schedule",
        "matched": len(players), "unmatched": unmatched, "mismatchedHistory": mismatched,
        "players": players,
        "upcoming": {t: sorted(v, key=lambda x: x["week"]) for t, v in upcoming.items()},
        "grades": grades,
    }


def grade_calls(data: dict, players: dict, through: int) -> dict:
    """Grade frozen calls the same way as the local pipeline: PPR per recorded
    appearance inside the call's scheduled window, compared with the PPG at the
    time of the call. Windows that have not finished stay ungraded."""
    out = {}
    for snap in data.get("trackRecord") or []:
        if snap["lastWeek"] > through:
            continue
        key = f"{snap['throughWeek']}|{snap['policyVersion']}"
        graded = []
        for c in snap["calls"]:
            weeks = {int(g.split("_")[1]) for g in c.get("scheduledGameIds") or []}
            rows = [w for w in (players.get(c["playerId"]) or {}).get("weekly", []) if w[0] in weeks]
            actual = sum(w[2] for w in rows) / len(rows) if rows else None
            graded.append({"playerId": c["playerId"], "appearances": len(rows),
                           "actualPpg": None if actual is None else round(actual, 2),
                           "improvedByTwo": None if actual is None else actual - c["currentPpg"] >= 2 - 1e-9})
        out[key] = graded
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--split-only", action="store_true")
    args = ap.parse_args()
    raw = SOURCE.read_bytes()
    data = json.loads(raw)
    if data.get("privacy", {}).get("privateLeagueDataIncluded") is not False:
        raise SystemExit("data.json is missing its public privacy boundary; refusing to build")
    version = hashlib.sha256(raw).hexdigest()[:16]
    summary = split(data, version)
    print(f"summary.json {len(json.dumps(summary, separators=(',', ':'))) / 1e6:.2f} MB, "
          f"{len(data['players'])} player files, version {version}")
    if args.split_only:
        return 0
    payload = live(data)
    dump(OUT / "live.json", payload)
    print(f"live.json through Week {payload['throughWeek']}: matched {payload['matched']}, "
          f"unmatched {len(payload['unmatched'])}, history mismatches {len(payload['mismatchedHistory'])}, "
          f"graded windows {len(payload['grades'])}")
    if payload["mismatchedHistory"]:
        print("  mismatches:", ", ".join(payload["mismatchedHistory"][:20]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
