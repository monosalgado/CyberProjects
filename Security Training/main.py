from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database
import uuid
import datetime

app = FastAPI(title="Security Awareness Training API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartSessionRequest(BaseModel):
    username: str

class SubmitAnswerRequest(BaseModel):
    session_id: str
    module_id: str
    scenario_id: str
    user_answer: str
    is_correct: bool

@app.on_event("startup")
def startup_event():
    database.init_db()

@app.post("/api/start")
def start_session(req: StartSessionRequest):
    session_id = str(uuid.uuid4())
    tz = datetime.datetime.now().astimezone().strftime('%z')
    start_time = datetime.datetime.now().strftime(f'%d/%b/%Y:%H:%M:%S {tz}')
    
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sessions (id, username, start_time)
        VALUES (?, ?, ?)
    ''', (session_id, req.username, start_time))
    conn.commit()
    conn.close()
    
    return {"session_id": session_id, "message": "Session started successfully."}

@app.post("/api/submit")
def submit_answer(req: SubmitAnswerRequest):
    tz = datetime.datetime.now().astimezone().strftime('%z')
    timestamp = datetime.datetime.now().strftime(f'%d/%b/%Y:%H:%M:%S {tz}')
    
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO responses (session_id, module_id, scenario_id, user_answer, is_correct, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (req.session_id, req.module_id, req.scenario_id, req.user_answer, req.is_correct, timestamp))
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Answer recorded."}

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.get("/api/results/{session_id}")
def get_results(session_id: str):
    conn = database.get_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    
    # Check if session exists
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    # Get all responses
    cursor.execute("SELECT * FROM responses WHERE session_id = ?", (session_id,))
    responses = cursor.fetchall()
    
    # Calculate score
    total_questions = len(responses)
    correct_answers = sum(1 for r in responses if r['is_correct'])
    
    score_percentage = 0
    if total_questions > 0:
        score_percentage = int((correct_answers / total_questions) * 100)
        
    # Update session end time and score
    tz = datetime.datetime.now().astimezone().strftime('%z')
    end_time = datetime.datetime.now().strftime(f'%d/%b/%Y:%H:%M:%S {tz}')
    
    cursor.execute('''
        UPDATE sessions 
        SET end_time = ?, final_score = ?
        WHERE id = ?
    ''', (end_time, score_percentage, session_id))
    conn.commit()
    conn.close()
    
    return {
        "username": session['username'],
        "score": score_percentage,
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "responses": responses
    }

# Mount static directory for frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return FileResponse("static/index.html")
