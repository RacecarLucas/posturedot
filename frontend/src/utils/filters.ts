import { PoseLandmarkerResult, FaceLandmarkerResult, HandLandmarkerResult, NormalizedLandmark, Classifications } from '@mediapipe/tasks-vision'

interface FilterState {
  x: number
  y: number
  z: number
  dx: number
  dy: number
  dz: number
}

export type SmoothedPose = {
  landmarks: NormalizedLandmark[][]
  worldLandmarks: NormalizedLandmark[][]
  segmentationMasks?: unknown[]
}

export type SmoothedFace = {
  faceLandmarks: NormalizedLandmark[][]
  faceBlendshapes?: Classifications[]
  facialTransformationMatrixes?: unknown[]
}

export type SmoothedHands = {
  handLandmarks: NormalizedLandmark[][]
  handWorldLandmarks?: NormalizedLandmark[][]
}

class OneEuroFilter {
  private state: FilterState
  private minCutoff: number
  private beta: number
  private dCutoff: number
  private lastTime: number

  constructor(minCutoff = 1.0, beta = 0.01, dCutoff = 1.0) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
    this.lastTime = -1
    this.state = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0 }
  }

  smoothingFactor(t: number, cutoff: number) {
    const r = 2 * Math.PI * cutoff * t
    return r / (r + 1)
  }

  filter(value: { x: number; y: number; z: number }, timestamp: number) {
    if (this.lastTime < 0) {
      this.state.x = value.x
      this.state.y = value.y
      this.state.z = value.z
      this.lastTime = timestamp
      return value
    }

    const t = (timestamp - this.lastTime) / 1000
    if (t <= 0) return { x: this.state.x, y: this.state.y, z: this.state.z }

    const dx = (value.x - this.state.x) / t
    const dy = (value.y - this.state.y) / t
    const dz = (value.z - this.state.z) / t

    const aD = this.smoothingFactor(t, this.dCutoff)
    this.state.dx = aD * dx + (1 - aD) * this.state.dx
    this.state.dy = aD * dy + (1 - aD) * this.state.dy
    this.state.dz = aD * dz + (1 - aD) * this.state.dz

    const cutoff = this.minCutoff + this.beta * Math.sqrt(this.state.dx ** 2 + this.state.dy ** 2 + this.state.dz ** 2)
    const a = this.smoothingFactor(t, cutoff)

    this.state.x = a * value.x + (1 - a) * this.state.x
    this.state.y = a * value.y + (1 - a) * this.state.y
    this.state.z = a * value.z + (1 - a) * this.state.z
    this.lastTime = timestamp

    return { x: this.state.x, y: this.state.y, z: this.state.z }
  }
}

export class LandmarkFilter {
  private poseFilters: OneEuroFilter[][] = []
  private faceFilters: OneEuroFilter[][] = []
  private handFilters: OneEuroFilter[][] = []

  apply(
    pose: PoseLandmarkerResult,
    face: FaceLandmarkerResult,
    hands: HandLandmarkerResult
  ): { pose: SmoothedPose; face: SmoothedFace; hands: SmoothedHands; timestamp: number } {
    const timestamp = performance.now()

    const smoothedPose: SmoothedPose = {
      landmarks: pose.landmarks.map((person, pIdx) => {
        if (!this.poseFilters[pIdx]) this.poseFilters[pIdx] = []
        return person.map((lm, i) => {
          if (!this.poseFilters[pIdx][i]) this.poseFilters[pIdx][i] = new OneEuroFilter(1.2, 0.05)
          const f = this.poseFilters[pIdx][i].filter(lm, timestamp)
          return { ...lm, x: f.x, y: f.y, z: f.z }
        })
      }),
      worldLandmarks: pose.worldLandmarks,
      segmentationMasks: pose.segmentationMasks
    }

    const smoothedFace: SmoothedFace = {
      faceLandmarks: face.faceLandmarks.map((faceLms, fIdx) => {
        if (!this.faceFilters[fIdx]) this.faceFilters[fIdx] = []
        return faceLms.map((lm, i) => {
          if (!this.faceFilters[fIdx][i]) this.faceFilters[fIdx][i] = new OneEuroFilter(1.0, 0.02)
          const f = this.faceFilters[fIdx][i].filter(lm, timestamp)
          return { ...lm, x: f.x, y: f.y, z: f.z }
        })
      }),
      faceBlendshapes: face.faceBlendshapes,
      facialTransformationMatrixes: face.facialTransformationMatrixes
    }

    const smoothedHands: SmoothedHands = {
      handLandmarks: hands.landmarks.map((handLms, hIdx) => {
        if (!this.handFilters[hIdx]) this.handFilters[hIdx] = []
        return handLms.map((lm, i) => {
          if (!this.handFilters[hIdx][i]) this.handFilters[hIdx][i] = new OneEuroFilter(1.5, 0.08)
          const f = this.handFilters[hIdx][i].filter(lm, timestamp)
          return { ...lm, x: f.x, y: f.y, z: f.z }
        })
      }),
      handWorldLandmarks: hands.worldLandmarks
    }

    return { pose: smoothedPose, face: smoothedFace, hands: smoothedHands, timestamp }
  }
}
