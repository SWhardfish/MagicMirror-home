const NodeHelper = require("node_helper");
const schedule = require("node-schedule");
const { spawn } = require("child_process");
const path = require("path");

module.exports = NodeHelper.create({
  jobs: [],
  gpioPin: 17,
  schedule: [],

  start() {
    console.log("MMM-LCDScheduler: Node helper started");
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "INIT_SCHEDULER") {
      this.initializeScheduler(payload);
    }
  },

  initializeScheduler(config) {
    this.gpioPin = config.gpioPin || 17;
    this.schedule = config.schedule || [];

    console.log(`MMM-LCDScheduler: Initializing with GPIO pin ${this.gpioPin}`);

    // Clear existing jobs
    this.jobs.forEach(job => job.cancel());
    this.jobs = [];

    // Create cron jobs for each scheduled action
    this.schedule.forEach(entry => {
      const [hour, minute] = entry.time.split(":");
      const cronExpression = `${minute} ${hour} * * *`; // Every day at HH:mm

      console.log(`MMM-LCDScheduler: Scheduling ${entry.action} at ${entry.time}`);

      const job = schedule.scheduleJob(cronExpression, () => {
        console.log(`MMM-LCDScheduler: Executing ${entry.action} action at ${new Date().toLocaleTimeString()}`);
        this.executeGpioPulse(entry.action);
      });

      this.jobs.push(job);
    });

    this.sendSocketNotification("SCHEDULER_READY");
  },

  executeGpioPulse(action, retries = 3) {
    const scriptPath = path.join(__dirname, "gpio_pulse.py");
    const attempt = 4 - retries; // Track which attempt we're on

    const process = spawn("python3", [scriptPath, this.gpioPin.toString()]);

    let stderr = "";

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        console.log(`MMM-LCDScheduler: GPIO pulse executed successfully (${action})`);
      } else if (retries > 1) {
        console.warn(
          `MMM-LCDScheduler: GPIO pulse failed (attempt ${attempt}/3), retrying... Error: ${stderr.trim()}`
        );
        // Retry after a short delay
        setTimeout(() => this.executeGpioPulse(action, retries - 1), 1000);
      } else {
        console.error(
          `MMM-LCDScheduler: GPIO pulse failed after 3 attempts (${action}). Error: ${stderr.trim()}`
        );
        this.sendSocketNotification("SCHEDULER_ERROR", {
          error: `Failed to execute ${action} after 3 attempts`
        });
      }
    });

    process.on("error", (err) => {
      if (retries > 1) {
        console.warn(
          `MMM-LCDScheduler: Process error on attempt ${attempt}/3, retrying... ${err.message}`
        );
        setTimeout(() => this.executeGpioPulse(action, retries - 1), 1000);
      } else {
        console.error(
          `MMM-LCDScheduler: Process error after 3 attempts. ${err.message}`
        );
        this.sendSocketNotification("SCHEDULER_ERROR", {
          error: `Process error: ${err.message}`
        });
      }
    });
  },

  stop() {
    console.log("MMM-LCDScheduler: Stopping scheduler");
    this.jobs.forEach(job => job.cancel());
    this.jobs = [];
  }
});
