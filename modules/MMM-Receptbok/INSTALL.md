# MMM-InfoCentral Installation & Setup Guide

## Quick Start

### 1. **Copy Module Files** (Already Done!)
   - All module files are in `modules/MMM-InfoCentral/`
   - Directory structure:
     ```
     MMM-InfoCentral/
     ├── MMM-InfoCentral.js       (Main module)
     ├── node_helper.js            (GPIO handler & image loader)
     ├── MMM-InfoCentral.css       (Styling)
     ├── package.json              (Dependencies)
     ├── CONFIG_TEMPLATE.js        (Configuration examples)
     ├── README.md                 (Full documentation)
     ├── INSTALL.md                (This file)
     └── images/                   (Your recipe images go here)
     ```

### 2. **Add Images to Display**
   - Copy your recipe JPG/PNG images to `modules/MMM-InfoCentral/images/`
   - Images will be displayed in alphabetical order
   - Recommended size: Portrait orientation (e.g., 1024x768, 800x1280, etc.)

### 3. **Install Dependencies** (On Raspberry Pi)
   ```bash
   cd ~/MagicMirror/modules/MMM-InfoCentral
   npm install
   ```

### 4. **Add to config.js**
   Open `~/MagicMirror/config/config.js` and add this to your `modules` array:

   ```javascript
   {
     module: "MMM-InfoCentral",
     position: "fullscreen_below",
     config: {
       gpioButtonNext: 17,
       gpioButtonReturn: 27,
       autoReturnHours: 0
     }
   }
   ```

   See `CONFIG_TEMPLATE.js` for more detailed configuration options.

### 5. **Wire GPIO Buttons** (on Raspberry Pi)
   
   **Button A (Next Image):**
   - GPIO 17 (Pin 11) → Button → Ground (Pin 6/9/14/20/30/34/39)
   - Optional: 10K Ω pull-up resistor from GPIO 17 to 3.3V

   **Button B (Return to Main):**
   - GPIO 27 (Pin 13) → Button → Ground
   - Optional: 10K Ω pull-up resistor from GPIO 27 to 3.3V

   Alternatively, modify `gpioButtonNext` and `gpioButtonReturn` in config.js to use different GPIO pins.

### 6. **Restart Magic Mirror**
   ```bash
   cd ~/MagicMirror
   npm start
   ```
   
   Or use PM2 if configured:
   ```bash
   pm2 restart mm
   ```

---

## How to Use

1. **Press Button A (GPIO 17 - Next Image)**
   - **First press**: Displays the first image
   - **Subsequent presses**: Cycles to the next image alphabetically
   
2. **Press Button B (GPIO 27 - Return to Main)**
   - Returns to normal Magic Mirror display
   
3. **Auto-Return** (if enabled)
   - Automatically returns to main screen after configured hours
   - Disable by setting `autoReturnHours: 0` in config

---

## Configuration Options

See `CONFIG_TEMPLATE.js` for complete options. Here are the main ones:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gpioButtonNext` | number | 17 | GPIO pin for next image button |
| `gpioButtonReturn` | number | 27 | GPIO pin for return button |
| `autoReturnHours` | number | 0 | Hours until auto-return (0 = disabled) |
| `animationSpeed` | number | 1000 | Fade animation speed in ms |
| `imageDir` | string | `modules/MMM-InfoCentral/images` | Path to images |

---

## Troubleshooting

### **Module shows "No images found"**
- Verify images are in `modules/MMM-InfoCentral/images/`
- Check filenames end with `.jpg`, `.jpeg`, or `.png` (case-insensitive)
- Ensure images have read permissions: `chmod 644 images/*`

### **GPIO buttons don't work**
- Check GPIO pin numbers in config.js match your wiring
- Verify button wiring is correct (should go to Ground, not Power)
- Check RPi GPIO permissions:
  ```bash
  # Add your user to gpio group
  sudo usermod -a -G gpio $USER
  ```
- Reboot: `sudo reboot`

### **Can't install dependencies**
- Ensure Node.js is installed: `node --version`
- Try: `npm install --no-save onoff`

### **Module doesn't show in Magic Mirror**
- Check MagicMirror logs: `pm2 logs mm` or console output
- Ensure module is in config.js `modules` array
- Verify folder is named exactly `MMM-InfoCentral`
- Check for JavaScript errors in browser console (F12)

### **Images are stretched or distorted**
- Images use `object-fit: contain` to maintain aspect ratio
- Ensure source images have proper aspect ratio
- Check CSS in MMM-InfoCentral.css

---

## Advanced Configuration

### **Using Different GPIO Pins**

If you want to use different GPIO pins, modify config.js:
```javascript
{
  module: "MMM-InfoCentral",
  position: "fullscreen_below",
  config: {
    gpioButtonNext: 4,      // Changed from 17
    gpioButtonReturn: 22,   // Changed from 27
  }
}
```

**Common RPi GPIO pins:** 4, 17, 22, 23, 24, 25, 27, etc.

### **Auto-Return After 2 Hours**
```javascript
config: {
  gpioButtonNext: 17,
  gpioButtonReturn: 27,
  autoReturnHours: 2    // Return after 2 hours
}
```

---

## Future Enhancements (Phase 2)

Coming soon:
- Android app for Pixel 7
- Remote image control via WiFi
- Image upload functionality
- Visual image browser
- WebSocket support for real-time updates

---

## Support

For issues or questions:
1. Check logs: `pm2 logs mm`
2. Review README.md for detailed documentation
3. Check GPIO wiring with: `gpio readall` or `pinout`

---

## License

MIT Licensed
