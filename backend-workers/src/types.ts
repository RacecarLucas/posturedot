export interface Env {
  DB: D1Database
}

export interface LandmarkPacket {
  sessionId: string
  pose: unknown
  face: unknown
  hands?: unknown
}

export interface SessionSummary {
  session_id: string
  frame_count: number
  created_at: number
}

export interface FrameOut {
  timestamp: number
  raw_pose: string
  raw_face: string
  raw_hands: string | null
}
