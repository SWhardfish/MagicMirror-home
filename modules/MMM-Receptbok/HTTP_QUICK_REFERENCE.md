# HTTP Testing Quick Reference

## 🚀 Quick Start

**Without Physical Buttons?** Test your MMM-InfoCentral module using these URLs:

### Method 1: Web Interface (Easiest)
1. Open `remote_control.html` in any browser
2. Enter your Mirror's IP and port
3. Click the buttons!

### Method 2: Browser Address Bar
```
http://localhost:8080/infocentral/button/next
http://localhost:8080/infocentral/button/return
```
Replace `localhost` with your Raspberry Pi's IP if remote.

### Method 3: Command Line (PowerShell on Windows)
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/infocentral/button/next"
Invoke-WebRequest -Uri "http://localhost:8080/infocentral/button/return"
```

### Method 4: Command Line (bash on Linux/Mac/Pi)
```bash
curl http://localhost:8080/infocentral/button/next
curl http://localhost:8080/infocentral/button/return
```

---

## 📱 Mobile Control

### Create Bookmarks on Your Phone
1. Find your Pi's IP: `hostname -I` on Raspberry Pi
2. Create bookmarks:
   - `http://192.168.1.100:8080/infocentral/button/next`
   - `http://192.168.1.100:8080/infocentral/button/return`
3. Or open `remote_control.html` for a better mobile experience

---

## 🔍 What Happens

When you call the endpoints, you'll see:

**Response:**
```json
{
  "success": true,
  "button": "next",
  "message": "Next image button pressed"
}
```

**In MagicMirror logs:**
```
[MMM-InfoCentral] HTTP NEXT button triggered
```

**On screen:**
- Next button: Shows first image, or advances to next image
- Return button: Returns to main MagicMirror screen

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect | Check IP address and port (default 8080) |
| 404 error | Ensure module is loaded in config.js |
| Nothing happens | Check images exist in `images/` folder |
| Access denied | Update `ipWhitelist` in config.js |

---

## 📚 Full Documentation

See [HTTP_TESTING.md](HTTP_TESTING.md) for complete examples including:
- Python scripts
- JavaScript/Node.js code
- Home automation integration
- Custom web interface examples

---

## 🎯 Default Endpoints

- **Base URL:** `http://<your-pi-ip>:8080`
- **Next Image:** `/infocentral/button/next`
- **Return to Main:** `/infocentral/button/return`

Both endpoints accept GET requests and return JSON responses.
