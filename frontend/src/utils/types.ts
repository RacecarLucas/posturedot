import type { PoseLandmarkerResult, FaceLandmarkerResult, HandLandmarkerResult } from '@mediapipe/tasks-vision'

export interface LandmarkPacket {
  sessionId: string
  pose: PoseLandmarkerResult
  face: FaceLandmarkerResult
  hands: HandLandmarkerResult
}

export interface HarvestInfo {
  frameCount: number
  poseLandmarks: number
  poseConnections: number
  faceLandmarks: number
  faceBlendshapes: number
  faceTransforms: number
  handCount: number
  handLandmarks: number
  hasSegmentationMask: boolean
  hasWorldLandmarks: boolean
  hasHandWorldLandmarks: boolean
}
