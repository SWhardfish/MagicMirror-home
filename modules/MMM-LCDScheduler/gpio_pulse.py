#!/usr/bin/env python3
import RPi.GPIO as GPIO
import time
import sys

def pulse_gpio(pin):
    """Execute a pulse on the specified GPIO pin."""
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(pin, GPIO.OUT, initial=GPIO.LOW)

        # Pulse sequence: 0.5s HIGH, 0.1s LOW
        GPIO.output(pin, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(pin, GPIO.LOW)
        time.sleep(0.1)

        GPIO.cleanup()
        return 0
    except Exception as e:
        print(f"Error controlling GPIO pin {pin}: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: gpio_pulse.py <gpio_pin>", file=sys.stderr)
        sys.exit(1)

    try:
        gpio_pin = int(sys.argv[1])
        exit_code = pulse_gpio(gpio_pin)
        sys.exit(exit_code)
    except ValueError:
        print(f"Error: GPIO pin must be an integer, got '{sys.argv[1]}'", file=sys.stderr)
        sys.exit(1)
