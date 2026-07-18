import {
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision'
import type { PoseLandmarkerResult, FaceLandmarkerResult, HandLandmarkerResult } from '@mediapipe/tasks-vision'

export type { PoseLandmarker, FaceLandmarker, HandLandmarker, PoseLandmarkerResult, FaceLandmarkerResult, HandLandmarkerResult }

let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null

async function getVision() {
  if (!vision) {
    vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    )
  }
  return vision
}

export async function initPoseLandmarker() {
  const vision = await getVision()
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    outputSegmentationMasks: true
  })
}

export async function initFaceLandmarker() {
  const vision = await getVision()
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true
  })
}

export async function initHandLandmarker() {
  const vision = await getVision()
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numHands: 2
  })
}
