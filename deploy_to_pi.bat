@echo off
REM ============================================
REM MagicMirror Deploy Script
REM Copies updated files to Pi and restarts MM
REM Usage: deploy_to_pi.bat
REM ============================================

SET PI_USER=pi
SET PI_HOST=192.168.1.208
SET PI_MM_PATH=/home/pi/MagicMirror
SET LOCAL_PATH=C:\Users\rylanda\PycharmProjects\MagicMirror

echo ============================================
echo  MagicMirror Deploy to Pi (%PI_HOST%)
echo ============================================
echo.

REM --- Config ---
echo [1/7] Deploying config/config.js...
scp "%LOCAL_PATH%\config\config.js" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/config/config.js

REM --- MMM-SL ---
echo [2/7] Deploying MMM-SL/MMM-SL.js...
scp "%LOCAL_PATH%\modules\MMM-SL\MMM-SL.js" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-SL/MMM-SL.js

echo [3/7] Deploying MMM-SL/css/mmm-sl.css...
scp "%LOCAL_PATH%\modules\MMM-SL\css\mmm-sl.css" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-SL/css/mmm-sl.css

REM --- MMM-OpenWeatherForecast ---
echo [4/7] Deploying MMM-OpenWeatherForecast/MMM-OpenWeatherForecast.js...
scp "%LOCAL_PATH%\modules\MMM-OpenWeatherForecast\MMM-OpenWeatherForecast.js" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-OpenWeatherForecast/MMM-OpenWeatherForecast.js

echo [5/7] Deploying MMM-OpenWeatherForecast/node_helper.js...
scp "%LOCAL_PATH%\modules\MMM-OpenWeatherForecast\node_helper.js" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-OpenWeatherForecast/node_helper.js

REM --- MMM-Receptbok ---
echo [6/9] Deploying MMM-Receptbok/MMM-Receptbok.js...
scp "%LOCAL_PATH%\modules\MMM-Receptbok\MMM-Receptbok.js" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-Receptbok/MMM-Receptbok.js

echo [7/9] Deploying MMM-Receptbok/node_helper.js...
scp "%LOCAL_PATH%\modules\MMM-Receptbok\node_helper.js" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-Receptbok/node_helper.js

echo [8/9] Deploying MMM-Receptbok/remote_control.html...
scp "%LOCAL_PATH%\modules\MMM-Receptbok\remote_control.html" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-Receptbok/remote_control.html

echo [9/9] Deploying MMM-Receptbok/MMM-Receptbok.css...
scp "%LOCAL_PATH%\modules\MMM-Receptbok\MMM-Receptbok.css" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/modules/MMM-Receptbok/MMM-Receptbok.css

REM --- Monitor script ---
echo [10/10] Deploying monitor_mm.sh...
scp "%LOCAL_PATH%\monitor_mm.sh" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/monitor_mm.sh
ssh %PI_USER%@%PI_HOST% "chmod +x %PI_MM_PATH%/monitor_mm.sh"

REM --- Restart MagicMirror ---
echo [11/11] Restarting MagicMirror on Pi...
ssh %PI_USER%@%PI_HOST% "pm2 restart MagicMirror"

echo.
echo ============================================
echo  Deploy complete! MagicMirror restarted.
echo ============================================
echo.
echo To start the monitor script on Pi:
echo   ssh %PI_USER%@%PI_HOST% "nohup bash %PI_MM_PATH%/monitor_mm.sh &"
echo.
pause

