# GitHub Repository Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the MagicMirror project to a clean two-repo GitHub structure — public `MagicMirror-home` (all modules + template config) and private `MagicMirror-secrets` (real config with credentials) — without ever exposing secrets.

**Architecture:** The public repo contains everything needed to understand and replicate the setup, with secrets replaced by named placeholders. A separate private repo holds only `config/config.js` (the real file). On the Pi, a symlink makes MagicMirror read the real config transparently. The 4 existing standalone module repos on GitHub are archived with a pointer to the new home.

**Tech Stack:** Git, GitHub CLI (`gh`), bash/scp for Pi deploy

## Global Constraints

- `config/config.js` must NEVER be committed to the public repo — `.gitignore` is the safety net
- `config/config.js.InfoCentral` must NEVER be committed to the public repo — contains personal calendar URLs
- All secrets replaced with ALL_CAPS named placeholders in the template
- Pi host: `pi@192.168.1.208`, MM path: `/home/pi/MagicMirror`
- Pi setup steps (Task 6) require Pi network access — skip until Pi is reachable
- `modules/MMM-Receptbok/images/Brod.png` is a real asset — must NOT be excluded by `*.png`

---

## File Map

| File | Action | Notes |
|------|--------|-------|
| `.gitignore` | Modify | Add secrets, runtime data, junk exclusions |
| `config/config.js.template` | Create | Copy of real config with secrets replaced |
| `modules/MMM-SolarProduction/temp.png` | Delete | Debug artifact accidentally committed |
| `docs/superpowers/plans/this-file.md` | Create | This plan |

---

## Task 1: Harden .gitignore

**Files:**
- Modify: `.gitignore`

**Goal:** Ensure no secrets or junk files can ever be accidentally committed to the public repo. This must be done before any push to GitHub.

- [ ] **Step 1: Replace .gitignore with hardened version**

The current `.gitignore` only contains `.worktrees/`. Replace the entire file:

```
# Secrets — NEVER commit these
config/config.js
config/config.js.InfoCentral
config/config.js.ORG*
config/configNOPASS.js

# Runtime data files
modules/MMM-SolarProduction/solar_data.json
modules/MMM-OpenWeatherForecast/weather_data.json

# Node dependencies
node_modules/

# Logs and debug artifacts
*.log
*.stackdump
mm_monitor.log

# Debug screenshots (but NOT real module image assets)
temp*.png
verify-*.png
modules/MMM-SolarProduction/.playwright-mcp/

# IDE and tool state
.claude/
.superpowers/
.idea/
.worktrees/
```

Note: Using `temp*.png` and `verify-*.png` patterns instead of `*.png` to protect `modules/MMM-Receptbok/images/Brod.png`.

- [ ] **Step 2: Verify secrets are excluded**

```bash
git check-ignore -v config/config.js
git check-ignore -v config/config.js.InfoCentral
git check-ignore -v config/config.js.ORG
```

Each should print a line showing it is ignored. If any print nothing, the pattern is wrong — fix before continuing.

- [ ] **Step 3: Stage the unstaged MMM-SolarProduction.js change**

This file has local modifications from the rain/monthly stats work that were never staged:

```bash
git add modules/MMM-SolarProduction/MMM-SolarProduction.js
```

- [ ] **Step 4: Remove temp.png that was accidentally committed**

```bash
git rm modules/MMM-SolarProduction/temp.png
```

- [ ] **Step 5: Commit everything together**

```bash
git add .gitignore
git commit -m "Harden .gitignore, stage solar module changes, remove temp.png artifact

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create config/config.js.template

**Files:**
- Create: `config/config.js.template`

**Goal:** Produce a template version of the real config that documents the full structure and all required values, with every secret replaced by a named placeholder. This is what the public repo tracks instead of the real file.

The known secrets in `config/config.js` are:
- Line 78: `realtimeappid` — SL Realtime API key
- Line 173: Outlook calendar `.ics` URL
- Line 179: InfoMentor calendar subscription URL
- Line 189: `apikey` — OpenWeather API key (marked `//SUPER SECRET`)
- Lines 190-191: `latitude` / `longitude` — home location

- [ ] **Step 1: Copy real config to template**

```bash
cp config/config.js config/config.js.template
```

- [ ] **Step 2: Replace secrets with placeholders**

Open `config/config.js.template` and make these exact replacements:

| Find | Replace with |
|------|-------------|
| `realtimeappid: "f907bd2729d04a61bb0c5bac200321a1"` | `realtimeappid: "YOUR_SL_REALTIME_API_KEY"` |
| The full Outlook `.ics` URL string | `"YOUR_OUTLOOK_CALENDAR_ICS_URL"` |
| The full InfoMentor subscription URL string | `"YOUR_INFOMENTOR_ICAL_URL"` |
| `apikey: "d06ec7e147e33654fc993c7d566b3595"` | `apikey: "YOUR_OPENWEATHER_API_KEY"` |
| `latitude: 59.3118,` | `latitude: YOUR_LATITUDE,` |
| `longitude: 18.0663,` | `longitude: YOUR_LONGITUDE,` |

- [ ] **Step 3: Verify no secrets remain in the template**

```bash
grep -E "d06ec7e|f907bd2|outlook\.live\.com/owa/calendar/[a-f0-9-]{30}|im2-api\.infomentor|59\.3118|18\.0663" config/config.js.template
```

This must print nothing. If it prints any lines, a secret was missed — go back and fix.

- [ ] **Step 4: Verify the real config.js is still untouched**

```bash
grep "d06ec7e" config/config.js
```

Must still find the real key (confirms you edited only the template, not the live file).

- [ ] **Step 5: Commit**

```bash
git add config/config.js.template
git commit -m "Add config.js.template with secrets replaced by named placeholders

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create public MagicMirror-home on GitHub and push

**Files:** No local file changes — Git remote operations only.

**Goal:** Create the new `SWhardfish/MagicMirror-home` public repository on GitHub and push the local repo to it as the canonical remote.

- [ ] **Step 1: Create the public repo on GitHub**

```bash
gh repo create SWhardfish/MagicMirror-home \
  --public \
  --description "MagicMirror² home installation — custom modules, config template, deploy scripts" \
  --source=. \
  --remote=origin \
  --push
```

This creates the repo, sets it as `origin`, and pushes all commits in one step.

- [ ] **Step 2: Verify the push succeeded and secrets are absent**

```bash
gh repo view SWhardfish/MagicMirror-home --web
```

On the GitHub page, check:
- `config/` folder shows only `config.js.template` — no `config.js`
- `modules/` shows all 9 module folders
- No `.js.20260*` backup files visible

Also verify via CLI:
```bash
gh api repos/SWhardfish/MagicMirror-home/contents/config | grep '"name"'
```

Must list only `config.js.template`. If `config.js` appears, STOP — the `.gitignore` was not working correctly. Do not proceed until resolved.

- [ ] **Step 3: Set origin to MagicMirror-home for future pushes**

```bash
git remote -v
```

Should show `origin` pointing to `https://github.com/SWhardfish/MagicMirror-home.git`. If it still points to the old local path or another URL, update it:

```bash
git remote set-url origin https://github.com/SWhardfish/MagicMirror-home.git
```

---

## Task 4: Create private MagicMirror-secrets repo and push real config

**Files:** Handled in a separate temporary directory — not in the main working tree.

**Goal:** Create `SWhardfish/MagicMirror-secrets` as a private repo containing only the real `config.js` and `config.js.InfoCentral`.

- [ ] **Step 1: Create a temporary directory for the secrets repo**

```bash
mkdir -p /tmp/mm-secrets/config
cp "C:/Users/rylanda/PycharmProjects/MagicMirror/config/config.js" /tmp/mm-secrets/config/
cp "C:/Users/rylanda/PycharmProjects/MagicMirror/config/config.js.InfoCentral" /tmp/mm-secrets/config/
```

- [ ] **Step 2: Write a README for the secrets repo**

Create `/tmp/mm-secrets/README.md`:

```markdown
# MagicMirror-secrets

Private companion to [MagicMirror-home](https://github.com/SWhardfish/MagicMirror-home).

Contains the real `config/config.js` with live API keys and calendar URLs.

## Pi setup

After cloning MagicMirror-home, clone this repo alongside it and symlink:

    git clone https://github.com/SWhardfish/MagicMirror-secrets.git ~/MagicMirror-secrets
    ln -s ~/MagicMirror-secrets/config/config.js ~/MagicMirror/config/config.js

## Updating secrets

Edit `config/config.js` directly on the Pi, then push:

    cd ~/MagicMirror-secrets
    git add config/config.js
    git commit -m "update config"
    git push
```

- [ ] **Step 3: Initialise and push**

```bash
cd /tmp/mm-secrets
git init
git add .
git commit -m "Initial commit: real config with live credentials

Co-Authored-By: Claude <noreply@anthropic.com>"
gh repo create SWhardfish/MagicMirror-secrets \
  --private \
  --description "Private config for MagicMirror-home — real API keys and calendar URLs" \
  --source=. \
  --remote=origin \
  --push
```

- [ ] **Step 4: Verify repo is private and contains the right files**

```bash
gh repo view SWhardfish/MagicMirror-secrets
```

Check: visibility shows `private`. Then:

```bash
gh api repos/SWhardfish/MagicMirror-secrets/contents/config | grep '"name"'
```

Must list `config.js` and `config.js.InfoCentral`. Nothing else.

- [ ] **Step 5: Clean up temp directory**

```bash
rm -rf /tmp/mm-secrets
```

---

## Task 5: Archive the 4 old standalone module repos

**Goal:** Archive the 4 existing standalone module repos on GitHub so they remain browsable but clearly point to `MagicMirror-home` as the canonical location.

- [ ] **Step 1: Update description of each repo to point to MagicMirror-home**

```bash
gh repo edit SWhardfish/MMM-RestaurangTavla \
  --description "Archived — now part of github.com/SWhardfish/MagicMirror-home"

gh repo edit SWhardfish/MMM-SchoolLunch \
  --description "Archived — now part of github.com/SWhardfish/MagicMirror-home"

gh repo edit SWhardfish/MMM-SL \
  --description "Archived — now part of github.com/SWhardfish/MagicMirror-home"

gh repo edit SWhardfish/MMM-OpenWeatherForecast \
  --description "Archived — now part of github.com/SWhardfish/MagicMirror-home"
```

- [ ] **Step 2: Archive each repo**

```bash
gh repo archive SWhardfish/MMM-RestaurangTavla --yes
gh repo archive SWhardfish/MMM-SchoolLunch --yes
gh repo archive SWhardfish/MMM-SL --yes
gh repo archive SWhardfish/MMM-OpenWeatherForecast --yes
```

- [ ] **Step 3: Verify all 4 are archived**

```bash
gh repo list SWhardfish --limit 30 | grep -E "MMM-RestaurangTavla|MMM-SchoolLunch|MMM-SL|MMM-OpenWeatherForecast"
```

Each should show `archived` in the output.

---

## Task 6: Pi one-time setup (requires Pi network access)

**Goal:** Configure the Pi to use both repos — public for all module/script files, private for the real config via symlink.

**Prerequisite:** Pi must be reachable at `192.168.1.208`. Skip this task until then.

- [ ] **Step 1: Verify Pi is reachable**

```bash
ssh pi@192.168.1.208 "echo Pi is reachable"
```

If this times out, skip this task entirely and revisit when back on the home network.

- [ ] **Step 2: Back up the current Pi MagicMirror directory**

```bash
ssh pi@192.168.1.208 "cp -r /home/pi/MagicMirror /home/pi/MagicMirror.bak.$(date +%Y%m%d)"
```

- [ ] **Step 3: Clone MagicMirror-home onto the Pi**

The Pi currently has an existing MagicMirror directory. Replace it with the new repo:

```bash
ssh pi@192.168.1.208 "
  pm2 stop MagicMirror &&
  mv /home/pi/MagicMirror /home/pi/MagicMirror.old &&
  git clone https://github.com/SWhardfish/MagicMirror-home.git /home/pi/MagicMirror
"
```

- [ ] **Step 4: Clone MagicMirror-secrets and symlink config**

```bash
ssh pi@192.168.1.208 "
  git clone https://github.com/SWhardfish/MagicMirror-secrets.git /home/pi/MagicMirror-secrets &&
  ln -s /home/pi/MagicMirror-secrets/config/config.js /home/pi/MagicMirror/config/config.js
"
```

- [ ] **Step 5: Verify the symlink resolves correctly**

```bash
ssh pi@192.168.1.208 "ls -la /home/pi/MagicMirror/config/ && cat /home/pi/MagicMirror/config/config.js | head -5"
```

Should show `config.js -> /home/pi/MagicMirror-secrets/config/config.js` and print the first lines of the real config.

- [ ] **Step 6: Install module dependencies and restart**

```bash
ssh pi@192.168.1.208 "
  cd /home/pi/MagicMirror/modules/MMM-SolarProduction && npm install &&
  cd /home/pi/MagicMirror/modules/MMM-LCDScheduler && npm install &&
  cd /home/pi/MagicMirror/modules/MMM-Receptbok && npm install &&
  pm2 start MagicMirror
"
```

- [ ] **Step 7: Verify MagicMirror starts**

```bash
ssh pi@192.168.1.208 "pm2 status"
```

MagicMirror process should show `online`. Wait 20 seconds then check:

```bash
ssh pi@192.168.1.208 "pm2 logs MagicMirror --lines 20 --nostream"
```

No fatal errors should appear. If errors show, compare `/home/pi/MagicMirror.old` against the new clone to find missing files.

- [ ] **Step 8: Remove the old backup once confirmed working**

Only do this after the mirror is visually confirmed working:

```bash
ssh pi@192.168.1.208 "rm -rf /home/pi/MagicMirror.old"
```
