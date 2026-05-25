# HTTP Testing Endpoints for MMM-InfoCentral

## Overview

MMM-InfoCentral provides HTTP endpoints that allow you to simulate button presses without physical GPIO buttons. This is useful for:
- **Testing** the module before wiring physical buttons
- **Development** on non-Raspberry Pi systems
- **Remote control** from other devices on your network
- **Automation** via scripts or smart home systems

---

## Available Endpoints

### 1. Next Image Button (Simulate Button A)
**URL:** `http://<your-mirror-ip>:<port>/infocentral/button/next`  
**Method:** GET  
**Description:** Simulates pressing the "Next" button to advance to the next image or enter the image viewer.

**Example Response:**
```json
{
  "success": true,
  "button": "next",
  "message": "Next image button pressed"
}
```

### 2. Return to Main Button (Simulate Button B)
**URL:** `http://<your-mirror-ip>:<port>/infocentral/button/return`  
**Method:** GET  
**Description:** Simulates pressing the "Return" button to go back to the main Magic Mirror screen.

**Example Response:**
```json
{
  "success": true,
  "button": "return",
  "message": "Return to main screen button pressed"
}
```

---

## Usage Examples

### From a Web Browser
Simply open your browser and navigate to:
```
http://localhost:8080/infocentral/button/next
http://localhost:8080/infocentral/button/return
```

Replace `localhost` with your Raspberry Pi's IP address if accessing remotely.

---

### Using curl (Command Line)

**On Windows (PowerShell):**
```powershell
# Press Next button
Invoke-WebRequest -Uri "http://localhost:8080/infocentral/button/next"

# Press Return button
Invoke-WebRequest -Uri "http://localhost:8080/infocentral/button/return"
```

**On Linux/macOS/Raspberry Pi (bash):**
```bash
# Press Next button
curl http://localhost:8080/infocentral/button/next

# Press Return button
curl http://localhost:8080/infocentral/button/return
```

---

### Using Python Script

```python
import requests

# Mirror URL
mirror_url = "http://localhost:8080"

# Simulate Next button press
response = requests.get(f"{mirror_url}/infocentral/button/next")
print(response.json())

# Simulate Return button press
response = requests.get(f"{mirror_url}/infocentral/button/return")
print(response.json())
```

---

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const mirrorUrl = 'http://localhost:8080';

// Simulate Next button
axios.get(`${mirrorUrl}/infocentral/button/next`)
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Simulate Return button
axios.get(`${mirrorUrl}/infocentral/button/return`)
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

---

### From a Smartphone/Tablet

1. **Find your Raspberry Pi's IP address:**
   ```bash
   hostname -I
   ```

2. **Create bookmarks in your mobile browser:**
   - Bookmark: `http://192.168.1.100:8080/infocentral/button/next` (Next Image)
   - Bookmark: `http://192.168.1.100:8080/infocentral/button/return` (Return to Main)

3. Tap the bookmarks to control your Magic Mirror!

---

## Home Automation Integration

### Home Assistant
Add to your `configuration.yaml`:

```yaml
rest_command:
  mm_next_image:
    url: "http://192.168.1.100:8080/infocentral/button/next"
    method: GET
  
  mm_return_main:
    url: "http://192.168.1.100:8080/infocentral/button/return"
    method: GET
```

Then create buttons in your dashboard or automations.

### Node-RED
Use an HTTP Request node:
- **Method:** GET
- **URL:** `http://localhost:8080/infocentral/button/next`

---

## Security Considerations

### IP Whitelist
By default, MagicMirror may restrict access to certain IPs. Check your `config.js`:

```javascript
ipWhitelist: [
  "127.0.0.1",
  "::ffff:127.0.0.1",
  "::1",
  "::ffff:192.168.1.0/24"  // Allow local network
]
```

### Port Configuration
The default port is `8080`. Check your `config.js`:

```javascript
port: 8080,
address: "0.0.0.0"  // Listen on all network interfaces
```

---

## Testing Workflow

1. **Start your Magic Mirror**
   ```bash
   npm start
   ```

2. **Open a terminal/browser on another device**

3. **Test the endpoints:**
   ```bash
   curl http://<pi-ip>:8080/infocentral/button/next
   curl http://<pi-ip>:8080/infocentral/button/return
   ```

4. **Observe the logs:**
   - Check the console for `MMM-InfoCentral: HTTP NEXT button triggered`
   - Watch the Magic Mirror screen transition

5. **Once satisfied, install physical buttons** (see `GPIO_WIRING.md`)

---

## Troubleshooting

### "Cannot connect" or timeout errors
- ✅ Verify Magic Mirror is running
- ✅ Check the IP address and port
- ✅ Ensure firewall allows connections on port 8080
- ✅ Verify `ipWhitelist` in `config.js` includes your IP

### Endpoints return 404
- ✅ Ensure MMM-InfoCentral is loaded in `config.js`
- ✅ Restart Magic Mirror after installing the module
- ✅ Check logs for "HTTP endpoints registered" message

### Button presses work but nothing happens
- ✅ Verify images exist in `modules/MMM-InfoCentral/images/`
- ✅ Check image files are `.jpg`, `.jpeg`, or `.png`
- ✅ Look for errors in the console/logs

---

## Advanced: Creating a Simple Web Interface

MMM-InfoCentral includes a ready-to-use web interface: **`remote_control.html`**

Simply open this file in any browser (on your computer or mobile device) to get a beautiful control panel with:
- Configurable Mirror URL (saved to browser)
- Large touch-friendly buttons
- Visual feedback for button presses
- Keyboard shortcuts (Arrow keys, N/B)
- Responsive design for mobile devices

**To use:**
1. Open `modules/MMM-InfoCentral/remote_control.html` in your browser
2. Enter your Magic Mirror's IP address (e.g., `http://192.168.1.100:8080`)
3. Click the buttons or use keyboard shortcuts!

---

### DIY: Build Your Own Custom Interface

You can also create a custom HTML page to control your Magic Mirror:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Magic Mirror Remote</title>
  <style>
    button {
      padding: 20px 40px;
      font-size: 20px;
      margin: 10px;
    }
  </style>
</head>
<body>
  <h1>Magic Mirror Remote Control</h1>
  
  <button onclick="pressNext()">Next Image →</button>
  <button onclick="pressReturn()">← Return to Main</button>
  
  <script>
    const mirrorUrl = 'http://192.168.1.100:8080'; // Change to your Pi IP
    
    function pressNext() {
      fetch(`${mirrorUrl}/infocentral/button/next`)
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(error => alert('Error: ' + error));
    }
    
    function pressReturn() {
      fetch(`${mirrorUrl}/infocentral/button/return`)
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(error => alert('Error: ' + error));
    }
  </script>
</body>
</html>
```

Save as `remote.html` and open in any browser on your network.

---

## Logging

When using HTTP endpoints, you'll see these log messages:

```
[MMM-InfoCentral] HTTP NEXT button triggered
[MMM-InfoCentral] HTTP RETURN button triggered
```

These appear in the same console logs as physical button presses.

---

## Future: Android App Integration

The HTTP endpoints will also be used by the planned Android app for:
- Button simulation (Next/Return)
- Image upload
- Image selection from gallery view

The app will communicate with these same endpoints + additional ones for image management.

---

## Related Documentation

- [README.md](README.md) - Module overview
- [GPIO_WIRING.md](GPIO_WIRING.md) - Physical button setup
- [INSTALL.md](INSTALL.md) - Installation guide
- [CONFIG_TEMPLATE.js](CONFIG_TEMPLATE.js) - Configuration options
