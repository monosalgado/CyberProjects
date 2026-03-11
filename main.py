from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import database

app = FastAPI(title="Mini-SIEM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.get("/api/logs")
def get_logs(limit: int = 50):
    conn = database.get_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs ORDER BY id DESC LIMIT ?", (limit,))
    logs = cursor.fetchall()
    conn.close()
    return logs

@app.get("/api/alerts")
def get_alerts(limit: int = 20):
    conn = database.get_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE status = 'active' ORDER BY id DESC LIMIT ?", (limit,))
    alerts = cursor.fetchall()
    conn.close()
    return alerts

@app.get("/api/stats")
def get_stats():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM logs")
    total_logs = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE status = 'active'")
    total_alerts = cursor.fetchone()[0]
    conn.close()
    
    return {"total_logs": total_logs, "total_alerts": total_alerts}

from pydantic import BaseModel
import datetime

class BanRequest(BaseModel):
    ip_address: str
    reason: str

@app.post("/api/ips/ban")
def ban_ip(req: BanRequest):
    conn = database.get_connection()
    cursor = conn.cursor()
    tz = datetime.datetime.now().astimezone().strftime('%z')
    timestamp = datetime.datetime.now().strftime(f'%d/%b/%Y:%H:%M:%S {tz}')
    
    try:
        cursor.execute('''
            INSERT INTO banned_ips (ip_address, timestamp, reason)
            VALUES (?, ?, ?)
        ''', (req.ip_address, timestamp, req.reason))
        conn.commit()
    except Exception as e:
        # IP might already be banned (UNIQUE constraint failed)
        pass
    finally:
        conn.close()
        
    return {"status": "success", "message": f"IP {req.ip_address} banned."}

@app.post("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET status = 'resolved' WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Alert resolved."}

# Mount static directory for frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return FileResponse("static/index.html")
