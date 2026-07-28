// MMM-Receptbok Configuration Template
// Add this module configuration to your MagicMirror config.js modules array

{
  module: "MMM-Receptbok",
  position: "fullscreen_below",
  config: {
    // GPIO pin for "Next recipe / next page" button (default: 17)
    gpioButtonNext: 17,

    // GPIO pin for "Return to main screen" button (default: 27)
    gpioButtonReturn: 27,

    // Auto-return to main screen after X hours of inactivity (default: 1, set 0 to disable)
    autoReturnHours: 1,

    // Fade animation speed in milliseconds (default: 500)
    animationSpeed: 500,

    // Maximum number of recipe steps shown per page (default: 6)
    stepsPerPage: 6
  }
}

/*
 * EXAMPLE CONFIGURATIONS
 * ======================
 *
 * Minimal (uses all defaults):
 * {
 *   module: "MMM-Receptbok",
 *   position: "fullscreen_below"
 * }
 *
 * Custom GPIO pins, disable auto-return:
 * {
 *   module: "MMM-Receptbok",
 *   position: "fullscreen_below",
 *   config: {
 *     gpioButtonNext: 4,
 *     gpioButtonReturn: 22,
 *     autoReturnHours: 0
 *   }
 * }
 *
 * GPIO WIRING (Raspberry Pi)
 * ==========================
 *
 *   GPIO 17 (Pin 11) ──[Button A]── GND (Pin 6/9/14/20/30/34/39)
 *   GPIO 27 (Pin 13) ──[Button B]── GND
 *
 *   Optional: 10 kΩ pull-up resistor from each GPIO pin to 3.3V (Pin 1 or 17)
 *
 *   Common alternative GPIO pins: 4, 17, 22, 23, 24, 25, 27
 */
