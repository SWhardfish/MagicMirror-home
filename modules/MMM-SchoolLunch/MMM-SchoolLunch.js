/* Magic Mirror
 * Module: MMM-SchoolLunch
 * By Anders Rylander
 */

Module.register("MMM-SchoolLunch", {
  defaults: {
    schoolId: "67f610892852a0caabdf111b_sodra-latins-gymnasium", // default school
    title: "School Lunch", // configurable title
    updateInterval: 6 * 60 * 60 * 1000, // default: 6 hours
    fallbackText: "No lunch today",
    showVegetarian: true
  },

  start: function () {
    this.lunch = null;
    this.vegLunch = null;

    // Construct URL dynamically from schoolId
    this.config.url = `https://menu.matildaplatform.com/sv/meals/${this.config.schoolId}`;

    this.getData();
    setInterval(() => this.getData(), this.config.updateInterval);
  },

  getDom: function () {
    const wrapper = document.createElement("div");

    // Always show title
    const title = document.createElement("div");
    title.className = "schoolLunchTitle";

    // Optional icon before text
    if (this.config.symbol) {
      const icon = document.createElement("i");
      icon.className = `fas fa-${this.config.symbol}`;
      if (this.config.symbolColor) {
        icon.style.color = this.config.symbolColor;
      }
      icon.style.marginRight = "6px"; // space before text
      title.appendChild(icon);
    }

    title.appendChild(document.createTextNode(this.config.title || "School Lunch"));
    wrapper.appendChild(title);

    if (this.lunch) {
      // Row 2 — Main lunch
      const main = document.createElement("div");
      main.className = "schoolLunchItem";
      main.textContent = this.lunch;
      wrapper.appendChild(main);

      // Row 3 — Vegetarian (optional)
      if (this.config.showVegetarian && this.vegLunch) {
        const veg = document.createElement("div");
        veg.className = "schoolLunchVeg";
        veg.textContent = this.vegLunch;
        wrapper.appendChild(veg);
      }
    } else {
      // Fallback when no lunch is available
      const noLunch = document.createElement("div");
      noLunch.className = "schoolLunchItem noLunch";
      noLunch.textContent = this.config.fallbackText || "No lunch today";
      wrapper.appendChild(noLunch);
    }

    return wrapper;
  },

  getData: function () {
    this.sendSocketNotification("GET_LUNCH", this.config.url);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "LUNCH_RESULT") {
      if (!payload || payload.length === 0) {
        this.lunch = null;
        this.vegLunch = null;
      } else {
        const mainLunch = payload.find((m) => m.name === "Dagens lunch");
        const vegLunch = payload.find((m) => m.name === "Vegetarisk");

        this.lunch = mainLunch?.courses?.[0]?.name || null;
        this.vegLunch = vegLunch?.courses?.[0]?.name || null;
      }
      this.updateDom();
    }
  },
});
