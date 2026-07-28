# MMM-LCDScheduler

A MagicMirror module for scheduling LCD on/off control via GPIO. This module silently runs in the background and executes GPIO pulses at specified times each day.

## Features

- **Silent operation** - Module is invisible and doesn't affect other modules on screen
- **Configurable schedule** - Set multiple on/off times per day
- **Daily recurrence** - Schedule repeats every day of the week
- **GPIO flexibility** - Configurable GPIO pin (default: GPIO 17)
- **Retry logic** - Automatically retries failed GPIO commands up to 3 times
- **Minimal logging** - Logs to MagicMirror logs with warnings/errors only on failure

## Installation

1. Navigate to your MagicMirror modules folder:
```bash
cd ~/MagicMirror/modules
```

2. Clone or copy the MMM-LCDScheduler folder into the modules directory.

3. Install dependencies:
```bash
cd MMM-LCDScheduler
npm install
```

## Configuration

Add the module to your `config/config.js` file:

```javascript
{
  module: "MMM-LCDScheduler",
  config: {
    gpioPin: 17,
    schedule: [
      { time: "06:30", action: "on" },
      { time: "23:30", action: "off" }
    ]
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gpioPin` | Integer | `17` | BCM GPIO pin number to control |
| `schedule` | Array | See below | Array of scheduled on/off actions |

### Schedule Format

Each schedule entry has the following format:

```javascript
{
  time: "HH:mm",      // Time in 24-hour format (e.g., "06:30", "23:30")
  action: "on|off"    // Action to execute: "on" or "off"
}
```

### Example Configurations

**Default (6:30 AM on, 11:30 PM off):**
```javascript
schedule: [
  { time: "06:30", action: "on" },
  { time: "23:30", action: "off" }
]
```

**Multiple times per day:**
```javascript
schedule: [
  { time: "06:00", action: "on" },
  { time: "12:00", action: "off" },
  { time: "18:00", action: "on" },
  { time: "23:00", action: "off" }
]
```

**Different schedule per day (manual approach):**
Create multiple module instances with different GPIO pins or use custom cron expressions (requires code modification).

## How It Works

1. When MagicMirror starts, the module initializes the scheduler with your configured GPIO pin and schedule.
2. At each scheduled time, the module spawns a subprocess that executes `gpio_pulse.py`.
3. The Python script controls the GPIO pin with a 0.5-second HIGH pulse followed by 0.1-second LOW settling time.
4. If the subprocess fails, it automatically retries up to 3 times with a 1-second delay between attempts.
5. All actions are logged minimally to MagicMirror logs (errors/warnings only).

## GPIO Control

The module uses `gpio_pulse.py` to execute GPIO control. The pulse sequence is:
- Set GPIO pin to HIGH for 0.5 seconds
- Set GPIO pin to LOW for 0.1 seconds
- Clean up GPIO resources

This pulse sequence simulates pressing a button for 0.5 seconds, which is suitable for controlling an LCD power button via MOSFET.

## Troubleshooting

**GPIO command fails:**
- Ensure the script is running with appropriate permissions (sudo or GPIO group membership)
- Check that the GPIO pin number is correct
- Verify the Python `RPi.GPIO` module is installed

**Module not executing actions:**
- Check MagicMirror logs for errors: `pm2 logs`
- Verify the schedule times are in correct 24-hour format
- Ensure `node-schedule` is installed: `cd MMM-LCDScheduler && npm install`

**Permission errors:**
- Run MagicMirror with appropriate permissions or add the user to the GPIO group:
```bash
sudo usermod -a -G gpio pi
```

## License

MIT

## Author

Created for MagicMirror LCD scheduling and control
