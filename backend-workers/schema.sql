DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS landmark_frames;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE landmark_frames (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()),
  raw_pose TEXT NOT NULL,
  raw_face TEXT NOT NULL,
  raw_hands TEXT
);

CREATE INDEX idx_frames_session ON landmark_frames(session_id, timestamp);
