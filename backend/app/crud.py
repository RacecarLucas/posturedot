import json
from sqlalchemy.orm import Session
from app.database import SessionModel, LandmarkFrame
from app.schemas import LandmarkPacket, SessionSummary, FrameOut

def ensure_session(db: Session, session_id: str):
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        s = SessionModel(id=session_id)
        db.add(s)
        db.commit()
    return s

def save_frame(db: Session, packet: LandmarkPacket):
    ensure_session(db, packet.sessionId)
    frame = LandmarkFrame(
        session_id=packet.sessionId,
        raw_pose=json.dumps(packet.pose),
        raw_face=json.dumps(packet.face),
        raw_hands=json.dumps(packet.hands) if packet.hands else None
    )
    db.add(frame)
    db.commit()
    return frame

def get_session_summary(db: Session, session_id: str) -> SessionSummary | None:
    frames = db.query(LandmarkFrame).filter(LandmarkFrame.session_id == session_id).all()
    if not frames:
        return None
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    return SessionSummary(
        session_id=session_id,
        frame_count=len(frames),
        created_at=session.created_at if session else frames[0].timestamp
    )

def get_session_frames(db: Session, session_id: str, limit: int = 1000) -> list[FrameOut]:
    frames = (
        db.query(LandmarkFrame)
        .filter(LandmarkFrame.session_id == session_id)
        .order_by(LandmarkFrame.timestamp)
        .limit(limit)
        .all()
    )
    return [FrameOut(
        timestamp=f.timestamp,
        raw_pose=f.raw_pose,
        raw_face=f.raw_face,
        raw_hands=f.raw_hands
    ) for f in frames]

__all__ = ["ensure_session", "save_frame", "get_session_summary", "get_session_frames"]
