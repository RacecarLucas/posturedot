import os
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

Base = declarative_base()

class SessionModel(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class LandmarkFrame(Base):
    __tablename__ = "landmark_frames"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    raw_pose = Column(Text)
    raw_face = Column(Text)
    raw_hands = Column(Text, nullable=True)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./posturedot.db")

# SQLite-specific connection args; PostgreSQL does not need them
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

__all__ = ["Base", "SessionModel", "LandmarkFrame", "SessionLocal", "init_db"]

