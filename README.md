# PostureDot Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Local Setup](#local-setup)
5. [Using the Application](#using-the-application)
6. [Available Landmarks / Nodes](#available-landmarks--nodes)
   - [Pose Landmarks (33)](#pose-landmarks-33)
   - [Hand Landmarks (21 per hand)](#hand-landmarks-21-per-hand)
   - [Face Landmarks (468)](#face-landmarks-468)
7. [Harvested Data](#harvested-data)
8. [View Modes & Controls](#view-modes--controls)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [Environment Variables](#environment-variables)
12. [Troubleshooting](#troubleshooting)

---

## Overview

PostureDot is a browser-based body/face/hand data harvester. It uses your camera and MediaPipe to detect landmarks in real time, stabilizes them with a One-Euro filter, and stores raw data in a backend database. The system is designed to capture as much pose-related information as possible from a video feed.

The entire pipeline runs in the browser for the heavy inference (MediaPipe models), while the backend persists frame data and exposes WebSocket/REST endpoints for integration.

---

## Architecture

```
┌─────────────────────┐      HTTP / WebSocket      ┌─────────────────────────┐
│  Browser (Frontend) │  <────────────────────>  │  Backend                │
│  - React + Vite     │                            │  - FastAPI + SQLite     │
│  - MediaPipe (GPU)  │                            │  - OR                   │
└─────────────────────┘                            │  - Cloudflare Workers   │
                                                   │    + D1                 │
                                                   └─────────────────────────┘
```

- **Frontend**: React, TypeScript, Vite. Runs MediaPipe in the browser via `@mediapipe/tasks-vision`.
- **Backend (Python)**: FastAPI, SQLAlchemy, SQLite. Receives landmark frames and stores them. Includes WebSocket live broadcast.
- **Backend (Workers)**: Hono, Cloudflare D1. Receives landmark frames via REST. No WebSocket in this version.
- **Communication**: HTTP `POST` for frame persistence. WebSocket is optional (Python backend only).

---

## Features

- **Real-time body/face/hand landmark detection**
- **Body segmentation mask** overlay
- **Muscle overlay** visualization (approximate, derived from landmarks)
- **One-Euro filter stabilization** on every landmark
- **Fullscreen mode**
- **Skeleton-only mode** (hide video feed)
- **Data inspector** showing live harvested info
- **Session persistence** with raw frame storage
- **Fetchable API** via FastAPI or Cloudflare Workers + D1

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A webcam
- (Optional) Git for deployment

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

The backend will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

The Vite dev server proxies `/api` and `/ws` to `localhost:8000`, so no extra env configuration is needed for local development.

---

## Using the Application

1. Open the frontend in your browser.
2. Allow camera access when prompted.
3. Wait for the MediaPipe models to download (one-time per browser cache).
4. You will see:
   - Video feed (can be hidden)
   - Skeleton overlay (pose, face, hands)
   - Data inspector panel on the right (desktop)
5. Toggle **Show Muscles** to see approximate muscle overlays.
6. Toggle **Show Segmentation** to see the body silhouette mask.
7. Click **Hide Video** to enter skeleton-only mode.
8. Click **Fullscreen** to expand the view.
9. Click **New Session** to start a fresh data session.
10. Switch to the **Analytics** tab to view stored frames for the current session.

---

## Available Landmarks / Nodes

PostureDot harvests **33 pose + 468 face + 21×2 hand = 543 landmark points** per frame, plus blendshapes, transformation matrices, and segmentation masks.

### Summary Table

| Model | Count | Coordinate Space | Extra Fields |
|-------|-------|------------------|--------------|
| Pose | 33 | normalized screen + 3D world | `visibility`, `segmentationMask` |
| Face | 468 | normalized screen | `faceBlendshapes` (52), `facialTransformationMatrixes` |
| Hands | 21 per hand | normalized screen + 3D world | up to 2 hands |
| **Total** | **543** | | |

### Pose Landmarks (33)

MediaPipe Pose returns 33 normalized landmarks per detected person. Each landmark has `x`, `y`, `z`, and `visibility`.

| Index | Name | Index | Name |
|-------|------|-------|------|
| 0 | nose | 17 | left pinky |
| 1 | left eye inner | 18 | right pinky |
| 2 | left eye | 19 | left index |
| 3 | left eye outer | 20 | right index |
| 4 | right eye inner | 21 | left thumb |
| 5 | right eye | 22 | right thumb |
| 6 | right eye outer | 23 | left hip |
| 7 | left ear | 24 | right hip |
| 8 | right ear | 25 | left knee |
| 9 | mouth left | 26 | right knee |
| 10 | mouth right | 27 | left ankle |
| 11 | left shoulder | 28 | right ankle |
| 12 | right shoulder | 29 | left heel |
| 13 | left elbow | 30 | right heel |
| 14 | right elbow | 31 | left foot index |
| 15 | left wrist | 32 | right foot index |
| 16 | right wrist | | |

**Pose connections drawn**:

| Region | Connection indices |
|--------|-------------------|
| Head | 0–1, 1–2, 2–3, 3–7, 0–4, 4–5, 5–6, 6–8 |
| Mouth | 9–10 |
| Left arm | 11–13, 13–15, 15–17, 15–19, 15–21 |
| Right arm | 12–14, 14–16, 16–18, 16–20, 16–22 |
| Torso | 11–12, 11–23, 12–24, 23–24 |
| Left leg | 23–25, 25–27, 27–29, 29–31 |
| Right leg | 24–26, 26–28, 28–30, 30–32 |

### Hand Landmarks (21 per hand)

MediaPipe Hands returns up to 2 hands × 21 landmarks each. Each landmark has `x`, `y`, `z`.

| Index | Name | Index | Name |
|-------|------|-------|------|
| 0 | wrist | 11 | middle finger dip |
| 1 | thumb cmc | 12 | middle finger tip |
| 2 | thumb mcp | 13 | ring finger mcp |
| 3 | thumb ip | 14 | ring finger pip |
| 4 | thumb tip | 15 | ring finger dip |
| 5 | index finger mcp | 16 | ring finger tip |
| 6 | index finger pip | 17 | pinky mcp |
| 7 | index finger dip | 18 | pinky pip |
| 8 | index finger tip | 19 | pinky dip |
| 9 | middle finger mcp | 20 | pinky tip |
| 10 | middle finger pip | | |

**Hand connections drawn**:

| Finger | Connection indices |
|--------|---------------------|
| Thumb | 0–1, 1–2, 2–3, 3–4 |
| Index | 0–5, 5–6, 6–7, 7–8 |
| Middle | 0–9, 9–10, 10–11, 11–12 |
| Ring | 0–13, 13–14, 14–15, 15–16 |
| Pinky | 0–17, 17–18, 18–19, 19–20 |
| Palm | 5–9, 9–13, 13–17 |

### Face Landmarks (468)

MediaPipe Face Mesh returns 468 landmarks covering the entire face. In the UI all 468 are rendered as small orange dots. The full set is not individually named, but the key regions and example indices are:

| Region | Indices | Description |
|--------|---------|-------------|
| Face oval | 10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109 | Outer face contour |
| Left eyebrow | 70, 63, 105, 66, 107, 55, 65, 52, 53, 46 | Left eyebrow points |
| Right eyebrow | 336, 296, 334, 293, 300, 276, 283, 282, 285, 295 | Right eyebrow points |
| Left eye | 33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7 | Left eye contour and iris |
| Right eye | 362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382 | Right eye contour and iris |
| Nose bridge | 6, 197, 195, 5, 4, 1, 19, 94, 2 | Nose top to tip |
| Nose bottom | 20, 60, 75, 97, 99, 101, 119, 121, 123, 125, 141, 238, 241, 250, 245, 244, 243, 242 | Lower nose and nostrils |
| Upper lip | 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291 | Upper lip outline |
| Lower lip | 146, 91, 181, 84, 17, 314, 405, 321, 375, 291 | Lower lip outline |
| Jaw/chin | 178, 179, 180, 181, 401, 402, 403, 404, 152 | Jawline and chin |
| Left cheek | 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152 | Left cheek region |
| Right cheek | 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152 | Right cheek region |

### Face Blendshapes (52)

MediaPipe Face Mesh returns 52 facial expression coefficients. Each blendshape has a `categoryName` and a `score` (0–1).

| # | Name | # | Name | # | Name |
|---|------|---|------|---|------|
| 1 | browDownLeft | 2 | browDownRight | 3 | browInnerUp |
| 4 | browOuterUpLeft | 5 | browOuterUpRight | 6 | cheekPuff |
| 7 | cheekSquintLeft | 8 | cheekSquintRight | 9 | eyeBlinkLeft |
| 10 | eyeBlinkRight | 11 | eyeLookDownLeft | 12 | eyeLookDownRight |
| 13 | eyeLookInLeft | 14 | eyeLookInRight | 15 | eyeLookOutLeft |
| 16 | eyeLookOutRight | 17 | eyeLookUpLeft | 18 | eyeLookUpRight |
| 19 | eyeSquintLeft | 20 | eyeSquintRight | 21 | eyeWideLeft |
| 22 | eyeWideRight | 23 | jawForward | 24 | jawLeft |
| 25 | jawOpen | 26 | jawRight | 27 | mouthClose |
| 28 | mouthDimpleLeft | 29 | mouthDimpleRight | 30 | mouthFrownLeft |
| 31 | mouthFrownRight | 32 | mouthFunnel | 33 | mouthLeft |
| 34 | mouthLowerDownLeft | 35 | mouthLowerDownRight | 36 | mouthPressLeft |
| 37 | mouthPressRight | 38 | mouthPucker | 39 | mouthRight |
| 40 | mouthRollLower | 41 | mouthRollUpper | 42 | mouthShrugLower |
| 43 | mouthShrugUpper | 44 | mouthSmileLeft | 45 | mouthSmileRight |
| 46 | mouthStretchLeft | 47 | mouthStretchRight | 48 | mouthUpperUpLeft |
| 49 | mouthUpperUpRight | 50 | noseSneerLeft | 51 | noseSneerRight |
| 52 | (neutral / unused) | | | | |

### Facial Transformation Matrix

A 4×4 matrix representing the 3D rotation and translation of the face in camera space. This is useful for head-pose estimation.

### Body Segmentation Mask

A binary/person mask covering the detected person. It is drawn on the canvas as a translucent overlay but not persisted to the database because it is not JSON-serializable.

---

## Harvested Data

The frontend captures the following data per frame and sends it to the backend every 100 ms:

| Data | Description | Source |
|------|-------------|--------|
| Pose landmarks | 33 body points in normalized screen coords | MediaPipe Pose |
| Pose world landmarks | 33 body points in 3D metric coords | MediaPipe Pose |
| Face landmarks | 468 face points in normalized screen coords | MediaPipe Face Mesh |
| Face blendshapes | 52 facial expression categories | MediaPipe Face Mesh |
| Facial transformation matrices | 4×4 matrix for 3D face pose | MediaPipe Face Mesh |
| Hand landmarks | 21 points per hand | MediaPipe Hands |
| Hand world landmarks | 21 points per hand in 3D metric coords | MediaPipe Hands |
| Body segmentation mask | Binary/person mask | MediaPipe Pose |

The backend stores `raw_pose`, `raw_face`, and `raw_hands` as JSON text per frame. The segmentation mask is drawn on the canvas but not persisted (it is not JSON-serializable).

---

## View Modes & Controls

| Button | Effect |
|--------|--------|
| **Hide Video** / **Show Video** | Toggles the camera feed. When hidden, only the skeleton/muscles/segmentation are visible on a dark background. |
| **Show Muscles** / **Hide Muscles** | Draws approximate muscle overlays (trapezius, deltoids, pectorals, abs, biceps). |
| **Show Segmentation** / **Hide Segmentation** | Draws the body segmentation mask as a translucent overlay. |
| **Fullscreen** / **Exit Fullscreen** | Expands the video canvas to full screen. |
| **New Session** | Generates a new session ID and clears current inspector data. |
| **Camera / Analytics tabs** | Switches between live view and stored session data view. |

---

## API Reference

Base URL: `http://localhost:8000` (local) or your deployed URL.

### `POST /api/landmarks`

Store one frame of landmark data.

**Request body**:

```json
{
  "sessionId": "uuid-string",
  "pose": {
    "landmarks": [[{ "x": 0.5, "y": 0.5, "z": 0, "visibility": 0.9 }]],
    "worldLandmarks": [[{ "x": 0.1, "y": 0.2, "z": 0.3, "visibility": 0.9 }]]
  },
  "face": {
    "faceLandmarks": [[{ "x": 0.5, "y": 0.5, "z": 0 }]],
    "faceBlendshapes": [[{ "categories": [{ "categoryName": "jawOpen", "score": 0.1 }] }]],
    "facialTransformationMatrixes": [{ /* 4x4 matrix */ }]
  },
  "hands": {
    "handLandmarks": [[{ "x": 0.5, "y": 0.5, "z": 0 }]],
    "handWorldLandmarks": [[{ "x": 0.1, "y": 0.2, "z": 0.3 }]]
  }
}
```

**Response**:

```json
{ "ok": true }
```

### `GET /api/sessions/{session_id}/summary`

Get session summary.

**Response**:

```json
{
  "session_id": "uuid-string",
  "frame_count": 120,
  "created_at": "2026-07-18T04:43:03.644744"
}
```

### `GET /api/sessions/{session_id}/frames`

Get stored frames for a session.

**Query parameters**:
- `limit` (int, default 1000): maximum frames to return

**Response**:

```json
[
  {
    "timestamp": "2026-07-18T04:43:03.644744",
    "raw_pose": "{...}",
    "raw_face": "{...}",
    "raw_hands": "{...}"
  }
]
```

### `WS /ws/{session_id}`

WebSocket endpoint for live updates. The backend broadcasts a `frame` event whenever a new frame is stored.

**Broadcast message**:

```json
{
  "type": "frame",
  "pose_landmarks": 33,
  "face_landmarks": 468,
  "hand_count": 2
}
```

### `GET /health`

Health check.

**Response**:

```json
{ "status": "ok" }
```

---

## Deployment

### Option A: Cloudflare Workers + D1 (no credit card needed)

This is the recommended path if you cannot use a credit card. The backend is in `backend-workers/` and uses **Hono** + **D1**.

1. Sign up at [cloudflare.com](https://cloudflare.com) (free).
2. Install `wrangler` globally or use `npx`:
   ```bash
   cd backend-workers
   npm install
   ```
3. Create the D1 database:
   ```bash
   npx wrangler d1 create posturedot-db
   ```
4. Copy the `database_id` from the output into `wrangler.toml` (copy from `wrangler.toml.example`).
5. Run the schema:
   ```bash
   npx wrangler d1 execute posturedot-db --file=./schema.sql
   ```
6. Deploy:
   ```bash
   npx wrangler deploy
   ```
7. Copy the Workers URL (e.g. `https://posturedot-api.your-account.workers.dev`).
8. In `frontend/.env`, set:
   ```
   VITE_API_URL=https://posturedot-api.your-account.workers.dev
   ```
9. Rebuild and deploy the frontend (e.g., Vercel, Cloudflare Pages).

See `backend-workers/README.md` for more details.

### Option B: Render (requires card)

Render requires a payment card on file even for the free plan.

1. Push this repo to GitHub.
2. Sign up at [render.com](https://render.com).
3. Create a new **Web Service** from your GitHub repo.
4. Set **Root Directory** to `backend` and **Dockerfile Path** to `./Dockerfile`.
5. Keep the **Free** plan.
6. Deploy and copy the public URL.
7. In `frontend/.env`, set:
   ```
   VITE_API_URL=https://posturedot-api.onrender.com
   ```
8. Rebuild and deploy the frontend.

### Option C: Cloudflare Tunnel (expose localhost)

If you just want a public URL without deploying:

1. Sign up at [cloudflare.com](https://cloudflare.com) and install `cloudflared`.
2. Run:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```
3. Copy the public URL and set it as `VITE_API_URL` in `frontend/.env`.


---

## Environment Variables

### Python Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. Use `*` for any, or set your frontend domain. |
| `DATABASE_URL` | `sqlite:///./posturedot.db` | SQLAlchemy database URL. Use PostgreSQL in production. |

### Cloudflare Workers Backend (`backend-workers/wrangler.toml`)

| Variable | Description |
|----------|-------------|
| `DB` | D1 database binding. Set `database_id` after creating the D1 database. |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `''` | Backend base URL with no trailing slash. Empty uses the Vite dev proxy. |

---

## Troubleshooting

### Camera not working

- Make sure you allowed camera permissions in the browser.
- Use `https://` or `localhost` (MediaPipe requires a secure context).
- Close other apps using the camera.

### Models fail to load

- The MediaPipe models and WASM are loaded from CDN. Check your internet connection.
- If the browser blocks third-party requests, add a CDN exception or self-host the models.

### Backend not reachable from deployed frontend

- Set `CORS_ORIGINS` to include your frontend domain (e.g. `https://posturedot.vercel.app`).
- Set `VITE_API_URL` to the backend URL and rebuild the frontend.

### WebSocket not connecting

- Make sure the backend supports WebSocket on the same host/port.
- If using HTTPS frontend, the backend must also be HTTPS for WSS.

### Database errors after schema changes

- Delete the local `backend/posturedot.db` file and restart the backend to recreate the schema.
- On Render, the disk is persistent at `/app/data` when using the provided `render.yaml`.

### Low FPS

- MediaPipe full models are heavier than lite. Close other browser tabs/applications.
- Ensure GPU acceleration is enabled in the browser.
- Reduce video resolution with `getUserMedia` constraints.
