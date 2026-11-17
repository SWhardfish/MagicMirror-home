Module.register("MMM-Monitoring", {
  start: function () {
    this.sendSocketNotification("MONITORING_START");
  },

  getDom: function () {
    var wrapper = document.createElement("div");
    wrapper.style.display = "none";
    return wrapper;
  }
});
