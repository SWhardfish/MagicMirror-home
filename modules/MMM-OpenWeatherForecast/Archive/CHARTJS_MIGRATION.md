# Chart.js Temperature Graph Migration

## Overview

The temperature graph has been migrated from Python/matplotlib to Chart.js for dramatically improved performance on Raspberry Pi devices.

## Performance Improvements

- **Before (Python/matplotlib)**: 
  - 2+ minute timeouts on Pi 3A+
  - Heavy CPU/memory usage (numpy, scipy, matplotlib)
  - Process spawning overhead
  - Continuous failures and retries

- **After (Chart.js)**:
  - ~10-50ms render time
  - Pure client-side JavaScript (no Python processes)
  - Smooth, responsive updates
  - No timeouts or failures

## Configuration

Add these settings to your MMM-OpenWeatherForecast config:

```javascript
{
  module: "MMM-OpenWeatherForecast",
  config: {
    // ... other settings ...
    
    showTemperatureGraph: true,           // Enable/disable graph
    graphEngine: "chartjs",               // "chartjs" or "python"
    graphUpdateInterval: 15               // Minutes between updates
  }
}
```

## Graph Engine Options

### Chart.js (Recommended)
- **Pros**: Lightweight, fast, no Python dependencies, responsive
- **Cons**: Requires Chart.js library (included)
- **Use case**: Default for all Raspberry Pi installations

### Python (Legacy)
- **Pros**: High-quality matplotlib rendering with scipy smoothing
- **Cons**: Very slow on Pi 3A+, requires Python dependencies
- **Use case**: Backup option or for more powerful hardware

## Visual Consistency

The Chart.js implementation maintains the exact visual appearance:
- ✅ Salmon (#FA8072) line color
- ✅ Black background
- ✅ White grid lines (dotted)
- ✅ Day separator lines at midnight
- ✅ Day labels (Sun, Mon, Tue, etc.) at 0.25 opacity
- ✅ Temperature axis with °C formatting
- ✅ Hour labels at 0, 6, 12, 18
- ✅ 72-hour time range
- ✅ Smooth curve interpolation

## Files Modified

1. **MMM-OpenWeatherForecast.js**
   - Added Chart.js library loading
   - Added `renderTemperatureChart()` function
   - Added graph engine configuration
   - Added throttling for 15-minute update intervals

2. **node_helper.js**
   - Added graph data request handler
   - Made Python graph generation conditional
   - Sends JSON data to frontend for Chart.js

3. **mmm-openweather-forecast.njk**
   - Added conditional rendering (canvas vs img)
   - Canvas element for Chart.js
   - Image elements for Python mode

4. **config.js**
   - Added `graphEngine: "chartjs"`
   - Added `graphUpdateInterval: 15`
   - Added `showTemperatureGraph: true`

## Data Granularity

- All data points from weather_data.json are rendered (no sampling)
- Typical: ~288 data points for 72 hours (one per 10-15 minutes)
- Chart.js handles this efficiently with point radius = 0

## Switching Between Engines

To switch back to Python matplotlib:
```javascript
graphEngine: "python"
```

To disable graph completely:
```javascript
showTemperatureGraph: false
```

## Troubleshooting

**Graph not showing?**
- Check browser console for errors
- Verify chart.min.js is in module directory
- Ensure weather_data.json has data

**Graph looks different?**
- Check timezone settings
- Verify data is being saved to weather_data.json
- Check graphUpdateInterval throttling

**Performance still slow?**
- Verify graphEngine is set to "chartjs"
- Check that Python processes are not spawning
- Monitor browser console for update frequency

## Technical Details

- **Chart.js version**: 4.4.1 (UMD build)
- **Canvas size**: 320px × 115px
- **Update throttle**: 15 minutes (configurable)
- **Data source**: weather_data.json (shared with Python)
- **Security**: Locally bundled (no CDN dependencies)
- **Kiosk mode**: Fully compatible

