Last working config in config.js


{
        module: "MMM-BusAlert",
        position: "top_left",
        config: {
          // Keep legacy single WLED:
          wledIP: "192.168.1.250",

          // Or, if/when you want to drive several WLEDs at once, use the array instead:
          // wledIPs: ["192.168.1.250", "192.168.1.251"],

          activeWindows: [
            { start: "07:00", end: "15:00" },
            { start: "15:00", end: "23:59" }
          ],

          watchSites: [
            {
              id: "1463",           // Mandelparken
              direction: 2,
              type: ["BUS"],
              lines: {
                "2": {
                  alertSeconds: 180,
                  color: [0, 0, 255, 0],   // blue
                  effect: 1,               // WLED "Blink"
                  // NEW: ramping (slow -> fast as ETA approaches)
                  // If omitted, defaults are speedMin=80, speedMax=(speed || 240)
                  speedMin: 80,
                  speedMax: 240,

                  // Kept from your original config
                  speed: 240,              // used as speedMax fallback in code
                  intensity: 2,
                  brightness: 255
                },
                "66": {
                  alertSeconds: 180,
                  color: [255, 0, 0, 0],   // red
                  effect: 1,
                  speedMin: 80,
                  speedMax: 240,

                  // Kept from your original config
                  speed: 240,
                  intensity: 2,
                  brightness: 255
                }
              }
            }
          ]
        }
      },