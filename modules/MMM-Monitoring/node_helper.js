var NodeHelper = require("node_helper");
var fs = require("fs");
var path = require("path");
var os = require("os");
var childProcess = require("child_process");

var HISTORY_FILE = path.join(__dirname, "monitoring-history.jsonl");
var SAMPLE_INTERVAL = 60 * 1000;
var MAX_AGE = 7 * 24 * 60 * 60 * 1000;
var MAX_SAMPLES = 7 * 24 * 60;
var audio = require("./audio.js");
var LCD_SCRIPT = path.join(__dirname, "..", "MMM-LCDScheduler", "gpio_pulse.py");

module.exports = NodeHelper.create({
  start: function () {
    this.history = this.loadHistory();
    this.previousCpu = null;
    this.sample();
    this.sampleTimer = setInterval(this.sample.bind(this), SAMPLE_INTERVAL);

    this.expressApp.get("/MMM-Monitoring/api/statistics", function (req, res) {
      var hours = Math.max(1, Math.min(168, Number(req.query.hours) || 6));
      var since = Date.now() - hours * 60 * 60 * 1000;
      res.set("Cache-Control", "no-store");
      res.json({
        generatedAt: Date.now(),
        intervalSeconds: SAMPLE_INTERVAL / 1000,
        samples: this.history.filter(function (sample) { return sample.t >= since; }),
        hardware: { fanInstalled: false, speakerInstalled: true }
      });
    }.bind(this));
    this.expressApp.use("/MMM-Monitoring/api/admin", require("express").json());
    this.expressApp.get("/MMM-Monitoring/api/admin", function (req, res) {
      if (!this.isPrivateClient(req)) return res.status(403).json({ ok: false, message: "LAN access required" });
      res.set("Cache-Control", "no-store");
      res.json({
        ok: true,
        latest: this.history[this.history.length - 1] || null,
        hardware: { fanInstalled: false, speakerInstalled: true },
        audio: { volume: audio.getVolume() },
        actions: ["lcd-toggle", "restart-mirror", "reboot", "poweroff", "speaker-test", "set-volume"]
      });
    }.bind(this));
    this.expressApp.post("/MMM-Monitoring/api/admin", function (req, res) {
      if (!this.isPrivateClient(req)) return res.status(403).json({ ok: false, message: "LAN access required" });
      var action = req.body && req.body.action;
      if (["lcd-toggle", "restart-mirror", "reboot", "poweroff", "speaker-test", "set-volume"].indexOf(action) === -1) {
        return res.status(400).json({ ok: false, message: "Unsupported action" });
      }
      if (action === "set-volume" || action === "speaker-test") {
        try {
          if (action === "set-volume") audio.setVolume(req.body.volume);
        } catch (error) {
          return res.status(400).json({ ok: false, message: "Invalid volume" });
        }
        if (action === "set-volume") return res.json({ ok: true, message: "Volume set to " + audio.getVolume() + "%" });
        if (!audio.play("test")) return res.status(500).json({ ok: false, message: "Speaker is muted or unavailable" });
        return res.json({ ok: true, message: "Test tone played at " + audio.getVolume() + "%" });
      }
      if (action === "lcd-toggle") {
        return childProcess.execFile("python3", [LCD_SCRIPT, "17"], { timeout: 10000 }, function (error) {
          if (error) return res.status(500).json({ ok: false, message: "LCD pulse failed" });
          res.json({ ok: true, message: "LCD power pulse sent" });
        });
      }
      if (action === "restart-mirror") {
        res.json({ ok: true, message: "MagicMirror is restarting" });
        return setTimeout(function () { process.exit(0); }, 500);
      }
      var systemAction = action === "reboot" ? "reboot" : "poweroff";
      childProcess.execFile("sudo", ["-n", "true"], { timeout: 5000 }, function (error) {
        if (error) return res.status(500).json({ ok: false, message: "System command was not permitted" });
        res.json({ ok: true, message: action === "reboot" ? "Pi is rebooting" : "Pi is shutting down" });
        setTimeout(function () {
          childProcess.execFile("sudo", ["-n", "systemctl", systemAction], function () {});
        }, 500);
      });
    }.bind(this));

    console.log("[MMM-Monitoring] Statistics available at /MMM-Monitoring/statistics.html");
  },

  socketNotificationReceived: function (notification) {
    if (notification === "MONITORING_START" && this.history.length === 0) this.sample();
  },

  isPrivateClient: function (req) {
    var address = req.socket && req.socket.remoteAddress || "";
    address = address.replace(/^::ffff:/, "");
    return address === "127.0.0.1" || address === "::1" || /^10\./.test(address) ||
      /^192\.168\./.test(address) || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
  },

  sample: function () {
    var temperature = null;
    try {
      temperature = Number(fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8").trim()) / 1000;
    } catch (error) {
      // Thermal data is unavailable on non-Linux development machines.
    }

    var cpu = this.readCpuUsage();
    var totalMemory = os.totalmem();
    var ram = totalMemory ? (1 - os.freemem() / totalMemory) * 100 : null;
    var sample = {
      t: Date.now(),
      c: Number.isFinite(temperature) ? Math.round(temperature * 10) / 10 : null,
      cpu: Number.isFinite(cpu) ? Math.round(cpu * 10) / 10 : null,
      ram: Number.isFinite(ram) ? Math.round(ram * 10) / 10 : null,
      load: Math.round(os.loadavg()[0] * 100) / 100,
      uptime: Math.round(os.uptime()),
      memory: this.readProcessTreeMemory(),
      disk: null
    };

    childProcess.execFile("df", ["-Pk", "/"], { timeout: 5000 }, function (error, stdout) {
      if (!error) {
        var lines = stdout.trim().split(/\r?\n/);
        var fields = lines[lines.length - 1].trim().split(/\s+/);
        if (fields.length >= 5) sample.disk = Number(fields[4].replace("%", ""));
      }
      this.saveSample(sample);
    }.bind(this));
  },

  readCpuUsage: function () {
    try {
      var match = /^cpu\s+(.+)$/m.exec(fs.readFileSync("/proc/stat", "utf8"));
      if (!match) return null;
      var fields = match[1].trim().split(/\s+/).map(Number);
      var total = fields.reduce(function (sum, value) { return sum + value; }, 0);
      var idle = (fields[3] || 0) + (fields[4] || 0);
      var usage = null;
      if (this.previousCpu) {
        var totalDelta = total - this.previousCpu.total;
        var idleDelta = idle - this.previousCpu.idle;
        if (totalDelta > 0) usage = (1 - idleDelta / totalDelta) * 100;
      }
      this.previousCpu = { total: total, idle: idle };
      return usage;
    } catch (error) {
      return null;
    }
  },

  readProcessTreeMemory: function () {
    var processes = {};
    try {
      fs.readdirSync("/proc").filter(function (entry) { return /^\d+$/.test(entry); }).forEach(function (entry) {
        try {
          var status = fs.readFileSync("/proc/" + entry + "/status", "utf8");
          var parent = Number((/^PPid:\s+(\d+)/m.exec(status) || [0, 0])[1]);
          var rss = Number((/^VmRSS:\s+(\d+)/m.exec(status) || [0, 0])[1]);
          var swap = Number((/^VmSwap:\s+(\d+)/m.exec(status) || [0, 0])[1]);
          processes[entry] = { parent: parent, rss: rss, swap: swap };
        } catch (error) {
          // A process may exit while /proc is being read.
        }
      });
    } catch (error) {
      return null;
    }

    var included = {};
    included[process.pid] = true;
    var changed = true;
    while (changed) {
      changed = false;
      Object.keys(processes).forEach(function (pid) {
        if (!included[pid] && included[processes[pid].parent]) {
          included[pid] = true;
          changed = true;
        }
      });
    }
    var result = Object.keys(included).reduce(function (totals, pid) {
      var processInfo = processes[pid];
      if (processInfo) {
        totals.rssKiB += processInfo.rss;
        totals.swapKiB += processInfo.swap;
        totals.processes += 1;
      }
      return totals;
    }, { rssKiB: 0, swapKiB: 0, processes: 0 });
    result.combinedKiB = result.rssKiB + result.swapKiB;
    return result;
  },

  saveSample: function (sample) {
    var cutoff = Date.now() - MAX_AGE;
    this.history.push(sample);
    this.history = this.history.filter(function (entry) { return entry.t >= cutoff; }).slice(-MAX_SAMPLES);
    fs.appendFile(HISTORY_FILE, JSON.stringify(sample) + "\n", function (error) {
      if (error) console.error("[MMM-Monitoring] History write failed: " + error.message);
    });
    if (this.history.length % 360 === 0) {
      fs.writeFile(HISTORY_FILE, this.history.map(JSON.stringify).join("\n") + "\n", function () {});
    }
  },

  loadHistory: function () {
    try {
      var cutoff = Date.now() - MAX_AGE;
      return fs.readFileSync(HISTORY_FILE, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse)
        .filter(function (sample) { return sample.t >= cutoff; }).slice(-MAX_SAMPLES);
    } catch (error) {
      return [];
    }
  },

  stop: function () {
    if (this.sampleTimer) clearInterval(this.sampleTimer);
  }
});
