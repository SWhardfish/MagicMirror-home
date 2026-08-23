# MMM-Restaurangtavla

A [MagicMirror²](https://magicmirror.builders/) module that displays today’s lunch menu from **Restaurangtavla** for Södrа Latin.

The module scrapes school lunch menus from the restaurangtavla.se platform. This module is a specialised fork of MMM-SchoolLunch designed to handle Single Page Applications (SPA) and CSRF security tokens.

![img.png](img.png)
---
## ✨ Features

* Automatically matches **current weekday**
* Optional **vegetarian line display**
* Configurable update interval (recommended: every 12 hours)
* Week-number validation (optional safety check)
* Same styling as MMM-SchoolLunch

# How It Works
Unlike standard scrapers, this module performs a two-step fetch:

1. Initial GET: Visits the site to retrieve a session cookie and a hidden __RequestVerificationToken.

2. AJAX POST: Sends a request to the ?handler=ShowMenus endpoint with the security token and the current week number (formatted as YYYY-Www) to get the actual menu data.

---

## Data Source

The module fetches data from:

```
https://sodralatin.restaurangtavla.se/index
```

This endpoint returns **server-rendered HTML**, not a JSON API. The `node_helper.js` therefore uses **HTML scraping** (Axios + Cheerio), not a REST API.

Each weekday on the page contains:

* One **normal meal** (first line)
* One **vegetarian meal** (second line)

---

## Installation

1. Navigate to your MagicMirror modules folder.

2. Clone this repository (or create a folder named MMM-RestaurangTavla).

3. Ensure `axios` and `cheerio` are installed in your MagicMirror environment.

```bash
cd ~/MagicMirror/modules
git clone https://github.com/SWhardfish/MMM-Restaurangtavla.git
cd MMM-Restaurangtavla
npm install
```

Dependencies:
* axios
* cheerio

---

## Configuration

Add to `config.js`:

```js
{
  module: "MMM-RestaurangTavla",
  position: "top_left",
  config: {
      title: "Södra Latin Lunch",
      symbol: "school",         // Font Awesome icon
      symbolColor: "#BE6F4E",   // Icon color
      showVegetarian: true,
      updateInterval: 3 * 60 * 60 * 1000, // 3 hours
      fallbackText: "No lunch available",
  }
}
```

### Config Options

| Option            | Default | Description                              |
| ----------------- | ------- | ---------------------------------------- |
| `updateInterval`  | 1 hour  | How often data is refreshed              |
| `showVegetarian`  | true    | Show vegetarian meal line                |
| `checkWeekNumber` | false   | Ensure webpage week matches current week |
| `debug`           | false   | Console logging for troubleshooting      |

---

### Important Scraper Information
To maintain the connection to Södra Latin, the node_helper.js uses these specific identifiers found in the site's source code:

Target URL: https://sodralatin.restaurangtavla.se/Index.

Menu Category ID: 1468 (Hardcoded in node_helper.js). This ID is specific to the "Meny" category at Södra Latin.

POST Data: The module automatically generates the Week string (e.g., 2026-W02) to ensure the menu stays current without manual updates.

## Week Number Validation

If `checkWeekNumber` is enabled:

* The helper extracts `VECKA XX` from the page
* Compares it to the current ISO week
* If mismatched, displays a warning instead of stale data

This prevents showing old menus during holidays or outages.

---

## Styling / Icons

The module reuses the global Magic Mirror:

```
custom.css
```

This module is designed to work with the CSS classes originally defined for MMM-SchoolLunch.
* .schoolLunchTitle for the header and icon.

* .schoolLunchItem for the main course.

* .schoolLunchVeg for the vegetarian option (colored green via custom.css).


If your fonts appear too large, ensure your custom.css includes the specific font-size overrides for these classes.

```json
/* === School Lunch module -> custom.css === */
.MMM-SchoolLunch {
  margin-bottom: 30px; /* spacing below lunch module */
}

.MMM-SchoolLunch .schoolLunchTitle {
  display: block !important;
  font-size: 16px !important;
  color: #fff;
  margin: 0 0 2px 0;
}

.MMM-SchoolLunch .schoolLunchItem {
  display: block !important;
  font-size: 14px !important;
  margin: 0 0 2px 0;
  color: #ccc;
}

.MMM-SchoolLunch .schoolLunchVeg {
  display: block !important;
  font-size: 14px !important;
  margin: 0 0 2px 0;
  color: #4CAF50 !important;
}

.MMM-SchoolLunch .schoolLunchTitle,
.MMM-SchoolLunch .schoolLunchItem,
.MMM-SchoolLunch .schoolLunchVeg {
  line-height: 1.1em;
}

```



No icon is required, but you may optionally add:

```
MMM-Restaurangtavla/icon.png
```

Icons are used only if you want to add a header or module identifier in the future.

---

## Notes

* This module **does not use an API** — it scrapes stable server HTML
* No headless browser required
* Safe for long update intervals (menu changes weekly)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
