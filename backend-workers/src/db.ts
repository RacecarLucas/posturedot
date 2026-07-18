import type { D1Database } from '@cloudflare/workers-types'
import type { LandmarkPacket, SessionSummary, FrameOut } from './types'

export async function ensureSession(db: D1Database, sessionId: string) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO sessions (id, created_at, updated_at) VALUES (?, unixepoch(), unixepoch())`
    )
    .bind(sessionId)
    .run()
}

export async function saveFrame(db: D1Database, packet: LandmarkPacket) {
  await ensureSession(db, packet.sessionId)
  await db
    .prepare(
      `INSERT INTO landmark_frames (session_id, timestamp, raw_pose, raw_face, raw_hands) VALUES (?, unixepoch(), ?, ?, ?)`
    )
    .bind(
      packet.sessionId,
      JSON.stringify(packet.pose),
      JSON.stringify(packet.face),
      packet.hands ? JSON.stringify(packet.hands) : null
    )
    .run()
}

export async function getSessionSummary(db: D1Database, sessionId: string): Promise<SessionSummary | null> {
  const result = await db
    .prepare(
      `SELECT s.id as session_id, COUNT(f.id) as frame_count, s.created_at
       FROM sessions s
       LEFT JOIN landmark_frames f ON f.session_id = s.id
       WHERE s.id = ?`
    )
    .bind(sessionId)
    .first<{ session_id: string; frame_count: number; created_at: number }>()

  if (!result) return null
  return {
    session_id: result.session_id,
    frame_count: result.frame_count,
    created_at: result.created_at
  }
}

export async function getSessionFrames(db: D1Database, sessionId: string, limit: number): Promise<FrameOut[]> {
  const { results } = await db
    .prepare(
      `SELECT timestamp, raw_pose, raw_face, raw_hands
       FROM landmark_frames
       WHERE session_id = ?
       ORDER BY timestamp
       LIMIT ?`
    )
    .bind(sessionId, limit)
    .all<FrameOut>()

  return results || []
}
