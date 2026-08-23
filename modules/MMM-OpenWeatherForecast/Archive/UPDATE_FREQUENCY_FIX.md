# GRAPH UPDATE FREQUENCY FIX

## The Problem

The graph was updating **twice within 20-30 seconds**, causing unnecessary visual refreshes:

```
15:25:25 - Graph data sent (413 entries)
15:34:55 - Graph data sent (414 entries)  ← 10 min later (expected)
15:35:15 - Graph data sent (415 entries)  ← 20 sec later (unexpected!)
15:44:55 - Graph data sent (415 entries)  ← 10 min later (expected)
15:45:14 - Graph data sent (416 entries)  ← 19 sec later (unexpected!)
```

**Pattern:** Every ~10 minutes, weather data updates, but then 18-20 seconds later, another update triggers.

## Root Cause

The weather module updates every 10 minutes (as configured):
```javascript
updateInterval: 10  // minutes
```

Each weather update triggers:
1. `updateDom()` call → DOM re-renders
2. Graph data request sent to node_helper
3. Graph data response received
4. Graph re-renders

**But why twice?**

Looking at the entry counts:
- Update 1: 414 entries
- Update 2 (20s later): **415 entries** (+1)

This suggests:
- The **OpenWeather API** returns hourly forecast data
- As time progresses, new hourly data points become available
- The API call at XX:X4:55 might get 414 entries
- The API call at XX:X5:15 (20 sec later) gets 415 entries (one new hour added)

**The issue:** The weather module polls every 10 minutes, and if the module instance refreshes or if there's a slight timing variation, two polls can happen within 20 seconds, each with slightly different data.

## The Solution

**Increased graph data request debounce from 5 seconds to 5 minutes.**

### Before (TOO FREQUENT):
```javascript
if (timeSinceLastRequest < 5000) {  // 5 seconds
  // Skip duplicate
}
```

**Problem:** 5 seconds is too short - allows updates 20 seconds apart to both trigger graph requests.

### After (APPROPRIATE):
```javascript
const minInterval = 5 * 60 * 1000; // 5 minutes

if (timeSinceLastRequest < minInterval) {
  console.log("Graph data request skipped (last request " + Math.round(timeSinceLastRequest / 1000) + "s ago, minimum interval is 5 min)");
}
```

**Benefit:** Graph will only update maximum **once every 5 minutes**, even if weather data updates more frequently.

## Why 5 Minutes Is Appropriate

### Weather Data Update Pattern:
- Weather data updates: **Every 10 minutes**
- OpenWeather API: Adds new hourly forecast points as time progresses
- Useful graph updates: **Every 5-10 minutes** is sufficient

### Graph Data Characteristics:
- Shows **72-hour forecast** (not real-time data)
- Hourly data points (not minute-by-minute)
- Temperature changes slowly over hours
- **No need to update more frequently than 5 minutes**

### User Experience:
- Before: Graph flickers/updates twice within 20 seconds (annoying)
- After: Graph updates smoothly once every 5-10 minutes (smooth)

## Expected Behavior After Fix

### Typical Update Cycle:

**T=0 (Initial load):**
```
Graph data request sent to node_helper
Graph data sent to frontend (413 entries)
Chart rendered with 413 data points
```

**T+10min (First weather update):**
```
Weather data updated
Graph data request sent to node_helper
Graph data sent to frontend (414 entries)
Chart rendered with 414 data points
```

**T+10min+20sec (Second weather update):**
```
Weather data updated
Graph data request skipped (last request 20s ago, minimum interval is 5 min)  ← SKIPPED!
```

**T+15min (Third weather update):**
```
Weather data updated
Graph data request sent to node_helper
Graph data sent to frontend (416 entries)
Chart rendered with 416 data points
```

## Server Log Comparison

### Before (ANNOYING):
```
15:34:55 - Graph data sent to frontend (414 entries)
15:35:15 - Graph data sent to frontend (415 entries)  ← Only 20 sec later!
15:44:55 - Graph data sent to frontend (415 entries)
15:45:14 - Graph data sent to frontend (416 entries)  ← Only 19 sec later!
```

### After (CLEAN):
```
15:34:55 - Graph data sent to frontend (414 entries)
15:35:15 - Graph data request skipped (last request 20s ago, minimum interval is 5 min)
15:44:55 - Graph data sent to frontend (416 entries)
15:45:14 - Graph data request skipped (last request 19s ago, minimum interval is 5 min)
15:54:55 - Graph data sent to frontend (418 entries)
```

**Result:** Graph updates once every ~10 minutes, skipping rapid duplicates.

## Files Modified

**Only one file:**
- `MMM-OpenWeatherForecast.js` - Lines 420-445 (changed 5s to 5min)

## Deployment

```bash
scp C:\Users\rylanda\PycharmProjects\MagicMirror\modules\MMM-OpenWeatherForecast\MMM-OpenWeatherForecast.js pi@raspberrypi:/home/pi/MagicMirror/modules/MMM-OpenWeatherForecast/

pm2 restart MagicMirror
```

## Verification

After restart, watch logs for 30-40 minutes:

### What You'll See:

✅ **Graph updates once every ~10 minutes** (weather update cycle)
✅ **Rapid duplicate updates are skipped** with log message
✅ **No more double updates within 20 seconds**
✅ **Clean, predictable update pattern**

### Server Logs:
```
[MMM-OpenWeatherForecast] Graph data sent to frontend (instance: module_5_MMM-OpenWeatherForecast, 420 entries)
[wait ~10 minutes]
[MMM-OpenWeatherForecast] Graph data request skipped (last request 20s ago, minimum interval is 5 min)
[wait ~10 minutes]
[MMM-OpenWeatherForecast] Graph data sent to frontend (instance: module_5_MMM-OpenWeatherForecast, 422 entries)
```

### Visual:
✅ Graph still updates regularly (every 5-10 min)
✅ No annoying double-refresh within seconds
✅ Smooth, stable display

## Configuration Note

If you want to change the graph update frequency, you can modify the `minInterval` value:

```javascript
const minInterval = 5 * 60 * 1000; // 5 minutes

// To change to 10 minutes:
const minInterval = 10 * 60 * 1000;

// To change to 3 minutes:
const minInterval = 3 * 60 * 1000;
```

**Recommended range:** 3-10 minutes
- Too short (< 3 min): Allows rapid duplicates
- Too long (> 10 min): Graph might miss some weather updates
- **Sweet spot: 5 minutes** - Balances freshness with stability

## Summary

**Problem:** Graph updated twice within 20 seconds (annoying visual flicker)

**Root Cause:** Weather data updates every 10 minutes, but slight timing variations caused double updates

**Solution:** Increased minimum interval from 5 seconds to 5 minutes

**Result:**
- ✅ Graph updates once every 5-10 minutes
- ✅ No more rapid double updates
- ✅ Clean, stable visual experience
- ✅ Still gets regular updates with weather data
- ✅ Reduced unnecessary processing

**This eliminates the annoying rapid refresh pattern!**

