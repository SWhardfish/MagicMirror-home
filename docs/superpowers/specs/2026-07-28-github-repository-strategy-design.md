# GitHub Repository Strategy — MagicMirror Home

**Date:** 2026-07-28
**Status:** Approved

## Goal

Establish a secure, maintainable GitHub presence for the full MagicMirror home
installation: all custom modules, configuration, and deploy scripts — without
exposing any secrets (API keys, calendar URLs, credentials) publicly.

---

## Repository Structure

### Public: `SWhardfish/MagicMirror-home`

Contains everything needed to understand, replicate, and run the setup — with
secrets replaced by placeholders.

```
MagicMirror-home/
├── config/
│   └── config.js.template        # real config structure, placeholders for secrets
├── modules/
│   ├── MMM-Receptbok/
│   ├── MMM-BusAlert/
│   ├── MMM-LCDScheduler/
│   ├── MMM-OpenWeatherForecast/
│   ├── MMM-SolarProduction/
│   ├── MMM-RestaurangTavla/
│   ├── MMM-SL/
│   ├── MMM-SchoolLunch/
│   └── MMM-Images/
├── css/                          # global custom.css overrides
├── deploy_files.bat
├── deploy_to_pi.bat
├── monitor_mm.sh
├── CLAUDE.md
├── .gitignore
└── README.md
```

### Private: `SWhardfish/MagicMirror-secrets`

Contains only the real config files with live credentials. Almost never changes.

```
MagicMirror-secrets/
├── config/
│   ├── config.js                 # live config with real API keys and URLs
│   └── config.js.InfoCentral     # historical snapshot (contains calendar URLs)
└── README.md                     # instructions: clone alongside MagicMirror-home
```

---

## .gitignore (public repo)

The following are excluded from `MagicMirror-home` to prevent accidental secret exposure:

```
config/config.js
config/config.js.InfoCentral
config/config.js.ORG*
config/configNOPASS.js
node_modules/
solar_data.json
weather_data.json
*.log
*.stackdump
*.png
.claude/
.superpowers/
.idea/
mm_monitor.log
```

---

## Pi Deploy Workflow

### One-time setup on the Pi

```bash
cd /home/pi
git clone https://github.com/SWhardfish/MagicMirror-home.git MagicMirror
git clone https://github.com/SWhardfish/MagicMirror-secrets.git MagicMirror-secrets
ln -s /home/pi/MagicMirror-secrets/config/config.js /home/pi/MagicMirror/config/config.js
```

The symlink means MagicMirror reads the real `config.js` from the secrets repo.
The public repo never contains or touches the real config file.

### Day-to-day (module or script change)

```bash
# On Pi — pull latest and restart
ssh pi@192.168.1.208 "cd /home/pi/MagicMirror && git pull && pm2 restart MagicMirror"
```

### When secrets change (new API key, rotated credential)

```bash
# Edit on Pi directly, then commit and push from Pi
ssh pi@192.168.1.208 "cd /home/pi/MagicMirror-secrets && git add config/config.js && git commit -m 'update config' && git push"
```

---

## Migration Plan

### Step 1 — Harden .gitignore locally
Add all entries listed above before any push.

### Step 2 — Create config/config.js.template
Copy real `config.js`, replace every secret with a named placeholder:
- `"YOUR_OPENWEATHER_API_KEY"`
- `"YOUR_GOOGLE_CALENDAR_ICAL_URL"`
- `"YOUR_INFOMENTOR_ICAL_URL"`
- etc.

### Step 3 — Push local repo to MagicMirror-home
The existing local repo becomes `MagicMirror-home`. Add the new GitHub remote
and push. The large staged cleanup batch (deleting old docs, backup files,
MMM-InfoCentral) becomes the clean first commit.

### Step 4 — Create MagicMirror-secrets (private)
New private GitHub repo. Push `config/config.js` and `config.js.InfoCentral`
into it. Nothing else.

### Step 5 — Archive the 4 old standalone module repos
For each repo below, go to **GitHub → Settings → Danger Zone → Archive repository**
and add a description note pointing to `MagicMirror-home`:

- `SWhardfish/MMM-RestaurangTavla`
- `SWhardfish/MMM-SchoolLunch`
- `SWhardfish/MMM-SL`
- `SWhardfish/MMM-OpenWeatherForecast`

Archived repos remain fully browsable. Forks and existing links continue to work.

### Step 6 — Pi setup
When Pi access is available, run the one-time setup commands above.

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| One public monorepo over separate module repos | Consistency; easier to track "what's running on the mirror" |
| Symlink for config.js on Pi | Decouples the two repos cleanly; MagicMirror needs no changes |
| Archive old repos rather than delete | Preserves history, forks, and incoming links |
| config.js.InfoCentral goes to private repo | Contains personal calendar subscription URLs |
| No git submodules | Overkill for a home project; adds friction with no real benefit |
