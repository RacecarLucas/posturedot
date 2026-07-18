import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json

from app.database import SessionLocal, init_db
from app.schemas import LandmarkPacket
from app.crud import save_frame, get_session_summary, get_session_frames

def parse_cors_origins():
    raw = os.environ.get("CORS_ORIGINS", "*")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

app = FastAPI(title="PostureDot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active:
            self.active[session_id] = []
        self.active[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active:
            self.active[session_id].remove(websocket)
            if not self.active[session_id]:
                del self.active[session_id]

    async def broadcast(self, session_id: str, message: dict):
        for ws in self.active.get(session_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.post("/api/landmarks")
async def receive_landmarks(packet: LandmarkPacket, db: Session = Depends(get_db)):
    save_frame(db, packet)
    await manager.broadcast(packet.sessionId, {
        "type": "frame",
        "pose_landmarks": len(packet.pose.get("landmarks", [[]])[0]) if packet.pose.get("landmarks") else 0,
        "face_landmarks": len(packet.face.get("faceLandmarks", [[]])[0]) if packet.face.get("faceLandmarks") else 0,
        "hand_count": len(packet.hands.get("handLandmarks", [])) if packet.hands else 0
    })
    return {"ok": True}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                await manager.broadcast(session_id, {"type": "echo", "data": payload})
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)

@app.get("/api/sessions/{session_id}/summary")
async def session_summary(session_id: str, db: Session = Depends(get_db)):
    summary = get_session_summary(db, session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary

@app.get("/api/sessions/{session_id}/frames")
async def session_frames(session_id: str, limit: int = 1000, db: Session = Depends(get_db)):
    return get_session_frames(db, session_id, limit)

@app.get("/health")
async def health():
    return {"status": "ok"}

__all__ = ["app"]
