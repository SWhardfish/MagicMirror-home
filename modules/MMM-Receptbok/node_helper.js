const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start: function () {
    this.watchers = [];
    this.recipes = [];
    this.stepsPerPage = 6;
    this.activeTimers = [];
    this.timerInterval = null;
    console.log("MMM-Receptbok helper started");
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "INIT") {
      this.stepsPerPage = payload.stepsPerPage || 6;
      this.initGpio(payload);
      this.loadRecipes();
    } else if (notification === "REQUEST_RECIPE") {
      this.sendRecipe(payload.id);
    }
  },

  setExpressApp: function (app) {
    this.setupHttpEndpoints(app);
  },

  setupHttpEndpoints: function (app) {
    var self = this;


    app.get("/receptbok/button/next", function (req, res) {
      console.log("MMM-Receptbok: HTTP NEXT triggered");
      self.sendSocketNotification("BUTTON_NEXT", {});
      res.json({ success: true, action: "next" });
    });

    app.get("/receptbok/button/return", function (req, res) {
      console.log("MMM-Receptbok: HTTP RETURN triggered");
      self.sendSocketNotification("BUTTON_RETURN", {});
      res.json({ success: true, action: "return" });
    });

    app.get("/receptbok/recipes", function (req, res) {
      if (!self.recipes || self.recipes.length === 0) {
        self.loadRecipes();
      }
      var list = (self.recipes || []).map(function (r) {
        return { id: r.id, title: r.title, tags: r.tags, prepTime: r.prepTime, servings: r.servings, timers: r.timers || [] };
      });
      res.json(list);
    });

    app.get("/receptbok/recipes/:id", function (req, res) {
      var recipe = (self.recipes || []).find(function (r) { return r.id === req.params.id; });
      if (!recipe) {
        res.status(404).json({ error: "Recipe not found" });
        return;
      }
      res.json(recipe);
    });

    app.get("/receptbok/tags", function (req, res) {
      var tagCounts = {};
      (self.recipes || []).forEach(function (r) {
        (r.tags || []).forEach(function (t) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      });
      res.json(tagCounts);
    });

    app.post("/receptbok/show/:id", function (req, res) {
      var recipe = (self.recipes || []).find(function (r) { return r.id === req.params.id; });
      if (!recipe) {
        res.status(404).json({ error: "Recipe not found" });
        return;
      }
      self.sendRecipe(recipe.id);
      res.json({ success: true, showing: recipe.title });
    });

    app.use("/receptbok/save", require("express").json());
    app.post("/receptbok/save", function (req, res) {
      var recipe = req.body;
      if (!recipe || !recipe.title) {
        res.status(400).json({ error: "Recipe must have a title" });
        return;
      }
      if (!recipe.id) {
        recipe.id = recipe.title
          .toLowerCase()
          .replace(/[^a-z0-9åäöñé]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      var filePath = path.join(__dirname, "recipes", recipe.id + ".json");
      try {
        fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2), "utf8");
        self.loadRecipes();
        res.json({ success: true, id: recipe.id });
      } catch (err) {
        console.error("MMM-Receptbok: Error saving recipe: " + err);
        res.status(500).json({ error: "Failed to save recipe" });
      }
    });

    app.use("/receptbok/delete", require("express").json());
    app.delete("/receptbok/delete/:id", function (req, res) {
      var id = req.params.id;
      var filePath = path.join(__dirname, "recipes", id + ".json");
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "Recipe not found" });
        return;
      }
      try {
        fs.unlinkSync(filePath);
        self.loadRecipes();
        res.json({ success: true, id: id });
      } catch (err) {
        console.error("MMM-Receptbok: Error deleting recipe: " + err);
        res.status(500).json({ error: "Failed to delete recipe" });
      }
    });

    // Timer management — Pi runs the countdown
    app.use("/receptbok/timer/start", require("express").json());
    app.post("/receptbok/timer/start", function (req, res) {
      var label = req.body && req.body.label;
      var minutes = req.body && req.body.minutes;
      if (!label || !minutes) {
        res.status(400).json({ error: "Need label and minutes" });
        return;
      }
      self.startTimer(label, minutes);
      res.json({ success: true, label: label, minutes: minutes });
    });

    app.use("/receptbok/timer/cancel", require("express").json());
    app.post("/receptbok/timer/cancel", function (req, res) {
      var label = req.query.label || (req.body && req.body.label);
      if (!label) {
        res.status(400).json({ error: "Need label" });
        return;
      }
      self.cancelTimer(label);
      res.json({ success: true, label: label });
    });

    app.get("/receptbok/timer/state", function (req, res) {
      res.json(self.activeTimers.map(function (t) {
        return { label: t.label, secondsLeft: t.secondsLeft, done: t.done };
      }));
    });

    // Serve the remote control page
    app.get("/receptbok/remote", function (req, res) {
      res.sendFile(path.join(__dirname, "remote_control.html"));
    });

    console.log("MMM-Receptbok: HTTP endpoints registered");
  },

  initGpio: function (payload) {
    var self = this;
    try {
      var Gpio = require("onoff").Gpio;
      var nextBtn = new Gpio(payload.gpioButtonNext, "in", "falling", { debounceTimeout: 50 });
      var returnBtn = new Gpio(payload.gpioButtonReturn, "in", "falling", { debounceTimeout: 50 });

      nextBtn.watch(function () {
        console.log("MMM-Receptbok: GPIO NEXT pressed");
        self.sendSocketNotification("BUTTON_NEXT", {});
      });

      returnBtn.watch(function () {
        console.log("MMM-Receptbok: GPIO RETURN pressed");
        self.sendSocketNotification("BUTTON_RETURN", {});
      });

      this.watchers.push(nextBtn, returnBtn);
      console.log("MMM-Receptbok: GPIO initialized on pins " + payload.gpioButtonNext + " and " + payload.gpioButtonReturn);
    } catch (err) {
      console.warn("MMM-Receptbok: GPIO unavailable (non-Pi system): " + err.message);
    }
  },

  loadRecipes: function () {

    var recipesDir = path.join(__dirname, "recipes");
    if (!fs.existsSync(recipesDir)) {
      fs.mkdirSync(recipesDir, { recursive: true });
    }

    var files = fs.readdirSync(recipesDir).filter(function (f) {
      return f.endsWith(".json");
    });

    this.recipes = [];
    for (var i = 0; i < files.length; i++) {
      try {
        var content = fs.readFileSync(path.join(recipesDir, files[i]), "utf8");
        var recipe = JSON.parse(content);
        this.recipes.push(recipe);
      } catch (err) {
        console.warn("MMM-Receptbok: Failed to parse " + files[i] + ": " + err.message);
      }
    }

    this.recipes.sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });

    console.log("MMM-Receptbok: Loaded " + this.recipes.length + " recipes");

    var list = this.recipes.map(function (r) {
      return { id: r.id, title: r.title, tags: r.tags, prepTime: r.prepTime, servings: r.servings };
    });
    try {
      this.sendSocketNotification("RECIPE_LIST", list);
    } catch (e) {
      // Socket not connected yet — frontend will get the list when INIT is called
    }
  },

  sendRecipe: function (id) {
    var recipe = this.recipes.find(function (r) { return r.id === id; });
    if (!recipe) return;

    var pages = this.paginateRecipe(recipe);
    this.sendSocketNotification("SHOW_RECIPE", {
      recipe: recipe,
      pages: pages
    });
  },

  paginateRecipe: function (recipe) {
    var pages = [];
    var steps = recipe.steps || [];
    var stepsPerPage = this.stepsPerPage;

    // Page 1 always gets ingredients + first batch of steps
    var firstPage = {
      ingredients: recipe.ingredients || [],
      steps: [],
      tips: null
    };

    // Screen: 768px wide x 1366px tall (portrait).
    // Header band: title(44px) + meta(24px) + padding(56px) + border ≈ 125px.
    // Body padding top+bottom: 64px.
    // Available body height: 1366 - 125 - 64 = 1177px.
    // Ingredients: section title+margin ~50px, group title ~22px, each row ~26px (2-col grid), section margin 20px.
    // Steps: section title+margin ~50px, each step ~48px (accounts for multi-line text).
    var bodyHeight = 1177;
    var ingHeight = 0;
    (recipe.ingredients || []).forEach(function (g) {
      var rows = Math.ceil(g.items.length / 2);
      ingHeight += (g.group !== "Ingredients" ? 22 : 0) + rows * 26;
    });
    // Section title + margin for ingredients block
    ingHeight += 70;
    var remainingForSteps = bodyHeight - ingHeight;
    var firstPageSteps = Math.max(2, Math.floor(remainingForSteps / 48));

    var stepIndex = 0;
    for (var i = 0; i < Math.min(firstPageSteps, steps.length); i++) {
      firstPage.steps.push({ number: stepIndex + 1, text: steps[stepIndex] });
      stepIndex++;
    }

    // If all steps fit on page 1, add tips there too
    if (stepIndex >= steps.length) {
      firstPage.tips = recipe.tips || null;
      pages.push(firstPage);
      return pages;
    }

    pages.push(firstPage);

    // Remaining steps go on subsequent pages (~22 steps fit without ingredients)
    var stepsOnlyPerPage = Math.max(stepsPerPage, Math.floor((bodyHeight - 70) / 48));
    while (stepIndex < steps.length) {
      var page = {
        ingredients: null,
        steps: [],
        tips: null
      };

      var pageStepCount = Math.min(stepsOnlyPerPage, steps.length - stepIndex);
      for (var j = 0; j < pageStepCount; j++) {
        page.steps.push({ number: stepIndex + 1, text: steps[stepIndex] });
        stepIndex++;
      }

      // Add tips to last page
      if (stepIndex >= steps.length) {
        page.tips = recipe.tips || null;
      }

      pages.push(page);
    }

    return pages;
  },

  startTimer: function (label, minutes) {
    // Cancel existing timer with same label
    this.cancelTimer(label);
    this.activeTimers.push({
      label: label,
      secondsLeft: minutes * 60,
      totalSeconds: minutes * 60,
      done: false
    });
    this.ensureTimerTick();
    this.broadcastTimers();
  },

  cancelTimer: function (label) {
    this.activeTimers = this.activeTimers.filter(function (t) {
      return t.label !== label;
    });
    this.broadcastTimers();
    if (this.activeTimers.length === 0) {
      this.stopTimerTick();
    }
  },

  ensureTimerTick: function () {
    if (this.timerInterval) return;
    var self = this;
    this.timerInterval = setInterval(function () {
      self.tickTimers();
    }, 1000);
  },

  stopTimerTick: function () {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  tickTimers: function () {
    var anyRunning = false;
    for (var i = 0; i < this.activeTimers.length; i++) {
      var t = this.activeTimers[i];
      if (!t.done) {
        t.secondsLeft--;
        if (t.secondsLeft <= 0) {
          t.secondsLeft = 0;
          t.done = true;
          this.sendSocketNotification("TIMER_DONE", { label: t.label });
          this.triggerLedAlert(t.label);
        } else {
          anyRunning = true;
        }
      }
    }
    this.broadcastTimers();
    if (!anyRunning) {
      this.stopTimerTick();
    }
  },

  broadcastTimers: function () {
    var payload = this.activeTimers.map(function (t) {
      return { label: t.label, secondsLeft: t.secondsLeft, done: t.done };
    });
    this.sendSocketNotification("TIMER_UPDATE", payload);
  },

  // Called whenever a timer reaches zero.
  // Stub ready for WS2812 LEDs via rpi-ws281x — wire up hardware then uncomment.
  triggerLedAlert: function (label) {
    console.log("MMM-Receptbok: Timer done — " + label);

    // --- WS2812 LED STUB ---
    // Install: npm install rpi-ws281x
    // Wiring:  DATA pin → GPIO 18 (PWM0), GND → GND, 5V → 5V rail
    //
    // var ws281x = require("rpi-ws281x");
    // var NUM_LEDS = 8;
    // ws281x.configure({ leds: NUM_LEDS, gpio: 18, brightness: 255 });
    //
    // Flash red 3 times then off
    // var flashes = 0;
    // var interval = setInterval(function () {
    //   var on = (flashes % 2 === 0);
    //   var pixels = new Uint32Array(NUM_LEDS);
    //   for (var i = 0; i < NUM_LEDS; i++) pixels[i] = on ? 0x00FF0000 : 0x00000000;
    //   ws281x.render(pixels);
    //   flashes++;
    //   if (flashes >= 6) { clearInterval(interval); ws281x.reset(); }
    // }, 400);
    // --- END WS2812 STUB ---
  },

  stop: function () {
    this.watchers.forEach(function (watcher) {
      watcher.unexport();
    });
  }
});
