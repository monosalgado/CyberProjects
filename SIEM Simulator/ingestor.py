import re
import time
import os
import sys
import database
import detector

# Regex for NGINX combined log format
LOG_PATTERN = re.compile(
    r'^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+[^"]+"\s+(\d+)\s+\d+\s+"[^"]*"\s+"([^"]*)"'
)

def follow(thefile):
    """Generator function that yields new lines in a file as they are appended."""
    thefile.seek(0, 2) # Go to the end of the file
    while True:
        line = thefile.readline()
        if not line:
            time.sleep(0.1) # Sleep briefly
            continue
        yield line

def parse_and_store(log_file):
    # Ensure DB is initialized
    database.init_db()
    
    # Ensure log file exists before we tail it
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    if not os.path.exists(log_file):
        open(log_file, 'a').close()
        
    print(f"Waiting for logs in {log_file}...")
    
    conn = database.get_connection()
    cursor = conn.cursor()

    with open(log_file, "r") as logfile:
        loglines = follow(logfile)
        for line in loglines:
            match = LOG_PATTERN.match(line)
            if match:
                ip_address = match.group(1)
                timestamp = match.group(2)
                method = match.group(3)
                url = match.group(4)
                status = int(match.group(5))
                user_agent = match.group(6)
                
                # Insert into DB
                cursor.execute('''
                    INSERT INTO logs (timestamp, ip_address, method, url, status, user_agent)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (timestamp, ip_address, method, url, status, user_agent))
                
                # Commit the insert
                conn.commit()
                log_id = cursor.lastrowid
                
                # Create a dict representing the log record for the detector
                log_record = {
                    "id": log_id,
                    "timestamp": timestamp,
                    "ip_address": ip_address,
                    "method": method,
                    "url": url,
                    "status": status,
                    "user_agent": user_agent
                }
                
                # Pass to detection engine
                detector.process_log(log_record, conn)
            # We silently ignore non-matching lines to handle messy real-world logs

if __name__ == "__main__":
    # Default to the simulator log if no argument is provided
    target_log = "logs/access.log"
    if len(sys.argv) > 1:
        target_log = sys.argv[1]
        
    try:
        parse_and_store(target_log)
    except KeyboardInterrupt:
        print("Ingestor stopped.")
