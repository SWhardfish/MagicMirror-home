# MMM-LCDScheduler - Quick Start Guide

## Installation (30 seconds)

```bash
cd ~/MagicMirror/modules/MMM-LCDScheduler
npm install
pm2 restart mm
```

Check logs:
```bash
pm2 logs
```

You should see:
```
MMM-LCDScheduler: Module started
MMM-LCDScheduler: Scheduler initialized
```

## Done! 🎉

Your LCD will automatically:
- **Turn ON at 6:30 AM** (06:30)
- **Turn OFF at 11:30 PM** (23:30)

Every single day, no manual intervention needed.

## Want to Change the Schedule?

Edit `~/MagicMirror/config/config.js` and modify the `schedule` array:

```javascript
{
  module: "MMM-LCDScheduler",
  config: {
    gpioPin: 17,
    schedule: [
      { time: "07:00", action: "on" },    // Change to 7:00 AM
      { time: "22:00", action: "off" }    // Change to 10:00 PM
    ]
  }
}
```

Then restart: `pm2 restart mm`

## Want Multiple On/Off Times?

```javascript
schedule: [
  { time: "06:00", action: "on" },
  { time: "13:00", action: "off" },
  { time: "18:00", action: "on" },
  { time: "23:00", action: "off" }
]
```

## Using a Different GPIO Pin?

```javascript
gpioPin: 23  // Instead of 17
```

## Troubleshooting

**Module not running?**
- Check logs: `pm2 logs`
- Verify npm install completed: `ls ~/MagicMirror/modules/MMM-LCDScheduler/node_modules`

**GPIO command fails?**
- Ensure you're running MagicMirror with GPIO permissions
- Try manually: `python3 ~/MagicMirror/modules/MMM-LCDScheduler/gpio_pulse.py 17`

That's it! Your LCD scheduler is running silently in the background. 🎬
