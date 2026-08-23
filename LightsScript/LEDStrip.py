import schedule
import time
import requests
import logging
from datetime import datetime, timedelta
import ping3

# Configure logging
logging.basicConfig(
    filename='led_control_log.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# IP address and URLs for controlling the LED
IP_ADDRESS = '192.168.1.185'
ON_URL = f'http://{IP_ADDRESS}/led1/on'
OFF_URL = f'http://{IP_ADDRESS}/led1/off'


# Function to make HTTP requests with retry logic
def send_request(url):
    for attempt in range(3):
        try:
            response = requests.get(url)
            if response.status_code == 200:
                logging.info(f"Successfully called URL: {url}")
                return True
            else:
                logging.warning(f"Failed to call URL {url} - Status Code: {response.status_code}")
        except requests.RequestException as e:
            logging.warning(f"Request to {url} failed - Attempt {attempt + 1}/3 - Error: {e}")
        time.sleep(30)
    logging.error(f"Failed to call URL {url} after 3 attempts")
    return False


# Function to get sundown time for Stockholm using the API
def get_sundown_time():
    api_url = "https://api.sunrisesunset.io/json?lat=59.33258&lng=18.0649"
    try:
        response = requests.get(api_url)
        if response.status_code == 200:
            data = response.json()
            sunset_time = data['results']['sunset']
            # Parse the time from 12-hour format with AM/PM
            sundown = datetime.strptime(sunset_time, "%I:%M:%S %p")
            # Set the sundown date to today
            sundown = sundown.replace(
                year=datetime.now().year,
                month=datetime.now().month,
                day=datetime.now().day
            )
            logging.info(f"Retrieved sundown time: {sundown}")
            return sundown
        else:
            logging.error(f"Failed to retrieve sundown time - Status Code: {response.status_code}")
    except requests.RequestException as e:
        logging.error(f"Error retrieving sundown time: {e}")

    # Fallback to a default sunset time if API fails
    fallback_time = datetime.now().replace(hour=18, minute=30, second=0, microsecond=0)
    logging.warning(f"Using fallback sundown time: {fallback_time}")
    return fallback_time


# Function to schedule ON 1 hour before sundown
def schedule_on_before_sundown():
    sundown_time = get_sundown_time()
    on_time = sundown_time - timedelta(hours=1)
    schedule_time_str = on_time.strftime('%H:%M')
    logging.info(f"Scheduling LED ON 1 hour before sundown at {schedule_time_str}")
    schedule.every().day.at(schedule_time_str).do(lambda: send_request(ON_URL))


# Function to ping the IP address
def ping_ip():
    try:
        response_time = ping3.ping(IP_ADDRESS)
        if response_time:
            logging.info(f"Ping successful. Response time: {response_time} seconds")
        else:
            logging.warning(f"Ping failed to {IP_ADDRESS}")
    except Exception as e:
        logging.error(f"Ping failed to {IP_ADDRESS} - Error: {e}")


# Schedule the ON and OFF events
schedule.every().day.at("07:00").do(lambda: send_request(ON_URL))
schedule.every().day.at("09:00").do(lambda: send_request(OFF_URL))
schedule.every().day.at("23:30").do(lambda: send_request(OFF_URL))

# Schedule ping every 5 minutes
schedule.every(5).minutes.do(ping_ip)

# Schedule the ON event 1 hour before sundown
schedule_on_before_sundown()

# Main loop to run the scheduled tasks
while True:
    schedule.run_pending()
    time.sleep(60)  # Sleep for 60 seconds before checking the schedule again
