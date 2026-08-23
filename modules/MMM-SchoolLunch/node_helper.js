/* MMM-SchoolLunch Node Helper */
const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
  start: function () {
    console.log("MMM-SchoolLunch helper started");
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "GET_LUNCH") {
      this.getLunch(payload);
    }
  },

  getLunch: function (url) {
    const self = this;
    fetch(url)
      .then((res) => res.text())
      .then((html) => {
        const match = html.match(
          /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
        );
        if (!match) return self.sendSocketNotification("LUNCH_RESULT", null);

        const json = JSON.parse(match[1]);
        const meals = json?.props?.pageProps?.meals || [];
        self.sendSocketNotification("LUNCH_RESULT", meals);
      })
      .catch((err) => {
        console.error("MMM-SchoolLunch fetch error:", err);
        self.sendSocketNotification("LUNCH_RESULT", null);
      });
  },
});

