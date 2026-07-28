Module.register("MMM-LCDScheduler", {
  defaults: {
    gpioPin: 17
  },

  start() {
    Log.log("MMM-LCDScheduler: Module started");
    this.sendSocketNotification("INIT_SCHEDULER", {
      gpioPin: this.config.gpioPin,
      schedule: this.config.schedule
    });
  },

  getDom() {
    // Module is invisible - return empty element
    const wrapper = document.createElement("div");
    wrapper.style.display = "none";
    return wrapper;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "SCHEDULER_READY") {
      Log.log("MMM-LCDScheduler: Scheduler initialized");
    } else if (notification === "SCHEDULER_ERROR") {
      Log.error("MMM-LCDScheduler: " + payload.error);
    }
  }
});
