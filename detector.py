import urllib.parse
import re
import time

# In-memory store for tracking 404s per IP
scan_tracker = {}
SCAN_THRESHOLD = 3
SCAN_WINDOW_SECONDS = 30

SQLI_PATTERN = re.compile(r'(%27|%22|\'|").*(OR|UNION|SELECT|INSERT|DROP|UPDATE|--|%20OR%20|%20UNION%20)', re.IGNORECASE)
PATH_TRAVERSAL_PATTERN = re.compile(r'(\.\./|\.\.\\|%2e%2e%2f|%2e%2e/|\.\.%2f)', re.IGNORECASE)

def process_log(log_record, conn):
    """
    Analyzes a single log record and inserts an alert into the database
    if malicious activity is detected.
    """
    ip = log_record["ip_address"]
    url = log_record["url"]
    status = log_record["status"]
    method = log_record["method"]
    log_id = log_record["id"]
    timestamp = log_record["timestamp"]
    
    url_decoded = urllib.parse.unquote(url)
    alerts = []
    
    # Rule 1: SQL Injection
    if SQLI_PATTERN.search(url_decoded):
        alerts.append(("SQL Injection Detected", f"Suspicious SQL syntax found in URL: {url}"))
        
    # Rule 2: Path Traversal
    if PATH_TRAVERSAL_PATTERN.search(url_decoded):
        alerts.append(("Path Traversal Detected", f"Directory traversal characters found in URL: {url}"))
        
    # Rule 3: Vulnerability Scanning (Brute Force 404s)
    if status == 404:
        now = time.time()
        if ip not in scan_tracker:
            scan_tracker[ip] = []
        scan_tracker[ip].append(now)
        
        # Keep only timestamps within the window
        scan_tracker[ip] = [ts for ts in scan_tracker[ip] if now - ts < SCAN_WINDOW_SECONDS]
        
        if len(scan_tracker[ip]) >= SCAN_THRESHOLD:
            alerts.append(("Vulnerability Scanning Detected", f"Multiple 404 errors ({len(scan_tracker[ip])}) from {ip} in {SCAN_WINDOW_SECONDS} seconds."))
            # Reset tracker to avoid alert spamming
            scan_tracker[ip] = []
            
    # Insert alerts into DB
    if alerts:
        cursor = conn.cursor()
        for rule_name, description in alerts:
            cursor.execute('''
                INSERT INTO alerts (timestamp, rule_name, description, source_ip, raw_log_id)
                VALUES (?, ?, ?, ?, ?)
            ''', (timestamp, rule_name, description, ip, log_id))
            print(f"🚨 [ALERT] {rule_name} from {ip}")
        conn.commit()
