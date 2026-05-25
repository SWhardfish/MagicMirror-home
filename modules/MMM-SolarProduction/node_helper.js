var NodeHelper = require("node_helper");
var axios = require("axios").default;
var fs = require("fs");
var path = require("path");

var DATA_FILE = path.resolve(__dirname, "solar_data.json");
var DAILY_FILE = path.resolve(__dirname, "daily_data.json");

module.exports = NodeHelper.create({
  start: function () {
    console.log("[MMM-SolarProduction] Starting node_helper");

    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
    if (!fs.existsSync(DAILY_FILE)) {
      fs.writeFileSync(DAILY_FILE, JSON.stringify([]));
    }

    this.fetchTimer = null;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "SOLAR_START_FETCH") {
      this.config = payload;
      this.fetchData();
      this.scheduleFetch();
    }
  },

  scheduleFetch: function () {
    var self = this;
    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
    }
    this.fetchTimer = setInterval(function () {
      self.fetchData();
    }, this.config.updateInterval * 60 * 1000);
  },

  fetchData: function () {
    var self = this;
    var url = this.config.dataUrl;

    axios.get(url, { timeout: 30000 })
      .then(function (response) {
        var parsed = self.parseHTML(response.data);
        if (parsed) {
          self.saveReading(parsed.currentPower);
          self.saveDailyReading(parsed);
          var readings = self.getReadings();
          var dailyReadings = self.getDailyReadings();
          self.sendSocketNotification("SOLAR_DATA", {
            readings: readings,
            dailyReadings: dailyReadings,
            stats: parsed
          });
          console.log("[MMM-SolarProduction] Data updated: " + parsed.currentPower + " kW");
        }
      })
      .catch(function (error) {
        console.error("[MMM-SolarProduction] Fetch error: " + error.message);
        var readings = self.getReadings();
        var dailyReadings = self.getDailyReadings();
        if (readings.length > 0) {
          self.sendSocketNotification("SOLAR_DATA", {
            readings: readings,
            dailyReadings: dailyReadings,
            stats: null
          });
        }
      });
  },

  parseHTML: function (html) {
    try {
      var values = [];
      var regex = /<span class=['"]production-value['"]>([\d.]+)<\/span>/g;
      var match;
      while ((match = regex.exec(html)) !== null) {
        values.push(parseFloat(match[1]));
      }

      if (values.length < 2) {
        console.error("[MMM-SolarProduction] Could not parse enough values from HTML");
        return null;
      }

      var statusMatch = html.match(/status-(online|offline)['"]/);
      var status = statusMatch ? statusMatch[1] : "unknown";

      var contactMatch = html.match(/Senast kontakt<\/td>\s*<td>([\d\- :]+)<\/td>/);
      var lastContact = contactMatch ? contactMatch[1] : null;

      var monthlySplit = html.indexOf("Månadssummering");
      var dailySection = monthlySplit > 0 ? html.substring(0, monthlySplit) : html;
      var monthlySection = monthlySplit > 0 ? html.substring(monthlySplit) : "";

      var dailyRegex = /<td class=['"]label['"]>([^<]+)<\/td><td><span class=['"]production-value['"]>([\d.]+)<\/span> kWh<\/td>/g;
      var days = [];
      var dailyMatch;
      while ((dailyMatch = dailyRegex.exec(dailySection)) !== null) {
        days.push({ label: dailyMatch[1], value: parseFloat(dailyMatch[2]) });
      }

      var monthlyKwh = [];
      if (monthlySection) {
        var monthRegex = /<span class=['"]production-value['"]>([\d.]+)<\/span> kWh/g;
        var mMatch;
        while ((mMatch = monthRegex.exec(monthlySection)) !== null) {
          monthlyKwh.push(parseFloat(mMatch[1]));
        }
      }

      var result = {
        currentPower: values[0],
        percentage: values[1],
        todayKwh: values.length > 2 ? values[2] : 0,
        status: status,
        lastContact: lastContact,
        days: days,
        yesterdayKwh: days.length > 0 ? days[0].value : 0,
        monthlyKwh: monthlyKwh
      };

      return result;
    } catch (e) {
      console.error("[MMM-SolarProduction] Parse error: " + e.message);
      return null;
    }
  },

  saveReading: function (powerKw) {
    try {
      var readings = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      var now = Math.floor(Date.now() / 1000);

      // Reject obviously wrong values — parse errors produce kWh totals (100-1000+) in the kW slot
      if (powerKw > 100) {
        console.warn("[MMM-SolarProduction] Rejecting implausible reading: " + powerKw + " kW");
        return;
      }

      readings.push({ dt: now, power_kw: powerKw });

      var graphHours = this.config.graphHours || 72;
      var cutoff = now - (graphHours * 60 * 60);
      readings = readings.filter(function (r) { return r.dt >= cutoff; });

      fs.writeFileSync(DATA_FILE, JSON.stringify(readings));
    } catch (e) {
      console.error("[MMM-SolarProduction] Save error: " + e.message);
    }
  },

  saveDailyReading: function (parsed) {
    try {
      var daily = JSON.parse(fs.readFileSync(DAILY_FILE, "utf8"));

      // days[0] from the source is always "yesterday"
      if (!parsed.days || parsed.days.length === 0) return;

      var now = new Date();
      var yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      var dateStr = yesterday.getFullYear() + "-" +
        String(yesterday.getMonth() + 1).padStart(2, "0") + "-" +
        String(yesterday.getDate()).padStart(2, "0");

      var exists = false;
      for (var i = 0; i < daily.length; i++) {
        if (daily[i].date === dateStr) { exists = true; break; }
      }

      if (!exists) {
        daily.push({ date: dateStr, kwh: parsed.days[0].value });
        daily.sort(function (a, b) { return a.date < b.date ? -1 : 1; });

        if (daily.length > 31) {
          daily = daily.slice(daily.length - 31);
        }

        fs.writeFileSync(DAILY_FILE, JSON.stringify(daily));
        console.log("[MMM-SolarProduction] Saved daily: " + dateStr + " = " + parsed.days[0].value + " kWh");
      }
    } catch (e) {
      console.error("[MMM-SolarProduction] Daily save error: " + e.message);
    }
  },

  getReadings: function () {
    try {
      if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      }
    } catch (e) {
      console.error("[MMM-SolarProduction] Read error: " + e.message);
    }
    return [];
  },

  getDailyReadings: function () {
    try {
      if (fs.existsSync(DAILY_FILE)) {
        return JSON.parse(fs.readFileSync(DAILY_FILE, "utf8"));
      }
    } catch (e) {
      console.error("[MMM-SolarProduction] Daily read error: " + e.message);
    }
    return [];
  }
});
