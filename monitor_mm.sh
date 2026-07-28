#!/bin/bash
# MagicMirror Performance Monitor
# Logs system metrics every 5 minutes to help identify memory/CPU leaks
# Usage: nohup bash ~/MagicMirror/monitor_mm.sh &

LOGFILE="/home/pi/MagicMirror/mm_monitor.log"

echo "=== MagicMirror Monitor Started: $(date) ===" >> "$LOGFILE"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  LOAD=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
  UPTIME=$(uptime -p)

  # Memory summary
  MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
  MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
  MEM_FREE=$(free -m | awk '/Mem:/ {print $4}')
  SWAP_USED=$(free -m | awk '/Swap:/ {print $3}')
  SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')

  # Per-process stats for electron (MagicMirror)
  ELECTRON_STATS=$(ps -eo pid,rss,vsz,%cpu,%mem,etime,args --sort=-%mem | grep electron | grep -v grep | head -8)
  ELECTRON_COUNT=$(ps -eo args | grep electron | grep -v grep | wc -l)
  ELECTRON_RSS_TOTAL=$(ps -eo rss,args | grep electron | grep -v grep | awk '{sum+=$1} END {print int(sum/1024)}')

  # DOM element count via curl (if MagicMirror is running on port 8080)
  # This is a lightweight check

  echo "[$TIMESTAMP] LOAD: $LOAD | MEM: ${MEM_USED}/${MEM_TOTAL}MB | SWAP: ${SWAP_USED}/${SWAP_TOTAL}MB | Electron procs: $ELECTRON_COUNT | Electron RSS total: ${ELECTRON_RSS_TOTAL}MB" >> "$LOGFILE"

  # Log individual electron process details every 15 minutes (on 0, 15, 30, 45)
  MINUTE=$(date '+%M')
  if [ "$((MINUTE % 15))" -eq "0" ]; then
    echo "[$TIMESTAMP] --- Electron Process Details ---" >> "$LOGFILE"
    echo "$ELECTRON_STATS" | while read line; do
      echo "[$TIMESTAMP]   $line" >> "$LOGFILE"
    done
    echo "[$TIMESTAMP] --- End Process Details ---" >> "$LOGFILE"
  fi

  # Alert if load > 4 or memory > 90%
  LOAD1=$(echo "$LOAD" | awk '{print $1}')
  MEM_PCT=$((MEM_USED * 100 / MEM_TOTAL))
  if (( $(echo "$LOAD1 > 4" | bc -l) )); then
    echo "[$TIMESTAMP] *** ALERT: High load average: $LOAD1 ***" >> "$LOGFILE"
  fi
  if [ "$MEM_PCT" -gt 90 ]; then
    echo "[$TIMESTAMP] *** ALERT: High memory usage: ${MEM_PCT}% ***" >> "$LOGFILE"
  fi
  if [ "$SWAP_USED" -gt 200 ]; then
    echo "[$TIMESTAMP] *** ALERT: High swap usage: ${SWAP_USED}MB ***" >> "$LOGFILE"
  fi

  sleep 300  # Every 5 minutes
done

