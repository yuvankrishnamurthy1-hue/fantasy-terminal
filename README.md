# Fantasy Terminal

Fantasy football research: player workload, scoring, dated market references, injuries and schedules.

Live dashboard: https://yuvankrishnamurthy1-hue.github.io/fantasy-terminal/

## What's on the site

- **Players**: points scored vs. what each player's workload usually produces, with a six-week trend line per player.
- **This week**: start/sit rankings and waiver pickups ranked by projected points for the next four weeks. Connect a Sleeper league (league ID or username) to get advice for your own roster and your league's real free agents. Your browser calls Sleeper's public API directly; the league ID stays in your browser's local storage and never touches this repository.
- **Track record**: every call frozen before kickoff and what happened afterwards, graded automatically each week. It includes the honest result: so far, neither usage nor the model has beaten simply assuming a player keeps scoring what he was scoring.
- **Research, injuries, trade block, schedule**: the evidence behind each number.

## How the data updates

| File | Built by | When |
| --- | --- | --- |
| `data.json` | The private model pipeline (Python/nflreadpy, run locally) | When the model is rerun |
| `data/summary.json`, `data/players/*.json` | `pipeline/build_site_data.py` in GitHub Actions | Whenever `data.json` changes |
| `data/live.json` | Same Action, from nflverse box scores and the nfldata schedule | Every Tuesday at 14:00 UTC |

The page loads the small `data/summary.json` first. A player's full evidence (`data/players/<id>.json`) loads only when his panel is opened. `data/live.json` carries weekly results past the model's cutoff, upcoming opponents, Sleeper ID links and grades for frozen calls whose window has finished. The model's own numbers keep their original cutoff; the Action never edits them.

Run the build locally:

```
pip install -r pipeline/requirements.txt
python pipeline/build_site_data.py          # split + live results
python pipeline/build_site_data.py --split-only
```

## Privacy and sources

This repository contains only the public website and permitted professional-player data. Private league rosters, owners, bids, trades, credentials and restricted vendor feeds are excluded.

Usage points describe recorded opportunities; they are not a guaranteed forecast or proof of market value. Historical test results and limitations appear in Research. Football and market timestamps are separate.

Data attribution and reuse terms: data-attribution.txt and market-license.txt. Market adapter source: market-source.txt.

Built with Python/nflreadpy upstream and a static HTML/CSS/JavaScript frontend, with AI-assisted development.
