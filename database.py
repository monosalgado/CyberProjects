import sqlite3
import os

DB_PATH = "siem.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            ip_address TEXT,
            method TEXT,
            url TEXT,
            status INTEGER,
            user_agent TEXT
        )
    ''')

    # Create alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            rule_name TEXT,
            description TEXT,
            source_ip TEXT,
            raw_log_id INTEGER,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (raw_log_id) REFERENCES logs(id)
        )
    ''')
    
    # Create banned IPs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS banned_ips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT UNIQUE,
            timestamp TEXT,
            reason TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def get_connection():
    # Use check_same_thread=False for easy sharing across async backend,
    # and dictionary rows for easy JSON conversion
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
