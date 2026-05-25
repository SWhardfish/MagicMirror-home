# MMM-InfoCentral Directory Structure

## Complete File Tree

```
MagicMirror/
└── modules/
    └── MMM-InfoCentral/                          ← Your new module
        │
        ├── 🔧 CORE MODULE FILES
        │   ├── MMM-InfoCentral.js               ✅ Main module (147 lines)
        │   ├── node_helper.js                   ✅ GPIO & HTTP handler (117 lines)
        │   ├── MMM-InfoCentral.css              ✅ Styling (26 lines)
        │   └── package.json                     ✅ Dependencies
        │
        ├── 🌐 REMOTE CONTROL & TESTING
        │   ├── remote_control.html              🎮 Web-based remote control UI
        │   ├── HTTP_TESTING.md                  🧪 HTTP endpoint documentation
        │   └── HTTP_QUICK_REFERENCE.md          ⚡ Quick testing guide
        │
        ├── 📖 DOCUMENTATION
        │   ├── QUICKSTART.md                    ⭐ START HERE (5 min read)
        │   ├── INSTALL.md                       📋 Setup guide (10 min)
        │   ├── README.md                        📚 Full documentation
        │   ├── CONFIG_TEMPLATE.js               ⚙️ Configuration examples
        │   ├── GPIO_WIRING.md                   🔌 GPIO pin reference
        │   ├── INDEX.md                         📑 Documentation index
        │   ├── DIRECTORY_STRUCTURE.md           📂 This file
        │   └── CHECKLIST.md                     ✅ Pre-deployment checklist
        │
        └── 📁 IMAGES DIRECTORY
            └── images/
                └── .gitkeep                     (placeholder)
                └── (your recipe images go here)
                    ├── Recipe1.jpg
                    ├── Recipe2.png
                    ├── Recipe3.jpg
                    └── ...
```

---

## File Descriptions

### Core Module Files

#### **MMM-InfoCentral.js** (Main Module)
```javascript
Module.register("MMM-InfoCentral", {
  defaults: { ... },
  start() { ... },
  getDom() { ... },
  socketNotificationReceived() { ... },
  handleNextButton() { ... },
  handleReturnButton() { ... },
  ...
})
```
**Responsibility:**
- Front-end display logic
- Image array management
- Button event handling
- Auto-return timer control
- DOM generation

---

#### **node_helper.js** (Back-End Handler)
```javascript
module.exports = NodeHelper.create({
  start() { ... },
  socketNotificationReceived() { ... },
  setExpressApp() { ... },
  setupHttpEndpoints() { ... },
  initGpio() { ... },
  sendImageList() { ... },
  ...
})
```
**Responsibility:**
- GPIO button initialization
- HTTP endpoint registration
- Image directory scanning
- File filtering (JPG/PNG)
- Socket communication
- Error handling

---

#### **MMM-InfoCentral.css** (Styling)
```css
.mmm-infocentral-wrapper { ... }
.mmm-infocentral-image { ... }
.mmm-infocentral-no-images { ... }
.mmm-infocentral-unavailable { ... }
```
**Responsibility:**
- Full-screen layout
- Image centering
- Aspect ratio preservation
- Error message styling

---

#### **package.json** (Dependencies)
```json
{
  "name": "MMM-InfoCentral",
  "version": "1.0.0",
  "dependencies": {
    "onoff": "^6.0.0"
  }
}
```
**Contains:**
- Module metadata
- Version information
- Dependency list (onoff for GPIO)

---

### Documentation Files

#### **QUICKSTART.md** (⭐ READ FIRST)
- Module overview
- What was created
- Key features
- Quick next steps
- 5-minute read

#### **INSTALL.md** (Setup Guide)
- Step-by-step installation
- Image directory setup
- Dependency installation
- Configuration steps
- GPIO wiring guide
- Detailed troubleshooting

#### **README.md** (Complete Documentation)
- Features overview
- Installation instructions
- Configuration reference
- Usage guide
- Troubleshooting section
- Code structure
- Examples

#### **CONFIG_TEMPLATE.js** (Configuration)
- Template configuration
- All options explained
- 3 usage examples
- GPIO pin reference
- RPi pin layout diagram
- Comments on each option

#### **GPIO_WIRING.md** (GPIO Reference)
- RPi GPIO pin layout
- Default wiring diagram
- Wiring with pull-up resistors
- Alternative GPIO pin options
- Physical button wiring
- Testing procedures
- Safety notes

#### **INDEX.md** (Documentation Map)
- File inventory table
- Documentation paths
- Code structure
- Development reference
- Common tasks
- Quick links

#### **CHECKLIST.md** (Pre-Deployment)
- Files created checklist
- Features implemented
- Quality assurance
- Pre-deployment tasks
- Testing checklist
- Verification list

---

## Directory Size Summary

### Core Files
- **MMM-InfoCentral.js:** 147 lines (~4 KB)
- **node_helper.js:** 89 lines (~2 KB)
- **MMM-InfoCentral.css:** 26 lines (~0.5 KB)
- **package.json:** 9 lines (~0.2 KB)
- **TOTAL CORE:** ~6.7 KB

### Documentation Files
- **README.md:** ~200 lines (~8 KB)
- **INSTALL.md:** ~300 lines (~12 KB)
- **QUICKSTART.md:** ~200 lines (~8 KB)
- **CONFIG_TEMPLATE.js:** ~150 lines (~6 KB)
- **GPIO_WIRING.md:** ~200 lines (~8 KB)
- **INDEX.md:** ~200 lines (~8 KB)
- **CHECKLIST.md:** ~200 lines (~8 KB)
- **TOTAL DOCS:** ~58 KB

### Total Module Size
- **Code:** ~6.7 KB
- **Documentation:** ~58 KB
- **GRAND TOTAL:** ~65 KB (very lightweight!)

---

## File Dependencies

```
config/config.js
    ↓ (references module)
MMM-InfoCentral.js
    ├─→ node_helper.js (via socket)
    └─→ MMM-InfoCentral.css (via getStyles)

node_helper.js
    ├─→ node_helper base class
    ├─→ fs module (file reading)
    ├─→ path module (path handling)
    └─→ onoff module (GPIO control)
        └─→ RPi GPIO pins (hardware)

images/ directory
    ├─→ scanned by node_helper.js
    └─→ displayed by MMM-InfoCentral.js
```

---

## Configuration Flow

```
User Config (config.js)
    ↓
MMM-InfoCentral.js reads config
    ↓ sendSocketNotification("INIT_GPIO", config)
node_helper.js receives INIT_GPIO
    ↓
initGpio(config)
    ├─ Initialize GPIO pins
    ├─ Scan image directory
    └─ Send image list back
    ↓ sendSocketNotification("IMAGE_LIST", images)
MMM-InfoCentral.js receives IMAGE_LIST
    ↓
Module ready to display images
```

---

## Data Flow on Button Press

```
Physical Button Press (GPIO Pin)
    ↓
node_helper.js detects falling edge
    ↓
Sends socket notification to front-end
    ├─ "BUTTON_NEXT" → handleNextButton()
    └─ "BUTTON_RETURN" → handleReturnButton()
    ↓
MMM-InfoCentral.js handles event
    ├─ Updates state (isActive, currentIndex)
    ├─ Manages auto-return timer
    └─ Calls updateDom()
    ↓
getDom() regenerates display
    ├─ Shows current image OR
    ├─ Shows "No images" OR
    ├─ Shows "Image unavailable"
    ↓
Magic Mirror renders new DOM
    ↓
User sees image or message
```

---

## Image Scanning Process

```
node_helper.js starts
    ↓
Receives "INIT_GPIO" notification
    ↓
sendImageList() called
    ├─ Check if images/ directory exists
    │   ↓ NO → Send empty list
    │   ↓ YES → Continue
    │
    ├─ Read directory contents
    │   ↓ ERROR → Send empty list
    │   ↓ SUCCESS → Continue
    │
    ├─ Filter files
    │   ├─ Keep: *.jpg, *.jpeg, *.png
    │   ├─ Drop: All others
    │   ↓
    │
    ├─ Sort alphabetically
    │   ↓
    │
    └─ Send to front-end
        ↓
MMM-InfoCentral.js receives image list
    ↓
Stores in this.images array
    ↓
Ready for display
```

---

## Quick File Access Guide

### I want to...

**Install the module**
→ Follow `INSTALL.md`

**Configure GPIO pins**
→ Edit `CONFIG_TEMPLATE.js` section and copy to `config/config.js`

**Understand GPIO wiring**
→ Check `GPIO_WIRING.md`

**Read about all features**
→ Read `README.md`

**See code structure**
→ Review `INDEX.md` (Code Structure section)

**Check what was created**
→ Read `QUICKSTART.md`

**Prepare for deployment**
→ Use `CHECKLIST.md`

**Understand how it works**
→ This file (Directory Structure section)

---

## Module Integration Points

### With Magic Mirror Core
```
MMM-InfoCentral.js extends Module
    ├─ start() → Called on startup
    ├─ getDom() → Called to render
    ├─ suspend() → Called on hide
    ├─ resume() → Called on show
    └─ getStyles() → Load CSS
```

### With Socket.io
```
MMM-InfoCentral.js ←→ node_helper.js
    ├─ MMM sends: "INIT_GPIO"
    ├─ Helper sends: "IMAGE_LIST"
    ├─ Helper sends: "BUTTON_NEXT"
    └─ Helper sends: "BUTTON_RETURN"
```

### With GPIO Hardware
```
node_helper.js ←→ RPi GPIO via onoff
    ├─ Watch GPIO 17 (Button A)
    ├─ Watch GPIO 27 (Button B)
    └─ Send events on press
```

### With File System
```
node_helper.js ←→ images/ directory
    ├─ Check directory exists
    ├─ Read file list
    ├─ Filter JPG/PNG
    └─ Build image paths
```

---

## Deployment Checklist by File

### Before Deploying

**Check These Files:**
- [ ] `package.json` - Dependencies correct
- [ ] `MMM-InfoCentral.js` - No syntax errors
- [ ] `node_helper.js` - GPIO setup correct
- [ ] `MMM-InfoCentral.css` - Styling applied
- [ ] `CONFIG_TEMPLATE.js` - Config options clear
- [ ] `GPIO_WIRING.md` - Wiring verified
- [ ] `images/` - Directory exists and empty

**Before Running:**
- [ ] Dependencies installed: `npm install`
- [ ] Config updated in `config.js`
- [ ] GPIO pins wired correctly
- [ ] Test images added to `images/`

---

## Maintenance Notes

### Adding New Features
1. Modify `MMM-InfoCentral.js` for front-end
2. Modify `node_helper.js` for back-end
3. Update `MMM-InfoCentral.css` for styling
4. Document in `README.md`
5. Add config option to `CONFIG_TEMPLATE.js`
6. Update `CHECKLIST.md` if needed

### Troubleshooting
1. Check `INSTALL.md` troubleshooting section
2. Review `GPIO_WIRING.md` for hardware
3. Check `pm2 logs mm` for errors
4. Test GPIO: `gpio readall`

---

**All files are in:** `modules/MMM-InfoCentral/`

**Start with:** `QUICKSTART.md`

**Then follow:** `INSTALL.md`
