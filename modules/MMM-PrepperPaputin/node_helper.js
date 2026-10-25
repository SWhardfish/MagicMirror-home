const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start: function () {
    this.items = [];
    this.isVisible = false;
    this.loadItems();
  },

  socketNotificationReceived: function (notification) {
    if (notification === "INIT") {
      this.broadcastItems();
      this.sendSocketNotification(this.isVisible ? "SHOW" : "HIDE");
    }
  },

  setExpressApp: function (app) {
    var self = this;
    app.use("/prepper-paputin", require("express").json());

    app.get("/prepper-paputin/items", function (req, res) {
      res.json(self.items);
    });
    app.post("/prepper-paputin/show", function (req, res) {
      self.isVisible = true;
      self.sendSocketNotification("SHOW");
      res.json({ success: true });
    });
    app.post("/prepper-paputin/hide", function (req, res) {
      self.isVisible = false;
      self.sendSocketNotification("HIDE");
      res.json({ success: true });
    });
    app.post("/prepper-paputin/save", function (req, res) {
      var item = req.body || {};
      item.title = String(item.title || "").trim();
      item.notes = String(item.notes || "").trim();
      item.checked = Boolean(item.checked);
      if (!item.title) return res.status(400).json({ error: "Item must have a title" });
      if (!item.id) item.id = "item-" + Date.now();
      var existing = self.items.findIndex(function (candidate) { return candidate.id === item.id; });
      if (existing === -1) self.items.push(item);
      else self.items[existing] = item;
      self.saveItems();
      res.json({ success: true, item: item });
    });
    app.post("/prepper-paputin/toggle/:id", function (req, res) {
      var item = self.items.find(function (candidate) { return candidate.id === req.params.id; });
      if (!item) return res.status(404).json({ error: "Item not found" });
      item.checked = !item.checked;
      self.saveItems();
      res.json({ success: true, item: item });
    });
    app.delete("/prepper-paputin/items/:id", function (req, res) {
      var originalLength = self.items.length;
      self.items = self.items.filter(function (item) { return item.id !== req.params.id; });
      if (self.items.length === originalLength) return res.status(404).json({ error: "Item not found" });
      self.saveItems();
      res.json({ success: true });
    });
    app.get("/prepper-paputin/remote", function (req, res) {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.sendFile(path.join(__dirname, "remote_control.html"));
    });
  },

  loadItems: function () {
    try {
      this.items = JSON.parse(fs.readFileSync(path.join(__dirname, "items.json"), "utf8"));
    } catch (err) {
      console.error("MMM-PrepperPaputin: Could not load items: " + err.message);
      this.items = [];
    }
  },

  saveItems: function () {
    fs.writeFileSync(path.join(__dirname, "items.json"), JSON.stringify(this.items, null, 2) + "\n", "utf8");
    this.broadcastItems();
  },

  broadcastItems: function () {
    this.sendSocketNotification("ITEMS", this.items);
  }
});
