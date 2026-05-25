# MMM-InfoCentral Documentation Index

## 📚 Complete File Guide

### Core Module Files (Required)
| File | Purpose | Lines |
|------|---------|-------|
| **MMM-InfoCentral.js** | Main module logic & display control | 147 |
| **node_helper.js** | GPIO button handling, HTTP endpoints & image scanning | 117 |
| **MMM-InfoCentral.css** | Display styling for portrait mode | 26 |
| **package.json** | Dependencies (onoff library) | - |

### Documentation Files
| File | Purpose | Read Time |
|------|---------|-----------|
| **QUICKSTART.md** | ⭐ **START HERE** - Quick overview & setup | 5 min |
| **INSTALL.md** | Step-by-step installation guide | 10 min |
| **HTTP_TESTING.md** | Test buttons via URLs (no physical buttons needed) | 5 min |
| **README.md** | Complete feature documentation | 10 min |
| **CONFIG_TEMPLATE.js** | Configuration examples & GPIO reference | 5 min |
| **GPIO_WIRING.md** | GPIO pin layout & wiring diagrams | 5 min |
| **INDEX.md** | This file - documentation map | 5 min |

### Directories
| Directory | Purpose |
|-----------|---------|
| **images/** | Where you place your recipe images (JPG/PNG) |

---

## 🚀 Quick Start Path

For new users, follow this order:

1. **QUICKSTART.md** (5 min)
   - Overview of what was created
   - Key features summary
   - Quick next steps

2. **INSTALL.md** (10 min)
   - Detailed setup instructions
   - GPIO wiring guide
   - Troubleshooting

3. **Add Images** (2 min)
   - Copy JPG/PNG files to `images/` folder

4. **Update Config** (2 min)
   - Copy config from CONFIG_TEMPLATE.js to your config.js
   - Adjust GPIO pins if needed

5. **Test Without Physical Buttons** (3 min) - Optional
   - See **HTTP_TESTING.md** for URL-based button simulation
   - Test from browser, curl, or mobile device
   - Great for development before wiring GPIO

6. **Run Magic Mirror** (1 min)
   - Restart and enjoy!

---

## 📖 Detailed Documentation Path

For complete understanding:

1. **README.md**
   - Features overview
   - Installation steps
   - Configuration options
   - Usage instructions
   - Troubleshooting

2. **GPIO_WIRING.md**
   - GPIO pin layout diagrams
   - Wiring examples
   - Alternative pin options
   - Testing procedures

3. **HTTP_TESTING.md**
   - Test buttons via HTTP URLs
   - Browser, curl, Python, JavaScript examples
   - Mobile device control
   - Home automation integration (Home Assistant, Node-RED)

4. **CONFIG_TEMPLATE.js**
   - All configuration options explained
   - Multiple example configurations
   - GPIO pin reference
   - RPi pin layout included

---

## 🔧 Development Reference

### Code Structure

**MMM-InfoCentral.js** - Frontend Module
- `defaults`: Configuration defaults
- `start()`: Initialize module and GPIO
- `getDom()`: Render display (image or message)
- `socketNotificationReceived()`: Handle GPIO events
- `handleNextButton()`: Cycle images
- `handleReturnButton()`: Return to main
- `getStyles()`: Load CSS

**node_helper.js** - Backend Handler
- `start()`: Initialize watchers array
- `socketNotificationReceived()`: Receive INIT_GPIO notification
- `initGpio()`: Setup GPIO buttons (with error handling)
- `sendImageList()`: Scan directory and send image list
- `stop()`: Clean up GPIO on shutdown

### Key Features in Code

| Feature | Location | Lines |
|---------|----------|-------|
| GPIO initialization | node_helper.js | 19-38 |
| Button event handling | node_helper.js | 24-33 |
| Image scanning | node_helper.js | 50-88 |
| Image cycling | MMM-InfoCentral.js | 96-108 |
| Auto-return timer | MMM-InfoCentral.js | 121-135 |
| Error handling | MMM-InfoCentral.js | 110-121 |
| CSS styling | MMM-InfoCentral.css | 1-26 |

---

## 🎯 Common Tasks

### Task: Change GPIO Pin Numbers
1. Open `CONFIG_TEMPLATE.js` for reference
2. Edit your `config/config.js`
3. Change `gpioButtonNext` and `gpioButtonReturn` values
4. Restart Magic Mirror

### Task: Add More Images
1. Copy JPG/PNG files to `modules/MMM-InfoCentral/images/`
2. They will appear in alphabetical order
3. No restart needed

### Task: Enable Auto-Return
1. Edit `config/config.js`
2. Set `autoReturnHours: 2` (or desired hours)
3. Module will auto-return after that duration

### Task: Use Different GPIO Pins
1. Check alternative pins in **GPIO_WIRING.md**
2. Update `gpioButtonNext` and `gpioButtonReturn` in config
3. Wire buttons to new pins
4. Restart Magic Mirror

### Task: Troubleshoot GPIO Issues
1. Check **INSTALL.md** troubleshooting section
2. Review **GPIO_WIRING.md** for wiring verification
3. Check MagicMirror logs: `pm2 logs mm`
4. Test GPIO with `gpio readall` command

---

## 📝 File Contents Summary

### MMM-InfoCentral.js
- Main Magic Mirror module file
- Handles front-end logic and display
- Manages image state and cycling
- Controls show/hide animations
- Implements auto-return timeout

### node_helper.js
- Server-side backend component
- Initializes GPIO buttons on startup
- Watches GPIO pins for button presses
- Scans image directory for JPG/PNG files
- Sends image list to front-end
- Includes error handling for non-RPi systems

### MMM-InfoCentral.css
- Full-screen portrait layout
- Centered image display
- Aspect ratio preservation
- Error message styling
- Black background matching Magic Mirror theme

### package.json
- Module metadata
- Lists `onoff` as dependency for GPIO control

### CONFIG_TEMPLATE.js
- Configuration template with all options
- 3 example configurations
- Detailed option descriptions
- GPIO pin reference guide
- RPi pin layout diagram

### README.md
- Complete module documentation
- Features list
- Installation instructions
- Configuration reference
- Usage guide
- Troubleshooting section

### INSTALL.md
- Step-by-step setup instructions
- GPIO wiring diagram
- Configuration examples
- Detailed troubleshooting guide

### QUICKSTART.md
- Module overview
- What was created
- Key features
- Next steps guide
- Quick reference

### GPIO_WIRING.md
- RPi GPIO pin layout diagram
- Default wiring examples
- Alternative GPIO pin options
- Physical wiring diagrams
- Testing procedures
- Safety notes

---

## 🆘 Need Help?

### Check These First:
1. **QUICKSTART.md** - Overview and setup
2. **INSTALL.md** - Troubleshooting section
3. **README.md** - FAQ and known issues
4. **GPIO_WIRING.md** - Wiring verification

### Common Issues:
- No images? → Check `images/` folder has JPG/PNG files
- Buttons don't work? → Verify GPIO wiring in **GPIO_WIRING.md**
- Module won't load? → Check MagicMirror logs

### Magic Mirror Logs:
```bash
pm2 logs mm          # Real-time logs
pm2 logs mm --lines 50  # Last 50 lines
```

---

## 📊 Module Statistics

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~262 |
| JavaScript Files | 2 |
| CSS Files | 1 |
| Documentation Files | 6 |
| Configuration Files | 1 |
| Dependencies | 1 (onoff) |
| Supported Image Formats | 2 (JPG, PNG) |
| GPIO Pins Required | 2 |
| Required Node.js Version | 10.0+ |
| Required Magic Mirror Version | 2.0.0+ |

---

## 🔄 Version History

**v1.0.0** - Initial Release
- Complete GPIO button control
- Image cycling functionality
- Auto-return timer
- Error handling
- Full documentation

---

## 📄 License

MIT Licensed - Feel free to use and modify!

---

**Last Updated:** 2026-01-23

For more information or issues, check the documentation files above.
