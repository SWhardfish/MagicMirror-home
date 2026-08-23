/*
 * MagicMirror Module: MMM-BusAlert
 * Triggers WLED flashing when chosen buses are approaching
 * Author: Anders (enhanced by Copilot)
 */

/* global Module, Log */

Module.register("MMM-BusAlert", {
  defaults: {
    // Legacy single-IP still supported; prefer wledIPs for multiple devices
    wledIP: "192.168.1.250",
    wledIPs: [],                 // NEW: control more than one WLED at once
    activeWindows: [
      { start: "07:00", end: "09:00" },
      { start: "15:00", end: "23:00" }
    ],
    watchSites: []               // [{ id, direction, type, lines: { "2": {alertSeconds, color, effect, speedMin?, speedMax?, intensity, brightness}, ... } }]
  },

  start() {
    Log.info("MMM-BusAlert started");

    // --- timestamped logger
    this.ts = () => {
      const d = new Date();
      const pad = n => String(n).padStart(2, "0");
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    this.logTS = (...args) => console.log(`[${this.ts()}]`, ...args);
    this.errTS = (...args) => console.error(`[${this.ts()}]`, ...args);

    // key -> { lineCfg, siteId, lineNumber, directionCode, expected:Date, createdAt:Date, alertSeconds:number }
    this.activeAlerts = new Map();

    // per-second driver
    this.driverTimer = null;
    this.lastSentState = null; // avoid redundant POSTs
  },

  notificationReceived(notification, payload, sender) {
    if (notification === "SL_REALTIME_DATA" && payload?.Departures) {
      this.handleDepartures(payload.Departures);
    }
  },

  isInActiveWindow(now = new Date()) {
    const windows = (this.config.activeWindows && this.config.activeWindows.length)
      ? this.config.activeWindows
      : this.defaults.activeWindows;

    return windows.some(w => {
      const start = new Date();
      const [sh, sm] = w.start.split(":").map(Number);
      start.setHours(sh, sm, 0, 0);

      const end = new Date();
      const [eh, em] = w.end.split(":").map(Number);
      end.setHours(eh, em, 0, 0);

      return now >= start && now <= end;
    });
  },

  handleDepartures(departures) {
    const now = new Date();
    const inWindow = this.isInActiveWindow(now);

    departures.forEach(dep => {
      const depTime = new Date(dep.ExpectedDateTime);
      if (isNaN(depTime.getTime())) return;

      const diffSeconds = (depTime - now) / 1000;

      const watch = (this.config.watchSites || []).find(s =>
        String(s.id) === String(dep.SiteId) &&
        String(s.direction) === String(dep.DirectionCode)
      );
      if (!watch) return;

      const lineCfg = watch.lines?.[String(dep.LineNumber)];
      if (!lineCfg) return;

      const alertSecs = lineCfg.alertSeconds ?? 120;
      const key = `${dep.SiteId}-${dep.LineNumber}-${dep.DirectionCode}`;

      // If UI says "Nu" (or SL says ATSTOP), terminate immediately
      const display = (dep.Display || dep.countdown || "").toString().trim();
      const atStop = (dep.State || "").toString().toUpperCase() === "ATSTOP";
      if (display === "Nu" || atStop) {
        if (this.activeAlerts.has(key)) {
          this.logTS("BusAlert: clearing on 'Nu'", key, { display, atStop });
          this.activeAlerts.delete(key);
          this.updateDriver();
        }
        return; // don't (re)create an alert for a "Nu" row
      }

      // Within alert window: create/update alert
      if (inWindow && diffSeconds <= alertSecs && diffSeconds >= 0) {
        if (!this.activeAlerts.has(key)) {
          const expected = depTime;
          this.activeAlerts.set(key, {
            lineCfg,
            siteId: String(dep.SiteId),
            lineNumber: String(dep.LineNumber),
            directionCode: String(dep.DirectionCode),
            expected,
            createdAt: now,
            alertSeconds: alertSecs
          });
          this.logTS("BusAlert: Bus approaching!", key, `~${Math.round(diffSeconds)}s`);
          this.updateDriver();
        } else {
          // Update expected time if SL refines prediction
          const rec = this.activeAlerts.get(key);
          rec.expected = depTime;
        }
      }
    });

    this.cleanupAlerts();
  },

  cleanupAlerts() {
    const now = new Date();
    let changed = false;
    for (const [key, alert] of this.activeAlerts.entries()) {
      // Expire 15s after expected time in case a 'Nu' row was missed
      if (now.getTime() > (alert.expected.getTime() + 15000)) {
        this.logTS("BusAlert: Expired alert (post-expected)", key);
        this.activeAlerts.delete(key);
        changed = true;
      }
    }
    if (changed) this.updateDriver();
  },

  // --- per-second driver with ramped speed and minimal POSTs
  updateDriver() {
    if (this.driverTimer) clearInterval(this.driverTimer);
    if (this.activeAlerts.size === 0) {
      this.postWled(false);
      this.lastSentState = null;
      return;
    }
    // tick every second
    this.driverTimer = setInterval(() => this.tick(), 1000);
    // kick immediately
    this.tick();
  },

  computeSpeed(rec, now) {
    const { alertSeconds, lineCfg, expected } = rec;
    const secsLeft = Math.max(0, Math.round((expected.getTime() - now.getTime()) / 1000));
    const clamped = Math.max(0, Math.min(1, 1 - (secsLeft / alertSeconds))); // 0->1 over window
    const ease = (t) => t * t; // quadratic-in
    const t = ease(clamped);

    const minS = Number.isFinite(lineCfg?.speedMin) ? lineCfg.speedMin : 80;
    const maxS = Number.isFinite(lineCfg?.speedMax) ? lineCfg.speedMax : (lineCfg?.speed ?? 240);
    return Math.round(minS + (maxS - minS) * t);
  },

  pickVisual(now) {
    // Choose the closest ETA as the "primary" visual.
    // If multiple alerts exist, alternate color every 3s, keep speed from the closest.
    const recs = Array.from(this.activeAlerts.values());
    recs.sort((a, b) => (a.expected - now) - (b.expected - now));

    const primary = recs[0];
    const alt = recs[1];

    const colorFrom = (cfg) => (Array.isArray(cfg?.color) ? cfg.color : [255, 255, 255, 0]);
    const color = (alt && (Math.floor(now.getTime() / 1000) % 6) >= 3)
      ? colorFrom(alt.lineCfg)
      : colorFrom(primary.lineCfg);

    const fx  = primary.lineCfg?.effect     ?? 1;
    const ix  = primary.lineCfg?.intensity  ?? 128;
    const bri = primary.lineCfg?.brightness ?? 255;
    const sx  = this.computeSpeed(primary, now);

    return { fx, sx, ix, bri, color };
  },

  tick() {
    const now = new Date();
    this.cleanupAlerts();
    if (this.activeAlerts.size === 0) {
      if (this.driverTimer) clearInterval(this.driverTimer);
      this.driverTimer = null;
      this.postWled(false);
      this.lastSentState = null;
      return;
    }

    const visual = this.pickVisual(now);
    const state = {
      on: true,
      transition: 0, // crisp changes
      seg: [{ id: 0, on: true, fx: visual.fx, sx: visual.sx, ix: visual.ix, bri: visual.bri, col: [visual.color] }]
    };

    // Avoid redundant POSTs
    const key = JSON.stringify(state);
    if (key !== this.lastSentState) {
      this.lastSentState = key;
      this.postWled(true, state);
    }
  },

  postWled(on, body) {
    const ips = Array.isArray(this.config.wledIPs) && this.config.wledIPs.length
      ? this.config.wledIPs
      : [ this.config.wledIP || this.defaults.wledIP ];

    const payload = on
      ? (body || { on: true })
      : { on: false, seg: [{ id: 0, on: false }], transition: 0 };

    const tasks = ips.map(ip => {
      const url = `http://${ip}/json/state`;
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(r => this.logTS("BusAlert: WLED", ip, r.status))
      .catch(e => this.errTS("BusAlert: WLED error", ip, e && (e.message || e)));
    });

    Promise.allSettled(tasks);
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.style.display = "none"; // this module doesn't render UI
    return wrapper;
  }
});