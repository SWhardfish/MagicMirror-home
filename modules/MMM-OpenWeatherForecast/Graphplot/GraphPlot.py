import json
import matplotlib

matplotlib.use('Agg')  # Use non-interactive backend for better performance
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import StrMethodFormatter
from datetime import datetime, timedelta
import os
import shutil
import numpy as np

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, '..', 'weather_data.json')
OUTPUT_FILE = os.path.join(BASE_DIR, 'temperature_plot.png')
TEMP_OUTPUT_FILE = os.path.join(BASE_DIR, 'temperature_plot.tmp.png')


def plot_temperature():
    if not os.path.exists(DATA_FILE):
        print("Data file does not exist!")
        return

    # Calculate cutoff (72 hours ago)
    cutoff_time = datetime.utcnow() - timedelta(hours=72)
    cutoff_timestamp = cutoff_time.timestamp()

    # Load and filter data efficiently
    timestamps, temperatures = [], []

    try:
        with open(DATA_FILE, 'r') as file:
            data = json.load(file)
            # Filter during iteration to minimize memory usage
            for entry in data:
                for record in entry['data']:
                    if record['dt'] >= cutoff_timestamp:
                        timestamps.append(datetime.utcfromtimestamp(record['dt']))
                        temperatures.append(record['temp'])
    except (json.JSONDecodeError, KeyError, IOError) as e:
        print(f"Error reading data: {e}")
        return

    if not timestamps:
        print("No data available for the last 72 hours!")
        return

    # Use exactly 72 hours: from oldest to newest data point
    end_time = timestamps[-1]
    start_time = end_time - timedelta(hours=72)

    # Create plot with optimized settings
    fig, ax = plt.subplots(figsize=(3.6, 0.9), dpi=100)
    fig.patch.set_facecolor('black')
    ax.set_facecolor('black')

    # --- Robust plotting: aggregate duplicate timestamps and optionally smooth ---
    # Convert datetimes to numeric format for processing
    xs_numeric = np.array([mdates.date2num(t) for t in timestamps])

    # Aggregate duplicates by averaging temperatures at identical timestamps
    agg = {}
    for xval, tval in zip(xs_numeric, temperatures):
        agg.setdefault(xval, []).append(tval)

    unique_x = sorted(agg.keys())
    x_arr = np.array(unique_x)
    y_arr = np.array([sum(agg[k]) / len(agg[k]) for k in unique_x])

    # Try smoothing with scipy only when there are enough unique points and no duplicates
    smoothed = False
    xs_plot_dates = None
    ys_plot = None

    if len(x_arr) >= 4:
        try:
            # Import locally to avoid hard dependency if scipy is not installed
            from scipy.interpolate import make_interp_spline

            # Ensure x values strictly increasing (they should be after sorting)
            if np.all(np.diff(x_arr) > 0):
                # Create denser x grid for smooth curve
                xs_smooth = np.linspace(x_arr[0], x_arr[-1], max(200, len(x_arr) * 8))
                spline = make_interp_spline(x_arr, y_arr, k=3)
                ys_smooth = spline(xs_smooth)

                xs_plot_dates = mdates.num2date(xs_smooth)
                ys_plot = ys_smooth
                smoothed = True
            else:
                print("[GraphPlot] Duplicate or non-increasing x values detected; skipping spline smoothing")
        except Exception as e:
            # If scipy not available or spline fails, fall back gracefully
            print(f"[GraphPlot] Spline smoothing unavailable or failed: {e}")

    if not smoothed:
        # Fall back to plotting aggregated points/line
        xs_plot_dates = mdates.num2date(x_arr)
        ys_plot = y_arr

    # Plot the line (smoothed or raw aggregated)
    ax.plot(xs_plot_dates, ys_plot, color='salmon', linewidth=0.6, antialiased=True)

    # Set x-axis limits to use full space (use datetime objects)
    ax.set_xlim([start_time, end_time])

    # X-axis: Show hours at 0, 6, 12, 18 (cleaner than 00:00 format)
    ax.xaxis.set_major_locator(mdates.HourLocator(byhour=[0, 6, 12, 18]))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H'))
    ax.tick_params(axis='x', labelsize=8, colors='white')

    # Recalculate y-limits after plotting so labels are centered correctly
    ax.relim()
    ax.autoscale_view()

    # Calculate day boundaries for separators and labels
    first_date = start_time.date()
    last_date = end_time.date()

    # Generate day boundaries (midnight times)
    current_day = first_date + timedelta(days=1)
    day_boundaries = []
    while current_day <= last_date:
        day_boundaries.append(datetime.combine(current_day, datetime.min.time()))
        current_day += timedelta(days=1)

    # Draw day separators (vertical lines at midnight)
    for boundary in day_boundaries:
        ax.axvline(x=boundary, color='white', linestyle='dotted', linewidth=0.5)

    # Add day labels (e.g., "Tue", "Wed", "Thu")
    y_mid = (ax.get_ylim()[0] + ax.get_ylim()[1]) / 2

    # Label each complete day
    for i in range(len(day_boundaries) + 1):
        if i == 0:
            day_start = start_time
            day_end = day_boundaries[0] if day_boundaries else end_time
        elif i == len(day_boundaries):
            day_start = day_boundaries[-1]
            day_end = end_time
        else:
            day_start = day_boundaries[i - 1]
            day_end = day_boundaries[i]

        # Calculate midpoint for label placement
        midpoint = day_start + (day_end - day_start) / 2
        day_name = day_start.strftime('%a')

        ax.text(mdates.date2num(midpoint), y_mid, day_name,
                color='white', alpha=0.25, fontsize=14,
                ha='center', va='center', zorder=1)

    # Y-axis formatting
    ax.yaxis.set_major_formatter(StrMethodFormatter(u"{x:.1f} °C"))
    ax.tick_params(axis='y', labelsize=8, colors='white')

    # Grid
    ax.grid(which='major', axis='both', color='grey', linestyle='dotted', linewidth=0.4)

    # Save with optimized settings - use atomic write to prevent partial reads
    plt.savefig(TEMP_OUTPUT_FILE, facecolor='black', dpi=100,
                bbox_inches='tight', pad_inches=0.05)
    plt.close(fig)

    # Atomic move - ensures file is complete before it's visible
    if os.path.exists(TEMP_OUTPUT_FILE):
        # Ensure file is fully synced to disk before moving (critical for Raspberry Pi)
        with open(TEMP_OUTPUT_FILE, 'rb') as f:
            os.fsync(f.fileno())

        shutil.move(TEMP_OUTPUT_FILE, OUTPUT_FILE)

        # Sync the final file as well to ensure it's readable
        with open(OUTPUT_FILE, 'rb') as f:
            os.fsync(f.fileno())

        print(f"Graph saved and synced to disk: {OUTPUT_FILE}")
    else:
        print("Error: Temporary file was not created")


if __name__ == "__main__":
    plot_temperature()