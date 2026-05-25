# MMM-InfoCentral
MIT Licensed

## License

- Verify supported format (JPG/PNG)
- Check image file integrity
- Module automatically advances to next image
**Image fails to load:**

- Check for wiring issues
- Ensure RPi GPIO permissions are set correctly
- Verify correct GPIO pin numbers in config.js
**GPIO buttons not working:**

- Check module logs for errors
- Check that image filenames end with `.jpg`, `.jpeg`, or `.png`
- Ensure images are in `modules/MMM-InfoCentral/images/` directory
**No images displayed:**

## Troubleshooting

  - WiFi-based control
  - Visual image browser
  - Image upload functionality
  - Remote image navigation
- Android app for Pixel 7 with:

## Future Enhancements (Phase 2)

- Add pull-up resistors (10K ohm) if not using internal pull-ups
- GPIO 27 (Pin 13): Return to Main button → Ground
- GPIO 17 (Pin 11): Next Image button → Ground
Example with GPIO 17 and GPIO 27:

## GPIO Wiring (Raspberry Pi)

- **Location**: Place images in `modules/MMM-InfoCentral/images/`
- **Naming**: Images are sorted and displayed in alphabetical order
- **Orientation**: Portrait (recommended 1024x768 or similar)
- **Formats**: JPG, JPEG, PNG

## Image Specifications

5. **Image Errors**: If an image fails to load, automatically advances to next image
4. **Auto-Return**: If configured, automatically returns to main display after specified hours
3. **Button Return Press (GPIO Return)**: Returns to main Magic Mirror display
2. **Subsequent Button Presses (GPIO Next)**: Cycles through images in alphabetical order
1. **First Button Press (GPIO Next)**: Displays the first image and shows the module

## Usage

```
}
  }
    animationSpeed: 1000
    // Animation speed for transitions in ms (default: 1000)
    
    imageDir: "modules/MMM-InfoCentral/images",
    // Path to images directory (default: "modules/MMM-InfoCentral/images")
    
    autoReturnHours: 2,
    // Auto-return to main screen after X hours (0 = disabled, default: 0)
    
    gpioButtonReturn: 27,
    // GPIO pin number for "Return to Main" button (default: 27)
    
    gpioButtonNext: 17,
    // GPIO pin number for "Next Image" button (default: 17)
  config: {
  position: "fullscreen_below",
  module: "MMM-InfoCentral",
{
```javascript

Add this to your Magic Mirror config.js modules array:

## Configuration

5. Add the module to your `config.js` (see Configuration section)
4. Install dependencies: `npm install`
3. Place JPG/PNG recipe images in the `images` folder
2. Create an `images` subdirectory in the module folder
1. Clone or copy this module to `MagicMirror/modules/MMM-InfoCentral`

## Installation

- **Future Phase**: Android app for remote control and image uploads (planned)
- **Error Handling**: Gracefully handles missing or corrupted images
- **Auto-Return**: Optional automatic return to main screen after specified hours
- **Portrait Display**: Optimized for 1024x768 portrait orientation
- **Image Management**: Automatically loads and displays JPG/PNG images in alphabetical order
  - Button B (Return): Return to main Magic Mirror screen
  - Button A (Next): Show next image or activate display
- **GPIO Button Control**: Two configurable GPIO pins to control image display

## Features

A Magic Mirror² module for displaying kitchen recipes and images in portrait mode on a secondary display.

