from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class LandmarkPacket(BaseModel):
    sessionId: str
    pose: Any
    face: Any
    hands: Optional[Any] = None

class SessionSummary(BaseModel):
    session_id: str
    frame_count: int
    created_at: datetime

class FrameOut(BaseModel):
    timestamp: datetime
    raw_pose: Optional[str] = None
    raw_face: Optional[str] = None
    raw_hands: Optional[str] = None

__all__ = ["LandmarkPacket", "SessionSummary", "FrameOut"]
