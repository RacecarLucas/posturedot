import type { SmoothedPose, SmoothedFace, SmoothedHands } from './filters.ts'

const API_BASE = import.meta.env.VITE_API_URL || ''

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

function wsUrl(sessionId: string) {
  if (API_BASE) {
    const url = new URL(API_BASE)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url.host}/ws/${sessionId}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/${sessionId}`
}

function slimPose(pose: SmoothedPose) {
  return {
    landmarks: pose.landmarks.map(person =>
      person.map(lm => ({
        x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility
      }))
    ),
    worldLandmarks: pose.worldLandmarks.map(person =>
      person.map(lm => ({
        x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility
      }))
    )
  }
}

function slimFace(face: SmoothedFace) {
  return {
    faceLandmarks: face.faceLandmarks.map(faceLms =>
      faceLms.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }))
    ),
    faceBlendshapes: face.faceBlendshapes?.map(blendshapes =>
      blendshapes.categories.map(c => ({ name: c.categoryName, score: c.score }))
    ),
    facialTransformationMatrixes: face.facialTransformationMatrixes
  }
}

function slimHands(hands: SmoothedHands) {
  return {
    handLandmarks: hands.handLandmarks.map(handLms =>
      handLms.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }))
    ),
    handWorldLandmarks: hands.handWorldLandmarks?.map(handLms =>
      handLms.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }))
    )
  }
}

export function sendLandmarks(
  sessionId: string,
  pose: SmoothedPose,
  face: SmoothedFace,
  hands: SmoothedHands
) {
  const payload = { sessionId, pose: slimPose(pose), face: slimFace(face), hands: slimHands(hands) }
  fetch(apiUrl('/api/landmarks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {})
}

let ws: WebSocket | null = null

export function connectWebSocket(sessionId: string, onMessage: (data: unknown) => void) {
  ws = new WebSocket(wsUrl(sessionId))
  ws.onmessage = (event) => onMessage(JSON.parse(event.data))
  ws.onclose = () => setTimeout(() => connectWebSocket(sessionId, onMessage), 3000)
}
