Module.register("MMM-Images", {
  defaults: {
    imagePath: "modules/MMM-Images/images",
    autoReturnHours: 0
  },
  start() {
    this.images = [];
    this.index = 0;
    this.showing = false;
    this.loadImages();
    this.hide(); // start hidden
    this.timer = null;

    this.sendSocketNotification("INIT_GPIO", {
      gpioNext: this.config.gpioNext,
      gpioMain: this.config.gpioMain
    });
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "center";
    wrapper.style.alignItems = "center";

    if (this.images.length && this.showing) {
      const img = document.createElement("img");
      img.src = this.images[this.index];
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      wrapper.appendChild(img);
    }
    return wrapper;
  },

  socketNotificationReceived(notification) {
    if (notification === "NEXT_IMAGE") this.nextImage();
    if (notification === "RETURN_MAIN") this.returnMain();
  },

  loadImages() {
    this.images = this.file("images")
      ? this.file("images").split(",") : [];
    // In production, you’d fetch the directory listing from node_helper
  },

  nextImage() {
    if (!this.showing) {
      this.showing = true;
      this.show();
    } else {
      this.index = (this.index + 1) % this.images.length;
    }
    this.updateDom();

    if (this.config.autoReturnHours > 0) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.returnMain(),
          this.config.autoReturnHours * 3600 * 1000);
    }
  },

  returnMain() {
    this.showing = false;
    this.hide();
    clearTimeout(this.timer);
  }
});
