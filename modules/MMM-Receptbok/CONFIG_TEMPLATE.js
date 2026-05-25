// MMM-InfoCentral Configuration Template
// Add this module configuration to your MagicMirror config.js modules array

{
  module: "MMM-InfoCentral",
  position: "fullscreen_below",
  config: {
    // ============================================================================
    // GPIO Configuration
    // ============================================================================

    // GPIO pin number for "Next Image" button (cycles images or activates display)
    // Default: 17
    // Common RPi GPIO pins: 4, 17, 27, 22, 23, 24, 25, etc.
    gpioButtonNext: 17,

    // GPIO pin number for "Return to Main" button (returns to main Magic Mirror)
    // Default: 27
    gpioButtonReturn: 27,

    // ============================================================================
    // Display Configuration
    // ============================================================================

    // Path to images directory relative to MagicMirror root
    // Default: "modules/MMM-InfoCentral/images"
    imageDir: "modules/MMM-InfoCentral/images",

    // Animation speed for transitions in milliseconds
    // Default: 1000 (1 second)
    animationSpeed: 1000,

    // ============================================================================
    // Auto-Return Configuration
    // ============================================================================

    // Automatically return to main Magic Mirror screen after X hours
    // Set to 0 to disable auto-return (default: 0)
    // Examples:
    //   0 = disabled (manual return only)
    //   1 = return after 1 hour
    //   2 = return after 2 hours
    //   8 = return after 8 hours
    autoReturnHours: 0
  }
}

/*
 * ============================================================================
 * EXAMPLE CONFIGURATIONS
 * ============================================================================
 *
 * Example 1: Basic configuration with GPIO pins 17 and 27
 * {
 *   module: "MMM-InfoCentral",
 *   position: "fullscreen_below",
 *   config: {
 *     gpioButtonNext: 17,
 *     gpioButtonReturn: 27
 *   }
 * }
 *
 * Example 2: With auto-return after 2 hours
 * {
 *   module: "MMM-InfoCentral",
 *   position: "fullscreen_below",
 *   config: {
 *     gpioButtonNext: 17,
 *     gpioButtonReturn: 27,
 *     autoReturnHours: 2
 *   }
 * }
 *
 * Example 3: Custom GPIO pins and directory
 * {
 *   module: "MMM-InfoCentral",
 *   position: "fullscreen_below",
 *   config: {
 *     gpioButtonNext: 4,
 *     gpioButtonReturn: 22,
 *     imageDir: "modules/MMM-InfoCentral/recipes",
 *     autoReturnHours: 1
 *   }
 * }
 *
 * ============================================================================
 * GPIO WIRING GUIDE (Raspberry Pi)
 * ============================================================================
 *
 * For GPIO 17 and GPIO 27 (shown in Example 1):
 *
 * GPIO 17 Button:
 *   - GPIO 17 (Pin 11) -> Button -> Ground (Pin 6 or 9 or 14 or 20 or 30 or 34 or 39)
 *   - Add 10K ohm pull-up resistor from GPIO 17 to 3.3V (Pin 1 or 17) (optional if using internal pull-up)
 *
 * GPIO 27 Button:
 *   - GPIO 27 (Pin 13) -> Button -> Ground
 *   - Add 10K ohm pull-up resistor from GPIO 27 to 3.3V (optional if using internal pull-up)
 *
 * Standard RPi GPIO Pin Layout:
 * Pin 1: 3.3V         | Pin 2: 5V
 * Pin 3: GPIO 2 (SDA) | Pin 4: 5V
 * Pin 5: GPIO 3 (SCL) | Pin 6: Ground
 * Pin 7: GPIO 4       | Pin 8: GPIO 14 (TX)
 * Pin 9: Ground       | Pin 10: GPIO 15 (RX)
 * Pin 11: GPIO 17     | Pin 12: GPIO 18
 * Pin 13: GPIO 27     | Pin 14: Ground
 * ...
 *
 * ============================================================================
 */
