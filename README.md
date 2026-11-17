# MagicMirror Home

Portrait MagicMirror installation for a family home, running on a Raspberry Pi at
`192.168.1.208`. The repository contains the MagicMirror application, custom
modules, shared styling, and a redacted configuration template.

## Custom Modules

| Module | Purpose |
|--------|---------|
| `MMM-Receptbok` | Full-screen recipe display and mobile remote |
| `MMM-PrepperPaputin` | Preparedness checklist and mobile editor |
| `MMM-RestaurangTavla` | Sodra Latin school lunch scraper |
| `MMM-SL` | Stockholm public transport departures |
| `MMM-BusAlert` | Public transport alert overlay |
| `MMM-LCDScheduler` | Scheduled LCD power-button pulses over GPIO |
| `MMM-OpenWeatherForecast` | Weather forecast and temperature graph |
| `MMM-SolarProduction` | Solar power curve, daily production, and monthly totals |
| `MMM-Monitoring` | Host telemetry, history, and LAN administration pages |
| `MMM-Images` | Rotating image display |

## Monitoring

`MMM-Monitoring` is an invisible background module that records one sample per
minute and retains seven days of history in
`modules/MMM-Monitoring/monitoring-history.jsonl`.

Pages on the home network:

- Statistics: `http://192.168.1.208:8080/MMM-Monitoring/statistics.html`
- Administration: `http://192.168.1.208:8080/MMM-Monitoring/admin.html`

Statistics include CPU temperature and utilisation, RAM, load, disk use,
uptime, and aggregate RSS/swap for the MagicMirror process tree. The admin page
provides an LCD power-button pulse, MagicMirror restart, Pi reboot, and Pi
shutdown. Admin commands accept private-network clients only, and destructive
commands require browser confirmation.

The fan is not installed yet and is reported as unavailable. A small speaker is
connected to the right channel of the Pi's HDMI audio. The admin page has a
volume slider and test tone, and `MMM-Receptbok` plays an alarm when a timer
finishes.

## Solar Production

`MMM-SolarProduction` parses the public HTML endpoint at:

`https://europe-west1-mandeln-solceller.cloudfunctions.net/solproduktion`

The source exposes current values, recent daily and monthly totals, and today's
intraday power samples. The module backfills today's curve from those samples
and maintains a rolling 72-hour cache locally. Older intraday curves cannot be
reconstructed after an outage because the source only publishes the current
day. The display places Today, Yesterday, and the latest three monthly totals on
one compact row beneath the chart.

## Configuration

The tracked `config/config.js.template` contains the module layout with secrets
replaced by placeholders. The active `config/config.js` is intentionally ignored
and must include the invisible monitoring module:

```js
{
  module: "MMM-Monitoring"
}
```

## Deployment

Deploy changed files to `/home/pi/MagicMirror`, then restart the PM2 process:

```sh
scp <local-file> pi@192.168.1.208:/home/pi/MagicMirror/<relative-path>
ssh pi@192.168.1.208 "pm2 restart MagicMirror"
```

MagicMirror normally takes 15-20 seconds to restart. Check it with:

```sh
ssh pi@192.168.1.208 "pm2 status MagicMirror"
```

The active configuration can be validated before a restart with:

```sh
ssh pi@192.168.1.208 "cd /home/pi/MagicMirror && npm run config:check"
```

Runtime data, credentials, generated images, and dependencies are excluded by
`.gitignore`.
