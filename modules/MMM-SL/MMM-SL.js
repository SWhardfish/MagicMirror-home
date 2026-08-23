/* global Module, Log, moment */

Module.register("MMM-SL", {
  defaults: {
    debug: false,
    header: "SL Departures",
    apiBase: "https://transport.integration.sl.se/v1/sites",
    timewindow: 10,
    updateInterval: 2,        // minutes between API polls
    countdownInterval: 1,     // minutes between UI countdown refresh
    scheduledDisplayLimits: {
      "Emelie": 2,
      "Sjöstadsbåtarna": 2
    },
    siteids: [],              // [{ id, type, direction, timewindow?, displayCount?, linefilter?, lineStyles? }]
    convertTimeToMinutes: true,
    showRecentlyPassed: false,
    showLastUpdatedAlways: true,
    lastUpdatedInTitle: true,
    iconTable: {
      "BUS": "fa-bus",
      "SHIP": "fa-ship",
      "METRO": "fa-subway",
      "TRAM": "fa-train",
      "TRAIN": "fa-train",
    },
  },

  start: function () {
    Log.info(this.name + " starting...");
    this.loaded = false;
    this.lastUpdated = null;
    this.departureData = {}; // { stopPointName: { departures: [...], displayCount } }
    this.scheduleData = {};  // { schedules: [...] }
    this.scrollPositions = {}; // Track scroll positions to maintain them across updates
    this.activeAnimations = []; // Track all active requestAnimationFrame IDs for cleanup
    this.cancelledToggleInterval = null; // Track interval for cleanup
    this.updateIntervalId = null;
    this.countdownIntervalId = null;
    this.domUpdateCount = 0; // Track how many times getDom is called
    this.animationCreateCount = 0; // Track animation creations
    this.animationCleanupCount = 0; // Track animation cleanups
    this.pendingTimeouts = 0; // Track pending setTimeout calls
    this.loadScheduleData();
    this.scheduleUpdates();
    this.updateDepartures();
    this.startCancelledToggle();
    this.startDiagnostics();
  },

  // Periodic diagnostics logging every 10 minutes
  startDiagnostics: function () {
    setInterval(() => {
      const scrollEls = document.querySelectorAll(".destination-scroll");
      const animatedEls = document.querySelectorAll(".destination-scroll[style]");
      const styleSheets = document.querySelectorAll("#mmm-sl-scroll-styles");
      const allDomNodes = document.querySelectorAll("*").length;
      const cancelledToggles = document.querySelectorAll(".cancelled-toggle");

      Log.info("[MMM-SL DIAG] DOM updates: " + this.domUpdateCount +
        " | Anim created: " + this.animationCreateCount +
        " | Anim cleaned: " + this.animationCleanupCount +
        " | Pending timeouts: " + this.pendingTimeouts +
        " | Scroll elements: " + scrollEls.length +
        " | Animated elements: " + animatedEls.length +
        " | Style sheets: " + styleSheets.length +
        " | Cancelled toggles: " + cancelledToggles.length +
        " | Total DOM nodes: " + allDomNodes);
    }, 10 * 60 * 1000); // Every 10 minutes
  },

  // Cleanup method for when module is suspended/hidden
  suspend: function () {
    Log.info(this.name + " suspending - cleaning up animations and intervals");
    this.cleanupAllAnimations();
    if (this.cancelledToggleInterval) {
      clearInterval(this.cancelledToggleInterval);
      this.cancelledToggleInterval = null;
    }
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  },

  // Resume method for when module becomes visible again
  resume: function () {
    Log.info(this.name + " resuming - restarting updates");
    this.scheduleUpdates();
    this.updateDepartures();
    this.startCancelledToggle();
  },

  // Cancel all active animations and free resources
  cleanupAllAnimations: function () {
    // Cancel Web Animations API objects on ALL scroll elements (not just .scrolling)
    let scrollElements = document.querySelectorAll(".destination-scroll");
    let cancelledCount = 0;
    scrollElements.forEach(el => {
      if (el.scrollAnimation) {
        el.scrollAnimation.cancel();
        el.scrollAnimation = null;
        cancelledCount++;
      }
      el.classList.remove('scrolling');
      el.style.animation = 'none';
    });

    // Remove the dynamically injected keyframes stylesheet entirely
    let styleSheet = document.getElementById('mmm-sl-scroll-styles');
    if (styleSheet) {
      styleSheet.remove();
    }

    this.activeAnimations = [];
    this.animationCleanupCount = (this.animationCleanupCount || 0) + cancelledCount;

    if (cancelledCount > 0) {
      Log.info("MMM-SL: Cleaned up " + cancelledCount + " animations (total cleanups: " + this.animationCleanupCount + ")");
    }
  },

  getStyles: function () {
    return ["font-awesome.css", this.file("css/mmm-sl.css")];
  },

  getHeader: function () {
    let dotColor = "red"; // Default
    let expiredNames = [];
    const now = moment();
    if (this.lastUpdated) {
      let lastUpdateMoment = moment(this.lastUpdated);
      let diffMinutes = now.diff(lastUpdateMoment, "minutes");
      if (diffMinutes <= 5) {
        dotColor = "green"; // fresh API data
      }
    }
    if (this.scheduleData.schedules) {
      // Group by lineid — a lineid is only expired if it has NO currently-active entry
      const lineids = [...new Set(this.scheduleData.schedules.map(s => s.lineid))];
      lineids.forEach(lineid => {
        const entries = this.scheduleData.schedules.filter(s => s.lineid === lineid);
        const hasActive = entries.some(schedule => {
          if (schedule.valid_until) {
            let validUntil = moment(schedule.valid_until, "YYYY-MM-DD");
            if (now.isAfter(validUntil)) return false;
          }
          if (schedule.valid_from) {
            let validFrom = moment(schedule.valid_from, "YYYY-MM-DD");
            if (now.isBefore(validFrom)) return false;
          }
          return true;
        });
        if (!hasActive) expiredNames.push(lineid);
      });
      if (expiredNames.length > 0) {
        dotColor = "orange"; // expired schedule(s)
      }
    }
    let expiredText = expiredNames.length > 0 ? ` (${expiredNames.join(", ")} schedule expired)` : "";
    return `${this.data.header} ${expiredText}`;
  },

  getDom: function () {
    let wrapper = document.createElement("div");
    if (!this.loaded) {
      wrapper.innerHTML = "Loading...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    // CRITICAL: Cleanup all animations before rebuilding DOM to prevent memory leaks
    this.cleanupAllAnimations();
    this.domUpdateCount = (this.domUpdateCount || 0) + 1;

    // Save current scroll positions before redrawing
    this.saveScrollPositions();

    let table = document.createElement("table");
    table.className = "small";

    // Combine real-time and scheduled stops (including those with only scheduled data)
    let allStopNames = new Set(Object.keys(this.departureData));
    if (this.scheduleData.schedules) {
      this.scheduleData.schedules.forEach(schedule => allStopNames.add(schedule.stop_name));
    }
    let sortedStopPoints = Array.from(allStopNames).sort();

    sortedStopPoints.forEach(stopPointName => {
      let stopData = this.departureData[stopPointName] || { departures: [], displayCount: 5 };

      // Scheduled departures for UI only
      let scheduledDepartures = [];
      if (this.scheduleData.schedules) {
        const schedulesForStop = this.scheduleData.schedules.filter(schedule => schedule.stop_name === stopPointName);
        schedulesForStop.forEach(schedule => {
          scheduledDepartures = [...scheduledDepartures, ...this.getScheduledDepartures(schedule)];
        });
      }

      // Merge for UI
      let combinedDepartures = [...stopData.departures, ...scheduledDepartures];

      // Sort by ETA: treat "Nu" as 0 minutes, cancelled departures sort by their original time
      combinedDepartures.sort((a, b) => {
        const aMin = a.isCancelled ? parseInt(a.originalCountdown) : (isNaN(parseInt(String(a.countdown))) ? 0 : parseInt(a.countdown));
        const bMin = b.isCancelled ? parseInt(b.originalCountdown) : (isNaN(parseInt(String(b.countdown))) ? 0 : parseInt(b.countdown));
        return aMin - bMin;
      });

      // Header per stop
      let headerRow = document.createElement("tr");
      let headerCell = document.createElement("td");
      headerCell.colSpan = 4;
      headerCell.innerHTML = `${stopPointName}`;
      headerCell.className = "bright align-left";
      headerRow.appendChild(headerCell);
      table.appendChild(headerRow);

      // Rows
      combinedDepartures
        .slice(0, stopData.displayCount)
        .forEach((departure, index) => {
          let row = document.createElement("tr");

          let iconCell = document.createElement("td");
          let icon = document.createElement("span");
          icon.className = `fa ${departure.icon}`;
          icon.style.color = departure.color;
          iconCell.appendChild(icon);
          row.appendChild(iconCell);

          let lineCell = document.createElement("td");
          lineCell.innerHTML = departure.line;
          lineCell.className = "align-left bright";

          // Set fixed width for line cell
          if (departure.isScheduled && departure.line.length > 3) {
            lineCell.style.width = "120px";
          } else {
            lineCell.style.width = "50px";
          }

          row.appendChild(lineCell);

          let destinationCell = document.createElement("td");
          destinationCell.className = "align-right";

          // Set destination width - scheduled lines get less space, real-time gets more
          let destWidth;
          if (departure.isScheduled && departure.line.length > 3) {
            destWidth = "50px";
          } else {
            destWidth = "150px";
          }

          destinationCell.style.width = destWidth;
          destinationCell.style.maxWidth = destWidth;

          // Handle scrolling destination for cancelled with info message
          if (departure.hasInfoMessage) {
            // Allow scrolling text to overflow into the line cell area
            // The line cell is ~50px, so extend the visible scroll area left by that amount
            destinationCell.style.position = "relative";
            destinationCell.style.overflow = "visible";  // Allow text to overflow left
            destinationCell.style.whiteSpace = "nowrap";
            destinationCell.style.height = "1.4em";  // Fixed height to prevent text cutoff
            destinationCell.style.verticalAlign = "middle";

            // Create a clip container that extends left into the line cell area
            let clipContainer = document.createElement("div");
            clipContainer.style.position = "absolute";
            clipContainer.style.left = "-50px";  // Extend left into line cell area
            clipContainer.style.right = "0";
            clipContainer.style.top = "0";
            clipContainer.style.bottom = "0";
            clipContainer.style.overflow = "hidden";  // Clip at the extended boundaries

            const scrollId = `scroll-${stopPointName}-${departure.line}-${index}`;
            let scrollWrapper = document.createElement("div");
            scrollWrapper.className = "destination-scroll";
            scrollWrapper.setAttribute("data-scroll-id", scrollId);
            scrollWrapper.innerHTML = departure.fullDestination;

            clipContainer.appendChild(scrollWrapper);
            destinationCell.appendChild(clipContainer);

            // The effective scroll width is destWidth + 50px (the line cell extension)
            const effectiveWidth = (parseFloat(destWidth) + 50) + "px";

            // Initialize scroll animation after DOM is ready
            setTimeout(() => {
              this.initializeScroll(scrollWrapper, scrollId, effectiveWidth);
            }, 10);
          } else {
            destinationCell.innerHTML = departure.destination;
          }

          row.appendChild(destinationCell);

          let timeCell = document.createElement("td");
          timeCell.className = "align-right";

          // Handle cancelled departures with toggle
          if (departure.isCancelled) {
            timeCell.style.color = "#FF6B6B";
            timeCell.style.whiteSpace = "nowrap";

            // Create container for toggle
            let toggleContainer = document.createElement("span");
            toggleContainer.className = "cancelled-toggle";
            toggleContainer.style.display = "inline-block";
            toggleContainer.style.minWidth = "70px";
            toggleContainer.style.textAlign = "right";

            let timeSpan = document.createElement("span");
            timeSpan.innerHTML = departure.scheduledTime;
            timeSpan.className = "cancelled-time";
            timeSpan.style.transition = "opacity 0.5s ease-in-out";
            timeSpan.style.display = "inline-block";

            let cancelledSpan = document.createElement("span");
            cancelledSpan.innerHTML = "CANCELLED";
            cancelledSpan.className = "cancelled-text";
            cancelledSpan.style.transition = "opacity 0.5s ease-in-out";
            cancelledSpan.style.display = "none";
            cancelledSpan.style.fontSize = "0.75em";
            cancelledSpan.style.letterSpacing = "-0.5px";

            toggleContainer.appendChild(timeSpan);
            toggleContainer.appendChild(cancelledSpan);
            timeCell.appendChild(toggleContainer);
          } else {
            timeCell.innerHTML = departure.countdown;
          }

          row.appendChild(timeCell);
          table.appendChild(row);
        });
    });

    wrapper.appendChild(table);
    return wrapper;
  },

  saveScrollPositions: function () {
    // With CSS animations, we don't need to track positions
    // CSS animations restart naturally and look fine
    // This function is kept for API compatibility but simplified
  },

  // Web Animations API based scrolling - more reliable than CSS animations
  initializeScroll: function (element, scrollId, containerWidth, retryCount) {
    const containerPx = parseFloat(containerWidth);
    const self = this;
    retryCount = retryCount || 0;
    const maxRetries = 20; // Max 2 seconds of retries (20 * 100ms) - reduced from 50
    self.pendingTimeouts = (self.pendingTimeouts || 0) + 1;

    // Use longer delay to ensure DOM is fully rendered and text content is available
    setTimeout(() => {
      self.pendingTimeouts = Math.max(0, (self.pendingTimeouts || 0) - 1);

      // Check if element is still in DOM (prevents orphaned retry loops)
      if (!document.body.contains(element)) {
        return;
      }

      requestAnimationFrame(() => {
        // Double-check element is still valid
        if (!document.body.contains(element)) {
          return;
        }

        // Temporarily remove width constraints to measure true content width
        element.style.width = 'auto';
        element.style.maxWidth = 'none';
        element.style.position = 'absolute';

        // Force reflow to get accurate measurement
        element.offsetWidth;
        let contentWidth = element.scrollWidth;

        // If content width is 0 or too small, the content hasn't rendered yet - retry with limit
        if (contentWidth < 10) {
          if (retryCount < maxRetries) {
            self.initializeScroll(element, scrollId, containerWidth, retryCount + 1);
          } else {
            Log.warn("MMM-SL: Max retries reached for " + scrollId + ", giving up");
          }
          return;
        }

        // Calculate animation duration based on content width
        // Speed: 40 pixels per second
        const pixelsPerSecond = 40;
        // Total distance: start from right edge of container, scroll until text is fully off left side
        const totalDistance = containerPx + contentWidth;
        const durationMs = (totalDistance / pixelsPerSecond) * 1000;

        // Cancel any existing animation on this element
        if (element.scrollAnimation) {
          element.scrollAnimation.cancel();
          element.scrollAnimation = null;
        }

        // Use Web Animations API for more reliable animation
        // Note: We use translate3d with Y=-50% to maintain vertical centering from CSS
        try {
          element.scrollAnimation = element.animate(
            [
              { transform: `translate3d(${containerPx}px, -50%, 0)` },
              { transform: `translate3d(-${contentWidth}px, -50%, 0)` }
            ],
            {
              duration: durationMs,
              iterations: Infinity,
              easing: 'linear'
            }
          );

          self.animationCreateCount = (self.animationCreateCount || 0) + 1;
          Log.info("MMM-SL: Web Animation #" + self.animationCreateCount + " for " + scrollId + ", duration: " + (durationMs/1000).toFixed(1) + "s");
        } catch (e) {
          Log.error("MMM-SL: Web Animation API failed", e);
        }
      });
    }, 100);
  },

  loadScheduleData: function () {
    fetch(this.file("assets/schedule.json"))
      .then(response => response.json())
      .then(data => {
        Log.info("MMM-SL: Schedule data loaded", data);
        this.scheduleData = data;
        this.updateDom();
      })
      .catch(error => {
        Log.error("MMM-SL: Error loading schedule data", error);
      });
  },

  getDayName: function (day) {
    const daysMap = {
      "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5,
      "Saturday": 6, "Sunday": 0,
      "Monday-Friday": [1, 2, 3, 4, 5],
      "Saturday-Sunday": [6, 0]
    };
    return daysMap[day];
  },

  getScheduledDepartures: function (schedule) {
    let scheduledDepartures = [];
    const now = moment();

    // Skip expired schedules completely
    if (schedule.valid_until) {
      let validUntil = moment(schedule.valid_until, "YYYY-MM-DD");
      if (now.isAfter(validUntil)) {
        return [];
      }
    }
    // Skip not-yet-active schedules
    if (schedule.valid_from) {
      let validFrom = moment(schedule.valid_from, "YYYY-MM-DD");
      if (now.isBefore(validFrom)) {
        return [];
      }
    }
    const todayDay = now.day();
    const maxDepartures = this.config.scheduledDisplayLimits[schedule.lineid] ?? Infinity;

    Object.keys(schedule.days).forEach(dayRange => {
      const days = this.getDayName(dayRange);
      const dayMatch = Array.isArray(days) ? days.includes(todayDay) : todayDay === days;
      if (!dayMatch) return;

      schedule.days[dayRange].forEach(timeSlot => {
        timeSlot.minutes.forEach(minute => {
          let departureTime = moment().hour(timeSlot.hour).minute(minute);
          if (departureTime.isAfter(now)) {
            let countdown = departureTime.diff(now, "minutes");
            let displayTime = countdown > 59 ? departureTime.format("HH:mm")
              : (countdown > 0 ? `${countdown} min` : "Nu");
            scheduledDepartures.push({
              line: `${schedule.lineid}`,
              destination: schedule.destination,
              countdown: displayTime,
              transport_mode: schedule.transport_type,
              icon: this.getLineIcon(schedule.lineid, schedule.transport_type),
              color: this.getLineColor(schedule.lineid, schedule.transport_type),
              isScheduled: true // Mark as scheduled so we don't apply cancellation logic
            });
          }
        });
      });
    });

    return scheduledDepartures.slice(0, maxDepartures);
  },

  getLineIcon: function (lineid, transportType) {
    for (let site of this.config.siteids) {
      if (site.lineStyles && site.lineStyles[lineid]) {
        return site.lineStyles[lineid].icon;
      }
    }
    return this.config.iconTable[transportType] || "fa-question-circle";
  },

  getLineColor: function (lineid, transportType) {
    for (let site of this.config.siteids) {
      if (site.lineStyles && site.lineStyles[lineid]) {
        return site.lineStyles[lineid].color;
      }
    }
    return "White";
  },

  scheduleUpdates: function () {
    // Clear any existing intervals first
    if (this.updateIntervalId) clearInterval(this.updateIntervalId);
    if (this.countdownIntervalId) clearInterval(this.countdownIntervalId);

    this.updateIntervalId = setInterval(() => this.updateDepartures(), this.config.updateInterval * 60 * 1000);
    this.countdownIntervalId = setInterval(() => this.updateCountdowns(), this.config.countdownInterval * 60 * 1000);
  },

  // OPTIMIZATION: Reduce DOM queries in cancelled toggle
startCancelledToggle: function () {
  // Clear any existing interval first
  if (this.cancelledToggleInterval) clearInterval(this.cancelledToggleInterval);

  this.cancelledToggleInterval = setInterval(() => {
    // Get elements once per cycle instead of on every toggle
    let toggleContainers = document.querySelectorAll(".cancelled-toggle");

    toggleContainers.forEach(container => {
      let timeEl = container.querySelector(".cancelled-time");
      let cancelledEl = container.querySelector(".cancelled-text");

      if (timeEl && cancelledEl) {
        const isShowingTime = timeEl.style.display !== "none";

        if (isShowingTime) {
          timeEl.style.opacity = "0";
          setTimeout(() => {
            timeEl.style.display = "none";
            cancelledEl.style.display = "inline-block";
            // Use requestAnimationFrame for smoother transitions
            requestAnimationFrame(() => {
              cancelledEl.style.opacity = "1";
            });
          }, 600);
        } else {
          cancelledEl.style.opacity = "0";
          setTimeout(() => {
            cancelledEl.style.display = "none";
            timeEl.style.display = "inline-block";
            requestAnimationFrame(() => {
              timeEl.style.opacity = "1";
            });
          }, 600);
        }
      }
    });
  }, 3000);
},

  updateDepartures: function () {
    this.loaded = false;
    this.departureData = {};
    this.config.siteids.forEach(site => {
      const url = `${this.config.apiBase}/${site.id}/departures?transport=${site.type}&direction=${site.direction}&forecast=${site.timewindow ?? this.config.timewindow}`;
      this.fetchData(url, site);
    });
  },

  fetchData: function (url, siteConfig) {
    fetch(url)
      .then(response => response.json())
      .then(data => {
        this.processDepartures(data, siteConfig);
        this.lastUpdated = moment().format();
        this.loaded = true;
        this.updateDom();
      })
      .catch(error => {
        Log.error("MMM-SL: Error fetching data from API", error);
      });
  },

  processDepartures: function (data, siteConfig) {
    // Real-time departures from API
    data.departures.forEach(departure => {
      let stopPointName = departure.stop_point.name;
      if (!this.departureData[stopPointName]) {
        this.departureData[stopPointName] = {
          departures: [],
          displayCount: siteConfig.displayCount ?? 5
        };
      }

      // optional per-site line filter
      const passFilter = (!siteConfig.linefilter)
        || (Array.isArray(siteConfig.linefilter) && siteConfig.linefilter.includes(departure.line.designation));
      if (!passFilter) return;

      const expectedTime = moment(departure.expected);
      const scheduledTime = moment(departure.scheduled);
      const countdown = Math.max(0, expectedTime.diff(moment(), "minutes"));
      const lineStyle = (siteConfig.lineStyles && siteConfig.lineStyles[departure.line.designation]) ? siteConfig.lineStyles[departure.line.designation] : {};

      // Check if departure is cancelled
      const isCancelled = departure.state === "CANCELLED";
      const displayCountdown = isCancelled ? "CANCELLED" : (countdown > 0 ? `${countdown} min` : "Nu");

      // Format scheduled time for display
      const formattedScheduledTime = scheduledTime.format("HH:mm");

      // Check for information message in deviations
      let infoMessage = "";
      let hasInfoMessage = false;
      if (isCancelled && departure.deviations && Array.isArray(departure.deviations)) {
        const infoDeviation = departure.deviations.find(dev =>
          dev.consequence === "INFORMATION" && dev.message
        );
        if (infoDeviation) {
          infoMessage = infoDeviation.message;
          hasInfoMessage = true;
        }
      }

      // Build full destination with message if present
      let fullDestination = departure.destination;
      if (hasInfoMessage) {
        fullDestination = `${departure.destination} - ${infoMessage}`;
      }

      this.departureData[stopPointName].departures.push({
        line: departure.line.designation,
        destination: departure.destination,
        fullDestination: fullDestination,
        hasInfoMessage: hasInfoMessage,
        countdown: displayCountdown,
        scheduledTime: formattedScheduledTime,
        originalCountdown: countdown, // Store original countdown for sorting
        isCancelled: isCancelled,
        transport_mode: departure.line.transport_mode,
        icon: lineStyle.icon || this.config.iconTable[departure.line.transport_mode],
        color: lineStyle.color || "White",

        // --- Fields needed by MMM-BusAlert (per-departure)
        expectedISO: expectedTime.toISOString(),
        siteId: String(siteConfig.id),
        directionCode: String(siteConfig.direction),

        // NEW: raw SL fields so BusAlert can detect "Nu" reliably
        rawDisplay: departure.display,    // e.g. "Nu", "1 min", "08:03"
        rawState: departure.state         // e.g. EXPECTED, ATSTOP, CANCELLED
      });
    });

    // Flatten for notification (real-time only)
    const payload = this.buildRealtimeNotificationPayload();
    this.sendNotification("SL_REALTIME_DATA", payload);
  },

  // Build the BusAlert payload from current in-memory real-time departures
  buildRealtimeNotificationPayload() {
    let allDepartures = [];
    Object.values(this.departureData).forEach(stopData => {
      (stopData.departures || []).forEach(dep => {
        allDepartures.push({
          line: dep.line,
          destination: dep.destination,
          countdown: dep.countdown,
          transport_mode: dep.transport_mode,
          icon: dep.icon,
          color: dep.color,
          // normalized fields for BusAlert
          ExpectedDateTime: dep.expectedISO,
          SiteId: dep.siteId,
          LineNumber: dep.line,
          DirectionCode: dep.directionCode,
          // NEW: pass through SL semantics
          Display: dep.rawDisplay || dep.countdown,
          State: dep.rawState || null
        });
      });
    });
    return { Departures: allDepartures };
  },

  updateCountdowns: function () {
    const now = moment();

    for (let stopPoint in this.departureData) {
      this.departureData[stopPoint].departures.forEach(departure => {
        // Don't update countdown if it's cancelled or scheduled
        if (departure.isCancelled || departure.isScheduled) {
          // Check if cancelled departure should be removed (if scheduled time has passed)
          if (departure.isCancelled && departure.expectedISO) {
            const expectedTime = moment(departure.expectedISO);
            if (now.isAfter(expectedTime)) {
              // Mark for removal - will be cleaned up on next full API update
              departure.shouldRemove = true;
            }
          }
          return;
        }

        let currentCountdown = parseInt(String(departure.countdown).replace(" min", ""));
        if (!isNaN(currentCountdown)) {
          departure.countdown = currentCountdown > 1 ? `${currentCountdown - 1} min` : "Nu";
        }
      });

      // Remove departures marked for removal
      this.departureData[stopPoint].departures = this.departureData[stopPoint].departures.filter(dep => !dep.shouldRemove);
    }
    this.updateDom();

    // Re-emit data every minute so MMM-BusAlert can evaluate triggers promptly
    const payload = this.buildRealtimeNotificationPayload();
    this.sendNotification("SL_REALTIME_DATA", payload);
  }
});

