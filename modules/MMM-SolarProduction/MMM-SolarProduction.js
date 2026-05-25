Module.register("MMM-SolarProduction", {

  defaults: {
    updateInterval: 20,
    dataUrl: "https://europe-west1-mandeln-solceller.cloudfunctions.net/solproduktion",
    graphHours: 72,
    lineColor: "#7ab648"
  },

  getStyles: function () {
    return ["MMM-SolarProduction.css"];
  },

  getScripts: function () {
    return [
      "/modules/MMM-OpenWeatherForecast/chart.min.js",
      "/modules/MMM-OpenWeatherForecast/chartjs-adapter-date-fns.bundle.min.js"
    ];
  },

  start: function () {
    this.solarData = null;
    this.chartInstance = null;
    this.sendSocketNotification("SOLAR_START_FETCH", this.config);
  },

  getDom: function () {
    var wrapper = document.createElement("div");
    wrapper.className = "solar-wrapper";

    if (!this.solarData) {
      var placeholder = document.createElement("div");
      placeholder.className = "solar-placeholder";
      placeholder.innerHTML = "V&auml;ntar p&aring; soldata...";
      wrapper.appendChild(placeholder);
      return wrapper;
    }

    var header = document.createElement("div");
    header.className = "solar-header";

    var title = document.createElement("span");
    title.className = "solar-title";
    title.textContent = "Solceller";
    header.appendChild(title);

    var currentDiv = document.createElement("div");
    var stats = this.solarData.stats;
    if (stats) {
      var currentSpan = document.createElement("span");
      currentSpan.className = "solar-current";
      currentSpan.textContent = stats.currentPower.toFixed(1) + " kW";
      currentDiv.appendChild(currentSpan);

      var pctSpan = document.createElement("span");
      pctSpan.className = "solar-percent";
      pctSpan.textContent = " (" + stats.percentage + "%)";
      currentDiv.appendChild(pctSpan);
    }
    header.appendChild(currentDiv);
    wrapper.appendChild(header);

    var graphContainer = document.createElement("div");
    graphContainer.className = "solar-graph-container";

    var canvas = document.createElement("canvas");
    canvas.id = "solar-production-chart";
    graphContainer.appendChild(canvas);
    wrapper.appendChild(graphContainer);

    var statsRow = document.createElement("div");
    statsRow.className = "solar-stats";

    if (stats) {
      var todayStr = "Idag: <span class=\"value\">" + Math.round(stats.todayKwh) + " kWh</span>";
      var yesterdayStr = "Igår: <span class=\"value\">" + Math.round(stats.yesterdayKwh) + " kWh</span>";
      var monthVal = stats.monthlyKwh && stats.monthlyKwh.length > 0 ? stats.monthlyKwh[0] : 0;
      var monthStr;
      if (monthVal >= 1000) {
        monthStr = "Månad: <span class=\"value\">" + (monthVal / 1000).toFixed(1) + " MWh</span>";
      } else {
        monthStr = "Månad: <span class=\"value\">" + Math.round(monthVal) + " kWh</span>";
      }

      var todaySpan = document.createElement("span");
      todaySpan.innerHTML = todayStr;
      statsRow.appendChild(todaySpan);

      var yesterdaySpan = document.createElement("span");
      yesterdaySpan.innerHTML = yesterdayStr;
      statsRow.appendChild(yesterdaySpan);

      var monthSpan = document.createElement("span");
      monthSpan.innerHTML = monthStr;
      statsRow.appendChild(monthSpan);
    }
    wrapper.appendChild(statsRow);

    return wrapper;
  },

  notificationReceived: function (notification) {
    if (notification === "DOM_OBJECTS_CREATED") {}
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "SOLAR_DATA") {
      this.solarData = payload;
      this.updateDom(300);

      var self = this;
      setTimeout(function () {
        self.renderChart();
      }, 500);
    }
  },

  renderChart: function () {
    var canvas = document.getElementById("solar-production-chart");
    if (!canvas) return;

    var readings = this.solarData.readings;
    if (!readings || readings.length === 0) return;

    // 72h power line — filter parse-error spikes
    var lineData = [];
    for (var i = 0; i < readings.length; i++) {
      if (readings[i].power_kw <= 100) {
        lineData.push({ x: readings[i].dt * 1000, y: readings[i].power_kw });
      }
    }
    if (lineData.length === 0) return;

    var endTime = lineData[lineData.length - 1].x;
    var startTime = endTime - (this.config.graphHours * 60 * 60 * 1000);

    // Daily bars — persisted history + today's live running total
    var dailyReadings = this.solarData.dailyReadings || [];
    var barData = [];
    for (var j = 0; j < dailyReadings.length; j++) {
      var parts = dailyReadings[j].date.split("-");
      var noon = new Date(
        parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0, 0
      ).getTime();
      barData.push({ x: noon, y: dailyReadings[j].kwh });
    }

    // Add today's live kWh as the rightmost growing bar
    var stats = this.solarData.stats;
    if (stats && stats.todayKwh > 0) {
      var now = new Date();
      var todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime();
      var todayReplaced = false;
      for (var k = 0; k < barData.length; k++) {
        if (barData[k].x === todayNoon) { barData[k].y = stats.todayKwh; todayReplaced = true; break; }
      }
      if (!todayReplaced) {
        barData.push({ x: todayNoon, y: stats.todayKwh });
      }
    }

    // x2 axis spans the full bar history
    var x2Min = barData.length > 0 ? barData[0].x - 12 * 3600 * 1000 : startTime;
    var x2Max = barData.length > 0 ? barData[barData.length - 1].x + 12 * 3600 * 1000 : endTime;

    if (this.chartInstance) {
      try { this.chartInstance.destroy(); this.chartInstance = null; } catch (e) {}
    }

    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var lineColor = this.config.lineColor;
    var capturedStartTime = startTime;

    this.chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            // Drawn first = behind the line; uses its own independent x2 axis
            type: "bar",
            data: barData,
            backgroundColor: "rgba(122, 182, 72, 0.2)",
            borderColor: "rgba(122, 182, 72, 0.4)",
            borderWidth: 0.5,
            yAxisID: "y2",
            xAxisID: "x2",
            order: 2,
            barThickness: "flex"
          },
          {
            type: "line",
            data: lineData,
            borderColor: lineColor,
            borderWidth: 0.8,
            backgroundColor: "transparent",
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.4,
            yAxisID: "y",
            xAxisID: "x",
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: {
            // 72h line axis — full width, visible ticks
            type: "time",
            min: startTime,
            max: endTime,
            offset: false,
            time: {
              unit: "hour",
              displayFormats: { hour: "HH" }
            },
            ticks: {
              color: "white",
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: false,
              callback: function (value) {
                var date = new Date(value);
                var hour = date.getHours();
                if ([0, 6, 12, 18].indexOf(hour) !== -1) {
                  return hour < 10 ? "0" + hour : "" + hour;
                }
                return null;
              }
            },
            grid: {
              color: function (context) {
                if (!context.tick) return "transparent";
                var date = new Date(context.tick.value);
                if (date.getHours() === 0 && date.getMinutes() === 0) {
                  return "rgba(255, 255, 255, 0.8)";
                }
                return "rgba(128, 128, 128, 0.3)";
              },
              lineWidth: 0.4,
              drawBorder: false
            },
            border: { display: false }
          },
          x2: {
            // Daily bar axis — full width, invisible, independent time domain
            type: "time",
            min: x2Min,
            max: x2Max,
            display: false,
            offset: false,
            time: { unit: "day" },
            grid: { display: false }
          },
          y: {
            min: 0,
            position: "left",
            ticks: {
              color: "white",
              font: { size: 11 },
              callback: function (value) { return value.toFixed(0) + " kW"; },
              maxTicksLimit: 4
            },
            grid: {
              color: "rgba(128, 128, 128, 0.4)",
              lineWidth: 0.4,
              drawBorder: false
            },
            border: { display: false }
          },
          y2: {
            min: 0,
            max: (function () {
              var maxKwh = 0;
              for (var b = 0; b < barData.length; b++) {
                if (barData[b].y > maxKwh) maxKwh = barData[b].y;
              }
              // Round up to nearest 500 kWh so ticks land on clean MWh values
              return Math.max(Math.ceil(maxKwh / 500) * 500, 500);
            })(),
            position: "right",
            display: barData.length > 0,
            title: {
              display: true,
              text: "MWh",
              color: "rgba(122, 182, 72, 0.5)",
              font: { size: 8 },
              padding: 0
            },
            ticks: {
              color: "rgba(122, 182, 72, 0.6)",
              font: { size: 9 },
              count: 3,
              callback: function (value, index, ticks) {
                return (value / 1000).toFixed(1);
              }
            },
            grid: { display: false },
            border: { display: false }
          }
        },
        layout: {
          padding: { left: 5, right: 5, top: 5, bottom: 5 }
        }
      },
      plugins: [{
        id: "dayLabels",
        afterDraw: function (chart) {
          var chartCtx = chart.ctx;
          var xScale = chart.scales.x;
          var yScale = chart.scales.y;

          // Only label days within the 72h line window
          var startDate = new Date(capturedStartTime);
          var endDate = new Date(endTime);
          var dayBoundaries = [];
          var cur = new Date(startDate);
          cur.setHours(24, 0, 0, 0);
          while (cur <= endDate) {
            dayBoundaries.push(cur.getTime());
            cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
          }

          var yMid = (yScale.top + yScale.bottom) / 2;
          var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          var segments = [capturedStartTime].concat(dayBoundaries).concat([endTime]);

          for (var i = 0; i < segments.length - 1; i++) {
            var midpoint = (segments[i] + segments[i + 1]) / 2;
            var date = new Date(segments[i]);
            var dayName = dayNames[date.getDay()];
            var xPos = xScale.getPixelForValue(midpoint);

            chartCtx.save();
            chartCtx.fillStyle = "rgba(255, 255, 255, 0.25)";
            chartCtx.font = "14px sans-serif";
            chartCtx.textAlign = "center";
            chartCtx.textBaseline = "middle";
            chartCtx.fillText(dayName, xPos, yMid);
            chartCtx.restore();
          }
        }
      }]
    });
  }
});
