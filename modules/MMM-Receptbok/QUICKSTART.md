# MMM-InfoCentral - Module Summary

## What Was Created

Your MMM-InfoCentral module is now ready for use! Here's what has been created:

### Core Files

1. **MMM-InfoCentral.js** - Main module file
   - Handles front-end display
   - Manages image cycling
   - Controls visibility and animations
   - Implements auto-return timer

2. **node_helper.js** - Server-side component
   - Initializes GPIO buttons on Raspberry Pi
   - Watches GPIO pins for button presses
   - Scans image directory and sends image list
   - Graceful error handling

3. **MMM-InfoCentral.css** - Styling
   - Full-screen portrait layout (1024x768 compatible)
   - Centered image display with proper aspect ratio
   - "No images found" and error messages styling
   - Black background matching Magic Mirror theme

4. **package.json** - Dependencies
   - Includes `onoff` library for GPIO control

### Documentation Files

5. **README.md** - Full module documentation
   - Features, installation, configuration
   - Usage instructions
   - Troubleshooting guide

6. **INSTALL.md** - Step-by-step setup guide
   - Quick start instructions
   - GPIO wiring diagram
   - Configuration examples
   - Troubleshooting

7. **CONFIG_TEMPLATE.js** - Configuration examples
   - Commented template with all options
   - GPIO pin descriptions
   - Multiple usage examples
   - RPi pin layout reference

8. **HTTP_TESTING.md** - HTTP endpoint testing guide
   - Test button presses via URLs without physical buttons
   - Examples for browser, curl, Python, JavaScript
   - Home automation integration
   - Mobile device control

### Directories

9. **images/** - Your recipe image directory
   - Place JPG/PNG images here
   - Images display in alphabetical order
   - Ready to accept your recipes

---

## Key Features Implemented

✅ **GPIO Button Control**
- Button A (GPIO 17): Next image / Activate
- Button B (GPIO 27): Return to main
- Fully configurable GPIO pins
- HTTP endpoints for testing without physical buttons

✅ **Image Management**
- Auto-discovers JPG/PNG files in alphabetical order
- Handles missing/corrupted images gracefully
- Portrait display optimization (1024x768)

✅ **Smart Display Control**
- First press of Button A activates display
- Subsequent presses cycle through images
- Button B instantly returns to main screen
- Optional auto-return after X hours

✅ **Error Handling**
- Shows "No images found" if directory empty
- Shows "Image unavailable" if image fails to load
- Auto-advances to next image on error
- Works on non-Pi systems (GPIO gracefully fails)

✅ **User-Friendly**
- No configuration file edits needed (use template)
- Clear logging and error messages
- Modular and maintainable code

---

## Next Steps

### 1. **Immediate Setup** (on Raspberry Pi)
```bash
cd ~/MagicMirror/modules/MMM-InfoCentral
npm install
```

### 2. **Add Images**
- Copy recipe images to `modules/MMM-InfoCentral/images/`
- Supported formats: JPG, JPEG, PNG
- Images display in alphabetical order

### 3. **Configure Magic Mirror**
- Copy config snippet from `CONFIG_TEMPLATE.js`
- Add to `~/MagicMirror/config/config.js`
- Or use defaults (GPIO 17 & 27)

### 4. **Wire GPIO Buttons** (or use HTTP testing)
- GPIO 17 (Pin 11) → Button A → Ground
- GPIO 27 (Pin 13) → Button B → Ground
- See `INSTALL.md` for detailed wiring
- **Don't have buttons yet?** See [HTTP_TESTING.md](HTTP_TESTING.md) for URL-based testing

### 5. **Restart Magic Mirror**
```bash
npm start
```

---

## Configuration Reference

**Minimal Config** (use GPIO 17 & 27):
```javascript
{
  module: "MMM-InfoCentral",
  position: "fullscreen_below"
}
```

**Full Config** (with all options):
```javascript
{
  module: "MMM-InfoCentral",
  position: "fullscreen_below",
  config: {
    gpioButtonNext: 17,           // GPIO pin for next image
    gpioButtonReturn: 27,         // GPIO pin for return
    autoReturnHours: 0,           // Auto-return after X hours (0=disabled)
    imageDir: "modules/MMM-InfoCentral/images",
    animationSpeed: 1000          // Fade animation speed
  }
}
```

---

## File Structure

```
modules/MMM-InfoCentral/
├── MMM-InfoCentral.js          (147 lines - Main module logic)
├── node_helper.js              (89 lines - GPIO & image loading)
├── MMM-InfoCentral.css         (26 lines - Styling)
├── package.json                (Dependencies)
├── README.md                   (Detailed documentation)
├── INSTALL.md                  (Setup guide)
├── CONFIG_TEMPLATE.js          (Configuration examples & GPIO reference)
├── QUICKSTART.md               (This file)
└── images/                     (Your recipe images directory)
    └── .gitkeep               (Placeholder)
```

---

## How It Works

1. **Module starts** → Initializes GPIO pins and loads image list
2. **User presses Button A** → Activates display with first image
3. **User presses Button A again** → Cycles to next image
4. **User presses Button B** → Returns to main Magic Mirror
5. **Auto-return** (if enabled) → Returns after specified hours
6. **Image error** → Auto-advances to next valid image

---

## Troubleshooting Quick Links

- **No images showing?** → Check `images/` directory has JPG/PNG files
- **Buttons don't work?** → Verify GPIO wiring and pin numbers
- **Don't have physical buttons?** → Use HTTP endpoints (see [HTTP_TESTING.md](HTTP_TESTING.md))
- **Module won't load?** → Check MagicMirror logs with `pm2 logs mm`
- **Dependencies fail?** → Run `npm install` in module directory

See `INSTALL.md` for detailed troubleshooting.

---

## Future Enhancements (Phase 2)

Planned features:
- 📱 Android app for Pixel 7
- 🔄 Remote image navigation via WiFi
- 📤 Image upload functionality
- 👀 Visual image browser
- 🔌 WebSocket real-time updates

---

## Support Resources

1. **INSTALL.md** - Setup and troubleshooting
2. **HTTP_TESTING.md** - Test buttons via URLs without physical hardware
3. **README.md** - Full feature documentation
4. **CONFIG_TEMPLATE.js** - Configuration examples
5. **MagicMirror Logs** - `pm2 logs mm`

---

**You're all set!** 🎉 Follow the steps above to get your kitchen recipe display up and running.
