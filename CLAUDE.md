# MagicMirror — Claude Context

> **Keep this file updated as we go.** After each session, add new design
> decisions, patterns, or gotchas discovered.

## Project overview

A MagicMirror² installation running on a Raspberry Pi in a family home.
All custom modules live under `modules/`. The display is portrait-oriented.
Deployed via `deploy_files.bat` (selective) or `deploy_to_pi.bat` (full).

## Recipe files — Pi is the source of truth

**NEVER edit recipe JSON files locally and scp them to the Pi.**
The Pi's `modules/MMM-Receptbok/recipes/` is the authoritative copy.
Local copies in the repo may be stale or missing user edits.

To add or update a recipe: use `ssh` to edit on the Pi directly, or use
the `/receptbok/save` HTTP endpoint. To read a recipe before modifying it:
`ssh pi@192.168.1.208 "cat /home/pi/MagicMirror/modules/MMM-Receptbok/recipes/<id>.json"`

## Deploying to the Pi

**Claude should run deploys directly** using `scp` + `ssh pm2 restart` — do not
ask the user to run the `.bat` scripts. The Pi credentials are:

```
PI_USER=pi
PI_HOST=192.168.1.208
PI_MM_PATH=/home/pi/MagicMirror
```

Deploy changed files and restart in one go:
```bash
scp <local_file> pi@192.168.1.208:/home/pi/MagicMirror/<remote_path>
ssh pi@192.168.1.208 "pm2 restart MagicMirror"
```

**Note:** `scp`/`ssh` only works when the Pi is on the same local network as the
machine running Claude. If the connection times out, ask the user to run
`deploy_files.bat` manually from their terminal (the `.bat` scripts have
interactive Y/N prompts so Claude cannot drive them non-interactively).

MagicMirror server: `npm start` — port 8080, accessible on the local network.

## Git commit identity

- Repositories under `https://github.com/SWhardfish/` must be committed as `SWhardfish`.
- Repositories under `https://mercedes-benz.ghe.com/mb-itf/` must use the corporate identity `Rylander, Anders (129-Extern-Anders) (rylanda)`.
- Check the repository remote before committing and select the matching identity.

## Custom modules

| Module | Purpose |
|--------|---------|
| `MMM-Receptbok` | Full-screen kitchen recipe display; GPIO + mobile web navigation |
| `MMM-PrepperPaputin` | Full-screen preparedness checklist; editable mobile remote at `/prepper-paputin/remote` |
| `MMM-RestaurangTavla` | School lunch menu scraper (Södra Latin) |
| `MMM-SL` | Stockholm public transport departures |
| `MMM-BusAlert` | Bus alert/notification overlay |
| `MMM-LCDScheduler` | GPIO-driven LCD screen scheduler |
| `MMM-OpenWeatherForecast` | Weather forecast with Chart.js temperature graph (72h) |
| `MMM-SolarProduction` | Building solar panel production graph + stats (72h, green line) |
| `MMM-Monitoring` | Invisible host telemetry module with statistics and LAN admin pages |
| `MMM-Images` | Rotating image display |

## Design language — mirror display

All custom module UIs on the mirror itself must follow this palette:

| Token | Value |
|-------|-------|
| Background | `#191919` |
| Card/header bg | `#232323` |
| Accent (primary) | `#da7756` (warm terracotta) |
| Body text | `#e8e4e0` / `#d4d0cc` |
| Muted text | `#a39e98` |
| Borders | `#222` (subtle) or `#333` |
| Title font | Georgia, serif |
| Body font | Inherited from MagicMirror: `Roboto Condensed, sans-serif` |
| Section headers | 14px, uppercase, `#999` (grey), no letter-spacing, `Roboto Condensed` |
| Section divider lines | `1px solid #222` (subtle, not `#666`) |
| Full-screen z-index | `9999` |

Section headers (e.g. "FORECAST", "DEPARTURE TIMES", "SOLCELLER") all use the
same style: 14px uppercase Roboto Condensed at `#999` grey. Individual modules
may tint their header a brand colour (e.g. solar uses `#7ab648` green).

Do **not** introduce cool blues, hard whites, or neon colours on the mirror UI.

## Design language — mobile remotes

Companion web pages served from modules (e.g. `/receptbok/remote`) use a
warm cream phone theme instead:

| Token | Value |
|-------|-------|
| Background | `#FAF7F2` |
| Header gradient | `#d4a574` → `#8b5e3c` |
| Body text | `#4a4a4a` |
| Accent | `#8b5e3c` |

## Frontend JS conventions

MagicMirror runs on Electron. Module frontend code uses **ES5** style
(`var`, no arrow functions, no `class`, no template literals) for
compatibility with older Electron versions.

## Config

Active config: `config/config.js`. Backups: `config/config.js.ORG*`.
The `config.js.InfoCentral` snapshot captures the MMM-InfoCentral era
(before it was renamed to MMM-Receptbok).

## Solar production data

`MMM-SolarProduction` scrapes building solar data from a Cloud Functions
endpoint (HTML, not JSON). The endpoint is public and requires no auth:
`https://europe-west1-mandeln-solceller.cloudfunctions.net/solproduktion`

Data is parsed with regex (no cheerio dependency). The module stores its
own rolling 72h readings in `modules/MMM-SolarProduction/solar_data.json`.
The graph reuses Chart.js already loaded by the weather module.

The source HTML changed in October 2026 from `production-value` table cells to
labeled `value` rows. The parser supports both formats. It also parses the
embedded `labels` and `dataValues` arrays to backfill today's intraday curve.
The endpoint publishes only today's power curve, so missing curves from prior
days cannot be reconstructed after an outage. Parse and fetch failures send
cached data instead of leaving the frontend at "Waiting for solar data...".

The summary beneath the chart is intentionally one compact row containing
Today, Yesterday, and the latest three monthly totals. Monthly entries must be
sorted from their Swedish or English month/year labels rather than relying on
the insertion order in `monthly_data.json`.

## Monitoring and administration

`MMM-Monitoring` is an invisible module configured in `config/config.js`. It
samples the Pi once per minute and retains seven days in
`modules/MMM-Monitoring/monitoring-history.jsonl` (ignored by Git).

LAN pages:

- Statistics: `http://192.168.1.208:8080/MMM-Monitoring/statistics.html`
- Admin: `http://192.168.1.208:8080/MMM-Monitoring/admin.html`

The statistics API reports CPU temperature/utilisation, RAM, load, disk,
uptime, and MagicMirror process-tree RSS/swap. The admin API supports an LCD
power-button pulse, MagicMirror restart, Pi reboot, and Pi shutdown. Admin
commands are restricted to private-network clients; reboot, shutdown, and LCD
toggle also require browser confirmation.

This mirror currently has no fan (show as not installed, no controls until
fitted). A small mono speaker is connected to the LCD controller board and is
fed by the Pi's **HDMI audio, right channel only** (verified by ear: left test
silent, right test audible). Play via ALSA device `hdmi:CARD=vc4hdmi,DEV=0`
(`plughw:1,0` fails: HDMI only accepts IEC958). `MMM-Monitoring/audio.js` is the
shared helper: it renders sounds mono-to-right, applies software volume
(0-100, quadratic, default 25 ~ 4% full scale, stored in git-ignored
`audio-settings.json`) and spawns `aplay`. The admin page has a volume slider
and test-tone button (`set-volume` / `speaker-test` actions). `MMM-Receptbok`
plays the `alarm` pattern when a timer finishes and stops it when the done
overlay is dismissed or a timer is cancelled/started. Keep volume low when
testing - the family sleeps nearby. The implementation is based on the monitoring pages in the
local `MMEntrance` repository, but arcade, PIR, GTFS, fan, and audio telemetry
were deliberately not copied because they do not exist on this mirror.

## Gotchas

- Receptbok uses emoji (⏱ ⏰ 🍽 💡). Raspberry Pi OS has no emoji font by default;
  `fonts-noto-color-emoji` was installed on the Pi (Nov 2026). If emoji show as
  squares after a reinstall, reinstall it and restart MagicMirror (Electron
  only loads fonts at startup).
- `onoff` (GPIO npm package) throws on non-Pi systems. All modules that use
  it wrap `require("onoff")` in a try/catch so development on Windows works.
- Full-screen overlay modules use a persistent DOM wrapper with CSS class
  toggling — not DOM replacement — to avoid MagicMirror's re-render cycle
  interfering with CSS transitions.
- `MMM-Receptbok` and `MMM-PrepperPaputin` coordinate with
  `FULLSCREEN_OVERLAY_SHOW` and `RETURN_TO_STANDARD_VIEW`. Showing either closes
  the other; Recipe Return or Prepper Dölj must always restore the standard
  weather/calendar dashboard.
- The Prepper checklist is persisted in `modules/MMM-PrepperPaputin/items.json`.
  The Pi copy is authoritative after edits through the mobile remote, so copy it
  back before committing a backup.
- Avoid inline mobile handlers named `command`; modern button elements expose a
  `command` property that can shadow the function. Bind click listeners with
  `addEventListener`, and serve editable remotes with `Cache-Control: no-store`.
- `AGENTS.md` at the repo root says: do not create explainer documents or
  other documentation unless specifically asked to.
- Chart.js (`chart.min.js` + date adapter) is loaded globally by
  MMM-OpenWeatherForecast. Other modules (like MMM-SolarProduction) can
  use it without bundling their own copy.
- MagicMirror takes ~15-20 seconds to restart via `pm2 restart`. The HTTP
  server at :8080 refuses connections during this window.
- Module-to-module spacing in the same region is controlled by the framework's
  `.module` wrapper. Use negative `margin-top` in `css/custom.css` to tighten
  gaps (e.g. `.MMM-SolarProduction { margin-top: -25px !important; }`).
- The "Powered by OpenWeather" attribution was removed from the weather
  template (`mmm-openweather-forecast.njk` line 525).
