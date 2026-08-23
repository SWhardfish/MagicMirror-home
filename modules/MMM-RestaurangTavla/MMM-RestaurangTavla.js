/* MMM-RestaurangTavla
 * A clone of MMM-SchoolLunch but fetching lunch data from
 * https://sodralatin.restaurangtavla.se/
 *
 * Each weekday has two lines: normal + veg.
 * Module should display same as original MMM-SchoolLunch.
 */

Module.register("MMM-RestaurangTavla", {
    defaults: {
        updateInterval: 60 * 60 * 1000,
        animationSpeed: 1000,
        showVegetarian: true,
        debug: false,
        fallbackText: "No lunch available",
        checkWeekNumber: false
    },

    start() {
        this.lunchData = null;
    },

    notificationReceived(notification) {
        if (notification === "ALL_MODULES_STARTED") {
            this.getData();
            setInterval(() => this.getData(), this.config.updateInterval);
        }
    },

    getData() {
        this.sendSocketNotification("GET_LUNCH_DATA", {
            url: "https://sodralatin.restaurangtavla.se/Index",
            debug: this.config.debug
        });
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "LUNCH_DATA") {
            this.lunchData = payload;
            this.updateDom(this.config.animationSpeed);
        }
    },

    getDom: function () {
        const wrapper = document.createElement("div");
        // We add this class so your custom.css rules for .MMM-SchoolLunch apply here
        wrapper.className = "MMM-SchoolLunch";

        if (!this.lunchData || !this.lunchData.normal) {
            const noLunch = document.createElement("div");
            noLunch.className = "schoolLunchItem noLunch";
            noLunch.textContent = this.config.fallbackText || "No lunch today";
            wrapper.appendChild(noLunch);
            return wrapper;
        }

        // 1. Title Row (Icon + Text)
        const title = document.createElement("div");
        title.className = "schoolLunchTitle";

        if (this.config.symbol) {
            const icon = document.createElement("i");
            // Use 'fas' for Font Awesome 5 solid icons (like 'school')
            icon.className = "fas fa-" + this.config.symbol;
            if (this.config.symbolColor) {
                icon.style.color = this.config.symbolColor;
            }
            icon.style.marginRight = "6px";
            title.appendChild(icon);
        }

        title.appendChild(document.createTextNode(this.config.title || "School Lunch"));
        wrapper.appendChild(title);

        // 2. Main Dish (Normal)
        const main = document.createElement("div");
        main.className = "schoolLunchItem";
        main.textContent = this.lunchData.normal;
        wrapper.appendChild(main);

        // 3. Vegetarian Dish (Green)
        if (this.config.showVegetarian && this.lunchData.veg) {
            const veg = document.createElement("div");
            veg.className = "schoolLunchVeg";
            veg.textContent = this.lunchData.veg;
            wrapper.appendChild(veg);
        }

        return wrapper;
    }
});
