# MMM-Receptbok

A MagicMirror² module for displaying kitchen recipes on a portrait display. Recipes are stored as JSON files and rendered with paginated ingredients and steps. Control is via GPIO buttons, HTTP endpoints, or the built-in web remote.

MIT Licensed

---

## Features

- Displays JSON recipes with title, prep/total time, servings, ingredients, steps, and tips
- Automatic pagination for portrait screens (configurable steps per page)
- GPIO button control: Next recipe/page (Button A) and Return to main screen (Button B)
- HTTP endpoints for remote control, recipe management, and home automation
- Web-based remote control UI with browse, search, tag filter, add, edit, and delete
- Server-side countdown timers — survive phone sleep, browser closure, and disconnects
- Timer bar at bottom of display showing all active/completed timers
- Full-screen "Timer färdig!" overlay when a timer completes (auto-dismisses after 10s)
- Optional WS2812/NeoPixel LED flash on timer completion (GPIO 18)
- Auto-return to main screen after 1 hour (configurable)
- Works on non-Pi systems — GPIO failure is handled gracefully

---

## Installation

```bash
cd ~/MagicMirror/modules/MMM-Receptbok
npm install
```

Add to `~/MagicMirror/config/config.js`:

```javascript
{
  module: "MMM-Receptbok",
  position: "fullscreen_below",
  config: {
    gpioButtonNext: 17,
    gpioButtonReturn: 27
  }
}
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gpioButtonNext` | number | `17` | GPIO pin for Next button |
| `gpioButtonReturn` | number | `27` | GPIO pin for Return button |
| `autoReturnHours` | number | `1` | Auto-return after X hours (0 = disabled) |
| `animationSpeed` | number | `500` | Fade transition speed in ms |
| `stepsPerPage` | number | `6` | Max recipe steps shown per page |

---

## Adding Recipes

Place `.json` recipe files in `modules/MMM-Receptbok/recipes/`. See `RECIPE_FORMAT.md` for the full schema and formatting rules, including a worked example.

Recipes can also be added, edited, and deleted through the web remote UI at:
```
http://<pi-ip>:8080/receptbok/remote
```

---

## GPIO Wiring (Raspberry Pi)

Default pins: GPIO 17 (Next) and GPIO 27 (Return).

```
Button A (Next) — GPIO 17, Pin 11:
  GPIO 17 (Pin 11) ──[Button]── GND (Pin 6/9/14/20/30/34/39)

Button B (Return) — GPIO 27, Pin 13:
  GPIO 27 (Pin 13) ──[Button]── GND
```

A 10 kΩ pull-up resistor from GPIO to 3.3V is optional but recommended for reliability.

**RPi GPIO quick reference:**
```
+3V3   1 |  2  +5V
       3 |  4  +5V
       5 |  6  GND
       7 |  8  GPIO14
GND    9 | 10  GPIO15
GPIO17 11| 12  GPIO18
GPIO27 13| 14  GND
GPIO22 15| 16  GPIO23
+3V3  17 | 18  GPIO24
      ...
GND   25 | 26  GPIO7
      ...
GND   39 | 40  GPIO21
```

To use different pins, update `gpioButtonNext` and `gpioButtonReturn` in `config.js`.

**GPIO permissions:**
```bash
sudo usermod -a -G gpio $USER
sudo reboot
```

---

## HTTP Endpoints

All endpoints accept requests at `http://<pi-ip>:8080`. GET endpoints return JSON.

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/receptbok/button/next` | Simulate Next button |
| GET | `/receptbok/button/return` | Simulate Return button |
| GET | `/receptbok/recipes` | List all recipes (summary) |
| GET | `/receptbok/recipes/:id` | Get full recipe by id |
| GET | `/receptbok/tags` | Tag counts across all recipes |
| POST | `/receptbok/show/:id` | Display a recipe on the mirror |
| POST | `/receptbok/save` | Save/overwrite a recipe (JSON body) |
| DELETE | `/receptbok/delete/:id` | Delete a recipe by id |
| POST | `/receptbok/timer/start` | Start a timer (`{"label":"...", "minutes":N}`) |
| POST | `/receptbok/timer/cancel` | Cancel a timer (`{"label":"..."}`) |
| GET | `/receptbok/timer/state` | Get all active timer states |
| GET | `/receptbok/remote` | Open the web remote UI |

**Quick test:**
```bash
# Linux / Raspberry Pi
curl http://<pi-ip>:8080/receptbok/button/next

# Windows PowerShell
Invoke-WebRequest -Uri "http://localhost:8080/receptbok/button/next"
```

**Home Assistant:**
```yaml
rest_command:
  mm_next:
    url: "http://192.168.1.208:8080/receptbok/button/next"
    method: GET
  mm_return:
    url: "http://192.168.1.208:8080/receptbok/button/return"
    method: GET
```

**IP whitelist** — allow your local network in `config.js`:
```javascript
ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1", "192.168.1.0/24"]
```

---

## Web Remote Control

Open `http://<pi-ip>:8080/receptbok/remote` in any browser.

- **Browse tab** — search recipes, filter by tag, show on mirror, start/cancel timers, edit, or delete
- **Add Recipe tab** — form to create a new recipe with ingredient groups and steps
- **Active timers** — running timers shown at the top of the browse panel with live countdown
- **Bottom bar** — Next and Return buttons (keyboard: → / N and ← / B)

The remote can also be opened as a file: `modules/MMM-Receptbok/remote_control.html` (served relative to the mirror's origin, so the mirror must be running for API calls to work).

---

## Timer System

Timers are defined per-recipe in the `timers` JSON field:

```json
"timers": [
  { "label": "Första jäsning", "minutes": 30 },
  { "label": "Grädda", "minutes": 9 }
]
```

**How it works:**
- Countdown runs server-side in `node_helper.js` (Node.js `setInterval`), not on the phone
- Timers survive phone sleep, browser closure, app switching, and network disconnects
- The mobile remote sends start/cancel commands and polls state every 2 seconds
- Multiple timers can run simultaneously

**Mobile remote interaction:**
- Tap a timer button to start it
- Tap a running timer to cancel it
- Tap again to restart from the beginning

**On the mirror:**
- Active timers appear in a bar at the bottom of the recipe display
- When a timer reaches zero, a full-screen overlay ("Timer färdig!") appears and auto-dismisses after 10 seconds
- Completed timers remain in the bar showing "Färdig!" until dismissed
- The overlay can also be dismissed by pressing Next or Return

---

## WS2812 LED Alert (Optional)

The module includes a ready-to-use stub for WS2812/NeoPixel LEDs that flash when a timer finishes. The LEDs can be mounted behind the mirror frame to illuminate the wall around it.

### Wiring

```
WS2812 Strip     Raspberry Pi
───────────────────────────────
DATA  ──────────  GPIO 18 (Pin 12, PWM0)
GND   ──────────  GND (Pin 6/9/14/20/25)
5V    ──────────  5V rail (external PSU recommended for >8 LEDs)
```

**Note:** GPIO 18 outputs 3.3V logic. Most WS2812 strips tolerate this for short runs (<1m). For longer strips or reliability, use a 3.3V→5V level shifter on the data line.

### Setup

```bash
cd ~/MagicMirror/modules/MMM-Receptbok
npm install rpi-ws281x
```

Then uncomment the WS2812 block in `node_helper.js` inside `triggerLedAlert()`. The default configuration:

- 8 LEDs on GPIO 18
- Flashes red 3 times (400ms on/off cycle)
- Full brightness (255)

Adjust `NUM_LEDS`, colour (`0x00RRGGBB` format), flash count, and timing to taste.

**Permissions:** `rpi-ws281x` requires PWM access. If MagicMirror runs as a non-root user:
```bash
sudo setcap cap_sys_rawio+ep $(which node)
```

Or run MagicMirror with `sudo` (not recommended for production).

---

## Troubleshooting

**Module not loading**
- Check `pm2 logs mm` for errors
- Confirm `module: "MMM-Receptbok"` in `config.js`
- Verify folder is named exactly `MMM-Receptbok`

**No recipes displayed**
- Ensure `.json` files exist in `modules/MMM-Receptbok/recipes/`
- Check filenames match the `id` field inside each JSON file
- Look for parse errors in logs: `MMM-Receptbok: Failed to parse`

**GPIO buttons not working**
- Verify pin numbers match `gpioButtonNext` / `gpioButtonReturn` in config
- Confirm button is wired to GND (not +3.3V)
- Check GPIO permissions (see above)
- Test with `gpio readall`

**HTTP endpoints return 404**
- Confirm module is in `config.js` and MagicMirror has been restarted
- Check logs for `MMM-Receptbok: HTTP endpoints registered`

**Cannot connect to HTTP endpoints**
- Check `ipWhitelist` in `config.js` includes your device's IP
- Default port is `8080`
