const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start: function () {
    this.watchers = [];
    this.recipes = [];
    this.stepsPerPage = 6;
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
        return { id: r.id, title: r.title, tags: r.tags, prepTime: r.prepTime, servings: r.servings };
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

    // Calculate how many steps fit on page 1 (fewer because ingredients take space)
    var ingredientCount = 0;
    (recipe.ingredients || []).forEach(function (g) {
      ingredientCount += g.items.length;
    });
    var firstPageSteps = Math.max(2, stepsPerPage - Math.floor(ingredientCount / 4));

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

    // Remaining steps go on subsequent pages
    while (stepIndex < steps.length) {
      var page = {
        ingredients: null,
        steps: [],
        tips: null
      };

      var pageStepCount = Math.min(stepsPerPage, steps.length - stepIndex);
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

  stop: function () {
    this.watchers.forEach(function (watcher) {
      watcher.unexport();
    });
  }
});
