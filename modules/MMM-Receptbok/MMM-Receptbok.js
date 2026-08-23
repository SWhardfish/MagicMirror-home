Module.register("MMM-Receptbok", {
  defaults: {
    gpioButtonNext: 17,
    gpioButtonReturn: 27,
    autoReturnHours: 1,
    animationSpeed: 800,
    stepsPerPage: 6
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    this.recipeList = [];
    this.currentRecipe = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.pages = [];
    this.isActive = false;
    this.sequentialIndex = 0;
    this.autoReturnTimer = null;
    this.wrapper = null;
    this.contentEl = null;
    this.timerBarEl = null;
    this.timerOverlayEl = null;
    this.activeTimers = [];
    this.timerDoneLabel = null;

    this.sendSocketNotification("INIT", {
      gpioButtonNext: this.config.gpioButtonNext,
      gpioButtonReturn: this.config.gpioButtonReturn,
      stepsPerPage: this.config.stepsPerPage
    });
  },

  getDom: function () {
    // Always return the same persistent wrapper — visibility is controlled via CSS classes
    if (!this.wrapper) {
      this.wrapper = document.createElement("div");
      this.wrapper.className = "receptbok-wrapper";

      this.clockEl = document.createElement("div");
      this.clockEl.className = "receptbok-clock";

      this.contentEl = document.createElement("div");
      this.contentEl.className = "receptbok-content";
      this.wrapper.appendChild(this.contentEl);

      this.timerBarEl = document.createElement("div");
      this.timerBarEl.className = "receptbok-timer-bar";
      this.wrapper.appendChild(this.timerBarEl);

      this.timerOverlayEl = document.createElement("div");
      this.timerOverlayEl.className = "receptbok-timer-overlay";
      this.wrapper.appendChild(this.timerOverlayEl);

      this.startClock();
    }
    return this.wrapper;
  },

  startClock: function () {
    var self = this;
    var tick = function () {
      var now = new Date();
      var h = String(now.getHours()).padStart(2, "0");
      var m = String(now.getMinutes()).padStart(2, "0");
      var s = String(now.getSeconds()).padStart(2, "0");
      self.clockEl.textContent = h + ":" + m + ":" + s;
    };
    tick();
    this.clockInterval = setInterval(tick, 1000);
  },

  // Render recipe content into contentEl without touching the wrapper
  renderRecipe: function () {
    var recipe = this.currentRecipe;
    var page = this.pages[this.currentPage - 1];
    var el = this.contentEl;

    el.innerHTML = "";

    // Header band
    var header = document.createElement("div");
    header.className = "receptbok-header";

    var headerLeft = document.createElement("div");
    headerLeft.className = "receptbok-header-left";

    var title = document.createElement("div");
    title.className = "receptbok-title";
    title.textContent = recipe.title;
    headerLeft.appendChild(title);

    var meta = document.createElement("div");
    meta.className = "receptbok-meta";
    if (recipe.prepTime) {
      meta.innerHTML += "<span>⏱ " + recipe.prepTime + "</span>";
    }
    if (recipe.totalTime) {
      meta.innerHTML += "<span>⏰ " + recipe.totalTime + " total</span>";
    }
    if (recipe.servings) {
      meta.innerHTML += "<span>🍽 " + recipe.servings + "</span>";
    }
    if (this.totalPages > 1) {
      meta.innerHTML += "<span class=\"receptbok-page-indicator\">Sida " + this.currentPage + " av " + this.totalPages + "</span>";
    }
    headerLeft.appendChild(meta);
    header.appendChild(headerLeft);
    header.appendChild(this.clockEl);
    el.appendChild(header);

    // Body
    var body = document.createElement("div");
    body.className = "receptbok-body";

    if (page.ingredients && page.ingredients.length > 0) {
      var ingSection = document.createElement("div");
      ingSection.className = "receptbok-section";

      var ingTitle = document.createElement("div");
      ingTitle.className = "receptbok-section-title";
      ingTitle.textContent = "Ingredienser";
      ingSection.appendChild(ingTitle);

      for (var g = 0; g < page.ingredients.length; g++) {
        var group = page.ingredients[g];
        var groupDiv = document.createElement("div");
        groupDiv.className = "receptbok-ingredient-group";

        if (group.group && group.group !== "Ingredients" && group.group !== "Ingredienser") {
          var groupTitle = document.createElement("div");
          groupTitle.className = "receptbok-ingredient-group-title";
          groupTitle.textContent = group.group;
          groupDiv.appendChild(groupTitle);
        }

        var list = document.createElement("div");
        list.className = "receptbok-ingredient-list";
        for (var i = 0; i < group.items.length; i++) {
          var item = document.createElement("span");
          item.textContent = group.items[i];
          list.appendChild(item);
        }
        groupDiv.appendChild(list);
        ingSection.appendChild(groupDiv);
      }
      body.appendChild(ingSection);
    }

    if (page.steps && page.steps.length > 0) {
      var stepsSection = document.createElement("div");
      stepsSection.className = "receptbok-section";

      var stepsTitle = document.createElement("div");
      stepsTitle.className = "receptbok-section-title";
      stepsTitle.textContent = "Tillagning";
      stepsSection.appendChild(stepsTitle);

      var stepsList = document.createElement("div");
      stepsList.className = "receptbok-steps";
      for (var s = 0; s < page.steps.length; s++) {
        var step = document.createElement("div");
        step.className = "receptbok-step";

        var num = document.createElement("span");
        num.className = "receptbok-step-num";
        num.textContent = page.steps[s].number;
        step.appendChild(num);

        var text = document.createElement("span");
        text.className = "receptbok-step-text";
        text.textContent = page.steps[s].text;
        step.appendChild(text);

        stepsList.appendChild(step);
      }
      stepsSection.appendChild(stepsList);
      body.appendChild(stepsSection);
    }

    if (page.tips) {
      var tipsDiv = document.createElement("div");
      tipsDiv.className = "receptbok-tips";
      tipsDiv.innerHTML = "<strong>💡 Tips</strong>" + page.tips;
      body.appendChild(tipsDiv);
    }

    el.appendChild(body);
    this.scaleTitleFont();
  },

  renderTimerBar: function () {
    var el = this.timerBarEl;
    if (!el) return;
    el.innerHTML = "";

    if (this.activeTimers.length === 0) {
      el.style.display = "none";
      return;
    }

    el.style.display = "flex";
    for (var i = 0; i < this.activeTimers.length; i++) {
      var t = this.activeTimers[i];
      var chip = document.createElement("div");
      chip.className = "receptbok-timer-chip" + (t.done ? " receptbok-timer-chip-done" : "");

      var label = document.createElement("div");
      label.className = "receptbok-timer-chip-label";
      label.textContent = t.label;
      chip.appendChild(label);

      var time = document.createElement("div");
      time.className = "receptbok-timer-chip-time";
      if (t.done) {
        time.textContent = "Färdig!";
      } else {
        var mins = Math.floor(t.secondsLeft / 60);
        var secs = t.secondsLeft % 60;
        time.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
      }
      chip.appendChild(time);

      el.appendChild(chip);
    }
  },

  showTimerDoneOverlay: function (label) {
    var self = this;
    this.timerDoneLabel = label;
    var el = this.timerOverlayEl;
    el.innerHTML =
      "<div class=\"receptbok-timer-done-icon\">⏰</div>" +
      "<div class=\"receptbok-timer-done-title\">" + label + "</div>" +
      "<div class=\"receptbok-timer-done-sub\">Timer färdig!</div>";
    el.classList.add("receptbok-timer-overlay-visible");
    if (this.overlayDismissTimer) clearTimeout(this.overlayDismissTimer);
    this.overlayDismissTimer = setTimeout(function () {
      self.dismissTimerOverlay();
    }, 10000);
  },

  dismissTimerOverlay: function () {
    this.timerDoneLabel = null;
    if (this.overlayDismissTimer) {
      clearTimeout(this.overlayDismissTimer);
      this.overlayDismissTimer = null;
    }
    this.timerOverlayEl.classList.remove("receptbok-timer-overlay-visible");
    this.timerOverlayEl.innerHTML = "";
  },

  scaleTitleFont: function () {
    var titleEl = this.contentEl.querySelector(".receptbok-title");
    var container = this.contentEl.querySelector(".receptbok-header-left");
    if (!titleEl || !container) return;
    var maxSize = 36;
    var minSize = 18;
    titleEl.style.fontSize = maxSize + "px";
    while (titleEl.scrollWidth > container.clientWidth && maxSize > minSize) {
      maxSize--;
      titleEl.style.fontSize = maxSize + "px";
    }
  },

  // Fade wrapper in (home → recipe or return from hiding)
  showWrapper: function () {
    var self = this;
    // Trigger reflow so transition fires
    void this.wrapper.offsetWidth;
    this.wrapper.classList.add("receptbok-visible");
  },

  // Fade wrapper out, then call callback
  hideWrapper: function (callback) {
    var self = this;
    var speed = this.config.animationSpeed;

    this.wrapper.classList.remove("receptbok-visible");
    setTimeout(function () {
      if (callback) callback();
    }, speed);
  },

  // Crossfade content for recipe→recipe or page changes
  crossfadeContent: function (renderFn) {
    var self = this;
    var halfSpeed = Math.round(this.config.animationSpeed * 0.3);

    this.contentEl.classList.add("receptbok-fading");
    setTimeout(function () {
      renderFn();
      self.contentEl.classList.remove("receptbok-fading");
    }, halfSpeed);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "RECIPE_LIST") {
      this.recipeList = payload;
      Log.info("MMM-Receptbok: Loaded " + this.recipeList.length + " recipes");

    } else if (notification === "SHOW_RECIPE") {
      var self = this;
      var wasActive = this.isActive;

      this.currentRecipe = payload.recipe;
      this.pages = payload.pages;
      this.currentPage = 1;
      this.totalPages = payload.pages.length;
      this.isActive = true;

      if (!wasActive) {
        // Home → recipe: render then fade wrapper in
        this.renderRecipe();
        this.showWrapper();
      } else {
        // Recipe → recipe: crossfade content, wrapper stays visible
        this.crossfadeContent(function () {
          self.renderRecipe();
        });
      }
      this.resetAutoReturnTimer();

    } else if (notification === "TIMER_UPDATE") {
      this.activeTimers = payload;
      this.renderTimerBar();

    } else if (notification === "TIMER_DONE") {
      this.showTimerDoneOverlay(payload.label);

    } else if (notification === "BUTTON_NEXT") {
      if (this.timerDoneLabel) { this.dismissTimerOverlay(); return; }
      this.handleNext();

    } else if (notification === "BUTTON_RETURN") {
      if (this.timerDoneLabel) { this.dismissTimerOverlay(); return; }
      this.handleReturn();
    }
  },

  handleNext: function () {
    var self = this;

    if (!this.isActive) {
      if (this.recipeList.length > 0) {
        this.sendSocketNotification("REQUEST_RECIPE", {
          id: this.recipeList[this.sequentialIndex].id
        });
      }
      return;
    }

    if (this.currentPage < this.totalPages) {
      // Next page within same recipe — crossfade content only
      this.currentPage++;
      this.crossfadeContent(function () {
        self.renderRecipe();
      });
      this.resetAutoReturnTimer();
    } else {
      // Last page → next recipe
      this.sequentialIndex = (this.sequentialIndex + 1) % this.recipeList.length;
      this.sendSocketNotification("REQUEST_RECIPE", {
        id: this.recipeList[this.sequentialIndex].id
      });
    }
  },

  handleReturn: function () {
    var self = this;
    this.isActive = false;
    this.activeTimers = [];
    this.dismissTimerOverlay();
    this.renderTimerBar();
    this.hideWrapper(function () {
      self.currentRecipe = null;
      self.contentEl.innerHTML = "";
    });
    this.clearAutoReturnTimer();
  },

  resetAutoReturnTimer: function () {
    this.clearAutoReturnTimer();
    if (this.config.autoReturnHours > 0) {
      var self = this;
      var timeoutMs = this.config.autoReturnHours * 3600 * 1000;
      this.autoReturnTimer = setTimeout(function () {
        self.handleReturn();
      }, timeoutMs);
    }
  },

  clearAutoReturnTimer: function () {
    if (this.autoReturnTimer !== null) {
      clearTimeout(this.autoReturnTimer);
      this.autoReturnTimer = null;
    }
  },

  getStyles: function () {
    return ["MMM-Receptbok.css"];
  },

  suspend: function () {
    this.clearAutoReturnTimer();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  },

  resume: function () {
    if (!this.clockInterval && this.clockEl) {
      this.startClock();
    }
  }
});
