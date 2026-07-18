import { useEffect, useState } from 'react'

interface SessionsViewProps {
  sessionId: string
}

interface Frame {
  timestamp: string
  raw_pose: string | null
  raw_face: string | null
  raw_hands: string | null
}

interface Summary {
  session_id: string
  frame_count: number
  created_at: string
}

const API_BASE = import.meta.env.VITE_API_URL || ''

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

export default function SessionsView({ sessionId }: SessionsViewProps) {
  const [frames, setFrames] = useState<Frame[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    fetch(apiUrl(`/api/sessions/${sessionId}/summary`))
      .then(r => r.ok ? r.json() : null)
      .then(setSummary)
      .catch(() => {})

    fetch(apiUrl(`/api/sessions/${sessionId}/frames`))
      .then(r => r.ok ? r.json() : [])
      .then(setFrames)
      .catch(() => {})
  }, [sessionId])

  return (
    <div className="sessions-view">
      <h2>Session Data</h2>
      {summary && (
        <div className="summary-grid">
          <div className="metric">
            <span className="label">Frames</span>
            <span className="value">{summary.frame_count}</span>
          </div>
          <div className="metric">
            <span className="label">Created</span>
            <span className="value">{new Date(summary.created_at).toLocaleString()}</span>
          </div>
        </div>
      )}
      <div className="frame-table">
        <div className="frame-row header">
          <span>Time</span>
          <span>Pose</span>
          <span>Face</span>
          <span>Hands</span>
        </div>
        {frames.slice(-50).map((f, i) => (
          <div className="frame-row" key={i}>
            <span>{new Date(f.timestamp).toLocaleTimeString()}</span>
            <span>{f.raw_pose ? '✓' : '—'}</span>
            <span>{f.raw_face ? '✓' : '—'}</span>
            <span>{f.raw_hands ? '✓' : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
