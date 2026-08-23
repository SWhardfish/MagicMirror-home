# MMM-SolarProduction Design Spec

## Summary

Standalone MagicMirror module that scrapes solar panel production data from the building's Cloud Functions endpoint, stores 72-hour rolling power readings locally, and displays a Chart.js line graph with summary stats.

## Data Source

- URL: `https://europe-west1-mandeln-solceller.cloudfunctions.net/solproduktion`
- Format: Server-rendered HTML
- Update frequency: Every 20 minutes
- Fields extracted:
  - Current power (kW)
  - Capacity percentage (%)
  - Today's production (kWh)
  - Previous days' production (kWh, up to 3 days)
  - Monthly summaries (kWh, up to 3 months)
  - Last contact timestamp

## Architecture

```
modules/MMM-SolarProduction/
  ├── MMM-SolarProduction.js   (frontend: Chart.js graph + stats display)
  ├── MMM-SolarProduction.css  (minimal styling)
  ├── node_helper.js           (data fetching + HTML parsing + storage)
  ├── solar_data.json          (rolling 72h power readings, auto-created)
  └── package.json             (axios dependency)
```

## Visual Design

- Position: `top_right`, directly after MMM-OpenWeatherForecast in config
- Line color: `#7ab648` (soft green — "green electricity")
- Line weight: 0.8px, no fill, tension 0.4 (smooth curve)
- Graph height: 80px, black background
- Grid: grey dotted horizontal, white dotted day separators at midnight
- Day labels: 3-letter day names centered in each segment, 20% white opacity
- X-axis: hour labels at 0, 6, 12, 18
- Y-axis: auto-scaled kW labels
- Header row: terracotta "SOLCELLER" label (left) + current kW + percentage (right)
- Footer row: Today / Yesterday / Month totals
- Total vertical footprint: ~115px

## Data Flow

1. node_helper fetches endpoint HTML every 20 minutes
2. Parses with regex: `<span class="production-value">(\d+\.?\d*)</span>`
3. Appends `{dt: unix_timestamp, power_kw: float}` to solar_data.json
4. Trims entries older than 72 hours
5. Sends full payload (readings array + current stats) to frontend via socket
6. Frontend renders/updates Chart.js graph and stats text

## Data Storage Format (solar_data.json)

```json
[
  {"dt": 1779546000, "power_kw": 16.5},
  {"dt": 1779547200, "power_kw": 18.2},
  ...
]
```

## Config Schema

```js
{
  module: "MMM-SolarProduction",
  position: "top_right",
  header: "",
  config: {
    updateInterval: 20,        // minutes
    dataUrl: "https://europe-west1-mandeln-solceller.cloudfunctions.net/solproduktion",
    graphHours: 72,            // time range
    lineColor: "#7ab648",      // graph line color
  }
}
```

## Error Handling

- Fetch failure: log warning, retain last known data, retry on next interval
- Parse failure: log warning, skip this reading
- Empty data file: frontend shows "Väntar på data..." placeholder
- No dependencies beyond axios (already used by other modules)

## Chart.js Reuse

The weather module globally loads `chart.min.js` and `chartjs-adapter-date-fns.bundle.min.js`. This module reuses those — no need to bundle its own copy.
