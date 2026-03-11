import time
import random
import datetime
import os

LOG_FILE = "logs/access.log"
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

NORMAL_IPS = [f"192.168.1.{i}" for i in range(10, 20)]
ATTACKER_IPS = ["10.0.0.55", "172.16.0.4", "45.33.22.11"]

NORMAL_PATHS = ["/", "/about", "/contact", "/products", "/images/logo.png", "/login", "/dashboard"]
ATTACK_PAYLOADS = [
    ("/login?user=admin%27%20OR%201=1--", "SQL Injection"),
    ("/products?id=1%20UNION%20SELECT%20username,password%20FROM%20users", "SQL Injection"),
    ("/images/../../../etc/passwd", "Path Traversal"),
    ("/api/v1/download?file=..%2f..%2f..%2fetc%2fshadow", "Path Traversal")
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/114.0"
]

def generate_normal_log():
    ip = random.choice(NORMAL_IPS)
    path = random.choice(NORMAL_PATHS)
    status = random.choice([200, 200, 200, 200, 301, 302, 404])
    agent = random.choice(USER_AGENTS)
    method = "GET" if path != "/login" else random.choice(["GET", "POST"])
    return format_log(ip, method, path, status, agent)

def generate_attack_log():
    ip = random.choice(ATTACKER_IPS)
    payload, attack_type = random.choice(ATTACK_PAYLOADS)
    status = random.choice([200, 403, 500])
    agent = "curl/7.81.0" # often used by automated scripts
    return format_log(ip, "GET", payload, status, agent)
    
def generate_scan_burst(ip):
    # Simulate directory scanning / brute force looking for hidden files
    logs = []
    base_paths = ["/admin", "/.git/config", "/wp-admin", "/backup.zip", "/env"]
    for path in base_paths:
        logs.append(format_log(ip, "GET", path, 404, "python-requests/2.28.1"))
    return logs

def format_log(ip, method, path, status, agent):
    tz = datetime.datetime.now().astimezone().strftime('%z')
    timestamp = datetime.datetime.now().strftime(f'%d/%b/%Y:%H:%M:%S {tz}')
    # NGINX combined format
    return f'{ip} - - [{timestamp}] "{method} {path} HTTP/1.1" {status} {random.randint(100, 5000)} "-" "{agent}"\n'

def main():
    print(f"Starting log generation. Writing to {LOG_FILE}...")
    with open(LOG_FILE, "a") as f:
        while True:
            # Decide what to generate
            chance = random.random()
            
            if chance < 0.05:
                # 5% chance of scan burst
                attacker_ip = random.choice(ATTACKER_IPS)
                for line in generate_scan_burst(attacker_ip):
                    f.write(line)
                    f.flush()
                    print(f"[SCAN] {line.strip()}")
                    time.sleep(0.1)
            elif chance < 0.15:
                # 10% chance of distinct attack payload
                line = generate_attack_log()
                f.write(line)
                f.flush()
                print(f"[ATTACK] {line.strip()}")
            else:
                # Normal traffic
                line = generate_normal_log()
                f.write(line)
                f.flush()
                print(f"[NORMAL] {line.strip()}")
            
            # Wait a bit before next log
            time.sleep(random.uniform(0.5, 2.0))

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Log generation stopped.")
