import { useEffect, useRef, useState } from 'react'
import {
  initPoseLandmarker,
  initFaceLandmarker,
  initHandLandmarker,
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker
} from '../utils/detection.ts'
import { LandmarkFilter, SmoothedPose, SmoothedFace, SmoothedHands } from '../utils/filters.ts'
import { sendLandmarks } from '../utils/websocket.ts'
import type { HarvestInfo } from '../utils/types.ts'
import DataInspector from './DataInspector.tsx'

interface CameraProps {
  sessionId: string
}

export default function Camera({ sessionId }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<HarvestInfo | null>(null)
  const [showVideo, setShowVideo] = useState(true)
  const [showMuscles, setShowMuscles] = useState(false)
  const [showSegmentation, setShowSegmentation] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const filterRef = useRef(new LandmarkFilter())
  const rafRef = useRef<number>(0)
  const lastSendRef = useRef(0)
  const frameCountRef = useRef(0)

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (playErr) {
            if (playErr instanceof DOMException && playErr.name === 'AbortError') {
              // play() interrupted by a new load request (e.g. React StrictMode)
            } else {
              throw playErr
            }
          }
        }
        const [pose, face, hands] = await Promise.all([
          initPoseLandmarker(),
          initFaceLandmarker(),
          initHandLandmarker()
        ])
        poseLandmarkerRef.current = pose
        faceLandmarkerRef.current = face
        handLandmarkerRef.current = hands
        setIsReady(true)
      } catch (err) {
        setError((err instanceof Error ? err.message : 'Failed to access camera'))
      }
    }
    setupCamera()

    const video = videoRef.current
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isReady) return

    async function detect() {
      const video = videoRef.current
      const canvas = canvasRef.current
      const pose = poseLandmarkerRef.current
      const face = faceLandmarkerRef.current
      const hands = handLandmarkerRef.current
      if (!video || !canvas || !pose || !face || !hands) return

      const now = performance.now()
      const poseResult = pose.detectForVideo(video, now)
      const faceResult = face.detectForVideo(video, now)
      const handsResult = hands.detectForVideo(video, now)

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const smoothed = filterRef.current.apply(poseResult, faceResult, handsResult)

      if (showSegmentation && smoothed.pose.segmentationMasks?.length) {
        await drawSegmentation(ctx, smoothed.pose.segmentationMasks[0], canvas.width, canvas.height)
      }

      drawSkeleton(ctx, smoothed.pose, smoothed.face, smoothed.hands, canvas.width, canvas.height)
      if (showMuscles) drawMuscles(ctx, smoothed.pose, canvas.width, canvas.height)

      const currentInfo = harvestInfo(smoothed.pose, smoothed.face, smoothed.hands, frameCountRef.current)
      setInfo(currentInfo)
      frameCountRef.current += 1

      if (now - lastSendRef.current > 100) {
        sendLandmarks(sessionId, smoothed.pose, smoothed.face, smoothed.hands)
        lastSendRef.current = now
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    detect()

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [isReady, sessionId, showMuscles, showSegmentation])

  function toggleFullscreen() {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  return (
    <div className="camera-container">
      {error && <div className="error">{error}</div>}
      <div ref={wrapperRef} className={`video-wrapper ${showVideo ? '' : 'skeleton-only'} ${isFullscreen ? 'fullscreen' : ''}`}>
        <video ref={videoRef} className="video" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="overlay" />
      </div>
      <div className="controls">
        <button onClick={() => setShowVideo(v => !v)} title="Toggle video layer">
          {showVideo ? 'Hide Video' : 'Show Video'}
        </button>
        <button onClick={() => setShowMuscles(m => !m)} title="Toggle muscle overlay">
          {showMuscles ? 'Hide Muscles' : 'Show Muscles'}
        </button>
        <button onClick={() => setShowSegmentation(s => !s)} title="Toggle body segmentation">
          {showSegmentation ? 'Hide Segmentation' : 'Show Segmentation'}
        </button>
        <button onClick={toggleFullscreen} title="Toggle fullscreen">
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
      {info && <DataInspector info={info} />}
    </div>
  )
}

const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32]
]

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
]

async function drawSegmentation(
  ctx: CanvasRenderingContext2D,
  mask: unknown,
  width: number,
  height: number
) {
  try {
    const m = mask as { toImageData?: () => Promise<ImageData>; toCanvasImageSource?: () => Promise<CanvasImageSource> }
    let imageData: ImageData | undefined
    if (m.toImageData) {
      imageData = await m.toImageData()
    } else if (m.toCanvasImageSource) {
      const source = await m.toCanvasImageSource()
      const temp = document.createElement('canvas')
      temp.width = width
      temp.height = height
      const tctx = temp.getContext('2d')
      if (tctx) {
        tctx.drawImage(source, 0, 0, width, height)
        imageData = tctx.getImageData(0, 0, width, height)
      }
    }
    if (!imageData) return

    const temp = document.createElement('canvas')
    temp.width = imageData.width
    temp.height = imageData.height
    const tctx = temp.getContext('2d')
    if (!tctx) return
    tctx.putImageData(imageData, 0, 0)

    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#22d3ee'
    ctx.drawImage(temp, 0, 0, width, height)
    ctx.restore()
  } catch (e) {
    // Segmentation drawing is best-effort
  }
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  pose: SmoothedPose,
  face: SmoothedFace,
  hands: SmoothedHands,
  width: number,
  height: number
) {
  if (pose.landmarks.length) {
    const landmarks = pose.landmarks[0]

    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 3
    ctx.fillStyle = '#00ff88'

    for (const [a, b] of POSE_CONNECTIONS) {
      const p1 = landmarks[a]
      const p2 = landmarks[b]
      if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(p1.x * width, p1.y * height)
        ctx.lineTo(p2.x * width, p2.y * height)
        ctx.stroke()
      }
    }

    for (const lm of landmarks) {
      if (lm.visibility > 0.5) {
        ctx.beginPath()
        ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }

  if (face.faceLandmarks.length) {
    const faceLms = face.faceLandmarks[0]
    ctx.strokeStyle = '#ffaa00'
    ctx.fillStyle = '#ffaa00'
    for (const lm of faceLms) {
      ctx.beginPath()
      ctx.arc(lm.x * width, lm.y * height, 1.5, 0, 2 * Math.PI)
      ctx.fill()
    }
  }

  if (hands.handLandmarks.length) {
    ctx.strokeStyle = '#00ccff'
    ctx.fillStyle = '#00ccff'
    for (const hand of hands.handLandmarks) {
      for (const [a, b] of HAND_CONNECTIONS) {
        const p1 = hand[a]
        const p2 = hand[b]
        if (p1 && p2) {
          ctx.beginPath()
          ctx.moveTo(p1.x * width, p1.y * height)
          ctx.lineTo(p2.x * width, p2.y * height)
          ctx.stroke()
        }
      }
      for (const lm of hand) {
        ctx.beginPath()
        ctx.arc(lm.x * width, lm.y * height, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }
}

function drawMuscles(
  ctx: CanvasRenderingContext2D,
  pose: SmoothedPose,
  width: number,
  height: number
) {
  if (!pose.landmarks.length) return
  const lm = pose.landmarks[0]

  const ls = lm[11]
  const rs = lm[12]
  const le = lm[13]
  const re = lm[14]
  const lw = lm[15]
  const rw = lm[16]
  const lh = lm[23]
  const rh = lm[24]
  const nose = lm[0]

  if (![ls, rs, le, re, lw, rw, lh, rh, nose].every(p => p.visibility > 0.5)) return

  ctx.save()
  ctx.globalAlpha = 0.35

  // Trapezius
  ctx.fillStyle = '#a855f7'
  ctx.beginPath()
  const neckX = nose.x * width
  const neckY = (nose.y + 0.02) * height
  ctx.moveTo(neckX, neckY)
  ctx.lineTo(ls.x * width, ls.y * height)
  ctx.lineTo(rs.x * width, rs.y * height)
  ctx.closePath()
  ctx.fill()

  // Deltoids
  ctx.fillStyle = '#ec4899'
  drawEllipse(ctx, ls.x * width, ls.y * height, 28, 18, 0)
  drawEllipse(ctx, rs.x * width, rs.y * height, 28, 18, 0)

  // Pectorals
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  const midShoulderX = (ls.x + rs.x) / 2 * width
  const midShoulderY = (ls.y + rs.y) / 2 * height
  const sternumX = midShoulderX
  const sternumY = midShoulderY + 0.08 * height
  ctx.moveTo(ls.x * width, ls.y * height)
  ctx.lineTo(rs.x * width, rs.y * height)
  ctx.lineTo(sternumX + 0.04 * width, sternumY)
  ctx.lineTo(sternumX - 0.04 * width, sternumY)
  ctx.closePath()
  ctx.fill()

  // Abs
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 3
  for (let i = 1; i <= 4; i++) {
    const y = sternumY + i * 0.02 * height
    ctx.beginPath()
    ctx.moveTo(sternumX - 0.03 * width, y)
    ctx.lineTo(sternumX + 0.03 * width, y)
    ctx.stroke()
  }

  // Biceps
  ctx.fillStyle = '#22d3ee'
  drawRotatedEllipse(ctx, ls.x * width, ls.y * height, le.x * width, le.y * height, 22, 12)
  drawRotatedEllipse(ctx, rs.x * width, rs.y * height, re.x * width, re.y * height, 22, 12)

  ctx.restore()
}

function drawEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rotation: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rotation, 0, 2 * Math.PI)
  ctx.fill()
}

function drawRotatedEllipse(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, rx: number, ry: number) {
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const rotation = Math.atan2(y2 - y1, x2 - x1)
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, len + rx, ry, rotation, 0, 2 * Math.PI)
  ctx.fill()
}

function harvestInfo(pose: SmoothedPose, face: SmoothedFace, hands: SmoothedHands, frameCount: number): HarvestInfo {
  return {
    frameCount,
    poseLandmarks: pose.landmarks[0]?.length ?? 0,
    poseConnections: POSE_CONNECTIONS.length,
    faceLandmarks: face.faceLandmarks[0]?.length ?? 0,
    faceBlendshapes: face.faceBlendshapes?.[0]?.categories?.length ?? face.faceBlendshapes?.length ?? 0,
    faceTransforms: face.facialTransformationMatrixes?.length ?? 0,
    handCount: hands.handLandmarks.length,
    handLandmarks: hands.handLandmarks.reduce((acc, h) => acc + h.length, 0),
    hasSegmentationMask: Boolean(pose.segmentationMasks?.length),
    hasWorldLandmarks: Boolean(pose.worldLandmarks?.length),
    hasHandWorldLandmarks: Boolean(hands.handWorldLandmarks?.length)
  }
}
