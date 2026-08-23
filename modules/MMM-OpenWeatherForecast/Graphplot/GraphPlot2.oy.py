import json
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import StrMethodFormatter
from datetime import datetime, timedelta
import os
from PIL import Image  # For adding the black margin

# Path to the JSON file
data_file = '../weather_data.json'
output_file = 'temperature_plot.png'

def plot_temperature():
    # Check if the file exists
    if not os.path.exists(data_file):
        print("Data file does not exist!")
        return

    # Load the data from the JSON file
    with open(data_file, 'r') as file:
        data = json.load(file)

    # Extract temperature and timestamps
    timestamps = []
    temperatures = []

    for entry in data:
        for record in entry['data']:
            timestamps.append(datetime.utcfromtimestamp(record['dt']))
            temperatures.append(record['temp'])

    if len(timestamps) == 0:
        print("No temperature data available!")
        return

    # Create the plot
    fig, ax = plt.subplots(figsize=(3.6, 0.9), dpi=100)

    # Set figure and axes background to black
    fig.patch.set_facecolor('black')
    ax.set_facecolor('black')

    # Plot the temperature data
    ax.plot(timestamps, temperatures, color='salmon', linewidth=0.4)

    # Set the x-axis format
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
    ax.xaxis.set_major_locator(mdates.HourLocator(byhour=[0, 12]))
    plt.setp(ax.get_xticklabels(), rotation=0, ha='center', color='white')

    # Identify and add vertical lines to separate days
    start_date = timestamps[0].date()
    end_date = timestamps[-1].date()
    dates = []
    for single_date in (start_date + timedelta(days=n) for n in range((end_date - start_date).days + 2)):
        ax.axvline(x=single_date, color='white', linestyle='dotted', linewidth=0.5)
        dates.append(single_date)

    # Add day names to the background, centered between vertical lines
    for i in range(len(dates) - 1):
        # Convert to datetime, set hour to 12:00 noon
        midpoint = datetime.combine(dates[i], datetime.min.time()) + timedelta(hours=12)

        # Get the day name (e.g., Mon, Tue)
        day_name = dates[i].strftime('%a')

        # Convert the midpoint to data coordinates for proper placement
        midpoint_x = mdates.date2num(midpoint)  # Convert datetime to Matplotlib's numeric format

        # Set the Y position based on the axis limits, adding a fixed pixel offset (e.g., -5 pixels)
        y_position = ax.get_ylim()[1] * 0.5  # Default multiplier (80% from top)

        # Add pixel offset (adjust the value to move the text further down)
        offset_in_pixels = 10  # Example: move 10 pixels down
        y_position -= offset_in_pixels / fig.dpi  # Convert pixels to axis units based on figure DPI

        # Add the text, centered horizontally at the midpoint
        ax.text(midpoint_x, y_position, day_name,
                color='white', alpha=0.2, fontsize=14, ha='center', va='center', zorder=1)

    # Format the y-axis
    ax.yaxis.set_major_formatter(StrMethodFormatter(u"{x:.1f} °C"))

    # Add grid lines
    ax.grid(which='major', axis='both', color='grey', linestyle='dotted', linewidth=0.4)

    # Set tick parameters
    ax.tick_params(axis='x', labelsize=8, colors='white')
    ax.tick_params(axis='y', labelsize=8, colors='white')

    # Save the plot
    plt.savefig(output_file, facecolor='black', dpi=100, bbox_inches='tight')
    plt.close()

    # Add black margin to the right using Pillow
    add_black_margin(output_file, 10)  # Add 10 pixels of black margin on the right
    print(f"Graph saved as {output_file}")

def add_black_margin(image_path, margin_pixels):
    # Open the saved image
    image = Image.open(image_path)
    width, height = image.size

    # Create a new image with extra width for the black margin
    new_width = width + margin_pixels
    new_image = Image.new("RGB", (new_width, height), "black")  # Black background

    # Paste the original image onto the new image
    new_image.paste(image, (0, 0))

    # Save the modified image
    new_image.save(image_path)

# Run the plot function
plot_temperature()
