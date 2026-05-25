# GPIO Wiring Reference for MMM-InfoCentral

## Raspberry Pi GPIO Pin Layout

```
                    +3V3  +5V
                     1  |  2
  GPIO 2 (SDA)       3  |  4     +5V
  GPIO 3 (SCL)       5  |  6     GND
  GPIO 4            7  |  8     GPIO 14 (TX)
  GND               9  | 10     GPIO 15 (RX)
  GPIO 17          11  | 12     GPIO 18
  GPIO 27          13  | 14     GND
  GPIO 22          15  | 16     GPIO 23
  +3V3             17  | 18     GPIO 24
  GPIO 10 (MOSI)   19  | 20     GND
  GPIO 9 (MISO)    21  | 22     GPIO 25
  GPIO 11 (SCLK)   23  | 24     GPIO 8 (CE0)
  GND              25  | 26     GPIO 7 (CE1)
  GPIO 0 (ID_SD)   27  | 28     GPIO 1 (ID_SC)
  GPIO 5           29  | 30     GND
  GPIO 6           31  | 32     GPIO 12
  GPIO 13          33  | 34     GND
  GPIO 19          35  | 36     GPIO 16
  GPIO 26          37  | 38     GPIO 20
  GND              39  | 40     GPIO 21
```

---

## Default Wiring (GPIO 17 and GPIO 27)

### Button A (Next Image) - GPIO 17
```
     +3V3
      |
     [R] <- 10K Ohm pull-up (optional)
      |
   GPIO 17 (Pin 11) ----+---- [Button Switch] ---- GND (Pin 6/9/14/20/30/34/39)
```

### Button B (Return to Main) - GPIO 27
```
     +3V3
      |
     [R] <- 10K Ohm pull-up (optional)
      |
   GPIO 27 (Pin 13) ----+---- [Button Switch] ---- GND (Pin 6/9/14/20/30/34/39)
```

---

## Alternative GPIO Pin Options

If GPIO 17 or 27 are unavailable, use any of these:

| GPIO | Pin | GPIO | Pin | GPIO | Pin |
|------|-----|------|-----|------|-----|
| 2    | 3   | 3    | 5   | 4    | 7   |
| 5    | 29  | 6    | 31  | 7    | 26  |
| 8    | 24  | 9    | 21  | 10   | 19  |
| 11   | 23  | 12   | 32  | 13   | 33  |
| 14   | 8   | 15   | 10  | 16   | 36  |
| 18   | 12  | 19   | 35  | 20   | 38  |
| 21   | 40  | 22   | 15  | 23   | 16  |
| 24   | 18  | 25   | 22  | 26   | 37  |

To use different pins, modify `config.js`:
```javascript
{
  module: "MMM-InfoCentral",
  position: "fullscreen_below",
  config: {
    gpioButtonNext: 4,     // GPIO 4 instead of 17
    gpioButtonReturn: 22,  // GPIO 22 instead of 27
  }
}
```

---

## Physical Wiring Examples

### Minimal Wiring (No Pull-up Resistor)
```
Button A                         Button B
─────────                         ─────────
 GPIO 17                           GPIO 27
   │                                  │
   └──[Button]──┬─────────────────────┴──[Button]──┬─────────
                 │                                   │
                GND                                GND
```

### With Pull-up Resistors (Recommended)
```
              +3V3 (+3.3V)
               │    │
              [R]  [R]  <- 10K Ohm resistors
               │    │
              GPIO17 GPIO27
               │    │
              [B1]  [B2]  <- Pushbutton switches
               │    │
               └────┴─── GND (Pin 6 or 9)
```

---

## Typical Push Button Wiring Diagram

```
         +3V3
          │
         [R] (10K Ω)
          │
    GPIO Pin ─────+
                 ╱ ╲  <- Momentary pushbutton
                ╱   ╲
               ║     ║ (when pressed, connects to GND)
                ╲   ╱
                 ╲ ╱
                  │
                 GND
```

---

## Testing GPIO Connections

Before running Magic Mirror, test your GPIO setup:

```bash
# Install GPIO utility
sudo apt-get install wiringpi

# Read current GPIO states
gpio readall

# Or use Python (if installed)
python3 -c "from gpiozero import Button; b = Button(17); print('GPIO 17 working')"
```

---

## Troubleshooting Wiring

### Button pressed but nothing happens
- [ ] Verify GPIO pin number matches config.js
- [ ] Check button wires are secure
- [ ] Confirm button is wired to GND (not +3V3)
- [ ] Test GPIO with `gpio readall`

### Random button presses detected
- [ ] Add 10K Ω pull-up resistor (recommended)
- [ ] Check for loose wires
- [ ] Reduce debounce time in node_helper.js if needed

### Module can't initialize GPIO
- [ ] You may not be on a Raspberry Pi (this is OK - test on dev machine)
- [ ] Add your user to gpio group: `sudo usermod -a -G gpio $USER`
- [ ] Reboot: `sudo reboot`
- [ ] Check permissions: `ls -la /sys/class/gpio`

---

## GPIO Ground (GND) Pin Locations

Use ANY of these GND pins:
- Pin 6, 9, 14, 20, 30, 34, 39 (6 total GND pins available)

---

## Safety Notes

⚠️ **Important:**
- **Never** connect GPIO pins directly to 5V (RPi is 3.3V only)
- **Always** use pull-up resistors for reliable button detection
- **Never** short GPIO pins together without current limiting resistors
- **Disconnect** power before making wiring changes

---

## Power Supply

Raspberry Pi GPIO can sink/source limited current (typically 16mA max per pin, 50mA total).

For this module:
- Pushbuttons: Minimal current (only for electrical connection)
- Pull-up resistors: ~300μA per 10K Ω resistor at 3.3V
- **Safe** for Raspberry Pi GPIO

---

## Reference Documentation

- [Raspberry Pi GPIO Documentation](https://www.raspberrypi.org/documentation/usage/gpio/)
- [GPIO Pinout](https://pinout.xyz/)
- [Gpiozero Library Docs](https://gpiozero.readthedocs.io/)
