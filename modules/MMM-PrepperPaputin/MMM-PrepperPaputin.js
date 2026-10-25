Module.register("MMM-PrepperPaputin", {
  defaults: {
    animationSpeed: 500
  },

  start: function () {
    this.items = [];
    this.isVisible = false;
    this.wrapper = null;
    this.contentEl = null;
    this.sendSocketNotification("INIT");
  },

  getDom: function () {
    if (!this.wrapper) {
      this.wrapper = document.createElement("div");
      this.wrapper.className = "prepper-paputin-wrapper";
      this.contentEl = document.createElement("div");
      this.contentEl.className = "prepper-paputin-content";
      this.wrapper.appendChild(this.contentEl);
      this.render();
    }
    this.wrapper.classList.toggle("prepper-paputin-visible", this.isVisible);
    return this.wrapper;
  },

  render: function () {
    if (!this.contentEl) return;
    var complete = this.items.filter(function (item) { return item.checked; }).length;
    this.contentEl.innerHTML = "";

    var header = document.createElement("div");
    header.className = "prepper-paputin-header";
    header.innerHTML = "<div><div class=\"prepper-paputin-kicker\">ГОТОВНОСТЬ ДЛЯ НАРОДА</div><h1>Prepper Paputin</h1><p>Hemberedskap for minst en vecka</p></div><div class=\"prepper-paputin-progress\">" + complete + "/" + this.items.length + "</div>";
    this.contentEl.appendChild(header);

    var list = document.createElement("div");
    list.className = "prepper-paputin-list";
    this.items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "prepper-paputin-item" + (item.checked ? " prepper-paputin-item-checked" : "");
      row.innerHTML = "<span class=\"prepper-paputin-mark\">" + (item.checked ? "OK" : "") + "</span><div><div class=\"prepper-paputin-item-title\"></div><div class=\"prepper-paputin-item-notes\"></div></div>";
      row.querySelector(".prepper-paputin-item-title").textContent = item.title;
      row.querySelector(".prepper-paputin-item-notes").textContent = item.notes || "";
      list.appendChild(row);
    });
    this.contentEl.appendChild(list);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "ITEMS") {
      this.items = payload;
      this.render();
    } else if (notification === "SHOW") {
      this.isVisible = true;
      this.updateDom(0);
    } else if (notification === "HIDE") {
      this.isVisible = false;
      this.updateDom(this.config.animationSpeed);
    }
  },

  getStyles: function () {
    return ["MMM-PrepperPaputin.css"];
  }
});
