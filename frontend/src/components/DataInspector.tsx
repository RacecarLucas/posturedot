import type { HarvestInfo } from '../utils/types.ts'

interface DataInspectorProps {
  info: HarvestInfo
}

export default function DataInspector({ info }: DataInspectorProps) {
  return (
    <div className="data-inspector">
      <h3>Harvested Data</h3>
      <div className="data-grid">
        <div className="data-row">
          <span className="label">Frame</span>
          <span className="value">#{info.frameCount}</span>
        </div>
        <div className="data-row">
          <span className="label">Pose Landmarks</span>
          <span className="value">{info.poseLandmarks}</span>
        </div>
        <div className="data-row">
          <span className="label">Face Landmarks</span>
          <span className="value">{info.faceLandmarks}</span>
        </div>
        <div className="data-row">
          <span className="label">Hand Landmarks</span>
          <span className="value">{info.handLandmarks} ({info.handCount} hands)</span>
        </div>
        <div className="data-row">
          <span className="label">Face Blendshapes</span>
          <span className="value">{info.faceBlendshapes}</span>
        </div>
        <div className="data-row">
          <span className="label">Face Transforms</span>
          <span className="value">{info.faceTransforms}</span>
        </div>
        <div className="data-row">
          <span className="label">Segmentation Mask</span>
          <span className="value">{info.hasSegmentationMask ? 'Yes' : 'No'}</span>
        </div>
        <div className="data-row">
          <span className="label">World Landmarks</span>
          <span className="value">{info.hasWorldLandmarks ? 'Yes' : 'No'}</span>
        </div>
        <div className="data-row">
          <span className="label">Hand World Landmarks</span>
          <span className="value">{info.hasHandWorldLandmarks ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  )
}
