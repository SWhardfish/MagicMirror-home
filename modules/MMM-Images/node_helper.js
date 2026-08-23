const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");
const Gpio = require("onoff").Gpio;

module.exports = NodeHelper.create({
  start() { this.watchers = []; },

  socketNotificationReceived(notification, payload) {
    if (notification === "INIT_GPIO") {
      const nextBtn = new Gpio(payload.gpioNext, 'in', 'falling', {debounceTimeout: 50});
      const mainBtn = new Gpio(payload.gpioMain, 'in', 'falling', {debounceTimeout: 50});

      nextBtn.watch(() => this.sendSocketNotification("NEXT_IMAGE"));
      mainBtn.watch(() => this.sendSocketNotification("RETURN_MAIN"));
      this.watchers.push(nextBtn, mainBtn);

      // send file list
      const imgDir = path.join(__dirname, "images");
      const files = fs.readdirSync(imgDir)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .sort()
        .map(f => "modules/MMM-RecipePage/images/" + f);
      this.sendSocketNotification("IMAGE_LIST", files);
    }
  },

  stop() {
    this.watchers.forEach(w => w.unexport());
  }
});
